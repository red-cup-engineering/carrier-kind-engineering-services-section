import {createFileStoreSync} from '@red-cup-engineering/immutable-content-custody-service/file-store';
import {createFileContentReference} from '@red-cup-engineering/immutable-content-custody-service/file-reference';
import {immutableContentKey} from '@red-cup-engineering/immutable-content-custody-service';
import {createContentHistoryStore} from './content-history-store.mjs';
import {lstatSync,openSync,readSync,closeSync} from 'node:fs';

// The first sixteen bytes of the earlier relational history file, as hex. This store only recognises that
// header to refuse it with directions; it never opens such a file.
const EARLIER_HEADER=Buffer.from('53514c69746520666f726d6174203300','hex');
function regularFile(path){
 const status=lstatSync(path,{throwIfNoEntry:false});
 if(status===undefined)return false;
 if(!status.isFile())throw new TypeError('SignCraft history carrier must be a regular file: '+path);
 return true;
}
function unresolvedLegacy(path){
 const error=new TypeError('Path holds unresolved earlier history; receive it offline with scripts/read-historical-history.py and scripts/receive-historical-history.mjs: '+path);
 error.code='SIGNCRAFT_LEGACY_HISTORY_UNRECEIVED';throw error;
}
function assertNoUnreceivedSidecars(path){
 // Retain the independent native-custody guard: even an empty transaction or
 // admission sidecar needs explicit receiving. Do not reclaim or delete it.
 for(const base of [path,path+'.sqlite'])for(const suffix of ['-wal','-shm','-journal','.admission']){
  const file=base+suffix;
  if(lstatSync(file,{throwIfNoEntry:false})!==undefined){
   const error=new TypeError('Unresolved historical history custody obstructs runtime opening: '+file);
   error.code='SIGNCRAFT_LEGACY_HISTORY_UNRECEIVED';throw error;
  }
 }
}
function earlierRelationalFile(path){
 if(!regularFile(path))return false;
 const descriptor=openSync(path,'r');
 try{const bytes=Buffer.alloc(16);return readSync(descriptor,bytes,0,16,0)===16&&bytes.equals(EARLIER_HEADER);}finally{closeSync(descriptor);}
}

/** The same causal history carrier over private flatfiles. SCA names semantic
 * values, so their JSON representations use an explicit semantic key namespace;
 * a raw-byte NI object is never mistaken for the represented semantic value.
 *
 * History once held in the earlier relational file is received offline, once, into a new path with
 * scripts/read-historical-history.py piped to scripts/receive-historical-history.mjs; opening such a
 * file here is refused rather than read at startup. */
export function createFileHistoryStore(path,{contentRoot=path+'.content',transitions=path+'.transitions'}={}){
 if(earlierRelationalFile(path))unresolvedLegacy(path);
 assertNoUnreceivedSidecars(path);
 const reference=createFileContentReference(path,{transitions});
 // A missing or null cache cannot erase an unresolved backup. Reading the
 // immutable publication chain is non-mutating and recovers its latest frontier.
 const frontier=reference.read();
 if(regularFile(path+'.sqlite')&&frontier===null)unresolvedLegacy(path+'.sqlite');
 const objects=createFileStoreSync(contentRoot);
 const key=id=>'semantic/'+immutableContentKey(id);
 const storage={
  root:reference.read,publish:reference.publish,
  read:id=>objects.get(key(id))?.body.toString('utf8')??null,
  putAbsent:(id,text)=>objects.putIfAbsent(key(id),{body:Buffer.from(text),mediaType:'application/json'}),
 };
 return createContentHistoryStore(storage);
}
