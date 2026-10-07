import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { command, prepare, selectedSources } from '../scripts/prepare-sources.mjs';

test('preparation uses committed blobs even when the checkout has later edits', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'guix-source-test-'));
  try {
    const repo = resolve(root, 'repo'); mkdirSync(repo);
    command('git', ['init', '-q'], repo);
    writeFileSync(resolve(repo, 'package.json'), JSON.stringify({ name: '@example/app', version: '1.0.0', type: 'module' }));
    writeFileSync(resolve(repo, 'index.mjs'), 'export const released = true;\n');
    command('git', ['add', '.'], repo);
    command('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture'], repo);
    const commit = command('git', ['rev-parse', 'HEAD'], repo);
    writeFileSync(resolve(repo, 'index.mjs'), 'throw new Error("unreviewed");\n');
    prepare({ repositories: [{ directory: repo, repository: 'example/app', commit }], entries: ['@example/app'], output: resolve(root, 'output') });
    assert.equal(readFileSync(resolve(root, 'output/packages/@example__app/index.mjs'), 'utf8'), 'export const released = true;\n');
    assert.throws(() => prepare({ repositories: [{ directory: repo, repository: 'example/app', commit: '0'.repeat(40) }], entries: ['@example/app'], output: resolve(root, 'refused') }), /source commit differs/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('an unresolved workspace input is refused rather than floated to a registry tag', () => {
  const packages = new Map([['app', { manifest: { dependencies: { missing: 'workspace:*' } } }]]);
  assert.throws(() => selectedSources(packages, ['app']), /pinned source or released version/);
});
