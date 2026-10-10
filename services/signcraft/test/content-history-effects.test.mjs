import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,readdirSync,statSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {cell} from '@red-cup-engineering/signcell/cell';
import {semanticId} from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';
import {createHistory,observeHistory,queryHistory,materializeHistory,historyHeads,historySize,withFunctionalPredicates,checkpointHistory} from '../src/history.mjs';
import {createSqlHistoryStore} from '../src/sql-history-store.mjs';
import {createFileHistoryStore} from '../src/file-history-store.mjs';
import {createFileStoreSync} from '@red-cup-engineering/immutable-content-custody-service/file-store';
import {createFileContentReference} from '@red-cup-engineering/immutable-content-custody-service/file-reference';
import {immutableContentKey} from '@red-cup-engineering/immutable-content-custody-service';

const at=(s,p,o,w='w')=>cell(s,p,o,{for:[w]});
function sqlFixture(path=':memory:'){
 const db=new DatabaseSync(path);let failOn;
 const sql={exec(query,...args){if(failOn&&query.includes(failOn))throw new Error('publication refused');if(/^\s*SELECT\b/iu.test(query))return db.prepare(query).all(...args);db.prepare(query).run(...args);return [];}};
 const transactionSync=operation=>{db.exec('BEGIN IMMEDIATE');try{const result=operation();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {db,sql,transactionSync,store:()=>createSqlHistoryStore({sql,transactionSync}),failOn:value=>{failOn=value;}};
}
function same(a,b){
 assert.deepEqual(queryHistory(a,{}),queryHistory(b,{}));assert.deepEqual(historyHeads(a),historyHeads(b));assert.equal(historySize(a),historySize(b));
}
function files(root){
 const result=new Map();if(!statExists(root))return result;
 function visit(path){for(const entry of readdirSync(path,{withFileTypes:true})){const at=join(path,entry.name);if(entry.isDirectory())visit(at);else if(entry.isFile())result.set(at,readFileSync(at));}}
 visit(root);return result;
}
function statExists(path){try{return statSync(path).isDirectory();}catch{return false;}}

test('the same native carrier retains evidence, skills, locations and causal ancestry over SQL and flatfiles',()=>{
 const dir=mkdtempSync(join(tmpdir(),'signcraft-content-')),database=sqlFixture();
 try{
  for(const store of [database.store(),createFileHistoryStore(join(dir,'world.json'))]){
   let full=createHistory(['location']);
   full=observeHistory(full,[at('alice','location','garden'),at('alice','skill:building',1),cell('workshop','open',true,{for:['opened'],against:['disputed']})],{source:'inhabit'});
   let held=store.commit(full,{clock:1,queue:['learn']});
   for(let turn=0;turn<60;turn++){
    const batch=[at('alice','location',turn%2?'garden':'workshop','step-'+turn),at('alice','experience',turn,'practice-'+turn)];
    full=observeHistory(full,batch,{source:'practice'});held=observeHistory(held,batch,{source:'practice'});
    held=store.commit(held,{clock:turn+2,queue:turn===59?['build']:[]});
   }
   const loaded=store.load();same(loaded.history,full);same(materializeHistory(loaded.history),full);
   assert.deepEqual(loaded.control,{clock:61,queue:['build']});
   assert.deepEqual(materializeHistory(held).revisions,full.revisions);
   const widened=withFunctionalPredicates(loaded.history,['skill:building','experience']);
   const committed=store.commit(widened,{clock:62,queue:['build']});
   same(store.load().history,widened);same(materializeHistory(committed),widened);
   const priorContent=store.retain(Object.freeze({authored:'Garden 😀',body:'x'.repeat(210000)}));
   assert.equal(store.content(priorContent).body.length,210000);
  }
 }finally{database.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('flatfile commits keep every held semantic object immutable and recover through a missing or stale reference cache',()=>{
 const dir=mkdtempSync(join(tmpdir(),'signcraft-reference-')),path=join(dir,'world.json');
 try{
  const store=createFileHistoryStore(path);let full=observeHistory(createHistory(['location']),[at('alice','location','garden')]);
  let held=store.commit(full,{clock:0}),previous=files(path+'.content'),cache=readFileSync(path);
  for(let i=0;i<25;i++){
   const batch=[at('alice','location',i%2?'garden':'workshop','move-'+i),at('alice','experience',i,'e-'+i)];
   full=observeHistory(full,batch);held=store.commit(observeHistory(held,batch),{clock:i+1});
   const now=files(path+'.content');for(const [file,bytes] of previous)assert.deepEqual(now.get(file),bytes,'retained content was rewritten');
   previous=now;
  }
  unlinkSync(path);same(createFileHistoryStore(path).load().history,full);
  writeFileSync(path,cache);const resumed=createFileHistoryStore(path).load();same(resumed.history,full);assert.equal(resumed.control.clock,25);
  const stale=createFileHistoryStore(path).load().history;
  held=store.commit(observeHistory(held,[at('alice','location','library')]),{clock:26});
  assert.throws(()=>createFileHistoryStore(path).commit(observeHistory(stale,[at('alice','location','forge')]),{clock:26}),/persisted checkpoint/);
  same(createFileHistoryStore(path).load().history,held);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('failed SQL publication leaves the prior world/control visible and corruption is refused in its own carrier',()=>{
 const fixture=sqlFixture();
 try{
  const store=fixture.store();let history=observeHistory(createHistory(['location']),[at('alice','location','garden')]);
  const original=history.revisions[0];let held=store.commit(history,{clock:1});
  history=observeHistory(held,[at('alice','location','workshop')]);fixture.failOn('INSERT INTO signcraft_frontier');
  assert.throws(()=>store.commit(history,{clock:2}),/publication refused/);fixture.failOn(null);
  assert.equal(store.load().control.clock,1);same(store.load().history,held);
  held=store.commit(history,{clock:2});
  fixture.sql.exec('UPDATE signcraft_content SET payload=? WHERE id=? AND part=0','{}',original.id);
  assert.equal(store.load().control.clock,2,'superseded evidence is not a current reading');
  assert.throws(()=>materializeHistory(store.load().history),/does not match its address/);
  const id=store.retain({world:'Authored 😀',body:'L'.repeat(400000)});
  fixture.sql.exec('DELETE FROM signcraft_content WHERE id=? AND part=1',id);
  assert.throws(()=>store.content(id),/incomplete chunk/);
  const tables=[...fixture.sql.exec("SELECT name FROM sqlite_master WHERE type='table'")].map(row=>row.name);
  assert.deepEqual(tables.sort(),['signcraft_content','signcraft_frontier']);
 }finally{fixture.db.close();}
});

test('a corrupt referenced current cell or index cannot be exposed from flatfile custody',()=>{
 const dir=mkdtempSync(join(tmpdir(),'signcraft-corrupt-')),path=join(dir,'world.json');
 try{
  const store=createFileHistoryStore(path),history=observeHistory(createHistory(),[at('library','text','Exact e\u0301 😀 resource '+ 'Q'.repeat(250000))]);
  store.commit(history,{clock:1});const id=history.revisions[0].id;
  const objects=createFileStoreSync(path+'.content');objects.putCurrent('semantic/'+immutableContentKey(id),{body:Buffer.from('{}'),mediaType:'application/json'});
  assert.throws(()=>store.load(),/does not match its address/);
  assert.throws(()=>createFileHistoryStore(path).load(),/does not match its address/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('retained first-generation frontiers remain readable while new publication retires the full-order writer',()=>{
 const dir=mkdtempSync(join(tmpdir(),'history-first-frontier-')),path=join(dir,'world.json');
 try{
  const store=createFileHistoryStore(path),full=observeHistory(createHistory(['location']),[at('alice','location','garden'),at('workshop','open',true),at('alice','skill:building',2)]);
  store.commit(full,{clock:1});const root=JSON.parse(readFileSync(path,'utf8')).content,f=store.content(root);
  const old={kind:'signcraft.history-frontier.v1',previous:root,checkpoint:f.checkpoint,heads:f.heads,size:f.size,functionalPredicates:f.functionalPredicates,reading:f.reading,subjects:[...new Set(checkpointHistory(full).checkpoint.cells.map(c=>semanticId(c.subject)))],control:f.control};
  const id=store.retain(old);createFileContentReference(path).publish(root,id);
  const restored=createFileHistoryStore(path),loaded=restored.load();same(loaded.history,full);assert.deepEqual(loaded.control,{clock:1});
  restored.commit(loaded.history,loaded.control);const current=restored.content(JSON.parse(readFileSync(path,'utf8')).content);
  assert.equal(current.kind,'signcraft.history-frontier.v2');assert.equal(current.subjects,undefined);assert.equal(current.subjectCount,2);
  same(restored.load().history,full);same(materializeHistory(restored.load().history),full);
  assert.deepEqual(restored.content(id),old,'retained prior material keeps its identity');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('structured control retains exact pending delivery values and refuses corruption in an earlier member',()=>{
 const dir=mkdtempSync(join(tmpdir(),'history-control-')),path=join(dir,'world.json');
 try{
  const store=createFileHistoryStore(path);let held=createHistory(['location']),messages=[];
  for(let i=0;i<35;i++){messages=[...messages,{sequence:i,text:'Delivery 😀 '+i+' '+('x'.repeat(700))}];held=store.commit(observeHistory(held,[at('alice','location','garden','step-'+i)]),{clock:i,pending:messages});}
  const loaded=store.load();assert.deepEqual(loaded.control,{clock:34,pending:messages});assert.deepEqual(store.content(semanticId(loaded.control)),loaded.control);
  const f=store.content(JSON.parse(readFileSync(path,'utf8')).content),record=JSON.parse(createFileStoreSync(path+'.content').get('semantic/'+immutableContentKey(f.control)).body.toString('utf8'));
  assert.equal(record.kind,'signcraft.structured-content.v1');
  const key='semantic/'+immutableContentKey(semanticId(messages[0].text));
  createFileStoreSync(path+'.content').putCurrent(key,{body:Buffer.from(JSON.stringify('changed earlier delivery')),mediaType:'application/json'});
  assert.throws(()=>store.load(),/does not match|not retained/);assert.throws(()=>store.content(f.control),/does not match|not retained/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
