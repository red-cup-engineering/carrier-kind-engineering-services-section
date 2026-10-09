import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { replayPlay, hashPosition, playVerifier } from '../../src/running/rules.mjs';
import { appendMove } from '../../src/running/play-record.mjs';
import { canonicalJson } from '@red-cup-engineering/json-services-section/canonical-json';

import { stonePileRules, initialPosition, extend } from './fixtures/stone-pile.mjs';

/** hashPosition exactly as it was implemented before the pure-JS sha256.mjs migration — kept
 *  here, isolated, only to prove digest-equivalence below. Uses node:crypto directly, so
 *  this helper itself would fail to load in a browser; that's fine, it never ships, it's
 *  purely the old-implementation half of an equivalence check run in Node. */
function oldNodeCryptoHashState(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

// Deterministic pseudo-random generator for property-style tests — no Math.random(),
// fully reproducible across runs, matching house convention even inside test code.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genIntents(rng, count, startStones) {
  const intents = [];
  let stones = startStones;
  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (roll < 0.5 || stones === 0) {
      const amount = 1 + Math.floor(rng() * 5);
      intents.push({ kind: 'add', amount });
      stones += amount;
    } else if (roll < 0.9) {
      const amount = 1 + Math.floor(rng() * Math.min(5, stones));
      intents.push({ kind: 'remove', amount });
      stones -= amount;
    } else {
      intents.push({ kind: 'rename', name: `pile-${i}` });
    }
  }
  return intents;
}

test('replayPlay: recomputes state by initialPosition + extend in order', () => {
  const seed = 'seed-alpha';
  const intents = [
    { kind: 'add', amount: 5 },
    { kind: 'remove', amount: 2 },
    { kind: 'rename', name: 'renamed-pile' },
  ];
  const result = replayPlay(stonePileRules, seed, intents);
  assert.equal(result.valid, true);
  assert.equal(result.finalState.name, 'renamed-pile');
  const expectedStones = initialPosition(seed).stones + 5 - 2;
  assert.equal(result.finalState.stones, expectedStones);
  assert.equal(result.events.length, 3);
  assert.equal(result.events[0].kind, 'stones-added');
  assert.equal(result.events[1].kind, 'stones-removed');
  assert.equal(result.events[2].kind, 'renamed');
});

test('replayPlay: determinism — same seed + same log twice yields identical finalState and identical stateHash', () => {
  const seed = 'determinism-check';
  const intents = [
    { kind: 'add', amount: 7 },
    { kind: 'remove', amount: 3 },
    { kind: 'add', amount: 1 },
  ];
  const first = replayPlay(stonePileRules, seed, intents, 'cfg-a');
  const second = replayPlay(stonePileRules, seed, intents, 'cfg-a');
  assert.deepEqual(first.finalState, second.finalState);
  assert.equal(first.stateHash, second.stateHash);
  assert.equal(first.valid, true);
  assert.equal(second.valid, true);
});

test('property — replay determinism holds across many independently generated (seed, log) pairs', () => {
  const rng = mulberry32(20260819);
  for (let trial = 0; trial < 30; trial++) {
    const seed = `trial-seed-${trial}-${Math.floor(rng() * 1e9)}`;
    const configId = trial % 2 === 0 ? 'cfg-x' : undefined;
    const start = initialPosition(seed, configId).stones;
    const intents = genIntents(rng, 1 + Math.floor(rng() * 12), start);
    const a = replayPlay(stonePileRules, seed, intents, configId);
    const b = replayPlay(stonePileRules, seed, intents, configId);
    assert.deepEqual(a.finalState, b.finalState, `trial ${trial}: finalState mismatch`);
    assert.equal(a.stateHash, b.stateHash, `trial ${trial}: stateHash mismatch`);
    assert.equal(a.valid, b.valid, `trial ${trial}: valid mismatch`);
    assert.equal(a.events.length, b.events.length, `trial ${trial}: events length mismatch`);
  }
});

test('property — stateHash discriminates finalState: forcing each trial to a distinct final name guarantees distinct hashes', () => {
  // The toy engine's raw state space (stones 10..50, small turn counts) is small enough that
  // two independently-generated logs can legitimately land on the identical (name, stones,
  // turn) triple by chance — that would be a correct hash collision on an accidental state
  // collision, not a bug. To test hashPosition's discrimination property soundly, each trial
  // ends with a rename to a trial-unique name, which deterministically forces every
  // finalState (and so every stateHash) apart.
  const rng = mulberry32(7);
  const hashes = new Set();
  for (let trial = 0; trial < 40; trial++) {
    const seed = `distinct-seed-${trial}`;
    const start = initialPosition(seed).stones;
    const intents = [
      ...genIntents(rng, 3 + Math.floor(rng() * 6), start),
      { kind: 'rename', name: `distinct-pile-${trial}` },
    ];
    const result = replayPlay(stonePileRules, seed, intents);
    assert.equal(result.valid, true, `trial ${trial} produced an invalid replay`);
    hashes.add(result.stateHash);
  }
  assert.equal(hashes.size, 40);
});

test('replayPlay: an illegal move (remove more stones than exist) invalidates the replay and stops there', () => {
  const seed = 'illegal-move-check';
  const engine = initialPosition(seed);
  const intents = [
    { kind: 'remove', amount: engine.stones + 1000 }, // always illegal
    { kind: 'add', amount: 99 }, // never reached
  ];
  const result = replayPlay(stonePileRules, seed, intents);
  assert.equal(result.valid, false);
  assert.deepEqual(result.finalState, engine); // unchanged: the bad intent never applied
  assert.equal(result.events.length, 0);
});

test('replayPlay: stops at the first terminal position without consuming the remaining log', () => {
  const rules = {
    initialPosition: () => ({ count: 0 }),
    extend: (state) => ({ state: { count: state.count + 1 }, events: [{ count: state.count + 1 }] }),
    isTerminal: (state) => state.count === 2,
  };
  const result = replayPlay(rules, 'terminal-check', [{}, {}, {}, {}]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.finalState, { count: 2 });
  assert.deepEqual(result.events, [{ count: 1 }, { count: 2 }]);
});

test('replayPlay: does not mutate the state objects it threads through extend', () => {
  const seed = 'purity-check';
  const initial = initialPosition(seed);
  const snapshot = { ...initial };
  const afterOneMove = extend(initial, { kind: 'add', amount: 4 });
  assert.deepEqual(initial, snapshot, 'initialPosition result must not be mutated by extend');
  assert.notEqual(afterOneMove.state, initial);
});

test('hashPosition: identical values with different key insertion order hash identically', () => {
  const h1 = hashPosition({ name: 'x', stones: 3, turn: 1 });
  const h2 = hashPosition({ turn: 1, stones: 3, name: 'x' });
  assert.equal(h1, h2);
});

test('hashPosition: different values hash differently', () => {
  assert.notEqual(hashPosition({ stones: 1 }), hashPosition({ stones: 2 }));
});

test('hashPosition: is a hex string (sha-256 digest length)', () => {
  const h = hashPosition({ a: 1 });
  assert.match(h, /^[0-9a-f]{64}$/);
});

test('playVerifier: matches manifest.replayVerifier\'s (seed, configId, IntentLog) => result shape', () => {
  const verify = playVerifier(stonePileRules);
  let log = [];
  log = appendMove(log, { kind: 'add', amount: 5 });
  log = appendMove(log, { kind: 'remove', amount: 2 });
  const seed = 'verifier-check';
  const result = verify(seed, undefined, log);
  const direct = replayPlay(stonePileRules, seed, [{ kind: 'add', amount: 5 }, { kind: 'remove', amount: 2 }]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.finalState, direct.finalState);
  assert.equal(result.stateHash, direct.stateHash);
});

test('playVerifier: rejects a log recording an illegal playthrough', () => {
  const verify = playVerifier(stonePileRules);
  const seed = 'verifier-illegal';
  const engine = initialPosition(seed);
  let log = [];
  log = appendMove(log, { kind: 'remove', amount: engine.stones + 1 });
  const result = verify(seed, undefined, log);
  assert.equal(result.valid, false);
});

test('Cartridge.replay on the toy engine delegates to replayPlay and agrees with it', () => {
  const seed = 'delegate-check';
  const intents = [{ kind: 'add', amount: 2 }];
  const viaCartridge = stonePileRules.replay(seed, intents);
  const viaDefault = replayPlay(stonePileRules, seed, intents);
  assert.deepEqual(viaCartridge, viaDefault);
});

test('digest-equivalence: hashPosition (pure-JS sha256.mjs) matches the old node:crypto-based implementation, byte-identical, across a corpus of real game states', () => {
  const rng = mulberry32(561200820); // distinct seed from other tests, unrelated coverage
  let matched = 0;
  for (let trial = 0; trial < 60; trial++) {
    const seed = `equiv-seed-${trial}-${Math.floor(rng() * 1e9)}`;
    const configId = trial % 3 === 0 ? `cfg-${trial}` : undefined;
    const start = initialPosition(seed, configId).stones;
    const intents = genIntents(rng, 1 + Math.floor(rng() * 15), start);
    const result = replayPlay(stonePileRules, seed, intents, configId);
    const oldDigest = oldNodeCryptoHashState(result.finalState);
    assert.equal(
      result.stateHash,
      oldDigest,
      `trial ${trial}: new hashPosition digest diverged from old node:crypto digest for state ${JSON.stringify(result.finalState)}`,
    );
    matched++;
  }
  assert.equal(matched, 60, 'every trial in the corpus must have been checked');

  // Also cover plain JSON-safe values directly (not just game states threaded through
  // replay), since hashPosition is exposed standalone for exactly that use.
  const plainValues = [
    {},
    [],
    null,
    0,
    -0,
    '',
    'hello, world',
    { a: 1, b: [1, 2, 3], c: { nested: true, deeper: { x: null } } },
    [1, 'two', { three: 3 }, [4, [5, 6]]],
    { unicode: 'café ☃ 😀', emptyArr: [], emptyObj: {} },
  ];
  for (const value of plainValues) {
    assert.equal(hashPosition(value), oldNodeCryptoHashState(value), `mismatch for ${JSON.stringify(value)}`);
  }
});

test('serialize/deserialize round-trip on the toy engine', () => {
  const state = initialPosition('roundtrip-seed', 'cfg');
  const data = stonePileRules.serialize(state);
  const restored = stonePileRules.deserialize(data);
  assert.deepEqual(restored, state);
});
