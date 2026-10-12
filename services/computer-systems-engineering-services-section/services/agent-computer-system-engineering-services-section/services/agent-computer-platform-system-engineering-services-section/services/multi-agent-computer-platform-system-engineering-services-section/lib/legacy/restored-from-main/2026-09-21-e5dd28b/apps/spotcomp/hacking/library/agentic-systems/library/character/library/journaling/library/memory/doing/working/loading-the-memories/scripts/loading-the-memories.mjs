#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { runJavascriptNodeOperation } from "../../../../../../../../../../../../../../../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";

const KINDS = ['feedback', 'reference', 'user', 'project'];
const IN_REPO_REL = 'doing/working/journaling/library/memory/library';

function projectIdFromCwd(cwd) {
  return '-' + cwd.replace(/^\//, '').replace(/\//g, '-');
}

function titleize(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  return m[1];
}

function extractField(fm, field) {
  if (!fm) return null;
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const m = fm.match(re);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

export default async function loadingTheMemories(cwd = process.cwd()) {
  const inRepoBase = resolve(cwd, IN_REPO_REL);
  const projectId = projectIdFromCwd(cwd);
  const autoDir = join(homedir(), '.claude', 'projects', projectId, 'memory');

  const result = {
    'loaded-count': 0,
    'auto-memory-dir': autoDir,
    'in-repo-dir': inRepoBase,
    'kinds-loaded': { feedback: 0, reference: 0, user: 0, project: 0 },
  };

  if (!existsSync(inRepoBase)) return result;

  await mkdir(autoDir, { recursive: true });

  const indexLines = [];

  for (const kind of KINDS) {
    const kindDir = join(inRepoBase, kind);
    if (!existsSync(kindDir)) continue;
    const s = await stat(kindDir);
    if (!s.isDirectory()) continue;

    const entries = await readdir(kindDir);
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      if (entry.startsWith('_')) continue;
      const slug = entry.slice(0, -3);
      const content = await readFile(join(kindDir, entry), 'utf8');
      const autoFilename = `${kind}_${slug.replace(/-/g, '_')}.md`;
      await writeFile(join(autoDir, autoFilename), content);
      const fm = extractFrontmatter(content);
      const description = extractField(fm, 'description') ?? '';
      indexLines.push(
        `- [${titleize(slug)}](${autoFilename})${description ? ' — ' + description : ''}`
      );
      result['loaded-count']++;
      result['kinds-loaded'][kind]++;
    }
  }

  indexLines.sort();
  await writeFile(
    join(autoDir, 'MEMORY.md'),
    indexLines.join('\n') + (indexLines.length ? '\n' : ''),
  );

  return result;
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "loading-the-memories", description: "loadingTheMemories — the loading-the-memories operation.", operation: loadingTheMemories }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
