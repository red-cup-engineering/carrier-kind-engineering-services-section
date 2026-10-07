import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialPosition, extend, serialize, deserialize, stonePileRules } from './stone-pile.mjs';
import { validateGameManifest } from '../../../src/running/manifest.mjs';

import { encodePlayRecord, decodePlayRecord, appendMove } from '../../../src/running/play-record.mjs';

test('initialPosition: pure function of (seed, configId) — same inputs, byte-identical output', () => {
  const a = initialPosition('same-seed', 'cfg-1');
  const b = initialPosition('same-seed', 'cfg-1');
  assert.deepEqual(a, b);
});

test('initialPosition: different seeds produce different starting stone counts (not a constant)', () => {
  const counts = new Set();
  for (let i = 0; i < 25; i++) {
    counts.add(initialPosition(`seed-${i}`).stones);
  }
  assert.ok(counts.size > 1, 'expected initialPosition to vary with seed, got a constant');
});

test('initialPosition: stones always land in the documented 10..50 range', () => {
  for (let i = 0; i < 50; i++) {
    const { stones } = initialPosition(`range-check-${i}`);
    assert.ok(stones >= 10 && stones <= 50, `stones ${stones} out of range for seed range-check-${i}`);
  }
});

test('initialPosition: configId changes the seed (and so, generally, the state) even with the same seed string', () => {
  const a = initialPosition('shared-seed', 'cfg-a');
  const b = initialPosition('shared-seed', 'cfg-b');
  assert.notDeepEqual(a, b);
});

test('extend: pure — never mutates the input state', () => {
  const state = initialPosition('mutation-check');
  const before = JSON.stringify(state);
  extend(state, { kind: 'add', amount: 3 });
  assert.equal(JSON.stringify(state), before);
});

test('extend: rejects removing more stones than the pile has', () => {
  const state = initialPosition('reject-check');
  assert.throws(() => extend(state, { kind: 'remove', amount: state.stones + 1 }), RangeError);
});

test('extend: rejects non-positive amounts', () => {
  const state = initialPosition('nonpositive-check');
  assert.throws(() => extend(state, { kind: 'add', amount: 0 }), RangeError);
  assert.throws(() => extend(state, { kind: 'add', amount: -1 }), RangeError);
});

test('extend: emitting pile-emptied only when the pile hits exactly zero', () => {
  const state = initialPosition('empty-check');
  const result = extend(state, { kind: 'remove', amount: state.stones });
  assert.equal(result.state.stones, 0);
  assert.ok(result.events.some((e) => e.kind === 'pile-emptied'));
});

test('serialize/deserialize: round-trips deep-equal', () => {
  const state = initialPosition('serialize-check', 'cfg');
  const restored = deserialize(serialize(state));
  assert.deepEqual(restored, state);
});

test('deserialize: rejects malformed data', () => {
  assert.throws(() => deserialize({ name: 'x' }), TypeError);
  assert.throws(() => deserialize(null), TypeError);
});

test('end-to-end: manifest validates, intent log round-trips, and replay/verify agree — the whole contract, once', () => {
  const manifest = {
    id: 'stone-pile',
    displayName: 'Stone Pile',
    description: 'Reference toy cartridge proving the whole contract round-trips.',
    subdomain: 'stone-pile',
    entryPoints: { headless: '@red-cup-engineering/gaming/test/running/fixtures/stone-pile' },
    seedPolicy: { kind: 'client-supplied' },
    intentLog: { schemaVersion: 'stone-pile-v1' },
    replayVerifier: '@red-cup-engineering/gaming/test/running/fixtures/stone-pile#replay',
    keywords: ['toy', 'reference', 'end-to-end'],
  };
  const manifestResult = validateGameManifest(manifest);
  assert.equal(manifestResult.valid, true, manifestResult.errors.join('; '));

  const seed = 'end-to-end-seed';
  let log = [];
  log = appendMove(log, { kind: 'add', amount: 6 });
  log = appendMove(log, { kind: 'remove', amount: 4 });
  log = appendMove(log, { kind: 'rename', name: 'proven-pile' });

  const wireText = encodePlayRecord(log);
  const decodedLog = decodePlayRecord(wireText);
  assert.deepEqual(decodedLog, log);

  const bareIntents = decodedLog.map((entry) => entry.intent);
  const replayed = stonePileRules.replay(seed, bareIntents);
  assert.equal(replayed.valid, true);
  assert.equal(replayed.finalState.name, 'proven-pile');

  const replayedAgain = stonePileRules.replay(seed, bareIntents);
  assert.equal(replayed.stateHash, replayedAgain.stateHash, 'replay must be deterministic end-to-end');
});
