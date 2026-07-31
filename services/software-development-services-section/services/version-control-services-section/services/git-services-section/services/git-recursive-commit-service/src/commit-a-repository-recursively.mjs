#!/usr/bin/env node
// commit-a-repository-recursively — commits and pushes every dirty
// submodule's working tree, then bumps the parent's submodule pointers and
// commits-and-pushes the parent. Innermost (submodules) first, outermost
// (the parent repository) last.
//
// Module: default-exports async ({ message, cwd?, remote?, submoduleMessage?, skipPush?, dryRun?, gitBin? })
//         → live mode:  { submodules: object[], parent: object }
//         → dry-run:    { dryRun: true, steps: object[] }
// CLI:    node commit-a-repository-recursively.mjs --message "..."
//           [--cwd <dir>] [--remote <name>] [--submodule-message "..."] [--skip-push]
//           [--dry-run] [--git-bin <path>]
//
// The git binary is resolved from (in order): the `gitBin` option, the
// `--git-bin` CLI flag, the MANAGED_GIT environment variable, then the bare
// name "git" resolved via PATH. Nothing here hardcodes a machine-specific
// path — this is network software that must run on any machine.
//
// --dry-run (alias --plan) never stages, commits, or pushes anything: it
// only walks the immediate submodules named in the parent's .gitmodules,
// reports whether each one (and the parent) currently has a dirty working
// tree, and returns the order operations would run in if the same call were
// made without --dry-run.

import { spawnSync } from 'node:child_process';
import { resolve, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveGitBin } from './commit-the-working-tree.mjs';
import commitTheWorkingTree from './commit-the-working-tree.mjs';
import pushTheCurrentBranch from './push-the-current-branch.mjs';

function runGit(gitBin, cwd, args) {
  const result = spawnSync(resolveGitBin(gitBin), ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) throw result.error;
  return { code: result.status, stdout: (result.stdout ?? '').trim(), stderr: (result.stderr ?? '').trim() };
}

function listSubmodulePaths(gitBin, root) {
  const r = runGit(gitBin, root, ['config', '--file', '.gitmodules', '--get-regexp', 'submodule\\..*\\.path']);
  if (r.code !== 0) return [];
  return r.stdout
    .split(/\r?\n/)
    .filter(line => line.length > 0)
    .map(line => line.split(/\s+/, 2)[1])
    .filter(Boolean);
}

function isDirty(gitBin, cwd) {
  const status = runGit(gitBin, cwd, ['status', '--porcelain']);
  if (status.code !== 0) throw new Error(`git status failed in ${cwd}: ${status.stderr}`);
  return status.stdout.length > 0;
}

function planRecursiveCommit({ gitBin, root, submodulePaths, skipPush }) {
  const steps = submodulePaths.map((path) => {
    const cwd = join(root, path);
    const dirty = isDirty(gitBin, cwd);
    return { path, cwd, dirty, wouldCommit: dirty, wouldPush: dirty && !skipPush };
  });
  const parentDirty = isDirty(gitBin, root);
  steps.push({ path: '.', cwd: root, dirty: parentDirty, wouldCommit: parentDirty, wouldPush: parentDirty && !skipPush });
  return { dryRun: true, steps };
}

export default async function commitARepositoryRecursively({ message, cwd, remote = 'origin', submoduleMessage, skipPush = false, dryRun = false, gitBin } = {}) {
  if (typeof message !== 'string' || message.length === 0) throw new Error('message is required');
  const start = cwd
    ? (isAbsolute(cwd) ? cwd : resolve(process.cwd(), cwd))
    : process.cwd();

  const top = runGit(gitBin, start, ['rev-parse', '--show-toplevel']);
  if (top.code !== 0) throw new Error(`not a git repository: ${start} (${top.stderr})`);
  const root = top.stdout;

  const submodulePaths = listSubmodulePaths(gitBin, root);

  if (dryRun) {
    return planRecursiveCommit({ gitBin, root, submodulePaths, skipPush });
  }

  const submoduleResults = [];
  for (const path of submodulePaths) {
    const subCwd = join(root, path);
    const subMsg = submoduleMessage ?? message;
    const commitOut = await commitTheWorkingTree({ message: subMsg, cwd: subCwd, gitBin });
    let pushOut = null;
    if (commitOut.committed && !skipPush) {
      pushOut = await pushTheCurrentBranch({ cwd: subCwd, remote, gitBin });
    }
    submoduleResults.push({
      path,
      committed: commitOut.committed,
      sha: commitOut.sha ?? null,
      reason: commitOut.reason ?? null,
      pushed: pushOut?.pushed ?? false,
    });
  }

  const parentCommit = await commitTheWorkingTree({ message, cwd: root, gitBin });
  let parentPush = null;
  if (parentCommit.committed && !skipPush) {
    parentPush = await pushTheCurrentBranch({ cwd: root, remote, gitBin });
  }
  return {
    submodules: submoduleResults,
    parent: {
      committed: parentCommit.committed,
      sha: parentCommit.sha ?? null,
      reason: parentCommit.reason ?? null,
      pushed: parentPush?.pushed ?? false,
    },
  };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  const args = process.argv.slice(2);
  let message = null, cwd = null, remote = 'origin', submoduleMessage = null, skipPush = false, dryRun = false, gitBin = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--message' && i + 1 < args.length) message = args[++i];
    else if (args[i] === '--cwd' && i + 1 < args.length) cwd = args[++i];
    else if (args[i] === '--remote' && i + 1 < args.length) remote = args[++i];
    else if (args[i] === '--submodule-message' && i + 1 < args.length) submoduleMessage = args[++i];
    else if (args[i] === '--skip-push') skipPush = true;
    else if (args[i] === '--dry-run' || args[i] === '--plan') dryRun = true;
    else if (args[i] === '--git-bin' && i + 1 < args.length) gitBin = args[++i];
  }
  if (message == null && !dryRun) {
    process.stderr.write('usage: commit-a-repository-recursively.mjs --message "..." [--cwd <dir>] [--remote <name>] [--submodule-message "..."] [--skip-push] [--dry-run] [--git-bin <path>]\n');
    process.exit(2);
  }
  try {
    const out = await commitARepositoryRecursively({ message: message ?? '(dry-run)', cwd, remote, submoduleMessage, skipPush, dryRun, gitBin });
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } catch (err) {
    process.stderr.write(`[commit-a-repository-recursively] ${err.message}\n`);
    process.exit(1);
  }
}
