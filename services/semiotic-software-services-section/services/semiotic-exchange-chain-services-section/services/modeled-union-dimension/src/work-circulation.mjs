import { isCanonicalSha256NiUri } from "@red-cup-engineering/semantic-content-identify-service";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const IDENTIFIER = /^[a-z0-9]+(?:[-.:/][a-z0-9]+)*$/u;

function required(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}
function identifier(value, label) {
  required(value, label);
  if (!IDENTIFIER.test(value)) throw new TypeError(`${label} must be a canonical identifier`);
  return value;
}
function exactNi(value, label) {
  if (!isCanonicalSha256NiUri(value)) throw new TypeError(`${label} must be a canonical SHA-256 ni identifier`);
  return value;
}
function same(left, right) { return String(left).toLowerCase() === String(right).toLowerCase(); }
function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function identify(value, objectKind = `modeled-union-dimension.${value?.type ?? "material"}`) {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}
function uniqueIdentifiers(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`);
  return freeze([...new Set(values.map((value, index) => identifier(value, `${label}[${index}]`)))].sort());
}

/**
 * The canonical carrier for a unit of work.  It carries the whole descent, so a
 * demand is never a detached status-string or a private queue entry.
 */
export function createWorkCarrier({ endeavor, project, milestone, duty, qualification = {}, evidenceNis = [] } = {}) {
  if (endeavor === null || typeof endeavor !== "object" || Array.isArray(endeavor)) throw new TypeError("endeavor must be an object");
  if (project === null || typeof project !== "object" || Array.isArray(project)) throw new TypeError("project must be an object");
  if (milestone === null || typeof milestone !== "object" || Array.isArray(milestone)) throw new TypeError("milestone must be an object");
  if (duty === null || typeof duty !== "object" || Array.isArray(duty)) throw new TypeError("duty must be an object");
  const normalized = freeze({
    type: "UnionWorkCarrier",
    version: 1,
    endeavor: { id: identifier(endeavor.id, "endeavor.id") },
    project: { id: identifier(project.id, "project.id"), endeavor: identifier(project.endeavor, "project.endeavor") },
    milestone: { id: identifier(milestone.id, "milestone.id"), project: identifier(milestone.project, "milestone.project") },
    duty: { id: identifier(duty.id, "duty.id"), office: identifier(duty.office, "duty.office") },
    qualification: {
      ranks: uniqueIdentifiers(qualification.ranks ?? [], "qualification.ranks"),
      cohorts: uniqueIdentifiers(qualification.cohorts ?? [], "qualification.cohorts"),
      capabilities: uniqueIdentifiers(qualification.capabilities ?? [], "qualification.capabilities"),
    },
    evidenceNis: freeze([...new Set(evidenceNis.map((value, index) => exactNi(value, `evidenceNis[${index}]`)))].sort()),
  });
  if (normalized.project.endeavor !== normalized.endeavor.id) throw new Error("project must descend from this endeavor");
  if (normalized.milestone.project !== normalized.project.id) throw new Error("milestone must descend from this project");
  return freeze({ type: "UnionWorkCarrier", value: normalized });
}

function admitWorkCarrier(admission) {
  if (admission?.carrier?.type !== "UnionWorkCarrier") return null;
  const carrier = createWorkCarrier(admission.carrier.value);
  if (identify(carrier, `semiotic-exchange.${carrier.type}`) !== admission.contentNi) throw new Error("UnionWorkCarrier admission does not match its canonical identity");
  return freeze({ carrierNi: admission.contentNi, admissionReceiptNi: admission.id, work: carrier.value });
}

function qualificationFor(actor, work, standings) {
  const qualifications = [];
  for (const standing of standings) {
    const claim = standing.object;
    if (claim?.type !== "WorkQualificationClaim" || claim.version !== 1 || !standing.support?.positive || !same(claim.actor, actor)) continue;
    identifier(claim.office, "WorkQualificationClaim.office");
    const rank = identifier(claim.rank, "WorkQualificationClaim.rank");
    const cohorts = uniqueIdentifiers(claim.cohorts ?? [], "WorkQualificationClaim.cohorts");
    const duties = uniqueIdentifiers(claim.duties ?? [], "WorkQualificationClaim.duties");
    const capabilities = uniqueIdentifiers(claim.capabilities ?? [], "WorkQualificationClaim.capabilities");
    qualifications.push(freeze({ evidenceNi: standing.objectNi, rank, cohorts, duties, capabilities, office: claim.office }));
  }
  const required = work.qualification;
  const match = qualifications.find((value) => value.office === work.duty.office
    && value.duties.includes(work.duty.id)
    && (required.ranks.length === 0 || required.ranks.includes(value.rank))
    && required.cohorts.every((cohort) => value.cohorts.includes(cohort))
    && required.capabilities.every((capability) => value.capabilities.includes(capability)));
  return freeze({ qualified: Boolean(match), evidence: match ?? null });
}

function workAttempts(demand, work, offers, standings) {
  const attempts = [];
  for (const standing of standings) {
    const attempt = standing.object;
    if (attempt?.type !== "WorkAssignmentAttemptReceipt" || attempt.version !== 1 || !same(attempt.demand, demand.id)) continue;
    if (!same(attempt.duty, work.duty.id) || !same(attempt.office, work.duty.office)) throw new Error("work assignment attempt differs from its work carrier");
    if (!["refused", "completed"].includes(attempt.outcome)) throw new TypeError("work assignment outcome must be refused or completed");
    const offer = offers.find((candidate) => same(candidate.id, attempt.offer));
    if (!offer || !same(offer.demand, demand.id) || !same(offer.controller, attempt.actor)) throw new Error("work assignment attempt is not grounded in a witnessed offer");
    if (attempt.outcome === "refused") {
      exactNi(attempt.residueNi, "WorkAssignmentAttemptReceipt.residueNi");
      if (!standing.support.negative) throw new Error("work refusal requires negative federation support");
    } else {
      exactNi(attempt.outputReceiptNi, "WorkAssignmentAttemptReceipt.outputReceiptNi");
      if (!/^0x[0-9a-fA-F]{64}$/u.test(attempt.result ?? "") || !standing.support.positive) throw new Error("completed work requires positive result support");
    }
    attempts.push(freeze({ ...attempt, evidenceNi: standing.objectNi, federationCarrierAdmissionReceiptNis: standing.witnesses, charge: standing.support.value }));
  }
  return freeze(attempts);
}

/** Produce a reusable, unraised SXC demand carrier from a witnessed work refusal. */
export function deriveCultivationDemandCarrier({ workLocus, refusal }) {
  if (workLocus?.type !== "UnionWorkLocus") throw new TypeError("workLocus must be a UnionWorkLocus");
  if (refusal?.outcome !== "refused") throw new TypeError("refusal must be a refused WorkAssignmentAttemptReceipt");
  exactNi(refusal.residueNi, "refusal.residueNi");
  return freeze({ type: "UnionCultivationDemandCarrier", value: freeze({
    type: "UnionCultivationDemandCarrier", version: 1,
    parentWorkLocus: workLocus.id,
    endeavor: workLocus.endeavor,
    project: workLocus.project,
    milestone: workLocus.milestone,
    requiredOffice: workLocus.duty.office,
    requiredDuty: workLocus.duty.id,
    qualification: workLocus.qualification,
    residueNi: refusal.residueNi,
    sourceAttemptNi: refusal.evidenceNi,
    market: "union-officer-academy/formation-lianqun",
  }) });
}

/**
 * Interpret admitted work carriers and federated evidence over witnessed SXC
 * moves.  This is the Rendanheyi path: user demand descends into an office duty;
 * Huidu Guanli stays visible as held positive/negative evidence, never a queue.
 */
export function projectWorkCirculation({ admissions, demands, offers, federationHistory }) {
  const carriers = new Map();
  for (const admission of admissions.values()) {
    const admitted = admitWorkCarrier(admission);
    if (admitted !== null) carriers.set(admitted.carrierNi, admitted);
  }
  const loci = [];
  const relations = [];
  for (const demand of demands) {
    const admitted = carriers.get(demand.raised.carrierNi);
    if (!admitted) continue;
    const work = admitted.work;
    const attempts = workAttempts(demand, work, offers, federationHistory);
    const completed = attempts.find((attempt) => attempt.outcome === "completed" && demand.settlement && same(attempt.result, demand.settlement.result) && same(attempt.offer, demand.purchase?.offer));
    const refusals = attempts.filter((attempt) => attempt.outcome === "refused");
    const locus = freeze({
      type: "UnionWorkLocus", id: demand.id, demandNi: admitted.carrierNi, workCarrierAdmissionReceiptNi: admitted.admissionReceiptNi,
      endeavor: work.endeavor, project: work.project, milestone: work.milestone, duty: work.duty, qualification: work.qualification,
      phase: completed ? "settled" : demand.purchase ? "engaged" : "open",
      grayDegree: completed ? "stable" : refusals.length > 0 ? "active" : "absurd",
      attempts,
      cultivation: freeze(refusals.map((refusal) => freeze({ type: "UnionCultivationDemandLocus", id: identify(deriveCultivationDemandCarrier({ workLocus: { type: "UnionWorkLocus", id: demand.id, endeavor: work.endeavor, project: work.project, milestone: work.milestone, duty: work.duty, qualification: work.qualification }, refusal })), sourceAttemptNi: refusal.evidenceNi, phase: "ready-to-raise", carrier: deriveCultivationDemandCarrier({ workLocus: { type: "UnionWorkLocus", id: demand.id, endeavor: work.endeavor, project: work.project, milestone: work.milestone, duty: work.duty, qualification: work.qualification }, refusal }) }))),
    });
    loci.push(locus);
    relations.push(freeze({ type: "realizesEndeavor", from: `work:${demand.id}`, to: `endeavor:${work.endeavor.id}` }));
    relations.push(freeze({ type: "belongsToProject", from: `work:${demand.id}`, to: `project:${work.project.id}` }));
    relations.push(freeze({ type: "advancesMilestone", from: `work:${demand.id}`, to: `milestone:${work.milestone.id}` }));
    relations.push(freeze({ type: "borneAsDuty", from: `work:${demand.id}`, to: `office:${work.duty.office}/duty:${work.duty.id}` }));
  }
  const milestones = new Map(), projects = new Map(), endeavors = new Map();
  for (const locus of loci) {
    const milestone = milestones.get(locus.milestone.id) ?? { ...locus.milestone, workIds: [] };
    if (milestone.project !== locus.project.id) throw new Error("one milestone cannot belong to two projects");
    milestone.workIds.push(locus.id); milestones.set(milestone.id, milestone);
    const project = projects.get(locus.project.id) ?? { ...locus.project, milestoneIds: [] };
    if (project.endeavor !== locus.endeavor.id) throw new Error("one project cannot belong to two endeavors");
    if (!project.milestoneIds.includes(locus.milestone.id)) project.milestoneIds.push(locus.milestone.id);
    projects.set(project.id, project);
    endeavors.set(locus.endeavor.id, { ...locus.endeavor });
  }
  function aggregatePhase(children) {
    if (children.length > 0 && children.every((child) => child.phase === "settled")) return freeze({ phase: "settled", grayDegree: "stable" });
    if (children.some((child) => child.phase === "engaged")) return freeze({ phase: "engaged", grayDegree: children.some((child) => child.grayDegree === "active") ? "active" : "absurd" });
    return freeze({ phase: "open", grayDegree: children.some((child) => child.grayDegree === "active") ? "active" : "absurd" });
  }
  const milestoneLoci = [...milestones.values()].sort((a, b) => a.id.localeCompare(b.id)).map((milestone) => freeze({ type: "UnionMilestoneLocus", id: milestone.id, project: milestone.project, workIds: freeze([...milestone.workIds].sort()), ...aggregatePhase(loci.filter((locus) => milestone.workIds.includes(locus.id))) }));
  const projectLoci = [...projects.values()].sort((a, b) => a.id.localeCompare(b.id)).map((project) => freeze({ type: "UnionProjectLocus", id: project.id, endeavor: project.endeavor, milestoneIds: freeze([...project.milestoneIds].sort()), ...aggregatePhase(milestoneLoci.filter((locus) => project.milestoneIds.includes(locus.id))) }));
  const endeavorLoci = [...endeavors.values()].sort((a, b) => a.id.localeCompare(b.id)).map((endeavor) => freeze({ type: "UnionEndeavorLocus", id: endeavor.id, projectIds: freeze(projectLoci.filter((project) => project.endeavor === endeavor.id).map((project) => project.id).sort()), ...aggregatePhase(projectLoci.filter((project) => project.endeavor === endeavor.id)) }));
  function qualification(actor, demandId) {
    const locus = loci.find((value) => same(value.id, demandId));
    return locus === undefined ? null : qualificationFor(actor, locus, federationHistory);
  }
  return freeze({ loci: freeze([...loci, ...milestoneLoci, ...projectLoci, ...endeavorLoci]), workLoci: freeze(loci), relations: freeze(relations), qualification });
}
