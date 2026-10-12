import test from 'node:test';
import assert from 'node:assert/strict';
import { JURAL_KINDS, admitJuralRelations, correlate, poolJuralRelations, readJuralRelations, governanceAct } from "../src/socialize/jural.mjs";
const relation = (kind='power', active='a', passive='b', scope='task:x', standing='potential') => ({kind, active, passive, scope, standing});

test('correlation is an involution preserving every evidence value and identity component', () => {
  for (const kind of JURAL_KINDS) for (const standing of ['potential','active','stable','absurd']) {
    const r=relation(kind,'urn:a:1','b\n:c','scope>with:delimiters',standing);
    assert.deepEqual(correlate(correlate(r)),r);
    assert.equal(correlate(r).standing,standing);
  }
});
test('knowledge pooling is permutation invariant, idempotent, and keeps proposition boundaries', () => {
  const positive=relation(); const negative=relation('power','a','b','task:x','active');
  const separate=relation('power','a\nb','c','task:x');
  const different=relation('power','a','b\nc','task:x');
  const rows=[positive,negative,separate,different];
  assert.deepEqual(poolJuralRelations(rows),poolJuralRelations(rows.toReversed()));
  assert.deepEqual(poolJuralRelations(rows),poolJuralRelations([...rows,...rows]));
  assert.equal(poolJuralRelations(rows).length,3);
  assert.equal(poolJuralRelations([positive,negative])[0].standing,'stable');
});
test('directed acyclic triangle is not a cycle, while reciprocal authority is', () => {
  assert.equal(readJuralRelations([relation('power','a','b'),relation('power','a','c'),relation('power','b','c')]).directedCycle,false);
  assert.equal(readJuralRelations([relation('power','a','b'),relation('power','b','a')]).directedCycle,true);
});
test('contested powers and unknown or differently scoped duties do not establish authority/accountability', () => {
  assert.equal(readJuralRelations([relation(),relation('power','a','b','task:x','active')]).powers,0);
  for (const duty of [relation('duty','a','b','task:x','absurd'),relation('duty','a','b','task:y'),relation('duty','a','c')]) {
    assert.equal(readJuralRelations([relation(),duty]).accountabilityGap,1);
  }
  assert.equal(readJuralRelations([relation(),relation('duty')]).accountabilityGap,0);
});
test('jural topology makes no unsupported governance act, tradition, or cohomology judgment', () => {
  const reading=readJuralRelations([relation()]);
  for (const absent of ['attribution','binding','becoming','operativity','discipline','obstruction','rotational']) assert.equal(absent in reading,false);
  assert.equal(governanceAct({attribution:'potential',binding:'potential',becoming:'absurd'}).operativity,'absurd');
  assert.equal(governanceAct({attribution:'potential',binding:'potential',becoming:'potential'}).operativity,'potential');
  assert.equal(governanceAct({attribution:'stable',binding:'stable',becoming:'stable'}).operativity,'stable');
});
test('admission refuses malformed carriers without interpreting arbitrary text as denial', () => {
  assert.equal(admitJuralRelations('not a duty').kind,'refused');
  assert.equal(admitJuralRelations([{...relation(),standing:'held'}]).kind,'refused');
  assert.equal(admitJuralRelations([relation()]).kind,'admitted');
});
