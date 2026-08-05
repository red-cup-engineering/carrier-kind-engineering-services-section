// Exercises the recursive walker's --dry-run/--plan mode against a real,
// disposable fixture repo tree: a parent repo with one real submodule
// (wired via `git submodule add` using /usr/bin/git for fixture setup
// only), one clean and one dirty. --dry-run must report the dirty state
// without staging, committing, or pushing anything.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(here, '../src/commit-a-repository-recursively.mjs');

const RAW_GIT = '/usr/bin/git';

function rawGit(cwd, args) {
  const result = spawnSync(RAW_GIT, ['-C', cwd, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, `raw git ${args.join(' ')} failed in ${cwd}: ${result.stderr}`);
  return result.stdout;
}

function scratchRoot() {
  // Fixture repos are built with raw /usr/bin/git (setup only, not the
  // wrapper) inside a mkdtemp under /home/emsenn/info/.tmp/, per the
  // rescue-task instructions.
  const base = '/home/emsenn/info/.tmp';
  mkdirSync(base, { recursive: true });
  return base;
}

test('commit-a-repository-recursively --dry-run reports plan without mutating a fixture tree', () => {
  const root = mkdtempSync(join(scratchRoot(), 'recursive-commit-'));
  try {
    const parent = join(root, 'parent');
    const sub = join(root, 'sub');

    rawGit(root, ['init', '-q', sub]);
    writeFileSync(join(sub, 'file.txt'), 'sub-initial\n');
    rawGit(sub, ['-c', 'user.email=t@example.test', '-c', 'user.name=t', 'add', 'file.txt']);
    rawGit(sub, ['-c', 'user.email=t@example.test', '-c', 'user.name=t', 'commit', '-q', '-m', 'sub initial']);

    rawGit(root, ['init', '-q', parent]);
    writeFileSync(join(parent, 'file.txt'), 'parent-initial\n');
    rawGit(parent, ['-c', 'user.email=t@example.test', '-c', 'user.name=t', 'add', 'file.txt']);
    rawGit(parent, ['-c', 'user.email=t@example.test', '-c', 'user.name=t', 'commit', '-q', '-m', 'parent initial']);
    rawGit(parent, ['-c', 'protocol.file.allow=always', '-c', 'user.email=t@example.test', '-c', 'user.name=t', 'submodule', 'add', '-q', sub, 'sub']);
    rawGit(parent, ['-c', 'user.email=t@example.test', '-c', 'user.name=t', 'commit', '-q', '-m', 'add submodule']);

    assert.ok(existsSync(join(parent, '.gitmodules')));

    // Dirty the submodule only; leave the parent's own tree clean.
    writeFileSync(join(parent, 'sub', 'file.txt'), 'sub-dirty\n');

    const planRun = spawnSync(process.execPath, [scriptPath, '--cwd', parent, '--dry-run', '--git-bin', RAW_GIT], {
      encoding: 'utf8',
    });
    assert.equal(planRun.status, 0, planRun.stderr);
    const plan = JSON.parse(planRun.stdout);
    assert.equal(plan.dryRun, true);
    assert.equal(plan.steps.length, 2);

    const subStep = plan.steps.find((step) => step.path === 'sub');
    assert.ok(subStep, 'expected a plan step for the "sub" submodule');
    assert.equal(subStep.dirty, true);
    assert.equal(subStep.wouldCommit, true);
    assert.equal(subStep.wouldPush, true);

    const parentStep = plan.steps.find((step) => step.path === '.');
    assert.ok(parentStep, 'expected a plan step for the parent repository');
    // `git status --porcelain` at the parent surfaces the submodule's dirty
    // content too (as a modified "sub" entry), even though no parent-owned
    // file changed and no submodule pointer has been staged yet.
    assert.equal(parentStep.dirty, true);
    assert.equal(parentStep.wouldCommit, true);

    // Prove dry-run truly touched nothing: no staged changes, no new commits.
    const statusAfter = rawGit(parent, ['status', '--porcelain']);
    assert.match(statusAfter, /sub/u);
    const logAfter = rawGit(parent, ['log', '--oneline']);
    assert.equal(logAfter.trim().split('\n').length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('commit-a-repository-recursively --skip-push affects wouldPush in the plan', () => {
  const root = mkdtempSync(join(scratchRoot(), 'recursive-commit-skip-push-'));
  try {
    const parent = join(root, 'parent');
    rawGit(root, ['init', '-q', parent]);
    writeFileSync(join(parent, 'file.txt'), 'v1\n');
    rawGit(parent, ['-c', 'user.email=t@example.test', '-c', 'user.name=t', 'add', 'file.txt']);
    rawGit(parent, ['-c', 'user.email=t@example.test', '-c', 'user.name=t', 'commit', '-q', '-m', 'initial']);
    writeFileSync(join(parent, 'file.txt'), 'v2\n');

    const planRun = spawnSync(process.execPath, [scriptPath, '--cwd', parent, '--dry-run', '--skip-push', '--git-bin', RAW_GIT], {
      encoding: 'utf8',
    });
    assert.equal(planRun.status, 0, planRun.stderr);
    const plan = JSON.parse(planRun.stdout);
    const parentStep = plan.steps.find((step) => step.path === '.');
    assert.equal(parentStep.dirty, true);
    assert.equal(parentStep.wouldCommit, true);
    assert.equal(parentStep.wouldPush, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
