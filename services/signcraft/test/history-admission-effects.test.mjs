import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync,unlinkSync,existsSync,writeFileSync,chmodSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {receiveHistoricalHistory} from '../scripts/historical-history-receiving/receive.mjs';
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

const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
function historicalFixture(run){
 const root=mkdtempSync(join(tmpdir(),'history-admission-')),source=join(root,'original.sqlite'),destination=join(root,'native-history');
 try{const db=new DatabaseSync(source);legacy(db);db.close();run({root,source,destination,expectedSha256:digest(source)});}finally{rmSync(root,{recursive:true,force:true});}
}
test('explicit offline receiving preserves the actual prior history and continues natively without changing original evidence',()=>historicalFixture(({source,destination,expectedSha256})=>{
 assert.throws(()=>createFileHistoryStore(source),/explicit offline receiving/);
 assert(!existsSync(source+'.content'));assert(!existsSync(source+'.transitions'));
 const receipt=receiveHistoricalHistory({sourcePath:source,destination,expectedSha256});
 assert.equal(receipt.sourceUnchanged,true);assert.equal(receipt.startupClearance,false);assert.equal(receipt.runtimeInstalled,false);
 assert.equal(digest(source),expectedSha256);
 const store=createFileHistoryStore(destination);assertAdmitted(store);
 const reference=JSON.parse(readFileSync(destination,'utf8'));assert.equal(reference.kind,'content-reference.frontier.v1');
 assert(readFileSync(source).subarray(0,16).equals(Buffer.from('SQLite format 3\u0000')),'the original material is retained byte-for-byte');
 unlinkSync(destination);
 const reopened=createFileHistoryStore(destination);assert.equal(reopened.load().control.clock,101,'native publication recovers the current state without SQL');
 assert.equal(digest(source),expectedSha256);
}));
test('incorrect source identity produces no native destination',()=>historicalFixture(({source,destination})=>{
 assert.throws(()=>receiveHistoricalHistory({sourcePath:source,destination,expectedSha256:'0'.repeat(64)}),/identity changed/);assert(!existsSync(destination+'.content'));
}));
test('unresolved transaction custody refuses receiving before native writes',()=>historicalFixture(({source,destination,expectedSha256})=>{
 writeFileSync(source+'-wal','unreceived');assert.throws(()=>receiveHistoricalHistory({sourcePath:source,destination,expectedSha256}),/transaction custody/);assert(!existsSync(destination+'.content'));
}));
test('offline receiving cannot overwrite received state on replay',()=>historicalFixture(({source,destination,expectedSha256})=>{
 receiveHistoricalHistory({sourcePath:source,destination,expectedSha256});const current=readFileSync(destination);
 assert.throws(()=>receiveHistoricalHistory({sourcePath:source,destination,expectedSha256}),/fresh isolated destination/);assert.deepEqual(readFileSync(destination),current);
}));
test('historical sidecars obstruct ordinary startup before any native writes',()=>historicalFixture(({source,destination})=>{
 writeFileSync(destination+'-wal','');assert.throws(()=>createFileHistoryStore(destination),/custody obstructs/);assert(!existsSync(destination+'.content'));
}));
test('retained SQL alongside a native path never silently grants runtime clearance',()=>historicalFixture(({source,destination,expectedSha256})=>{
 receiveHistoricalHistory({sourcePath:source,destination,expectedSha256});symlinkSync(source,destination+'.sqlite');assert.throws(()=>createFileHistoryStore(destination),/unlinked regular file/);
}));
test('receiving refuses public destination custody',()=>historicalFixture(({root,source,destination,expectedSha256})=>{
 chmodSync(root,0o755);assert.throws(()=>receiveHistoricalHistory({sourcePath:source,destination,expectedSha256}),/private owned directory/);assert(!existsSync(destination+'.content'));
}));
