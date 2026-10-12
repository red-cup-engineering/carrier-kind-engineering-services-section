import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameRules, replayPlay, hashPosition, playVerifier } from '../../src/running/rules.mjs';
import { appendMove } from '../../src/running/play-record.mjs';
import { canonicalJson } from '@red-cup-engineering/json-services-section/canonical-json';

// A tiny counter engine, deliberately simpler than the pig-fixture, to test gameRules in
// isolation from any one game's rules.
function initialPosition(seed) {
  return { seed, count: 0 };
}
function extend(state, intent) {
  if (intent.kind === 'add') {
    return { state: { ...state, count: state.count + (intent.by ?? 1) }, events: [{ kind: 'added', by: intent.by ?? 1 }] };
  }
  throw new TypeError(`unknown intent kind "${intent.kind}"`);
}

test('gameRules: assembles a full Cartridge from just initialPosition + extend', () => {
  const cartridge = gameRules(initialPosition, extend);
  assert.equal(typeof cartridge.initialPosition, 'function');
  assert.equal(typeof cartridge.extend, 'function');
  assert.equal(typeof cartridge.replay, 'function');
  assert.equal(typeof cartridge.serialize, 'function');
  assert.equal(typeof cartridge.deserialize, 'function');
});

test('gameRules: replay delegates to @red-cup-engineering/gaming/running/rules\'s replayPlay', () => {
  const cartridge = gameRules(initialPosition, extend);
  const intents = [{ kind: 'add', by: 3 }, { kind: 'add', by: 4 }];
  const viaCartridge = cartridge.replay('seed-x', intents);
  const viaDirect = replayPlay({ initialPosition, extend }, 'seed-x', intents);
  assert.deepEqual(viaCartridge, viaDirect);
  assert.equal(viaCartridge.finalState.count, 7);
});

test('gameRules: default serialize/deserialize are the identity function', () => {
  const cartridge = gameRules(initialPosition, extend);
  const state = cartridge.initialPosition('serialize-seed');
  assert.equal(cartridge.serialize(state), state);
  assert.equal(cartridge.deserialize(state), state);
});

test('gameRules: a caller-supplied serialize/deserialize overrides the identity default', () => {
  const cartridge = gameRules(initialPosition, extend, {
    serialize: (s) => ({ ...s, tag: 'custom' }),
    deserialize: (d) => ({ seed: d.seed, count: d.count }),
  });
  const state = cartridge.initialPosition('override-seed');
  const serialized = cartridge.serialize(state);
  assert.equal(serialized.tag, 'custom');
  assert.deepEqual(cartridge.deserialize(serialized), state);
});

test('gameRules: rejects a non-function initialPosition or extend', () => {
  assert.throws(() => gameRules(null, extend), TypeError);
  assert.throws(() => gameRules(initialPosition, null), TypeError);
});

test('gameRules: carries an optional terminal predicate into replay', () => {
  const cartridge = gameRules(initialPosition, extend, { isTerminal: (state) => state.count === 1 });
  const result = cartridge.replay('terminal-cartridge', [
    { kind: 'add' },
    { kind: 'add', by: 100 },
  ]);
  assert.equal(result.finalState.count, 1);
  assert.throws(() => gameRules(initialPosition, extend, { isTerminal: true }), TypeError);
});

test('re-exports: hashPosition, playVerifier, appendMove, canonicalJson are the real @red-cup-engineering/gaming/running implementations, not reimplementations', () => {
  assert.equal(typeof hashPosition, 'function');
  assert.equal(typeof playVerifier, 'function');
  assert.equal(typeof appendMove, 'function');
  assert.equal(typeof canonicalJson, 'function');
  // canonicalJson's own documented behavior: key-order independence.
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
});

test('re-exports: hashPosition is stable across two independently-built but deep-equal states', () => {
  assert.equal(hashPosition({ a: 1, b: [1, 2, 3] }), hashPosition({ b: [1, 2, 3], a: 1 }));
});
