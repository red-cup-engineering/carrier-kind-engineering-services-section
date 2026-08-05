#!/usr/bin/env node
// commit-the-working-tree — stages every working-tree change in one git
// repository and creates a single commit with the given message.
//
// Module: default-exports async ({ message, cwd?, paths?, allowEmpty?, gitBin? })
//         → { committed: boolean, sha?: string, root?: string, reason?: string }
// CLI:    node commit-the-working-tree.mjs --message "..."
//           [--cwd <dir>] [--paths "a,b,c"] [--allow-empty] [--git-bin <path>]
//
// The git binary is resolved from (in order): the `gitBin` option, the
// `--git-bin` CLI flag, the MANAGED_GIT environment variable, then the bare
// name "git" resolved via PATH. Nothing here hardcodes a machine-specific
// path — this module runs unmodified on any machine.

import { spawnSync } from 'node:child_process';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveGitBin(gitBin) {
  return gitBin || process.env.MANAGED_GIT || 'git';
}

function runGit(gitBin, cwd, args, { capture = true } = {}) {
  const result = spawnSync(resolveGitBin(gitBin), ['-C', cwd, ...args], {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) throw result.error;
  return { code: result.status, stdout: (result.stdout ?? '').trim(), stderr: (result.stderr ?? '').trim() };
}

export default async function commitTheWorkingTree({ message, cwd, paths, allowEmpty = false, gitBin } = {}) {
  if (typeof message !== 'string' || message.length === 0) throw new Error('message is required');
  const start = cwd
    ? (isAbsolute(cwd) ? cwd : resolve(process.cwd(), cwd))
    : process.cwd();

  const top = runGit(gitBin, start, ['rev-parse', '--show-toplevel']);
  if (top.code !== 0) throw new Error(`not a git repository: ${start} (${top.stderr})`);
  const root = top.stdout;

  const status = runGit(gitBin, root, ['status', '--porcelain']);
  if (status.code !== 0) throw new Error(`git status failed in ${root}: ${status.stderr}`);
  if (status.stdout.length === 0 && !allowEmpty) {
    return { committed: false, reason: 'clean-tree', root };
  }

  let stage;
  if (Array.isArray(paths) && paths.length > 0) {
    stage = runGit(gitBin, root, ['add', '--', ...paths]);
  } else {
    stage = runGit(gitBin, root, ['add', '-A']);
  }
  if (stage.code !== 0) throw new Error(`git add failed in ${root}: ${stage.stderr}`);

  const commitArgs = ['commit', '-m', message];
  if (allowEmpty) commitArgs.splice(1, 0, '--allow-empty');
  const commit = runGit(gitBin, root, commitArgs);
  if (commit.code !== 0) {
    if (/nothing to commit|nothing added to commit/i.test(commit.stdout + commit.stderr)) {
      return { committed: false, reason: 'nothing-staged', root };
    }
    throw new Error(`git commit failed in ${root}: ${commit.stderr || commit.stdout}`);
  }

  const sha = runGit(gitBin, root, ['rev-parse', '--short', 'HEAD']).stdout;
  return { committed: true, sha, root };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  const args = process.argv.slice(2);
  let message = null, cwd = null, paths = null, allowEmpty = false, gitBin = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--message' && i + 1 < args.length) message = args[++i];
    else if (args[i] === '--cwd' && i + 1 < args.length) cwd = args[++i];
    else if (args[i] === '--paths' && i + 1 < args.length) paths = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (args[i] === '--allow-empty') allowEmpty = true;
    else if (args[i] === '--git-bin' && i + 1 < args.length) gitBin = args[++i];
  }
  if (message == null) {
    process.stderr.write('usage: commit-the-working-tree.mjs --message "..." [--cwd <dir>] [--paths "a,b,c"] [--allow-empty] [--git-bin <path>]\n');
    process.exit(2);
  }
  try {
    const out = await commitTheWorkingTree({ message, cwd, paths, allowEmpty, gitBin });
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } catch (err) {
    process.stderr.write(`[commit-the-working-tree] ${err.message}\n`);
    process.exit(1);
  }
}
