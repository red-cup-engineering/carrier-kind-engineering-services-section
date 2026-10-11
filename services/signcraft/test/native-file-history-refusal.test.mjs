import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,lstatSync,readlinkSync,rmSync,unlinkSync,symlinkSync,mkdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {cell} from '@red-cup-engineering/signcell/cell';
import {createFileHistoryStore} from '../src/file-history-store.mjs';
import {createHistory,observeHistory,materializeHistory,checkpointHistory} from '../src/history.mjs';

// Opaque bytes only: these controls never create or open a SQL database.
const prior=Buffer.concat([Buffer.from('SQLite format 3\u0000'),Buffer.from('original retained bytes\0\xff','latin1')]);
const nullCache=JSON.stringify({kind:'content-reference.frontier.v1',content:null})+'\n';
function snapshot(root){
 const rows=[];function walk(at){for(const name of readdirSync(at).sort()){
  const file=join(at,name),stat=lstatSync(file),key=relative(root,file);
  if(stat.isSymbolicLink())rows.push([key,'link',readlinkSync(file)]);
  else if(stat.isDirectory()){rows.push([key,'directory']);walk(file);}
  else rows.push([key,'file',readFileSync(file).toString('base64')]);
 }}walk(root);return rows;
}
function fixture(body){const root=mkdtempSync(join(tmpdir(),'native-history-admission-'));try{return body(root,join(root,'world.json'));}finally{rmSync(root,{recursive:true,force:true});}}
function refusal(root,open,pattern={code:'SIGNCRAFT_LEGACY_HISTORY_UNRECEIVED'}){
 const before=snapshot(root);assert.throws(open,pattern);assert.deepEqual(snapshot(root),before,'refusal must not modify, rename, discard or seed any carrier');
}

test('SQL primary bytes are refused before any native custody side effect',()=>fixture((root,path)=>{
 writeFileSync(path,prior);writeFileSync(path+'.sqlite',Buffer.from('earlier backup'));
 refusal(root,()=>createFileHistoryStore(path,{contentRoot:join(root,'custom-content'),transitions:join(root,'custom-transitions')}));
 assert.deepEqual(readFileSync(path),prior);
}));

for(const cache of ['missing','null'])for(const backup of [prior,Buffer.from('truncated historical carrier')]){
 test(`an unresolved backup with a ${cache} native cache cannot become an empty history (${backup===prior?'SQL signature':'opaque bytes'})`,()=>fixture((root,path)=>{
  writeFileSync(path+'.sqlite',backup);if(cache==='null')writeFileSync(path,nullCache);
  refusal(root,()=>createFileHistoryStore(path));assert.deepEqual(readFileSync(path+'.sqlite'),backup);
 }));
}

test('native corruption beside an original backup is refused without resetting either carrier',()=>fixture((root,path)=>{
 writeFileSync(path+'.sqlite',prior);writeFileSync(path,'{"kind":"not-a-native-frontier"}');
 refusal(root,()=>createFileHistoryStore(path),/Invalid content reference/);
 unlinkSync(path);mkdirSync(path+'.transitions');writeFileSync(join(path+'.transitions','empty.json'),'not JSON');
 refusal(root,()=>createFileHistoryStore(path),SyntaxError);
}));

test('non-regular primary and backup carriers are refused without following or changing them',()=>fixture((root,path)=>{
 const target=join(root,'saved-original');writeFileSync(target,prior);symlinkSync(target,path);
 refusal(root,()=>createFileHistoryStore(path),/regular file/);unlinkSync(path);
 symlinkSync(target,path+'.sqlite');refusal(root,()=>createFileHistoryStore(path),/regular file/);unlinkSync(path+'.sqlite');
 mkdirSync(path);refusal(root,()=>createFileHistoryStore(path),/regular file/);
}));

test('current native ancestry and control recover from missing, null and stale caches while every backup byte remains untouched',()=>fixture((root,path)=>{
 const options={contentRoot:join(root,'native-objects'),transitions:join(root,'native-publications')};
 const store=createFileHistoryStore(path,options);
 let full=observeHistory(createHistory(['location']),[cell('alice','location','garden',{for:['arrive']})]);
 let held=store.commit(full,{clock:1,pending:['original']});const oldCache=readFileSync(path);
 const next=[cell('alice','location','library',{for:['move']})];full=observeHistory(full,next);held=store.commit(observeHistory(held,next),{clock:101,pending:[{text:'retained 😀',sequence:4}]});
 writeFileSync(path+'.sqlite',prior);const exactFrontier=JSON.parse(readFileSync(path)).content;
 for(const cache of ['missing','null','stale']){
  if(cache==='missing')unlinkSync(path);else writeFileSync(path,cache==='null'?nullCache:oldCache);
  const before=snapshot(root),resumed=createFileHistoryStore(path,options),loaded=resumed.load();
  assert.equal(loaded.history.checkpoint.id,checkpointHistory(full).checkpoint.id);
  assert.deepEqual(materializeHistory(loaded.history).revisions,full.revisions);
  assert.deepEqual(loaded.control,{clock:101,pending:[{text:'retained 😀',sequence:4}]});
  assert.deepEqual(resumed.content(exactFrontier).control,store.content(exactFrontier).control);
  assert.deepEqual(snapshot(root),before,'opening and recovery are read-only, including stale caches');
 }
 const reopened=createFileHistoryStore(path,options);const loaded=reopened.load();
 reopened.commit(loaded.history,{...loaded.control,clock:102});assert.equal(reopened.load().control.clock,102);
 assert.deepEqual(readFileSync(path+'.sqlite'),prior,'native continuation cannot rewrite the original backup');
}));

test('a SQL primary cannot be bypassed by a separately retained native frontier',()=>fixture((root,path)=>{
 const store=createFileHistoryStore(path);store.commit(observeHistory(createHistory(),[cell('world','held',true,{for:['native']})]),{clock:8});
 writeFileSync(path,prior);refusal(root,()=>createFileHistoryStore(path));
}));

test('fresh native custody without historical material retains its existing empty-to-current contract',()=>fixture((root,path)=>{
 const before=snapshot(root),store=createFileHistoryStore(path);assert.equal(store.load(),null);assert.deepEqual(snapshot(root),before);
 const full=observeHistory(createHistory(),[cell('world','held',true,{for:['native']})]);store.commit(full,{clock:1});
 assert.equal(createFileHistoryStore(path).load().control.clock,1);
}));

test('incomplete or invalid primary material is refused before a native store can be used',()=>fixture((root,path)=>{
 for(const bytes of [prior.subarray(0,11),Buffer.from('{invalid'),Buffer.from('{"kind":"unknown"}')]){
  writeFileSync(path,bytes);refusal(root,()=>createFileHistoryStore(path),/JSON|Unexpected|Invalid content/);
 }
}));


for(const existing of ['fresh','native'])for(const carrier of ['primary','backup'])for(const suffix of ['-wal','-shm','-journal','.admission']){
 test(`${carrier} ${suffix} sidecar obstructs ${existing} native opening without reclaiming custody`,()=>fixture((root,path)=>{
  if(existing==='native')createFileHistoryStore(path).commit(observeHistory(createHistory(),[cell('world','held',true,{for:['native']})]),{clock:8});
  // Empty sidecars are still unresolved custody; their mere removal is not admission.
  const sidecar=path+(carrier==='backup'?'.sqlite':'')+suffix;writeFileSync(sidecar,'');
  refusal(root,()=>createFileHistoryStore(path));assert.equal(readFileSync(sidecar).length,0);
 }));
}
