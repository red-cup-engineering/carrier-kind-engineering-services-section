import assert from "node:assert/strict";
import test from "node:test";
import { rmSync } from "node:fs";
import path from "node:path";
import { installedFixture } from "./fixtures/installed-jsnode-package.mjs";
import { readBoundPackageOperations } from "@red-cup-engineering/computer-code-development-engine/operations";
import { operationSourcesFromFern } from "@red-cup-engineering/metroplat/fern-catalog";
import { createOperationCatalog } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { authorizationFromStanding, dispatch } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { invocation } from "@red-cup-engineering/computer-system-engine/rpc/invocation";


function runtime(operations, events, permitted = true) {
  return {
    catalog: createOperationCatalog(operations),
    authorize: authorizationFromStanding(new Map(operations.map(op => [op.ref, permitted ? "held" : "denied"]))),
    now: () => "2026-09-18T12:00:00.000Z",
    witness: {
      causalHead: () => [],
      admit(evidence) {
        events.push(evidence);
        return { kind: "metroplat.rpc.evidence-receipt", id: `receipt:${events.length}`, evidence: evidence.kind, eventIds: [`event:${events.length}`] };
      },
    },
  };
}

function request(operation, input, sequence) {
  return invocation({ request: `request:${sequence}`, subject: "subject:test", operation: operation.ref,
    verb: operation.verb, resource: "fixture", input, caller: { transport: "test" }, observedAt: "2026-09-18T12:00:00.000Z" });
}

test("installed JSNode calls and MetroPlat dispatch retain one checked execution behavior", async () => {
  const fixture = installedFixture();
  try {
    const bound = await readBoundPackageOperations(fixture);
    const direct = new Map(bound.map(op => [path.basename(op.path, ".mjs"), op]));
    const sources = await operationSourcesFromFern({ fern: fixture.fernPath, operationsRoot: fixture.operationsRoot });
    const operations = sources.flatMap(source => source.operations);
    const mounted = new Map(operations.map(op => [op.verb, op]));
    const events = [];
    const host = runtime(operations, events);

    assert.equal(direct.get("double-value").run(4), 8, "synchronous packages stay synchronous");
    const deferred = direct.get("async-double").run(5);
    assert.equal(typeof deferred.then, "function");
    assert.equal(await deferred, 10);
    for (const name of ["double-value", "async-double"]) {
      const receipt = await dispatch(host, request(mounted.get(name), 7, name));
      assert.equal(receipt.ok, true, JSON.stringify(receipt));
      assert.equal(receipt.value, 14);
    }
    assert.deepEqual(fixture.effects(), ["double-value", "async-double", "double-value", "async-double"]);

    const effectCount = fixture.effects().length;
    assert.throws(() => direct.get("double-value").run("bad"), /input|number/i);
    const invalid = await dispatch(host, request(mounted.get("double-value"), "bad", "invalid"));
    assert.equal(invalid.ok, false);
    assert.equal(fixture.effects().length, effectCount, "invalid input never reaches installed package code");

    const refused = await dispatch(runtime(operations, [], false), request(mounted.get("double-value"), 9, "denied"));
    assert.equal(refused.phase, "authorization");
    assert.equal(fixture.effects().length, effectCount, "shared execution does not bypass platform authorization");

    assert.throws(() => direct.get("bad-result").run(1), /output|number/i);
    const badOutput = await dispatch(host, request(mounted.get("bad-result"), 1, "bad-output"));
    assert.equal(badOutput.ok, false);
    assert.equal(fixture.effects().length, effectCount + 2, "output refusal does not conceal an already performed effect");
    assert.deepEqual(events.slice(0, 3).map(event => event.kind), ["metroplat.rpc.attempt", "metroplat.rpc.decision", "metroplat.rpc.outcome"]);
    assert.equal(events.filter(event => event.kind === "metroplat.rpc.outcome").length, 4);
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});
