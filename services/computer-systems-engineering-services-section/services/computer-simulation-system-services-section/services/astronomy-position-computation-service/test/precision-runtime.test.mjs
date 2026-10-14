import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { computePrecisionAstronomyPositions, DE440_SHA256, executeOxiEphemeris, oxiEphemerisArguments } from "../src/precision-provider.mjs";
import { executePinnedOxiEphemeris } from "../src/precision-runtime.mjs";

const request = { time: "2026-07-21T00:00:00.000Z", latitude: 0, longitude: 0 };
const chart = { kind: "natal", bodies: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].map((body, i) => ({ body, lon_deg: 30 * i, distance_au: 1 + i / 10 })), nodes: {} };
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

async function fixture(t, { version = "oxieph 0.1.1\n", onVersion = "", onChart = "", output = JSON.stringify(chart) } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "precision identity "));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const ephemerisFile = join(directory, "kernel with spaces.440");
  const binary = join(directory, "oxieph");
  const log = join(directory, "calls.jsonl");
  // Synthetic bytes exercise streaming and process identity, not DE440 science.
  const kernel = Buffer.alloc(160_000, 0x61);
  await writeFile(ephemerisFile, kernel);
  const script = `#!${process.execPath}
import { appendFileSync, readFileSync } from "node:fs";
const args = process.argv.slice(2);
const kernel = ${JSON.stringify(ephemerisFile)};
appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + "\\n");
if (args[0] === "--version") {
  ${onVersion}
  process.stdout.write(${JSON.stringify(version)});
} else {
  if (readFileSync(args[args.indexOf("--de") + 1]).length !== 160000) process.exit(23);
  ${onChart}
  process.stdout.write(${JSON.stringify(output)});
}
`;
  await writeFile(binary, script, { mode: 0o700 });
  return {
    directory, binary, ephemerisFile, log, kernel, script,
    specification: { binary, ephemerisFile, ephemerisSha256: sha256(kernel), supplierVersion: "0.1.1", argumentsForEphemeris: (path) => oxiEphemerisArguments(request, path) },
  };
}

test("real file and child process seam measures both inputs and preserves chart/arguments", async (t) => {
  const f = await fixture(t);
  const result = await executePinnedOxiEphemeris(f.specification);
  assert.deepEqual(result.chart, chart);
  assert.deepEqual(result.identity, { ephemerisSha256: sha256(f.kernel), supplierVersion: "0.1.1", supplierSha256: sha256(f.script) });
  assert.ok(Object.isFrozen(result.identity));
  assert.deepEqual((await readFile(f.log, "utf8")).trim().split("\n").map(JSON.parse), [["--version"], oxiEphemerisArguments(request, f.ephemerisFile)]);
});

test("wrong kernel bytes refuse before any supplier process runs, even with an environment hash override", async (t) => {
  const f = await fixture(t);
  assert.notEqual(sha256(f.kernel), DE440_SHA256);
  await assert.rejects(executeOxiEphemeris(request, { OXIEPH_BIN: f.binary, OXIEPH_DE: f.ephemerisFile, OXIEPH_DE_SHA256: sha256(f.kernel) }), /SHA-256 does not match/);
  await assert.rejects(readFile(f.log), { code: "ENOENT" });
});

test("unavailable and nonregular kernel files refuse before supplier execution", async (t) => {
  const f = await fixture(t);
  await assert.rejects(executePinnedOxiEphemeris({ ...f.specification, ephemerisFile: join(f.directory, "missing") }), { code: "ENOENT" });
  await assert.rejects(executePinnedOxiEphemeris({ ...f.specification, ephemerisFile: f.directory }), /regular file/);
  await assert.rejects(readFile(f.log), { code: "ENOENT" });
  await assert.rejects(executeOxiEphemeris(request, {}), /OXIEPH_DE must name/);
});

test("missing configured executable does not fall back to another supplier", async (t) => {
  const f = await fixture(t);
  await assert.rejects(executePinnedOxiEphemeris({ ...f.specification, binary: join(f.directory, "missing") }), /executable is unavailable/);
});

test("incorrect or ambiguous version output refuses before chart execution", async (t) => {
  for (const version of ["oxieph 0.1.0\n", "oxieph 0.1.10\n", "oxieph 0.1.1-dev\n", "other 0.1.1\n", "", "oxieph 0.1.1\nextra"]) {
    const f = await fixture(t, { version });
    await assert.rejects(executePinnedOxiEphemeris(f.specification), /supplier version does not match/);
    assert.deepEqual((await readFile(f.log, "utf8")).trim().split("\n").map(JSON.parse), [["--version"]]);
  }
});

test("version process failure and oversized output remain failures", async (t) => {
  const failed = await fixture(t, { onVersion: "process.exit(9);" });
  await assert.rejects(executePinnedOxiEphemeris(failed.specification), { code: 9 });
  const oversized = await fixture(t, { version: "x".repeat(5000) });
  await assert.rejects(executePinnedOxiEphemeris(oversized.specification), { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" });
});

test("kernel or executable changes during version receiving invalidate the result", async (t) => {
  for (const target of ["kernel", "process.argv[1]"]) {
    const f = await fixture(t, { onVersion: `appendFileSync(${target}, "changed");` });
    await assert.rejects(executePinnedOxiEphemeris(f.specification), /input changed during execution/);
    assert.equal((await readFile(f.log, "utf8")).trim().split("\n").length, 1);
  }
});

test("kernel or executable changes during computation cannot receive a verified identity", async (t) => {
  for (const target of ["kernel", "process.argv[1]"]) {
    const f = await fixture(t, { onChart: `appendFileSync(${target}, "changed");` });
    await assert.rejects(executePinnedOxiEphemeris(f.specification), /input changed during execution/);
  }
});

test("a later invocation remeasures kernel bytes instead of reusing a stale receipt", async (t) => {
  const f = await fixture(t);
  await executePinnedOxiEphemeris(f.specification);
  await writeFile(f.ephemerisFile, Buffer.alloc(f.kernel.length, 0x62));
  await assert.rejects(executePinnedOxiEphemeris(f.specification), /SHA-256 does not match/);
  assert.equal((await readFile(f.log, "utf8")).trim().split("\n").length, 2);
});

test("invalid JSON and chart process failure are not recast as success", async (t) => {
  const malformed = await fixture(t, { output: "not json" });
  await assert.rejects(executePinnedOxiEphemeris(malformed.specification), SyntaxError);
  const failed = await fixture(t, { onChart: "process.exit(7);" });
  await assert.rejects(executePinnedOxiEphemeris(failed.specification), { code: 7 });
});

test("injected charts retain numerical projection without borrowing source-owned provenance", async () => {
  const supplied = { ...chart, metrology: { ephemerisSha256: DE440_SHA256, supplier: "OxiEphemeris 0.1.1" } };
  const result = await computePrecisionAstronomyPositions(request.time, request, { execute: async () => supplied });
  assert.deepEqual(result.bodies, chart.bodies);
  assert.deepEqual(result.nodes, chart.nodes);
  for (const key of ["ephemeris", "ephemerisSha256", "supplier", "supplierLicense", "supplierSha256"]) assert.equal(result.metrology[key], null);
  assert.equal(result.metrology.runtimeIdentity, "unverified-executor");
  assert.equal(Object.keys(result.essentialsCrossCheck).length, 10);
});

test("internal fixture pin acceptance cannot attest an injected public provider result", async (t) => {
  const f = await fixture(t);
  const result = await computePrecisionAstronomyPositions(request.time, request, { execute: async () => (await executePinnedOxiEphemeris(f.specification)).chart });
  assert.equal(result.metrology.ephemerisSha256, null);
  assert.equal(result.metrology.runtimeIdentity, "unverified-executor");
});
