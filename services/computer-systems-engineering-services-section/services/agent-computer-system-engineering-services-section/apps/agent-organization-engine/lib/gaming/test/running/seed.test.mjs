import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utcDateString, dailySeed, clientSuppliedSeed } from '../../src/running/seed.mjs';

test('utcDateString: formats YYYY-MM-DD from UTC components, zero-padded', () => {
  assert.equal(utcDateString(new Date(Date.UTC(2026, 0, 5))), '2026-01-05');
  assert.equal(utcDateString(new Date(Date.UTC(2026, 11, 31))), '2026-12-31');
});

test('utcDateString: uses UTC accessors, not local-timezone accessors — a timestamp near a UTC day boundary resolves to the UTC day regardless of what the local clock would say', () => {
  // 2026-08-19T23:30:00Z is still 2026-08-19 in UTC no matter the host's local timezone.
  const nearMidnightUtc = new Date(Date.UTC(2026, 7, 19, 23, 30, 0));
  assert.equal(utcDateString(nearMidnightUtc), '2026-08-19');
  // And one minute later, past midnight UTC, it's the next day — independent of local tz.
  const justAfterMidnightUtc = new Date(Date.UTC(2026, 7, 20, 0, 1, 0));
  assert.equal(utcDateString(justAfterMidnightUtc), '2026-08-20');
});

test('utcDateString: throws on an invalid Date', () => {
  assert.throws(() => utcDateString(new Date(Number.NaN)), TypeError);
});

test('dailySeed: pure function of (gameId, date, configId) — same inputs, same output', () => {
  const date = new Date(Date.UTC(2026, 7, 19));
  const s1 = dailySeed('onestone', date, 'level-3');
  const s2 = dailySeed('onestone', date, 'level-3');
  assert.equal(s1, s2);
});

test('dailySeed: a Date and its equivalent YYYY-MM-DD string resolve to the same seed', () => {
  const date = new Date(Date.UTC(2026, 7, 19));
  assert.equal(dailySeed('onestone', date, 'level-3'), dailySeed('onestone', '2026-08-19', 'level-3'));
});

test('dailySeed: different configId, different game, or different day all change the seed', () => {
  const date = new Date(Date.UTC(2026, 7, 19));
  const base = dailySeed('onestone', date, 'level-3');
  assert.notEqual(base, dailySeed('onestone', date, 'level-4'));
  assert.notEqual(base, dailySeed('solitaire', date, 'level-3'));
  assert.notEqual(base, dailySeed('onestone', new Date(Date.UTC(2026, 7, 20)), 'level-3'));
});

test('dailySeed: configId is optional', () => {
  const date = new Date(Date.UTC(2026, 7, 19));
  const seed = dailySeed('lantern', date);
  assert.equal(seed, 'lantern-daily:2026-08-19');
});

test('dailySeed: matches the documented format', () => {
  const seed = dailySeed('solitaire', '2026-08-19', 'klondike');
  assert.equal(seed, 'solitaire-daily:klondike:2026-08-19');
});

test('dailySeed: rejects an empty gameId', () => {
  assert.throws(() => dailySeed('', '2026-08-19'), TypeError);
});

test('dailySeed: rejects a malformed date string', () => {
  assert.throws(() => dailySeed('onestone', '08/19/2026'), TypeError);
  assert.throws(() => dailySeed('onestone', '2026-8-19'), TypeError);
});

test('clientSuppliedSeed: passes through a non-empty string unchanged', () => {
  assert.equal(clientSuppliedSeed('player-typed-seed-123'), 'player-typed-seed-123');
});

test('clientSuppliedSeed: rejects an empty or non-string seed', () => {
  assert.throws(() => clientSuppliedSeed(''), TypeError);
  assert.throws(() => clientSuppliedSeed(undefined), TypeError);
});

test('property — dailySeed never reads the ambient clock: a fixed Date always produces a fixed seed no matter when the test runs', () => {
  const fixed = new Date(Date.UTC(2020, 0, 1));
  const seeds = new Set();
  for (let i = 0; i < 20; i++) {
    seeds.add(dailySeed('probe', fixed, 'cfg'));
  }
  assert.equal(seeds.size, 1);
});
