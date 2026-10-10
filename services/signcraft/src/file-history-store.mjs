import {createFileStoreSync} from '@red-cup-engineering/immutable-content-custody-service/file-store';
import {createFileContentReference} from '@red-cup-engineering/immutable-content-custody-service/file-reference';
import {immutableContentKey} from '@red-cup-engineering/immutable-content-custody-service';
import {createContentHistoryStore} from './content-history-store.mjs';
import {existsSync,openSync,readSync,closeSync} from 'node:fs';

// The first sixteen bytes of the earlier relational history file, as hex. This store only recognises that
// header to refuse it with directions; it never opens such a file.
const EARLIER_HEADER=Buffer.from('53514c69746520666f726d6174203300','hex');
function earlierRelationalFile(path){
 if(!existsSync(path))return false;
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
 if(earlierRelationalFile(path))throw new TypeError('Path holds the earlier relational history file; receive it offline with scripts/read-historical-history.py and scripts/receive-historical-history.mjs');
 const objects=createFileStoreSync(contentRoot),reference=createFileContentReference(path,{transitions});
 const key=id=>'semantic/'+immutableContentKey(id);
 const storage={
  root:reference.read,publish:reference.publish,
  read:id=>objects.get(key(id))?.body.toString('utf8')??null,
  putAbsent:(id,text)=>objects.putIfAbsent(key(id),{body:Buffer.from(text),mediaType:'application/json'}),
 };
 return createContentHistoryStore(storage);
}
