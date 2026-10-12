/**
 * articulating — the base object surface of the category of relating.
 *
 * A Mark is opaque; a Token and Claim carry Marks; an Utterance pairs them; and
 * `articulate` opens the aperiodic articulation category at its potential cell.
 * Every public morphism downstream normalizes back through this surface.
 */
export {
  Mark,
  Token,
  Claim,
  mark,
  token,
  claim,
  markKinds,
  isMarkKind,
  markKindTwoKinds,
  tokenNeClaim,
  utterance,
  articulatingUtter,
  articulatingPair,
  articulatingHead,
  articulatingDepth,
  articulatingFloor,
  articulatingUtterNePair,
  utteranceSchema,
  articulate,
  articulationCellSchema,
  tokenIdentity,
  claimIdentity,
  isArticulationCell,
  isMark,
} from "@lenticule-science/articulating/utterance";
export type {
  UtteranceCarrier,
  TokenArticulationSlot,
  ClaimArticulationSlot,
  AperiodicArticulationPairing,
  MarkKind,
  AperiodicArticulationCell,
  PotentialAperiodicArticulationCell,
  ArticulationCell,
  ArticulatingUtter,
  ArticulatingPair,
  Articulating,
  MarkCoincidenceWitness,
  MarkCoincidenceObstruction,
  TokenIdentityJudgment,
  ClaimIdentityJudgment,
} from "@lenticule-science/articulating/utterance";
export { coincides } from "@lenticule-science/articulating/utterance";
export {
  fourCornerNames,
  cornerOfStatus,
  statusOfCorner,
  chargeNameOfCorner,
  readFourCorner,
  fourCornerOfArticulationCell,
  fourCornerCellReceipt,
} from "@lenticule-science/articulating/four-corner-cell";
export type {
  FourCornerName,
  FourCornerChargeAlias,
  FourCornerStatus,
  FourCornerReading,
  FourCornerCellReceipt,
} from "@lenticule-science/articulating/four-corner-cell";

export * as predicating from "./predicating/index.mjs";
