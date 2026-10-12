#!/usr/bin/env node
// teach-a-skill-to-a-character — confer a skill onto a character's record.
// Implements work/governance/rules/specifications/teaching-a-skill.md invariants I1–I9.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeYaml, encodeYaml } from '@red-cup-engineering/yaml-frontmatter-codec-service';
import { createSemanticRecordJournal } from '@red-cup-engineering/eavt/semantic-record';

const SKILL_SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FRONTMATTER_RE = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) args[k.slice(2)] = argv[++i];
  }
  return args;
}

function die(code, msg, extra = {}) {
  process.stderr.write(`${code}: ${msg}\n`);
  return { ok: false, code, message: msg, ...extra };
}

function findRepoRoot(start) {
  let dir = start;
  while (dir !== '/') {
    if (existsSync(join(dir, 'CLAUDE.md')) && existsSync(join(dir, '.mcp.json'))) return dir;
    dir = dirname(dir);
  }
  return start;
}

function characterPath(repoRoot, name) {
  return join(repoRoot, 'doing/governing/characters', name, `${name}.md`);
}

function skillPath(repoRoot, slug) {
  return join(repoRoot, 'doing/working/skills', slug, 'SKILL.md');
}

function logWitness(repoRoot, event) {
  const ts = new Date().toISOString();
  createSemanticRecordJournal({ root: repoRoot, objectKind: 'spotcomp.character-witness' }).record({
    category: 'teaching-a-skill-to-a-character.witness',
    recordedAt: ts,
    record: { ts, ...event },
    charge: { support: true, refutation: false },
  });
}

function entrySlug(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && typeof entry.skill === 'string') return entry.skill;
  return null;
}

// Append a bare-slug entry to a `skills:` YAML block, preserving the existing
// bullet indent. Returns the new file text.
function appendSkillSlug(fileText, slug, defaultsJson) {
  const m = fileText.match(FRONTMATTER_RE);
  if (!m) throw new Error('frontmatter-block-not-found');
  const [whole, openFence, body, closeFence] = m;
  const lines = body.split(/\r?\n/);

  const headerIdx = lines.findIndex(l => /^skills\s*:/.test(l));
  if (headerIdx === -1) throw new Error('skills-key-not-present');

  // Walk forward to find end of the YAML list under `skills:`. List items begin
  // with whitespace then `-`. End-of-list is the first line at column 0 that is
  // not the list (a new top-level key, or the end of frontmatter body).
  let endIdx = headerIdx + 1;
  let bullet = '  - ';
  for (; endIdx < lines.length; endIdx++) {
    const line = lines[endIdx];
    if (/^\s+-\s/.test(line)) {
      const indentMatch = line.match(/^(\s+)-\s/);
      if (indentMatch) bullet = `${indentMatch[1]}- `;
      continue;
    }
    if (/^\s+\S/.test(line)) continue; // continuation of a mapped list item
    if (line.trim() === '') continue;   // blank within block
    break;
  }

  let newEntry;
  if (defaultsJson) {
    const defaults = JSON.parse(defaultsJson);
    const lined = encodeYaml({ skill: slug, defaults }).split(/\r?\n/).filter(Boolean);
    newEntry = bullet + lined[0] + '\n' + lined.slice(1).map(l => bullet.replace(/-\s$/, '  ') + l).join('\n');
  } else {
    newEntry = bullet + slug;
  }

  const before = lines.slice(0, endIdx);
  const after = lines.slice(endIdx);
  while (before.length && before[before.length - 1].trim() === '') before.pop();
  const newBody = [...before, newEntry, ...after].join('\n');
  return fileText.replace(whole, `${openFence}${newBody}${closeFence}`);
}

export default async function teachASkillToACharacter(args = {}) {
  const repoRoot = args.repo_root ?? findRepoRoot(process.cwd());

  if (!args.character) return die('usage-error', 'missing character');
  if (!args.skill) return die('usage-error', 'missing skill');
  if (!SKILL_SLUG_RE.test(args.skill)) return die('slug-malformed', `skill slug "${args.skill}" is not kebab-case`);

  const skillFile = skillPath(repoRoot, args.skill);
  if (!existsSync(skillFile)) return die('skill-not-found', `no SKILL.md at ${skillFile}`);

  const charFile = characterPath(repoRoot, args.character);
  if (!existsSync(charFile)) return die('bearer-not-found', `no character record at ${charFile}`);

  const fileText = readFileSync(charFile, 'utf8');
  const fmMatch = fileText.match(FRONTMATTER_RE);
  if (!fmMatch) return die('bearer-malformed', 'character record has no frontmatter');

  let fm;
  try { fm = decodeYaml(fmMatch[2]); }
  catch (e) { return die('bearer-yaml-malformed', `YAML parse failed: ${e.message}`); }

  if (!Array.isArray(fm.skills)) return die('bearer-malformed', 'character frontmatter has no `skills:` list');

  const present = fm.skills.some(e => entrySlug(e) === args.skill);
  const event = {
    skill: 'teaching-a-skill-to-a-character',
    bearer: charFile.slice(repoRoot.length + 1),
    conferred: args.skill,
    alreadyPresent: present,
  };

  if (present) {
    logWitness(repoRoot, { ...event, step: 'no-op' });
    return { ok: true, ...event };
  }

  let newText;
  try { newText = appendSkillSlug(fileText, args.skill, args.defaults); }
  catch (e) { return die('write-failed', e.message); }

  const reparsed = decodeYaml(newText.match(FRONTMATTER_RE)[2]);
  if (!Array.isArray(reparsed.skills) || !reparsed.skills.some(e => entrySlug(e) === args.skill)) {
    return die('write-failed', 'post-write YAML does not contain the conferred slug');
  }
  if (!reparsed.name || !reparsed.description) {
    return die('write-failed', 'post-write character record lost required identity cells');
  }

  writeFileSync(charFile, newText);
  logWitness(repoRoot, { ...event, step: 'added' });
  return { ok: true, ...event, written: true };
}

// CLI-mode entry point. Guarded so MCP-time dynamic-import does NOT trigger
// argv parsing or process.exit — that path would kill the MCP server on
// startup (Claude Code surfaces it as -32000 ConnectionClosed).
if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  const cliArgs = parseArgs(process.argv.slice(2));
  const result = await teachASkillToACharacter({
    character: cliArgs.character,
    skill: cliArgs.skill,
    defaults: cliArgs.defaults,
    repo_root: cliArgs['repo-root'],
  });
  if (result?.ok) process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(result?.ok ? 0 : 1);
}
