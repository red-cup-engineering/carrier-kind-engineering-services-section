import { execFileSync } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Bench } from "tinybench";
import { buildWorkloads, fixtureFor, selectedProfile } from "./workloads.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(here);
const record = process.argv.includes("--record");
const sampled = process.argv.includes("--sampled");
const profile = selectedProfile();
const fixture = fixtureFor(profile);
const now = new Date();
const runId = `bench:${now.toISOString()}`;
const workloads = buildWorkloads(profile);

const rows = sampled ? await measureSampled(workloads) : workloads.map((item) => measureOnce(item.name, item.run));
printRows(rows);
if (record) await recordRows(rows);

function measureOnce(name, run) {
  const startedAt = performance.now();
  run();
  const durationMs = performance.now() - startedAt;
  return Object.freeze({
    name,
    hz: durationMs === 0 ? null : 1000 / durationMs,
    meanMs: durationMs,
    sdMs: null,
    samples: 1,
  });
}

async function measureSampled(items) {
  const bench = new Bench({
    time: Number.parseInt(process.env.MEME_TOPOLOGY_BENCH_TIME_MS ?? String(fixture.timeMs), 10),
    warmupTime: Number.parseInt(process.env.MEME_TOPOLOGY_BENCH_WARMUP_MS ?? String(fixture.warmupMs), 10),
  });
  for (const item of items) bench.add(item.name, item.run);
  await bench.run();
  return bench.tasks.map((item) => Object.freeze({
    name: item.name,
    hz: item.result?.hz ?? null,
    meanMs: item.result?.latency.mean ?? null,
    sdMs: item.result?.latency.sd ?? null,
    samples: item.result?.latency.samples.length ?? 0,
  }));
}

function printRows(rowsToPrint) {
  console.table(rowsToPrint.map((row) => ({
    benchmark: row.name,
    "mean ms": row.meanMs === null ? null : Number(row.meanMs.toFixed(6)),
    "ops/sec": row.hz === null ? null : Number(row.hz.toFixed(2)),
    samples: row.samples,
  })));
}

async function recordRows(rowsToRecord) {
  const path = join(packageRoot, ".tmp", "bench-records", `${now.toISOString().replace(/[:.]/g, "-")}.jsonl`);
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
    datom(entity, "benchmark/profile", profile, common),
    datom(entity, "benchmark/sampled", sampled, common),
    datom(entity, "benchmark/name", row.name, common),
    datom(entity, "benchmark/mean-ms", row.meanMs, common),
    datom(entity, "benchmark/hz", row.hz, common),
    datom(entity, "benchmark/samples", row.samples, common),
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
