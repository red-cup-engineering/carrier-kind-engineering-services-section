#!/usr/bin/env node
// withdraw-recognition-of-a-character-as-leader-of-a-swarm — remove a recognition cell.
// Implements work/governance/rules/specifications/recognizing-a-character.md invariants R1, R2, R6, R7.

import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRecordJournal } from '@red-cup-engineering/eavt/semantic-record';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) args[k.slice(2)] = argv[++i];
  }
  return args;
}

function die(code, msg) {
  process.stderr.write(`${code}: ${msg}\n`);
  return { ok: false, code, message: msg };
}

function findRepoRoot(start) {
  let dir = start;
  while (dir !== '/') {
    if (existsSync(join(dir, 'CLAUDE.md')) && existsSync(join(dir, '.mcp.json'))) return dir;
    dir = dirname(dir);
  }
  return start;
}

function characterExists(repoRoot, name) {
  return existsSync(join(repoRoot, 'doing/governing/characters', name, `${name}.md`));
}

function logWitness(repoRoot, event) {
  const ts = new Date().toISOString();
  createSemanticRecordJournal({ root: repoRoot, objectKind: 'spotcomp.leader-of-a-swarm-witness' }).record({
    category: 'withdrawing-recognition-of-a-character-as-leader-of-a-swarm.witness',
    recordedAt: ts,
    record: { ts, ...event },
    charge: { support: true, refutation: false },
  });
}

export default async function withdrawRecognition(args = {}) {
  const repoRoot = args.repo_root ?? findRepoRoot(process.cwd());

  if (!args.subject) return die('usage-error', 'missing --subject <character>');
  if (!args.recognizer) return die('usage-error', 'missing --recognizer <character>');

  if (!characterExists(repoRoot, args.subject)) return die('subject-not-found', `no character record for ${args.subject}`);
  if (!characterExists(repoRoot, args.recognizer)) return die('recognizer-not-found', `no character record for ${args.recognizer}`);

  const role = 'leader-of-a-swarm';
  const recognitionPath = join(repoRoot, 'doing/governing/recognitions', role, args.subject, `${args.recognizer}.md`);

  if (!existsSync(recognitionPath)) {
    return die('recognition-not-present', `no recognition file at ${recognitionPath.slice(repoRoot.length + 1)}`);
  }

  unlinkSync(recognitionPath);

  logWitness(repoRoot, {
    skill: 'withdrawing-recognition-of-a-character-as-leader-of-a-swarm',
    step: 'withdrawn',
    subject: args.subject,
    recognizer: args.recognizer,
    role,
    'recognition-note': args['recognition-note'] ?? null,
  });
  return { ok: true, subject: args.subject, recognizer: args.recognizer, role, removed: true };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  const cliArgs = parseArgs(process.argv.slice(2));
  const result = await withdrawRecognition(cliArgs);
  if (result?.ok) process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(result?.ok ? 0 : 1);
}
