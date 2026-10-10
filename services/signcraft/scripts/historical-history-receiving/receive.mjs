#!/usr/bin/env node
// One-time offline receiving; never imported by ordinary history opening.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {openSync,readSync,closeSync,lstatSync,mkdtempSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';import {join,resolve,dirname} from 'node:path';
import {readSqlHistory} from '@red-cup-engineering/signcraft/import-sql-history';
import {createFileHistoryStore} from '@red-cup-engineering/signcraft/file-history-store';
import {checkpointHistory,materializeHistory} from '@red-cup-engineering/signcraft/history';
import {semanticId} from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';
function shaFile(file){
 const hash=createHash('sha256'),fd=openSync(file,'r'),buffer=Buffer.alloc(1024*1024);let total=0;
 try{for(;;){const size=readSync(fd,buffer,0,buffer.length,null);if(!size)break;total+=size;if(total>256*1024*1024)throw new Error('Historical source grew beyond its bound');hash.update(buffer.subarray(0,size));}return hash.digest('hex');}finally{closeSync(fd);}
}
function privateDestinationParent(file){
 const parent=dirname(file),held=lstatSync(parent);
 if(!held.isDirectory()||held.isSymbolicLink()||(held.mode&0o077)!==0||held.uid!==process.getuid())throw new Error('Receiving destination requires a private owned directory');
 // An ancestor link could redirect otherwise private custody.
 for(let dir=parent;;dir=dirname(dir)){if(lstatSync(dir).isSymbolicLink())throw new Error('Receiving destination ancestor is linked');if(dirname(dir)===dir)break;}
}
export function receiveHistoricalHistory({sourcePath,destination,expectedSha256}){
 sourcePath=resolve(sourcePath);destination=resolve(destination);
 if(!/^[a-f0-9]{64}$/u.test(expectedSha256)||sourcePath===destination||existsSync(destination)||existsSync(destination+'.content')||existsSync(destination+'.transitions'))throw new Error('Receiving requires an exact source identity and a fresh isolated destination');
 privateDestinationParent(destination);
 const held=lstatSync(sourcePath);if(!held.isFile()||held.isSymbolicLink()||held.size>256*1024*1024)throw new Error('Historical source is not bounded regular custody');
 for(const suffix of ['-wal','-journal','-shm'])if(existsSync(sourcePath+suffix)){
  const sidecar=lstatSync(sourcePath+suffix);if(!sidecar.isFile()||sidecar.isSymbolicLink()||(suffix!=='-shm'&&sidecar.size!==0))throw new Error('Historical source has unresolved transaction custody');
 }
 if(shaFile(sourcePath)!==expectedSha256)throw new Error('Historical source identity changed');
 const scratch=mkdtempSync(join(tmpdir(),'signcraft-offline-receiving-')),snapshot=join(scratch,'source.sqlite');
 let database,source,totalBytes=0,queries=0;
 try{
  copyFileSync(sourcePath,snapshot);if(shaFile(snapshot)!==expectedSha256)throw new Error('Historical snapshot identity changed');
  database=new DatabaseSync(snapshot,{readOnly:true});database.exec('PRAGMA query_only=on');database.exec('BEGIN');
  source=readSqlHistory({exec:(query,...bindings)=>{
   if(!/^SELECT\b/iu.test(query)||++queries>20000)throw new Error('Historical source query is outside the bounded reader');
   const rows=[];for(const row of database.prepare(query).iterate(...bindings)){
    totalBytes+=Buffer.byteLength(JSON.stringify(row));if(rows.length>=20000||totalBytes>64*1024*1024)throw new Error('Historical source representation bound exhausted');rows.push(row);
   }return rows;
  }});database.exec('COMMIT');database.close();database=null;
  if(!source)throw new Error('Historical source is outside the SignCraft carrier');
  if(shaFile(sourcePath)!==expectedSha256)throw new Error('Original source changed before receiving');
  const store=createFileHistoryStore(destination);
  for(const {id,value} of source.contents)if(store.retain(value)!==id)throw new Error('Historical content identity changed');
  for(const r of source.revisions)if(store.retain({subject:'signcraft.history',predicate:'revision',object:{parents:r.parents,source:r.source,cells:r.cells}})!==r.id)throw new Error('Historical revision identity changed');
  const receiver=createFileHistoryStore(destination);
  for(const {id,value} of source.contents)if(semanticId(receiver.content(id))!==semanticId(value))throw new Error('Historical native content receiving changed');
  if(source.history!==null){store.commit(source.history,source.control);const received=createFileHistoryStore(destination).load();
   if(received.history.checkpoint.id!==checkpointHistory(source.history).checkpoint.id||semanticId(received.control)!==semanticId(source.control))throw new Error('Historical native receiving changed');materializeHistory(received.history);
  }
  if(shaFile(sourcePath)!==expectedSha256)throw new Error('Original source changed during receiving');
  return {kind:'signcraft-historical-native-receiving',version:1,sourceSha256:expectedSha256,contents:source.contents.length,revisions:source.revisions.length,sourceUnchanged:true,runtimeInstalled:false,startupClearance:false};
 }finally{database?.close();rmSync(scratch,{recursive:true,force:true});}
}

if(import.meta.url===(process.argv[1]?pathToFileURL(resolve(process.argv[1])).href:null)){
 const [sourcePath,destination,expectedSha256,...extra]=process.argv.slice(2);
 if(!sourcePath||!destination||!expectedSha256||extra.length)throw new Error('Usage: receive.mjs SOURCE FRESH_NATIVE_DESTINATION SOURCE_SHA256');
 console.log(JSON.stringify(receiveHistoricalHistory({sourcePath,destination,expectedSha256})));
}
