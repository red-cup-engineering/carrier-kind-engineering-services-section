import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodePlayRecord, decodePlayRecord, validatePlayRecord, appendMove, isMove, isGameEvent } from '../../src/running/play-record.mjs';
import { canonicalJson } from '@red-cup-engineering/json-services-section/canonical-json';

test('canonicalJson: sorts object keys at every level', () => {
  const a = canonicalJson({ b: 1, a: 2, c: { z: 1, y: 2 } });
  const b = canonicalJson({ a: 2, c: { y: 2, z: 1 }, b: 1 });
  assert.equal(a, b);
  assert.equal(a, '{"a":2,"b":1,"c":{"y":2,"z":1}}');
});

test('canonicalJson: property — key-order-insensitive deep-equal values always match', () => {
  // Deterministic pseudo-random shuffle (mulberry32) — no Math.random(), reproducible.
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
  const rng = mulberry32(1234);
  const baseKeys = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'];
  for (let trial = 0; trial < 50; trial++) {
    const obj = {};
    for (const k of baseKeys) obj[k] = Math.floor(rng() * 1000);
    // Build a shuffled-key-order copy with the identical key/value pairs.
    const shuffled = {};
    const keys = [...baseKeys];
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    for (const k of keys) shuffled[k] = obj[k];
    assert.equal(canonicalJson(obj), canonicalJson(shuffled), `trial ${trial} failed`);
  }
});

test('canonicalJson: arrays preserve order (order is meaningful, unlike object keys)', () => {
  assert.notEqual(canonicalJson([1, 2, 3]), canonicalJson([3, 2, 1]));
});

test('canonicalJson: refuses undefined members rather than dropping them (RFC 8785 admits only JSON values)', () => {
  assert.throws(() => canonicalJson({ a: 1, b: undefined }), /invalid-json-value/);
  assert.throws(() => canonicalJson([1, undefined, 3]), /invalid-json-value/);
});

test('canonicalJson: throws on non-JSON-safe values', () => {
  assert.throws(() => canonicalJson(Number.NaN));
  assert.throws(() => canonicalJson(Number.POSITIVE_INFINITY));
  assert.throws(() => canonicalJson(() => {}));
  assert.throws(() => canonicalJson(Symbol('x')));
  assert.throws(() => canonicalJson(10n));
});

test('isMove / isGameEvent: require a non-empty string kind on a plain object', () => {
  assert.equal(isMove({ kind: 'add', amount: 1 }), true);
  assert.equal(isMove({ kind: '' }), false);
  assert.equal(isMove({}), false);
  assert.equal(isMove(null), false);
  assert.equal(isMove([]), false);
  assert.equal(isMove('add'), false);
  assert.equal(isGameEvent({ kind: 'stones-added' }), true);
});

test('appendMove: auto-assigns seq starting at 0, strictly increasing', () => {
  let log = [];
  log = appendMove(log, { kind: 'add', amount: 5 });
  log = appendMove(log, { kind: 'add', amount: 3 });
  assert.equal(log.length, 2);
  assert.equal(log[0].seq, 0);
  assert.equal(log[1].seq, 1);
});

test('appendMove: does not mutate the input log (pure append)', () => {
  const original = appendMove([], { kind: 'add', amount: 5 });
  const appended = appendMove(original, { kind: 'add', amount: 3 });
  assert.equal(original.length, 1);
  assert.equal(appended.length, 2);
  assert.notEqual(original, appended);
});

test('appendMove: explicit seq must be strictly greater than the log\'s last seq', () => {
  const log = appendMove([], { kind: 'add', amount: 1 }, { seq: 5 });
  assert.throws(() => appendMove(log, { kind: 'add', amount: 1 }, { seq: 5 }), RangeError);
  assert.throws(() => appendMove(log, { kind: 'add', amount: 1 }, { seq: 4 }), RangeError);
  const next = appendMove(log, { kind: 'add', amount: 1 }, { seq: 6 });
  assert.equal(next[1].seq, 6);
});

test('appendMove: refuses sequence and timestamp values that would make its output invalid', () => {
  assert.throws(() => appendMove([], { kind: 'add' }, { seq: 0.5 }), TypeError);
  assert.throws(() => appendMove([], { kind: 'add' }, { seq: Number.NaN }), TypeError);
  assert.throws(() => appendMove([], { kind: 'add' }, { ts: Number.POSITIVE_INFINITY }), TypeError);
  assert.throws(() => appendMove([{ seq: 0.5, intent: { kind: 'add' } }], { kind: 'add' }), TypeError);
});

test('appendMove: rejects an intent without a valid kind envelope', () => {
  assert.throws(() => appendMove([], { amount: 1 }), TypeError);
});

test('appendMove: carries ts through untouched when supplied', () => {
  const log = appendMove([], { kind: 'review', grade: 3 }, { ts: 1700000000000 });
  assert.equal(log[0].ts, 1700000000000);
});

test('encodePlayRecord / decodePlayRecord: round-trip', () => {
  let log = [];
  log = appendMove(log, { kind: 'add', amount: 5 });
  log = appendMove(log, { kind: 'remove', amount: 2 }, { ts: 42 });
  const text = encodePlayRecord(log);
  const decoded = decodePlayRecord(text);
  assert.deepEqual(decoded, log);
});

test('encodePlayRecord: two independently-built equal logs encode identically', () => {
  const log1 = appendMove(appendMove([], { kind: 'add', amount: 1, tag: 'x' }), { kind: 'add', amount: 2 });
  const log2 = appendMove(appendMove([], { kind: 'add', tag: 'x', amount: 1 }), { kind: 'add', amount: 2 });
  assert.equal(encodePlayRecord(log1), encodePlayRecord(log2));
});

test('decodePlayRecord: throws SyntaxError on invalid JSON', () => {
  assert.throws(() => decodePlayRecord('{not json'), SyntaxError);
});

test('decodePlayRecord: throws TypeError on well-formed JSON that is not a valid log', () => {
  assert.throws(() => decodePlayRecord('{"not":"an array"}'), TypeError);
  assert.throws(() => decodePlayRecord('[{"seq":0}]'), TypeError); // missing intent
});

test('validatePlayRecord: rejects non-array input', () => {
  const result = validatePlayRecord({ seq: 0 });
  assert.equal(result.valid, false);
});

test('validatePlayRecord: rejects non-monotonic seq', () => {
  const result = validatePlayRecord([
    { seq: 0, intent: { kind: 'add' } },
    { seq: 0, intent: { kind: 'add' } },
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('seq')));
});

test('validatePlayRecord: rejects a decreasing seq', () => {
  const result = validatePlayRecord([
    { seq: 5, intent: { kind: 'add' } },
    { seq: 3, intent: { kind: 'add' } },
  ]);
  assert.equal(result.valid, false);
});

test('validatePlayRecord: rejects malformed intent envelopes and bad ts', () => {
  const result = validatePlayRecord([
    { seq: 0, intent: { kind: 'add' }, ts: 'yesterday' },
    { seq: 1, intent: 'not-an-object' },
  ]);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
});

test('validatePlayRecord: accepts an empty log', () => {
  const result = validatePlayRecord([]);
  assert.equal(result.valid, true);
});
