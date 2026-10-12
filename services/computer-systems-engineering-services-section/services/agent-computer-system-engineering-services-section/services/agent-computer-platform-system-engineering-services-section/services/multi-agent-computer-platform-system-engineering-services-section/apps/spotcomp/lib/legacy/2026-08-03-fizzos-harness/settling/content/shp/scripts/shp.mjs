/**
 * shp.mjs — SHP output morphism.
 *
 * Transforms a settled positing-log (catalog root with four per-class JSONL
 * files) into an SHP HTML document. This is the bridge between TRC memory
 * and the SHP language subsystem-view.
 *
 * For each unique (e,a,v) triple across all four class files, the morphism:
 *   1. Projects the settled FOUR value: pos = any assertion or contestation
 *      exists; neg = any denial or contestation exists (Belnap 1977).
 *   2. Emits a span with class=a (morphism-identity), data-e=e, data-v=v.
 *   3. Abstentions (⊥) contribute nothing — ⊥ is the ≤ₖ identity.
 *   4. Non-assertion spans carry data-belnap encoding the Belnap class.
 *
 * Yoneda: the span IS the canonical embedding of the settled cell into the
 * document category. class=a is the morphism-identity. data-e=e, data-v=v
 * are the carrier elements.
 *
 * Input:  { "catalog-root": string, "output"?: string, "t"?: string }
 *         (conforms to shp.schema.json)
 * Output: SHP HTML document (to stdout or output path)
 *
 * CLI: node shp.mjs <catalog-root> [output-path]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CLASSES = ['assertions', 'denials', 'contestations', 'abstentions'];

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function loadCatalog(catalogRoot) {
  return {
    assertions:    readJsonl(join(catalogRoot, 'assertions.jsonl')),
    denials:       readJsonl(join(catalogRoot, 'denials.jsonl')),
    contestations: readJsonl(join(catalogRoot, 'contestations.jsonl')),
    abstentions:   readJsonl(join(catalogRoot, 'abstentions.jsonl')),
  };
}

function projectCell(e, a, v, entries) {
  const pos = entries.assertions.some(r => r.e === e && r.a === a && r.v === v)
           || entries.contestations.some(r => r.e === e && r.a === a && r.v === v);
  const neg = entries.denials.some(r => r.e === e && r.a === a && r.v === v)
           || entries.contestations.some(r => r.e === e && r.a === a && r.v === v);
  if (pos && neg)  return 'contestation';
  if (pos)         return 'assertion';
  if (neg)         return 'denial';
  return 'abstention';
}

function collectByEntity(entries) {
  const seen = new Set();
  const byEntity = new Map();
  for (const cls of CLASSES) {
    for (const row of entries[cls]) {
      const key = `${row.e}\x1f${row.a}\x1f${row.v}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!byEntity.has(row.e)) byEntity.set(row.e, []);
      byEntity.get(row.e).push({ a: row.a, v: row.v });
    }
  }
  return byEntity;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function emitSpan(e, a, v, belnapClass) {
  if (belnapClass === 'abstention') return null;
  const belnap = belnapClass === 'assertion' ? '' : ` data-belnap="${belnapClass}"`;
  return `<span class="${esc(a)}" data-e="${esc(e)}" data-v="${esc(v)}"${belnap}>${esc(v)}</span>`;
}

export function shp({ entries, catalogRoot, t }) {
  const byEntity = collectByEntity(entries);
  const sections = [];

  for (const [e, cells] of [...byEntity.entries()].sort()) {
    const spans = [];
    const sorted = [...cells].sort((x, y) => x.a.localeCompare(y.a) || x.v.localeCompare(y.v));
    for (const { a, v } of sorted) {
      const belnapClass = projectCell(e, a, v, entries);
      const span = emitSpan(e, a, v, belnapClass);
      if (span) spans.push(`      ${span}`);
    }
    if (spans.length === 0) continue;
    sections.push([
      `  <section data-e="${esc(e)}">`,
      `    <h1>${esc(e)}</h1>`,
      `    <p>`,
      ...spans,
      `    </p>`,
      `  </section>`,
    ].join('\n'));
  }

  const generated = t || new Date().toISOString();
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <meta name="generator" content="settling/library/shp/scripts/shp.mjs">`,
    `  <meta name="generated" content="${esc(generated)}">`,
    `  <meta name="catalog-root" content="${esc(catalogRoot)}">`,
    '  <title>SHP — Settled Positing Log</title>',
    '</head>',
    '<body>',
    ...sections,
    '</body>',
    '</html>',
  ].join('\n');
}

// CLI
const [,, catalogRootArg, outputArg] = process.argv;
const catalogRoot = resolve(catalogRootArg ?? '.');
const entries = loadCatalog(catalogRoot);
const t = new Date().toISOString();
const doc = shp({ entries, catalogRoot, t });

if (outputArg) {
  writeFileSync(outputArg, doc, 'utf8');
} else {
  process.stdout.write(doc + '\n');
}
