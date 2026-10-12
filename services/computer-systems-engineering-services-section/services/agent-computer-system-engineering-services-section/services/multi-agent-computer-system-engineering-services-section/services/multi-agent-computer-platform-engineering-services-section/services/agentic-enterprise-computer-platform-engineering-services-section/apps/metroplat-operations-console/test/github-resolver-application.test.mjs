import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { operationsConsole } from '../src/application.mjs';
import { readAgency } from '@red-cup-engineering/organizing/agency';
import { playerOfAct } from '@red-cup-engineering/organizing/agency/cast';
import { handedAgency, officesOfAccount } from '@red-cup-engineering/metroplat/offices';
import { defaultFilesystemBinding } from '@red-cup-engineering/computer-system-engine/rpc/binding';
function fixture(t, resolver) {
  const root = mkdtempSync(join(tmpdir(), 'github-resolver-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const agencyRoot = join(root, 'agency'), dataRoot = join(root, 'data');
  for (const office of ['one', 'two']) {
    for (const [pool, record] of [['offices', { id: office }], ['incumbencies', { id: office, office, holder: 'person:reader', recognition: 't', induction: 't' }]]) {
      const dir = join(agencyRoot, 'services/engineering/lib/agency', pool);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, office + '.json'), JSON.stringify(record));
    }
  }
  const agency = readAgency(agencyRoot, { acts: [] }), binding = defaultFilesystemBinding(dataRoot, { agencyRoot });
  let effects = 0;
  const requests = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => { requests.push(new URL(url).pathname); assert.equal(requests.at(-1), '/repos/owner/public', 'no source body is read before resolution'); return { ok: true, json: async () => ({ id: 7, full_name: 'owner/public', private: false }) }; };
  t.after(() => { globalThis.fetch = previous; });
  const app = operationsConsole({ config: { instance: { name: 'fixture', title: 'Fixture' }, stateDir: join(root, 'state'), dataDir: dataRoot, metroplatDataRoot: dataRoot },
    configuration: { githubIssueSources: { fixture: { repositories: ['owner/public'] } } }, run: async () => { effects++; }, runAs: async () => { effects++; },
    resolveGitHubReceivingBinding: input => resolver(input, { agency, binding }) });
  return { call: (args, subject = 'person:reader') => app.tools.find(t => t.name === 'ops_sync_github_issues').handler(args, { principal: { subject } }), requests, effects: () => effects };
}
test('application resolver receives the authenticated principal and caller office after metadata', async (t) => {
  const f = fixture(t, input => { assert.equal(input.subject, 'person:reader'); assert.equal(input.office, 'one'); assert.equal(input.repository, 'owner/public'); assert.ok(Object.isFrozen(input.repositoryRecord)); throw Error('authored source ownership relation is unavailable'); });
  await assert.rejects(f.call({ repository: 'owner/public', as: 'one', issueNumbers: [2] }), /authored source ownership/);
  assert.deepEqual(f.requests, ['/repos/owner/public']);
  assert.equal(f.effects(), 0);
});
test('native player selection refuses unheld and ambiguous offices before any source or board effect', async (t) => {
  const f = fixture(t, (input, { agency, binding }) => {
    playerOfAct(handedAgency(binding, agency), { invocation: { subject: input.subject }, held: officesOfAccount(binding, input.subject, agency), as: input.office, sections: ['services/engineering'] });
    throw Error('unexpected native admission');
  });
  await assert.rejects(f.call({ repository: 'owner/public', as: 'one', issueNumbers: [2] }, 'person:other'), /does not hold/);
  await assert.rejects(f.call({ repository: 'owner/public', issueNumbers: [2] }), /name the office/);
  assert.deepEqual(f.requests, ['/repos/owner/public', '/repos/owner/public']);
  assert.equal(f.effects(), 0);
});
