import assert from 'node:assert/strict';
import test from 'node:test';
import { cell } from '@red-cup-engineering/signcell/cell';
import { checkpointHistory, continueHistory, createHistory, historySubjectCells, observeHistory, queryHistory, replayHistory, restoreHistory } from '../src/history.mjs';

const raw = 'ta\u0302che', normalized = 'tâche';

test('observe, replay, continue and restore retain source and cell representatives with the same revision address', () => {
  const cells = [cell(raw, 'p', { text: raw }, { for: [{ source: raw }] })];
  const held = observeHistory(createHistory(), cells, { source: raw });
  const canonical = observeHistory(createHistory(), [cell(normalized, 'p', { text: normalized }, { for: [{ source: normalized }] })], { source: normalized });
  assert.equal(held.revisions[0].id, canonical.revisions[0].id);
  const replayed = replayHistory(createHistory(), [{ cells, source: raw }]);
  const continued = continueHistory(createHistory(), structuredClone(held.revisions));
  const restored = restoreHistory(structuredClone(held));
  for (const world of [held, replayed, continued, restored]) {
    assert.equal(world.revisions[0].source, raw);
    const values = queryHistory(world, { subject: normalized });
    assert.equal(values[0].subject, raw);
    assert.equal(values[0].object.text, raw);
    assert.equal(values[0].for[0].source, raw);
    assert.equal(world.revisions[0].id, held.revisions[0].id);
  }
});

test('checkpoint restoration preserves retained representatives and private byte content', () => {
  const bytes = new Uint8Array([1, 2]);
  const held = observeHistory(createHistory(), [cell(raw, 'p', { bytes }, { for: [{ source: raw }] })], { source: raw });
  const revision = held.revisions[0].id;
  bytes.fill(9);
  held.revisions[0].cells[0].object.bytes.fill(8);
  assert.equal(held.revisions[0].id, revision);
  const restored = restoreHistory(structuredClone(checkpointHistory(held)));
  const values = historySubjectCells(restored, normalized);
  assert.equal(values[0].subject, raw);
  assert.equal(values[0].for[0].source, raw);
  assert.deepEqual([...values[0].object.bytes], [1, 2]);
  values[0].object.bytes.fill(7);
  assert.deepEqual([...historySubjectCells(restored, raw)[0].object.bytes], [1, 2]);
});
