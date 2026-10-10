import {createFileStoreSync} from '@red-cup-engineering/immutable-content-custody-service/file-store';
import {createFileContentReference} from '@red-cup-engineering/immutable-content-custody-service/file-reference';
import {immutableContentKey} from '@red-cup-engineering/immutable-content-custody-service';
import {createContentHistoryStore} from './content-history-store.mjs';
import {readSqlHistory} from './import-sql-history.mjs';
import {checkpointHistory,materializeHistory} from './history.mjs';
import {semanticId} from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';
import {existsSync,openSync,readSync,closeSync,renameSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function sqliteFile(path){
 if(!existsSync(path))return false;
 const descriptor=openSync(path,'r');try{const bytes=Buffer.alloc(16);return readSync(descriptor,bytes,0,16,0)===16&&bytes.toString()==='SQLite format 3\u0000';}finally{closeSync(descriptor);}
}

/** Offline admission at the next startup of the owning local service. */
function admitSqlFile(path,sourcePath){
 const {DatabaseSync}=require('node:sqlite'),database=new DatabaseSync(sourcePath,{readOnly:true});let source;
 try{database.exec('BEGIN');source=readSqlHistory({exec:(query,...bindings)=>database.prepare(query).all(...bindings)});database.exec('COMMIT');}finally{database.close();}
 if(!source)throw new TypeError('Legacy SQL file is outside the SignCraft history carrier');
 const staged=path+'.admission',journal=createFileHistoryStore(staged,{contentRoot:path+'.content',transitions:path+'.transitions'});
 for(const {id,value} of source.contents)if(journal.retain(value)!==id)throw new TypeError('SQL admission changed content identity');
 for(const r of source.revisions)if(journal.retain({subject:'signcraft.history',predicate:'revision',object:{parents:r.parents,source:r.source,cells:r.cells}})!==r.id)throw new TypeError('SQL admission changed revision identity');
 if(source.history!==null){
 journal.commit(source.history,source.control);const loaded=journal.load();
 if(loaded.history.checkpoint.id!==checkpointHistory(source.history).checkpoint.id||semanticId(loaded.control)!==semanticId(source.control))throw new TypeError('SQL admission did not preserve its state');
 materializeHistory(loaded.history);
 }else createFileContentReference(staged,{transitions:path+'.transitions'}).publish(null,null);
 if(sourcePath===path){if(existsSync(path+'.sqlite'))throw new TypeError('SQL admission will not overwrite earlier saved material');renameSync(path,path+'.sqlite');}
 renameSync(staged,path);
 const reference=createFileContentReference(path,{transitions:path+'.transitions'}),frontier=reference.read();
 reference.publish(frontier,frontier);
}

/** The same causal history carrier over private flatfiles. SCA names semantic
 * values, so their JSON representations use an explicit semantic key namespace;
 * a raw-byte NI object is never mistaken for the represented semantic value. */
export function createFileHistoryStore(path,{contentRoot=path+'.content',transitions=path+'.transitions'}={}){
 if(sqliteFile(path))admitSqlFile(path,path);
 else if(!existsSync(path)&&sqliteFile(path+'.sqlite')&&createFileContentReference(path,{transitions}).read()===null)admitSqlFile(path,path+'.sqlite');
 const objects=createFileStoreSync(contentRoot),reference=createFileContentReference(path,{transitions});
 const key=id=>'semantic/'+immutableContentKey(id);
 const storage={
  root:reference.read,publish:reference.publish,
  read:id=>objects.get(key(id))?.body.toString('utf8')??null,
  putAbsent:(id,text)=>objects.putIfAbsent(key(id),{body:Buffer.from(text),mediaType:'application/json'}),
 };
 return createContentHistoryStore(storage);
}
