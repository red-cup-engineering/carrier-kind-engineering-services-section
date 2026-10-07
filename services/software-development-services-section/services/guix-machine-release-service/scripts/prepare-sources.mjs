#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';

export function command(program, args, cwd) {
  const r = spawnSync(program, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw r.error ?? new Error(`${program} failed (${r.status}): ${r.stderr.slice(-4000)}`);
  return r.stdout.trim();
}

export function packageSources(repositories, owners = {}) {
  const packages = new Map();
  for (const { directory, repository, commit } of repositories) {
    if (command('git', ['rev-parse', 'HEAD'], directory) !== commit) throw new Error(`source commit differs: ${repository}`);
    const paths = command('git', ['ls-tree', '-r', '--name-only', commit], directory).split('\n');
    for (const path of paths) {
      if (!path.endsWith('package.json') || path.split('/').some(x => ['legacy', 'vendored', 'material', 'test', 'tests', 'examples', 'repository-bootstrap'].includes(x))) continue;
      const manifest = JSON.parse(command('git', ['show', `${commit}:${path}`], directory));
      if (!manifest.name || !manifest.version) continue;
      if (owners[manifest.name] && owners[manifest.name] !== repository) continue;
      if (packages.has(manifest.name)) throw new Error(`ambiguous source owner for ${manifest.name}; pin its owning repository`);
      packages.set(manifest.name, { manifest, directory: resolve(directory, dirname(path)), repository, commit, path: dirname(path) });
    }
  }
  return packages;
}

export function selectedSources(packages, entries, dependencyPins = {}) {
  const selected = new Map();
  const queue = [...entries];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const name = queue[cursor];
    if (selected.has(name)) continue;
    const p = packages.get(name);
    if (!p) throw new Error(`entry or workspace dependency has no pinned source: ${name}`);
    selected.set(name, p);
    const peers = Object.fromEntries(Object.entries(p.manifest.peerDependencies ?? {}).filter(([name]) => !p.manifest.peerDependenciesMeta?.[name]?.optional));
    const dependencies = { ...p.manifest.dependencies, ...p.manifest.optionalDependencies, ...peers };
    for (const [dependency, requested] of Object.entries(dependencies)) {
      if (packages.has(dependency)) queue.push(dependency);
      else if (requested.startsWith('workspace:') && !dependencyPins[dependency]) throw new Error(`workspace dependency needs a pinned source or released version: ${name} -> ${dependency}`);
    }
  }
  return selected;
}

export function prepare({ repositories, entries, owners, dependencyPins = {}, output }) {
  const selected = selectedSources(packageSources(repositories, owners), entries, dependencyPins);
  const root = resolve(output);
  mkdirSync(root, { recursive: true });
  const sources = [];
  for (const [name, p] of selected) {
    const target = resolve(root, 'packages', name.replaceAll('/', '__'));
    mkdirSync(target, { recursive: true });
    const sourceRepository = repositories.find(r => r.repository === p.repository).directory;
    const files = command('git', ['ls-tree', '-r', '--format=%(objectmode) %(path)', p.commit, '--', p.path], sourceRepository).split('\n');
    for (const record of files) {
      // npm package archives do not include symlinks or nested gitlinks.
      if (!/^(100644|100755) /.test(record)) continue;
      const file = record.slice(7);
      const path = relative(p.directory, resolve(repositories.find(r => r.repository === p.repository).directory, file));
      if (!path || path.split('/').some(x => ['node_modules', '.git', 'legacy'].includes(x))) continue;
      const destination = resolve(target, path);
      mkdirSync(dirname(destination), { recursive: true });
      const blob = spawnSync('git', ['show', `${p.commit}:${file}`], { cwd: sourceRepository, maxBuffer: 64 * 1024 * 1024 });
      if (blob.error || blob.status !== 0) throw blob.error ?? new Error(`cannot read pinned source blob: ${p.repository}:${file}`);
      writeFileSync(destination, blob.stdout);
      chmodSync(destination, record.startsWith('100755') ? 0o755 : 0o644);
    }
    const manifest = structuredClone(p.manifest);
    delete manifest.devDependencies;
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [dependency, requested] of Object.entries(manifest[field] ?? {})) {
        if (selected.has(dependency)) manifest[field][dependency] = 'workspace:*';
        else if (requested.startsWith('workspace:')) {
          if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(dependencyPins[dependency] ?? '')) throw new Error(`unresolved workspace provider: ${name} -> ${dependency}`);
          manifest[field][dependency] = dependencyPins[dependency];
        }
      }
    }
    writeFileSync(resolve(target, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
    sources.push({ name, version: manifest.version, repository: p.repository, commit: p.commit, path: p.path,
      sourceManifestSha256: createHash('sha256').update(JSON.stringify(p.manifest)).digest('hex') });
  }
  // Source providers also bind transitive registry consumers to that same source.
  // The lockfile records the resulting singleton dependency graph.
  writeFileSync(resolve(root, 'package.json'), JSON.stringify({ private: true, packageManager: 'pnpm@11.19.0', scripts: {}, pnpm: { overrides: Object.fromEntries([...selected.keys()].map(name => [name, 'workspace:*'])) } }, null, 2) + '\n');
  writeFileSync(resolve(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\nlinkWorkspacePackages: true\npreferWorkspacePackages: true\nautoInstallPeers: false\nignoreScripts: true\n");
  writeFileSync(resolve(root, 'sources.json'), JSON.stringify({ repositories: repositories.map(({ directory, ...r }) => r), packages: sources }, null, 2) + '\n');
  return { root, selected: sources.map(p => p.name) };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(JSON.stringify(prepare(spec)) + '\n');
}
