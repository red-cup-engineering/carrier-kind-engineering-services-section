// Shared helpers for the name-resolving skills. Loads the transformer and
// structure records and exposes a small parsing API for skill-slug resolution.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { decodeYaml } from '@red-cup-engineering/yaml-frontmatter-codec-service';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const ARTICLES = new Set(['a', 'an', 'the']);

function extractFrontmatter(absPath) {
  if (!existsSync(absPath)) return {};
  const text = readFileSync(absPath, 'utf8');
  const m = text.match(FRONTMATTER_RE);
  if (!m) return {};
  try { return decodeYaml(m[1]); } catch { return {}; }
}

export function loadNameRecords(repoRoot) {
  const transformerDir = join(repoRoot, 'code/transformers');
  const structureDir = join(repoRoot, 'code/structures');
  const transformers = new Map();  // gerund -> transformer-record-stem
  const imperatives = new Map();   // transformer-record-stem -> imperative
  const structures = new Set();    // structure-record-stems

  if (existsSync(transformerDir)) {
    for (const entry of readdirSync(transformerDir)) {
      if (!entry.endsWith('.md') || entry === '_index.md') continue;
      const stem = entry.slice(0, -3);
      const fm = extractFrontmatter(join(transformerDir, entry));
      const gerund = typeof fm.gerund === 'string' ? fm.gerund : stem;
      transformers.set(gerund, stem);
      if (typeof fm.imperative === 'string') imperatives.set(stem, fm.imperative);
    }
  }
  if (existsSync(structureDir)) {
    for (const entry of readdirSync(structureDir)) {
      if (!entry.endsWith('.md') || entry === '_index.md') continue;
      structures.add(entry.slice(0, -3));
    }
  }

  return { transformers, imperatives, structures };
}

// Greedy head consumption: longest prefix of `slug` that matches a key in `heads`.
export function consumeHead(slug, heads) {
  const parts = slug.split('-');
  for (let size = parts.length; size > 0; size -= 1) {
    const head = parts.slice(0, size).join('-');
    if (heads.has(head)) return { head, rest: parts.slice(size) };
  }
  return null;
}

export function stripArticle(parts) {
  if (parts.length > 0 && ARTICLES.has(parts[0])) return parts.slice(1);
  return parts;
}

export function resolveSkillSlug(slug, names) {
  const parsed = consumeHead(slug, names.transformers);
  if (!parsed) return { ok: false, reason: `skill slug head does not resolve to a transformer gerund: ${slug}` };
  const structureParts = stripArticle(parsed.rest);
  const structure = structureParts.join('-');
  if (!structure || !names.structures.has(structure)) {
    return { ok: false, reason: `skill target does not resolve to a structure: ${structure || '(missing)'}` };
  }
  const transformer = names.transformers.get(parsed.head);
  return { ok: true, gerund: parsed.head, transformer, structure };
}
