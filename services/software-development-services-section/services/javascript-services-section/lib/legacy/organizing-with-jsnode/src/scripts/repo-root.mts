import { existsSync } from "node:fs";
import path from "node:path";

export function findRepoRoot(start: string): string {
  let dir = path.resolve(start);
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new TypeError(`no pnpm-workspace.yaml above ${start}`);
    dir = parent;
  }
}
