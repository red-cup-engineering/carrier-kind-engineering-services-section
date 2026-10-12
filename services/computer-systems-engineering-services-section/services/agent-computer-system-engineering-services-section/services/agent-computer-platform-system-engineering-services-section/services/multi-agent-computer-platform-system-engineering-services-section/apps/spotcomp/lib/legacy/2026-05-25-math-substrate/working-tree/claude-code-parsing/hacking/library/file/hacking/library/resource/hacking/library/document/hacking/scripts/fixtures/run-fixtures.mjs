#!/usr/bin/env node
// Fixture harness for reformatting-a-document.
//
// Each fixture is a pair:
//   <name>.txt           — one raw bibliography entry, exactly as it would
//                          appear in a body ## References list (no leading
//                          dash; just the entry text).
//   <name>.expected.json — expected outcome. Three shapes:
//
//     { "status": "extracted",
//       "citekey": "surname1977",
//       "entry": { "class": "...", "authors": [...], "year": ..., ... } }
//
//     { "status": "unparsed",
//       "reason": "..." }
//
//     { "status": "multi-extracted",
//       "entries": [
//         { "citekey": "...", "entry": { ... } },
//         ...
//       ] }
//
// The runner builds a synthetic markdown document with the entry as the
// only bullet under a ## References heading, runs the morphism, and diffs
// the result against the expected. Deep-equality on the entry; exact match
// on citekey and status. Extra fields in the actual entry that aren't in
// the expected are failures (the fixture must capture the morphism's full
// output).

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { default: reformattingADocument } = await import(join(HERE, '..', 'reformatting-a-document.mjs'));

const buildDocument = (entryText) => ({
  path: '/fixture/docs/dev/journal/2026-01-01.md',
  frontmatter: { name: 'fixture', description: 'fixture' },
  body: `body sentence.\n\n## References\n\n- ${entryText}\n`
});

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object') {
    const ak = Object.keys(a).sort();
    const bk = Object.keys(b).sort();
    if (ak.length !== bk.length) return false;
    if (!ak.every((k, i) => k === bk[i])) return false;
    return ak.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
};

// Deterministic now for the year-of-access fields on living-document styles.
// Pinned so fixture expectations don't drift with the wall clock.
const FIXTURE_NOW = '2026-01-15T00:00:00Z';
// Fixtures test extraction at all confidence levels, so the harness opts in
// to medium and low parses. The CLI's default behavior (min-confidence: 'high')
// is what production runs use; fixtures exercise the underlying parser.
const FIXTURE_MIN_CONFIDENCE = 'low';

const runFixture = (name, entryText, expected) => {
  const doc = buildDocument(entryText);
  const result = reformattingADocument({
    document: doc,
    now: FIXTURE_NOW,
    'min-confidence': FIXTURE_MIN_CONFIDENCE
  });
  const refs = result.document.frontmatter.references ?? {};
  const refKeys = Object.keys(refs);
  const unparsed = result.findings.filter((f) => f.rule === 'entry-unparsed');

  if (expected.status === 'unparsed') {
    if (refKeys.length > 0) {
      return { ok: false, msg: `expected unparsed, got ${refKeys.length} extracted entry(ies)` };
    }
    if (unparsed.length !== 1) {
      return { ok: false, msg: `expected exactly 1 unparsed finding, got ${unparsed.length}` };
    }
    if (expected.reason && unparsed[0].reason !== expected.reason) {
      return { ok: false, msg: `unparsed reason mismatch: expected ${JSON.stringify(expected.reason)}, got ${JSON.stringify(unparsed[0].reason)}` };
    }
    return { ok: true };
  }

  if (expected.status === 'extracted') {
    if (refKeys.length !== 1) {
      return { ok: false, msg: `expected 1 extracted entry, got ${refKeys.length} (unparsed=${unparsed.length})` };
    }
    const [actualCitekey] = refKeys;
    if (actualCitekey !== expected.citekey) {
      return { ok: false, msg: `citekey mismatch: expected ${JSON.stringify(expected.citekey)}, got ${JSON.stringify(actualCitekey)}` };
    }
    const actualEntry = refs[actualCitekey];
    if (!deepEqual(actualEntry, expected.entry)) {
      return { ok: false, msg: `entry mismatch`, actual: actualEntry, expected: expected.entry };
    }
    return { ok: true };
  }

  if (expected.status === 'multi-extracted') {
    if (refKeys.length !== expected.entries.length) {
      return { ok: false, msg: `expected ${expected.entries.length} entries, got ${refKeys.length}` };
    }
    for (let i = 0; i < expected.entries.length; i++) {
      const want = expected.entries[i];
      const haveEntry = refs[want.citekey];
      if (!haveEntry) {
        return { ok: false, msg: `expected citekey ${JSON.stringify(want.citekey)} not in extracted set: ${refKeys.join(', ')}` };
      }
      if (!deepEqual(haveEntry, want.entry)) {
        return { ok: false, msg: `entry mismatch for ${want.citekey}`, actual: haveEntry, expected: want.entry };
      }
    }
    return { ok: true };
  }

  return { ok: false, msg: `unknown expected status: ${JSON.stringify(expected.status)}` };
};

const fixtureFiles = readdirSync(HERE)
  .filter((f) => f.endsWith('.txt'))
  .sort();

let passed = 0;
let failed = 0;
const failures = [];

for (const txtFile of fixtureFiles) {
  const name = basename(txtFile, '.txt');
  const expectedFile = join(HERE, `${name}.expected.json`);
  let expected;
  try {
    expected = JSON.parse(readFileSync(expectedFile, 'utf8'));
  } catch (err) {
    console.log(`SKIP ${name}: missing or invalid ${name}.expected.json (${err.message})`);
    continue;
  }
  const entryText = readFileSync(join(HERE, txtFile), 'utf8').trim();
  const result = runFixture(name, entryText, expected);
  if (result.ok) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failed++;
    failures.push({ name, result });
    console.log(`FAIL ${name}: ${result.msg}`);
    if (result.actual) console.log(`  actual:   ${JSON.stringify(result.actual)}`);
    if (result.expected) console.log(`  expected: ${JSON.stringify(result.expected)}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed (${fixtureFiles.length} fixtures)`);
process.exit(failed > 0 ? 1 : 0);
