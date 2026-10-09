import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdmission } from '../scripts/verify-release-admission.mjs';
const source = { repository: 'owner/software', ref: 'main', commit: 'old' };
const pr = { merged_at: '2026-10-07T00:00:00Z', base: { ref: 'main' }, merge_commit_sha: 'new', html_url: 'https://github.com/owner/software/pull/1' };
const inputs = { revision: 'machine', machinePulls: [], files: ['sources.json', 'dependencies.lock.yaml'], before: { entries: ['app'], repositories: [source] }, after: { entries: ['app'], repositories: [{ ...source, commit: 'new', admission: { pullRequest: pr.html_url, mergedAt: pr.merged_at } }] }, sourcePulls: () => [pr] };
test('reviewed owning merge admits its exact pins and resolved lock', () => assert.doesNotThrow(() => verifyAdmission(inputs)));
test('a raw configuration push cannot deploy', () => assert.throws(() => verifyAdmission({ ...inputs, files: ['machine.scm'] }), /merged machine-repository PR/));
test('forged source approval and source-set changes cannot deploy', () => {
  assert.throws(() => verifyAdmission({ ...inputs, sourcePulls: () => [] }), /Awaiting reviewed/);
  assert.throws(() => verifyAdmission({ ...inputs, after: { ...inputs.after, entries: ['other-app'] } }), /dependency policy/);
});
test('a merged machine PR admits configuration changes', () => assert.doesNotThrow(() => verifyAdmission({ ...inputs, files: ['machine.scm'], machinePulls: [{ ...pr, merge_commit_sha: 'machine' }] })));
