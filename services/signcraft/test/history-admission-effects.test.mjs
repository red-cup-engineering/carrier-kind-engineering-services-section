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





