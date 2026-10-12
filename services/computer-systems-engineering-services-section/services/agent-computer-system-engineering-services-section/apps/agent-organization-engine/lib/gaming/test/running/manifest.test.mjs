import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGameManifest, isGameManifest, assertGameManifest } from '../../src/running/manifest.mjs';

function baseManifest() {
  return {
    id: 'stone-pile',
    displayName: 'Stone Pile',
    description: 'A toy pile-of-stones game used to prove the cartridge contract.',
    subdomain: 'stone-pile',
    entryPoints: { headless: '@red-cup-engineering/gaming/test/running/fixtures/stone-pile' },
    seedPolicy: { kind: 'daily-utc' },
    intentLog: { schemaVersion: 'stone-pile-v1' },
    replayVerifier: '@red-cup-engineering/gaming/test/running/fixtures/stone-pile#replay',
    keywords: ['toy', 'reference'],
  };
}

test('validateGameManifest: accepts a minimal legal manifest', () => {
  const result = validateGameManifest(baseManifest());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validateGameManifest: accepts a fully populated manifest with configs and energy', () => {
  const manifest = {
    ...baseManifest(),
    configs: [
      { id: 'easy', displayName: 'Easy', params: { startStones: 10 } },
      { id: 'hard', displayName: 'Hard', params: { startStones: 50 } },
    ],
    entryPoints: { browser: '/', headless: '@red-cup-engineering/gaming/test/running/fixtures/stone-pile' },
    intentLog: { schemaVersion: 'stone-pile-v1', schemaRef: '@red-cup-engineering/gaming/test/running/fixtures/stone-pile#StonePileIntent' },
    energy: { hooksRef: '@red-cup-engineering/gaming/test/running/fixtures/stone-pile#hooks', accountNamespace: 'stone-pile' },
  };
  const result = validateGameManifest(manifest);
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('validateGameManifest: rejects a non-object', () => {
  for (const bad of [null, undefined, 42, 'nope', []]) {
    const result = validateGameManifest(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  }
});

test('validateGameManifest: collects every error at once, not just the first', () => {
  const result = validateGameManifest({});
  assert.equal(result.valid, false);
  // id, displayName, description, subdomain, entryPoints, seedPolicy, intentLog,
  // replayVerifier, keywords should all fail on a bare {}.
  assert.ok(result.errors.length >= 8, `expected many errors, got ${result.errors.length}: ${result.errors.join('; ')}`);
});

test('validateGameManifest: rejects a non-URL-safe id', () => {
  const result = validateGameManifest({ ...baseManifest(), id: 'Stone Pile!' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.startsWith('id:')));
});

test('validateGameManifest: rejects a non-URL-safe subdomain', () => {
  const result = validateGameManifest({ ...baseManifest(), subdomain: 'Stone_Pile' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.startsWith('subdomain:')));
});

test('validateGameManifest: entryPoints must have at least one of browser/headless', () => {
  const result = validateGameManifest({ ...baseManifest(), entryPoints: {} });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('at least one of browser or headless')));
});

test('validateGameManifest: rejects an unknown seedPolicy.kind', () => {
  const result = validateGameManifest({ ...baseManifest(), seedPolicy: { kind: 'weekly-utc' } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.startsWith('seedPolicy.kind:')));
});

test('validateGameManifest: accepts all three legal seedPolicy kinds', () => {
  for (const kind of ['daily-utc', 'on-demand', 'client-supplied']) {
    const result = validateGameManifest({ ...baseManifest(), seedPolicy: { kind } });
    assert.equal(result.valid, true, `kind ${kind}: ${result.errors.join('; ')}`);
  }
});

test('validateGameManifest: rejects duplicate config ids', () => {
  const manifest = {
    ...baseManifest(),
    configs: [
      { id: 'easy', displayName: 'Easy', params: {} },
      { id: 'easy', displayName: 'Easy Again', params: {} },
    ],
  };
  const result = validateGameManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('duplicate config id')));
});

test('validateGameManifest: rejects a malformed config entry', () => {
  const manifest = { ...baseManifest(), configs: [{ id: 'easy' }] };
  const result = validateGameManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('configs[0]')));
});

test('validateGameManifest: energy block, when present, requires both fields', () => {
  const result = validateGameManifest({ ...baseManifest(), energy: { hooksRef: 'x' } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.startsWith('energy.accountNamespace:')));
});

test('validateGameManifest: absent energy key is legal (lantern-shaped, no economy)', () => {
  const manifest = baseManifest();
  assert.equal('energy' in manifest, false);
  const result = validateGameManifest(manifest);
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('validateGameManifest: keywords must be an array of strings', () => {
  const notArray = validateGameManifest({ ...baseManifest(), keywords: 'toy' });
  assert.equal(notArray.valid, false);
  const notStrings = validateGameManifest({ ...baseManifest(), keywords: ['toy', 42] });
  assert.equal(notStrings.valid, false);
  const empty = validateGameManifest({ ...baseManifest(), keywords: [] });
  assert.equal(empty.valid, true, empty.errors.join('; '));
});

test('isGameManifest: mirrors validateGameManifest().valid', () => {
  assert.equal(isGameManifest(baseManifest()), true);
  assert.equal(isGameManifest({}), false);
});

test('assertGameManifest: returns the manifest on success', () => {
  const manifest = baseManifest();
  assert.equal(assertGameManifest(manifest), manifest);
});

test('assertGameManifest: throws a TypeError joining every error on failure', () => {
  assert.throws(() => assertGameManifest({}), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok((err).message.includes('invalid game manifest'));
    return true;
  });
});
