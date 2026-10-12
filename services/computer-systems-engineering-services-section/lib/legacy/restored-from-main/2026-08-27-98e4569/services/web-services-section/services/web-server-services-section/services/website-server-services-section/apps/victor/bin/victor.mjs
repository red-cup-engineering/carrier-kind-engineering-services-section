#!/usr/bin/env node
// victor build <contentDir> <outDir> [--drafts]
// victor check <contentDir>
// victor serve <contentDir> [--port 8561]
// victor new <type> <name> [--dir <contentDir>]

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { build, writeArtifacts } from '../src/build.mjs';
import { loadProjectConfig, normalizeProjectConfig } from '../src/config.mjs';
import { createVictorApplication } from '../src/runtime.mjs';

const [, , command, ...args] = process.argv;
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const configFlag = args.find((a) => a.startsWith('--config='));

async function projectOptions() {
  const config = await loadProjectConfig(configFlag ? configFlag.slice('--config='.length) : null);
  const normalized = normalizeProjectConfig(config);
  return { ...normalized.config, configurationRefusals: normalized.refusals };
}

function printReport(report) {
  for (const r of report.refusals) console.error(`refusal ${r.code} · ${r.subject}: ${r.reason}`);
  for (const a of report.advisories) console.error(`advisory ${a.code ?? ''} · ${a.subject ?? ''}: ${a.reason}`);
  console.error(`${report.cellCount} cells, ${report.publishedCount} published, ` +
    `${report.refusals.length} refusals, ${report.advisories.length} advisories · catalog ${report.catalogHash}`);
}

if (command === 'build') {
  const [contentDir, outDir] = positional;
  const { artifacts, report } = await build({ contentDir, drafts: flags.has('--drafts'), ...await projectOptions() });
  printReport(report);
  if (!report.releasable) { console.error('not releasable: refusals stand.'); process.exit(1); }
  await writeArtifacts(artifacts, outDir);
  console.error(`wrote ${artifacts.size} artifacts to ${outDir}`);
} else if (command === 'check') {
  const [contentDir] = positional;
  const options = await projectOptions();
  const first = await build({ contentDir, drafts: true, ...options });
  const second = await build({ contentDir, drafts: true, ...options });
  const deterministic = JSON.stringify(first.report.artifactHashes) === JSON.stringify(second.report.artifactHashes);
  if (!deterministic) first.report.refusals.push({ code: 'R-02', subject: 'build', reason: 'two builds of the same catalog differ' });
  printReport(first.report);
  console.error(deterministic ? 'deterministic: double-build hashes match.' : 'NOT deterministic.');
  process.exit(first.report.refusals.length ? 1 : 0);
} else if (command === 'serve') {
  const [contentDir] = positional;
  const port = Number((args.find((a) => a.startsWith('--port')) || '').split('=')[1] || 8561);
  const { start, installGracefulShutdown } = await import('@red-cup-engineering/http-server');
  const options = await projectOptions();
  let result = await build({ contentDir, drafts: true, ...options });
  const app = await createVictorApplication(result, options.applications);
  const { watch } = await import('node:fs');
  let timer = null;
  const scheduleRebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      result = await build({ contentDir, drafts: true, ...options });
      app.updateBuild(result);
      console.error('rebuilt.');
    }, 150);
  };
  for (const watched of [contentDir, options.publicDir].filter(Boolean)) {
    watch(watched, { recursive: true }, scheduleRebuild);
  }
  const running = await start(app, { port, host: '0.0.0.0' });
  installGracefulShutdown(running, {});
  console.error(`victor serving on http://127.0.0.1:${running.port}/ (drafts visible)`);
} else if (command === 'new') {
  const [type, name] = positional;
  const dirFlag = args.find((a) => a.startsWith('--dir='));
  const contentDir = dirFlag ? dirFlag.slice(6) : '.';
  const today = new Date().toISOString().slice(0, 10);
  const file = join(contentDir, `${name}.md`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `---\ntitle: ${name.split('/').pop().replace(/-/g, ' ')}\ndate-created: ${today}\ntype: ${type}\nstatus: potential\ntags: []\n---\n\n`, { flag: 'wx' });
  console.error(`scaffolded ${file}`);
} else {
  console.error('usage: victor build <contentDir> <outDir> [--drafts] [--config=FILE] | check <contentDir> [--config=FILE] | serve <contentDir> [--port=N] [--config=FILE] | new <type> <name> [--dir=D]');
  process.exit(2);
}
