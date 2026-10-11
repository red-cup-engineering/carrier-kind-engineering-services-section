import {lstatSync} from 'node:fs';
export function assertNativeIndexCustody(file){
 for(const source of [file,file+'-wal',file+'-shm',file+'-journal']){
  try{lstatSync(source);}catch(error){if(error.code==='ENOENT')continue;throw error;}
  throw new Error('Historical archive index requires explicit offline receiving into a distinct native destination');
 }
}
