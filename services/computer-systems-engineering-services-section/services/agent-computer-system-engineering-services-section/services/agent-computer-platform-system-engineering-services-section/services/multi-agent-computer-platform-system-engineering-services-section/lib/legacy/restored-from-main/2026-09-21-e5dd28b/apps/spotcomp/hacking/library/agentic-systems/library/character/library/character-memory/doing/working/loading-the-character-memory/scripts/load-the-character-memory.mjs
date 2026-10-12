#!/usr/bin/env node

import { homedir } from 'node:os';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

function extractField(text, field) {
  const m = text.match(FRONTMATTER_RE);
  if (!m) return null;
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const fm = m[1].match(re);
  return fm ? fm[1].trim().replace(/^["']|["']$/g, '') : null;
}

function projectIdFromCwd(cwd) {
  return '-' + cwd.replace(/^\//, '').replace(/\//g, '-');
}

function titleCase(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const repoRoot = resolve(process.cwd());
const projectId = projectIdFromCwd(repoRoot);
const autoMemoryDir = join(homedir(), '.claude', 'projects', projectId, 'memory');
const repoMemoryDir = join(repoRoot, 'prose', 'journals', 'memories');

if (!existsSync(repoMemoryDir)) {
  process.exit(0);
}

mkdirSync(autoMemoryDir, { recursive: true });

const TYPES = ['feedback', 'reference', 'user', 'project'];
const indexEntries = [];
let loadedCount = 0;

for (const type of TYPES) {
  const typeDir = join(repoMemoryDir, type);
  if (!existsSync(typeDir) || !statSync(typeDir).isDirectory()) continue;
  for (const entry of readdirSync(typeDir)) {
    if (!entry.endsWith('.md')) continue;
    const sourcePath = join(typeDir, entry);
    if (!statSync(sourcePath).isFile()) continue;
    const slug = entry.slice(0, -3);
    const autoMemoryFilename = `${type}_${slug.replace(/-/g, '_')}.md`;
    const targetPath = join(autoMemoryDir, autoMemoryFilename);
    const content = readFileSync(sourcePath, 'utf8');
    writeFileSync(targetPath, content);
    const desc = extractField(content, 'description') ?? '';
    indexEntries.push(`- [${titleCase(slug)}](${autoMemoryFilename}) — ${desc}`);
    loadedCount += 1;
  }
}

const indexContent = indexEntries.join('\n') + (indexEntries.length > 0 ? '\n' : '');
writeFileSync(join(autoMemoryDir, 'MEMORY.md'), indexContent);

console.error(`[load-the-character-memory] loaded ${loadedCount} memories into ${autoMemoryDir}`);
