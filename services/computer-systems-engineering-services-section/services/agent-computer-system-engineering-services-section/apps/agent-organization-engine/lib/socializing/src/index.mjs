/**
 * @red-cup-engineering/socializing — the society reading of agency, admitted through the
 * @red-cup-engineering/relating acting boundary and composed over its sibling
 * faculties.
 *
 * socializing WORKS OVER one primary carrier, the Social Field (`socializing/social-field`):
 * its core morphisms transform it (field → field), as communicating's core morphisms transform
 * memes; readings project it into derived carriers. That shape describes the core, it does not
 * define socializing. The Social Field realizes the corpus's
 * MULTI-OBSERVER SYSTEM `V : O → Settlings_B`
 * (content/_archive spatiotemporal-knowledge-presheaf): members are the observers (each
 * an `agent` reused from @red-cup-engineering/animating carrying its local `memes` reused from
 * relating); `base` is the OBSERVER CATEGORY `O` (objects = observers, non-identity
 * morphisms = directed translation settling-morphisms `V(α)`, each carrying a reused
 * `channel`); `section` is the consensus LIMIT `lim_O V` (knowledge-meet) with its H¹
 * obstruction.
 *
 * The morphism surface is OFF-DIAGONAL-first. The genuinely social morphisms (among
 * distinct observers) are: admit (grow `O`) and merge (the CRDT `∨_k` exchange) — both
 * SCALE-2-NATIVE, no single-agent analog; translate (the inter-observer perspective map
 * `V(α)`); broadcast (speak↑) and attend (listen↑) — cross-stalk linear transmission;
 * and converge (ground↑) — the consensus limit + H¹ + CALM flag, computed by
 * socializing's own `consensus` module (`sheafEvidence`; the corpus's
 * bilattice-network-sheaf-consensus, socializing's domain). The DIAGONAL morphisms are the ten WITHIN-AGENT lifts (communicate,
 * semiose, illocute, negate, refer, modalize, presuppose, quote, compose)
 * produced by the one reusable `liftStalkwise` primitive from communicating's own
 * exported actions; each restricted to one agent IS the communicating morphism (the
 * diagonal embedding) — so socializing and communicating stay the same arrow read at
 * two scales, while the off-diagonal carries the richer multi-observer structure a
 * stalkwise mirror cannot. The package reuses relating's sheaf/evidence algebra,
 * communicating's Channel and meme morphisms, and animating's agent — re-implementing
 * none of them.
 */

export {
  SOCIAL_FIELD_ID,
  emptyField,
  ungroundedSection,
  isField,
  admitField,
  translation,
  identityTranslation,
  composeTranslations,
  completeTranslations,
  comparisonEdges,
  neighborsFrom,
  translationBetween,
  coverOf,
} from "./socialize/field.mjs";

export {
  socialActions,
  socialReadings,
  actions,
  inducedSurface,
  admitAction,
  mergeAction,
  settleAction,
  settleTrajectory,
  glueAction,
  replicaCoverConsensus,
  translateAction,
  broadcastAction,
  attendAction,
  convergeAction,
  assertAction,
  assertionDisagreementsAction,
  assertionMeme,
  admitAssertions,
  assertionDisagreements,
  aggregateAction,
  aggregatePreferences,
  governAction,
  decideByMarketAction,
  coordinationCurrencyAction,
  coordinationCurrency,
  COORDINATION_CURRENCY_ID,
  institutionalizeAction,
  recognitionAction,
  mobilizeAction,
  publicsAction,
  anomieAction,
  boundaryWorkAction,
  legitimateAction,
  institutionalize,
  recognition,
  mobilize,
  publics,
  anomie,
  boundaryWork,
  legitimate,
  governance,
  decideByMarket,
  correlate,
  correlativeKind,
  JURAL_KINDS,
  liftedActions,
  communicateLiftedAction,
  semioseLiftedAction,
  illocuteLiftedAction,
  negateLiftedAction,
  referLiftedAction,
  modalizeLiftedAction,
  presupposeLiftedAction,
  quoteLiftedAction,
  composeLiftedAction,
} from "./socialize/actions.mjs";

export {
  PRICE_ID,
  PRICE_MARTINGALE_ID,
  venueField,
  priceConsensus,
  spreadObstruction,
  noArbitrage,
  venueCoverConsensus,
  martingalePrice,
  priceAction,
  spreadH1Action,
  noArbitrageAction,
  martingaleAction,
  priceActions,
} from "./socialize/price.mjs";

// The OPERATIONAL governance layer — office (double-settlement incumbency), the work-carrier
// scope, and the operational Hohfeldian positions for organizing agentic labor.
export {
  office,
  invest,
  relieve,
  incumbencyState,
  assign,
  grant,
  immunize,
  borneBy,
  waive,
  revoke,
  ratify,
  workScope,
  WORK_LEVELS,
  workItemOfCell,
  scopeOf,
  workLevelIndex,
  workLevelBelow,
  juralCell,
  juralRelationClaimCell,
  juralRelationOfClaimCell,
  juralRelationsOfClaimRows,
  officeIncumbencyClaimCell,
  officeIncumbencyClaimOfCell,
  officesHeldAtDignitas,
  dutiesOfAgent,
  officeReceipt,
  rotate,
  accountability,
  answerableParty,
  delegate,
  reciprocate,
  restore,
  separationOfDuty,
  declare,
  refuse,
} from "./socialize/office.mjs";

// DECISION-RULE + META-GOVERNANCE capabilities — the modes a collective settles by (consensus vs
// majority), Hart/Ostrom stratification, Ashby requisite variety, and Weber authority bases.
export {
  consensusClose,
  majorityClose,
  governingLevel,
  GOVERNANCE_LEVELS,
  requisiteVariety,
  routinize,
  AUTHORITY_BASES,
} from "./socialize/deciding.mjs";

// OSTROM capabilities — the IAD rule-grid, graduated sanctions (a bilattice ≤_t descent), polycentric
// nesting (graph Laplacian + sheaf H¹), and the eight design principles for an enduring commons.
export {
  OSTROM_RULE_TYPES,
  iadGrid,
  graduatedSanction,
  polycentricCoherence,
  centerEvidence,
  ostromDiagnostic,
} from "./socialize/ostrom.mjs";

// FORMAL SOCIAL THEORY wing — judgment aggregation, common knowledge / Aumann, epistemic democracy,
// voting power, opinion dynamics, and fair division of work. Each consumes relating's bilattice /
// graph math; together they make socializing a working model of cutting-edge formal social theory.
export { judgmentAggregate } from "./socialize/judging.mjs";

export { mutualKnowledge, commonKnowledge, aumannAgreement } from "./socialize/epistemics.mjs";

export { condorcetJury, diversityPrediction } from "./socialize/jury.mjs";

export { votingPower } from "./socialize/power.mjs";

export { degroot, friedkinJohnsen, averagingMatrix } from "./socialize/opinion.mjs";

export { allocateWork } from "./socialize/allocating.mjs";

// FRONTIER wing — heavier relating math: natural coalitions as FCA formal concepts (the Galois-closed
// coalition lattice) and coalition effectivity as a Chu space over FOUR (the power/liability dual
// involution). Both consume relating's IR operators (RelMath.FCA, RelMath.Order.LinearLogicChu).
export { holdingsOfRelations, coalitionClosure, coalitionConcept, isCoalition, coalitionLattice } from "./socialize/coalition.mjs";

export { effectivitySpace, canForce, effectivityDual, effectivityIsInvolutive } from "./socialize/effectivity.mjs";

// CALIFORNICATION wing (Result 1): the savior-slave / Clastrean dual — duty-without-power read by
// whether the correlative power is held elsewhere in the field (dev/docs/notes/2026-06-25-...).
export { dutyPowerValence, clastreanOffice, saviorSlaveCensus } from "./socialize/clastre.mjs";

// STRUCTURAL-cluster detectors — coagulation guard, structural foreclosure watch, racket index,
// vitality reading, and secession. Kept distinct from the affective cluster (the note's Proposition 2).
export { coagulationGuard, foreclosureWatch, racketIndex, vitalityReading, secede } from "./socialize/integrity.mjs";

// AFFECTIVE-cluster detectors (californication's own register) — the settling-trajectory carrier and
// the readings that watch DESIRE: recuperation (anti-monotone ⊤-discharge), recursive-governance
// (feedback containment), harm-governance (care turned to risk-management). Distinct from the structural
// cluster by Proposition 2 of the note.
export {
  settlingTrajectory,
  trajectoryFromStages,
  contestedCells,
  affectiveRecuperationIndex,
  recursiveGovernance,
  harmGovernance,
} from "./socialize/recuperation.mjs";

// MARGINAL-THEORY frontier wing — Bateson (double bind + schismogenesis), Graeber & Wengrow (the three
// primordial freedoms), Bourdieu (symbolic violence + capital), Beer (algedonic channel + viable
// recursion), Girard (the scapegoat mechanism). Each consumes existing machinery; see the frontier
// register note.
export { doubleBind, schismogenesis } from "./socialize/bateson.mjs";

export { threeFreedoms } from "./socialize/freedoms.mjs";

export { symbolicViolence, capitalConcentration } from "./socialize/bourdieu.mjs";

export { algedonicAlert, viableRecursion } from "./socialize/viable.mjs";

export { scapegoatDetector } from "./socialize/girard.mjs";

// Governance CONVERGENCE — the closure-regime classification of a governance process (will it settle,
// and coordination-free?), grounded in relating's Lean regime theorems.
export { governanceConvergence } from "./socialize/trajectory.mjs";

// socializing's single-source TypeBox carriers (relation-model notation; replaced the codegen).
// Value-exported so importing the package REGISTERS their $ids in relating's category kernel.
export { socialFieldCarrier, assertionDisagreementsCarrier } from "./carriers.mjs";

export { liftStalkwise } from "./socialize/lift.mjs";

export {
  socializingFace,
  membraneField,
  SOCIALIZING_FACE_AXIS,
} from "./socialize/face.mjs";

export {
  jointRegime,
  coordinationFreeByRegime,
  federationDiscipline,
  observerRegime,
} from "./socialize/regime.mjs";

// writing/crdt — socializing.merge as an interoperable state-CRDT surface:
// pointwise <=_k join, plus an MV-register that preserves conflicting writes as top.
export {
  StateCrdtSchema,
  MultiValueRegisterSchema,
  stateCrdtCarrier,
  multiValueRegisterCarrier,
  emptyCrdtState,
  crdtCell,
  crdtState,
  mergeCrdtStates,
  mvRegister,
  mergeMultiValueRegisters,
  multiValueRegisterStanding,
  joinCrdtStanding,
} from "./writing/crdt/index.mjs";

// writing/atproto — Bluesky / AT Protocol as a second across-federation channel-code:
// signed per-actor repos as RWIL witness logs, Lexicons as relating carriers, and firehose as broadcast.
export {
  AtRepoCommitSchema,
  AtRepoSchema,
  AtLexiconSchema,
  AtFirehoseCommitSchema,
  atRepoCommitCarrier,
  atRepoCarrier,
  atLexiconCarrier,
  atFirehoseCommitCarrier,
  atRepoCommit,
  atRepo,
  witnessLogFromAtRepoCommit,
  witnessLogFromAtRepo,
  atRepoFromWitnessLog,
  atRepoLogReading,
  firehoseCommitFromRepoCommit,
  firehoseFromAtRepo,
  crdtStateFromAtRepo,
  mergeAtRepos,
  jsonSchemaFromLexiconRecord,
  carrierFromLexiconRecord,
  sameAtprotoProjection,
} from "./writing/atproto/index.mjs";

// writing/mesh-liveness — SWIM membership/failure detection plus HyParView/Plumtree
// gossip as the mesh-liveness layer beneath federation. This models protocol state and
// deterministic rounds only; real networking belongs to the host runtime.
export {
  MESH_LIVENESS_PROTOCOLS,
  LIVENESS_STATES,
  MeshLivenessObservationSchema,
  MembershipViewSchema,
  HyParViewOverlaySchema,
  PlumtreeGossipPlanSchema,
  meshLivenessObservationCarrier,
  membershipViewCarrier,
  hyParViewOverlayCarrier,
  plumtreeGossipPlanCarrier,
  livenessEvidence,
  meshLivenessObservation,
  membershipView,
  mergeMembershipViews,
  livenessOf,
  membershipTable,
  swimRound,
  failureComplete,
  hyParViewOverlay,
  plumtreeGossipPlan,
  membershipViewMeme,
  broadcastMembershipView,
  sameMembershipView,
  livenessStatusName,
} from "./writing/mesh-liveness/index.mjs";

export {
  completeGraph,
  definite,
  opposed,
  sheafEvidence,
  sheafObservations,
  spectralConsensus,
  diffusedField,

} from "./socialize/consensus.mjs";

import { admitAction } from "./socialize/actions.mjs";

import { emptyField } from "./socialize/field.mjs";

/**
 * Socialize — the one-call admission boundary (mirroring communicating's
 * `communicate`): admit a member (an agent + its local memes) into a Social Field,
 * starting from the empty field when none is given. Wraps `admitAction`.
 */
export function socialize(member, field) {
  const base = (field ?? emptyField());
  return admitAction.execute(base, member);
}
