#!/usr/bin/env node
// PreToolUse hook on Write|Edit|MultiEdit. Refuses any tool call whose
// projected post-write parent-directory state violates the thing-directory-file
// schema (basename rule, all-identity-files-or-none rule, subdir-naming rule).
//
// Per SPEC, this transformer lives under its structure
// (thing-directory-file/blocking-a-write-that-breaks-the-thing-directory-file-schema/scripts/);
// its sibling transformer validating-a-thing-directory-file/ supplies the
// validation logic via a relative import.
//
// Exit codes per Claude Code's PreToolUse hook protocol:
//   0 — allow the tool call
//   2 — deny the tool call (stderr is shown to the model)

import { dirname, basename, resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 30; i++) {
    if (existsSync(resolve(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}
const repoRoot = findRepoRoot(__dirname);

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const raw = Buffer.concat(chunks).toString('utf8');

let input;
try { input = JSON.parse(raw); } catch { process.exit(0); }

const filePath = input?.tool_input?.file_path;
const toolName = input?.tool_name;
if (typeof filePath !== 'string' || filePath.length === 0) process.exit(0);

const absFile = resolve(filePath);
const parentDir = dirname(absFile);
if (!existsSync(parentDir)) process.exit(0);
if (!statSync(parentDir).isDirectory()) process.exit(0);

// Skip parent dirs outside the repo root — /tmp, /var, etc. are not $things.
if (repoRoot && !parentDir.startsWith(repoRoot + '/') && parentDir !== repoRoot) process.exit(0);

// Dot-prefixed dirs (.claude, .git, .github) and known toolchain dirs are
// not $things and are not subject to the thing-directory-file schema.
const parentBasename = basename(parentDir);
if (parentBasename.startsWith('.')) process.exit(0);
if (parentBasename === 'node_modules') process.exit(0);
if (parentBasename === 'old-archive') process.exit(0);

// Edit and MultiEdit cannot change a directory's file or subdir list — they
// only change content inside an existing file. Directory-state rules cannot
// be violated by a content-only edit; the blocker has nothing to check.
if (toolName === 'Edit' || toolName === 'MultiEdit') process.exit(0);

let mod;
try {
  mod = await import(pathToFileURL(validatorPath).href);
} catch (e) {
  process.stderr.write(`thing-directory-file blocker: validator import failed: ${e.message}\n`);
  process.exit(0);
}

// Identity-file incremental fill: if the Write is adding one of the four
// required identity files and that file is currently missing, allow the
// write through even though the other identity files are still missing.
// This lets the four be added one by one to bring a directory into
// conformance step by step, instead of demanding all four at once.
try {
  const currentAudit = mod.buildAuditObject(parentDir);
  const parentName = currentAudit.name;
  const requiredIdentityFiles = [
    '_index.md',
    `${parentName}.md`,
    `${parentName}.schema.json`,
    `${parentName}.jsonl`
  ];
  const writeBasename = basename(absFile);
  if (
    toolName === 'Write'
    && requiredIdentityFiles.includes(writeBasename)
    && !currentAudit.files.includes(writeBasename)
  ) {
    process.exit(0);
  }
} catch (e) {
  // Fall through to the standard check below.
}

let audit, result;
try {
  audit = mod.projectAuditForWrite(parentDir, basename(absFile), toolName);
  result = mod.validateAuditObject(audit);
} catch (e) {
  process.stderr.write(`thing-directory-file blocker: validation error: ${e.message}\n`);
  process.exit(0);
}

if (result.ok) process.exit(0);

const errorLines = result.errors.map(err => `  [${err.stage}/${err.rule}] ${err.message}`).join('\n');
process.stderr.write(
  `BLOCKED: this ${toolName} would leave ${parentDir} non-conformant to the thing-directory-file schema.\n\n${errorLines}\n\nFix the directory shape (basename rule: identity files match dirname; all-or-nothing on the four identity files; subdirs are known kinds or gerund-named transformers) and re-attempt.\n`
);
process.exit(2);
