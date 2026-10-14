// A minimal in-sandbox Hive-Engine harness for MARSH.hive-engine.js: no real hivesmartcontracts
// node, no MongoDB — just the same `actions`/`api` globals a Hive-Engine node injects, faked
// just enough to exercise the contract's own logic (the same relationship MARSH.t.sol has to a
// real Base deployment: it proves the contract's own rules, not a live chain).
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const contractSource = readFileSync(new URL("../src/MARSH.hive-engine.js", import.meta.url), "utf8");

function loadContract({ sender = "alice" } = {}) {
  const tables = new Map();
  const emitted = [];
  const failures = [];
  const context = {
    actions: {},
    api: {
      sender,
      db: {
        async tableExists(name) { return tables.has(name); },
        async createTable(name) { tables.set(name, []); },
        async findOne(name, query) {
          const rows = tables.get(name) ?? [];
          return rows.find((row) => Object.entries(query).every(([key, value]) => row[key] === value)) ?? null;
        },
        async insert(name, record) {
          const rows = tables.get(name) ?? [];
          rows.push(record);
          return record;
        },
        async update(_name, record) { return record; },
      },
      assert(condition, message) {
        if (!condition) failures.push(message);
        return Boolean(condition);
      },
      emit(name, payload) { emitted.push({ name, payload }); },
    },
  };
  vm.createContext(context);
  vm.runInContext(contractSource, context);
  return { actions: context.actions, api: context.api, tables, emitted, failures };
}

// Rows built by object literals inside the vm context have a different (same-shaped) Object
// prototype than this realm's; round-tripping through JSON compares plain data, not identity.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function admitted(contract, overrides = {}) {
  await contract.actions.createSSC();
  await contract.actions.admitResource({
    resource: "marsh:mainnet:alice:sensor:room-1",
    kind: "sensor",
    content: "c1",
    evidence: "e1",
    ...overrides,
  });
}

test("admitResource inserts a resource at sequence 1 and emits resourceAdmitted", async () => {
  const contract = loadContract({ sender: "alice" });
  await admitted(contract);

  const rows = contract.tables.get("resources");
  assert.equal(rows.length, 1);
  assert.deepEqual(plain(rows[0]), {
    resource: "marsh:mainnet:alice:sensor:room-1",
    controller: "alice",
    kind: "sensor",
    content: "c1",
    evidence: "e1",
    sequence: 1,
  });
  assert.equal(contract.emitted.length, 1);
  assert.equal(contract.emitted[0].name, "resourceAdmitted");
  assert.equal(contract.failures.length, 0);
});

test("admitResource refuses a resource that already exists", async () => {
  const contract = loadContract({ sender: "alice" });
  await admitted(contract);
  await contract.actions.admitResource({ resource: "marsh:mainnet:alice:sensor:room-1", kind: "sensor", content: "c2", evidence: "e2" });

  assert.equal(contract.tables.get("resources").length, 1, "no second row was inserted");
  assert.equal(contract.tables.get("resources")[0].content, "c1", "the original content head is untouched");
  assert.deepEqual(contract.failures, ["resource already exists"]);
});

test("admitResource refuses any missing field", async () => {
  const contract = loadContract({ sender: "alice" });
  await contract.actions.createSSC();
  await contract.actions.admitResource({ resource: "", kind: "sensor", content: "c1", evidence: "e1" });
  assert.deepEqual(contract.failures, ["resource is required"]);
  assert.equal(contract.tables.get("resources").length, 0);
});

test("transitionResource replaces the head only from its current content, by its controller, and bumps sequence", async () => {
  const contract = loadContract({ sender: "alice" });
  await admitted(contract);
  await contract.actions.transitionResource({
    resource: "marsh:mainnet:alice:sensor:room-1",
    priorContent: "c1",
    content: "c2",
    evidence: "e2",
  });

  const row = plain(contract.tables.get("resources")[0]);
  assert.equal(row.content, "c2");
  assert.equal(row.evidence, "e2");
  assert.equal(row.sequence, 2);
  assert.equal(contract.emitted.at(-1).name, "resourceTransitioned");
  assert.equal(contract.emitted.at(-1).payload.priorContent, "c1");
  assert.equal(contract.failures.length, 0);
});

test("transitionResource refuses a caller other than the resource's controller", async () => {
  const contract = loadContract({ sender: "alice" });
  await admitted(contract);
  contract.api.sender = "mallory";
  await contract.actions.transitionResource({ resource: "marsh:mainnet:alice:sensor:room-1", priorContent: "c1", content: "c2", evidence: "e2" });

  assert.equal(plain(contract.tables.get("resources")[0]).content, "c1", "unchanged");
  assert.deepEqual(contract.failures, ["controller required"]);
});

test("transitionResource refuses a stale priorContent (compare-and-swap)", async () => {
  const contract = loadContract({ sender: "alice" });
  await admitted(contract);
  await contract.actions.transitionResource({ resource: "marsh:mainnet:alice:sensor:room-1", priorContent: "stale", content: "c2", evidence: "e2" });

  assert.equal(contract.tables.get("resources")[0].content, "c1", "unchanged");
  assert.deepEqual(contract.failures, ["prior content mismatch"]);
});

test("transitionResource refuses a resource that does not exist", async () => {
  const contract = loadContract({ sender: "alice" });
  await contract.actions.createSSC();
  await contract.actions.transitionResource({ resource: "marsh:mainnet:alice:sensor:absent", priorContent: "c1", content: "c2", evidence: "e2" });

  assert.deepEqual(contract.failures, ["resource not found"]);
  assert.equal(contract.tables.get("resources").length, 0);
});

test("one Hive account cannot occupy another controller's resource identifier or kind", async () => {
  const contract = loadContract({ sender: "mallory" });
  await contract.actions.createSSC();
  const claimed = "marsh:mainnet:alice:sensor:room-1";
  await contract.actions.admitResource({
    resource: claimed, kind: "sensor", content: "c1", evidence: "e1",
  });
  assert.deepEqual(contract.failures, ["resource controller identity mismatch"]);
  assert.equal(contract.tables.get("resources").length, 0,
    "a forged sender must not lock out the actual controller");
  contract.failures.length = 0;
  contract.api.sender = "alice";
  await contract.actions.admitResource({
    resource: claimed, kind: "different-kind", content: "c1", evidence: "e1",
  });
  assert.deepEqual(contract.failures, ["resource kind identity mismatch"]);
  assert.equal(contract.tables.get("resources").length, 0);
  contract.failures.length = 0;
  await contract.actions.admitResource({
    resource: claimed, kind: "sensor", content: "c1", evidence: "e1",
  });
  assert.equal(contract.failures.length, 0);
  assert.equal(contract.tables.get("resources")[0].controller, "alice");
});

test("opaque content-addressed NI subjects survive while malformed or enormous identity tuples refuse", async () => {
  const contract = loadContract({ sender: "alice" });
  await contract.actions.createSSC();
  for (const resource of [
    "not-a-typed-resource",
    "marsh::alice:sensor:subject",
    "marsh:mainnet:alice::subject",
    "marsh:mainnet:alice:sensor:",
    "marsh:mainnet:alice:sensor:" + "a".repeat(600),
  ]) {
    await contract.actions.admitResource({
      resource, kind: "sensor", content: "c1", evidence: "e1",
    });
    assert.ok(contract.failures.at(-1)?.includes("resource identity malformed"),resource);
  }
  assert.equal(contract.tables.get("resources").length, 0);
  contract.failures.length = 0;
  const resource = "marsh:mainnet:alice:sensor:ni:///sha-256;" + "A".repeat(43);
  await contract.actions.admitResource({resource,kind:"sensor",content:"c1",evidence:"e1"});
  assert.equal(contract.failures.length,0);
  assert.equal(contract.tables.get("resources")[0].resource,resource);
  assert.equal(contract.tables.get("resources")[0].sequence,1);
});
