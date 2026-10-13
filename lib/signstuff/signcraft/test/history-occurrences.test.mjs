import assert from 'node:assert/strict';
import test from 'node:test';
import { cell } from '@red-cup-engineering/signcell/cell';
import { createHistory, observeHistory, restoreHistory, historyChanges, historySubjectCells,
  historyRawOccurrences, historyDerivation, historySection, captureHistoryReads,
  checkpointHistory, bindHistoryArchive, historyHeads, historySize, materializeHistory,
  mergeHistories } from '@red-cup-engineering/signcraft/history';
const raw = () => cell('office','name','Old name',{for:[{source:'metroplat.world:places',parents:[],position:0}]});
const seeded = (functional=[]) => observeHistory(createHistory(functional),[raw()]);
const restored = H => restoreHistory({...H,revisions:[...H.revisions]});

test('same-byte duplicate observations retain distinct exact addressed occurrences',()=>{
  const a=seeded(),b=restored(observeHistory(a,[a.revisions[0].cells[0]]));
  assert.deepEqual(historyChanges(a,b),[]);
  const rows=historyRawOccurrences(b,'office').rows;
  assert.equal(rows.length,2); assert.deepEqual(rows.map(r=>r.cell),[raw(),raw()]);
  assert.deepEqual(rows.map(r=>r.occurrence),b.revisions.map(r=>({revisionId:r.id,cellIndex:0})));
});

test('functional overwrite of identical bytes reports only the new occurrence',()=>{
  const a=seeded(['name']),b=restored(observeHistory(a,[a.revisions[0].cells[0]]));
  assert.deepEqual(historyChanges(a,b),[]);
  const rows=historyRawOccurrences(b,'office','name').rows;
  assert.equal(rows.length,1); assert.equal(rows[0].occurrence.revisionId,b.revisions[1].id);
});

test('two equal cells in one revision retain distinct cell indexes',()=>{
  const value=raw(),H=observeHistory(createHistory(),[value,value]);
  assert.deepEqual(historyRawOccurrences(H,'office').rows.map(r=>r.occurrence.cellIndex),[0,1]);
});

test('concurrent functional alternatives preserve supplier-selected occurrence rows',()=>{
  const base=createHistory(['name']),a=observeHistory(base,[raw()]),other=cell('office','name','Other',{against:[{by:'bob'}]});
  const b=observeHistory(base,[other]),H=mergeHistories(a,b),rows=historyRawOccurrences(H,'office','name').rows;
  assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.cell),historySubjectCells(H,'office'));
  assert.ok(rows.every(r=>r.occurrence && Number.isInteger(r.occurrence.cellIndex)));
});

test('direct and warm derived occurrence reads rerun even on unchanged cell diffs',()=>{
  let calls=0;const derive=historyDerivation(H=>{calls++;return historyRawOccurrences(H,'office').rows;});
  const a=seeded(),first=derive(a);assert.equal(derive(a),first);assert.equal(calls,2);
  const b=restored(observeHistory(a,[a.revisions[0].cells[0]]));
  assert.equal(derive(b).length,2);assert.equal(calls,3);
});

test('nested and prewarmed occurrence dependency remains transitive when result is equal',()=>{
  let innerRuns=0,outerRuns=0;
  const inner=historyDerivation(H=>{innerRuns++;historyRawOccurrences(H,'office');return 42;});
  const outer=historyDerivation(H=>{outerRuns++;return inner(H)+1;});
  const a=seeded(); inner(a); outer(a); outer(a);
  const b=restored(observeHistory(a,[a.revisions[0].cells[0]]));outer(b);
  assert.equal(innerRuns,4);assert.equal(outerRuns,3);
});

test('cold and warm proposals receive an ordinary conservative all-cell footprint',()=>{
  const H=seeded(),inner=historyDerivation(h=>historyRawOccurrences(h,'missing','name'));
  const outer=historyDerivation(h=>inner(h)); outer(H);
  for(let n=0;n<2;n++) assert.deepEqual(captureHistoryReads(()=>outer(H)).reads,[{}]);
});

test('ordinary query derivations retain warm and unrelated-history reuse',()=>{
  let runs=0;const derive=historyDerivation(H=>{runs++;return historySection(H,'office','name');});
  const a=seeded(),first=derive(a);assert.equal(derive(a),first);
  const b=observeHistory(a,[cell('elsewhere','name','Other',{for:[{}]})]);
  assert.equal(derive(b),first);assert.equal(runs,1);
});

test('checkpoint provenance stays unresolved without archived ancestry',()=>{
  const H=seeded(),cut=restoreHistory(JSON.parse(JSON.stringify(checkpointHistory(H))));
  const found=historyRawOccurrences(cut,'office');
  assert.equal(found.rows[0].occurrence,null);assert.equal(found.rows[0].checkpointId,cut.checkpoint.id);
  assert.equal(found.unresolved[0].kind,'checkpoint-occurrences-unresolved');
  const attempted=historyRawOccurrences(cut,'office',undefined,{archive:true});
  assert.equal(attempted.rows[0].occurrence,null);assert.equal(attempted.unresolved[0].kind,'archive-unresolved');
});

test('adding an archive at the same H invalidates nested warm occurrence reads',()=>{
  const H=seeded(),cut=restoreHistory(JSON.parse(JSON.stringify(checkpointHistory(H))));
  let runs=0;const inner=historyDerivation(h=>historyRawOccurrences(h,'office',undefined,{archive:true}));
  const outer=historyDerivation(h=>{runs++;return inner(h);});
  assert.equal(outer(cut).rows[0].occurrence,null);
  bindHistoryArchive(cut,()=>H.revisions);
  const found=outer(cut);assert.equal(found.unresolved.length,0);
  assert.equal(found.rows[0].occurrence.revisionId,H.revisions[0].id);assert.equal(runs,2);
});

test('incorrect archive cannot produce invented occurrence attribution',()=>{
  const H=seeded(),cut=restoreHistory(JSON.parse(JSON.stringify(checkpointHistory(H))));
  bindHistoryArchive(cut,()=>[]);
  const found=historyRawOccurrences(cut,'office',undefined,{archive:true});
  assert.equal(found.rows[0].occurrence,null);assert.equal(found.unresolved[0].kind,'archive-unresolved');
});

test('checkpoint plus exact tail retains tail identity while checkpoint remains unresolved',()=>{
  const H=seeded(),cut=checkpointHistory(H),next=observeHistory(cut,[cell('office','tag','office',{for:[{}]})]);
  const rows=historyRawOccurrences(next,'office').rows;
  assert.equal(rows.length,2);assert.equal(rows[0].occurrence,null);
  assert.deepEqual(rows[1].occurrence,{revisionId:next.revisions[0].id,cellIndex:0});
});

test('occurrence reading and archive materialization preserve the original carrier',()=>{
  const H=seeded(),cut=checkpointHistory(H),wire=JSON.stringify(cut),heads=historyHeads(cut),size=historySize(cut);
  bindHistoryArchive(cut,()=>H.revisions);
  const a=historyRawOccurrences(cut,'office',undefined,{archive:true});
  const b=historyRawOccurrences(materializeHistory(cut),'office');
  assert.deepEqual(a.rows,b.rows);assert.equal(JSON.stringify(cut),wire);
  assert.deepEqual(historyHeads(cut),heads);assert.equal(historySize(cut),size);
});

test('newly decoded tampered revision cells are refused before occurrence admission',()=>{
  const H=JSON.parse(JSON.stringify(seeded()));H.revisions[0].cells[0].object='tampered';
  assert.throws(()=>historyRawOccurrences(H,'office'),/content address/);
});
