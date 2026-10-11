import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createFileHistoryStore} from '../src/file-history-store.mjs';
import {collectHistoricalLines,readHistoricalHistory,receiveHistoricalHistory} from '../src/historical-history.mjs';
import {checkpointHistory,materializeHistory,observeHistory,queryHistory} from '../src/history.mjs';
import {cell} from '@red-cup-engineering/signcell/cell';
const here=path=>fileURLToPath(new URL(path,import.meta.url));
const fixture=JSON.parse(readFileSync(here('./fixtures/legacy-history.json'),'utf8'));
const tablesOf=()=>Object.fromEntries(fixture.tables.map(table=>[table.name,structuredClone(table.rows)]));
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
function scratch(body){const root=mkdtempSync(join(tmpdir(),'history-admission-'));try{return body(root);}finally{rmSync(root,{recursive:true,force:true});}}

test('received historical rows become flatfile history that continues, with no database in the process',()=>scratch(root=>{
 const path=join(root,'world.json');
 assert.equal(readHistoricalHistory({}),null);
 const loaded=receiveHistoricalHistory({tables:tablesOf(),store:createFileHistoryStore(path)});
 assert.equal(loaded.control.clock,fixture.expected.control.clock);
 const reference=JSON.parse(readFileSync(path,'utf8'));assert.equal(reference.kind,'content-reference.frontier.v1');
 assertAdmitted(createFileHistoryStore(path));
 unlinkAndReopen(path);
}));
function unlinkAndReopen(path){
 rmSync(path);
 assert.equal(createFileHistoryStore(path).load().control.clock,101,'a missing cache recovers the current publication');
}

test('rows that do not substantiate a recorded checkpoint are refused',()=>{
 const tables=tablesOf();tables.signcraft_history_frontier[0].checkpoint_id='0'.repeat(64);
 assert.throws(()=>receiveHistoricalHistory({tables,store:{retain(){},commit(){},load(){}}}));
 assert.throws(()=>readHistoricalHistory({not_history:[]}),/table name/u);
 const incomplete=tablesOf();incomplete.signcraft_history_control_chunks=[];
 assert.throws(()=>readHistoricalHistory(incomplete),/incomplete chunk data/u);
});

test('the reader\'s lines are checked against their header, counts and terminal line',()=>{
 const line=value=>JSON.stringify(value);
 const good=[line({kind:'source',sha256:'a',tables:{signcraft_history_content:1}}),line({kind:'row',table:'signcraft_history_content',row:{id:'x',parts:1}}),line({kind:'end',sha256:'a',tables:{signcraft_history_content:1}})];
 assert.equal(collectHistoricalLines(good).tables.signcraft_history_content.length,1);
 assert.throws(()=>collectHistoricalLines([good[0],good[2]]),/row count differs/u);
 assert.throws(()=>collectHistoricalLines([good[0],good[1]]),/incomplete/u);
 assert.throws(()=>collectHistoricalLines([good[0],good[1],line({kind:'end',sha256:'b',tables:{signcraft_history_content:1}})]),/changed while it was read/u);
 assert.throws(()=>collectHistoricalLines([good[0],line({kind:'row',table:'other',row:{}}),good[2]]),/outside the declared source/u);
 assert.throws(()=>collectHistoricalLines([...good,good[1]]),/continues after/u);
});


// This is an explicitly authored row carrier, not a generated SQL file.
// The real JS receiver consumes it through stdin; no historical reader runs.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
test('the real JS receiver accepts authored row lines and refuses an occupied target',()=>scratch(root=>{
 const target=join(root,'received','world.json'),tables=tablesOf();
 const sha256=createHash('sha256').update(JSON.stringify(tables)).digest('hex');
 const counts=Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length]));
 const input=[{kind:'source',sha256,tables:counts},...Object.entries(tables).flatMap(([table,rows])=>rows.map(row=>({kind:'row',table,row}))),{kind:'end',sha256,tables:counts}].map(value=>JSON.stringify(value)).join('\n')+'\n';
 const receive=spawnSync(process.execPath,[here('../scripts/receive-historical-history.mjs'),target],{input,encoding:'utf8'});
 assert.equal(receive.status,0,receive.stderr);assert.equal(JSON.parse(receive.stdout).sourceSha256,sha256);
 assertAdmitted(createFileHistoryStore(target));const before=readFileSync(target);
 const again=spawnSync(process.execPath,[here('../scripts/receive-historical-history.mjs'),target],{input,encoding:'utf8'});
 assert.notEqual(again.status,0);assert.match(again.stderr,/target already exists/u);assert.deepEqual(readFileSync(target),before);
}));
