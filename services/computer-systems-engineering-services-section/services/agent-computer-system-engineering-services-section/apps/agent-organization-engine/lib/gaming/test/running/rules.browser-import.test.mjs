import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Reproduces, inside plain Node, the exact class of failure a real browser reports when a
// module graph imports a Node builtin: Chromium's "Access to script at 'node:crypto'
// blocked". We can't run Chromium inside `node --test`, but we CAN make 'node:crypto'
// unresolvable via Node's own module-customization hooks (see
// fixtures/block-node-crypto-loader.mjs) and prove the module graph either does or doesn't
// survive that. Node's test runner isolates this file, so its process-global hook cannot
// contaminate another test file.
const here = path.dirname(fileURLToPath(import.meta.url));
const hookPath = path.join(here, 'fixtures', 'block-node-crypto-loader.mjs');
const rulesPath = path.join(here, '../../src/running/rules.mjs');
register(pathToFileURL(hookPath).href);
const rulesModule = import(pathToFileURL(rulesPath).href);

test('rules.mjs module graph imports cleanly with node:crypto unresolvable (browser-realistic)', async () => {
  const mod = await rulesModule;
  assert.equal(typeof mod.hashPosition, 'function');
});

test('hashPosition, imported under the browser-realistic hook, still produces the correct sha-256 digest (known vector)', async () => {
  // canonicalStringify({a:1,b:[1,2,3],c:'x'}) === '{"a":1,"b":[1,2,3],"c":"x"}'; its sha-256
  // hex digest, independently computed via node:crypto in an unrestricted process, is fixed
  // below. This proves the browser-compatible code path isn't merely silent about the
  // missing import — it computes the identical bytes any other environment would.
  const expectedDigest = '8b10e5b36d252037033cae7f0d3d2831026ffcda5838cc06c65b3a0b0a2263a0';
  assert.equal(expectedDigest.length, 64, 'sanity: the literal itself must be a 64-char hex digest');
  const mod = await rulesModule;
  assert.equal(mod.hashPosition({ a: 1, b: [1, 2, 3], c: 'x' }), expectedDigest);
});
