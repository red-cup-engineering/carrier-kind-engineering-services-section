#!/usr/bin/env node
/**
 * The receiving check for the Leader's FeltOS memory budget (bare-cedar-fog requirement
 * feltos-runs-in-32-mb-with-a-64-mb-startup-peak): start this node composition, as deployed, over a
 * synthetic multi-day store and report its own JavaScript memory (heapUsed + external +
 * arrayBuffers), RSS beside it.
 *
 *   startup peak  the most JavaScript memory before the node listens        (budget 64 MB)
 *   steady        JavaScript memory after a full collection, `settle` s after listening (budget 32 MB)
 *
 * The store is real: every record is put and every log line appended by the store's own operations,
 * and each closed day is its own log file. The node runs with
 * its clock, without a work peer, ActivityPub, companions or remote upstreams, so it sends nothing
 * outward. Usage:
 *
 *   check-memory-budget.mjs --release <root> [--host <release-relative host.json>] [--days 6]
 *     [--per-day 500] [--settle 60] [--node <binary>] [--json]
 *
 * Exit 0 when both bounds hold, 1 when either is exceeded, 2 when the check cannot run.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { append, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";

export const BUDGET = Object.freeze({ steadyMB: 32, startupMB: 64 });
const MB = 2 ** 20;
const here = path.dirname(fileURLToPath(import.meta.url));
const SERVE = path.join(here, "feltos-enterprise-serve.mjs");
const SAMPLER = path.join(here, "memory-budget-sampler.mjs");
export const DEFAULT_HOST = "lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/bare-cedar-fog-services-section/data/records/machine-deployment-service-records/metroplat/deployment/host.json";

/** The three types a node's store grows by most: token usage (records), RPC evidence (records and a log line each), service lifecycle (log lines). */
function writeDay(root, date, perDay) {
  let written = 0;
  for (let n = 0; n < perDay; n += 1) {
    const at = `${date}T${String(n % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}:00.000Z`;
    const session = `session-${date}-${n % 20}`;
    put(root, "token-usage-event", { e: `usage:${session}:${n}`, a: { kind: "metroplat.agent-session.token-usage-event" }, t: at, v: { kind: "metroplat.agent-session.token-usage-event", sessionId: session, row: n, usageKind: "turn", at, usage: { inputTokens: 100 + n, outputTokens: 7 } } });
    const of = put(root, "rpc-evidence", { at, evidence: { kind: "metroplat.rpc.attempt", at, invocation: { id: `invocation:${date}:${n}`, verb: "run-due", subject: "check", resource: "infograph" } } });
    append(root, "rpc-evidence", { at, invocation: `invocation:${date}:${n}`, kind: "metroplat.rpc.attempt", of });
    append(root, "service-lifecycle", { at, service: "check", boundary: "stream", event: "stream-open", ok: true });
    written += 3;
  }
  return written;
}

/** Write a `days`-day store under `root/data`: records, state and logs as the store keeps them. */
export function synthesizeStore(root, { days, perDay, end = new Date() }) {
  let witnesses = 0;
  for (let back = days - 1; back >= 0; back -= 1) {
    const date = new Date(end.getTime() - back * 86_400_000).toISOString().slice(0, 10);
    witnesses += writeDay(root, date, perDay);
  }
  return Object.freeze({ root, witnesses });
}

/** A data root shaped like the deployed one: the template's entries, with the synthetic store's types added beside its own. */
function dataRootFrom(template, synthesized, into) {
  fs.mkdirSync(path.join(into, "data"), { recursive: true });
  for (const entry of fs.existsSync(template) ? fs.readdirSync(template) : []) {
    if (entry !== "data") fs.symlinkSync(path.join(template, entry), path.join(into, entry));
  }
  const data = path.join(template, "data");
  for (const entry of fs.existsSync(data) ? fs.readdirSync(data) : []) {
    const target = path.join(into, "data", entry);
    if (entry === "state") fs.cpSync(path.join(data, entry), target, { recursive: true });
    else if (synthesized !== undefined && (entry === "records" || entry === "logs")) {
      // The template's own types stay linked; the synthetic ones are written beside them.
      fs.mkdirSync(target, { recursive: true });
      for (const type of fs.readdirSync(path.join(data, entry))) fs.symlinkSync(path.join(data, entry, type), path.join(target, type));
    } else fs.symlinkSync(path.join(data, entry), target);
  }
  if (synthesized !== undefined) {
    for (const tier of ["records", "logs"]) {
      fs.mkdirSync(path.join(into, "data", tier), { recursive: true });
      for (const type of fs.readdirSync(path.join(synthesized.root, "data", tier))) fs.renameSync(path.join(synthesized.root, "data", tier, type), path.join(into, "data", tier, type));
    }
  }
  return into;
}

/** The host declaration as deployed, without a work peer, beside the scratch state. */
function hostWithoutPeer(releaseHost, scratch) {
  const host = JSON.parse(fs.readFileSync(releaseHost, "utf8"));
  delete host.web.workPeerActor;
  host.web.deliverWorkToPeer = false;
  host.web.companions = [];
  const instance = path.resolve(path.dirname(releaseHost), host.instance);
  const file = path.join(scratch, "host.json");
  host.instance = path.relative(scratch, instance);
  fs.writeFileSync(file, `${JSON.stringify(host, null, 2)}\n`);
  // The node serves the instance's own origin; nothing is sent there.
  const origin = JSON.parse(fs.readFileSync(instance, "utf8")).identity?.origin;
  return Object.freeze({ file, origin: origin === undefined ? "https://memory-budget.invalid" : new URL(origin).origin });
}

/** Run the node over `dataRoot` and read its memory. */
export async function measureNode({ release, host, origin, dataRoot, scratch, settle = 60, node = process.execPath, port }) {
  const samples = path.join(scratch, "samples.jsonl");
  fs.writeFileSync(samples, "");
  const state = path.join(scratch, "state");
  const environment = {
    PATH: process.env.PATH, HOME: scratch, NODE_PATH: path.join(release, "node_modules"),
    FELTOS_MEMORY_SAMPLES: samples, FELTOS_ENTERPRISE_HOST: host,
    HOST: "127.0.0.1", PORT: String(port ?? 20_000 + Math.floor(Math.random() * 20_000)),
    PUBLIC_BASE_URL: origin, SESSION_SECRET: createHash("sha256").update(scratch).digest("hex"),
    GOOGLE_CLIENT_ID: "memory-budget", GOOGLE_CLIENT_SECRET: "memory-budget",
    METROPLAT_WEB_STATE_DIR: state, METROPLAT_DATA_ROOT: dataRoot, METROPLAT_REPOSITORY_ROOT: release,
    METROPLAT_AGENCY_ROOT: path.join(release, "lib"),
    FELTOS_CLOCK_SUBJECT: "memory-budget.invalid", FELTOS_CLOCK_INTERVAL_MS: "15000",
    ...(process.env.METROPLAT_DEPLOYMENTS_ROOT === undefined ? {} : { METROPLAT_DEPLOYMENTS_ROOT: process.env.METROPLAT_DEPLOYMENTS_ROOT }),
  };
  const child = spawn(node, ["--expose-gc", "--import", SAMPLER, SERVE], { cwd: scratch, env: environment, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-20_000); });
  const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));
  const read = () => fs.readFileSync(samples, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const deadline = Date.now() + 300_000;
  let listen;
  while (listen === undefined) {
    if (Date.now() > deadline || child.exitCode !== null) {
      child.kill("SIGKILL");
      throw new Error(`the node did not listen: ${stderr.slice(-2000)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    listen = read().find((entry) => entry.label === "listen");
  }
  await new Promise((resolve) => setTimeout(resolve, settle * 1000));
  child.kill("SIGUSR2");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  child.kill("SIGINT");
  const timer = setTimeout(() => child.kill("SIGKILL"), 35_000);
  await exited;
  clearTimeout(timer);
  const all = read();
  const before = all.filter((entry) => entry.t <= listen.t);
  const collected = all.findLast((entry) => entry.label === "collected");
  if (collected === undefined) throw new Error("the node took no collected sample");
  const max = (entries, key) => Math.max(...entries.map((entry) => entry[key]));
  return Object.freeze({
    listenSeconds: +(listen.t / 1000).toFixed(1),
    startupPeakMB: +(max(before, "js") / MB).toFixed(1),
    steadyMB: +(collected.js / MB).toFixed(1),
    steady: Object.freeze({ heapUsedMB: +(collected.heapUsed / MB).toFixed(1), externalMB: +(collected.external / MB).toFixed(1), arrayBuffersMB: +(collected.arrayBuffers / MB).toFixed(1), rssMB: +(collected.rss / MB).toFixed(1) }),
    runningPeakMB: +(max(all, "js") / MB).toFixed(1),
    rssPeakMB: +(max(all, "rss") / MB).toFixed(1),
  });
}

/** Measure the node over an empty store and over a `days`-day store. */
export async function checkMemoryBudget({ release, hostPath = DEFAULT_HOST, days = 6, perDay = 500, settle = 60, node, template }) {
  const releaseHost = path.resolve(release, hostPath);
  if (!fs.existsSync(releaseHost)) throw Object.assign(new Error(`no host declaration at ${releaseHost}`), { code: "ENOHOST" });
  const dataTemplate = template ?? path.join(release, "lib/emsenn/services/561-group/services/561-group-services-section");
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "feltos-memory-budget-"));
  try {
    const results = {};
    for (const [name, journalDays] of [["empty", 0], ["history", days]]) {
      const run = path.join(scratch, name);
      fs.mkdirSync(run, { recursive: true });
      const synthesized = journalDays === 0 ? undefined : synthesizeStore(path.join(run, "synthetic"), { days: journalDays, perDay });
      const dataRoot = dataRootFrom(dataTemplate, synthesized, path.join(run, "root"));
      const host = hostWithoutPeer(releaseHost, run);
      const measured = await measureNode({ release, host: host.file, origin: host.origin, dataRoot, scratch: run, settle, node });
      results[name] = Object.freeze({ days: journalDays, witnesses: synthesized?.witnesses ?? 0, ...measured });
    }
    const history = results.history;
    return Object.freeze({
      budget: BUDGET,
      ...results,
      historyGrowthMB: +(history.steadyMB - results.empty.steadyMB).toFixed(1),
      steadyHeld: history.steadyMB <= BUDGET.steadyMB,
      startupHeld: history.startupPeakMB <= BUDGET.startupMB,
    });
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function releaseRootFrom(start) {
  for (let directory = start; directory !== path.dirname(directory); directory = path.dirname(directory)) {
    if (fs.existsSync(path.join(directory, "pnpm-workspace.yaml"))) return directory;
  }
  return undefined;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at === -1 ? fallback : process.argv[at + 1]; };
  const release = option("release", releaseRootFrom(here));
  try {
    const report = await checkMemoryBudget({ release, hostPath: option("host", DEFAULT_HOST), days: Number(option("days", 6)), perDay: Number(option("per-day", 500)), settle: Number(option("settle", 60)), node: option("node", process.execPath), template: option("data-template") });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.steadyHeld && report.startupHeld ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 2;
  }
}
