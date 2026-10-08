import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEnterpriseEntrance } from '../src/entrance.mjs';
test('entrance forwards only the host-supplied GitHub resolver capability to application factories', t => {
  const root = mkdtempSync(join(tmpdir(), 'receiving-entrance-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const resolver = () => { throw Error('factory construction must not resolve or receive work'); };
  let received;
  const config = { publicBaseUrl: 'https://fixture.invalid', stateDir: root, sessionSecret: 'fixture-only-session-secret-for-isolated-source-test', instance: { name: 'fixture', title: 'Fixture' } };
  const federation = { clients: new Map(), tools: [], unavailable: [] };
  createEnterpriseEntrance(config, { federation, resolveGitHubReceivingBinding: resolver, applications: [{ factory: context => { received = context.resolveGitHubReceivingBinding; return { resources: [] }; } }] });
  assert.equal(received, resolver);
  let absent = true;
  createEnterpriseEntrance({ ...config, stateDir: join(root, 'unconfigured') }, { federation, applications: [{ factory: context => { absent = Object.hasOwn(context, 'resolveGitHubReceivingBinding'); return { resources: [] }; } }] });
  assert.equal(absent, false);
});
