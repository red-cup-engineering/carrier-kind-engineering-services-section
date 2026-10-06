import assert from "node:assert/strict";
import test from "node:test";

import { addressArtifact, addressPrimitiveArticulation, addressSiteConstitution } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { addressWitnessCore, INITIAL_CAUSAL_RESOURCE_ENVELOPE } from "@red-cup-engineering/semiotic-eavt-services-section/journal/witness";
import { causalGraphHasCycle } from "@red-cup-engineering/semiotic-eavt-services-section/journal/causal-graph";
import { createCausalSubstrate, rebuildCausalSubstrate } from "@red-cup-engineering/semiotic-eavt-services-section/journal/substrate";
import { deriveFrontier, mergeObservedFrontiers } from "@red-cup-engineering/computer-system-engine/journal/frontier";
import { isCausalWitness } from "@red-cup-engineering/semiotic-eavt-services-section/journal/judgment";

function causal(judgment) {
  assert.equal(judgment.kind, "metroplat.causal:witness", judgment.message);
  return judgment.value;
}

function obstruction(judgment, code) {
  assert.equal(judgment.kind, "metroplat.causal:obstruction");
  assert.equal(judgment.code, code);
  return judgment;
}

function source(addressed) {
  return Object.freeze({ ref: addressed.ref, canonicalText: addressed.canonical.text });
}

function witnessValue(site, articulation, options = {}) {
  return Object.freeze({
    kind: "metroplat.witness-core",
    version: 1,
    site,
    articulation,
    causes: Object.freeze([...(options.causes ?? [])].sort()),
    referencedArtifacts: Object.freeze([...(options.referencedArtifacts ?? [])].sort()),
    attestationRefs: Object.freeze([...(options.attestationRefs ?? [])].sort()),
    boundaryObservationRefs: Object.freeze([...(options.boundaryObservationRefs ?? [])].sort()),
  });
}

function baseFixture() {
  const site = addressSiteConstitution();
  const token = addressArtifact({ mark: "token" });
  const claim = addressArtifact({ mark: "claim" });
  const related = addressArtifact({ related: true });
  const articulation = addressPrimitiveArticulation({
    kind: "metroplat.primitive-articulation",
    version: 1,
    token: token.ref,
    claim: claim.ref,
  });
  return { site, token, claim, related, articulation };
}

test("WitnessCore has one exact site, sorted unique reference sets, and bounded dependencies", () => {
  const fixture = baseFixture();
  const valid = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, {
    referencedArtifacts: [fixture.related.ref],
  })));
  assert.equal(valid.core.site, fixture.site.ref);
  assert.equal(valid.core.articulation, fixture.articulation.ref);
  assert.deepEqual(valid.core.referencedArtifacts, [fixture.related.ref]);

  obstruction(addressWitnessCore({
    ...witnessValue(fixture.site.ref, fixture.articulation.ref),
    site: fixture.token.ref,
  }), "site-mismatch");
  obstruction(addressWitnessCore({
    ...witnessValue(fixture.site.ref, fixture.articulation.ref),
    referencedArtifacts: [fixture.token.ref, fixture.claim.ref].sort().reverse(),
  }), "reference-set-order");
  obstruction(addressWitnessCore({
    ...witnessValue(fixture.site.ref, fixture.articulation.ref),
    referencedArtifacts: [fixture.related.ref, fixture.related.ref],
  }), "duplicate-reference");
  obstruction(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, {
    attestationRefs: [fixture.related.ref],
  })), "unsupported-attestation");
  obstruction(addressWitnessCore({
    ...witnessValue(fixture.site.ref, fixture.articulation.ref),
    ambientTime: "2026-07-12T00:00:00Z",
  }), "witness-shape");

  const refs = [fixture.token.ref, fixture.claim.ref, fixture.related.ref].sort();
  obstruction(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, {
    causes: refs,
  }), undefined, { ...INITIAL_CAUSAL_RESOURCE_ENVELOPE, maxCauses: 2 }), "dependency-limit");
});

test("causal cycle detection rejects cycles while permitting missing external causes", () => {
  assert.equal(causalGraphHasCycle([
    { ref: "a", causes: ["b"] },
    { ref: "b", causes: ["a"] },
  ]), true);
  assert.equal(causalGraphHasCycle([
    { ref: "a", causes: ["external"] },
    { ref: "b", causes: ["a"] },
  ]), false);
  assert.equal(causalGraphHasCycle([{ ref: "self", causes: ["self"] }]), true);
  const longChain = Array.from({ length: 5_000 }, (_, index) => ({
    ref: `w${String(index).padStart(4, "0")}`,
    causes: index === 0 ? [] : [`w${String(index - 1).padStart(4, "0")}`],
  }));
  assert.equal(causalGraphHasCycle(longChain), false);
});

test("reception quarantines out-of-order witnesses and promotes them deterministically", () => {
  const fixture = baseFixture();
  const parent = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref)));
  const child = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, {
    causes: [parent.ref],
    referencedArtifacts: [fixture.related.ref],
  })));
  const substrate = causal(createCausalSubstrate());

  const childReceipt = causal(substrate.receive(child.ref, child.canonical.text));
  assert.equal(childReceipt.witnessState, "quarantined");
  assert.deepEqual(childReceipt.missing, [fixture.articulation.ref, fixture.related.ref, parent.ref].sort());

  causal(substrate.receive(fixture.articulation.ref, fixture.articulation.canonical.text));
  assert.deepEqual(substrate.missingDependencies(child.ref), [fixture.claim.ref, fixture.related.ref, fixture.token.ref, parent.ref].sort());
  causal(substrate.receive(fixture.token.ref, fixture.token.canonical.text));
  causal(substrate.receive(fixture.claim.ref, fixture.claim.canonical.text));
  causal(substrate.receive(fixture.related.ref, fixture.related.canonical.text));
  const parentReceipt = causal(substrate.receive(parent.ref, parent.canonical.text));
  assert.deepEqual(parentReceipt.promoted, [child.ref, parent.ref].sort());
  assert.equal(substrate.witnessState(parent.ref), "admitted");
  assert.equal(substrate.witnessState(child.ref), "admitted");
  assert.deepEqual(substrate.admittedWitnessRefs(), [child.ref, parent.ref].sort());
});

test("immutable reception accepts exact duplicates and refuses corruption or different bytes", () => {
  const fixture = baseFixture();
  const substrate = causal(createCausalSubstrate());
  const first = causal(substrate.receive(fixture.token.ref, fixture.token.canonical.text));
  assert.equal(first.disposition, "stored");
  const duplicate = causal(substrate.receive(fixture.token.ref, ' { "mark": "token" } '));
  assert.equal(duplicate.disposition, "existing");
  obstruction(substrate.receive(fixture.token.ref, fixture.claim.canonical.text), "artifact-invalid");
  obstruction(substrate.receive(fixture.token.ref, "{"), "artifact-invalid");
  assert.equal(substrate.sourceArtifacts().length, 1);
});

test("a present non-witness cause and invalid articulation block rather than admit", () => {
  const fixture = baseFixture();
  const substrate = causal(createCausalSubstrate());
  for (const artifact of [fixture.token, fixture.claim, fixture.articulation]) {
    causal(substrate.receive(artifact.ref, artifact.canonical.text));
  }
  const wrongCause = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, {
    causes: [fixture.token.ref],
  })));
  const blockedCause = causal(substrate.receive(wrongCause.ref, wrongCause.canonical.text));
  assert.equal(blockedCause.witnessState, "blocked");
  assert.equal(substrate.obstruction(wrongCause.ref).code, "cause-not-witness");

  const wrongArticulation = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.token.ref)));
  const blockedArticulation = causal(substrate.receive(wrongArticulation.ref, wrongArticulation.canonical.text));
  assert.equal(blockedArticulation.witnessState, "blocked");
  assert.equal(substrate.obstruction(wrongArticulation.ref).code, "articulation-invalid");
});

test("rebuild from immutable source artifacts is independent of reception order and derived indexes", () => {
  const fixture = baseFixture();
  const root = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref)));
  const child = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, { causes: [root.ref] })));
  const sources = [fixture.token, fixture.claim, fixture.articulation, root, child].map(source);
  const forward = causal(rebuildCausalSubstrate(sources));
  const reverse = causal(rebuildCausalSubstrate([...sources].reverse()));
  const shuffled = causal(rebuildCausalSubstrate([sources[3], sources[0], sources[4], sources[2], sources[1]]));
  assert.deepEqual(forward.snapshot(), reverse.snapshot());
  assert.deepEqual(forward.snapshot(), shuffled.snapshot());
  assert.deepEqual(forward.admittedWitnessRefs(), [child.ref, root.ref].sort());
});

test("one source-set closure equals sequential reception without exposing intermediate closures", () => {
  const fixture = baseFixture();
  const root = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref)));
  const child = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, {
    causes: [root.ref],
    referencedArtifacts: [fixture.related.ref],
  })));
  const sources = [
    source(child),
    source(fixture.articulation),
    source(fixture.related),
    source(root),
    source(fixture.claim),
    source(fixture.token),
  ];

  const sequential = causal(createCausalSubstrate());
  for (const artifact of sources) causal(sequential.receive(artifact.ref, artifact.canonicalText));
  const batched = causal(createCausalSubstrate());
  assert.equal(causal(batched.receiveSourceSet(sources)), batched);

  assert.deepEqual(batched.snapshot(), sequential.snapshot());
  assert.deepEqual(batched.admittedWitnessRefs(), [child.ref, root.ref].sort());
});

test("replica source-set union converges without a writer order", () => {
  const fixture = frontierFixture();
  const common = [source(fixture.token), source(fixture.claim), source(fixture.articulation), source(fixture.root)];
  const leftReplica = causal(rebuildCausalSubstrate([...common, source(fixture.left)]));
  const rightReplica = causal(rebuildCausalSubstrate([...common, source(fixture.related), source(fixture.right)]));
  assert.deepEqual(causal(deriveFrontier(leftReplica)).frontier.frontier.tips, [fixture.left.ref]);
  assert.deepEqual(causal(deriveFrontier(rightReplica)).frontier.frontier.tips, [fixture.right.ref]);

  const union = new Map([...leftReplica.sourceArtifacts(), ...rightReplica.sourceArtifacts()].map((artifact) => [artifact.ref, artifact]));
  const leftThenRight = causal(rebuildCausalSubstrate([...union.values()]));
  const rightThenLeft = causal(rebuildCausalSubstrate([...union.values()].reverse()));
  assert.deepEqual(leftThenRight.snapshot(), rightThenLeft.snapshot());
  assert.deepEqual(causal(deriveFrontier(leftThenRight)).frontier.frontier.tips, [fixture.left.ref, fixture.right.ref].sort());
});

function frontierFixture() {
  const fixture = baseFixture();
  const root = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref)));
  const left = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, { causes: [root.ref] })));
  const right = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, { causes: [root.ref], referencedArtifacts: [fixture.related.ref] })));
  const join = causal(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref, { causes: [left.ref, right.ref] })));
  const substrate = causal(rebuildCausalSubstrate([
    source(join), source(right), source(fixture.related), source(fixture.articulation),
    source(fixture.claim), source(left), source(fixture.token), source(root),
  ]));
  return { ...fixture, substrate, root, left, right, join };
}

test("frontier identity is a pure maximal antichain relative to one exact observed closure", () => {
  const fixture = frontierFixture();
  const all = causal(deriveFrontier(fixture.substrate));
  assert.deepEqual(all.frontier.frontier.tips, [fixture.join.ref]);
  assert.deepEqual(Object.keys(all.frontier.frontier).sort(), [
    "causalProfile", "closureRoot", "closureWitnessRoot", "kind", "tips", "version",
  ]);

  const reverse = causal(deriveFrontier(fixture.substrate, [fixture.join.ref, fixture.right.ref, fixture.left.ref, fixture.root.ref]));
  assert.equal(reverse.frontier.ref, all.frontier.ref);
  assert.equal(reverse.closure.ref, all.closure.ref);
  obstruction(deriveFrontier(fixture.substrate, [fixture.left.ref]), "closure-not-downclosed");
  obstruction(deriveFrontier(fixture.substrate, [fixture.root.ref, fixture.root.ref]), "duplicate-reference");
});

test("partial observed frontiers preserve spacelike tips and merge without ordering them", () => {
  const fixture = frontierFixture();
  const left = causal(deriveFrontier(fixture.substrate, [fixture.root.ref, fixture.left.ref]));
  const right = causal(deriveFrontier(fixture.substrate, [fixture.root.ref, fixture.right.ref]));
  assert.deepEqual(left.frontier.frontier.tips, [fixture.left.ref]);
  assert.deepEqual(right.frontier.frontier.tips, [fixture.right.ref]);
  assert.notEqual(left.closure.ref, right.closure.ref);

  const merged = causal(mergeObservedFrontiers(fixture.substrate, left, right));
  assert.deepEqual(merged.frontier.frontier.tips, [fixture.left.ref, fixture.right.ref].sort());
  assert.deepEqual(merged.closure.closure.witnesses, [fixture.left.ref, fixture.right.ref, fixture.root.ref].sort());

  const withJoin = causal(deriveFrontier(fixture.substrate, [fixture.root.ref, fixture.left.ref, fixture.right.ref, fixture.join.ref]));
  assert.deepEqual(withJoin.frontier.frontier.tips, [fixture.join.ref]);
});

test("frontier derivation enforces admitted-set and observed-closure resource boundaries", () => {
  const fixture = frontierFixture();
  const unknown = addressArtifact({ absent: true }).ref;
  obstruction(deriveFrontier(fixture.substrate, [unknown]), "closure-not-admitted");
  obstruction(deriveFrontier(
    fixture.substrate,
    [fixture.root.ref, fixture.left.ref],
    { ...INITIAL_CAUSAL_RESOURCE_ENVELOPE, maxObservedWitnesses: 1 },
  ), "closure-limit");
});

test("causal result predicates distinguish witnesses from obstructions", () => {
  const fixture = baseFixture();
  assert.equal(isCausalWitness(addressWitnessCore(witnessValue(fixture.site.ref, fixture.articulation.ref))), true);
  assert.equal(isCausalWitness(addressWitnessCore({ kind: "wrong" })), false);
});
