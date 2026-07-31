/**
 * @emsenn/meme-topology — curated app surface.
 *
 * Evidence enters by articulating utterances — that is the only admission.
 * `induce`/`extend` fold an utterance log through the descent
 * (articulate → predicate → posit → settle) into a frozen MemeTopologyCarrier,
 * and the section reads render any of the four fixed-point sections. Marks are
 * rich structures: a token mark valued `{ subject, object }` articulates a
 * relational cell, and a relational claim of the specialization concept also
 * installs the specialization edge. Everything else — charges, edges, sections,
 * contradictions — is derived; there is no verb that admits a charge, a
 * polarity, or a denial. The underlying mathematics lives in
 * @emsenn/meme-algebra, @emsenn/meme-logic, `./dynamics`, and `./arithmetic`;
 * anything under `./internal`
 * is the engine, not the contract.
 */

// ---------- articulation ----------
export { mark, token, claim, utterance, articulate, isArticulationCarrier, markIdentity, tokenIdentity, claimIdentity } from "@emsenn/meme-algebra";
export type {
  Mark,
  Token,
  Claim,
  UtteranceCarrier,
  ArticulationCarrier,
  MarkIdentityWitness,
  MarkIdentityObstruction,
  MarkIdentityJudgment,
  TokenIdentityWitness,
  TokenIdentityObstruction,
  TokenIdentityJudgment,
  ClaimIdentityWitness,
  ClaimIdentityObstruction,
  ClaimIdentityJudgment,
} from "@emsenn/meme-algebra";
export {
  cell,
  predicate,
  specializationMorphism,
  specializationClaimValue,
  predicationCarrier,
  cohere,
  closeSpecialization,
  unrelatedPairs,
  cellIdentity,
  predicationTermIdentity,
  predicationPredicateIdentity,
} from "@emsenn/meme-algebra";
export type {
  Cell,
  SpecializationMorphism,
  PredicationCarrier,
  PredicationDatum,
  PredicationTerm,
  PredicationPredicate,
  CoherenceCarrier,
  Edge,
  UnrelatedPairsCarrier,
  CellIdentityWitness,
  CellIdentityObstruction,
  CellIdentityJudgment,
  PredicationTermIdentityWitness,
  PredicationTermIdentityObstruction,
  PredicationTermIdentityJudgment,
  PredicationPredicateIdentityWitness,
  PredicationPredicateIdentityObstruction,
  PredicationPredicateIdentityJudgment,
} from "@emsenn/meme-algebra";

// ---------- admission ----------
export type { OrderName } from "./predication-fiber.mjs";
export { normalizeUtterance } from "./meme-topology.mjs";
export type { TermInput } from "./meme-topology.mjs";

// ---------- settling ----------
export {
  induce,
  extend,
  sameMemeTopology,
  singleUtteranceTopology,
  settleOneTraced,
  knowledgeLeastMemeOfSingleUtterance,
} from "./meme-topology.mjs";
export type { MemeTopologyCarrier, SingleUtteranceInput, SingleSettlingCarrier } from "./meme-topology.mjs";
export { classifySettling } from "./predication-settling.mjs";
export type { SettlingClassification } from "./predication-settling.mjs";

// ---------- construction pipeline ----------
export { posit } from "./predication-fiber.mjs";
export { presheaf, presheafFromValuation, sheafFromValuation, commutate } from "./predication-valuation-sheaf.mjs";
export type { PresheafCarrier, SheafCarrier, CommutationCarrier } from "./predication-valuation-sheaf.mjs";
export {
  fixedPoints,
  knowledgeLeastFixedPoint,
  knowledgeGreatestFixedPoint,
  truthLeastFixedPoint,
  truthGreatestFixedPoint,
  fixedPointOrderName,
  fixedPointBoundName,
  fixedPointKnowledgeGap,
  fixedPointTruthGap,
} from "./predication-valuation-fixed-point.mjs";
export type {
  BoundName,
  FixedPointCarrier,
  FixedPointJudgment,
  FixedPointWitness,
  FixedPointObstruction,
  FixedPointExtremum,
  FixedPointOrderCarrier,
  FixedPointOrderObject,
  FixedPointBoundObject,
  FixedPointSeedCarrier,
} from "./predication-valuation-fixed-point.mjs";
export type { FixedPointGapCarrier } from "./predication-valuation-fixed-point-gap.mjs";

// ---------- reading ----------
export { readCharge } from "./meme-topology-fixed-point-reading.mjs";
export type {
  MemeTopologyFixedPointReading,
  MemeTopologyFixedPointReadings,
  MemeTopologyInformation,
  MemeTopologyInformationEntry,
  MemeTopologyInformationEntriesCarrier,
} from "./meme-topology-fixed-point-reading.mjs";
export type { PredicationValuationConsistencyCarrier } from "./predication-valuation-consistency.mjs";

// ---------- section layer ----------
export {
  sectionOf,
  predicationsFor,
  subjectsFor,
  chargeAtValues,
  partitionSection,
  topologyVitals,
} from "./meme-topology-section.mjs";
export type { SectionCarrier, SectionEntry, SectionPartitionCarrier, TopologyVitalsCarrier } from "./meme-topology-section.mjs";

// ---------- charge value boundary ----------
export {
  chargeValue,
  chargeValues,
  chargeValueName,
  asChargeValueName,
  asChargeValue,
  chargeValueIdentity,
  joinKnowledgeValue,
  meetKnowledgeValue,
  joinTruthValue,
  meetTruthValue,
  negateValue,
  conflateValue,
} from "@emsenn/meme-algebra";
export type {
  ChargeValueName,
  ChargeValue,
  ChargeCarrier,
  ChargeSide,
  ChargeSideName,
  ChargeCoordinates,
  ChargeValueIdentityWitness,
  ChargeValueIdentityObstruction,
  ChargeValueIdentityJudgment,
} from "@emsenn/meme-algebra";

// ---------- numbers at the edge ----------
export { toCount, fromCount, toNumber, toInt, fromInt } from "@emsenn/meme-algebra";
export type { Natural, Integer, Rational } from "@emsenn/meme-algebra";

// ---------- utterance-log persistence ----------
export { dehydrateUtterances, rehydrateUtterances } from "./meme-topology-serialization.mjs";
export type { JsonValue } from "./meme-topology-serialization.mjs";
