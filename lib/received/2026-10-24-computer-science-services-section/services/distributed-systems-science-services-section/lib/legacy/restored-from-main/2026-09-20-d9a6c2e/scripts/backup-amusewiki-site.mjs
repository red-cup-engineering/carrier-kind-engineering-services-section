#!/usr/bin/env node
// Capture a public amusewiki site via its documented bulk-mirror list
// (`${site}/mirror.txt`), streamed and bounded rather than fully pulled
// when only a sample or a --limit is asked for. Node builtins only.
// Mechanism verification and rationale: see this section's dated note,
// 2026-09-08-note-on-capturing-a-threatened-corpus-into-distributed-datastores.md

import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { mkdir as mkdirp, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const HELP = `Capture a public amusewiki site into a target directory.

Usage:
  backup-amusewiki-site.mjs --site <url> --dir <path> --dry-run
  backup-amusewiki-site.mjs --site <url> --dir <path> --limit 10 --extensions muse
  backup-amusewiki-site.mjs --site <url> --dir <path>   (full capture, no bound)

Flags:
  --site <url>              required; amusewiki site base URL, no trailing slash
  --dir <path>               required; local target directory (created if absent)
  --dry-run                    print the plan and measured size; fetch no content
  --limit <n>                   stop after collecting n matching URLs (default: unbounded)
  --extensions <a,b,...>          select only these file extensions (default: all)
  --sample-lines <n>              mirror.txt lines to scan when bounding (default 2000)
  --no-git-snapshot                skip the git commit of the capture dir after a real run
  --user <u> --password <p>          HTTP Basic credentials for a private site
`;

function parseArgs(argv) {
  const args = { extensions: null, sampleLines: 2000, gitSnapshot: true, limit: Infinity };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") { args.help = true; }
    else if (arg === "--site") args.site = argv[++i];
    else if (arg === "--dir") args.dir = argv[++i];
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--limit") args.limit = Number(argv[++i]);
    else if (arg === "--extensions") args.extensions = argv[++i].split(",").map((s) => s.trim().replace(/^\./, "")).filter(Boolean);
    else if (arg === "--sample-lines") args.sampleLines = Number(argv[++i]);
    else if (arg === "--no-git-snapshot") args.gitSnapshot = false;
    else if (arg === "--user") args.user = argv[++i];
    else if (arg === "--password") args.password = argv[++i];
    else throw new Error(`unrecognized argument: ${arg}`);
  }
  if (args.help) return args;
  if (!args.site) throw new Error("--site is required");
  if (!args.dir) throw new Error("--dir is required");
  args.site = args.site.replace(/\/$/, "");
  return args;
}

// HTTP Basic auth header for a private amusewiki site's /mirror/ path.
function authHeaders({ user, password }) {
  if (!user) return {};
  return { Authorization: `Basic ${Buffer.from(`${user}:${password ?? ""}`).toString("base64")}` };
}

async function headContentLength(url, auth) {
  const response = await fetch(url, { method: "HEAD", headers: authHeaders(auth) });
  if (!response.ok) throw new Error(`HEAD ${url} -> ${response.status}`);
  const length = response.headers.get("content-length");
  return length === null ? null : Number(length);
}

// A module-scoped callback slot for the current bounded-stream call. Each
// call to streamMirrorList is awaited to completion before the next
// begins, so only one stream is ever live and this stays safe without a
// class or a per-call closure threaded through the read loop below.
let currentOnLine;

async function streamLinesBounded(url, { maxLines = Infinity, auth = {} } = {}) {
  const controller = new AbortController();
  const response = await fetch(url, { headers: authHeaders(auth), signal: controller.signal });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  let bytesRead = 0;
  let linesRead = 0;
  let carry = "";
  let truncated = false;
  try {
    for await (const chunk of response.body) {
      bytesRead += chunk.length;
      carry += Buffer.from(chunk).toString("utf8");
      let newlineIndex = carry.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = carry.slice(0, newlineIndex).trim();
        carry = carry.slice(newlineIndex + 1);
        newlineIndex = carry.indexOf("\n");
        if (line.length === 0) continue;
        linesRead += 1;
        const keepGoing = currentOnLine(line);
        if (keepGoing === false || linesRead >= maxLines) {
          truncated = true;
          controller.abort();
          return { bytesRead, linesRead, truncated };
        }
      }
    }
  } catch (error) {
    if (!truncated) throw error;
  }
  return { bytesRead, linesRead, truncated };
}

async function streamMirrorList(url, { maxLines, auth, onLine }) {
  currentOnLine = onLine;
  try {
    return await streamLinesBounded(url, { maxLines, auth });
  } finally {
    currentOnLine = undefined;
  }
}

function extensionOf(urlString) {
  const match = /\.([a-z0-9]+)$/i.exec(new URL(urlString).pathname);
  return match ? match[1].toLowerCase() : "";
}

function localPathFor(dir, site, urlString) {
  const url = new URL(urlString);
  const siteUrl = new URL(site);
  // Preserve the path exactly as the site serves it (already namespaced
  // under /mirror/... by amusewiki's own static export), rooted under dir.
  const relative = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  if (url.host !== siteUrl.host) throw new Error(`refusing cross-host URL in mirror list: ${urlString}`);
  return join(dir, relative);
}

async function fetchToFile(urlString, targetPath, auth) {
  await mkdirp(dirname(targetPath), { recursive: true });
  const response = await fetch(urlString, { headers: authHeaders(auth) });
  if (!response.ok) throw new Error(`GET ${urlString} -> ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(targetPath));
  const info = await stat(targetPath);
  return info.size;
}

function formatBytes(n) {
  if (n === null || n === undefined) return "unknown";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KiB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MiB`;
  return `${(n / 1024 ** 3).toFixed(2)} GiB`;
}

async function planAndMeasure(args) {
  const mirrorListUrl = `${args.site}/mirror.txt`;
  const opdsUrl = `${args.site}/opds`;
  const mirrorListSize = await headContentLength(mirrorListUrl, args);
  let opdsSize = null;
  try { opdsSize = await headContentLength(opdsUrl, args); } catch { /* OPDS optional; absence is not fatal to the plan */ }

  const sample = { extensionCounts: {}, sampleUrlsByExtension: {}, linesSeen: 0, bytesRead: 0, truncated: false };
  const result = await streamMirrorList(mirrorListUrl, {
    maxLines: args.sampleLines,
    auth: args,
    onLine: (line) => {
      sample.linesSeen += 1;
      const ext = extensionOf(line);
      sample.extensionCounts[ext] = (sample.extensionCounts[ext] ?? 0) + 1;
      if (!sample.sampleUrlsByExtension[ext]) sample.sampleUrlsByExtension[ext] = [];
      if (sample.sampleUrlsByExtension[ext].length < 3) sample.sampleUrlsByExtension[ext].push(line);
      return true;
    },
  });
  sample.bytesRead = result.bytesRead;
  sample.truncated = result.truncated;

  return { mirrorListUrl, mirrorListSize, opdsUrl, opdsSize, sample };
}

async function runDryRun(args) {
  const plan = await planAndMeasure(args);
  const lines = [];
  lines.push(`amusewiki capture plan for ${args.site}`);
  lines.push(`  mechanism: verified public bulk mirror list at ${plan.mirrorListUrl}`);
  lines.push(`  measured size of mirror.txt (HTTP HEAD, authoritative): ${formatBytes(plan.mirrorListSize)} (${plan.mirrorListSize ?? "unknown"} bytes)`);
  if (plan.opdsSize !== null) lines.push(`  OPDS root ${plan.opdsUrl}: ${formatBytes(plan.opdsSize)} (informational; not a bulk-export path)`);
  lines.push(`  target directory: ${args.dir}`);
  lines.push(`  extension filter: ${args.extensions ? args.extensions.join(",") : "(none — all extensions)"}`);
  lines.push(`  bound this run would apply: ${Number.isFinite(args.limit) ? `first ${args.limit} matching URLs` : "none (full capture)"}`);
  lines.push(`  git snapshot after capture: ${args.gitSnapshot ? "yes (git init + commit in target dir)" : "no"}`);
  lines.push("");
  lines.push(`  bounded sample of the first ${plan.sample.linesSeen} mirror.txt lines (${formatBytes(plan.sample.bytesRead)} read, then connection aborted${plan.sample.truncated ? "" : " — list ended before the bound"}):`);
  for (const [ext, count] of Object.entries(plan.sample.extensionCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`    .${ext || "(none)"}: ${count} in sample; example: ${plan.sample.sampleUrlsByExtension[ext][0]}`);
  }
  lines.push("");
  lines.push("  NOTE: the extension counts above describe only the sampled prefix of mirror.txt, not the whole list; they are not extrapolated into a full-corpus total, since doing so would require a claim this script has not measured. Run without --limit and without --dry-run for an exhaustive capture, or raise --sample-lines for a larger (still bounded) sample.");
  process.stdout.write(`${lines.join("\n")}\n`);
}

async function runCapture(args) {
  if (!existsSync(args.dir)) mkdirSync(args.dir, { recursive: true });
  const mirrorListUrl = `${args.site}/mirror.txt`;
  const listedSize = await headContentLength(mirrorListUrl, args);
  process.stdout.write(`measured mirror.txt size: ${formatBytes(listedSize)} (${listedSize ?? "unknown"} bytes)\n`);

  const collected = [];
  const streamResult = await streamMirrorList(mirrorListUrl, {
    maxLines: args.sampleLines,
    auth: args,
    onLine: (line) => {
      const ext = extensionOf(line);
      if (args.extensions && !args.extensions.includes(ext)) return true;
      collected.push(line);
      if (collected.length >= args.limit) return false;
      return true;
    },
  });
  process.stdout.write(`scanned ${streamResult.linesRead} mirror.txt lines (${formatBytes(streamResult.bytesRead)} of list transferred${streamResult.truncated ? ", connection aborted early once the bound was met" : ""}); selected ${collected.length} URL(s) to fetch\n`);

  let totalBytes = 0;
  for (const [index, url] of collected.entries()) {
    const targetPath = localPathFor(args.dir, args.site, url);
    const size = await fetchToFile(url, targetPath, args);
    totalBytes += size;
    process.stdout.write(`  [${index + 1}/${collected.length}] ${formatBytes(size)}  ${url}\n`);
  }
  process.stdout.write(`capture complete: ${collected.length} file(s), ${formatBytes(totalBytes)} written under ${args.dir}\n`);

  if (args.gitSnapshot && collected.length > 0) {
    const gitDir = join(args.dir, ".git");
    if (!existsSync(gitDir)) execFileSync("git", ["init", "-q"], { cwd: args.dir });
    execFileSync("git", ["add", "-A"], { cwd: args.dir });
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: args.dir }).toString();
    if (status.trim().length > 0) {
      const message = `amusewiki mirror snapshot: ${collected.length} file(s), ${totalBytes} bytes, ${new Date().toISOString()}`;
      execFileSync("git", ["commit", "-q", "-m", message], { cwd: args.dir });
      process.stdout.write(`git snapshot committed in ${args.dir}\n`);
    } else {
      process.stdout.write("git snapshot: no changes since last commit\n");
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return; }
  if (args.dryRun) await runDryRun(args);
  else await runCapture(args);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { parseArgs, planAndMeasure, runDryRun, runCapture, extensionOf, localPathFor, formatBytes };
