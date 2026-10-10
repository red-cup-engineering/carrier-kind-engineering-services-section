import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createSqlHistoryStore} from '../src/sql-history-store.mjs';
import {createFileHistoryStore} from '../src/file-history-store.mjs';
import {createHistory,checkpointHistory,materializeHistory,observeHistory,queryHistory,historyHeads,historySize} from '../src/history.mjs';
import {cell} from '@red-cup-engineering/signcell/cell';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/legacy-history.json',import.meta.url),'utf8'));
function legacy(db){
 for(const table of fixture.tables){
  db.exec(table.sql);
  for(const row of table.rows){
   const names=Object.keys(row),query='INSERT INTO '+table.name+'('+names.join(',')+') VALUES('+names.map(()=>'?').join(',')+')';
   db.prepare(query).run(...names.map(name=>row[name]));
  }
 }
}
function binding(db){
 return {sql:{exec(q,...a){if(/^\s*SELECT\b/iu.test(q))return db.prepare(q).all(...a);db.prepare(q).run(...a);return [];}},transactionSync:f=>{db.exec('BEGIN IMMEDIATE');try{const v=f();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
function assertAdmitted(store){
 const loaded=store.load();
 assert.deepEqual(loaded.control,fixture.expected.control);
 assert.equal(loaded.history.checkpoint.id,checkpointHistory(fixture.expected.history).checkpoint.id);
 assert.deepEqual(materializeHistory(loaded.history).revisions,fixture.expected.history.revisions);
 for(const item of fixture.expected.contents)assert.deepEqual(store.content(item.id),item.value);
 const updated=store.commit(observeHistory(loaded.history,[cell('alice','location','library',{for:['visit']})]),{clock:101,pending:['read'],game:loaded.control.game});
 assert.deepEqual(queryHistory(store.load().history,{}),queryHistory(updated,{}));
 assert.equal(store.load().control.clock,101);
}

test('the actual prior SQL material is admitted into flatfiles and continues without the former runtime',()=>{
 const root=mkdtempSync(join(tmpdir(),'history-admission-')),path=join(root,'world.sqlite');
 try{
  const db=new DatabaseSync(path);legacy(db);db.close();
  const store=createFileHistoryStore(path);assertAdmitted(store);
  const reference=JSON.parse(readFileSync(path,'utf8'));assert.equal(reference.kind,'content-reference.frontier.v1');
  assert(readFileSync(path+'.sqlite').subarray(0,16).equals(Buffer.from('SQLite format 3\u0000')),'the original material is retained');
  unlinkSync(path);
  const reopened=createFileHistoryStore(path);assert.equal(reopened.load().control.clock,101,'a missing cache recovers the current publication instead of re-importing the old SQL backup');
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('a cloud SQL binding admits the prior material and retires every former history table after read-back',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  legacy(db);const store=createSqlHistoryStore(binding(db));assertAdmitted(store);
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name);
  assert.deepEqual(tables,['signcraft_content','signcraft_frontier']);
  assert.equal(createSqlHistoryStore(binding(db)).load().control.clock,101);
 }finally{db.close();}
});

test('whole-checkpoint and pre-log legacy representations retain the same evidence and control on admission',()=>{
 for(const format of ['whole-checkpoint','pre-log']){
  const db=new DatabaseSync(':memory:');
  try{
   legacy(db);
   if(format==='whole-checkpoint'){
    const checkpoint=checkpointHistory(fixture.expected.history).checkpoint;
    db.exec('DROP TABLE signcraft_history_frontier;CREATE TABLE signcraft_history_state(id INTEGER PRIMARY KEY,checkpoint_id TEXT,checkpoint_parts INTEGER,control_parts INTEGER,next_sequence INTEGER);CREATE TABLE signcraft_history_checkpoint_chunks(id INTEGER,part INTEGER,payload TEXT)');
    db.prepare('INSERT INTO signcraft_history_state VALUES(1,?,1,1,0)').run(checkpoint.id);
    db.prepare('INSERT INTO signcraft_history_checkpoint_chunks VALUES(1,0,?)').run(JSON.stringify({checkpoint}));
   }else{
    db.exec('ALTER TABLE signcraft_history_frontier DROP COLUMN log_from');
    fixture.expected.history.revisions.forEach((r,index)=>{
     db.prepare('INSERT INTO signcraft_history_revisions VALUES(?,?,1)').run(r.id,index);
     db.prepare('INSERT INTO signcraft_history_revision_chunks VALUES(?,0,?)').run(r.id,JSON.stringify(r));
    });
    db.exec('DELETE FROM signcraft_history_log');
   }
   assertAdmitted(createSqlHistoryStore(binding(db)));
  }finally{db.close();}
 }
});

test('corrupt legacy material cannot be retired or replace its admitted predecessor',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  legacy(db);db.prepare('UPDATE signcraft_history_log SET payload=? WHERE part=0').run('[]');
  assert.throws(()=>createSqlHistoryStore(binding(db)),/archive|checkpoint|identity|substantiate|absent|missing/);
  assert(db.prepare("SELECT name FROM sqlite_master WHERE name='signcraft_history_frontier'").get());
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM signcraft_frontier').get().n,0);
 }finally{db.close();}
});


test('an unused SQL store preserves retained content and admits no invented world or clock',()=>{
 const dir=mkdtempSync(join(tmpdir(),'history-empty-'));
 try{
  for(const medium of ['file','sql']){
   const path=join(dir,'empty.sqlite'),db=new DatabaseSync(medium==='file'?path:':memory:');
   for(const table of fixture.tables){db.exec(table.sql);if(table.name.includes('_content'))for(const row of table.rows){const names=Object.keys(row);db.prepare('INSERT INTO '+table.name+'('+names.join(',')+') VALUES('+names.map(()=>'?').join(',')+')').run(...names.map(name=>row[name]));}}
   let store;
   if(medium==='file'){db.close();store=createFileHistoryStore(path);assert.equal(JSON.parse(readFileSync(path,'utf8')).content,null);}
   else store=createSqlHistoryStore(binding(db));
   assert.equal(store.load(),null);
   for(const item of fixture.expected.contents)assert.deepEqual(store.content(item.id),item.value);
   if(medium==='sql'){assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name),['signcraft_content','signcraft_frontier']);db.close();}
   else{assert.equal(createFileHistoryStore(path).load(),null);const history=observeHistory(createHistory(['location']),[cell('alice','location','garden',{for:['first-visit']})]);store.commit(history,{clock:1});assert.equal(createFileHistoryStore(path).load().control.clock,1);}
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
