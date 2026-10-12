// generating-shp — morphism: TRC catalog root → SHP HTML document.
//
// Walks the per-thing JSONL logs under the catalog root, collects the EAVT
// rows, and embeds each as a span (class = predicate a, data-e = subject e,
// data-v = object v) under a section per subject. Yoneda (1954) embedding of
// each cell into the document category. A row is carried as itself; the
// value is the mark v.
//
// Input:  { "catalog-root": string, "t"?: string }
// Output: string — SHP HTML document

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

// All EAVT rows in the catalog: every per-thing <thing>.jsonl log beneath the root.
function loadRows(catalogRoot) {
  const rows = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.jsonl')) rows.push(...readJsonl(p));
    }
  };
  if (existsSync(catalogRoot)) walk(catalogRoot);
  return rows;
}

// Display string for a coordinate: a bare string slug as-is, else stable JSON.
function disp(x) {
  if (typeof x === 'string') return x;
  return JSON.stringify(x);
}

function collectByEntity(rows) {
  const seen = new Set();
  const byEntity = new Map();
  for (const row of rows) {
    const e = disp(row.e), a = disp(row.a), v = disp(row.v);
    const key = `${e}\x1f${a}\x1f${v}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!byEntity.has(e)) byEntity.set(e, []);
    byEntity.get(e).push({ a, v });
  }
  return byEntity;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export default function generatingShp(input) {
  const catalogRoot = resolve(input['catalog-root']);
  const t = input.t || new Date().toISOString();
  const byEntity = collectByEntity(loadRows(catalogRoot));
  const sections = [];

  for (const [e, cells] of [...byEntity.entries()].sort()) {
    const sorted = [...cells].sort((x, y) => x.a.localeCompare(y.a) || x.v.localeCompare(y.v));
    const spans = sorted.map(({ a, v }) =>
      `      <span class="${esc(a)}" data-e="${esc(e)}" data-v="${esc(v)}">${esc(v)}</span>`
    );
    if (spans.length === 0) continue;
    sections.push([
      `  <section data-e="${esc(e)}">`,
      `    <h2>${esc(e)}</h2>`,
      `    <p>`,
      ...spans,
      `    </p>`,
      `  </section>`,
    ].join('\n'));
  }

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <meta name="generator" content="semantic-hypertext-packet/hacking/library/generating-shp">`,
    `  <meta name="generated" content="${esc(t)}">`,
    `  <meta name="catalog-root" content="${esc(catalogRoot)}">`,
    '  <title>SHP — Settled Positing Log</title>',
    '</head>',
    '<body>',
    ...sections,
    '</body>',
    '</html>',
  ].join('\n');
}

// CLI: node generating-shp.mjs <catalog-root>
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [,, catalogRootArg] = process.argv;
  if (!catalogRootArg) {
    process.stderr.write('Usage: node generating-shp.mjs <catalog-root>\n');
    process.exit(1);
  }
  process.stdout.write(generatingShp({ 'catalog-root': catalogRootArg }) + '\n');
}
