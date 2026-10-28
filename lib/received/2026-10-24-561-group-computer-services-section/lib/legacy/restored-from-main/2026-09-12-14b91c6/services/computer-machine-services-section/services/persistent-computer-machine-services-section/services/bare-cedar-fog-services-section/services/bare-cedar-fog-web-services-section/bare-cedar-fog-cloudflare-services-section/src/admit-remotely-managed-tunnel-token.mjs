#!/usr/bin/env node
// Wraps @red-cup-engineering/cloudflare-tunnel-auth-service, which does the
// actual token validation and admission, with this laptop's tunnel name
// fixed to bare-cedar-fog-561-group.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateTunnelToken,
  admitTunnelToken,
  tokenPathForTestRoot as sharedTokenPathForTestRoot,
} from "@red-cup-engineering/cloudflare-tunnel-auth-service";

const TUNNEL_NAME = "bare-cedar-fog-561-group";
const SHARED_CLI = fileURLToPath(
  import.meta.resolve("@red-cup-engineering/cloudflare-tunnel-auth-service"),
);

export { validateTunnelToken, admitTunnelToken };
export function tokenPathForTestRoot(testRoot) {
  return sharedTokenPathForTestRoot(testRoot, TUNNEL_NAME);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = spawnSync(process.execPath, [SHARED_CLI, `--tunnel-name=${TUNNEL_NAME}`, ...process.argv.slice(2)], { stdio: "inherit" });
  process.exit(result.status ?? 1);
}
