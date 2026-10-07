/**
 * The structural-claims register's pure readings: a claim's class in the claim-constraint
 * hierarchy, derived from what it constrains and what its violation does; a claim's worth as an
 * option on the project's schedule; a party's interest from its contacts; engagements through
 * their stages to what the caller is owed. The operation family (./operations.mjs) supplies the
 * records.
 *
 * The hierarchy (cybernetic-postliberalism glossary, "claim-constraint hierarchy"): a claim is
 * structural when it constrains an operation the approving system performs and its violation
 * changes what the system does next (pauses a permit, forces a study to be redone, denies, draws a
 * court in); aspirational when it is consulted but a violation is absorbed; decorative when it
 * constrains no operation. The class is read off the recorded facts, never declared.
 * @packageDocumentation
 */
import { contactOutcomes, folded, groupBy, interestReading as enterpriseInterest, latest, procedure } from "@red-cup-engineering/organizing/enterprise";

/** The operations an approving system performs that a claim can constrain. */
export const OPERATIONS = Object.freeze([
  "zoning-approval", "rezoning-vote", "annexation-vote", "environmental-review", "permit-issuance",
  "utility-commission-docket", "interconnection", "water-appropriation", "tribal-consultation",
  "tribal-council-resolution", "enforcement", "appeal", "court-review",
]);

/** What a violation of the claim does to that operation. */
export const CONSEQUENCES = Object.freeze({
  pause: "structural", redo: "structural", deny: "structural", court: "structural",
  consulted: "aspirational", reported: "aspirational",
  none: "decorative",
});

/** The kinds of claim a party holds against a project. */
export const CLAIM_KINDS = Object.freeze(["consultation", "water", "treaty", "land", "review", "zoning", "annexation", "lawsuit", "moratorium", "docket", "other"]);

/** Project kinds and statuses. */
export const PROJECT_KINDS = Object.freeze(["data-center", "transmission", "pipeline", "generation", "mine", "other"]);
export const PROJECT_STATUSES = Object.freeze(["rumored", "announced", "permitting", "construction", "paused", "downsized", "cancelled", "operating"]);

/** Contact outcomes, and which side of the party's interest each tells. */
export const CONTACT_OUTCOMES = contactOutcomes(["no answer", "voicemail", "wrong number", "not the right office", "callback", "interested", "discovery call set", "not interested", "remove"]);

/** The register's enterprise id in the agency registry and the enterprise store. */
export const CLAIMS_ENTERPRISE = "structural-claims-register";

/** Engagement stages in order; `dead` ends one at any stage. */
export const ENGAGEMENT_STAGES = Object.freeze(["lead", "contacted", "discovery-set", "proposal", "engaged", "delivered", "paid", "dead"]);

/** The register's engagement procedure, as the enterprise layer reads it. */
export const CLAIMS_PROCEDURE = procedure(ENGAGEMENT_STAGES.filter((stage) => stage !== "dead").map((stage) => ({ stage })));

/** Capture outcomes a forecast names for a project by a date. */
export const CAPTURE_OUTCOMES = Object.freeze(["delayed", "downsized", "cancelled", "proceeds"]);

/**
 * A month of delay at a typical 60 MW data-center site costs about $14.2 million (STL Partners,
 * cited in the collapse-aware financial enterprises note): about $7,889 a megawatt a day.
 */
export const DELAY_COST_PER_MW_DAY = 14_200_000 / 30 / 60;

/**
 * A claim's class in the claim-constraint hierarchy, or `unclassified` when the facts that
 * decide it are not yet recorded. A claim that constrains no operation is decorative whatever
 * else is said of it.
 */
export function claimClass({ constrains, consequence } = {}) {
  if (constrains === "none") return "decorative";
  if (constrains === undefined || consequence === undefined) return "unclassified";
  if (!OPERATIONS.includes(constrains)) throw new TypeError(`claim constrains an unknown operation: ${constrains}`);
  if (!Object.hasOwn(CONSEQUENCES, consequence)) throw new TypeError(`unknown consequence: ${consequence}`);
  const reading = CONSEQUENCES[consequence];
  return reading;
}

/**
 * The developer's daily cost of delay for a project: its recorded figure, else its capacity at the
 * per-megawatt rate, else unknown. Unknown is null, never zero.
 */
export function dailyDelayCost(project = {}) {
  if (Number.isFinite(project.dailyDelayCostUsd)) return { usd: project.dailyDelayCostUsd, basis: "recorded" };
  if (Number.isFinite(project.capacityMw)) return { usd: Math.round(project.capacityMw * DELAY_COST_PER_MW_DAY), basis: "capacity at STL Partners' $14.2M per month for 60 MW" };
  return { usd: null, basis: "unknown: record the project's capacity or its daily cost of delay" };
}

/**
 * A claim's worth as an option: the delay it can impose times the developer's daily cost of
 * delay. Only a structural claim carries option value; an unknown factor leaves it unknown.
 */
export function optionValue(claim = {}, project = {}) {
  const klass = claimClass(claim);
  const cost = dailyDelayCost(project);
  if (klass !== "structural") return { class: klass, usd: klass === "unclassified" ? null : 0, basis: klass === "unclassified" ? "unclassified" : `${klass} claims impose no delay` };
  if (!Number.isFinite(claim.delayDays)) return { class: klass, usd: null, basis: "unknown: record the delay the claim can impose" };
  if (cost.usd === null) return { class: klass, usd: null, basis: cost.basis };
  return { class: klass, usd: Math.round(claim.delayDays * cost.usd), delayDays: claim.delayDays, dailyDelayCostUsd: cost.usd, basis: cost.basis };
}

function requestRecord(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

/**
 * Admit one buyer-supplied structural-claim option-value request.
 *
 * The paid boundary is intentionally narrower than the internal readers:
 * enough facts must be supplied to return a numeric option value rather than
 * charging a buyer for an "unknown" result. No enterprise-local project,
 * claimant, contact, or engagement record is read by this product.
 */
export function admitOptionValueRequest(input) {
  const request = requestRecord(input, "option-value request");
  const claim = requestRecord(request.claim, "claim");
  const project = requestRecord(request.project, "project");
  const constrains = claim.constrains;
  const consequence = claim.consequence;
  if (constrains !== "none" && !OPERATIONS.includes(constrains)) throw new TypeError(`claim constrains an unknown operation: ${constrains}`);
  if (!Object.hasOwn(CONSEQUENCES, consequence)) throw new TypeError(`unknown consequence: ${consequence}`);
  if (!Number.isFinite(claim.delayDays) || claim.delayDays < 0) throw new TypeError("claim.delayDays must be a nonnegative finite number");
  if (project.dailyDelayCostUsd !== undefined && (!Number.isFinite(project.dailyDelayCostUsd) || project.dailyDelayCostUsd < 0)) {
    throw new TypeError("project.dailyDelayCostUsd must be a nonnegative finite number when supplied");
  }
  if (project.capacityMw !== undefined && (!Number.isFinite(project.capacityMw) || project.capacityMw < 0)) {
    throw new TypeError("project.capacityMw must be a nonnegative finite number when supplied");
  }
  const hasRecordedCost = Number.isFinite(project.dailyDelayCostUsd);
  const hasCapacity = Number.isFinite(project.capacityMw);
  if (!hasRecordedCost && !hasCapacity) throw new TypeError("project requires nonnegative dailyDelayCostUsd or capacityMw");
  const admitted = Object.freeze({
    claim: Object.freeze({ constrains, consequence, delayDays: claim.delayDays }),
    project: Object.freeze({
      ...(hasRecordedCost ? { dailyDelayCostUsd: project.dailyDelayCostUsd } : {}),
      ...(hasCapacity ? { capacityMw: project.capacityMw } : {}),
    }),
  });
  // Admission must close over the actual reading, not only its individual
  // inputs: finite operands can overflow, which JSON would encode as null.
  const reading = optionValue(admitted.claim, admitted.project);
  if (!Number.isFinite(reading.usd)
    || (reading.dailyDelayCostUsd !== undefined && !Number.isFinite(reading.dailyDelayCostUsd))) {
    throw new TypeError("option value and daily delay cost must remain finite");
  }
  return admitted;
}

/** The stateless x402-ready read over one admitted buyer request. */
export function optionValueRequest(input) {
  const { claim, project } = admitOptionValueRequest(input);
  return optionValue(claim, project);
}

/** A party's interest as the FOUR reading of its contacts: unknown, held, denied, or contested. */
export const interestReading = (contacts = []) => enterpriseInterest(contacts, { outcomes: CONTACT_OUTCOMES, enterprise: CLAIMS_ENTERPRISE });

export { folded, groupBy, latest };

/**
 * An engagement's current state from its stage records, with what its caller is owed: the fee
 * times the caller's share once the engagement is paid, the expected amount before that.
 */
export function engagementState(history) {
  const current = folded(history);
  const fee = Number.isFinite(current.feeUsd) ? current.feeUsd : null;
  const share = Number.isFinite(current.callerShare) ? current.callerShare : null;
  const callerAmount = fee !== null && share !== null ? Math.round(fee * share) : null;
  return Object.freeze({
    ...current,
    stage: latest(history)?.stage,
    callerOwedUsd: current.stage === "paid" || latest(history)?.stage === "paid" ? callerAmount : null,
    callerExpectedUsd: ["dead", "paid"].includes(latest(history)?.stage) ? null : callerAmount,
  });
}
