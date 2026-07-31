#!/usr/bin/env node

// installing-a-git-pre-commit-hook — writes .git/hooks/pre-commit to a thin
// shim that exec's routing-a-git-pre-commit. MCP-callable; also runnable as a
// CLI with --repo-root and --force.

import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAGIC = '# 561-managed pre-commit hook — installed by installing-a-git-pre-commit-hook';

function buildShim() {
  return [
    '#!/bin/sh',
    MAGIC,
    'set -e',
    'repo_root="$(git rev-parse --show-toplevel)"',
    'cd "$repo_root"',
    'exec node library/object/library/thing/library/system/library/git/library/git-pre-commit/doing/working/routing-a-git-pre-commit/scripts/route-a-git-pre-commit.mjs',
    '',
  ].join('\n');
}

function isManagedShim(text) {
  return text.split('\n').slice(0, 3).some(line => line.trim() === MAGIC);
}

export default async function installAGitPreCommitHook(args = {}) {
  const repoRoot = resolve(args.repoRoot ?? process.cwd());
  const force = Boolean(args.force);

  const gitDir = join(repoRoot, '.git');
  if (!existsSync(gitDir) || !statSync(gitDir).isDirectory()) {
    throw new Error(`installing-a-git-pre-commit-hook: ${gitDir} is not a directory (run inside a git working tree)`);
  }
  const hookPath = join(gitDir, 'hooks', 'pre-commit');

  let existed = false;
  let overwritten = false;
  if (existsSync(hookPath)) {
    existed = true;
    const current = readFileSync(hookPath, 'utf8');
    if (!isManagedShim(current) && !force) {
      throw new Error(
        `installing-a-git-pre-commit-hook: ${hookPath} exists and is not a 561-managed shim. Pass force=true to overwrite.`,
      );
    }
    overwritten = true;
  }

  writeFileSync(hookPath, buildShim(), 'utf8');
  chmodSync(hookPath, 0o755);

  return {
    path: hookPath,
    created: !existed,
    overwritten,
    force,
  };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  const argv = process.argv.slice(2);
  let repoRoot = process.cwd();
  let force = false;
  for (const a of argv) {
    if (a === '--force') force = true;
    else if (a.startsWith('--repo-root=')) repoRoot = a.slice('--repo-root='.length);
  }
  try {
    const result = await installAGitPreCommitHook({ repoRoot, force });
    console.error(
      `[install-a-git-pre-commit-hook] ${result.path} ` +
        `(${result.created ? 'created' : result.overwritten ? 'overwritten' : 'unchanged'}${result.force ? ', --force' : ''})`,
    );
  } catch (err) {
    console.error(`[install-a-git-pre-commit-hook] ${err.message}`);
    process.exit(2);
  }
}
