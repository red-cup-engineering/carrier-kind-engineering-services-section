/**
 * @red-cup-engineering/gaming — the root admission surface for concurrent game systems.
 *
 * Gaming is downstream of animating and upstream of computing in the spine:
 * relating -> animating -> gaming -> computing. It reads animating handedness as
 * Player/Opponent polarity over the relating reading substrate.
 *
 * The package root is deliberately small: it exposes the same callable shape as
 * shell/API/MCP edges, `(action, token, ?claim)`. Richer carriers, morphisms,
 * topology, traces, codecs, and operational tools live under the actual CGS
 * construction rooted at `@red-cup-engineering/gaming/structuring`.
 *
 * Root category map:
 *
 * - Package/category: gaming, the admission of a requested CGS operation.
 * - Domain object: `GamingRequest` = action + token + optional claim.
 * - Codomain object: `GamingAdmission` = admitted gate + bilattice reading +
 *   created running-game carrier, when admitted.
 * - Root morphism: `gaming` / `game`, preserving the carrier path
 *   `Arena -> GameComputer.create -> Game`; refusals are active readings with
 *   Mark evidence rather than independent DTO errors.
 * - Representation boundary: callers may pass plain ids and demo names at the
 *   root; the function immediately resolves them into CGS arena/game carriers
 *   and relating reading evidence.
 */

import { negate, witnessedFor } from "@red-cup-engineering/signchain/bilattice";
import { knowledgeReading } from "@red-cup-engineering/signcell/cell";

import { GameComputer } from "./running/computer.mjs";
import { demoArena } from "./running/demo.mjs";

/** A requested gaming operation. */

/** The token presented at the package root boundary. */

/** The optional claim constraining the admitted gaming operation. */

/** The root domain object admitted by `gaming`. */

/** A reading-backed obstruction at the root admission boundary. */

/** The root codomain object derived from CGS carriers and relating readings. */

/**
 * Admit a gaming operation by a token against an optional claim.
 *
 * Domain: `GamingAction x GamingToken x GamingClaim?`.
 * Codomain: `GamingAdmission`.
 * Law: `admitted` iff the request can be reduced to a real `Arena` carrier and
 * then into `GameComputer.create`; an admission is evidence for, witnessed by the
 * request; a refusal is its negation, witnessed by the obstruction.
 */
export function gaming(
  action,
  token,
  claim = {},
) {
  if (action !== "create") {
    return refused(action, { kind: "gaming.root.unsupported-action-obstruction", action });
  }

  if (claim.id !== undefined && claim.id !== token.id) {
    return refused(action, claimMismatch("id", claim.id, token.id));
  }

  if (claim.demo !== undefined && claim.demo !== token.demo) {
    return refused(action, claimMismatch("demo", claim.demo, token.demo));
  }

  if (token.id === undefined || token.id.length === 0) {
    return refused(action, { kind: "gaming.root.missing-id-obstruction" });
  }

  const resolution = arenaOf(token);
  if (resolution.obstruction !== undefined) return refused(action, resolution.obstruction);

  const computer = token.computer ?? new GameComputer();
  const created = computer.create(token.id, resolution.arena);
  const reading = witnessedFor({
    action,
    id: token.id,
    ...(token.demo === undefined ? {} : { demo: token.demo }),
    carrier: "game.computer.game",
  });
  return Object.freeze({
    action,
    admitted: true,
    status: statusOf(reading),
    reading,
    computer: created.computer,
    game: created.game,
  });
}

/** Alias matching the gaming reading of the same root morphism. */
export const game = gaming;

export { arena, symmetryJudgment, isArena, identityBijection, discreteArena, arenaEvents, isSymmetry } from "./structuring/concurrent-game/with-symmetry/arena.mjs";
export { dialecticaObjectToArena, nominalArena, nominalArenaOf, dialecticaUnitArena, dualDialecticaArena, tensorDialecticaArena, cairesPfenningArena, hylandOngName, realizedEmbeddingNames } from "./structuring/concurrent-game/with-symmetry/embedding.mjs";
export { libp2pSwarm, libp2pJoin, libp2pLeave, libp2pDialStream, libp2pPublish, libp2pPeerIds, emptyLibp2pNamePassing } from "./structuring/concurrent-game/with-symmetry/libp2p.mjs";
export { play, isValidPlay, extendJudgment, extend, isPlay, emptyPlay, positionOf, playLength } from "./structuring/concurrent-game/with-symmetry/strategizing/play.mjs";
export { strategy, prefixClosedJudgment, receptivityJudgment, relabelPlayByPermutation, symmetryInvarianceJudgment, closeUnderSymmetry, isSymmetryClosed, strategyReport, isStrategy, arenaOfDesign, strategyFromDesign, designsOfStrategy, designOfStrategy, arenaEnabledMovesAfter, relabelPlay, isWellFormedStrategy, innocenceJudgment, strategyContainsPlay, strategyExtensionsAfter, strategyMovePolarity } from "./structuring/concurrent-game/with-symmetry/strategizing/strategy.mjs";
export { interactionShadowCommutes, polarityShadow, designShadow, interactionShadow, APEX } from "./structuring/concurrent-game/with-symmetry/strategizing/shadow.mjs";
export { mask, coordinatePolarity, sides, isMask, maskIsSymmetricPeer } from "./structuring/concurrent-game/with-symmetry/strategizing/mask.mjs";
export { interact, interactionReport } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/strategizing/interaction";
export { finitePermutation, applyPermutation, fixesNames, composePermutations, transposition, permutationSupport, inversePermutation, samePermutation } from "./structuring/concurrent-game/with-symmetry/nominalizing/permutation.mjs";
export { permutationBijection, nominalActionJudgment, eventName } from "./structuring/concurrent-game/with-symmetry/nominalizing/action.mjs";
export { nominalArenaJudgment } from "./structuring/concurrent-game/with-symmetry/nominalizing/arena.mjs";
export { nominalEquivarianceJudgment } from "./structuring/concurrent-game/with-symmetry/nominalizing/equivariance.mjs";
export { isImmediateCause, coveringRelation, isCoveringRelation } from "./structuring/concurrent-game/with-symmetry/placing/covering.mjs";
export { configuration, isConfigurationCarrier, configurations, includesConfiguration, meetConfigurations, joinConfigurations, isCovering } from "./structuring/concurrent-game/with-symmetry/placing/configurations.mjs";
export { locusTree, locusTreeFromLoci, subtree, siblings, children, isLocusTree, depth } from "./structuring/concurrent-game/with-symmetry/placing/locus-tree.mjs";
export { magicCircle, magicCircleJudgment, isMagicCircleClosed, isMagicCircle, wholeArenaCircle } from "./structuring/concurrent-game/with-symmetry/placing/magic-circle.mjs";
export { restrictStructure, subArenaJudgment, entryPoints, voluntaryJudgment, boundaryCrossing, ruleSuspensionJudgment, magicCircleBoundary, isMagicCircleBoundary, isSubArena, isVoluntary, isParaconsistentCrossing, isPlayBoundary, wholeArenaBoundary } from "./structuring/concurrent-game/with-symmetry/placing/boundary.mjs";
export { ludusIndex, isPaidia, isLudus } from "./structuring/concurrent-game/with-symmetry/placing/ludus.mjs";
export { bandOfFraction, paidiaLudusPlacement, bandOf, isCailloisCategory, cailloisGridCell, isPaidiaLudusPlacement, paidiaLudusBands, leansPaidia, leansLudus, cailloisCategories } from "./structuring/concurrent-game/with-symmetry/placing/paidia-ludus.mjs";
export { player, participationLoci, homoLudensJudgment, isPlayerCarrier, isPlayer } from "./structuring/concurrent-game/with-symmetry/placing/homo-ludens.mjs";
export { trajectory, maximalPlayJudgment, trajectoryLength, isMaximalPlay, trajectoryMoves } from "./structuring/concurrent-game/with-symmetry/reading/trajectory.mjs";
export { agonScore, aleaScore, mimicryScore, ilinxScore, regimeScores, classifyRegime, regimeNames } from "./structuring/concurrent-game/with-symmetry/reading/regime.mjs";
export { challengeOf, skillOf, flowJudgment, flow, flowBalance, inFlow } from "./structuring/concurrent-game/with-symmetry/reading/flow.mjs";
export { cascadeLength, settles } from "./structuring/concurrent-game/with-symmetry/reading/cascade.mjs";
export { agonFairness, aleaIndeterminacy, mimicryBoundary, ilinxReversibility, regimeConditions, isAgonFair, isAleaIndeterminate, hasMimicryBoundary, isIlinxReversible } from "./structuring/concurrent-game/with-symmetry/reading/regime-conditions.mjs";
export { prelusoryGoal, suitsianGame, lusoryAttitudeJudgment, lusoryMeans, hasLusoryAttitude, reachesGoal, isVoluntaryCommitment, goalLocusKey } from "./structuring/concurrent-game/with-symmetry/reading/lusory-attitude.mjs";
export { rhetoric, ambiguousPlay, rhetoricalReading, constitutiveAmbiguityJudgment, rhetoricNames, rhetoricGrouping, rhetorics, isConstitutivelyAmbiguous } from "./structuring/concurrent-game/with-symmetry/reading/rhetorics.mjs";
export { deepPlayJudgment, isDeepPlay } from "./structuring/concurrent-game/with-symmetry/reading/deep-play.mjs";
export { culturalStructure, imageConditions, ludicallyStructuredJudgment, cailloisCorrespondences, correspondences, correspondenceByIndex, isLudicallyStructured, embeddingReading } from "./structuring/concurrent-game/with-symmetry/reading/cultural-embedding.mjs";
export { polarity, dual, polarityReading, readingPolarity, isPolarityName, isPolarity, asPolarity, dualityIsNegation, polarityNames, positive, negative, polarityName, samePolarity } from "@red-cup-engineering/playing/structuring/polarity";
export { event, eventStructure, causes, conflicts, downSet, configurationJudgment, isConfiguration, isEvent, isPrimeEventStructure, eventIds, eventById } from "@red-cup-engineering/playing/structuring/event/structure";
export { locus, prefixes, locusFromKey, isLocus, root, child, parent, locusKey, sameLocus, locusDepth } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/locus";
export { design, designFromActs, designReading, designAct, isDesign, emptyDesign, actReading, daimon, support, supportKeys } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/design";
export { actionPolarity, readingAction, isAction, subAction, subActionJudgment, subActionJoin, parityPolarity, parityRespectJudgment, positiveAction, negativeAction, daimonAction, actionLocus, actionRamification, actionChildren, actionAct, actionReading, sameAction } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/action";
export { chronicle, isChronicle, designAction, designActions, designRoots, designChronicles, chronicleJudgment, designFromActionSet, designCoherenceJudgment, isValidChronicle, designFromChronicle, isCoherentDesign } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/chronicle";
export { viewOfChronicle, viewsOfDesign, isInnocent } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/view";
export { delocate, superpose, sameDesign, delocationComposeJudgment, concatLocus, readingsAgree } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/delocation";
export { faxResponder, faxResponderJudgment, faxIdentity, isFaxResponderWitness } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/identity";
export { project, cutInterface, composeChronicles, cut, fax, observationallyEqual, leftIdentityJudgment, rightIdentityJudgment, associativityJudgment, DOMAIN_SIDE, CODOMAIN_SIDE, isLeftIdentity, isRightIdentity, isAssociative, isCoherentFax } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/composition";
export { convergenceJudgment, orthogonal } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/settling/orthogonality";
export { orthogonalOf, biorthogonalClosure, behaviourJudgment, playsIn, generatedBehaviour, isBehaviour } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/settling/behaviour";
export { formula, denotation, proves, isFormula } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/settling/formula";
export { designLeq, designLeqJudgment, visitedLoci, incarnationOf, incarnation, materialJudgment, inIncarnation, skeleton, isMaterial } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/settling/incarnation";
export { negateBehaviour, withBehaviour, plusBehaviour, tensorBehaviour, parBehaviour, lollipopBehaviour, internalCompletenessJudgment, internalCompleteness, presentsSameBehaviour } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/settling/internal-completeness";
export { delocationInvarianceJudgment, delocateBehaviour, ofCourseBehaviour, whyNotBehaviour, exponentialBehaviourJudgment, ofCourseMonotoneJudgment, delocationInvariant } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/settling/locativity";
export { chronicleConvergenceJudgment, convergenceTrace, convergesByChronicle } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/settling/chronicle-convergence";
export { atom, dualConnective, dualProp, connectivesOf, samePropositions, isConnective, isProposition, connectives, tensor, par, withProp, plus, one, bottom, top, zero, ofCourse, whyNot, up, down, lolli } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/proposition";
export { fragmentPoset, isFragmentPoset, fragmentLeq, inFragment, classifyFragment, isFragment, fragment, fragmentNames, allFragments, fragmentCoverings, fragmentsComparable, isInFragment } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/fragment";
export { polarityOfConnective, polarityOf, isFocused, focusingDuality, isPositiveProposition, isNegativeProposition } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/focusing";
export { exponentialClosesTo, isExponentialClosureStatement, closureLaws } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/exponential";
export { propositionOfSession, dualSession, sameSessionTypes, sessionDualityJudgment, sessionCompatibilityJudgment, sessionCorrespondence, isSessionType, sessionEnd, sessionWait, sessionSend, sessionRecv, sessionSelect, sessionOffer, sessionServer, sessionClient } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/session";
export { dialecticaObject, dualDialectica, tensorDialectica, dialecticaDualReuse, isDialecticaObject, dialecticaUnit, witnessPolarity, challengePolarity } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/dialectica";
export { embeddingByName, isEmbeddingName, isEmbedding, embeddingNames, hylandOng, dialectica, nominal, cairesPfenning, cairesPfenningEmbed, embeddings } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/embeddings";
export { cutStep, cutShadow, normalize, normalizationWitness, converges, cutElimination, isCutStep, isNormalizationWitness } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/computational-ludics";
export { encodeEventPair, decodeEventPair, encodeEvent, decodeEvent, encodeEventStructure, decodeEventStructure } from "./encoding/event-structure.mjs";
export { encodeBijection, decodeBijection, encodeSymmetry, decodeSymmetry, encodeArena, decodeArena } from "./encoding/arena.mjs";
export { encodePlay, decodePlay } from "./encoding/play.mjs";
export { encodeStrategy, decodeStrategy } from "./encoding/strategy.mjs";
export { projectLibp2pSwarm, projectLibp2pPubsub } from "./encoding/network-model.mjs";
export { encodeReading, decodeReading } from "@red-cup-engineering/playing/encoding/reading";
export { encodePolarity, decodePolarity } from "@red-cup-engineering/playing/encoding/polarity";
export { encodeLocus, decodeLocus } from "@red-cup-engineering/playing/encoding/locus";
export { encodeDesign, decodeDesign } from "@red-cup-engineering/playing/encoding/design";
export { encodeInteractionReport, decodeInteractionReport } from "@red-cup-engineering/playing/encoding/interaction";
export { encodeBehaviour, decodeBehaviour } from "@red-cup-engineering/playing/encoding/behaviour";
export { asJson, asObject, asString, asNumber, asArray, asBoolean, field } from "@red-cup-engineering/playing/encoding/json";
export { encodeLine, decodeLine, encodeLogEntry, decodeLogEntry } from "@red-cup-engineering/playing/encoding/jsonl";
export { createGame, addDesign, playMove, runInteraction, matchGame, settle, isGame } from "./running/game.mjs";
export { matchAll } from "./running/match.mjs";
export { createPool, poolFromDemo, queueTicket, formMatches, arenaForPlayers, encodeTicket, encodePool, encodeTicketAdmission, encodeLobbyMatch, encodeMatchmakingResult, decodePool, decodeTicket } from "./running/lobby.mjs";
export { GameComputer } from "./running/computer.mjs";
export { snapshot, restore } from "./running/snapshot.mjs";
// ensureDataDir/snapshotPath/logPath/writeSnapshot/appendLog/readLog/loadComputer
// (running/store.mjs, "the *only* place that touches node:fs" per its own header) and
// runGameCli (running/cli.mjs, the CLI dispatcher over it, which stamps `at` with the real
// clock) are not re-exported here: real, repeated disk/clock effects, not values a caller could
// pass instead (data/records/house-architecture-norms.json, "hull-never-imports-kernel"), and no
// caller reaches either through this root barrel today.
export { demoNames, demoArenas, demoArena } from "./running/demo.mjs";
export { analyzeGame } from "./running/analysis.mjs";

export {
  actions,
  maskAction,
  sidesAction,
  gameAction,
  playAction,
  settleAction,
  interactAction,
  analyzeAction,
  readStrategyAction,
  readRegimeAction,
  readFlowAction,
  readDeepPlayAction,
  readRhetoricsAction,
  readLusoryAction,
  embedCultureAction,
  reachabilityAction,
  reachability,
  reachabilityOf,

} from "./actions.mjs";

export { gamingFace } from "./face.mjs";

export {
  gamingActions,
  arenaAction,
  strategyAction,
  liftAction,
  parallelAction,
  composeAction,
  matchAction,
  poolAction,
  ticketAction,
  matchmakeAction,
  libp2pSwarmAction,
  libp2pStreamAction,
  libp2pPubsubAction,
  symmetryAction,
  equivariantAction,
  verificationTournamentAction,
  verificationTournament,
} from "./multi-agent.mjs";
export {
  verificationTournamentCarrier,
  verificationTournamentSchema,
} from "./carriers/index.mjs";

function arenaOf(token)

 {
  if (token.arena !== undefined) return { arena: token.arena };
  if (token.demo === undefined || token.demo.length === 0) {
    return { obstruction: { kind: "gaming.root.missing-arena-obstruction" } };
  }
  const demo = demoArena(token.demo);
  if (demo === undefined) {
    return { obstruction: { kind: "gaming.root.unknown-demo-obstruction", demo: token.demo } };
  }
  return { arena: demo.arena };
}

function refused(action, obstruction) {
  const reading = negate(witnessedFor({ action, obstruction }));
  return Object.freeze({
    action,
    admitted: false,
    status: statusOf(reading),
    reading,
    obstruction,
  });
}

function claimMismatch(
  coordinate,
  expected,
  actual,
) {
  return actual === undefined
    ? Object.freeze({
        kind: "gaming.root.claim-mismatch-obstruction",
        coordinate,
        expected,
      })
    : Object.freeze({
        kind: "gaming.root.claim-mismatch-obstruction",
        coordinate,
        expected,
        actual,
      });
}

function statusOf(reading) {
  return knowledgeReading(reading);
}
