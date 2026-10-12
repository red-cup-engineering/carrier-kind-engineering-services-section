/**
 * articulation — the base object surface of the category of metroplat.
 *
 * A Mark is opaque; a Token and Claim carry Marks; an Utterance pairs them; and
 * `articulate` opens the aperiodic articulation category at its potential cell.
 * Every public morphism downstream normalizes back through this surface.
 */
export { Mark, Token, Claim, mark, token, claim, markKinds, isMarkKind, utterance, articulatingUtter, articulatingPair, articulatingHead, articulatingDepth, articulatingFloor, articulatingUtterNePair, utteranceSchema, articulate, articulationCellSchema, tokenIdentity, claimIdentity, isArticulationCell, isMark, markBoundarySchema, markObservationReport } from "@red-cup-engineering/computer-data-engine/utterance";

export { coincides } from "@red-cup-engineering/computer-data-engine/utterance";
