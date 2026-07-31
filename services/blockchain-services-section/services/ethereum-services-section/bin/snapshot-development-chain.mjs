#!/usr/bin/env node
// snapshot-development-chain.mjs — copy the live anvil state file to an
// off-repo snapshot pool, skipping unchanged state and pruning old copies.
// The pool lives outside the repository so repository damage or deletion
// cannot take the chain's recovery copies with it.

import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function option(name, fallback) { const at = process.argv.indexOf(name); return at === -1 ? fallback : process.argv[at + 1]; }

const chainId = option("--chain-id", "31337");
const state = resolve(option("--state", resolve(ROOT, "data", "development-chain", `eip155-${chainId}.json`)));
const pool = resolve(option("--pool", join(homedir(), ".local", "state", "union", "devchain-snapshots", `eip155-${chainId}`)));
const keep = Number(option("--keep", "96"));
if (!Number.isInteger(keep) || keep < 1) throw new Error("--keep must be a positive integer");

mkdirSync(pool, { recursive: true });

const bytes = readFileSync(state);

// anvil writes this file in place on its own --state-interval clock, with no
// atomicity guarantee against a concurrent reader; a read that lands mid-write
// can observe a torn, truncated JSON document (2026-07-23: this is exactly how
// the live devchain state was displaced and the chain silently reset). Refuse
// to carry a torn read forward into the recovery pool -- a future timer tick
// will see the settled write. This does not fix anvil's own writer; it keeps
// this settlement's own recovery copies from ever being corrupt.
try {
  JSON.parse(bytes.toString("utf8"));
} catch (error) {
  process.stdout.write(`refusing snapshot: source state file failed to parse as JSON (likely read mid-write): ${error.message}\n`);
  process.exit(0);
}

const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);

const existing = readdirSync(pool).filter((name) => name.endsWith(".json")).sort();
const newest = existing.at(-1);
if (newest?.includes(digest)) {
  process.stdout.write(`unchanged since ${newest}; no snapshot taken\n`);
  process.exit(0);
}

const stamp = new Date(statSync(state).mtimeMs).toISOString().replace(/[:.]/g, "-");
const target = join(pool, `${stamp}.${digest}.json`);
// Write-to-temp-then-rename: a same-directory rename() is atomic on POSIX, so
// a snapshot is either fully present under its final name or not present at
// all -- never partially written -- even if this process is killed mid-copy.
const tmpTarget = join(pool, `.tmp-${digest}-${randomBytes(6).toString("hex")}`);
writeFileSync(tmpTarget, bytes);
renameSync(tmpTarget, target);

const all = readdirSync(pool).filter((name) => name.endsWith(".json")).sort();
for (const name of all.slice(0, Math.max(0, all.length - keep))) rmSync(join(pool, name));

process.stdout.write(`snapshot ${target} (${bytes.length} bytes, ${all.length > keep ? keep : all.length} kept)\n`);

// Off-box replication over plain HTTPS (GitHub contents API via gh). This
// path deliberately involves neither the git binary (banned toward the
// corpus) nor the Union's own chain-settled git ingress: a recovery copy
// must not depend on the health of the thing it recovers.
const remote = option("--remote", "repos/emsenn/union-devchain-snapshots/contents");
if (remote !== "none") {
  const name = target.split("/").at(-1);
  const body = JSON.stringify({ message: `snapshot ${name}`, content: bytes.toString("base64") });
  const push = spawnSync("gh", ["api", "-X", "PUT", `${remote}/eip155-${chainId}/${name}`, "--input", "-"], { input: body, encoding: "utf8", timeout: 120_000 });
  if (push.status === 0) process.stdout.write(`replicated off-box: ${remote}/eip155-${chainId}/${name}\n`);
  else process.stdout.write(`WARNING off-box replication failed (local snapshot kept): ${String(push.stderr).slice(0, 300)}\n`);
}
