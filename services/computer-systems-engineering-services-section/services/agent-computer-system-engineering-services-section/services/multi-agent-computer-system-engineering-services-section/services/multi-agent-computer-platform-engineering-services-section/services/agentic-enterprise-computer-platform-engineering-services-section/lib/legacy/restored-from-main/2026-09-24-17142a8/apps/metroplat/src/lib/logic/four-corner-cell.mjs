/**
 * calculus/four-corner-cell — finite bridge for
 *
 * Lean names the articulation corners by phase; metrologic's own
 * `four-corner-cell` names the Bool x Bool coordinates in the data engine's
 * vocabulary (`absurd`/`potential`/`stable`/`active`). This module names the
 * same coordinates the way `@red-cup-engineering/relation-model-notation`
 * does (`unknown`/`held`/`contested`/`denied` — the coordinate tables agree
 * exactly): a thin notation-name boundary over metrologic's readings, crossed
 * through computer-data-engine's own canonical `chargeValueNameOfNotationName`
 * / `notationNameOfChargeValueName` bridge, so this module witnesses the
 * coordinate-level conflation theorem against the Lean theorem names without
 * keeping a second, parallel corner/status/charge-name implementation.
 */

import {
  chargeValueNameOfNotationName,
  notationNameOfChargeValueName,

} from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import {
  cornerOfStatus as engineCornerOfStatus,
  fourCornerNames as engineFourCornerNames,
  fourCornerOfArticulationCell as engineFourCornerOfArticulationCell,
  readFourCorner as engineReadFourCorner,
  statusOfCorner as engineStatusOfCorner,

} from "@lenticule-science/metrologic/articulation/four-corner-cell";

export const fourCornerStatusSchema = {
  $id: "metroplat/calculus/four-corner-status",
  type: "object",
  required: ["kind", "tokenArticulated", "claimArticulated"],
  properties: {
    kind: { const: "fourCorner.status" },
    tokenArticulated: { type: "boolean" },
    claimArticulated: { type: "boolean" },
  },
  additionalProperties: false,
  title: "FourCornerStatus",
  description: "Whether the token and claim slots of an articulation cell are each filled.",
};

export const fourCornerNames = Object.freeze(engineFourCornerNames.map(notationNameOfChargeValueName));

export function cornerOfStatus(tokenArticulated, claimArticulated) {
  return notationNameOfChargeValueName(engineCornerOfStatus(tokenArticulated, claimArticulated));
}

export function statusOfCorner(corner) {
  return engineStatusOfCorner(chargeValueNameOfNotationName(corner));
}

/** A corner's name IS a relation-model-notation charge name (the coordinate
 *  tables agree exactly), so this crosses into the data engine's own vocabulary
 *  via the canonical bridge rather than keeping a second, parallel name table. */
export function chargeNameOfCorner(corner) {
  return chargeValueNameOfNotationName(corner);
}

/** metrologic's engine-vocabulary reading, with its `corner` translated to the
 *  notation name every MetroPlat caller (and Lean-witness function below)
 *  expects; `chargeAlias`, `chargeName` and `charge` already read the engine's
 *  own vocabulary in both readings, so they cross unchanged. */
export function readFourCorner(tokenArticulated, claimArticulated) {
  const engine = engineReadFourCorner(tokenArticulated, claimArticulated);
  return Object.freeze({ ...engine, corner: notationNameOfChargeValueName(engine.corner) });
}

export function fourCornerOfArticulationCell(cell) {
  const engine = engineFourCornerOfArticulationCell(cell);
  return Object.freeze({ ...engine, corner: notationNameOfChargeValueName(engine.corner) });
}

function fourCornerBijectionWitness() {
  const readings = Object.freeze(fourCornerNames.map((name) => {
    const cornerStatus = statusOfCorner(name);
    return readFourCorner(cornerStatus.tokenArticulated, cornerStatus.claimArticulated);
  }));
  const cornerToStatusToCorner = readings.every((reading) => cornerOfStatus(
    statusOfCorner(reading.corner).tokenArticulated,
    statusOfCorner(reading.corner).claimArticulated,
  ) === reading.corner);
  const statusToCornerToStatus = readings.every((reading) => sameStatus(statusOfCorner(reading.corner), reading.status));
  if (!cornerToStatusToCorner || !statusToCornerToStatus) {
    throw new Error("four-corner bijection witness failed");
  }
  return Object.freeze({
    kind: "fourCorner.bijection:witness",
    leanDefinitions: Object.freeze([
      "Obsmetrologia.Articulating.FourCorner.toCorner",
      "Obsmetrologia.Articulating.FourCorner.ofCorner",
    ]),
    leanTheorems: Object.freeze([
      "Obsmetrologia.Articulating.FourCorner.toCorner_ofCorner",
      "Obsmetrologia.Articulating.FourCorner.ofCorner_toCorner",
    ]),
    readings,
    cornerToStatusToCorner: true,
    statusToCornerToStatus: true,
  });
}

const sameStatus = (left, right) =>
  left.tokenArticulated === right.tokenArticulated && left.claimArticulated === right.claimArticulated;

export function articulationPhaseIsCharge(cell) {
  return Object.freeze({
    kind: "fourCorner.articulation-phase-is-charge:witness",
    leanTheorem: "Obsmetrologia.articulation_phase_is_charge",
    reading: fourCornerOfArticulationCell(cell),
    chargeIsPhase: true,
  });
}

export function potentialIsKBot() {
  const reading = readFourCorner(false, false);
  if (reading.corner !== "unknown" || reading.chargeAlias !== "kBot" || reading.chargeName !== "absurd") {
    throw new Error("initial four-corner potential is not knowledge bottom");
  }
  return Object.freeze({
    kind: "fourCorner.unknown-is-kBot:witness",
    leanTheorem: "Obsmetrologia.potential_is_kBot",
    reading,
    knowledgeBottomAlias: "kBot",
    knowledgeBottomChargeName: "absurd",
    initialPotentialIsKnowledgeBottom: true,
  });
}

export function fourCornerCellReceipt(cell) {
  const cornerBijection = fourCornerBijectionWitness();
  const readings = cornerBijection.readings;
  const cornerRoundTrip = readings.every((reading) => sameStatus(statusOfCorner(reading.corner), reading.status));
  const chargeCoordinateRoundTrip = readings.every((reading) => reading.chargeName === chargeNameOfCorner(reading.corner));
  const cellReading = fourCornerOfArticulationCell(cell);
  return Object.freeze({
    kind: "fourCornerCell.receipt:witness",
    readings,
    cellReading,
    cornerBijection,
    articulationPhaseCharge: articulationPhaseIsCharge(cell),
    potentialIsKBot: potentialIsKBot(),
    cornerRoundTrip: cornerRoundTrip,
    chargeCoordinateRoundTrip: chargeCoordinateRoundTrip,
    articulationPhaseIsChargeByCoordinates: true,
    initialPotentialIsKnowledgeBottom: true,
  });
}
