/**
 * contracts/contract-report - accountability reports and observations over
 * a relational contract: energetics, phase, lens, evidence policy, validity,
 * move, predicate role, and their observed/outcome variants.
 */

import { phaseEvidence, phaseEvidenced } from "./phase.mjs";
import {
  boundaryParts,
  instrumentContract,

} from "./instrument.mjs";
import {
  semanticJudgment, semanticJudgmentWitnessed, semanticJudgmentAspectWitnessed, fiberAspectWitnessed,

} from "./judgment.mjs";
import {

  canonicalContractValue, contractFingerprint, contractCoordinates, contractExposure, contractExposureReport, normalizedToken,

} from "./contract.mjs";

/** Decidable judgment that a conformance/use/bridge/brick row is a contract-governed relation, not loose metadata. */

export function instrumentRelationReport(
  spec,
) {
  return Object.freeze({
    kind: "metroplat.instrument-relation-report",
    ...spec,
    evidence: Object.freeze([...spec.evidence]),
    missing: Object.freeze([...spec.missing]),
    aspects: Object.freeze([...spec.aspects]),
  });
}

function relationTargetKindCompatible(relation) {
  switch (relation.relation) {
    case "conforms-with":
      return relation.targetKind === "standard" || relation.targetKind === "protocol" || relation.targetKind === "proof";
    case "uses":
    case "bridges":
      return relation.targetKind === "schema" || relation.targetKind === "codec" || relation.targetKind === "ledger"
        || relation.targetKind === "protocol" || relation.targetKind === "runtime";
    case "bricks":
      return relation.targetKind === "law" || relation.targetKind === "proof";
  }
}

function instrumentRelationTargetAccounted(
  instrument,
  relation,
) {
  const presentationTargets = instrument.presentations.flatMap((presentation) => [
    presentation.id, presentation.address, presentation.admissibility.id, ...presentation.invariants,
  ]);
  const projectionTargets = instrument.projections.flatMap((projection) => [
    projection.id, projection.implementation, projection.refines, ...projection.preserves,
    ...(projection.lens === undefined ? [] : [projection.lens]),
    ...(projection.evidencePolicy === undefined ? [] : [projection.evidencePolicy]),
  ]);
  const evidenceTargets = relation.evidence;
  if (relation.targetKind === "schema") {
    return presentationTargets.includes(relation.target) || projectionTargets.includes(relation.target);
  }
  if (relation.targetKind === "codec") {
    if (relation.relation === "bridges" && evidenceTargets.length > 0 && relation.preserves.length > 0) return true;
    return projectionTargets.some((target) => target.includes(relation.target) || relation.target.includes(target))
      || evidenceTargets.some((evidence) => evidence.includes("codec") || evidence.includes("codecs") || evidence.includes(relation.target));
  }
  if (relation.targetKind === "protocol") {
    return relation.target === relation.surface || evidenceTargets.length > 0
      || projectionTargets.some((target) => target.includes("protocol"));
  }
  return relation.target.length > 0 && evidenceTargets.length > 0;
}

/** Judge a conformance/use/bridge/brick relation through the same contract-report fiber as its Γ, Φ, Λ, and Ω. */
export function instrumentRelationReportFor(
  instrument,
  relation,
) {
  const contract = instrumentContract(instrument);
  const instrumentMatched = relation.instrument === instrument.id;
  const contractMatched = relation.contract === contract.id;
  const relationKindCompatible = relationTargetKindCompatible(relation);
  const targetAccounted = instrumentRelationTargetAccounted(instrument, relation);
  const preservationAccounted = relation.preserves.length > 0;
  const evidenceAccounted = relation.evidence.length > 0;
  const lensAccounted = semanticJudgmentWitnessed(contractLensReport(contract).judgment) && instrument.lens.evidenceRequired;
  const evidencePolicyAccounted = semanticJudgmentWitnessed(contractEvidencePolicyReport(contract).judgment)
    && (!instrument.evidencePolicy.required || evidenceAccounted);
  const bridgeEvidenced = relation.relation !== "bridges" || (evidencePolicyAccounted && preservationAccounted && evidenceAccounted);
  const brickLawAccounted = relation.relation !== "bricks" || relation.targetKind === "law" || relation.targetKind === "proof";
  const missing = [
    ...(instrumentMatched ? [] : ["instrument"]),
    ...(contractMatched ? [] : ["contract"]),
    ...(relationKindCompatible ? [] : ["relation-target-kind"]),
    ...(targetAccounted ? [] : ["target"]),
    ...(preservationAccounted ? [] : ["preservation"]),
    ...(evidenceAccounted ? [] : ["evidence"]),
    ...(lensAccounted ? [] : ["lens"]),
    ...(evidencePolicyAccounted ? [] : ["evidence-policy"]),
    ...(bridgeEvidenced ? [] : ["bridge-evidence"]),
    ...(brickLawAccounted ? [] : ["brick-law"]),
  ];
  return instrumentRelationReport({
    id: `${relation.id}.report`, relation: relation.id, instrument: instrument.id, contract: contract.id,
    ...(relation.surface === undefined ? {} : { surface: relation.surface }),
    relationKind: relation.relation, target: relation.target, targetKind: relation.targetKind,
    material: instrument.material.id, phase: instrument.phase.id, lens: instrument.lens.id,
    evidencePolicy: instrument.evidencePolicy.id,
    evidence: Object.freeze([
      `relation:${relation.id}`, `instrument:${instrument.id}`, `contract:${contract.id}`,
      `material:${instrument.material.id}`, `phase:${instrument.phase.id}`, `lens:${instrument.lens.id}`,
      `evidence-policy:${instrument.evidencePolicy.id}`, `target:${relation.target}`,
      ...relation.evidence, ...relation.preserves.map((preserve) => `preserves:${preserve}`),
    ]),
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("instrument", instrumentMatched ? [] : ["instrument"]),
      semanticJudgment("contract", contractMatched ? [] : ["contract"]),
      semanticJudgment("relation-target-kind", relationKindCompatible ? [] : ["relation-target-kind"]),
      semanticJudgment("target", targetAccounted ? [] : ["target"]),
      semanticJudgment("preservation", preservationAccounted ? [] : ["preservation"]),
      semanticJudgment("evidence", evidenceAccounted ? [] : ["evidence"]),
      semanticJudgment("lens", lensAccounted ? [] : ["lens"]),
      semanticJudgment("evidence-policy", evidencePolicyAccounted ? [] : ["evidence-policy"]),
      semanticJudgment("bridge-evidence", bridgeEvidenced ? [] : ["bridge-evidence"]),
      semanticJudgment("brick-law", brickLawAccounted ? [] : ["brick-law"]),
    ]),
    judgment: semanticJudgment(`${relation.id}.relation`, missing),
  });
}

/**
 * Static admissibility judgment for the relational move `m` in Γ ⊨ {P} m {Q}.
 *
 * Endpoint accountability is intentionally material-first: a declared domain or
 * codomain must be admitted by Γ, while Λ accounts for boundary observation, Ω
 * accounts for witness exposure, and Φ accounts for phase effects.
 */

/**
 * Static validity judgment for the whole phase-indexed contract
 * `Γ ⊨ {P} m {Q}` under Φ, Λ, and Ω.
 *
 * This report composes the material, move, phase, lens, witness, energetic, and
 * predicate-side checks before any implementation or runtime outcome is allowed
 * to claim it realizes the contract.
 */

/** Accountable observation that a realized move inhabited its phase regime. */

/** Decidable account that a realized phase observation satisfies Φ. */

/** Decidable account that a concrete lens observation satisfies Λ's preserve/hide/output duties. */

/** Accountable observation that P or Q held over the relevant material/outcome boundary. */

/** Decidable account that an observed P/Q predicate matches the contract and is evidenced. */

/** Accountable observation that a realized move paid or preserved its energetic obligations. */

/** Decidable account that realized energetic behavior satisfies the contract's energetic laws. */

/** Realized semantic outcome of Γ ⊨ {P} m {Q}: material transition, boundary object, and contract coordinates. */

/** Decidable account that one outcome satisfies the material/boundary/evidence duties of its contract. */

/** Freeze a material context while preserving Γ's structural lists as immutable contract data. */

function phaseAcceptsEnergy(phase, obligation) {
  return phase.energy === obligation.behavior;
}

export function contractEnergeticsReport(contract) {
  const behaviorCompatible = contract.energetics.length > 0 &&
    contract.energetics.every((obligation) => phaseAcceptsEnergy(contract.phase, obligation));
  const requiresEvidencedCost = contract.phase.coordinationCost === "evidenced" ||
    contract.lens.evidenceRequired ||
    contract.evidencePolicy.required;
  const evidencedWhenCosted = !requiresEvidencedCost ||
    contract.energetics.some((obligation) => obligation.evidenceRequired) ||
    contract.evidencePolicy.required;
  const finalityAccounted = contract.phase.finality === "normal-form"
    ? contract.energetics.some((obligation) => obligation.law === "well-founded-descent")
    : contract.energetics.some((obligation) =>
        obligation.source === contract.precondition.id ||
        obligation.target === contract.postcondition.id ||
        obligation.source === contract.move.id ||
        obligation.target === contract.move.id);
  const missing = [
    ...(behaviorCompatible ? [] : ["phase-energy-behavior"]),
    ...(evidencedWhenCosted ? [] : ["evidenced-cost"]),
    ...(finalityAccounted ? [] : ["finality-accounting"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract-energetics",
    contract: contract.id,
    phase: contract.phase.id,
    phaseEnergy: contract.phase.energy,
    coordinationCost: contract.phase.coordinationCost,
    obligations: Object.freeze(contract.energetics.map((obligation) => obligation.id)),
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("phase-energy-behavior", behaviorCompatible ? [] : ["phase-energy-behavior"]),
      semanticJudgment("evidenced-cost", evidencedWhenCosted ? [] : ["evidenced-cost"]),
      semanticJudgment("finality-accounting", finalityAccounted ? [] : ["finality-accounting"]),
    ]),
    judgment: semanticJudgment(`${contract.id}.energetics`, missing),
  });
}

function textHas(values, needles) {
  const haystack = normalizedToken(values.join(" "));
  return needles.some((needle) => haystack.includes(normalizedToken(needle)));
}

/** The phase's closure is evidenced by an observed closure ordinal whose regime is the phase's. */
function closureMatchesPhase(contract) {
  return phaseEvidenced(contract.phase, contract.material.phaseEvidence);
}

/** A normal form is attained at a finite stage, so the move must be deterministic and descend
 * well-foundedly; the other finalities are carried by the evidenced regime itself. */
function finalityMatchesPhase(contract) {
  return closureMatchesPhase(contract) && (contract.phase.finality !== "normal-form" ||
    (contract.move.deterministic && contract.energetics.some((obligation) => obligation.law === "well-founded-descent")));
}

/** Where `H¹` does not vanish, settling is coordinated, and the lens must carry the evidence of it. */
function lensMatchesPhase(contract) {
  return contract.phase.coordinationCost === "none" || contract.lens.evidenceRequired;
}

/** A lens that hides the bulk exposes only the boundary: interior evidence does not enter. */
function boundaryOnlyLens(contract) {
  return contract.lens.hides.includes("bulk");
}

function materialMentions(material, value) {
  const needle = normalizedToken(value);
  if (needle.length === 0) return false;
  return [
    material.id,
    ...material.loci,
    ...material.incidence,
    ...material.fibers,
    material.valueAlgebra,
    material.section ?? "",
    ...material.constraints,
    ...material.closure,
    ...material.boundary,
  ].map(normalizedToken).filter((entry) => entry.length > 0)
    .some((entry) => entry === needle || entry.includes(needle) || needle.includes(entry));
}

function lensDomainAdmitted(contract) {
  return materialMentions(contract.material, contract.lens.domain) ||
    contract.lens.domain === contract.move.domain ||
    contract.lens.domain === contract.move.codomain;
}

function lensBoundaryAdmitted(contract) {
  const boundaryNeedle = normalizedToken(contract.lens.boundary);
  return materialMentions(contract.material, contract.lens.boundary) ||
    contract.lens.boundary === contract.move.domain ||
    contract.lens.boundary === contract.move.codomain ||
    boundaryParts(contract.lens.boundary).some((part) => materialMentions(contract.material, part)) ||
    contract.material.boundary.some((entry) =>
      normalizedToken(entry).split(" ").some((token) => token.length > 2 && boundaryNeedle.includes(token)));
}

function lensOutputAccounted(contract) {
  if (contract.lens.output.length === 0) return false;
  if (contract.lens.output === contract.lens.boundary) return true;
  if (contract.material.boundary.includes(contract.lens.output)) return true;
  if (textHas([contract.lens.output], ["application", "text", "wire", "json", "html", "event-stream", "filesystem", "data", "profile"])) return true;
  const outputNeedle = normalizedToken(contract.lens.output);
  const codomain = normalizedToken(contract.move.codomain ?? "");
  if (codomain.length > 0 && outputNeedle.split(" ").some((token) => token.length > 2 && codomain.includes(token))) return true;
  if ([...contract.material.boundary, ...contract.material.fibers].some((entry) =>
    normalizedToken(entry).split(" ").some((token) => token.length > 2 && outputNeedle.includes(token)))) return true;
  return materialMentions(contract.material, contract.lens.output);
}

function evidenceMatchesPhase(contract) {
  const requiresEvidence =
    contract.lens.evidenceRequired ||
    contract.move.effects.includes("evidence") ||
    contract.phase.coordinationCost === "evidenced";
  return !requiresEvidence || contract.evidencePolicy.required;
}

function evidenceRecordAccounted(contract, record) {
  const token = normalizedToken(record);
  if (token.length === 0) return false;
  const known = [
    "material",
    "material context",
    "material state",
    "move",
    "phase",
    "lens",
    "precondition",
    "postcondition",
    "boundary",
    "boundary object",
    "caller",
    "observer",
    "time",
    "stage",
    "timestamp",
    "contract",
    "evidence",
    "evidence policy",
    "composition",
    "predicate",
    "precondition observation",
    "postcondition observation",
    "energetic observation",
    "phase observation",
    "lens observation",
    "contract outcome",
    "contract exposure",
  ].map(normalizedToken);
  return known.includes(token) ||
    materialMentions(contract.material, record) ||
    [
      contract.id,
      contract.material.id,
      contract.precondition.id,
      contract.move.id,
      contract.postcondition.id,
      contract.phase.id,
      contract.lens.id,
      contract.evidencePolicy.id,
      contract.move.domain ?? "",
      contract.move.codomain ?? "",
      contract.lens.domain,
      contract.lens.boundary,
      contract.lens.output,
    ].map(normalizedToken).some((entry) => entry.length > 0 && (entry === token || entry.includes(token) || token.includes(entry)));
}

function recordSetRequires(records, accepted) {
  const acceptedTokens = accepted.map(normalizedToken);
  return records.some((record) => acceptedTokens.includes(normalizedToken(record)));
}

/** Judge whether the evidence policy Ω can actually witness this contract before any exposure row exists. */

export function contractEvidencePolicyReport(contract) {
  const missingRecords = contract.evidencePolicy.records.filter((record) => !evidenceRecordAccounted(contract, record));
  const recordsAccounted = contract.evidencePolicy.records.length > 0 && missingRecords.length === 0;
  const timeRequiredByRecords = recordSetRequires(contract.evidencePolicy.records, ["time", "stage", "timestamp"]);
  const timeAccounted = !timeRequiredByRecords ||
    contract.evidencePolicy.time !== "none";
  const callerRequiredByRecords = recordSetRequires(contract.evidencePolicy.records, ["caller", "observer"]);
  const callerAccounted = !callerRequiredByRecords ||
    contract.evidencePolicy.caller !== "none";
  const boundaryRequiredByRecords = recordSetRequires(contract.evidencePolicy.records, ["boundary", "boundary object"]);
  const boundaryObjectAccounted = !boundaryRequiredByRecords ||
    contract.evidencePolicy.boundaryObject !== "none";
  const lensRequirementAccounted = !contract.lens.evidenceRequired || contract.evidencePolicy.required;
  const phaseRequirementAccounted = evidenceMatchesPhase(contract);
  const moveRequirementAccounted = !contract.move.effects.includes("evidence") || contract.evidencePolicy.required;
  const missing = [
    ...(recordsAccounted ? [] : missingRecords.length === 0 ? ["evidence-records"] : missingRecords.map((record) => `record:${record}`)),
    ...(timeAccounted ? [] : ["evidence-time"]),
    ...(callerAccounted ? [] : ["evidence-caller"]),
    ...(boundaryObjectAccounted ? [] : ["evidence-boundary-object"]),
    ...(lensRequirementAccounted ? [] : ["evidence-lens"]),
    ...(phaseRequirementAccounted ? [] : ["evidence-phase"]),
    ...(moveRequirementAccounted ? [] : ["evidence-move"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract-evidence-policy",
    contract: contract.id,
    evidencePolicy: contract.evidencePolicy.id,
    material: contract.material.id,
    move: contract.move.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    required: contract.evidencePolicy.required,
    requiredRecords: Object.freeze([...contract.evidencePolicy.records]),
    missingRecords: Object.freeze(missingRecords),
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("evidence-records", recordsAccounted ? [] : missingRecords.length === 0 ? ["evidence-records"] : missingRecords.map((record) => `record:${record}`)),
      semanticJudgment("evidence-time", timeAccounted ? [] : ["evidence-time"]),
      semanticJudgment("evidence-caller", callerAccounted ? [] : ["evidence-caller"]),
      semanticJudgment("evidence-boundary-object", boundaryObjectAccounted ? [] : ["evidence-boundary-object"]),
      semanticJudgment("evidence-lens", lensRequirementAccounted ? [] : ["evidence-lens"]),
      semanticJudgment("evidence-phase", phaseRequirementAccounted ? [] : ["evidence-phase"]),
      semanticJudgment("evidence-move", moveRequirementAccounted ? [] : ["evidence-move"]),
    ]),
    judgment: semanticJudgment(`${contract.id}.coordinates-policy`, missing),
  });
}

function moveEndpointAccounted(contract, endpoint, role) {
  if (endpoint === undefined) {
    return role === "domain"
      ? contract.material.boundary.length > 0 || contract.lens.domain.length > 0
      : contract.lens.boundary.length > 0 || contract.lens.output.length > 0 || contract.material.boundary.length > 0;
  }
  return materialMentions(contract.material, endpoint) ||
    contract.material.boundary.includes(endpoint);
}

/** Judge whether the relational move m is admissible for Γ/Φ/Λ/Ω before executing it. */

export function contractMoveReport(contract) {
  const domainAccounted = moveEndpointAccounted(contract, contract.move.domain, "domain");
  const codomainAccounted = moveEndpointAccounted(contract, contract.move.codomain, "codomain");
  const materialEffectAccounted = !contract.move.effects.includes("material") ||
    domainAccounted ||
    codomainAccounted ||
    contract.material.closure.length > 0;
  const boundaryEffectAccounted = !contract.move.effects.includes("boundary") ||
    semanticJudgmentWitnessed(contractLensReport(contract).judgment);
  const evidenceEffectAccounted = !contract.move.effects.includes("evidence") ||
    semanticJudgmentWitnessed(contractEvidencePolicyReport(contract).judgment);
  const phaseEffectAccounted = !contract.move.effects.includes("phase") ||
    semanticJudgmentWitnessed(contractPhaseReport(contract).judgment);
  const deterministicAccounted = !contract.move.deterministic || contract.phase.regime !== "aperiodic";
  const missing = [
    ...(domainAccounted ? [] : ["move-domain"]),
    ...(codomainAccounted ? [] : ["move-codomain"]),
    ...(materialEffectAccounted ? [] : ["move-material-effect"]),
    ...(boundaryEffectAccounted ? [] : ["move-boundary-effect"]),
    ...(evidenceEffectAccounted ? [] : ["move-evidence-effect"]),
    ...(phaseEffectAccounted ? [] : ["move-phase-effect"]),
    ...(deterministicAccounted ? [] : ["move-determinism"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract-move",
    contract: contract.id,
    move: contract.move.id,
    material: contract.material.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    ...(contract.move.domain === undefined ? {} : { domain: contract.move.domain }),
    ...(contract.move.codomain === undefined ? {} : { codomain: contract.move.codomain }),
    partial: contract.move.partial,
    deterministic: contract.move.deterministic,
    effects: Object.freeze([...contract.move.effects]),
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("move-domain", domainAccounted ? [] : ["move-domain"]),
      semanticJudgment("move-codomain", codomainAccounted ? [] : ["move-codomain"]),
      semanticJudgment("move-material-effect", materialEffectAccounted ? [] : ["move-material-effect"]),
      semanticJudgment("move-boundary-effect", boundaryEffectAccounted ? [] : ["move-boundary-effect"]),
      semanticJudgment("move-evidence-effect", evidenceEffectAccounted ? [] : ["move-evidence-effect"]),
      semanticJudgment("move-phase-effect", phaseEffectAccounted ? [] : ["move-phase-effect"]),
      semanticJudgment("move-determinism", deterministicAccounted ? [] : ["move-determinism"]),
    ]),
    judgment: semanticJudgment(`${contract.id}.move`, missing),
  });
}

function predicateTokens(predicate) {
  return Object.freeze([
    predicate.id,
    predicate.description ?? "",
    predicate.fingerprint ?? "",
    ...(predicate.entails ?? []),
  ]);
}

function predicateMentionsContractBoundary(contract, predicate, role) {
  const tokens = predicateTokens(predicate);
  const endpoints = role === "precondition"
    ? [
        contract.move.domain ?? "",
        contract.lens.domain,
        ...contract.material.boundary,
        ...contract.material.loci,
        ...contract.material.fibers,
      ]
    : [
        contract.move.codomain ?? "",
        contract.lens.boundary,
        contract.lens.output,
        ...contract.material.boundary,
        ...contract.material.closure,
      ];
  return endpoints.some((endpoint) => endpoint.length > 0 && textHas(tokens, [endpoint])) ||
    tokens.some((token) => token.length > 0 && materialMentions(contract.material, token));
}

function predicateRoleAccounted(contract, predicate, role) {
  const tokens = predicateTokens(predicate);
  const hasMeaning = (predicate.description ?? "").length > 0 ||
    (predicate.entails ?? []).length > 0 ||
    (predicate.fingerprint ?? "").length > 0;
  if (!hasMeaning) return false;
  if (predicateMentionsContractBoundary(contract, predicate, role)) return true;
  if (role === "precondition") {
    return textHas(tokens, [
      "admit",
      "admitted",
      "admissible",
      "boundary",
      "schema",
      "capability",
      "cluster",
      "command",
      "entries",
      "entry",
      "endpoint",
      "endpoints",
      "face",
      "identity",
      "index",
      "input",
      "leader",
      "locus",
      "material",
      "ordered",
      "present",
      "registered",
      "resource",
      "source",
      "term",
      "transaction",
    ]);
  }
  return textHas(tokens, [
    "accountable",
    "authority",
    "boundary",
    "conserve",
    "exposed",
    "output",
    "preserve",
    "proof",
    "project",
    "projected",
    "read",
    "remain",
    "recoverable",
    "recovered",
    "same",
    "settle",
    "invocation",
    "evidence",
  ]);
}

function contractRequiresEvidencePostcondition(contract) {
  return contract.evidencePolicy.required ||
    contract.lens.evidenceRequired ||
    contract.move.effects.includes("evidence") ||
    contract.phase.coordinationCost === "evidenced";
}

function evidencePostconditionAccounted(contract) {
  if (!contractRequiresEvidencePostcondition(contract)) return true;
  const postcondition = predicateTokens(contract.postcondition);
  return textHas(postcondition, ["evidence", "accountable", "exposed", "boundary", "observation", "recoverable"]) ||
    (contract.postcondition.entails ?? []).some((entry) => evidenceRecordAccounted(contract, entry)) ||
    contract.evidencePolicy.records.some((record) => record === "postcondition" || record === "postcondition observation");
}

/**
 * Judge whether `Γ ⊨ {P} m {Q}` is statically admissible under its phase regime,
 * observation lens, evidence policy, energetics, and implementation refinements.
 */

export function contractValidityReport(contract) {
  const move = contractMoveReport(contract);
  const phase = contractPhaseReport(contract);
  const lens = contractLensReport(contract);
  const evidencePolicyReport = contractEvidencePolicyReport(contract);
  const energetics = contractEnergeticsReport(contract);
  const preconditionAccounted = predicateRoleAccounted(contract, contract.precondition, "precondition");
  const postconditionAccounted = predicateRoleAccounted(contract, contract.postcondition, "postcondition");
  const evidencePostcondition = evidencePostconditionAccounted(contract);
  const refinementsDeclared = contract.refinements.length > 0;
  const missing = [
    ...(semanticJudgmentWitnessed(move.judgment) ? [] : move.missing.map((entry) => `move:${entry}`)),
    ...(semanticJudgmentWitnessed(phase.judgment) ? [] : phase.missing.map((entry) => `phase:${entry}`)),
    ...(semanticJudgmentWitnessed(lens.judgment) ? [] : lens.missing.map((entry) => `lens:${entry}`)),
    ...(semanticJudgmentWitnessed(evidencePolicyReport.judgment) ? [] : evidencePolicyReport.missing.map((entry) => `evidence-policy:${entry}`)),
    ...(semanticJudgmentWitnessed(energetics.judgment) ? [] : energetics.missing.map((entry) => `energetics:${entry}`)),
    ...(preconditionAccounted ? [] : ["precondition-accounting"]),
    ...(postconditionAccounted ? [] : ["postcondition-accounting"]),
    ...(evidencePostcondition ? [] : ["postcondition-evidence-accounting"]),
    ...(refinementsDeclared ? [] : ["refinement-obligations"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract-validity",
    contract: contract.id,
    material: contract.material.id,
    precondition: contract.precondition.id,
    move: contract.move.id,
    postcondition: contract.postcondition.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      move.judgment,
      phase.judgment,
      lens.judgment,
      evidencePolicyReport.judgment,
      energetics.judgment,
      semanticJudgment("precondition-accounting", preconditionAccounted ? [] : ["precondition-accounting"]),
      semanticJudgment("postcondition-accounting", postconditionAccounted ? [] : ["postcondition-accounting"]),
      semanticJudgment("postcondition-evidence-accounting", evidencePostcondition ? [] : ["postcondition-evidence-accounting"]),
      semanticJudgment("refinement-obligations", refinementsDeclared ? [] : ["refinement-obligations"]),
    ]),
    judgment: semanticJudgment(`${contract.id}.validity`, missing),
  });
}

export function contractPhaseReport(contract) {
  const energetics = contractEnergeticsReport(contract);
  const closure = closureMatchesPhase(contract);
  const finality = finalityMatchesPhase(contract);
  const lens = lensMatchesPhase(contract);
  const evidence = evidenceMatchesPhase(contract);
  const missing = [
    ...(closure ? [] : ["phase-closure"]),
    ...(finality ? [] : ["phase-finality"]),
    ...(lens ? [] : ["phase-coordination-lens"]),
    ...(evidence ? [] : ["phase-evidence"]),
    ...(semanticJudgmentWitnessed(energetics.judgment) ? [] : ["phase-energetics"]),
  ];
  const judgment = semanticJudgment(`${contract.id}.phase`, missing, boundaryOnlyLens(contract));
  return Object.freeze({
    kind: "metroplat.contract-phase",
    contract: contract.id,
    phase: contract.phase.id,
    regime: contract.phase.regime,
    finality: contract.phase.finality,
    move: contract.move.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("phase-closure", closure ? [] : ["phase-closure"]),
      semanticJudgment("phase-finality", finality ? [] : ["phase-finality"]),
      semanticJudgment("phase-coordination-lens", lens ? [] : ["phase-coordination-lens"]),
      semanticJudgment("phase-evidence", evidence ? [] : ["phase-evidence"]),
      semanticJudgment("phase-energetics", semanticJudgmentWitnessed(energetics.judgment) ? [] : ["phase-energetics"]),
    ]),
    judgment,
  });
}

/** Judge whether a contract's observational lens Λ is admissible for Γ/m/Φ/Ω before any boundary value is observed. */

export function contractLensReport(contract) {
  const domainAdmitted = lensDomainAdmitted(contract);
  const boundaryAdmitted = lensBoundaryAdmitted(contract);
  const outputAccounted = lensOutputAccounted(contract);
  const preservesDeclared = contract.lens.preserves.length > 0;
  const hidesDeclared = contract.phase.finality === "normal-form" || contract.lens.hides.length > 0;
  const evidenceRequirementAccounted = !contract.lens.evidenceRequired || contract.evidencePolicy.required;
  const phaseCompatible = lensMatchesPhase(contract);
  const missing = [
    ...(domainAdmitted ? [] : ["lens-domain"]),
    ...(boundaryAdmitted ? [] : ["lens-boundary"]),
    ...(outputAccounted ? [] : ["lens-output"]),
    ...(preservesDeclared ? [] : ["lens-preserves"]),
    ...(hidesDeclared ? [] : ["lens-hides"]),
    ...(evidenceRequirementAccounted ? [] : ["lens-evidence"]),
    ...(phaseCompatible ? [] : ["lens-phase"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract-lens",
    contract: contract.id,
    lens: contract.lens.id,
    material: contract.material.id,
    phase: contract.phase.id,
    evidencePolicy: contract.evidencePolicy.id,
    domain: contract.lens.domain,
    boundary: contract.lens.boundary,
    output: contract.lens.output,
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("lens-domain", domainAdmitted ? [] : ["lens-domain"]),
      semanticJudgment("lens-boundary", boundaryAdmitted ? [] : ["lens-boundary"]),
      semanticJudgment("lens-output", outputAccounted ? [] : ["lens-output"]),
      semanticJudgment("lens-preserves", preservesDeclared ? [] : ["lens-preserves"]),
      semanticJudgment("lens-hides", hidesDeclared ? [] : ["lens-hides"]),
      semanticJudgment("lens-evidence", evidenceRequirementAccounted ? [] : ["lens-evidence"]),
      semanticJudgment("lens-phase", phaseCompatible ? [] : ["lens-phase"]),
    ]),
    judgment: semanticJudgment(`${contract.id}.lens`, missing),
  });
}

/** Build a concrete observation that one realized outcome inhabited the contract phase Φ. */

export function contractPhaseObservation(
  contract,
  observation

 = {},
) {
  const materialObserved = observation.materialBefore !== undefined || observation.materialAfter !== undefined;
  const boundaryObserved = observation.boundary !== undefined;
  const coordinatesObserved = observation.coordinates !== undefined;
  const final = observation.final ?? contract.phase.finality !== "approximation";
  const stage = observation.stage ?? (contract.phase.finality === "stage" ? observation.at : undefined);
  const evidence = observation.evidence ?? [
    `regime:${contract.phase.regime}`,
    `finality:${contract.phase.finality}`,
    `cost:${contract.phase.cost}`,
    `coordination-cost:${contract.phase.coordinationCost}`,
    `energy:${contract.phase.energy}`,
  ];
  return Object.freeze({
    kind: "metroplat.contract-phase-observation",
    contract: contract.id,
    fingerprint: contractFingerprint(contract),
    material: contract.material.id,
    move: contract.move.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    regime: contract.phase.regime,
    finality: contract.phase.finality,
    cost: contract.phase.cost,
    coordinationCost: contract.phase.coordinationCost,
    energy: contract.phase.energy,
    closure: Object.freeze([...(observation.closure ?? contract.material.closure)]),
    phaseEvidence: Object.freeze((observation.phaseEvidence ?? contract.material.phaseEvidence ?? []).map(phaseEvidence)),
    final,
    materialObserved,
    boundaryObserved,
    coordinatesObserved,
    evidence: Object.freeze([...evidence]),
    ...(stage === undefined ? {} : { stage }),
    ...(observation.at === undefined ? {} : { at: observation.at }),
    ...(observation.caller === undefined ? {} : { caller: observation.caller }),
    ...(observation.materialBefore === undefined ? {} : { materialBefore: observation.materialBefore }),
    ...(observation.materialAfter === undefined ? {} : { materialAfter: observation.materialAfter }),
    ...(observation.boundary === undefined ? {} : { boundary: observation.boundary }),
    ...(observation.coordinates === undefined ? {} : { coordinates: observation.coordinates }),
  });
}

function observedClosureAccountsFor(contract, observation) {
  return observation.regime === contract.phase.regime &&
    contract.material.closure.every((entry) => observation.closure.includes(entry)) &&
    phaseEvidenced(contract.phase, observation.phaseEvidence);
}

function observedFinalityAccountsFor(contract, observation) {
  if (observation.finality !== contract.phase.finality || !finalityMatchesPhase(contract)) return false;
  switch (contract.phase.finality) {
    case "normal-form":
      return observation.final;
    case "approximation":
      return !observation.final;
    case "stage":
      return observation.stage !== undefined || observation.at !== undefined;
    case "unattained":
      return observation.materialObserved || observation.boundaryObserved;
  }
}

function observedObservabilityAccountsFor(contract, observation) {
  if (!lensMatchesPhase(contract)) return false;
  return boundaryOnlyLens(contract) ? observation.boundaryObserved : observation.materialObserved || observation.boundaryObserved;
}

/** Judge whether a concrete phase observation satisfies the phase index Φ. */

export function contractPhaseObservationReport(
  contract,
  observation,
) {
  const contractMatched = observation.contract === contract.id &&
    observation.fingerprint === contractFingerprint(contract) &&
    observation.material === contract.material.id &&
    observation.move === contract.move.id &&
    observation.phase === contract.phase.id &&
    observation.lens === contract.lens.id &&
    observation.evidencePolicy === contract.evidencePolicy.id;
  const closureAccounted = observedClosureAccountsFor(contract, observation);
  const finalityAccounted = observedFinalityAccountsFor(contract, observation);
  const observabilityAccounted = observedObservabilityAccountsFor(contract, observation);
  const coordinationAccounted = observation.coordinationCost === contract.phase.coordinationCost && observation.cost === contract.phase.cost;
  const energyAccounted = observation.energy === contract.phase.energy && semanticJudgmentWitnessed(contractEnergeticsReport(contract).judgment);
  const stageAccounted = !(contract.phase.finality === "stage" || contract.evidencePolicy.time === "stage") ||
    observation.stage !== undefined ||
    observation.at !== undefined;
  const boundaryAccounted = !(boundaryOnlyLens(contract) || contract.move.effects.includes("boundary")) ||
    observation.boundaryObserved;
  const evidenceAccounted = !evidenceMatchesPhase(contract) ||
    !contract.evidencePolicy.required ||
    observation.coordinatesObserved;
  const evidencePresent = observation.evidence.length > 0;
  const missing = [
    ...(contractMatched ? [] : ["contract"]),
    ...(closureAccounted ? [] : ["closure"]),
    ...(finalityAccounted ? [] : ["finality"]),
    ...(observabilityAccounted ? [] : ["observability"]),
    ...(coordinationAccounted ? [] : ["coordination"]),
    ...(energyAccounted ? [] : ["energy"]),
    ...(stageAccounted ? [] : ["stage"]),
    ...(boundaryAccounted ? [] : ["boundary"]),
    ...(evidenceAccounted ? [] : ["evidence"]),
    ...(evidencePresent ? [] : ["evidence"]),
  ];
  const aspects = Object.freeze([
    semanticJudgment("contract", contractMatched ? [] : ["contract"]),
    semanticJudgment("closure", closureAccounted ? [] : ["closure"]),
    semanticJudgment("finality", finalityAccounted ? [] : ["finality"]),
    semanticJudgment("observability", observabilityAccounted ? [] : ["observability"]),
    semanticJudgment("coordination", coordinationAccounted ? [] : ["coordination"]),
    semanticJudgment("energy", energyAccounted ? [] : ["energy"]),
    semanticJudgment("stage", stageAccounted ? [] : ["stage"]),
    semanticJudgment("boundary", boundaryAccounted ? [] : ["boundary"]),
    semanticJudgment("evidence", evidenceAccounted ? [] : ["evidence"]),
    semanticJudgment("evidence", evidencePresent ? [] : ["evidence"]),
  ]);
  return Object.freeze({
    kind: "metroplat.contract-phase-observation-report",
    contract: contract.id,
    observationContract: observation.contract,
    phase: contract.phase.id,
    missing: Object.freeze(missing),
    aspects,
    judgment: semanticJudgment(`${contract.id}.phase-observation`, missing),
  });
}

function valuesEquivalent(left, right) {
  if (left === undefined || right === undefined) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Build the concrete accountable observation through a contract's lens Λ. */

export function contractLensObservation(
  contract,
  observation

 = {},
) {
  const preserved = observation.preserved ?? contract.lens.preserves;
  const hidden = observation.hidden ?? contract.lens.hides;
  const evidence = observation.evidence ?? [
    `lens:${contract.lens.id}`,
    `output:${contract.lens.output}`,
    `boundary:${contract.lens.boundary}`,
  ];
  return Object.freeze({
    kind: "metroplat.contract-lens-observation",
    contract: contract.id,
    fingerprint: contractFingerprint(contract),
    material: contract.material.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    domain: contract.lens.domain,
    lensBoundary: contract.lens.boundary,
    output: contract.lens.output,
    evidenceRequired: contract.lens.evidenceRequired,
    preserves: Object.freeze([...contract.lens.preserves]),
    hides: Object.freeze([...contract.lens.hides]),
    preserved: Object.freeze([...preserved]),
    hidden: Object.freeze([...hidden]),
    evidence: Object.freeze([...evidence]),
    ...(observation.at === undefined ? {} : { at: observation.at }),
    ...(observation.caller === undefined ? {} : { caller: observation.caller }),
    ...(observation.materialState === undefined ? {} : { materialState: observation.materialState }),
    ...(observation.boundaryObject === undefined ? {} : { boundaryObject: observation.boundaryObject }),
  });
}

/** Judge whether an observation actually accounts for the lens Λ named by a contract. */

export function contractLensObservationReport(
  contract,
  observation,
) {
  const contractMatched = observation.contract === contract.id &&
    observation.fingerprint === contractFingerprint(contract) &&
    observation.material === contract.material.id &&
    observation.phase === contract.phase.id &&
    observation.lens === contract.lens.id &&
    observation.evidencePolicy === contract.evidencePolicy.id &&
    observation.domain === contract.lens.domain &&
    observation.lensBoundary === contract.lens.boundary &&
    observation.output === contract.lens.output &&
    observation.evidenceRequired === contract.lens.evidenceRequired;
  const missingPreserves = contract.lens.preserves.filter((entry) => !observation.preserved.includes(entry));
  const missingHides = contract.lens.hides.filter((entry) => !observation.hidden.includes(entry));
  const preservesAccounted = missingPreserves.length === 0;
  const hidesAccounted = missingHides.length === 0;
  const outputAccounted = observation.output === contract.lens.output && observation.output.length > 0;
  const boundaryAccounted = contract.lens.boundary.length === 0 || observation.boundaryObject !== undefined;
  const evidenceRequirementAccounted = !contract.lens.evidenceRequired ||
    observation.evidenceRequired === true ||
    contract.evidencePolicy.required;
  const evidencePresent = observation.evidence.length > 0;
  const missing = [
    ...(contractMatched ? [] : ["contract"]),
    ...missingPreserves.map((entry) => `preserve:${entry}`),
    ...missingHides.map((entry) => `hide:${entry}`),
    ...(outputAccounted ? [] : ["output"]),
    ...(boundaryAccounted ? [] : ["boundary"]),
    ...(evidenceRequirementAccounted ? [] : ["evidence-requirement"]),
    ...(evidencePresent ? [] : ["evidence"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract-lens-observation-report",
    contract: contract.id,
    observationContract: observation.contract,
    lens: contract.lens.id,
    observationLens: observation.lens,
    requiredPreserves: Object.freeze([...contract.lens.preserves]),
    observedPreserves: Object.freeze([...observation.preserved]),
    missingPreserves: Object.freeze(missingPreserves),
    requiredHides: Object.freeze([...contract.lens.hides]),
    observedHides: Object.freeze([...observation.hidden]),
    missingHides: Object.freeze(missingHides),
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("contract", contractMatched ? [] : ["contract"]),
      semanticJudgment("preserve", missingPreserves.map((entry) => `preserve:${entry}`)),
      semanticJudgment("hide", missingHides.map((entry) => `hide:${entry}`)),
      semanticJudgment("output", outputAccounted ? [] : ["output"]),
      semanticJudgment("boundary", boundaryAccounted ? [] : ["boundary"]),
      semanticJudgment("evidence-requirement", evidenceRequirementAccounted ? [] : ["evidence-requirement"]),
      semanticJudgment("evidence", evidencePresent ? [] : ["evidence"]),
    ]),
    judgment: semanticJudgment(`${contract.id}.lens-observation`, missing),
  });
}

function predicateForRole(contract, role) {
  return role === "precondition" ? contract.precondition : contract.postcondition;
}

/** Build a concrete observation that a contract precondition or postcondition held at the relevant boundary. */

export function contractPredicateObservation(
  contract,
  observation

,
) {
  const predicate = predicateForRole(contract, observation.role);
  const subject = observation.subject ?? (observation.role === "precondition" ? "material-before" : "outcome");
  const evidence = observation.evidence ?? [
    `predicate:${predicate.id}`,
    `role:${observation.role}`,
    `subject:${subject}`,
  ];
  const satisfied = observation.satisfied ?? (observation.role === "precondition"
    ? observation.materialState !== undefined
    : observation.materialState !== undefined || observation.boundary !== undefined || observation.coordinates !== undefined);
  return Object.freeze({
    kind: "metroplat.contract-predicate-observation",
    contract: contract.id,
    fingerprint: contractFingerprint(contract),
    material: contract.material.id,
    move: contract.move.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    role: observation.role,
    predicate: predicate.id,
    entails: Object.freeze([...(predicate.entails ?? [])]),
    subject,
    satisfied,
    evidence: Object.freeze([...evidence]),
    ...(observation.at === undefined ? {} : { at: observation.at }),
    ...(observation.caller === undefined ? {} : { caller: observation.caller }),
    ...(observation.materialState === undefined ? {} : { materialState: observation.materialState }),
    ...(observation.boundary === undefined ? {} : { boundary: observation.boundary }),
    ...(observation.coordinates === undefined ? {} : { coordinates: observation.coordinates }),
  });
}

/** Judge whether an observed precondition/postcondition satisfies the predicate side of Γ ⊨ {P} m {Q}. */

export function contractPredicateObservationReport(
  contract,
  observation,
) {
  const predicate = predicateForRole(contract, observation.role);
  const contractMatched = observation.contract === contract.id &&
    observation.fingerprint === contractFingerprint(contract) &&
    observation.material === contract.material.id &&
    observation.move === contract.move.id &&
    observation.phase === contract.phase.id &&
    observation.lens === contract.lens.id &&
    observation.evidencePolicy === contract.evidencePolicy.id;
  const predicateMatched = observation.predicate === predicate.id &&
    (predicate.entails ?? []).every((entry) => observation.entails.includes(entry));
  const subjectAccounted = observation.role === "precondition"
    ? observation.subject === "material-before" && observation.materialState !== undefined
    : observation.subject === "outcome" &&
      (observation.materialState !== undefined || observation.boundary !== undefined || observation.coordinates !== undefined);
  const evidencePresent = observation.evidence.length > 0;
  const missing = [
    ...(contractMatched ? [] : ["contract"]),
    ...(predicateMatched ? [] : ["predicate"]),
    ...(subjectAccounted ? [] : ["subject"]),
    ...(evidencePresent ? [] : ["evidence"]),
    ...(observation.satisfied ? [] : ["satisfied"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract-predicate-observation-report",
    contract: contract.id,
    observationContract: observation.contract,
    role: observation.role,
    predicate: predicate.id,
    observationPredicate: observation.predicate,
    satisfied: observation.satisfied,
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("contract", contractMatched ? [] : ["contract"]),
      semanticJudgment("predicate", predicateMatched ? [] : ["predicate"]),
      semanticJudgment("subject", subjectAccounted ? [] : ["subject"]),
      semanticJudgment("evidence", evidencePresent ? [] : ["evidence"]),
      semanticJudgment("satisfied", observation.satisfied ? [] : ["satisfied"]),
    ]),
    judgment: semanticJudgment(`${contract.id}.${observation.role}-observation`, missing),
  });
}

/** Build a concrete observation of the energetic work paid by one realized contract outcome. */

export function contractEnergeticObservation(
  contract,
  observation

 = {},
) {
  const evidenceRequired = contract.energetics.filter((obligation) => obligation.evidenceRequired).map((obligation) => obligation.id);
  const evidence = observation.evidence ?? [
    `phase-energy:${contract.phase.energy}`,
    `coordination-cost:${contract.phase.coordinationCost}`,
    `obligations:${contract.energetics.length}`,
  ];
  return Object.freeze({
    kind: "metroplat.contract-energetic-observation",
    contract: contract.id,
    fingerprint: contractFingerprint(contract),
    material: contract.material.id,
    move: contract.move.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    phaseEnergy: contract.phase.energy,
    coordinationCost: contract.phase.coordinationCost,
    obligations: Object.freeze(contract.energetics.map((obligation) => obligation.id)),
    laws: Object.freeze(contract.energetics.map((obligation) => obligation.law)),
    behaviors: Object.freeze(contract.energetics.map((obligation) => obligation.behavior)),
    invariants: Object.freeze(contract.energetics.map((obligation) => obligation.invariant)),
    measures: Object.freeze(contract.energetics.flatMap((obligation) => obligation.measure === undefined ? [] : [obligation.measure])),
    evidenced: Object.freeze([...(observation.evidenced ?? evidenceRequired)]),
    satisfied: Object.freeze([...(observation.satisfied ?? contract.energetics.map((obligation) => obligation.id))]),
    evidence: Object.freeze([...evidence]),
    ...(observation.at === undefined ? {} : { at: observation.at }),
    ...(observation.caller === undefined ? {} : { caller: observation.caller }),
    ...(observation.materialBefore === undefined ? {} : { materialBefore: observation.materialBefore }),
    ...(observation.materialAfter === undefined ? {} : { materialAfter: observation.materialAfter }),
    ...(observation.boundary === undefined ? {} : { boundary: observation.boundary }),
    ...(observation.coordinates === undefined ? {} : { coordinates: observation.coordinates }),
  });
}

/** Judge whether an energetic observation satisfies the contract's energetic obligations. */

export function contractEnergeticObservationReport(
  contract,
  observation,
) {
  const requiredObligations = contract.energetics.map((obligation) => obligation.id);
  const requiredEvidence = contract.energetics.filter((obligation) => obligation.evidenceRequired).map((obligation) => obligation.id);
  const missingObligations = requiredObligations.filter((id) => !observation.satisfied.includes(id));
  const missingEvidence = requiredEvidence.filter((id) => !observation.evidenced.includes(id));
  const contractMatched = observation.contract === contract.id &&
    observation.fingerprint === contractFingerprint(contract) &&
    observation.material === contract.material.id &&
    observation.move === contract.move.id &&
    observation.phase === contract.phase.id &&
    observation.lens === contract.lens.id &&
    observation.evidencePolicy === contract.evidencePolicy.id &&
    observation.phaseEnergy === contract.phase.energy &&
    observation.coordinationCost === contract.phase.coordinationCost;
  const obligationsAccounted = missingObligations.length === 0;
  const behaviorAccounted = contract.energetics.every((obligation) =>
    observation.behaviors.includes(obligation.behavior) && phaseAcceptsEnergy(contract.phase, obligation));
  const invariantsAccounted = contract.energetics.every((obligation) => observation.invariants.includes(obligation.invariant));
  const evidencedWhenRequired = missingEvidence.length === 0;
  const evidencePresent = observation.evidence.length > 0;
  const missing = [
    ...(contractMatched ? [] : ["contract"]),
    ...missingObligations.map((id) => `obligation:${id}`),
    ...(behaviorAccounted ? [] : ["behavior"]),
    ...(invariantsAccounted ? [] : ["invariant"]),
    ...missingEvidence.map((id) => `evidence:${id}`),
    ...(evidencePresent ? [] : ["evidence"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract-energetic-observation-report",
    contract: contract.id,
    observationContract: observation.contract,
    phase: contract.phase.id,
    phaseEnergy: contract.phase.energy,
    requiredObligations: Object.freeze(requiredObligations),
    satisfiedObligations: Object.freeze([...observation.satisfied]),
    missingObligations: Object.freeze(missingObligations),
    requiredEvidence: Object.freeze(requiredEvidence),
    evidencedObligations: Object.freeze([...observation.evidenced]),
    missingEvidence: Object.freeze(missingEvidence),
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("contract", contractMatched ? [] : ["contract"]),
      semanticJudgment("obligation", missingObligations.map((id) => `obligation:${id}`)),
      semanticJudgment("behavior", behaviorAccounted ? [] : ["behavior"]),
      semanticJudgment("invariant", invariantsAccounted ? [] : ["invariant"]),
      semanticJudgment("evidence", missingEvidence.map((id) => `evidence:${id}`)),
      semanticJudgment("evidence", evidencePresent ? [] : ["evidence"]),
    ]),
    judgment: semanticJudgment(`${contract.id}.energetic-observation`, missing),
  });
}

/** Build the realized outcome of a relational move: material before/after, lensed boundary, and contract coordinates. */

export function contractOutcome(
  contract,
  outcome

 = {},
) {
  const materialState = outcome.materialAfter ?? outcome.materialBefore;
  const exposure = outcome.exposure ?? contractExposure(contract, {
    ...(outcome.at === undefined ? {} : { at: outcome.at }),
    ...(outcome.caller === undefined ? {} : { caller: outcome.caller }),
    ...(materialState === undefined ? {} : { materialState }),
    ...(outcome.boundary === undefined ? {} : { boundary: outcome.boundary }),
  });
  const lensObservation = outcome.lensObservation ?? contractLensObservation(contract, {
    ...(outcome.at === undefined ? {} : { at: outcome.at }),
    ...(outcome.caller === undefined ? {} : { caller: outcome.caller }),
    ...(materialState === undefined ? {} : { materialState }),
    ...(outcome.boundary === undefined ? {} : { boundaryObject: outcome.boundary }),
  });
  const preconditionObservation = outcome.preconditionObservation ?? contractPredicateObservation(contract, {
    role: "precondition",
    ...(outcome.at === undefined ? {} : { at: outcome.at }),
    ...(outcome.caller === undefined ? {} : { caller: outcome.caller }),
    ...(outcome.materialBefore === undefined ? {} : { materialState: outcome.materialBefore }),
  });
  const postconditionObservation = outcome.postconditionObservation ?? contractPredicateObservation(contract, {
    role: "postcondition",
    ...(outcome.at === undefined ? {} : { at: outcome.at }),
    ...(outcome.caller === undefined ? {} : { caller: outcome.caller }),
    ...(outcome.materialAfter === undefined ? {} : { materialState: outcome.materialAfter }),
    ...(outcome.boundary === undefined ? {} : { boundary: outcome.boundary }),
    coordinates: exposure.coordinates,
  });
  const energeticObservation = outcome.energeticObservation ?? contractEnergeticObservation(contract, {
    ...(outcome.at === undefined ? {} : { at: outcome.at }),
    ...(outcome.caller === undefined ? {} : { caller: outcome.caller }),
    ...(outcome.materialBefore === undefined ? {} : { materialBefore: outcome.materialBefore }),
    ...(outcome.materialAfter === undefined ? {} : { materialAfter: outcome.materialAfter }),
    ...(outcome.boundary === undefined ? {} : { boundary: outcome.boundary }),
    coordinates: exposure.coordinates,
  });
  const phaseObservation = outcome.phaseObservation ?? contractPhaseObservation(contract, {
    ...(outcome.at === undefined ? {} : { at: outcome.at }),
    ...(outcome.caller === undefined ? {} : { caller: outcome.caller }),
    ...(outcome.materialBefore === undefined ? {} : { materialBefore: outcome.materialBefore }),
    ...(outcome.materialAfter === undefined ? {} : { materialAfter: outcome.materialAfter }),
    ...(outcome.boundary === undefined ? {} : { boundary: outcome.boundary }),
    coordinates: exposure.coordinates,
  });
  return Object.freeze({
    kind: "metroplat.contract-outcome",
    contract: contract.id,
    fingerprint: contractFingerprint(contract),
    material: contract.material.id,
    precondition: contract.precondition.id,
    move: contract.move.id,
    postcondition: contract.postcondition.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    coordinates: exposure.coordinates,
    exposure,
    lensObservation,
    preconditionObservation,
    postconditionObservation,
    energeticObservation,
    phaseObservation,
    ...(outcome.at === undefined ? {} : { at: outcome.at }),
    ...(outcome.caller === undefined ? {} : { caller: outcome.caller }),
    ...(outcome.materialBefore === undefined ? {} : { materialBefore: outcome.materialBefore }),
    ...(outcome.materialAfter === undefined ? {} : { materialAfter: outcome.materialAfter }),
    ...(outcome.boundary === undefined ? {} : { boundary: outcome.boundary }),
  });
}

/** Judge whether a realized outcome accounts for the move's material, boundary, phase, lens, and witness effects. */

export function contractOutcomeReport(
  contract,
  outcome,
) {
  const exposureReport = contractExposureReport(contract, outcome.exposure);
  const lensObservationReport = contractLensObservationReport(contract, outcome.lensObservation);
  const preconditionReport = contractPredicateObservationReport(contract, outcome.preconditionObservation);
  const postconditionReport = contractPredicateObservationReport(contract, outcome.postconditionObservation);
  const energeticReport = contractEnergeticObservationReport(contract, outcome.energeticObservation);
  const phaseObservationReport = contractPhaseObservationReport(contract, outcome.phaseObservation);
  const contractMatched = outcome.contract === contract.id &&
    outcome.fingerprint === contractFingerprint(contract) &&
    outcome.material === contract.material.id &&
    outcome.precondition === contract.precondition.id &&
    outcome.move === contract.move.id &&
    outcome.postcondition === contract.postcondition.id &&
    outcome.phase === contract.phase.id &&
    outcome.lens === contract.lens.id &&
    outcome.evidencePolicy === contract.evidencePolicy.id;
  const exposureMatched = outcome.exposure.contract === outcome.contract &&
    outcome.exposure.fingerprint === outcome.fingerprint &&
    outcome.exposure.material === outcome.material &&
    outcome.exposure.precondition === outcome.precondition &&
    outcome.exposure.move === outcome.move &&
    outcome.exposure.postcondition === outcome.postcondition &&
    outcome.exposure.phase === outcome.phase &&
    outcome.exposure.lens === outcome.lens &&
    outcome.exposure.evidencePolicy === outcome.evidencePolicy &&
    outcome.lensObservation.contract === outcome.contract &&
    outcome.lensObservation.fingerprint === outcome.fingerprint &&
    outcome.lensObservation.material === outcome.material &&
    outcome.lensObservation.phase === outcome.phase &&
    outcome.lensObservation.lens === outcome.lens &&
    outcome.lensObservation.evidencePolicy === outcome.evidencePolicy &&
    outcome.preconditionObservation.contract === outcome.contract &&
    outcome.preconditionObservation.fingerprint === outcome.fingerprint &&
    outcome.preconditionObservation.material === outcome.material &&
    outcome.preconditionObservation.move === outcome.move &&
    outcome.preconditionObservation.phase === outcome.phase &&
    outcome.preconditionObservation.lens === outcome.lens &&
    outcome.preconditionObservation.evidencePolicy === outcome.evidencePolicy &&
    outcome.postconditionObservation.contract === outcome.contract &&
    outcome.postconditionObservation.fingerprint === outcome.fingerprint &&
    outcome.postconditionObservation.material === outcome.material &&
    outcome.postconditionObservation.move === outcome.move &&
    outcome.postconditionObservation.phase === outcome.phase &&
    outcome.postconditionObservation.lens === outcome.lens &&
    outcome.postconditionObservation.evidencePolicy === outcome.evidencePolicy &&
    outcome.energeticObservation.contract === outcome.contract &&
    outcome.energeticObservation.fingerprint === outcome.fingerprint &&
    outcome.energeticObservation.material === outcome.material &&
    outcome.energeticObservation.move === outcome.move &&
    outcome.energeticObservation.phase === outcome.phase &&
    outcome.energeticObservation.lens === outcome.lens &&
    outcome.energeticObservation.evidencePolicy === outcome.evidencePolicy &&
    outcome.phaseObservation.contract === outcome.contract &&
    outcome.phaseObservation.fingerprint === outcome.fingerprint &&
    outcome.phaseObservation.material === outcome.material &&
    outcome.phaseObservation.move === outcome.move &&
    outcome.phaseObservation.phase === outcome.phase &&
    outcome.phaseObservation.lens === outcome.lens &&
    outcome.phaseObservation.evidencePolicy === outcome.evidencePolicy &&
    outcome.exposure.coordinates.contract === outcome.coordinates.contract &&
    outcome.exposure.coordinates.fingerprint === outcome.coordinates.fingerprint &&
    outcome.exposure.coordinates.material === outcome.coordinates.material &&
    outcome.exposure.coordinates.move === outcome.coordinates.move &&
    outcome.exposure.coordinates.phase === outcome.coordinates.phase &&
    outcome.exposure.coordinates.lens === outcome.coordinates.lens &&
    outcome.exposure.coordinates.evidencePolicy === outcome.coordinates.evidencePolicy;
  const materialAccounted = !contract.move.effects.includes("material") ||
    outcome.materialAfter !== undefined ||
    outcome.exposure.materialState !== undefined;
  const boundaryAccounted = !contract.move.effects.includes("boundary") ||
    outcome.boundary !== undefined ||
    outcome.exposure.boundary !== undefined;
  const evidenceAccounted = !(contract.move.effects.includes("evidence") || contract.evidencePolicy.required) ||
    semanticJudgmentWitnessed(exposureReport.judgment);
  const phaseAccounted = semanticJudgmentWitnessed(phaseObservationReport.judgment) &&
    (!contract.move.effects.includes("phase") || outcome.phase === contract.phase.id);
  const lensAccounted = semanticJudgmentWitnessed(lensObservationReport.judgment) &&
    outcome.lens === contract.lens.id &&
    outcome.exposure.lens === contract.lens.id &&
    valuesEquivalent(outcome.boundary, outcome.exposure.boundary) &&
    valuesEquivalent(outcome.boundary, outcome.lensObservation.boundaryObject);
  const missing = [
    ...(contractMatched ? [] : ["contract"]),
    ...(exposureMatched ? [] : ["exposure"]),
    ...(semanticJudgmentWitnessed(exposureReport.judgment) ? [] : exposureReport.missing.map((entry) => `exposure:${entry}`)),
    ...(semanticJudgmentWitnessed(lensObservationReport.judgment) ? [] : lensObservationReport.missing.map((entry) => `lens-observation:${entry}`)),
    ...(semanticJudgmentWitnessed(preconditionReport.judgment) ? [] : preconditionReport.missing.map((entry) => `precondition:${entry}`)),
    ...(semanticJudgmentWitnessed(postconditionReport.judgment) ? [] : postconditionReport.missing.map((entry) => `postcondition:${entry}`)),
    ...(semanticJudgmentWitnessed(energeticReport.judgment) ? [] : energeticReport.missing.map((entry) => `energetics:${entry}`)),
    ...(semanticJudgmentWitnessed(phaseObservationReport.judgment) ? [] : phaseObservationReport.missing.map((entry) => `phase-observation:${entry}`)),
    ...(materialAccounted ? [] : ["material"]),
    ...(boundaryAccounted ? [] : ["boundary"]),
    ...(evidenceAccounted ? [] : ["evidence"]),
    ...(phaseAccounted ? [] : ["phase"]),
    ...(lensAccounted ? [] : ["lens"]),
  ];
  const boundaryOnly = boundaryOnlyLens(contract);
  const judgment = semanticJudgment(`${contract.id}.outcome`, missing, boundaryOnly);
  const aspects = Object.freeze([
    semanticJudgment("contract", contractMatched ? [] : ["contract"], boundaryOnly),
    semanticJudgment("exposure", [
      ...(exposureMatched ? [] : ["exposure"]),
      ...(semanticJudgmentWitnessed(exposureReport.judgment) ? [] : exposureReport.missing.map((entry) => `exposure:${entry}`)),
    ], boundaryOnly),
    semanticJudgment("lens-observation", semanticJudgmentWitnessed(lensObservationReport.judgment) ? [] : lensObservationReport.missing.map((entry) => `lens-observation:${entry}`), boundaryOnly),
    semanticJudgment("precondition", semanticJudgmentWitnessed(preconditionReport.judgment) ? [] : preconditionReport.missing.map((entry) => `precondition:${entry}`), boundaryOnly),
    semanticJudgment("postcondition", semanticJudgmentWitnessed(postconditionReport.judgment) ? [] : postconditionReport.missing.map((entry) => `postcondition:${entry}`), boundaryOnly),
    semanticJudgment("energetics", semanticJudgmentWitnessed(energeticReport.judgment) ? [] : energeticReport.missing.map((entry) => `energetics:${entry}`), boundaryOnly),
    semanticJudgment("phase-observation", semanticJudgmentWitnessed(phaseObservationReport.judgment) ? [] : phaseObservationReport.missing.map((entry) => `phase-observation:${entry}`), boundaryOnly),
    semanticJudgment("material", materialAccounted ? [] : ["material"], boundaryOnly),
    semanticJudgment("boundary", boundaryAccounted ? [] : ["boundary"], boundaryOnly),
    semanticJudgment("evidence", evidenceAccounted ? [] : ["evidence"], boundaryOnly),
    semanticJudgment("phase", phaseAccounted ? [] : ["phase"], boundaryOnly),
    semanticJudgment("lens", lensAccounted ? [] : ["lens"], boundaryOnly),
  ]);
  return Object.freeze({
    kind: "metroplat.contract-outcome-report",
    contract: contract.id,
    outcomeContract: outcome.contract,
    exposureContract: outcome.exposure.contract,
    move: contract.move.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    missing: Object.freeze(missing),
    aspects,
    judgment,
  });
}
