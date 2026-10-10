import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { grantAssertion, revokeAssertion, locusResource } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { projectOperationAffordances } from "../src/operation-affordances.mjs";
import { createMetroplatWorld } from "../src/world.mjs";
import { agencyRecordProjection } from "../src/offices.mjs";

const domain = schemaFrom({ $id: "metroplat/test/input", type: "object", required: ["duty"], properties: { duty: { type: "string" } } });
const codomain = schemaFrom({ $id: "metroplat/test/output", type: "object", required: ["receipt"], properties: { receipt: { type: "string" } } });
const op = (verb, locus) => operation({
  verb,
  summary: `${verb} summary`,
  domain,
  codomain,
  ...(locus === undefined ? {} : { locus }),
  run: () => ({}),
});

test("public world command dispatches catalog powers without constructing a game turn", async () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "world-command-"));
  const worldRoot = mkdtempSync(path.join(tmpdir(), "world-world-"));
  try {
    const available = op("work-open"), unavailable = op("private-operation");
    const calls = [];
    const parent = { id: "parent-invocation" };
    const world = createMetroplatWorld({
      binding: { dataRoot },
      operations: () => [available, unavailable, op("world-connect"), op("world-command")],
      identity: { title: "Fixture" },
      dispatchOperation: async (...args) => {
        calls.push(args);
        return { code: 0, receipt: { id: "dispatch-receipt", value: { opened: true } } };
      },
    });
    const result = await world.command("fixture-account", "work-open duty=task:fixture", parent);
    assert.equal(result.kind, "metroplat.world.turn");
    assert.equal(result.actor.startsWith("actor:fixture-account"), true);
    assert.equal(result.character, "fixture-account");
    assert.deepEqual(result.results, [{ verb: "work-open", ok: true, value: { opened: true }, receipt: "dispatch-receipt" }]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "fixture-account");
    assert.deepEqual(calls[0][1].input, { duty: "task:fixture" });
    assert.equal(calls[0][2], parent);

    const refused = await world.command("fixture-account", "private-operation", { id: "refused-invocation" });
    assert.match(refused.messages[0], /not currently available/u);
    assert.deepEqual(refused.results, []);
    assert.equal(calls.length, 1);

    const navigation = createMetroplatWorld({
      binding: { dataRoot: worldRoot, agencyRoot: worldRoot },
      operations: () => [],
      identity: { title: "Fixture" },
      dispatchOperation: async () => { throw new Error("navigation must not dispatch a power"); },
    });
    const looked = await navigation.command("fixture-account", "look", { id: "navigation-invocation" });
    assert.equal(looked.kind, "metroplat.world.turn");
    assert.match(looked.messages[0], /The World/u);
    assert.deepEqual(looked.results, []);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
    rmSync(worldRoot, { recursive: true, force: true });
  }
});

test("agency record projection omits absent optional names and remains JSON-safe", () => {
  const nameless = agencyRecordProjection("incumbencies", {
    key: "office#incumbent",
    id: "incumbent",
    source: "lib/agency/incumbencies/incumbent.json",
    revision: "r1",
  });
  assert.equal(Object.hasOwn(nameless, "name"), false);
  assert.doesNotThrow(() => JSON.stringify(nameless));

  const named = agencyRecordProjection("offices", {
    key: "section#office",
    id: "office",
    name: "Office",
    source: "lib/agency/offices/office.json",
    revision: "r2",
  });
  assert.equal(named.name, "Office");
  assert.doesNotThrow(() => JSON.stringify(named));
});

test("account and help affordances project installed descriptor contracts through current categorized standing", () => {
  const subject = "actor:worker";
  const direct = op("agent-work-dispatch");
  const publicOperation = op("work-open");
  const officeOperation = op("agency-work-propose", "duty");
  const allocationOperation = op("agent-work-dispatch");
  const scope = "work-item:bare-cedar-fog-operation-affordances";
  const standing = [
    grantAssertion("caller", subject, "infograph#agent-work-dispatch", "2026-09-30T12:00:00Z"),
    grantAssertion("metroplat", "*", "infograph#work-open", "2026-09-30T12:00:00Z"),
    grantAssertion("office:chief-engineering-officer", subject, "infograph#agency-work-propose", "2026-09-30T12:00:00Z"),
    grantAssertion("allocation:bare-cedar-fog-operation-affordances-cengo-20260930", subject, "infograph#agent-work-dispatch", "2999-09-30T12:00:00Z"),
    grantAssertion(`delegation:${scope}`, subject, `${locusResource("infograph", "duty", scope)}#agency-work-propose`, "2026-09-30T12:00:00Z"),
  ];
  const projection = projectOperationAffordances([direct, publicOperation, officeOperation, allocationOperation], standing, subject);
  assert.deepEqual(projection.direct.map(({ verb }) => verb), ["agent-work-dispatch"]);
  assert.deepEqual(projection.public.map(({ verb }) => verb), ["work-open"]);
  assert.deepEqual(projection.office.map(({ verb }) => verb), ["agency-work-propose"]);
  assert.deepEqual(projection.allocation.map(({ verb }) => verb), ["agent-work-dispatch"]);
  assert.deepEqual(projection.delegation.map(({ verb, scope: actualScope }) => ({ verb, scope: actualScope })), [{ verb: "agency-work-propose", scope }]);
  assert.equal(projection.direct[0].input.schema.required.includes("duty"), true);
  assert.equal(projection.direct[0].output.schema.required.includes("receipt"), true);
  assert.deepEqual(projectOperationAffordances([direct, publicOperation, officeOperation, allocationOperation], [], subject), {
    direct: [], public: [], office: [], allocation: [], delegation: [],
  });
});

test("world help preserves rich descriptor contract prose", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "world-help-contract-"));
  try {
    const descriptive = operation({
      verb: "work-board",
      summary: "Read the settlement work board.",
      description: "Domain: { limit?: 1..200, after?: id }. Codomain: paged work-board projection with matched, threads and next.",
      domain: schemaFrom({ $id: "metroplat/test/work-board/input", type: "object" }),
      codomain: schemaFrom({ $id: "metroplat/test/work-board/output", type: "object" }),
      run: () => ({}),
    });
    const world = createMetroplatWorld({
      binding: { dataRoot: root, agencyRoot: root },
      operations: () => [descriptive],
      identity: { title: "Fixture" },
      dispatchOperation: async () => { throw new Error("help must not dispatch the operation"); },
    });
    const helped = await world.command("fixture-account", "help work-board", { id: "help-contract" });
    assert.match(helped.messages[0], /Contract:\nDomain: \{ limit\?: 1\.\.200, after\?: id \}/u);
    assert.match(helped.messages[0], /Codomain: paged work-board projection/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
