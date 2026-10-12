import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { appendEavt } from "@red-cup-engineering/eavt";
import { inspectFaeResource } from "../src/inspect-resource.mjs";
import { providerOutcomeSchema, validateProviderOutcome } from "../src/provider/provider.mjs";

const FAE_CLI = fileURLToPath(new URL("../src/cli/fae.mjs", import.meta.url));
const LOCATOR = "urn:resource:inspected";

function fernWithOperation(inputSchema = null) {
  const directory = mkdtempSync(join(tmpdir(), "fae-inspection-"));
  const fernPath = join(directory, "world.eavt");
  const address = "jsnode-operation-package:fixture";
  appendEavt(fernPath, { e: address, a: "constituted", v: { name: "@test/fixture", version: "0.1.0" }, t: 0 });
  appendEavt(fernPath, { e: address, a: "has-operation", v: { path: "scripts/inspect.mjs", exportName: "inspect", inputSchema }, t: 1 });
  return { directory, fernPath };
}

function input(fernPath) {
  return {
    fernPath,
    resource: { path: LOCATOR, content: "{}" },
    observations: [
      { provider: "urn:provider:positive", outcome: { resources: [{ resource: LOCATOR, focus: LOCATOR, observedAt: "2026-09-06T00:00:00.000Z", cells: [{ subject: "urn:s", predicate: "urn:shared", object: "urn:o", polarity: "for" }, { subject: "urn:s", predicate: "urn:true", object: "urn:o", polarity: "for" }] }] } },
      { provider: "urn:provider:negative", outcome: { resources: [{ resource: LOCATOR, focus: LOCATOR, observedAt: "2026-09-06T00:00:01.000Z", cells: [{ subject: "urn:s", predicate: "urn:shared", object: "urn:o", polarity: "against" }, { subject: "urn:s", predicate: "urn:false", object: "urn:o", polarity: "against" }] }] } },
      { provider: "urn:provider:unrelated", outcome: { resources: [{ resource: "urn:resource:unrelated", focus: "urn:resource:unrelated", observedAt: "2026-09-06T00:00:02.000Z", cells: [{ subject: "urn:other", predicate: "urn:unrelated", object: "urn:o" }] }] } },
    ],
  };
}

test("inspect-resource composes only matching supplied outcomes with FROG's unknown contract through every face", async () => {
  const fixture = fernWithOperation();
  try {
    const request = input(fixture.fernPath);
    const pending = inspectFaeResource(request);
    request.resource.path = "urn:resource:mutated";
    request.resource.content = "null";
    const direct = await pending;
    assert.deepEqual(direct.frog.resource, { path: LOCATOR, content: "{}" });
    assert.equal(direct.frog.operations[0].matched, null);
    assert.equal(direct.frog.operations[0].classification, null);
    assert.ok(direct.composition.resources.every((resource) => resource.resource === LOCATOR));
    assert.ok(direct.occurrences.every((occurrence) => occurrence.source.resource === LOCATOR));
    const shared = direct.composition.cells.find((cell) => cell.predicate === "urn:shared");
    assert.equal(shared.reading, "TOP");
    assert.equal(shared.designated, true);
    assert.deepEqual(shared.origins.map((origin) => origin.provider), ["urn:provider:positive", "urn:provider:negative"]);
    assert.equal(direct.composition.cells.find((cell) => cell.predicate === "urn:true").reading, "T");
    assert.equal(direct.composition.cells.find((cell) => cell.predicate === "urn:false").reading, "F");

    const cli = spawnSync(process.execPath, [FAE_CLI, "inspect-resource"], { encoding: "utf8", input: JSON.stringify(input(fixture.fernPath)) });
    assert.equal(cli.status, 0);
    assert.equal(cli.stderr, "");
    assert.deepEqual(JSON.parse(cli.stdout), direct);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test("inspect-resource refuses unmatched, malformed, duplicate, and invalid-schema inputs", async () => {
  const fixture = fernWithOperation();
  const invalid = fernWithOperation({ $ref: "urn:missing" });
  try {
    const unmatched = input(fixture.fernPath);
    unmatched.observations = [{ provider: "urn:provider:other", outcome: { resources: [{ resource: "urn:other", focus: "urn:other", observedAt: "2026-09-06T00:00:00.000Z", cells: [] }] } }];
    await assert.rejects(() => inspectFaeResource(unmatched), /no provider graph matches/u);
    const malformed = input(fixture.fernPath);
    malformed.observations = [{ provider: "urn:provider:bad", outcome: { resources: "not-an-array" } }];
    await assert.rejects(() => inspectFaeResource(malformed), /outcome\/resources must be array/u);
    const duplicate = input(fixture.fernPath);
    duplicate.observations[1].provider = duplicate.observations[0].provider;
    await assert.rejects(() => inspectFaeResource(duplicate), /duplicate provider id/u);
    await assert.rejects(() => inspectFaeResource(input(invalid.fernPath)), /json-schema declaration is invalid/u);
    await assert.rejects(() => inspectFaeResource({ ...input(fixture.fernPath), extra: true }), /additional properties/u);
    await assert.rejects(() => inspectFaeResource(new Map()), /serializable/u);
    const invalidTime = input(fixture.fernPath);
    invalidTime.observations[0].outcome.resources[0].observedAt = "not-a-time";
    await assert.rejects(() => inspectFaeResource(invalidTime), /format/u);
    const parseableNonRfc3339 = input(fixture.fernPath);
    parseableNonRfc3339.observations[0].outcome.resources[0].observedAt = "December 17, 1995 03:24:00";
    await assert.rejects(() => inspectFaeResource(parseableNonRfc3339), /format/u);
    const normalized = validateProviderOutcome({
      resources: [{ resource: LOCATOR, focus: null, observedAt: "2026-09-06T00:00:00.000Z", cells: [], diagnostics: null }],
      diagnostics: null,
    }, "nullable");
    assert.equal(normalized.resources[0].focus, LOCATOR);
    assert.deepEqual(normalized.resources[0].diagnostics, []);
    assert.deepEqual(normalized.diagnostics, []);
    assert.throws(() => {
      providerOutcomeSchema.properties.resources.items.$ref = "fae/mutated";
    }, TypeError);
    const cli = spawnSync(process.execPath, [FAE_CLI, "inspect-resource"], { encoding: "utf8", input: "not json" });
    assert.equal(cli.status, 1);
    assert.equal(cli.stdout, "");
    assert.match(cli.stderr, /fae inspect-resource:/u);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
    rmSync(invalid.directory, { recursive: true, force: true });
  }
});
