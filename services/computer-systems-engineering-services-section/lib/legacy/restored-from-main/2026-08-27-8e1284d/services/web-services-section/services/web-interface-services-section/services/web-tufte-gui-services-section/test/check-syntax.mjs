import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const roots = ["src", "scripts", "test", "examples"];

async function modulesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? modulesBelow(path) : path.endsWith(".mjs") ? [path] : [];
  }));
  return paths.flat();
}

const modules = (await Promise.all(roots.map(modulesBelow))).flat().sort();
for (const module of modules) {
  const result = spawnSync(process.execPath, ["--check", module], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (!process.exitCode) process.stdout.write(`Syntax checked ${modules.length} modules.\n`);
