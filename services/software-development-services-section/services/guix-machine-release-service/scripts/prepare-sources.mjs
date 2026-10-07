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
      if (!path.endsWith('package.json') || path.split('/').some(x => ['legacy', 'vendor', 'vendored', 'material', 'test', 'tests', 'examples', 'repository-bootstrap'].includes(x))) continue;
      const manifest = JSON.parse(command('git', ['show', `${commit}:${path}`], directory));
      if (!manifest.name || !manifest.version) continue;
      const owner = owners[manifest.name];
      if (typeof owner === 'string' && owner !== repository) continue;
      if (owner && typeof owner === 'object' && (owner.repository !== repository || owner.path !== dirname(path))) continue;
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

export function prepare({ repositories, entries, buildEntries = [], owners, dependencyPins = {}, output }) {
  const selected = selectedSources(packageSources(repositories, owners), [...entries,...buildEntries], dependencyPins);
  const root = resolve(output);
  mkdirSync(root, { recursive: true });
  const sources = [];
  for (const [name, p] of selected) {
    const target = resolve(root, 'packages', name.replaceAll('/', '__'));
    mkdirSync(target, { recursive: true });
    const sourceRepository = repositories.find(r => r.repository === p.repository).directory;
    const records = command('git', ['ls-tree','-rz',p.commit,'--',p.path], sourceRepository).split('\0').filter(Boolean);
    const files=records.map(record=>{const tab=record.indexOf('\t');const [mode,type,oid]=record.slice(0,tab).split(' ');return {mode,type,oid,file:record.slice(tab+1)}}).filter(({mode,file})=>['100644','100755'].includes(mode)&&!file.split('/').some(x=>['node_modules','.git','legacy','vendor'].includes(x)));
    // Read the immutable object set in one batch rather than one process per file.
    const batch=spawnSync('git',['cat-file','--batch'],{cwd:sourceRepository,input:files.map(f=>f.oid+'\n').join(''),maxBuffer:256*1024*1024});
    if(batch.error||batch.status!==0)throw batch.error??new Error('cannot read source object batch');
    let offset=0;
    for(const {mode,oid,file} of files){
      const end=batch.stdout.indexOf(10,offset),header=batch.stdout.subarray(offset,end).toString().split(' ');
      if(header[0]!==oid||header[1]!=='blob')throw new Error(`invalid source blob: ${file}`);
      const length=Number(header[2]),blob=batch.stdout.subarray(end+1,end+1+length);offset=end+2+length;
      const path=relative(p.directory,resolve(sourceRepository,file));
      if(!path||path.startsWith('..'))throw new Error(`source path escapes package: ${p.repository}:${p.path} -> ${file}`);
      const destination=resolve(target,path);mkdirSync(dirname(destination),{recursive:true});
      writeFileSync(destination,blob);chmodSync(destination,mode==='100755'?0o755:0o644);
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
    if (name === '@red-cup-engineering/feltos-enterprise-host') {
      manifest.dependencies ??= {};
      for (const provider of entries.filter(n => n !== name)) manifest.dependencies[provider] = 'workspace:*';
    }
    writeFileSync(resolve(target, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
    sources.push({ name, version: manifest.version, repository: p.repository, commit: p.commit, path: p.path,
      sourceManifestSha256: createHash('sha256').update(JSON.stringify(p.manifest)).digest('hex') });
  }
  // Source providers also bind transitive registry consumers to that same source.
  // The lockfile records the resulting singleton dependency graph.
  writeFileSync(resolve(root, 'package.json'), JSON.stringify({ private: true, packageManager: 'pnpm@11.9.0', devDependencies: {typescript:'5.9.3','@types/node':'24.9.1'}, scripts: {} }, null, 2) + '\n');
  writeFileSync(resolve(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\nlinkWorkspacePackages: true\npreferWorkspacePackages: true\nautoInstallPeers: false\nignoreScripts: true\noverrides:\n" + [...selected.keys()].map(name => `  ${JSON.stringify(name)}: 'workspace:*'\n`).join(''));
  writeFileSync(resolve(root, 'sources.json'), JSON.stringify({ repositories: repositories.map(({ directory, ...r }) => r), packages: sources }, null, 2) + '\n');
  return { root, selected: sources.map(p => p.name) };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(JSON.stringify(prepare(spec)) + '\n');
}
