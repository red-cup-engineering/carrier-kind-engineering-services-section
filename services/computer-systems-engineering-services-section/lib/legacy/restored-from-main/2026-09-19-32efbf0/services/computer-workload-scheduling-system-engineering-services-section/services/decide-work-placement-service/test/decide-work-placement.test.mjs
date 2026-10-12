import assert from "node:assert/strict";
import test from "node:test";
import { admitTypedWorkDemand, admitWorkPlacementObservationField, decideWorkPlacement } from "@red-cup-engineering/decide-work-placement-service";

const q = (numerator, denominator = 1) => ({ numerator: String(numerator), denominator: String(denominator) });
const credit = (amount) => ({ kind: "credit", asset: "urn:credit:resolution", unit: "milliquanta", amount: q(amount) });
const cash = (amount) => ({ kind: "currency", asset: "urn:currency:usd", unit: "cent", amount: q(amount) });
const resource = (amount) => ({ resource: "provider-call", unit: "call", amount: q(amount) });
const quota = (amount, asset = "urn:quota:subscription-a") => ({ resource: "inference-quota", asset, unit: "call", amount: q(amount) });
const currencyDimension = { kind: "currency", asset: "urn:currency:usd", unit: "cent" };
const creditDimension = { kind: "credit", asset: "urn:credit:resolution", unit: "milliquanta" };

function demand(overrides = {}) {
  return {
    type: "TypedWorkDemand",
    id: "urn:demand:one",
    taskClass: "bounded-work",
    principal: "urn:actor:customer",
    requiredCapabilities: ["extract", "structured-output"],
    requiredQualityTiers: [],
    requiredEffects: ["read-source", "produce-result"],
    requiredExecutionClasses: ["bounded-compute"],
    idempotence: "idempotent",
    context: {
      identity: "ni:///sha-256;context",
      authorityScope: "urn:scope:public",
      freshnessIdentity: "urn:freshness:immutable",
      dataConstraints: ["public-data-only"],
      custodyConstraints: ["no-retention"],
    },
    outputContract: { identity: "ni:///sha-256;schema" },
    difficulty: q(1, 2),
    measures: { sourceCharacters: 100, outputUnits: 20 },
    routePolicy: {
      preferenceOrder: [["consideration"], ["acceptance-probability"], ["latency", "resources"]],
      considerationPreference: [],
      considerationCeilings: [],
      reuse: "forbid",
      unknownObservations: "choice-required",
    },
    ...overrides,
  };
}
function offer(id, amount, overrides = {}) {
  return {
    type: "NormalizedWorkOffer",
    id,
    provider: "urn:provider:" + id.slice("urn:offer:".length),
    executionClass: "bounded-compute",
    operation: "perform",
    implementationIdentity: "ni:///sha-256;implementation",
    capabilities: ["extract", "structured-output"],
    qualityTiers: ["bounded"],
    authorityScopes: ["urn:scope:public"],
    effects: ["read-source", "produce-result"],
    idempotence: ["idempotent"],
    dataConstraints: ["public-data-only"],
    custodyConstraints: ["no-retention"],
    outputContractIdentities: ["ni:///sha-256;schema"],
    availability: "available",
    availableCapacity: 1,
    bounds: { maximumDifficulty: q(1), maximumSourceCharacters: 1000, maximumOutputUnits: 100 },
    consideration: [credit(amount)],
    declaredResources: [resource(1)],
    semantics: { reuse: "none" },
    ...overrides,
  };
}
function attempt(offerId, suffix, outcome, latency, calls = 1) {
  return { type: "WorkPlacementObservation", kind: "attempt", receipt: "urn:receipt:" + suffix, offerId, taskClass: "bounded-work", outcome, latency: { unit: "millisecond", amount: q(latency) }, resources: [resource(calls)] };
}

test("replayed distributed observations cannot inflate acceptance or resource counts", () => {
  const offers = [offer("urn:offer:one", 1)];
  const observation = attempt(offers[0].id, "one", "accepted", 10);
  const first = decideWorkPlacement({ demand: demand(), offers, observations: [observation] });
  const replay = decideWorkPlacement({ demand: demand(), offers, observations: [observation, structuredClone(observation)] });
  assert.deepEqual(replay, first);
  assert.equal(replay.selected.observationBasis.attempts, 1);
});

test("contradictory receipts remain addressable and cannot authorize another provider invocation", () => {
  const offers = [offer("urn:offer:one", 1)];
  const accepted = attempt(offers[0].id, "one", "accepted", 10);
  const refused = { ...accepted, outcome: "refused" };
  const field = admitWorkPlacementObservationField([accepted, refused]);
  assert.equal(field.statements.length, 2);
  const result = decideWorkPlacement({ demand: demand(), offers, observations: [accepted, refused] });
  assert.equal(result.type, "WorkPlacementRefusal");
  assert.equal(result.selected, null);
  assert.deepEqual(new Set(result.refusals[0].reasons), new Set(field.statements.map(item => "contested-observation:" + item.id)));
  assert.deepEqual(decideWorkPlacement({ demand: demand(), offers, observations: [refused, accepted] }), result);
});

test("public admission returns one TypedWorkDemand without placing it", () => {
  const candidate = demand();
  const admitted = admitTypedWorkDemand(candidate);
  assert.equal(admitted.type, "TypedWorkDemand");
  assert.equal(admitted.id, candidate.id);
  assert.equal("selected" in admitted, false);
  assert.equal("attemptPlan" in admitted, false);
});

test("public admission normalizes optional TypedWorkDemand fields", () => {
  const candidate = demand();
  delete candidate.requiredQualityTiers;
  delete candidate.measures;
  delete candidate.routePolicy.unknownObservations;
  delete candidate.routePolicy.considerationPreference;
  delete candidate.routePolicy.considerationCeilings;
  delete candidate.routePolicy.resourceCeilings;
  const admitted = admitTypedWorkDemand(candidate);
  assert.deepEqual(admitted.requiredQualityTiers, []);
  assert.deepEqual(admitted.measures, {});
  assert.equal(admitted.routePolicy.unknownObservations, "choice-required");
  assert.deepEqual(admitted.routePolicy.considerationPreference, []);
  assert.deepEqual(admitted.routePolicy.considerationCeilings, []);
  assert.deepEqual(admitted.routePolicy.resourceCeilings, []);
});

test("public admission refuses a malformed TypedWorkDemand", () => {
  assert.throws(
    () => admitTypedWorkDemand(demand({ requiredEffects: ["read-source", "read-source"] })),
    { name: "TypeError", message: "demand.requiredEffects must not contain duplicates" },
  );
});

test("placement consumes the same normalized demand returned by public admission", () => {
  const candidate = demand();
  delete candidate.requiredQualityTiers;
  delete candidate.measures;
  delete candidate.routePolicy.unknownObservations;
  delete candidate.routePolicy.considerationPreference;
  delete candidate.routePolicy.considerationCeilings;
  delete candidate.routePolicy.resourceCeilings;
  const offers = [offer("urn:offer:admitted", 1)];
  assert.deepEqual(
    decideWorkPlacement({ demand: candidate, offers }),
    decideWorkPlacement({ demand: admitTypedWorkDemand(candidate), offers }),
  );
});

test("exact feasibility precedes consideration preference", () => {
  const result = decideWorkPlacement({ demand: demand(), offers: [offer("urn:offer:cheap-incomplete", 1, { capabilities: ["extract"] }), offer("urn:offer:complete", 8)] });
  assert.equal(result.selected.offerId, "urn:offer:complete");
  assert.deepEqual(result.refusals, [{ offerId: "urn:offer:cheap-incomplete", reasons: ["missing-capability:structured-output"] }]);
});

test("required implementation identity is an exact feasibility constraint before price ranking", () => {
  const foreign = offer("urn:offer:cheap-foreign-implementation", 0, {
    implementationIdentity: "ni:///sha-256;foreign-implementation",
  });
  const required = offer("urn:offer:required-implementation", 9, {
    implementationIdentity: "ni:///sha-256;required-implementation",
  });
  const result = decideWorkPlacement({
    demand: demand({ requiredImplementationIdentity: required.implementationIdentity }),
    offers: [foreign, required],
  });
  assert.equal(result.selected.offerId, required.id);
  assert.deepEqual(result.refusals, [{
    offerId: foreign.id,
    reasons: ["implementation-identity-not-required:ni:///sha-256;foreign-implementation"],
  }]);
  assert.ok(result.rationale.includes("required-implementation-identity-is-an-exact-feasibility-constraint"));
});

test("an unavailable required implementation has no fallback placement", () => {
  const foreign = offer("urn:offer:only-foreign-implementation", 0, {
    implementationIdentity: "ni:///sha-256;foreign-implementation",
  });
  const result = decideWorkPlacement({
    demand: demand({ requiredImplementationIdentity: "ni:///sha-256;required-implementation" }),
    offers: [foreign],
  });
  assert.equal(result.type, "WorkPlacementRefusal");
  assert.equal(result.selected, null);
  assert.deepEqual(result.attemptPlan, []);
  assert.deepEqual(result.refusals, [{
    offerId: foreign.id,
    reasons: ["implementation-identity-not-required:ni:///sha-256;foreign-implementation"],
  }]);
});

test("implementation identity demand admission rejects missing or malformed bindings", () => {
  assert.throws(
    () => admitTypedWorkDemand(demand({ requiredImplementationIdentity: "" })),
    { name: "TypeError", message: "demand.requiredImplementationIdentity must be nonempty text" },
  );
  assert.throws(
    () => admitTypedWorkDemand(demand({ requiredImplementationIdentity: 1 })),
    { name: "TypeError", message: "demand.requiredImplementationIdentity must be nonempty text" },
  );
});

test("every required effect must be supported", () => {
  const result = decideWorkPlacement({ demand: demand(), offers: [offer("urn:offer:one-effect", 1, { effects: ["read-source"] })] });
  assert.equal(result.type, "WorkPlacementRefusal");
  assert.deepEqual(result.refusals[0].reasons, ["effect-not-supported:produce-result"]);
});

test("execution class is an exact feasibility constraint", () => {
  const result = decideWorkPlacement({ demand: demand(), offers: [offer("urn:offer:wrong-class", 1, { executionClass: "customer-session" })] });
  assert.deepEqual(result.refusals[0].reasons, ["execution-class-not-admitted:customer-session"]);
});

test("data and custody constraints both refuse incompatible offers", () => {
  const result = decideWorkPlacement({ demand: demand(), offers: [offer("urn:offer:incompatible", 1, { dataConstraints: [], custodyConstraints: [] })] });
  assert.deepEqual(result.refusals[0].reasons, ["data-constraint-not-satisfied:public-data-only", "custody-constraint-not-satisfied:no-retention"]);
});

test("a hard zero currency ceiling rejects positive cash and admits canonical zero cash", () => {
  const policy = { ...demand().routePolicy, considerationCeilings: [{ ...currencyDimension, amount: q(0) }] };
  const positive = offer("urn:offer:positive-cash", 0, { consideration: [cash(1)] });
  const zero = offer("urn:offer:zero-cash", 0, { consideration: [cash(0)] });
  const result = decideWorkPlacement({ demand: demand({ routePolicy: policy }), offers: [positive, zero] });
  assert.equal(result.selected.offerId, zero.id);
  assert.deepEqual(result.refusals, [{ offerId: positive.id, reasons: ["consideration-exceeds-ceiling:currency:urn:currency:usd:cent"] }]);
});

test("unlike consideration remains incomparable and requires customer choice", () => {
  const result = decideWorkPlacement({ demand: demand(), offers: [offer("urn:offer:credit", 2), offer("urn:offer:currency", 1, { consideration: [cash(1)] })] });
  assert.equal(result.disposition, "choice-required");
  assert.equal(result.selected, null);
  assert.equal(result.attemptPlan[0].relation, "incomparable");
  assert.equal(result.attemptPlan[0].implicitFallbackPermitted, false);
  assert.equal(result.attemptPlan[0].speculativeExecutionPermitted, false);
});

test("customer consideration ordering compares unlike assets without conversion", () => {
  const routePolicy = { ...demand().routePolicy, considerationPreference: [[currencyDimension], [creditDimension]] };
  const result = decideWorkPlacement({ demand: demand({ routePolicy }), offers: [offer("urn:offer:credit", 1), offer("urn:offer:currency", 99, { consideration: [cash(99)] })] });
  assert.equal(result.selected.offerId, "urn:offer:currency");
});

test("observed acceptance latency and resources drive exact Pareto placement", () => {
  const slow = offer("urn:offer:slow", 4);
  const fast = offer("urn:offer:fast", 4);
  const observations = [attempt(slow.id, "slow-1", "accepted", 100, 2), attempt(slow.id, "slow-2", "accepted", 80, 2), attempt(fast.id, "fast-1", "accepted", 20, 1), attempt(fast.id, "fast-2", "accepted", 40, 1)];
  const result = decideWorkPlacement({ demand: demand(), offers: [slow, fast], observations });
  assert.equal(result.selected.offerId, fast.id);
  assert.deepEqual(result.selected.observationBasis, { attempts: 2, accepted: 2, receipts: ["urn:receipt:fast-1", "urn:receipt:fast-2"] });
});

test("accepted-result reuse requires an exact full demand and implementation coordinate match", () => {
  const reusable = offer("urn:offer:reusable", 9, { semantics: { reuse: "exact-accepted-result" } });
  const fresh = offer("urn:offer:fresh", 1);
  const reuseDemand = demand({ routePolicy: { ...demand().routePolicy, reuse: "prefer-exact-accepted" } });
  const observation = { type: "WorkPlacementObservation", kind: "accepted-result", receipt: "urn:receipt:reuse-observation", resultReceipt: "urn:receipt:original-result", offerId: reusable.id, taskClass: "bounded-work", demand: reuseDemand, implementationIdentity: reusable.implementationIdentity, outcome: "accepted", reuse: "permitted" };
  const reused = decideWorkPlacement({ demand: reuseDemand, offers: [reusable, fresh], observations: [observation] });
  assert.equal(reused.selected.offerId, reusable.id);
  assert.equal(reused.selected.mode, "reuse-exact-accepted-result");
  const changedCoordinates = demand({ ...reuseDemand, context: { ...reuseDemand.context, freshnessIdentity: "urn:freshness:new" } });
  const notReused = decideWorkPlacement({ demand: changedCoordinates, offers: [reusable, fresh], observations: [observation] });
  assert.equal(notReused.selected.offerId, fresh.id);
  assert.equal(notReused.selected.mode, "execute");
});

test("premium is ordinary quality policy and provider names have no branch", () => {
  const premium = offer("urn:offer:arbitrary", 8, { provider: "urn:provider:not-model-named", executionClass: "customer-session", qualityTiers: ["premium-review"] });
  const ordinary = offer("urn:offer:name-contains-model", 1, { provider: "urn:provider:model-name", executionClass: "customer-session", qualityTiers: ["bounded"] });
  const premiumDemand = demand({ requiredQualityTiers: ["premium-review"], requiredExecutionClasses: ["customer-session"] });
  const result = decideWorkPlacement({ demand: premiumDemand, offers: [ordinary, premium] });
  assert.equal(result.selected.provider, "urn:provider:not-model-named");
  assert.equal(result.selected.executionClass, "customer-session");
});

test("no feasible placement returns a typed refusal", () => {
  const result = decideWorkPlacement({ demand: demand(), offers: [offer("urn:offer:none", 1, { availableCapacity: 0 })] });
  assert.equal(result.type, "WorkPlacementRefusal");
  assert.equal(result.disposition, "refused");
  assert.equal(result.selected, null);
  assert.deepEqual(result.attemptPlan, []);
});

test("selected output preserves provider execution class normalized offer plan evidence refusals and rationale", () => {
  const feasible = offer("urn:offer:kept", 3);
  const refused = offer("urn:offer:refused", 1, { availableCapacity: 0 });
  const result = decideWorkPlacement({ demand: demand(), offers: [refused, feasible] });
  assert.equal(result.selected.provider, feasible.provider);
  assert.equal(result.selected.executionClass, feasible.executionClass);
  assert.deepEqual(result.selected.offer, feasible);
  assert.equal(result.selected.mode, "execute");
  assert.deepEqual(result.selected.observationBasis, { attempts: 0, accepted: 0, receipts: [] });
  assert.equal(result.attemptPlan[0].execution, "explicit-sequential-authority-required");
  assert.equal(result.attemptPlan[0].implicitFallbackPermitted, false);
  assert.equal(result.refusals.length, 1);
  assert.ok(result.rationale.length > 0);
});


test("hard exact resource ceilings reject resource consumption above customer policy", () => {
  const routePolicy = { ...demand().routePolicy, resourceCeilings: [quota(0)] };
  const result = decideWorkPlacement({ demand: demand({ routePolicy }), offers: [offer("urn:offer:quota-above-ceiling", 0, { consideration: [cash(0)], declaredResources: [quota(1)], availableResources: [quota(10)] })] });
  assert.equal(result.type, "WorkPlacementRefusal");
  assert.deepEqual(result.refusals[0].reasons, ["resource-exceeds-ceiling:inference-quota:urn:quota:subscription-a:call"]);
});

test("nonfungible equally scarce subscription quotas remain incomparable at zero marginal cash", () => {
  const first = offer("urn:offer:subscription-a", 0, { consideration: [cash(0)], declaredResources: [quota(1, "urn:quota:subscription-a")], availableResources: [quota(4, "urn:quota:subscription-a")] });
  const second = offer("urn:offer:subscription-b", 0, { consideration: [cash(0)], declaredResources: [quota(1, "urn:quota:subscription-b")], availableResources: [quota(4, "urn:quota:subscription-b")] });
  const result = decideWorkPlacement({ demand: demand(), offers: [first, second] });
  assert.equal(result.disposition, "choice-required");
  assert.equal(result.attemptPlan[0].relation, "incomparable");
  assert.deepEqual(result.attemptPlan[0].offers.map(({ plannedResources }) => plannedResources), [[quota(1, "urn:quota:subscription-a")], [quota(1, "urn:quota:subscription-b")]]);
});

test("an exhausted exact quota refuses the offer before Pareto placement", () => {
  const exhausted = offer("urn:offer:exhausted", 0, { consideration: [cash(0)], declaredResources: [quota(1)], availableResources: [quota(0)] });
  const result = decideWorkPlacement({ demand: demand(), offers: [exhausted] });
  assert.equal(result.type, "WorkPlacementRefusal");
  assert.deepEqual(result.refusals[0].reasons, ["resource-quota-exhausted:inference-quota:urn:quota:subscription-a:call"]);
});

test("account-window availability is evaluated at the supplied instant and unknown capacity can be refused", () => {
  const candidate = offer("urn:offer:account-window", 0, { consideration: [cash(0)], declaredResources: [quota(1)] });
  const routePolicy = { ...demand().routePolicy, unknownAvailability: "refuse" };
  const unknown = decideWorkPlacement({ demand: demand({ routePolicy }), offers: [candidate], evaluatedAt: "2026-09-07T03:23:00Z" });
  assert.deepEqual(unknown.refusals[0].reasons, ["availability-evidence-unknown"]);
  const evidence = { offerId: candidate.id, providerIdentity: candidate.provider, accountIdentity: "urn:account:fixture", windowIdentity: "urn:window:fixture", observedAt: "2026-09-07T03:00:00Z", validUntil: "2026-09-07T03:23:00Z", availableResources: [quota(4)] };
  const expired = decideWorkPlacement({ demand: demand({ routePolicy }), offers: [{ ...candidate, availabilityEvidence: evidence }], evaluatedAt: "2026-09-07T03:23:00Z" });
  assert.deepEqual(expired.refusals[0].reasons, ["availability-evidence-not-current"]);
});

test("availability account identity prevents another account's observations from changing this offer metrics", () => {
  const candidate = offer("urn:offer:account-isolation", 0, {
    consideration: [cash(0)], declaredResources: [quota(1)],
    availabilityEvidence: { offerId: "urn:offer:account-isolation", providerIdentity: "urn:provider:account-isolation", accountIdentity: "urn:account:a", windowIdentity: "urn:window:a", observedAt: "2026-09-07T03:00:00Z", availableResources: [quota(4)] },
  });
  const result = decideWorkPlacement({ demand: demand(), offers: [candidate], observations: [{ ...attempt(candidate.id, "other-account", "accepted", 1), accountIdentity: "urn:account:b" }], evaluatedAt: "2026-09-07T03:23:00Z" });
  assert.equal(result.selected.observationBasis.attempts, 0);
});

test("exact deterministic result reuse plans canonical zero inference quota", () => {
  const reusable = offer("urn:offer:deterministic-reuse", 0, { consideration: [cash(0)], declaredResources: [quota(1)], availableResources: [quota(1)], semantics: { reuse: "exact-accepted-result" } });
  const reuseDemand = demand({ routePolicy: { ...demand().routePolicy, reuse: "prefer-exact-accepted" } });
  const observation = { type: "WorkPlacementObservation", kind: "accepted-result", receipt: "urn:receipt:deterministic-observation", resultReceipt: "urn:receipt:deterministic-result", offerId: reusable.id, taskClass: "bounded-work", demand: reuseDemand, implementationIdentity: reusable.implementationIdentity, outcome: "accepted", reuse: "permitted" };
  const result = decideWorkPlacement({ demand: reuseDemand, offers: [reusable], observations: [observation] });
  assert.equal(result.selected.mode, "reuse-exact-accepted-result");
  assert.deepEqual(result.selected.plannedResources, [quota(0)]);
});
