#!/usr/bin/env node
// combine-resource-files-as-a-consensus — bilattice closure rule over proposal files.
// Implements combining-resource-files.md invariants C1–C10.

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';

const FRONTMATTER_RE = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/;
const OUTPUT_FILES = new Set(['consensus.md', 'conflict.md']);

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

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function targetIdFor(targetRel) {
  return targetRel.replace(/\//g, '__').replace(/\.md$/, '');
}

function splitFrontmatter(text) {
  const m = text.match(FRONTMATTER_RE);
  if (!m) return null;
  return { whole: m[0], open: m[1], body: m[2], close: m[3], rest: text.slice(m[0].length) };
}

function logWitness(repoRoot, event) {
  const skillDir = join(repoRoot, 'library/object/library/thing/library/system/library/operating-system/library/computer-operating-system/library/consensus/doing/working/combining-resource-files-as-a-consensus');
  appendFileSync(join(skillDir, 'combining-resource-files-as-a-consensus.jsonl'), JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n');
}

function readProposal(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const split = splitFrontmatter(text);
  if (!split) return { ok: false, reason: 'no-frontmatter' };
  let fm;
  try { fm = yaml.load(split.body) ?? {}; }
  catch (e) { return { ok: false, reason: `yaml-parse: ${e.message}` }; }
  if (fm.kind !== 'proposal') return { ok: false, reason: `kind=${fm.kind}` };
  return { ok: true, fm, body: split.rest.replace(/^\n+/, ''), text };
}

function bodyHash(body) {
  // Normalize trailing whitespace so a missing newline doesn't read as disagreement.
  return sha256(body.replace(/\n+$/, '') + '\n');
}

function previewBody(body, lines = 30) {
  return body.split('\n').slice(0, lines).join('\n');
}

function staleSetMatches(existingFm, currentProposers) {
  if (!Array.isArray(existingFm['proposed-by']) && typeof existingFm['proposed-by'] !== 'string') return false;
  const existing = Array.isArray(existingFm['proposed-by'])
    ? [...existingFm['proposed-by']].sort()
    : [existingFm['proposed-by']];
  const current = [...currentProposers].sort();
  if (existing.length !== current.length) return false;
  return existing.every((v, i) => v === current[i]);
}

function removeStaleOutputs(proposalDir, currentProposers) {
  for (const out of OUTPUT_FILES) {
    const p = join(proposalDir, out);
    if (!existsSync(p)) continue;
    const split = splitFrontmatter(readFileSync(p, 'utf8'));
    if (!split) { unlinkSync(p); continue; }
    let fm;
    try { fm = yaml.load(split.body) ?? {}; } catch { unlinkSync(p); continue; }
    if (!staleSetMatches(fm, currentProposers)) unlinkSync(p);
  }
}

export default async function combineAsConsensus(args = {}) {
  const repoRoot = args.repo_root ?? findRepoRoot(process.cwd());

  if (!args.target) return die('usage-error', 'missing --target <path>');

  const targetAbs = resolve(repoRoot, args.target);
  if (!existsSync(targetAbs)) return die('target-not-found-at-combine-time', `no file at ${args.target}`);
  const targetRel = targetAbs.slice(repoRoot.length + 1);
  const currentTargetHash = sha256(readFileSync(targetAbs, 'utf8'));

  const proposalDir = join(repoRoot, 'doing/governing/proposals', targetIdFor(targetRel));
  if (!existsSync(proposalDir)) return die('proposals-directory-not-found', `no directory ${proposalDir.slice(repoRoot.length + 1)}`);

  const entries = readdirSync(proposalDir).filter(e => e.endsWith('.md'));
  const live = [];
  const skipped = [];
  for (const entry of entries) {
    if (OUTPUT_FILES.has(entry)) continue;
    const proposalPath = join(proposalDir, entry);
    const parsed = readProposal(proposalPath);
    if (!parsed.ok) { skipped.push({ file: entry, reason: parsed.reason }); continue; }
    if (parsed.fm.status === 'withdrawn') { skipped.push({ file: entry, reason: 'withdrawn' }); continue; }
    if (parsed.fm['target-hash'] && parsed.fm['target-hash'] !== currentTargetHash) {
      skipped.push({ file: entry, reason: 'proposal-target-drifted' });
      continue;
    }
    live.push({ file: entry, proposer: parsed.fm['proposed-by'] ?? entry.replace(/\.md$/, ''), body: parsed.body });
  }

  const proposers = live.map(p => p.proposer);
  removeStaleOutputs(proposalDir, proposers);

  const ts = new Date().toISOString();
  const outcomeBase = {
    name: `${targetIdFor(targetRel)}-OUTCOME`,
    target: targetRel,
    'target-hash': currentTargetHash,
    'combined-at': ts,
  };

  if (live.length === 0) {
    logWitness(repoRoot, { skill: 'combining-resource-files-as-a-consensus', step: 'no-proposals', target: targetRel, skipped });
    return die('no-proposals', `no live proposals at ${proposalDir.slice(repoRoot.length + 1)}`);
  }

  // Bilattice closure: group by body bytes.
  const groups = new Map();
  for (const p of live) {
    const h = bodyHash(p.body);
    if (!groups.has(h)) groups.set(h, { body: p.body, proposers: [] });
    groups.get(h).proposers.push(p.proposer);
  }

  if (groups.size === 1) {
    const only = [...groups.values()][0];
    const fm = {
      ...outcomeBase,
      name: `${outcomeBase.name}-CONSENSUS`,
      description: `Consensus rewrite of ${targetRel}; joined ${only.proposers.length} agreeing proposal(s). Awaiting leader approval.`,
      kind: 'consensus',
      'proposed-by': only.proposers,
      status: 'consensus-pending-approval',
    };
    const fmText = yaml.dump(fm, { lineWidth: 1000, noRefs: true, sortKeys: false }).trimEnd();
    const consensusPath = join(proposalDir, 'consensus.md');
    writeFileSync(consensusPath, `---\n${fmText}\n---\n\n${only.body.replace(/\n+$/, '')}\n`);
    logWitness(repoRoot, { skill: 'combining-resource-files-as-a-consensus', step: 'consensus', target: targetRel, proposers: only.proposers, skipped });
    return {
      ok: true,
      target: targetRel,
      outcome: 'consensus',
      proposers: only.proposers,
      skipped,
      consensusPath: consensusPath.slice(repoRoot.length + 1),
    };
  }

  // Conflict: more than one distinct body.
  const proposalsArray = [...groups.entries()].map(([h, g]) => ({
    proposers: g.proposers,
    'body-hash': h,
    'body-preview-lines': previewBody(g.body).split('\n').length,
  }));
  const fm = {
    ...outcomeBase,
    name: `${outcomeBase.name}-CONFLICT`,
    description: `Conflict on ${targetRel}; ${groups.size} distinct candidate bodies across ${live.length} proposals. Workers must withdraw to resolve.`,
    kind: 'conflict',
    proposals: proposalsArray,
    'proposed-by': proposers,
    status: 'conflict-pending-withdrawal',
  };
  const fmText = yaml.dump(fm, { lineWidth: 1000, noRefs: true, sortKeys: false }).trimEnd();
  const bodyLines = [];
  for (const [h, g] of groups) {
    bodyLines.push(`## Variant ${h.slice(0, 12)} — proposed by ${g.proposers.join(', ')}`);
    bodyLines.push('');
    bodyLines.push('```');
    bodyLines.push(previewBody(g.body));
    bodyLines.push('```');
    bodyLines.push('');
  }
  const conflictPath = join(proposalDir, 'conflict.md');
  writeFileSync(conflictPath, `---\n${fmText}\n---\n\n${bodyLines.join('\n')}`);
  logWitness(repoRoot, { skill: 'combining-resource-files-as-a-consensus', step: 'conflict', target: targetRel, variants: groups.size, proposers, skipped });
  return {
    ok: true,
    target: targetRel,
    outcome: 'conflict',
    proposers,
    variants: groups.size,
    skipped,
    conflictPath: conflictPath.slice(repoRoot.length + 1),
  };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  const cliArgs = parseArgs(process.argv.slice(2));
  const result = await combineAsConsensus(cliArgs);
  if (result?.ok) process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(result?.ok ? 0 : 1);
}
