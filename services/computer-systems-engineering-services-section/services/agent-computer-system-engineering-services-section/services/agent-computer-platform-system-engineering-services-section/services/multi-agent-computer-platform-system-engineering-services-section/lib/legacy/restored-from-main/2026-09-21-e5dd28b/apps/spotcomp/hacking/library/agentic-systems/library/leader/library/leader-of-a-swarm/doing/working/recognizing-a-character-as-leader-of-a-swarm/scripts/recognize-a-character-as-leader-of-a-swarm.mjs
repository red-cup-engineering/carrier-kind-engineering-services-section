#!/usr/bin/env node
// recognize-a-character-as-leader-of-a-swarm — write a recognition cell.
// Implements work/governance/rules/specifications/recognizing-a-character.md invariants R1–R9.

import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeYaml } from '@red-cup-engineering/yaml-frontmatter-codec-service';
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
    category: 'recognizing-a-character-as-leader-of-a-swarm.witness',
    recordedAt: ts,
    record: { ts, ...event },
    charge: { support: true, refutation: false },
  });
}

export default async function recognizeAsLeader(args = {}) {
  const repoRoot = args.repo_root ?? findRepoRoot(process.cwd());

  if (!args.subject) return die('usage-error', 'missing --subject <character>');
  if (!args.recognizer) return die('usage-error', 'missing --recognizer <character>');

  if (!characterExists(repoRoot, args.subject)) return die('subject-not-found', `no character record for ${args.subject}`);
  if (!characterExists(repoRoot, args.recognizer)) return die('recognizer-not-found', `no character record for ${args.recognizer}`);

  const role = 'leader-of-a-swarm';
  const recognitionDir = join(repoRoot, 'doing/governing/recognitions', role, args.subject);
  const recognitionPath = join(recognitionDir, `${args.recognizer}.md`);
  const recognitionRel = recognitionPath.slice(repoRoot.length + 1);

  if (existsSync(recognitionPath)) {
    logWitness(repoRoot, {
      skill: 'recognizing-a-character-as-leader-of-a-swarm',
      step: 'no-op',
      subject: args.subject,
      recognizer: args.recognizer,
      role,
      alreadyPresent: true,
    });
    return { ok: true, subject: args.subject, recognizer: args.recognizer, role, alreadyPresent: true, recognitionPath: recognitionRel };
  }

  const ts = new Date().toISOString();
  const fm = {
    name: `recognition-${args.subject}-as-${role}-by-${args.recognizer}`,
    description: `Recognition cell asserting that ${args.subject} bears the leader role for the swarm. Written by ${args.recognizer}.`,
    kind: 'recognition',
    subject: args.subject,
    role,
    recognizer: args.recognizer,
    'recognized-at': ts,
  };
  if (args['recognition-note']) fm['recognition-note'] = args['recognition-note'];

  const fmText = encodeYaml(fm).trimEnd();
  const body = `${args.recognizer} recognizes ${args.subject} as ${role}.\n`;
  const content = `---\n${fmText}\n---\n\n${body}`;

  mkdirSync(recognitionDir, { recursive: true });
  writeFileSync(recognitionPath, content);

  logWitness(repoRoot, {
    skill: 'recognizing-a-character-as-leader-of-a-swarm',
    step: 'recognized',
    subject: args.subject,
    recognizer: args.recognizer,
    role,
    recognitionPath: recognitionRel,
  });
  return { ok: true, subject: args.subject, recognizer: args.recognizer, role, alreadyPresent: false, recognitionPath: recognitionRel };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  const cliArgs = parseArgs(process.argv.slice(2));
  const result = await recognizeAsLeader(cliArgs);
  if (result?.ok) process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(result?.ok ? 0 : 1);
}
