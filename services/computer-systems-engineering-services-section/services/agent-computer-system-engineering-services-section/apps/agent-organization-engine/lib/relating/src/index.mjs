/**
 * @packageDocumentation
 *
 * @red-cup-engineering/relating - the relational substrate as one boundary system.
 *
 * The root surface is the public API of the relating faculty: its carriers, actions (as
 * operations), claim sessions, evaluating terms and writing. Operations, their catalogs,
 * dispatch, resources, prompts and projections are the system engine's rpc.
 */

import { intentOfExtentTerm, extentOfIntentTerm, closeExtentTerm, isConceptPairTerm, formalConceptTerm } from "./evaluating/connecting/formal-concept.mjs";
import { classifyRegimeTerm, cohomologyVanishesInRegimeTerm, measureIsValuationTerm, conditionalViaFiberAdjointTerm, markovStationaryIsClosureFixpointTerm, stochasticIsValueSettlingTerm, expectationLawsTerm, detailedBalanceImpliesStationaryTerm, rankVanishingTerm, rankIdentityTerm, rankComparisonTerm, cohomologyCarrierTerm, cohomologyLaplacianTerm, bigradedCohomologyTerm, settlingFirstCohomologyTerm } from "./evaluating/measuring/index.mjs";


export * from "./carriers/index.mjs";
export * from "./actions/index.mjs";

export { sessionWork, TRANSPORT_WORK } from "./running/transport-work.mjs";
export { openSession, claim, judge, conflicts, sessionRegime, settle } from "./running/session.mjs";

// confine/readContentResource/listContentEntries/readContentTree (ledger/store.mjs) are not
// re-exported here: they are real disk reads (data/records/house-architecture-norms.json,
// "hull-never-imports-kernel" -- a hull module, and this root barrel has no effect of its own,
// may not reach a kernel module), and every actual caller already reaches them through the
// dedicated ./ledger/store subpath instead of this root.

export { articulateTerm, predicateTerm, positTerm, settleTerm, induceRelationTerm, induceMembraneTerm, relateRelationsTerm, coincideTerm } from "./actions/index.mjs";
export * from "./evaluating/counting/index.mjs";
export * from "./evaluating/measuring/index.mjs";
export { intentOfExtentTerm, extentOfIntentTerm, closeExtentTerm, isConceptPairTerm, formalConceptTerm } from "./evaluating/connecting/formal-concept.mjs";

export * as carriers from "./carriers/index.mjs";

import { sessionWork, TRANSPORT_WORK } from "./running/transport-work.mjs";
import { openSession, claim, judge, conflicts, sessionRegime, settle as settle_2 } from "./running/session.mjs";

export const running = Object.freeze({ sessionWork, TRANSPORT_WORK, openSession, claim, judge, conflicts, sessionRegime, settle: settle_2 });



export const measurement = Object.freeze({
  classifyRegime: classifyRegimeTerm,
  cohomologyVanishesInRegime: cohomologyVanishesInRegimeTerm,
});

export const probability = Object.freeze({
  measureIsValuation: measureIsValuationTerm,
  conditionalViaFiberAdjoint: conditionalViaFiberAdjointTerm,
  markovStationaryIsClosureFixpoint: markovStationaryIsClosureFixpointTerm,
  stochasticIsValueSettling: stochasticIsValueSettlingTerm,
  expectationLaws: expectationLawsTerm,
  detailedBalanceImpliesStationary: detailedBalanceImpliesStationaryTerm,
});

export const cohomologyTerms = Object.freeze({
  rankVanishing: rankVanishingTerm,
  rankIdentity: rankIdentityTerm,
  rankComparison: rankComparisonTerm,
  carrier: cohomologyCarrierTerm,
  laplacian: cohomologyLaplacianTerm,
  bigraded: bigradedCohomologyTerm,
  settlingFirst: settlingFirstCohomologyTerm,
});

export const fca = Object.freeze({
  intentOfExtent: intentOfExtentTerm,
  extentOfIntent: extentOfIntentTerm,
  closeExtent: closeExtentTerm,
  isConceptPair: isConceptPairTerm,
  formalConcept: formalConceptTerm,
});


