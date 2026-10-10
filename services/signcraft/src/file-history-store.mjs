import {createFileStoreSync} from '@red-cup-engineering/immutable-content-custody-service/file-store';
import {createFileContentReference} from '@red-cup-engineering/immutable-content-custody-service/file-reference';
import {immutableContentKey} from '@red-cup-engineering/immutable-content-custody-service';
import {createContentHistoryStore} from './content-history-store.mjs';
import {openSync,readSync,closeSync,lstatSync} from 'node:fs';
function legacyFile(file){
 let held;try{held=lstatSync(file);}catch(error){if(error.code==='ENOENT')return false;throw error;}
 if(!held.isFile()||held.isSymbolicLink())throw new Error('History source custody requires an unlinked regular file');
 const fd=openSync(file,'r');try{const header=Buffer.alloc(16);return readSync(fd,header,0,16,0)===16&&header.toString()==='SQLite format 3\u0000';}finally{closeSync(fd);}
}
export function assertNoUnreceivedHistory(path){
 if(legacyFile(path)||legacyFile(path+'.sqlite'))throw new Error('Historical SQL history requires explicit offline receiving before runtime opening');
 for(const suffix of ['-wal','-shm','-journal','.admission']){try{lstatSync(path+suffix);}catch(error){if(error.code==='ENOENT')continue;throw error;}throw new Error('Unresolved historical history custody obstructs runtime opening');}
}

/** The same causal history carrier over private flatfiles. SCA names semantic
 * values, so their JSON representations use an explicit semantic key namespace;
 * a raw-byte NI object is never mistaken for the represented semantic value. */
export function createFileHistoryStore(path,{contentRoot=path+'.content',transitions=path+'.transitions'}={}){
 assertNoUnreceivedHistory(path);
 const objects=createFileStoreSync(contentRoot),reference=createFileContentReference(path,{transitions});
 const key=id=>'semantic/'+immutableContentKey(id);
 const storage={
  root:reference.read,publish:reference.publish,
  read:id=>objects.get(key(id))?.body.toString('utf8')??null,
  putAbsent:(id,text)=>objects.putIfAbsent(key(id),{body:Buffer.from(text),mediaType:'application/json'}),
 };
 return createContentHistoryStore(storage);
}

