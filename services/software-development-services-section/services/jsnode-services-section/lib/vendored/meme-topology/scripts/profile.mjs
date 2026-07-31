import { execFileSync } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkloads, selectedProfile } from "./workloads.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(here);
const record = process.argv.includes("--record");
const profile = selectedProfile();
const iterations = Number.parseInt(process.env.MEME_TOPOLOGY_PROFILE_RUNS ?? "1", 10);
const now = new Date();
const runId = `profile:${now.toISOString()}`;
const workloads = buildWorkloads(profile);

const rows = workloads.map((item) => measureProfile(item.name, item.run));
printRows(rows);
if (record) await recordRows(rows);

function measureProfile(name, run) {
  const eventLoopStart = performance.eventLoopUtilization();
  const cpuStart = process.cpuUsage();
  const resourceStart = process.resourceUsage();
  const memoryStart = process.memoryUsage();
  const startedAt = performance.now();

  for (let index = 0; index < iterations; index += 1) run();

  const wallMs = performance.now() - startedAt;
  const memoryEnd = process.memoryUsage();
  const resourceEnd = process.resourceUsage();
  const cpuDelta = process.cpuUsage(cpuStart);
  const eventLoopDelta = performance.eventLoopUtilization(eventLoopStart);

  return Object.freeze({
    name,
    iterations,
    wallMs,
    userCpuMs: cpuDelta.user / 1000,
    systemCpuMs: cpuDelta.system / 1000,
    totalCpuMs: (cpuDelta.user + cpuDelta.system) / 1000,
    eventLoopUtilization: eventLoopDelta.utilization,
    rssDeltaBytes: memoryEnd.rss - memoryStart.rss,
    heapUsedDeltaBytes: memoryEnd.heapUsed - memoryStart.heapUsed,
    heapTotalDeltaBytes: memoryEnd.heapTotal - memoryStart.heapTotal,
    externalDeltaBytes: memoryEnd.external - memoryStart.external,
    arrayBuffersDeltaBytes: memoryEnd.arrayBuffers - memoryStart.arrayBuffers,
    maxRSSKilobytes: resourceEnd.maxRSS,
    minorPageFaults: resourceEnd.minorPageFault - resourceStart.minorPageFault,
    majorPageFaults: resourceEnd.majorPageFault - resourceStart.majorPageFault,
    voluntaryContextSwitches: resourceEnd.voluntaryContextSwitches - resourceStart.voluntaryContextSwitches,
    involuntaryContextSwitches: resourceEnd.involuntaryContextSwitches - resourceStart.involuntaryContextSwitches,
  });
}

function printRows(rowsToPrint) {
  console.table(rowsToPrint.map((row) => ({
    workload: row.name,
    iterations: row.iterations,
    "wall ms": Number(row.wallMs.toFixed(3)),
    "cpu ms": Number(row.totalCpuMs.toFixed(3)),
    "heap delta MB": Number((row.heapUsedDeltaBytes / 1024 / 1024).toFixed(3)),
    "rss delta MB": Number((row.rssDeltaBytes / 1024 / 1024).toFixed(3)),
    "max rss MB": Number((row.maxRSSKilobytes / 1024).toFixed(3)),
    "elu": Number(row.eventLoopUtilization.toFixed(4)),
  })));
}

async function recordRows(rowsToRecord) {
  const path = join(packageRoot, ".tmp", "profile-records", `${now.toISOString().replace(/[:.]/g, "-")}.jsonl`);
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, rowsToRecord.flatMap((row) => datomsFor(row)).map((datom) => `${JSON.stringify(datom)}\n`).join(""));
  console.log(`recorded ${path}`);
}

function datomsFor(row) {
  const entity = `${runId}:${row.name}`;
  const common = {
    t: now.toISOString(),
    op: "assert",
  };
  return [
    datom(entity, "package", "@emsenn/meme-topology", common),
    datom(entity, "profile/name", row.name, common),
    datom(entity, "profile/profile", profile, common),
    datom(entity, "profile/iterations", row.iterations, common),
    datom(entity, "profile/wall-ms", row.wallMs, common),
    datom(entity, "profile/user-cpu-ms", row.userCpuMs, common),
    datom(entity, "profile/system-cpu-ms", row.systemCpuMs, common),
    datom(entity, "profile/total-cpu-ms", row.totalCpuMs, common),
    datom(entity, "profile/event-loop-utilization", row.eventLoopUtilization, common),
    datom(entity, "profile/rss-delta-bytes", row.rssDeltaBytes, common),
    datom(entity, "profile/heap-used-delta-bytes", row.heapUsedDeltaBytes, common),
    datom(entity, "profile/heap-total-delta-bytes", row.heapTotalDeltaBytes, common),
    datom(entity, "profile/external-delta-bytes", row.externalDeltaBytes, common),
    datom(entity, "profile/array-buffers-delta-bytes", row.arrayBuffersDeltaBytes, common),
    datom(entity, "profile/max-rss-kilobytes", row.maxRSSKilobytes, common),
    datom(entity, "profile/minor-page-faults", row.minorPageFaults, common),
    datom(entity, "profile/major-page-faults", row.majorPageFaults, common),
    datom(entity, "profile/voluntary-context-switches", row.voluntaryContextSwitches, common),
    datom(entity, "profile/involuntary-context-switches", row.involuntaryContextSwitches, common),
    datom(entity, "runtime/node", process.version, common),
    datom(entity, "runtime/platform", `${process.platform}-${process.arch}`, common),
    datom(entity, "git/commit", gitCommit(), common),
  ];
}

function datom(e, a, v, rest) {
  return { e, a, v, ...rest };
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { cwd: packageRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}
