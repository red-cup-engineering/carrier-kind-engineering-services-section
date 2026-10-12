import { createRequire } from "node:module";
import { readFileSync as readSync } from "node:fs";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
const target = "/tmp/muse-marsh-assessment-20260927-01/consumer/node_modules";
const sourceRequire = createRequire("/home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-blockchain-system-services-section/services/ethereum-engineering-services-section/src/public-evm-read.mjs");
const copied = new Map();
function packageRoot(resolved, expected) {
  let dir = path.dirname(resolved);
  for (;;) {
    try {
      const manifest = JSON.parse(requireManifest(dir));
      if (manifest.name === expected) return dir;
    } catch {}
    const up = path.dirname(dir);
    if (up === dir) throw new Error(`could not locate package root for ${expected}`);
    dir = up;
  }
}
function requireManifest(dir) { return readSync(path.join(dir, "package.json"), "utf8"); }
async function copyPackage(name, req) {
  const resolved = req.resolve(name);
  const source = packageRoot(resolved, name);
  const manifest = JSON.parse(await readFile(path.join(source, "package.json"), "utf8"));
  const key = `${name}@${manifest.version}`;
  if (copied.has(key)) return;
  if ([...copied.keys()].some((item) => item.startsWith(`${name}@`) && item !== key)) throw new Error(`multiple versions require layout: ${name}`);
  copied.set(key, source);
  const dest = path.join(target, name);
  await rm(dest, { recursive: true, force: true });
  await mkdir(path.dirname(dest), { recursive: true });
  await cp(source, dest, { recursive: true, dereference: true, filter: (p) => !p.includes("/node_modules/.bin") });
  const childRequire = createRequire(path.join(source, "package.json"));
  for (const dependency of Object.keys(manifest.dependencies ?? {})) await copyPackage(dependency, childRequire);
}
await copyPackage("viem", sourceRequire);
process.stdout.write(`${copied.size} runtime packages copied into isolated custody\n`);
