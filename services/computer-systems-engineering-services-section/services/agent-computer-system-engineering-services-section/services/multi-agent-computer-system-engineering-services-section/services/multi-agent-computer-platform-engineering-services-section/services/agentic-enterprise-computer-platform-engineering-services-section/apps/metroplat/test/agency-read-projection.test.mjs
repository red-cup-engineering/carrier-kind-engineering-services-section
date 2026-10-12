import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readAgency } from "@red-cup-engineering/organizing/agency";
import { releaseAgency } from "@red-cup-engineering/organizing/agency/held";
import { executionReceipt } from "@red-cup-engineering/computer-system-engine/rpc/receipt";
import { officeOperations } from "../src/offices.mjs";

const AT = "2026-10-09T19:35:55.000Z";
const SECTION = "services/fixture-section";
const OTHER = "services/other-section";

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agency-read-"));
  const agencyRoot = path.join(root, "agency"), dataRoot = path.join(root, "data");
  mkdirSync(agencyRoot);
  mkdirSync(dataRoot);
  const priorLog = process.env.AGENCY_ACTS_LOG;
  process.env.AGENCY_ACTS_LOG = path.join(root, "absent-acts.jsonl");
  t.after(() => {
    releaseAgency(agencyRoot);
    if (priorLog === undefined) delete process.env.AGENCY_ACTS_LOG;
    else process.env.AGENCY_ACTS_LOG = priorLog;
    rmSync(root, { recursive: true, force: true });
  });
  const originals = new Map();
  const author = (section, pool, record) => {
    const source = `${section}/lib/agency/${pool}/${record.id}.json`;
    const file = path.join(agencyRoot, source), bytes = `${JSON.stringify(record)}\n`;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    originals.set(file, bytes);
  };
  author(SECTION, "offices", { id: "operator", name: "Fixture operator" });
  for (let index = 0; index < 7; index += 1) {
    author(SECTION, "incumbencies", { id: `authored-${index}`, name: index === 6 ? "" : `Authored seat ${index}`,
      office: "operator", holder: `fixture-holder-${index}`, recognition: "t", induction: "t" });
  }
  // This is a real readAgency-derived incumbency, not a manually constructed summary.
  author(SECTION, "characters", { id: "fixture-character", name: "Character's own authored name", office: ["operator"] });
  author(OTHER, "offices", { id: "other-operator", name: "Other operator" });
  author(OTHER, "incumbencies", { id: "other-seat", name: "Other seat", office: "other-operator",
    holder: "other-holder", recognition: "t", induction: "t" });
  const registry = readAgency(agencyRoot, { acts: [] });
  assert.deepEqual(registry.problems, []);
  const derived = registry.incumbencies.get(`${SECTION}#fixture-character-as-operator`);
  assert.ok(derived);
  assert.equal(Object.hasOwn(derived, "name"), false);
  assert.equal(Object.hasOwn(derived, "revision"), false);
  assert.equal(derived.holder, "fixture-character");
  const query = officeOperations({ agencyRoot, dataRoot, repositoryRoot: root, now: () => AT }, () => [])
    .find(operation => operation.verb === "agency");
  const unchanged = () => {
    for (const [file, bytes] of originals) assert.equal(readFileSync(file, "utf8"), bytes);
    assert.equal(Object.hasOwn(derived, "name"), false);
    assert.equal(Object.hasOwn(derived, "revision"), false);
  };
  return { registry, derived, query, unchanged };
}

async function readAndSeal(query, input) {
  const value = await query.execute(input);
  const receipt = executionReceipt({ ok: true, invocation: { id: "fixture:agency-read" }, operation: query.ref,
    phase: "execution", value, reasons: [], evidence: [], startedAt: AT, completedAt: AT });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.phase, "execution");
  assert.match(receipt.id, /^ni:\/\/\/sha-256;/u);
  assert.deepEqual(JSON.parse(JSON.stringify(receipt.value)), value);
  assert.deepEqual(receipt.value, value);
  return value;
}

function assertSummaries(reading, registry) {
  for (const record of reading.records) {
    const original = registry[record.pool].get(record.key);
    assert.ok(original);
    assert.deepEqual(record, { pool: record.pool, key: original.key, id: original.id,
      ...(original.name === undefined ? {} : { name: original.name }), source: original.source,
      ...(original.revision === undefined ? {} : { revision: original.revision }) });
  }
}

test("agency reads preserve real derived incumbencies through typed output and execution receipts", async t => {
  const f = fixture(t);
  const input = { pool: "incumbencies", section: SECTION };
  const reading = await readAndSeal(f.query, input);
  assert.equal(reading.records.length, 8);
  assert.deepEqual(reading.records.map(record => record.key), [...f.registry.incumbencies.values()]
    .filter(record => record.sectionPath === SECTION).map(record => record.key));
  assert.equal(reading.records[7].key, f.derived.key);
  assert.equal(Object.hasOwn(reading.records[7], "name"), false);
  assert.equal(Object.hasOwn(reading.records[7], "revision"), false);
  assertSummaries(reading, f.registry);
  const emptyName = reading.records.find(record => record.id === "authored-6");
  assert.equal(emptyName.name, "", "an authored empty name is present, not absent");
  assert.equal(emptyName.revision, f.registry.incumbencies.get(emptyName.key).revision);
  assert.deepEqual(await readAndSeal(f.query, input), reading, "repeated reads preserve the complete result");
  f.unchanged();
});

test("agency pool and section filters retain unaffected authored summaries and counts", async t => {
  const f = fixture(t);
  for (const input of [{ pool: "incumbencies" }, { section: SECTION }, { pool: "incumbencies", section: OTHER },
    { pool: "characters", section: SECTION }, { pool: "incumbencies", section: "services/absent-section" }]) {
    const reading = await readAndSeal(f.query, input);
    assertSummaries(reading, f.registry);
    const expected = Object.entries(reading.pools).flatMap(([pool]) => input.pool && pool !== input.pool ? []
      : [...f.registry[pool].values()].filter(record => !input.section || record.sectionPath === input.section)
        .map(record => record.key));
    assert.deepEqual(reading.records.map(record => record.key), expected);
    assert.equal(reading.pools.incumbencies, 9, "counts describe the registry, not the filtered subset");
  }
  f.unchanged();
});

test("unfiltered agency discovery serializes derived and authored records without adding source facts", async t => {
  const f = fixture(t);
  const reading = await readAndSeal(f.query, {});
  assertSummaries(reading, f.registry);
  assert.ok(reading.records.some(record => record.key === f.derived.key));
  assert.ok(reading.governance);
  assert.ok(reading.cast);
  assert.ok(reading.politic);
  assert.ok(reading.control);
  assert.ok(reading.jural);
  f.unchanged();
});
