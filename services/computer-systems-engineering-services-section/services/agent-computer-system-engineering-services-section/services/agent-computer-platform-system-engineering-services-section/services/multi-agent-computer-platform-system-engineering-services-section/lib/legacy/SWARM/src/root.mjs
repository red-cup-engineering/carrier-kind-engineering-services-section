import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

function nearestGitRoot(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function resolveSwarmRoot(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  if (options.root) return resolve(cwd, options.root);
  if (env.SWARM_ROOT) return resolve(cwd, env.SWARM_ROOT);
  const gitRoot = nearestGitRoot(cwd);
  if (gitRoot) return join(gitRoot, ".swarm");
  return join(resolve(cwd), ".swarm");
}
