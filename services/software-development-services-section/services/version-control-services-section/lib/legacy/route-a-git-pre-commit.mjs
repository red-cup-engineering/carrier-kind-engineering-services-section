#!/usr/bin/env node

// routing-a-git-pre-commit — runs every gate skill against every staged
// markdown file. Invoked from .git/hooks/pre-commit. Exit 0 = permit the
// commit; non-zero = abort.

import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = resolve(fileURLToPath(import.meta.url));

// Each gate is a CLI invocation of the gate's script with the file path.
// Exit-code contract per linter: 0 = ok, 1 = issues, 2 = fatal.
const GATES = [
  {
    slug: 'linting-a-resource-file',
    script: 'doing/working/hacking/doing/working/positing/abstaining/linting/linting-a-resource-file/scripts/lint-a-resource-file.mjs',
    args: (path) => [path],
    summarize: (out) => out.split('\n').filter(l => l.startsWith('- error') || l.startsWith('- warn')).join('\n  '),
  },
  {
    slug: 'linting-a-citation',
    script: 'doing/working/hacking/doing/working/positing/abstaining/linting/linting-a-citation/scripts/lint-a-citation.mjs',
    args: (path) => [path],
    summarize: (out) => out.trim(),
  },
  {
    slug: 'linting-a-references-section',
    script: 'doing/working/hacking/doing/working/positing/abstaining/linting/linting-a-references-section/scripts/lint-a-references-section.mjs',
    args: (path) => [path],
    summarize: (out) => out.trim(),
  },
  {
    slug: 'resolving-links-in-a-file',
    script: 'doing/working/hacking/doing/working/positing/abstaining/finding/resolving-links-in-a-file/scripts/resolve-links-in-a-file.mjs',
    args: (path) => [`--path=${path}`],
    summarize: (out) => {
      try {
        const data = JSON.parse(out);
        if (!data.unresolved) return 'ok';
        const broken = data.links.filter(l => !l.resolved).map(l => l.target);
        return `${data.unresolved}/${data.total_links} unresolved: ${broken.join(', ')}`;
      } catch {
        return out.slice(0, 500);
      }
    },
  },
];

function gitOutput(args, { repoRoot }) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function stagedMarkdownPaths(repoRoot) {
  const out = gitOutput(
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    { repoRoot },
  );
  return out
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l.endsWith('.md'));
}

function worktreeDiffersFromIndex(path, repoRoot) {
  const out = gitOutput(['diff', '--name-only', '--', path], { repoRoot });
  return out.split('\n').some(l => l.trim() === path);
}

function todayUtcDateString(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function appendWitness(repoRoot, entry) {
  const skillDir = join(repoRoot, 'library/object/library/thing/library/system/library/git/library/git-pre-commit/doing/working/routing-a-git-pre-commit');
  appendFileSync(join(skillDir, 'routing-a-git-pre-commit.jsonl'), JSON.stringify(entry) + '\n');
}

function detectActor(repoRoot) {
  try {
    return gitOutput(['config', 'user.email'], { repoRoot }).trim() || 'git';
  } catch {
    return 'git';
  }
}

function runGate(gate, path, repoRoot) {
  const scriptAbs = join(repoRoot, gate.script);
  const result = spawnSync('node', [scriptAbs, ...gate.args(path)], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const code = result.status ?? 1;
  const ok = code === 0;
  const out = (result.stdout ?? '').trim();
  const err = (result.stderr ?? '').trim();
  let summary;
  if (ok) {
    summary = 'ok';
  } else if (code === 2) {
    summary = `fatal (exit 2): ${err || out || '(no output)'}`;
  } else if (typeof gate.summarize === 'function') {
    summary = gate.summarize(out, err) || (out || err || `exit ${code}`).slice(0, 500);
  } else {
    summary = (out || err || `exit ${code}`).slice(0, 500);
  }
  return { ok, code, summary, stdout: out, stderr: err };
}

async function main() {
  const repoRoot = process.cwd();

  let stagedPaths;
  try {
    stagedPaths = stagedMarkdownPaths(repoRoot);
  } catch (err) {
    process.stderr.write(`[routing-a-git-pre-commit] git diff failed: ${err.message}\n`);
    process.exit(1);
  }

  if (stagedPaths.length === 0) process.exit(0);

  for (const p of stagedPaths) {
    if (worktreeDiffersFromIndex(p, repoRoot)) {
      process.stderr.write(
        `[routing-a-git-pre-commit] warning: worktree of '${p}' differs from index; the gate is reading the worktree. Run 'git add ${p}' to gate the exact staged bytes.\n`,
      );
    }
  }

  const actor = detectActor(repoRoot);
  const failures = [];

  for (const p of stagedPaths) {
    for (const gate of GATES) {
      const started = Date.now();
      let res;
      try {
        res = runGate(gate, p, repoRoot);
      } catch (err) {
        res = { ok: false, code: -1, summary: `threw: ${err.message}`, stdout: '', stderr: err.message };
      }
      const duration_ms = Date.now() - started;
      appendWitness(repoRoot, {
        ts: new Date().toISOString(),
        character: actor,
        invoker: 'routing-a-git-pre-commit',
        tool: gate.slug,
        args: { path: p },
        result_summary: res.summary,
        duration_ms,
        ok: res.ok,
      });
      if (!res.ok) {
        failures.push({ path: p, gate: gate.slug, summary: res.summary });
      }
    }
  }

  if (failures.length === 0) {
    process.exit(0);
  }

  process.stderr.write(`[routing-a-git-pre-commit] aborting commit; ${failures.length} gate failure(s):\n`);
  for (const f of failures) {
    process.stderr.write(`  - ${f.path}: ${f.gate}: ${f.summary}\n`);
  }
  process.exit(1);
}

main().catch(err => {
  process.stderr.write(`[routing-a-git-pre-commit] fatal: ${err.stack ?? err.message}\n`);
  process.exit(1);
});
