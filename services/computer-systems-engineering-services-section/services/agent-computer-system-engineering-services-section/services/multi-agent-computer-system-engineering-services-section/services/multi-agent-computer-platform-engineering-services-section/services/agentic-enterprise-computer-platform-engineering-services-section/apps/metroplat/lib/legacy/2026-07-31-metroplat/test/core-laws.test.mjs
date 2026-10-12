import assert from "node:assert/strict";
import test from "node:test";

import { tm } from "../src/lib/language/ast/index.mts";
import { canonicalBytes, contentAddress } from "../src/lib/identity/index.mts";
import { chargeValue, chargeValues } from "../src/lib/values/index.mts";
import {
  chargeJoinVClosure,
  chargeSample,
  chargeValueCategory,
  closureOver,
  settleFixedPoint,
  settleLeast,
  spineRecovery,
} from "../src/lib/fixpoint/value-category.mts";
import {
  ancestorsOf,
  causalGraphOf,
  descendantsOf,
  journalWitness,
  parseJournalWitness,
  topologicalOrder,
} from "../src/journal/index.mts";
import { canInvoke, capabilityDelegation, objectCapability, verifyCapabilityDelegation } from "../src/lib/capability/index.mts";
import { capabilityClaim, capabilityWitness, readCapabilityWitnesses } from "../src/lib/capability/claims.mts";
import { operation } from "../src/rpc/index.mts";
import { articulate, mark, utterance } from "../src/lib/records/utterance/index.mts";
import { predicate } from "../src/lib/logic/predicating/predication.mts";
import { posit } from "../src/lib/logic/predicating/evidence/fiber.mts";
import { settling } from "../src/lib/settling.mts";
import { inducing } from "../src/lib/inducing.mts";
import { inducingOperations } from "../src/apps/infograph/operations/inducing.mts";
import * as math from "../src/lib/math/index.mts";

function core(label, causes = []) {
  return Object.freeze({
    kind: "metroplat.journal.observation",
    seat: `seat:${label}`,
    claim: tm.mark(`claim:${label}`),
    address: tm.mark(`address:${label}`),
    time: `2026-01-01T00:00:0${label.length}.000Z`,
    causes: Object.freeze(causes),
  });
}

test("journal event uses canonical bytes and the sole ArtifactRef form", () => {
  const event = journalWitness(core("a"));
  assert.equal(event.kind, "metroplat.journal.witness");
  assert.equal(event.bytes, canonicalBytes(event.core));
  assert.match(event.id, /^metroplat:artifact:1:rfc8785-jcs:sha-256:[0-9a-f]{64}$/u);
  assert.deepEqual(parseJournalWitness(JSON.parse(JSON.stringify(event))), event);
});

test("Operation uses the canonical source API while retaining its persisted action discriminant", () => {
  const declared = operation({ verb: "compatibility-vector", inputFormat: "json", outputFormat: "json", run: (input) => input });
  assert.equal(declared.kind, "metroplat.action");
  assert.equal(declared.verb, "compatibility-vector");
});

test("Inducing is the complete four-morphism process and Settling remains its terminal morphism", () => {
  const admitted = utterance(mark("subject"), mark("predicate"));
  const composed = inducing(admitted);
  const explicit = settling(posit(predicate(articulate(admitted))));
  assert.deepEqual(composed, explicit);
  assert.equal(composed.kind, "predication.settlement.filtration");

  const verbs = inducingOperations.map((declared) => declared.verb);
  assert.equal(verbs.filter((verb) => verb === "induce").length, 1);
  assert.equal(verbs.includes("induce-relation"), false);
  assert.equal(verbs.includes("induce-utterance-relation"), false);
});

test("math public namespaces preserve Obsmetrologia sectors instead of aliasing topology", () => {
  assert.equal(typeof math.rational.exactNumber.toCount, "function");
  assert.equal(typeof math.graphs.completeGraphWeights, "function");
  assert.equal(typeof math.physics.models.fluid.fluidVortexCohomologyReceipt, "function");
  assert.equal(math.topology.toCount, undefined);
  assert.equal(math.topology.completeGraphWeights, undefined);
  assert.equal(math.physics.models.fluid.completeGraphWeights, undefined);
});

test("causal graph preserves ancestry, frontier, external causes, and deterministic order", () => {
  const root = journalWitness(core("root"));
  const left = journalWitness(core("left", [root.id]));
  const external = contentAddress({ external: true });
  const right = journalWitness(core("right", [root.id, external]));
  const join = journalWitness(core("join", [left.id, right.id]));
  const graph = causalGraphOf([join, right, root, left]);

  assert.deepEqual(graph.roots, [root.id]);
  assert.deepEqual(graph.heads, [join.id]);
  assert.deepEqual([...graph.externalCauses], [external]);
  assert.deepEqual(new Set(ancestorsOf(graph, join.id)), new Set([root.id, left.id, right.id]));
  assert.deepEqual(new Set(descendantsOf(graph, root.id)), new Set([left.id, right.id, join.id]));
  const ordered = topologicalOrder(graph).map((event) => event.id);
  assert.ok(ordered.indexOf(root.id) < ordered.indexOf(left.id));
  assert.ok(ordered.indexOf(root.id) < ordered.indexOf(right.id));
  assert.ok(ordered.indexOf(left.id) < ordered.indexOf(join.id));
  assert.ok(ordered.indexOf(right.id) < ordered.indexOf(join.id));
});

test("causal graph rejects an edited cyclic slice", () => {
  const a = { ...journalWitness(core("a")), id: "a", core: { ...core("a"), causes: ["b"] } };
  const b = { ...journalWitness(core("b")), id: "b", core: { ...core("b"), causes: ["a"] } };
  assert.throws(() => topologicalOrder(causalGraphOf([a, b])), /contains a cycle/u);
});

test("FOUR settling is a lawful closure and reaches a least fixed point for every charge", () => {
  for (const target of chargeValues) {
    const closure = chargeJoinVClosure(target);
    assert.equal(closureOver(chargeValueCategory, closure, chargeSample).kind, "settling.vClosure.law:witness");
    assert.equal(settleFixedPoint(chargeValueCategory, closure, chargeValue("unknown")).kind, "settling.valueCategory.settleFixedPoint:witness");
    assert.equal(settleLeast(chargeValueCategory, closure, chargeValue("unknown"), target).kind, "settling.valueCategory.settleLeast:witness");
    const recovery = spineRecovery(target);
    assert.equal(recovery.kind, "settling.spineRecovery:witness");
    assert.equal(recovery.reachesTarget, true);
  }
});

test("capability delegation attenuates resources and permissions", () => {
  const parent = objectCapability({ holder: "alice", resource: "urn:workspace", actions: ["read", "write"], caveats: ["audited"] });
  const child = capabilityDelegation({
    issuer: "alice",
    audience: "bob",
    parent,
    resource: "urn:workspace/project",
    actions: ["read"],
    caveats: ["bounded"],
  });
  assert.equal(verifyCapabilityDelegation(child).ok, true);
  assert.equal(canInvoke(child.child, { kind: "capability.invocation", actor: "bob", resource: "urn:workspace/project/file", action: "read", input: null }).ok, true);
  assert.equal(canInvoke(child.child, { kind: "capability.invocation", actor: "bob", resource: "urn:workspace/project/file", action: "write", input: null }).ok, false);
});

test("callable standing retains contested capability evidence as an obstruction", () => {
  const claim = capabilityClaim(
    tm.mark("operation:inspect"),
    { kind: "metroplat.capability.effector", declaration: "inspect" },
    null,
  );
  const reading = readCapabilityWitnesses([
    capabilityWitness(claim, "held", "positive"),
    capabilityWitness(claim, "denied", "negative"),
  ]);
  assert.equal(reading.designated.length, 1);
  assert.equal(reading.designated[0].charge, "contested");
  assert.equal(reading.obstructions.length, 1);
  assert.equal(reading.obstructions[0].charge, "contested");
});
