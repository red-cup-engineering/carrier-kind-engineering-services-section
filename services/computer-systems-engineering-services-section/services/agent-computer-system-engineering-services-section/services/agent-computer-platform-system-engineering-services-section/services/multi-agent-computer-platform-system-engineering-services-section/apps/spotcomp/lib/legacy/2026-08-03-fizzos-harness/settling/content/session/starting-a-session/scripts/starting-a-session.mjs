// starting-a-session — chain morphism for session start.
// Loads the EAVT catalog from disk, assigns a session-id, starts the timestamp.
// No NLP; pure structural assembly.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, join } from 'node:path';
import { catalogRoot as DEFAULT_CATALOG_ROOT } from '#settling/library/index.mjs';

function findEAVTFiles(root) {
  const files = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.jsonl')) files.push(full);
    }
  }
  walk(root);
  return files;
}

function loadEAVTFile(path) {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf8');
  const rows = [];
  for (const line of content.split('\n')) {
    if (line.trim().length === 0) continue;
    try { rows.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return rows;
}

export default function startingASession(input = {}) {
  const catalogRoot = input['catalog-root'] || DEFAULT_CATALOG_ROOT;
  const id = input.id || `session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const startT = input['start-t'] || new Date().toISOString();

  const catalogFiles = findEAVTFiles(catalogRoot);
  const catalog = [];
  for (const f of catalogFiles) {
    for (const r of loadEAVTFile(f)) catalog.push({ ...r, _source: f });
  }

  return {
    id,
    'start-t': startT,
    'catalog-root': catalogRoot,
    catalog,
    messages: [],
    'marked-up-text': '',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) {
  const state = startingASession();
  console.log(`session ${state.id} started at ${state['start-t']}`);
  console.log(`catalog: ${state.catalog.length} rows from ${state['catalog-root']}`);
}
