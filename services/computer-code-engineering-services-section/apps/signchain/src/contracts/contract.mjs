/**
 * contracts/contract - the relational Hoare contract: precondition, move,
 * postcondition, and their composition/witnessing/exposure.
 */

import { phaseSignature, phaseEvidence } from "./phase.mjs";
import { observationalLens } from "./observation-lens.mjs";
import { evidencePolicy } from "./evidence-policy.mjs";
import { energeticObligation } from "./energetics.mjs";
import {
  semanticJudgment, semanticJudgmentWitnessed, fiberAspectWitnessed,
} from "./judgment.mjs";

/** Any value the contract calculus carries as boundary material. */

/** Relational material Γ: loci, incidence, fibers, charge algebra, constraints, closure, and boundary observations. */

export function facultyFace(spec) {
  return Object.freeze({ ...spec });
}

export function relationalFacultyCover(spec) {
  return Object.freeze({
    ...spec,
    kind: "metroplat.faculty-cover",
    faces: Object.freeze(spec.faces.map(facultyFace)),
  });
}

export function materialContext(spec) {
  return Object.freeze({
    ...spec,
    loci: Object.freeze([...spec.loci]),
    incidence: Object.freeze([...spec.incidence]),
    fibers: Object.freeze([...spec.fibers]),
    ...(spec.cover === undefined ? {} : { cover: relationalFacultyCover(spec.cover) }),
    constraints: Object.freeze([...spec.constraints]),
    closure: Object.freeze([...spec.closure]),
    ...(spec.phaseEvidence === undefined ? {} : { phaseEvidence: Object.freeze(spec.phaseEvidence.map(phaseEvidence)) }),
    boundary: Object.freeze([...spec.boundary]),
  });
}

/** Canonical lexical comparison used by contract evidence and its derived reports. */
export function normalizedToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Phase-indexed relational Hoare contract projected from an instrument or action. */

/** One accountable boundary observation of a contract: material/phase/lens/witness plus exposed boundary value. */

/** Decidable accountability report for whether one exposure satisfies a contract's evidence policy Ω. */

/** Accountable observation through Λ: what the lens preserves, hides, and exposes at the boundary. */

export function relationalMove(spec) {
  return Object.freeze({ ...spec, effects: Object.freeze([...spec.effects]) });
}

export function relationalPredicate(spec) {
  return Object.freeze({
    ...spec,
    ...(spec.entails === undefined ? {} : { entails: Object.freeze([...spec.entails]) }),
  });
}

export function relationalContract(spec) {
  const phase = phaseSignature(spec.phase);
  const material = materialContext(spec.material);
  return Object.freeze({
    kind: "metroplat.contract",
    id: spec.id,
    material,
    precondition: relationalPredicate(spec.precondition),
    move: relationalMove(spec.move),
    postcondition: relationalPredicate(spec.postcondition),
    phase,
    lens: observationalLens(spec.lens),
    evidencePolicy: evidencePolicy(spec.evidencePolicy),
    energetics: Object.freeze(spec.energetics.map((obligation) => energeticObligation(obligation))),
    refinements: Object.freeze(spec.refinements.map((refinement) => Object.freeze({
      ...refinement,
      preserves: Object.freeze([...refinement.preserves]),
    }))),
  });
}

export function canonicalContractValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalContractValue).join(",")}]`;
  const object = value;
  return `{${Object.keys(object).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalContractValue(object[key])}`).join(",")}}`;
}

export function contractFingerprint(contract) {
  return canonicalContractValue(contract);
}

export function predicatesCompose(postcondition, precondition) {
  const postEntails = postcondition.entails ?? [];
  const preEntails = precondition.entails ?? [];
  return postcondition.id === precondition.id ||
    postEntails.includes(precondition.id) ||
    postEntails.some((predicate) => preEntails.includes(predicate));
}

export function contractsCompose(left, right) {
  const boundaryCompatible = left.move.codomain !== undefined &&
    right.move.domain !== undefined &&
    left.move.codomain === right.move.domain;
  const predicateCompatible = predicatesCompose(left.postcondition, right.precondition);
  const phaseCompatible = left.phase.id === right.phase.id;
  const lensCompatible = left.lens.id === right.lens.id;
  const evidencePolicyCompatible = left.evidencePolicy.id === right.evidencePolicy.id;
  const missing = [
    ...(boundaryCompatible ? [] : ["boundary-compatibility"]),
    ...(predicateCompatible ? [] : ["predicate-compatibility"]),
  ];
  return Object.freeze({
    kind: "metroplat.contract.composition",
    left: left.id,
    right: right.id,
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("boundary-compatibility", boundaryCompatible ? [] : ["boundary-compatibility"]),
      semanticJudgment("predicate-compatibility", predicateCompatible ? [] : ["predicate-compatibility"]),
      semanticJudgment("phase-compatibility", phaseCompatible ? [] : ["phase-compatibility"], true),
      semanticJudgment("lens-compatibility", lensCompatible ? [] : ["lens-compatibility"], true),
      semanticJudgment("evidence-policy-compatibility", evidencePolicyCompatible ? [] : ["evidence-policy-compatibility"], true),
    ]),
    judgment: semanticJudgment(`${left.id}.then.${right.id}.composition`, missing),
  });
}

export function uniqueStrings(values) {
  return Object.freeze([...new Set(values)]);
}

function uniquePhaseEvidence(values) {
  const byId = new Map();
  for (const value of values) {
    if (!byId.has(value.id)) byId.set(value.id, phaseEvidence(value));
  }
  return Object.freeze([...byId.values()]);
}

/** Construct the Hoare-composite contract for `right ∘ left` when boundary and Q=>P compatibility hold. */

export function composeRelationalContracts(
  left,
  right,
  options

 = {},
) {
  const report = contractsCompose(left, right);
  if (!semanticJudgmentWitnessed(report.judgment)) {
    throw new TypeError(`composeRelationalContracts: ${left.id} does not compose with ${right.id}`);
  }
  const id = options.id ?? `${left.id}.then.${right.id}`;
  const domain = left.move.domain;
  const codomain = right.move.codomain;
  const lens = observationalLens({
    id: `${id}.lens`,
    domain: left.lens.domain,
    boundary: right.lens.boundary,
    preserves: uniqueStrings([
      ...left.lens.preserves,
      ...right.lens.preserves,
      `left lens ${left.lens.id}`,
      `right lens ${right.lens.id}`,
    ]),
    hides: uniqueStrings([
      ...left.lens.hides,
      ...right.lens.hides,
      "intermediate implementation",
    ]),
    output: right.lens.output,
    evidenceRequired: left.lens.evidenceRequired || right.lens.evidenceRequired,
  });
  const composedEvidencePolicy = left.evidencePolicy.id === right.evidencePolicy.id
    ? left.evidencePolicy
    : evidencePolicy({
        id: `${id}.coordinates`,
        required: left.evidencePolicy.required || right.evidencePolicy.required,
        records: uniqueStrings([...left.evidencePolicy.records, ...right.evidencePolicy.records, "composition"]),
        time: left.evidencePolicy.time === right.evidencePolicy.time ? left.evidencePolicy.time : "interval",
        caller: left.evidencePolicy.caller === "required" || right.evidencePolicy.caller === "required"
          ? "required"
          : left.evidencePolicy.caller === "optional" || right.evidencePolicy.caller === "optional"
            ? "optional"
            : "none",
        boundaryObject: left.evidencePolicy.boundaryObject === "full" || right.evidencePolicy.boundaryObject === "full"
          ? "full"
          : left.evidencePolicy.boundaryObject === "fingerprint" || right.evidencePolicy.boundaryObject === "fingerprint"
            ? "fingerprint"
            : "none",
      });
  const contract = relationalContract({
    id,
    material: materialContext({
      id: `${id}.material`,
      loci: uniqueStrings([
        ...left.material.loci,
        ...right.material.loci,
        left.move.codomain,
        `${id}:composite`,
      ]),
      incidence: uniqueStrings([
        ...left.material.incidence,
        ...right.material.incidence,
        `${left.move.id} produces ${left.move.codomain}`,
        `${left.move.codomain} satisfies ${right.move.domain}`,
        `${right.move.id} consumes ${right.move.domain}`,
      ]),
      fibers: uniqueStrings([...left.material.fibers, ...right.material.fibers, "composition witness"]),
      valueAlgebra: `${left.material.valueAlgebra}+${right.material.valueAlgebra}`,
      constraints: uniqueStrings([
        ...left.material.constraints,
        ...right.material.constraints,
        `boundary ${left.move.codomain} equals ${right.move.domain}`,
        `${left.postcondition.id} entails ${right.precondition.id}`,
        `phase-compatible:${fiberAspectWitnessed(report.aspects, "phase-compatibility")}`,
        `lens-compatible:${fiberAspectWitnessed(report.aspects, "lens-compatibility")}`,
        `evidence-policy-compatible:${fiberAspectWitnessed(report.aspects, "evidence-policy-compatibility")}`,
      ]),
      closure: uniqueStrings([
        ...left.material.closure,
        "hoare-composition-cut",
        ...right.material.closure,
        "composite-contract-evidence-exposure",
      ]),
      phaseEvidence: uniquePhaseEvidence([
        ...(left.material.phaseEvidence ?? []),
        ...(right.material.phaseEvidence ?? []),
      ]),
      boundary: uniqueStrings([...left.material.boundary, ...right.material.boundary]),
    }),
    precondition: left.precondition,
    move: relationalMove({
      id: options.moveId ?? `${left.move.id}.then.${right.move.id}`,
      description: options.description ?? `Hoare composite ${right.move.id} after ${left.move.id}.`,
      ...(domain === undefined ? {} : { domain }),
      ...(codomain === undefined ? {} : { codomain }),
      partial: left.move.partial || right.move.partial,
      deterministic: left.move.deterministic && right.move.deterministic,
      effects: uniqueStrings([...left.move.effects, ...right.move.effects]),
    }),
    postcondition: right.postcondition,
    phase: left.phase.id === right.phase.id ? left.phase : right.phase,
    lens,
    evidencePolicy: composedEvidencePolicy,
    energetics: Object.freeze([
      ...left.energetics,
      ...right.energetics,
      energeticObligation({
        id: `${id}.energy.composition`,
        law: "coordination-cost",
        behavior: (left.phase.id === right.phase.id ? left.phase : right.phase).energy,
        source: left.postcondition.id,
        target: right.precondition.id,
        invariant: `Hoare composition spends the compatibility work ${left.postcondition.id} => ${right.precondition.id}.`,
        measure: `phase-compatible:${fiberAspectWitnessed(report.aspects, "phase-compatibility")};lens-compatible:${fiberAspectWitnessed(report.aspects, "lens-compatibility")};evidence-policy-compatible:${fiberAspectWitnessed(report.aspects, "evidence-policy-compatibility")}`,
        evidenceRequired: composedEvidencePolicy.required || lens.evidenceRequired,
      }),
    ]),
    refinements: Object.freeze([
      ...left.refinements,
      ...right.refinements,
      Object.freeze({
        id: `${id}.refinement.hoare-composition`,
        implementation: "composeRelationalContracts",
        refines: "function",
        preserves: Object.freeze([
          left.id,
          right.id,
          left.postcondition.id,
          right.precondition.id,
          "boundary compatibility",
          "predicate compatibility",
        ]),
      }),
    ]),
  });
  return Object.freeze({
    kind: "metroplat.contract.composite",
    id,
    left: left.id,
    right: right.id,
    report,
    contract,
  });
}

/** Conservative decidable composition report for instruments: schema boundary, Q=>P, and matching phase/lens/evidence indices. */

export function contractCoordinates(
  contract,
  exposure

 = {},
) {
  return Object.freeze({
    kind: "metroplat.contract.coordinates",
    contract: contract.id,
    fingerprint: contractFingerprint(contract),
    material: contract.material.id,
    move: contract.move.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    ...(exposure.at === undefined ? {} : { at: exposure.at }),
    ...(exposure.caller === undefined ? {} : { caller: exposure.caller }),
    ...(exposure.boundary === undefined ? {} : { boundary: exposure.boundary }),
  });
}

function defaultExposureStage(contract) {
  return contract.evidencePolicy.time === "none"
    ? undefined
    : `stage:${contract.phase.finality}:${contract.phase.id}`;
}

/** Build the observed outcome of a relational contract exposure: boundary plus contract coordinates under the same Φ/Λ/Ω. */

export function contractExposure(
  contract,
  exposure

 = {},
) {
  const coordinateExposure = {
    ...exposure,
    ...(exposure.at === undefined && defaultExposureStage(contract) !== undefined
      ? { at: defaultExposureStage(contract) }
      : {}),
  };
  const coordinates = contractCoordinates(contract, coordinateExposure);
  return Object.freeze({
    kind: "metroplat.contract-exposure",
    contract: contract.id,
    fingerprint: coordinates.fingerprint,
    material: contract.material.id,
    precondition: contract.precondition.id,
    move: contract.move.id,
    postcondition: contract.postcondition.id,
    phase: contract.phase.id,
    lens: contract.lens.id,
    evidencePolicy: contract.evidencePolicy.id,
    coordinates,
    ...(coordinateExposure.at === undefined ? {} : { at: coordinateExposure.at }),
    ...(coordinateExposure.caller === undefined ? {} : { caller: coordinateExposure.caller }),
    ...(coordinateExposure.materialState === undefined ? {} : { materialState: coordinateExposure.materialState }),
    ...(coordinateExposure.boundary === undefined ? {} : { boundary: coordinateExposure.boundary }),
  });
}

function exposureHasRecord(exposure, record) {
  const token = normalizedToken(record);
  if (token === "material" || token === "material context") return exposure.material.length > 0;
  if (token === "material state") return exposure.materialState !== undefined;
  if (token === "move") return exposure.move.length > 0;
  if (token === "phase") return exposure.phase.length > 0;
  if (token === "lens") return exposure.lens.length > 0;
  if (token === "precondition") return exposure.precondition.length > 0;
  if (token === "postcondition") return exposure.postcondition.length > 0;
  if (token === "boundary" || token === "boundary object") return exposure.boundary !== undefined;
  if (token === "caller" || token === "observer") return exposure.caller !== undefined;
  if (token === "time" || token === "stage" || token === "timestamp") return exposure.at !== undefined || exposure.coordinates.at !== undefined;
  if (token === "contract") return exposure.contract.length > 0;
  if (token === "evidence" || token === "evidence policy") return exposure.evidencePolicy.length > 0 && exposure.coordinates.evidencePolicy.length > 0;
  if (token === "composition") return exposure.material.includes("composite") || exposure.move.includes(".then.");
  return [
    exposure.contract,
    exposure.fingerprint,
    exposure.material,
    exposure.precondition,
    exposure.move,
    exposure.postcondition,
    exposure.phase,
    exposure.lens,
    exposure.evidencePolicy,
  ].map(normalizedToken).some((value) => value === token || value.includes(token));
}

/** Judge whether a concrete boundary exposure satisfies the contract and its evidence policy Ω. */

export function contractExposureReport(
  contract,
  exposure,
) {
  const fingerprint = contractFingerprint(contract);
  const expectedCoordinates = contractCoordinates(contract, {
    ...(exposure.at === undefined ? {} : { at: exposure.at }),
    ...(exposure.caller === undefined ? {} : { caller: exposure.caller }),
    ...(exposure.boundary === undefined ? {} : { boundary: exposure.boundary }),
  });
  const contractMatched = exposure.contract === contract.id &&
    exposure.fingerprint === fingerprint &&
    exposure.material === contract.material.id &&
    exposure.precondition === contract.precondition.id &&
    exposure.move === contract.move.id &&
    exposure.postcondition === contract.postcondition.id &&
    exposure.phase === contract.phase.id &&
    exposure.lens === contract.lens.id &&
    exposure.evidencePolicy === contract.evidencePolicy.id;
  const coordinatesMatched = exposure.coordinates.contract === expectedCoordinates.contract &&
    exposure.coordinates.fingerprint === expectedCoordinates.fingerprint &&
    exposure.coordinates.material === expectedCoordinates.material &&
    exposure.coordinates.move === expectedCoordinates.move &&
    exposure.coordinates.phase === expectedCoordinates.phase &&
    exposure.coordinates.lens === expectedCoordinates.lens &&
    exposure.coordinates.evidencePolicy === expectedCoordinates.evidencePolicy &&
    (expectedCoordinates.at === undefined || exposure.coordinates.at !== undefined) &&
    (expectedCoordinates.caller === undefined || exposure.coordinates.caller !== undefined) &&
    (expectedCoordinates.boundary === undefined || exposure.coordinates.boundary !== undefined);
  const recordsPresent = contract.evidencePolicy.records.filter((record) => exposureHasRecord(exposure, record));
  const recordsMissing = contract.evidencePolicy.records.filter((record) => !recordsPresent.includes(record));
  const timeAccounted = contract.evidencePolicy.time === "none" ||
    exposure.at !== undefined ||
    exposure.coordinates.at !== undefined;
  const callerAccounted = contract.evidencePolicy.caller !== "required" ||
    exposure.caller !== undefined ||
    exposure.coordinates.caller !== undefined;
  const boundaryAccounted = contract.evidencePolicy.boundaryObject === "none" ||
    exposure.boundary !== undefined ||
    exposure.coordinates.boundary !== undefined;
  const missing = [
    ...(contractMatched ? [] : ["contract"]),
    ...(coordinatesMatched ? [] : ["evidence"]),
    ...recordsMissing.map((record) => `record:${record}`),
    ...(timeAccounted ? [] : ["time"]),
    ...(callerAccounted ? [] : ["caller"]),
    ...(boundaryAccounted ? [] : ["boundary"]),
  ];
  const aspects = Object.freeze([
    semanticJudgment("contract", contractMatched ? [] : ["contract"]),
    semanticJudgment("evidence", coordinatesMatched ? [] : ["evidence"]),
    semanticJudgment("records", recordsMissing.map((record) => `record:${record}`)),
    semanticJudgment("time", timeAccounted ? [] : ["time"]),
    semanticJudgment("caller", callerAccounted ? [] : ["caller"]),
    semanticJudgment("boundary", boundaryAccounted ? [] : ["boundary"]),
  ]);
  return Object.freeze({
    kind: "metroplat.contract-exposure-report",
    contract: contract.id,
    exposureContract: exposure.contract,
    evidencePolicy: contract.evidencePolicy.id,
    requiredRecords: Object.freeze([...contract.evidencePolicy.records]),
    recordsPresent: Object.freeze(recordsPresent),
    recordsMissing: Object.freeze(recordsMissing),
    missing: Object.freeze(missing),
    aspects,
    judgment: semanticJudgment(contract.id, missing),
  });
}
