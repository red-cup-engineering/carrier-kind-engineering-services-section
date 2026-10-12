/**
 * contracts/instrument - Gamma vDash {P} m {Q}: the primary metroplat object,
 * its protocol/faculty-cover framing, and its derived obligations.
 */

import { phaseSignature, phaseEvidence } from "./phase.mjs";
import { observationalLens } from "./observation-lens.mjs";
import { evidencePolicy } from "./evidence-policy.mjs";
import { energeticObligation, energeticLawForPhase } from "./energetics.mjs";
import { admissibilityPresentation } from "./admissibility-presentation.mjs";
import {
  semanticJudgment, fiberAspectWitnessed,
} from "./judgment.mjs";
import {
  relationalContract, relationalMove, relationalPredicate, contractsCompose,
  materialContext, relationalFacultyCover,

} from "./contract.mjs";

/** A concrete artifact read as a refinement of an instrument, presentation, move, lens, or evidence policy. */

/** Primary metroplat object: Γ ⊨ {P} m {Q} under phase Φ, lens Λ, evidence policy Ω, and energetic obligations. */

/** Test/example obligation derived from an instrument, not from historical file inventory. */

/** The diagonal-agent faculty cover: communicating/knowing/playing, glued holographically. Shared by every operation contract and every diagonal-agent protocol instrument — not specific to any one of them. */
export const diagonalAgentCover = relationalFacultyCover({
  kind: "metroplat.faculty-cover",
  id: "metroplat.cover.diagonal-agent",
  scale: "diagonal-agent",
  faces: Object.freeze([
    { id: "metroplat.face.communicating", faculty: "communicating", direction: "across", axis: "truth", role: "local-section" },
    { id: "metroplat.face.knowing", faculty: "knowing", direction: "inside", axis: "knowledge", role: "local-section" },
    { id: "metroplat.face.playing", faculty: "playing", direction: "outside", axis: "evidence", role: "local-section" },
  ]),
  gluing: "holographic-global-section",
  obstruction: "h1-vanishing",
  coordination: "coordination-free-when-glued",
  mobility: "none",
});

/** The off-diagonal-collective faculty cover: socializing/computing/gaming, glued by Mayer–Vietoris. Shared by every off-diagonal-collective protocol instrument. */
export const offDiagonalCollectiveCover = relationalFacultyCover({
  kind: "metroplat.faculty-cover",
  id: "metroplat.cover.off-diagonal-collective",
  scale: "off-diagonal-collective",
  faces: Object.freeze([
    { id: "metroplat.face.socializing", faculty: "socializing", direction: "across", axis: "truth", role: "constituent-section" },
    { id: "metroplat.face.computing", faculty: "computing", direction: "inside", axis: "knowledge", role: "constituent-section" },
    { id: "metroplat.face.gaming", faculty: "gaming", direction: "outside", axis: "evidence", role: "constituent-section" },
  ]),
  gluing: "cross-arena-mayer-vietoris",
  obstruction: "federation-only-cokernel",
  coordination: "consensus-cost-possibly-irreducible",
  mobility: "name-passing",
});

/** The standard boundary evidence policy every operation contract and every protocol instrument in this package is checked against by default. */
export const boundaryEvidencePolicy = evidencePolicy({
  id: "metroplat.witness.boundary-exposure",
  required: true,
  records: Object.freeze(["material", "move", "phase", "lens", "precondition", "postcondition", "boundary"]),
  time: "instant",
  caller: "optional",
  boundaryObject: "fingerprint",
});

export function materialContextFromCover(
  cover,
  options

 = {},
) {
  const realized = relationalFacultyCover(cover);
  return materialContext({
    id: options.id ?? `${realized.id}.material`,
    loci: realized.faces.map((face) => face.id),
    incidence: realized.faces.map((face) => `${face.id}:${face.direction}`),
    fibers: realized.faces.map((face) => `${face.id}:${face.axis}`),
    valueAlgebra: options.valueAlgebra ?? "FOUR",
    cover: realized,
    ...(options.section === undefined ? {} : { section: options.section }),
    constraints: Object.freeze([
      realized.gluing,
      realized.obstruction,
      realized.coordination,
      ...(options.constraints ?? []),
    ]),
    closure: Object.freeze(options.closure ?? [
      realized.scale === "diagonal-agent" ? "holographic-global-section-gluing" : "cross-arena-section-gluing",
      realized.coordination,
    ]),
    ...(options.phaseEvidence === undefined ? {} : { phaseEvidence: Object.freeze(options.phaseEvidence.map(phaseEvidence)) }),
    boundary: Object.freeze(options.boundary ?? realized.faces.map((face) => face.faculty)),
  });
}

export function relationalProtocol(spec) {
  return Object.freeze({
    kind: "metroplat.protocol",
    id: spec.id,
    name: spec.name,
    cover: relationalFacultyCover(spec.cover),
    face: spec.face,
    authority: spec.authority,
    phase: phaseSignature(spec.phase),
    lens: observationalLens(spec.lens),
    evidencePolicy: evidencePolicy(spec.evidencePolicy),
    material: materialContext(spec.material),
    precondition: relationalPredicate(spec.precondition),
    move: relationalMove(spec.move),
    postcondition: relationalPredicate(spec.postcondition),
    schemas: Object.freeze([...spec.schemas]),
    obligations: Object.freeze([...spec.obligations]),
  });
}

export function instrumentRelation(spec) {
  return Object.freeze({
    kind: "metroplat.instrument-relation",
    id: spec.id,
    instrument: spec.instrument,
    ...(spec.surface === undefined ? {} : { surface: spec.surface }),
    relation: spec.relation,
    target: spec.target,
    targetKind: spec.targetKind,
    evidence: Object.freeze([...spec.evidence]),
    preserves: Object.freeze([...spec.preserves]),
    ...(spec.contract === undefined ? {} : { contract: spec.contract }),
  });
}

/** Build an admissibility presentation from its material boundary, invariants, lenses, and projections. */
/** Build a runtime/language artifact projection that refines contract material rather than defining it. */

export function implementationProjection(spec) {
  return Object.freeze({
    kind: "metroplat.implementation-projection",
    id: spec.id,
    projection: spec.projection,
    implementation: spec.implementation,
    refines: spec.refines,
    ...(spec.lens === undefined ? {} : { lens: spec.lens }),
    ...(spec.evidencePolicy === undefined ? {} : { evidencePolicy: spec.evidencePolicy }),
    preserves: Object.freeze([...spec.preserves]),
  });
}

/** Build the primary metroplat configuration object: material, presentations, move, phase, lens, witness, energetics, projections. */

export function relationalInstrument(spec) {
  const lens = observationalLens(spec.lens);
  const policy = evidencePolicy(spec.evidencePolicy);
  return Object.freeze({
    kind: "metroplat.relational-instrument",
    id: spec.id,
    material: materialContext(spec.material),
    presentations: Object.freeze(spec.presentations.map((presentation) => admissibilityPresentation(presentation))),
    precondition: relationalPredicate(spec.precondition),
    move: relationalMove(spec.move),
    postcondition: relationalPredicate(spec.postcondition),
    phase: phaseSignature(spec.phase),
    lens,
    evidencePolicy: policy,
    energetics: Object.freeze(spec.energetics.map((obligation) => energeticObligation(obligation))),
    projections: Object.freeze(spec.projections.map((projection) => implementationProjection(projection))),
  });
}

/** Project an instrument into its phase-indexed Hoare contract; implementation projections become refinement obligations. */

export function instrumentContract(instrument) {
  return relationalContract({
    id: `${instrument.id}.contract`,
    material: instrument.material,
    precondition: instrument.precondition,
    move: instrument.move,
    postcondition: instrument.postcondition,
    phase: instrument.phase,
    lens: instrument.lens,
    evidencePolicy: instrument.evidencePolicy,
    energetics: instrument.energetics,
    refinements: instrument.projections.map((projection) => Object.freeze({
      id: `${projection.id}.refinement`,
      implementation: projection.implementation,
      refines: projection.projection,
      preserves: Object.freeze([
        ...projection.preserves,
        ...(projection.lens === undefined ? [] : [projection.lens]),
        ...(projection.evidencePolicy === undefined ? [] : [projection.evidencePolicy]),
      ]),
    })),
  });
}

/** Read the composition addresses presented by an instrument's presentation boundaries. */

export function instrumentBoundaryAddresses(instrument) {
  return Object.freeze(instrument.presentations.map((presentation) => presentation.address));
}

function presentationMaterialPresented(instrument, presentation) {
  return presentation.material === instrument.material.id ||
    instrument.material.loci.includes(presentation.material) ||
    instrument.material.boundary.includes(presentation.material) ||
    instrument.material.fibers.includes(presentation.material);
}

export function boundaryParts(boundary) {
  if (boundary === undefined) return Object.freeze([]);
  return Object.freeze(boundary.split("+").map((part) => part.trim()).filter((part) => part.length > 0));
}

function addressesPresent(addresses, boundary) {
  const parts = boundaryParts(boundary);
  return parts.length === 0 || parts.every((part) => addresses.includes(part));
}

function projectionTargetPresented(instrument, projection) {
  if (projection.projection !== "schema" && projection.projection !== "codec" && projection.projection !== "resource") {
    return true;
  }
  const addresses = instrumentBoundaryAddresses(instrument);
  const presentationTargets = instrument.presentations.flatMap((presentation) => [presentation.id, presentation.address, presentation.admissibility.id]);
  return addresses.includes(projection.refines) ||
    presentationTargets.includes(projection.refines) ||
    projection.refines === instrument.id ||
    projection.refines === instrument.move.id ||
    projection.refines === instrument.lens.id ||
    projection.refines === instrument.evidencePolicy.id;
}

/**
 * Check that an instrument's presentations really present its material boundary.
 *
 * This is the presentation-side counterpart to phase/refinement reports: presentation
 * identity may be a composition address, but the address must be backed by an
 * admissibility predicate, invariants, permitted lenses, and projections.
 */

export function instrumentMaterialReport(instrument) {
  const boundaryAddresses = instrumentBoundaryAddresses(instrument);
  const domainPresented = addressesPresent(boundaryAddresses, instrument.move.domain);
  const codomainPresented = addressesPresent(boundaryAddresses, instrument.move.codomain);
  const presentationsPresentMaterial = instrument.presentations.length > 0 &&
    instrument.presentations.every((presentation) => presentationMaterialPresented(instrument, presentation));
  const admissibilityPresented = instrument.presentations.every((presentation) =>
    presentation.admissibility.id.length > 0 && presentation.invariants.length > 0);
  const lensesPermitted = instrument.presentations.every((presentation) =>
    presentation.permittedLenses.includes(instrument.lens.id));
  const projectionsPresented = instrument.presentations.every((presentation) => presentation.projections.length > 0);
  const implementationTargetsPresented = instrument.projections.every((projection) =>
    projectionTargetPresented(instrument, projection));
  const missing = [
    ...(domainPresented ? [] : ["move-domain-presentation"]),
    ...(codomainPresented ? [] : ["move-codomain-presentation"]),
    ...(presentationsPresentMaterial ? [] : ["presentation-material"]),
    ...(admissibilityPresented ? [] : ["presentation-admissibility"]),
    ...(lensesPermitted ? [] : ["presentation-lens"]),
    ...(projectionsPresented ? [] : ["presentation-projections"]),
    ...(implementationTargetsPresented ? [] : ["implementation-presentation-target"]),
  ];
  return Object.freeze({
    kind: "metroplat.instrument-material",
    instrument: instrument.id,
    material: instrument.material.id,
    boundaryAddresses,
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("move-domain-presentation", domainPresented ? [] : ["move-domain-presentation"]),
      semanticJudgment("move-codomain-presentation", codomainPresented ? [] : ["move-codomain-presentation"]),
      semanticJudgment("presentation-material", presentationsPresentMaterial ? [] : ["presentation-material"]),
      semanticJudgment("presentation-admissibility", admissibilityPresented ? [] : ["presentation-admissibility"]),
      semanticJudgment("presentation-lens", lensesPermitted ? [] : ["presentation-lens"]),
      semanticJudgment("presentation-projections", projectionsPresented ? [] : ["presentation-projections"]),
      semanticJudgment("implementation-presentation-target", implementationTargetsPresented ? [] : ["implementation-presentation-target"]),
    ]),
    judgment: semanticJudgment(`${instrument.id}.material`, missing),
  });
}

// identifierSlug's law (see core/articulation/slug.mts — the one slug home),
// inlined byte-for-byte because computing is the zero-import stratum. Alphabet
// drift between this and the home is a bug, not a variant.

export function slug(value) {
  const out = value.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return out.length === 0 ? "slug" : out;
}

function projectionObligationRoot(projection) {
  switch (projection.projection) {
    case "schema":
      return "test/src/schema";
    case "tool":
    case "route":
    case "resource":
    case "document":
    case "codec":
      return "test/src/presentation";
    case "evidence":
      return "test/services";
    case "function":
      return "test/lib";
  }
}

export function derivedArtifactObligation(spec) {
  return Object.freeze({
    kind: "metroplat.derived-obligation",
    id: spec.id,
    source: spec.source,
    obligation: spec.obligation,
    root: spec.root,
    description: spec.description,
    verifies: Object.freeze([...spec.verifies]),
    evidence: Object.freeze([...spec.evidence]),
  });
}

/** Derive the tests/examples an instrument commits the package to proving or demonstrating. */

export function instrumentDerivedObligations(instrument) {
  const obligations = [
    derivedArtifactObligation({
      id: `${instrument.id}.obligation.material-law`,
      source: instrument.id,
      obligation: "material-law-test",
      root: "test/lib",
      description: `Prove ${instrument.id} as Γ ⊨ {P} m {Q} under ${instrument.phase.id}.`,
      verifies: Object.freeze([
        instrument.material.id,
        instrument.precondition.id,
        instrument.move.id,
        instrument.postcondition.id,
        instrument.phase.id,
        instrument.lens.id,
        instrument.evidencePolicy.id,
      ]),
      evidence: Object.freeze(["relational instrument validates", "projected contract validates", "phase/lens/witness ids are explicit"]),
    }),
    derivedArtifactObligation({
      id: `${instrument.id}.obligation.exposure-example`,
      source: instrument.id,
      obligation: "exposure-example",
      root: "examples",
      description: `Demonstrate the intended lensed exposure path for ${instrument.id}.`,
      verifies: Object.freeze([instrument.move.id, instrument.lens.id, instrument.evidencePolicy.id]),
      evidence: Object.freeze(["example reads instrument material", "example shows boundary object", "example shows witness/exposure handle"]),
    }),
  ];

  if (instrument.move.domain !== undefined && instrument.move.codomain !== undefined) {
    obligations.push(derivedArtifactObligation({
      id: `${instrument.id}.obligation.composition`,
      source: instrument.id,
      obligation: "composition-test",
      root: "test/lib",
      description: `Check ${instrument.id} participates in composition by presentation boundary and post/pre compatibility.`,
      verifies: Object.freeze([instrument.move.domain, instrument.move.codomain, instrument.postcondition.id]),
      evidence: Object.freeze(["presentation addresses include move boundary", "composition report checks Q=>P"]),
    }));
  }

  if (instrument.move.effects.includes("evidence") || instrument.evidencePolicy.required) {
    obligations.push(derivedArtifactObligation({
      id: `${instrument.id}.obligation.evidence-exposure`,
      source: instrument.id,
      obligation: "evidence-exposure-test",
      root: "test/services",
      description: `Prove ${instrument.id} boundary observation produces contract exposure under ${instrument.evidencePolicy.id}.`,
      verifies: Object.freeze([instrument.evidencePolicy.id, instrument.lens.id, instrument.move.id]),
      evidence: Object.freeze(["contractOutcome validates", "contractExposure validates", "exposure embeds ContractCoordinates", "boundary object is lensed"]),
    }));
  }

  for (const presentation of instrument.presentations) {
    obligations.push(derivedArtifactObligation({
      id: `${instrument.id}.obligation.presentation.${slug(presentation.address)}`,
      source: presentation.id,
      obligation: "admissibility-realization-test",
      root: "test/src/schema",
      description: `Prove ${presentation.address} realizes as an admissibility presentation, not only a schema literal.`,
      verifies: Object.freeze([presentation.address, presentation.admissibility.id, ...presentation.invariants, ...presentation.permittedLenses]),
      evidence: Object.freeze(presentation.projections.map((projection) => `projection:${projection}`)),
    }));
  }

  for (const projection of instrument.projections) {
    obligations.push(derivedArtifactObligation({
      id: `${instrument.id}.obligation.projection.${slug(projection.id)}`,
      source: projection.id,
      obligation: "projection-refinement-test",
      root: projectionObligationRoot(projection),
      description: `Prove ${projection.implementation} refines ${projection.refines} as a ${projection.projection} projection.`,
      verifies: Object.freeze([
        projection.refines,
        projection.implementation,
        ...projection.preserves,
        ...(projection.lens === undefined ? [] : [projection.lens]),
        ...(projection.evidencePolicy === undefined ? [] : [projection.evidencePolicy]),
      ]),
      evidence: Object.freeze([`projection:${projection.projection}`, "refinement obligation is explicit"]),
    }));
  }

  return Object.freeze(obligations);
}

export function protocolContract(protocol) {
  return relationalContract({
    id: `${protocol.id}.contract`,
    material: protocol.material,
    precondition: protocol.precondition,
    move: protocol.move,
    postcondition: protocol.postcondition,
    phase: protocol.phase,
    lens: protocol.lens,
    evidencePolicy: protocol.evidencePolicy,
    energetics: Object.freeze([
      energeticObligation({
        id: `${protocol.id}.energy.${protocol.phase.energy}`,
        law: energeticLawForPhase(protocol.phase),
        behavior: protocol.phase.energy,
        source: protocol.precondition.id,
        target: protocol.postcondition.id,
        invariant: `${protocol.phase.id} governs ${protocol.name} exposure through ${protocol.lens.id}`,
        measure: protocol.phase.coordinationCost,
        evidenceRequired: protocol.evidencePolicy.required || protocol.lens.evidenceRequired,
      }),
    ]),
    refinements: protocol.schemas.map((presentation) => Object.freeze({
      id: `${protocol.id}.refines.${presentation.replace(/[^A-Za-z0-9._-]+/g, "-")}`,
      implementation: presentation,
      refines: "schema",
      preserves: Object.freeze(["admissibility", protocol.lens.id, protocol.evidencePolicy.id]),
    })),
  });
}

export function protocolInstrumentId(protocol) {
  return `metroplat.instrument.protocol.${protocol.id.replace(/^metroplat\.protocol\./, "").replace(/[^A-Za-z0-9._-]+/g, "-")}`;
}

/** Consume a protocol surface as a relational instrument with admissibility presentations and implementation projections. */

export function protocolInstrument(protocol) {
  const contractId = protocolInstrumentId(protocol);
  return relationalInstrument({
    id: contractId,
    material: protocol.material,
    presentations: Object.freeze(protocol.schemas.map((presentation) => admissibilityPresentation({
      id: `${contractId}.presentation.${presentation.replace(/[^A-Za-z0-9._-]+/g, "-")}`,
      material: protocol.material.id,
      address: presentation,
      admissibility: relationalPredicate({
        id: `${contractId}.presentation.${presentation.replace(/[^A-Za-z0-9._-]+/g, "-")}.admissible`,
        description: `${presentation} is admitted as boundary material for ${protocol.name}`,
      }),
      invariants: Object.freeze([...protocol.obligations]),
      permittedLenses: Object.freeze([protocol.lens.id]),
      projections: Object.freeze(["json-schema", "typescript-type", "validator", "resource"]),
    }))),
    precondition: protocol.precondition,
    move: protocol.move,
    postcondition: protocol.postcondition,
    phase: protocol.phase,
    lens: protocol.lens,
    evidencePolicy: protocol.evidencePolicy,
    energetics: Object.freeze([
      energeticObligation({
        id: `${contractId}.energy.phase`,
        law: energeticLawForPhase(protocol.phase),
        behavior: protocol.phase.energy,
        source: protocol.precondition.id,
        target: protocol.postcondition.id,
        invariant: `${protocol.phase.id} determines finality for ${protocol.name}; ${protocol.lens.id} accounts for boundary observation.`,
        measure: protocol.obligations.join("; "),
        evidenceRequired: protocol.evidencePolicy.required || protocol.lens.evidenceRequired,
      }),
    ]),
    projections: Object.freeze([
      ...protocol.schemas.map((presentation) => implementationProjection({
        id: `${contractId}.projection.${presentation.replace(/[^A-Za-z0-9._-]+/g, "-")}`,
        projection: "schema",
        implementation: presentation,
        refines: `${contractId}.presentation.${presentation.replace(/[^A-Za-z0-9._-]+/g, "-")}`,
        preserves: Object.freeze(["admissibility", protocol.lens.id, protocol.evidencePolicy.id]),
      })),
      implementationProjection({
        id: `${contractId}.projection.boundary-resource`,
        projection: "resource",
        implementation: `metroplat://@emsenn%2Fmetroplat/instrument/${encodeURIComponent(contractId)}`,
        refines: contractId,
        lens: protocol.lens.id,
        evidencePolicy: protocol.evidencePolicy.id,
        preserves: Object.freeze(["material", "phase", "lens", "evidence policy", "admissibility presentations"]),
      }),
    ]),
  });
}

export function instrumentsCompose(left, right) {
  const leftContract = instrumentContract(left);
  const rightContract = instrumentContract(right);
  const contractReport = contractsCompose(leftContract, rightContract);
  const boundaryCompatible = left.move.codomain !== undefined &&
    right.move.domain !== undefined &&
    left.presentations.some((presentation) => presentation.address === left.move.codomain) &&
    right.presentations.some((presentation) => presentation.address === right.move.domain) &&
    left.move.codomain === right.move.domain;
  const phaseCompatible = left.phase.id === right.phase.id;
  const lensCompatible = left.lens.id === right.lens.id;
  const evidencePolicyCompatible = left.evidencePolicy.id === right.evidencePolicy.id;
  const predicateCompatible = fiberAspectWitnessed(contractReport.aspects, "predicate-compatibility");
  const missing = [
    ...(boundaryCompatible ? [] : ["presentation-boundary-compatibility"]),
    ...(predicateCompatible ? [] : ["predicate-compatibility"]),
    ...(phaseCompatible ? [] : ["phase-compatibility"]),
    ...(lensCompatible ? [] : ["lens-compatibility"]),
    ...(evidencePolicyCompatible ? [] : ["evidence-policy-compatibility"]),
  ];
  return Object.freeze({
    kind: "metroplat.instrument-composition",
    left: left.id,
    right: right.id,
    leftContract: leftContract.id,
    rightContract: rightContract.id,
    missing: Object.freeze(missing),
    aspects: Object.freeze([
      semanticJudgment("presentation-boundary-compatibility", boundaryCompatible ? [] : ["presentation-boundary-compatibility"]),
      semanticJudgment("predicate-compatibility", predicateCompatible ? [] : ["predicate-compatibility"]),
      semanticJudgment("phase-compatibility", phaseCompatible ? [] : ["phase-compatibility"]),
      semanticJudgment("lens-compatibility", lensCompatible ? [] : ["lens-compatibility"]),
      semanticJudgment("evidence-policy-compatibility", evidencePolicyCompatible ? [] : ["evidence-policy-compatibility"]),
    ]),
    judgment: semanticJudgment(`${left.id}.then.${right.id}.composition`, missing),
  });
}
