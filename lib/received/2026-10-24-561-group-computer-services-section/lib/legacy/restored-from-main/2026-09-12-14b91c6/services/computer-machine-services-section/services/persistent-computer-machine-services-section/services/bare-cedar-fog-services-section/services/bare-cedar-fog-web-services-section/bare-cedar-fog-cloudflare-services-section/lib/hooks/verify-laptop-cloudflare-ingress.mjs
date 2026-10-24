#!/usr/bin/env node
// Wraps @red-cup-engineering/cloudflare-tunnel-config-checker-service, which
// does the actual verification, with this laptop's tunnel fixed to
// bare-cedar-fog-561-group / bare-cedar-fog.561.group / localhost:19748.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SHARED_CLI = fileURLToPath(import.meta.resolve(
  "@red-cup-engineering/cloudflare-tunnel-config-checker-service/verify-ingress",
));

const result = spawnSync(
  process.execPath,
  [
    SHARED_CLI,
    "--expect-tunnel-name=bare-cedar-fog-561-group",
    "--expect-hostname=bare-cedar-fog.561.group",
    "--expect-service=http://localhost:19748",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
