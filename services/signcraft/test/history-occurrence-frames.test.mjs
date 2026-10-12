import test from 'node:test';
import assert from 'node:assert/strict';
import {cell} from '@red-cup-engineering/signcell/cell';
import {createHistory,observeHistory,restoreHistory,checkpointHistory,bindHistoryArchive,
 captureHistoryOccurrences,readCapturedHistoryOccurrences,isHistoryOccurrenceFrameFor,
 historyOccurrenceFrameIsCurrent,rebindHistoryOccurrenceFrame,captureHistoryReads,
 withFunctionalPredicates} from '../src/history.mjs';
const fact=(subject='office',predicate='name',object='Old')=>cell(subject,predicate,object,{for:['source']});
const base=()=>observeHistory(createHistory(),[fact(),fact('other')]);
const detached=H=>restoreHistory(JSON.parse(JSON.stringify(checkpointHistory(H))));

test('one captured archive supplies all subject reads and replays the genuine broad footprint',()=>{
 const full=base(),H=detached(full);let calls=0;bindHistoryArchive(H,()=>{calls++;return full.revisions;});const frame=captureHistoryOccurrences(H,{archive:true});assert.equal(calls,1);
 for(let i=0;i<20;i++){readCapturedHistoryOccurrences(frame,'office');readCapturedHistoryOccurrences(frame,'other');}assert.equal(calls,1);
 const captured=captureHistoryReads(()=>readCapturedHistoryOccurrences(frame,'office'));assert.deepEqual(captured.reads,[{}]);assert.equal(captured.result.rows.length,1);
});

test('frames are privately admitted immutable exact-history carriers',()=>{
 const H=base(),frame=captureHistoryOccurrences(H,{archive:true});assert.equal(isHistoryOccurrenceFrameFor(frame,H),true);
 for(const invalid of [null,undefined,{},JSON.parse(JSON.stringify(frame))])assert.equal(isHistoryOccurrenceFrameFor(invalid,H),false);
 assert.equal(isHistoryOccurrenceFrameFor(frame,restoreHistory(JSON.parse(JSON.stringify(H)))) ,false);
 assert.throws(()=>frame.rows.pop(),TypeError);assert.throws(()=>readCapturedHistoryOccurrences({...frame},'office'));
});

test('archive availability changes in either direction invalidate same-H captured evidence',()=>{
 const full=base(),H=detached(full);let available=false;bindHistoryArchive(H,()=>available?full.revisions:undefined);
 const absent=captureHistoryOccurrences(H,{archive:true});assert.equal(historyOccurrenceFrameIsCurrent(absent),true);
 available=true;assert.equal(historyOccurrenceFrameIsCurrent(absent),false);const present=captureHistoryOccurrences(H,{archive:true});assert.equal(historyOccurrenceFrameIsCurrent(present),true);
 available=false;assert.equal(historyOccurrenceFrameIsCurrent(present),false);
});

test('changed history and functional schema acquire distinct frames',()=>{
 const H=base(),frame=captureHistoryOccurrences(H,{archive:true}),next=observeHistory(H,[fact('office','name','New')]);
 const rebound=rebindHistoryOccurrenceFrame(frame,next);assert.equal(isHistoryOccurrenceFrameFor(rebound,next),true);assert.notEqual(rebound.id,frame.id);
 const schema=withFunctionalPredicates(H,['name']);const changed=captureHistoryOccurrences(schema,{archive:true});assert.notEqual(changed.id,frame.id);
});

test('structured, numeric and Unicode subjects retain genuine canonical coincidence',()=>{
 for(const subject of [0,7,{kind:'fixture',name:'é'},'é']){
  const H=observeHistory(createHistory(),[fact(subject)]),frame=captureHistoryOccurrences(H,{archive:true});
  assert.equal(readCapturedHistoryOccurrences(frame,JSON.parse(JSON.stringify(subject))).rows.length,1);assert.equal(readCapturedHistoryOccurrences(frame,'absent').rows.length,0);
 }
});
