import assert from "node:assert/strict";
import test from "node:test";

import { capabilityGrant, grantAssertion, locusResource } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { authorizationFromCapabilityAssertions, authorizationFromStanding, dispatch, invocationResource } from "../src/rpc/dispatch.mjs";
import { invocation } from "../src/rpc/invocation.mjs";
import { createOperationCatalog, operation } from "../src/rpc/operation.mjs";

const AT = "2026-09-28T12:00:00.000Z";

function rpcWitness() {
  let count = 0;
  return Object.freeze({
    causalHead: () => Object.freeze([]),
    admit(evidence) {
      count += 1;
      return Object.freeze({ kind: "metroplat.rpc.evidence-receipt", id: `test-evidence:${count}`, evidence: evidence.kind, eventIds: Object.freeze([`test-event:${count}`]) });
    },
  });
}

test("an operation acts on the sub-resource its locus names in the input, else on the program", () => {
  const bound = operation({ verb: "duty-read", locus: "duty", run: () => null });
  const unbound = operation({ verb: "ledger-read", run: () => null });
  assert.equal(bound.locus, "duty");
  assert.equal(locusResource("infograph", "duty", "work-item:a/1"), "infograph/duty/work-item%3Aa%2F1");
  assert.equal(invocationResource({ resource: "infograph", input: { duty: "work-item:a/1" } }, bound), "infograph/duty/work-item%3Aa%2F1");
  assert.equal(invocationResource({ resource: "infograph", input: { duty: "" } }, bound), "infograph");
  assert.equal(invocationResource({ resource: "infograph", input: null }, bound), "infograph");
  assert.equal(invocationResource({ resource: "infograph", input: { duty: "work-item:a/1" } }, unbound), "infograph");
});

test("a grant attenuated to one duty authorizes that duty alone, and a grant on the program covers every duty", async () => {
  let runs = 0;
  const bound = operation({ verb: "duty-read", locus: "duty", run: () => { runs += 1; return null; } });
  const catalog = createOperationCatalog([bound]);
  const authorize = authorizationFromCapabilityAssertions(authorizationFromStanding(new Map([[bound.ref, "held"]])), [
    grantAssertion("issuer:test", "character:outside", capabilityGrant(locusResource("infograph", "duty", "work-item:a/1"), bound.verb), AT),
    grantAssertion("issuer:test", "office:holder", capabilityGrant("infograph", bound.verb), AT),
  ]);
  const call = (subject, input) => dispatch({ catalog, witness: rpcWitness(), authorize, now: () => AT }, invocation({
    request: `request:${subject}:${JSON.stringify(input)}`, subject, operation: bound.ref, verb: bound.verb, resource: "infograph", input, caller: { transport: "test" }, observedAt: AT,
  }));

  assert.equal((await call("character:outside", { duty: "work-item:a/1" })).ok, true);
  const otherDuty = await call("character:outside", { duty: "work-item:a/2" });
  assert.equal(otherDuty.ok, false);
  assert.equal(otherDuty.phase, "authorization");
  assert.equal((await call("character:outside", {})).ok, false);
  assert.equal((await call("office:holder", { duty: "work-item:a/2" })).ok, true);
  assert.equal((await call("office:holder", {})).ok, true);
  assert.equal(runs, 3);
});
