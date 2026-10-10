import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {cell} from '@red-cup-engineering/signcell/cell';
import {createHistory,observeHistory,queryHistory,materializeHistory,historyHeads,historySize} from '../src/history.mjs';
import {createSqlHistoryStore} from '../src/sql-history-store.mjs';
import {createSqlContentHistoryStore} from '../src/sql-content-history-store.mjs';

const at=(s,p,o,w='w')=>cell(s,p,o,{for:[w]});
function sqlFixture(){
 const db=new DatabaseSync(':memory:');
 const sql={exec(query,...args){if(/^\s*SELECT\b/iu.test(query))return db.prepare(query).all(...args);db.prepare(query).run(...args);return [];}};
 const transactionSync=operation=>{db.exec('BEGIN IMMEDIATE');try{const result=operation();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 const tables=()=>db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name);
 return {db,sql,transactionSync,tables};
}
function same(a,b){assert.deepEqual(queryHistory(a,{}),queryHistory(b,{}));assert.deepEqual(historyHeads(a),historyHeads(b));assert.equal(historySize(a),historySize(b));}

test('the SQL content port commits, reloads and retains through the shared content kernel',()=>{
 const f=sqlFixture();
 try{
  const store=createSqlContentHistoryStore(f);
  assert.equal(store.load(),null);
  let full=observeHistory(createHistory(['location']),[at('alice','location','garden'),at('alice','skill:building',1)],{source:'inhabit'});
  store.commit(full,{clock:1});
  for(let turn=0;turn<20;turn++){
   full=observeHistory(full,[at('alice','location',turn%2?'garden':'workshop','step-'+turn)],{source:'practice'});
   store.commit(full,{clock:turn+2});
  }
  const reopened=createSqlContentHistoryStore(f).load();
  same(reopened.history,full);same(materializeHistory(reopened.history),full);
  assert.deepEqual(reopened.control,{clock:21});
  const id=store.retain(Object.freeze({authored:'Garden',body:'x'.repeat(400000)}));
  assert.equal(store.content(id).body.length,400000,'content larger than one chunk reads back whole');
  assert.deepEqual(f.tables(),['signcraft_content','signcraft_frontier']);
 }finally{f.db.close();}
});

test("opening the content port over the owner store's tables imports that history and retires the old tables",()=>{
 const f=sqlFixture();
 try{
  let full=observeHistory(createHistory(['location']),[at('bob','location','quay')],{source:'arrive'});
  const owner=createSqlHistoryStore(f);
  owner.commit(full,{tick:1});
  full=observeHistory(full,[at('bob','location','market','walk')],{source:'walk'});
  owner.commit(full,{tick:2});
  assert.ok(f.tables().some(name=>name.startsWith('signcraft_history_')));
  const port=createSqlContentHistoryStore(f);
  const loaded=port.load();
  same(loaded.history,full);
  assert.deepEqual(loaded.control,{tick:2});
  assert.ok(!f.tables().some(name=>name.startsWith('signcraft_history_')),'the imported tables are retired');
  same(createSqlContentHistoryStore(f).load().history,full);
 }finally{f.db.close();}
});
