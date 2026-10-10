import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,unlinkSync} from 'node:fs';
import {fork} from 'node:child_process';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {cell} from '@red-cup-engineering/signcell/cell';
import {createHistory,observeHistory,mergeHistories,queryHistory,materializeHistory,historyHeads} from '../src/history.mjs';
import {createFileHistoryStore} from '../src/file-history-store.mjs';
const require=createRequire(import.meta.url);
const claim=(place,witness)=>cell('alice','location',place,{for:[witness]});

test('causal mesh branches retain competing evidence and converge through the addressed carrier',()=>{
 const dir=mkdtempSync(join(tmpdir(),'history-mesh-')),store=createFileHistoryStore(join(dir,'world.json'));
 try{
  const base=observeHistory(createHistory(['location']),[claim('garden','first')]);
  const held=store.commit(base,{clock:1});
  const left=observeHistory(held,[claim('workshop','left')]),right=observeHistory(held,[claim('library','right')]);
  const joined=mergeHistories(left,right);store.commit(joined,{clock:2});
  const reading=store.load();assert.deepEqual(queryHistory(reading.history,{}),queryHistory(joined,{}));
  const past=materializeHistory(reading.history);assert.deepEqual(historyHeads(past),historyHeads(joined));
  const values=queryHistory(past,{subject:'alice',predicate:'location'});assert.equal(values.length,2);
  assert.deepEqual(values.map(c=>c.object).sort(),['library','workshop']);
  const resolved=observeHistory(reading.history,[claim('hall','settled')]);store.commit(resolved,{clock:3});
  assert.deepEqual(queryHistory(store.load().history,{subject:'alice',predicate:'location'}).map(c=>c.object),['hall']);
  const final=materializeHistory(store.load().history);assert.equal(final.revisions.length,4);
  assert(final.revisions.some(r=>r.cells.some(c=>c.object==='library')));assert(final.revisions.some(r=>r.cells.some(c=>c.object==='workshop')));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('separate simultaneous writers publish exactly one complete world and clock',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'history-writers-')),path=join(dir,'world.json'),script=join(dir,'writer.mjs');
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const store=createFileHistoryStore(path),base=observeHistory(createHistory(['location']),[claim('garden','base')]);
 store.commit(base,{clock:1});
 const source=[
  'import {createFileHistoryStore} from '+JSON.stringify(new URL('../src/file-history-store.mjs',import.meta.url).href)+';',
  'import {observeHistory} from '+JSON.stringify(new URL('../src/history.mjs',import.meta.url).href)+';',
  'import {cell} from '+JSON.stringify(pathToFileURL(require.resolve('@red-cup-engineering/signcell/cell')).href)+';',
  'const [path,winner]=process.argv.slice(2),store=createFileHistoryStore(path),base=store.load().history;',
  "process.on('message',()=>{let result;try{store.commit(observeHistory(base,[cell('alice','location',winner,{for:[winner]})]),{clock:Number(winner),pending:[winner]});result={accepted:true,winner};}catch(error){result={accepted:false,winner,reason:error.message};}process.send(result,()=>process.exit(0));});",
  "process.send({ready:true});",
 ].join('\n');
 writeFileSync(script,source);
 const participants=Array.from({length:4},(_,i)=>{
  const child=fork(script,[path,String(i+10)],{stdio:['ignore','ignore','pipe','ipc']});
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
  let ready,settle;const readyPromise=new Promise(resolve=>{ready=resolve;});
  const done=new Promise((resolve,reject)=>{settle=resolve;child.on('error',reject);child.on('exit',code=>{if(code!==0)reject(new Error(stderr||'writer exited '+code));});});
  child.on('message',message=>message.ready?ready():settle(message));
  t.after(()=>{if(child.exitCode===null)child.kill();});
  return {child,ready:readyPromise,done};
 });
 const timeout=setTimeout(()=>{for(const {child} of participants)child.kill();},15000);t.after(()=>clearTimeout(timeout));
 await Promise.all(participants.map(p=>p.ready));
 for(const p of participants)p.child.send({commit:true});
 const results=await Promise.all(participants.map(p=>p.done)),accepted=results.filter(r=>r.accepted);
 assert.equal(accepted.length,1);const winner=accepted[0].winner;
 unlinkSync(path);
 const recovered=createFileHistoryStore(path).load();
 assert.deepEqual(recovered.control,{clock:Number(winner),pending:[winner]});
 assert.deepEqual(queryHistory(recovered.history,{subject:'alice',predicate:'location'}).map(c=>c.object),[winner]);
 assert.equal(materializeHistory(recovered.history).revisions.length,2);
 assert(results.filter(r=>!r.accepted).every(r=>/checkpoint|frontier|publication/i.test(r.reason)));
});
