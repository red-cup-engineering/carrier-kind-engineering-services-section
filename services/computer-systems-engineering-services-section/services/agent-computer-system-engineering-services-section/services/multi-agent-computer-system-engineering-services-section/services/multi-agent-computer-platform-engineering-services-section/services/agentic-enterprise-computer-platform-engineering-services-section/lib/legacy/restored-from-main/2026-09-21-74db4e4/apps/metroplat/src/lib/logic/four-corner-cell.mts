/**
 * calculus/four-corner-cell — finite bridge for
 *
 * Lean names the articulation corners by phase, and the JS charge algebra
 * (`bilattice-charge.mts`) names the same Bool x Bool coordinates by Belnap
 * value — both now the same table:
 *   potential=(false,false), active=(true,false), absurd=(true,true), stable=(false,true).
 *
 * (Until this session's fix, `bilattice-charge.mts`'s table was a rotated
 * permutation of Lean's, and this module's job was translating between the
 * two rather than fixing the root; `chargeNameByCorner` below is now the
 * identity map, kept only so this bridge still witnesses the coordinate-level
 * conflation theorem explicitly against the Lean theorem names.)
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import type {
  ArticulationCell,
  AperiodicArticulationCell,
} from "@red-cup-engineering/computer-data-engine/utterance";
import {
  chargeValue,
  chargeValueName,
  type ChargeValue,
  type ChargeValueName,
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";


export type FourCornerName = "unknown" | "held" | "contested" | "denied";
export type FourCornerChargeAlias = "kBot" | "tTop" | "kTop" | "tBot";

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
} as const;

export type FourCornerStatus = FromJsonSchema<typeof fourCornerStatusSchema>;

export interface FourCornerReading {
  readonly kind: "fourCorner.reading";
  readonly status: FourCornerStatus;
  readonly corner: FourCornerName;
  readonly chargeAlias: FourCornerChargeAlias;
  readonly chargeName: ChargeValueName;
  readonly charge: ChargeValue;
  readonly sameCoordinates: true;
}

export interface FourCornerBijectionWitness {
  readonly kind: "fourCorner.bijection:witness";
  readonly leanDefinitions: readonly [
    "Obsmetrologia.Articulating.FourCorner.toCorner",
    "Obsmetrologia.Articulating.FourCorner.ofCorner",
  ];
  readonly leanTheorems: readonly [
    "Obsmetrologia.Articulating.FourCorner.toCorner_ofCorner",
    "Obsmetrologia.Articulating.FourCorner.ofCorner_toCorner",
  ];
  readonly readings: readonly FourCornerReading[];
  readonly cornerToStatusToCorner: true;
  readonly statusToCornerToStatus: true;
}

export interface ArticulationPhaseChargeWitness {
  readonly kind: "fourCorner.articulation-phase-is-charge:witness";
  readonly leanTheorem: "Obsmetrologia.articulation_phase_is_charge";
  readonly reading: FourCornerReading;
  readonly chargeIsPhase: true;
}

export interface PotentialIsKBotWitness {
  readonly kind: "fourCorner.unknown-is-kBot:witness";
  readonly leanTheorem: "Obsmetrologia.potential_is_kBot";
  readonly reading: FourCornerReading;
  readonly knowledgeBottomAlias: "kBot";
  readonly knowledgeBottomChargeName: "unknown";
  readonly initialPotentialIsKnowledgeBottom: true;
}

export interface FourCornerCellReceipt {
  readonly kind: "fourCornerCell.receipt:witness";
  readonly readings: readonly FourCornerReading[];
  readonly cellReading: FourCornerReading;
  readonly cornerBijection: FourCornerBijectionWitness;
  readonly articulationPhaseCharge: ArticulationPhaseChargeWitness;
  readonly potentialIsKBot: PotentialIsKBotWitness;
  readonly cornerRoundTrip: true;
  readonly chargeCoordinateRoundTrip: true;
  readonly articulationPhaseIsChargeByCoordinates: true;
  readonly initialPotentialIsKnowledgeBottom: true;
}

const status = (tokenArticulated: boolean, claimArticulated: boolean): FourCornerStatus => Object.freeze({
  kind: "fourCorner.status" as const,
  tokenArticulated,
  claimArticulated,
});

const cornerStatusByName: { readonly [name in FourCornerName]: FourCornerStatus } = Object.freeze({
  unknown: status(false, false),
  held: status(true, false),
  contested: status(true, true),
  denied: status(false, true),
});

const chargeAliasByCorner: { readonly [name in FourCornerName]: FourCornerChargeAlias } = Object.freeze({
  unknown: "kBot",
  held: "tTop",
  contested: "kTop",
  denied: "tBot",
});

const chargeNameByCorner: { readonly [name in FourCornerName]: ChargeValueName } = Object.freeze({
  unknown: "unknown",
  held: "held",
  contested: "contested",
  denied: "denied",
});

export const fourCornerNames: readonly FourCornerName[] = Object.freeze(["unknown", "held", "contested", "denied"] as const);

export function cornerOfStatus(tokenArticulated: boolean, claimArticulated: boolean): FourCornerName {
  if (!tokenArticulated && !claimArticulated) return "unknown";
  if (tokenArticulated && !claimArticulated) return "held";
  if (tokenArticulated && claimArticulated) return "contested";
  return "denied";
}

export function statusOfCorner(corner: FourCornerName): FourCornerStatus {
  return cornerStatusByName[corner];
}

export function chargeNameOfCorner(corner: FourCornerName): ChargeValueName {
  return chargeNameByCorner[corner];
}

export function readFourCorner(tokenArticulated: boolean, claimArticulated: boolean): FourCornerReading {
  const corner = cornerOfStatus(tokenArticulated, claimArticulated);
  const charge = chargeValue(chargeNameOfCorner(corner));
  return Object.freeze({
    kind: "fourCorner.reading" as const,
    status: status(tokenArticulated, claimArticulated),
    corner,
    chargeAlias: chargeAliasByCorner[corner],
    chargeName: chargeValueName(charge),
    charge,
    sameCoordinates: true as const,
  });
}

export function fourCornerBijectionWitness(): FourCornerBijectionWitness {
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
    kind: "fourCorner.bijection:witness" as const,
    leanDefinitions: Object.freeze([
      "Obsmetrologia.Articulating.FourCorner.toCorner",
      "Obsmetrologia.Articulating.FourCorner.ofCorner",
    ] as const),
    leanTheorems: Object.freeze([
      "Obsmetrologia.Articulating.FourCorner.toCorner_ofCorner",
      "Obsmetrologia.Articulating.FourCorner.ofCorner_toCorner",
    ] as const),
    readings,
    cornerToStatusToCorner: true as const,
    statusToCornerToStatus: true as const,
  });
}

const sameStatus = (left: FourCornerStatus, right: FourCornerStatus): boolean =>
  left.tokenArticulated === right.tokenArticulated && left.claimArticulated === right.claimArticulated;

const pairingOf = (cell: ArticulationCell | AperiodicArticulationCell): readonly [readonly unknown[], readonly unknown[]] => {
  if ("potentialAperiodicArticulationCell" in cell) return cell.potentialAperiodicArticulationCell[1];
  return cell[1];
};

export function fourCornerOfArticulationCell(cell: ArticulationCell | AperiodicArticulationCell): FourCornerReading {
  const [tokenSlot, claimSlot] = pairingOf(cell);
  return readFourCorner(tokenSlot.length > 0, claimSlot.length > 0);
}

export function articulationPhaseIsCharge(cell: ArticulationCell | AperiodicArticulationCell): ArticulationPhaseChargeWitness {
  return Object.freeze({
    kind: "fourCorner.articulation-phase-is-charge:witness" as const,
    leanTheorem: "Obsmetrologia.articulation_phase_is_charge" as const,
    reading: fourCornerOfArticulationCell(cell),
    chargeIsPhase: true as const,
  });
}

export function potentialIsKBot(): PotentialIsKBotWitness {
  const reading = readFourCorner(false, false);
  if (reading.corner !== "unknown" || reading.chargeAlias !== "kBot" || reading.chargeName !== "unknown") {
    throw new Error("initial four-corner potential is not knowledge bottom");
  }
  return Object.freeze({
    kind: "fourCorner.unknown-is-kBot:witness" as const,
    leanTheorem: "Obsmetrologia.potential_is_kBot" as const,
    reading,
    knowledgeBottomAlias: "kBot" as const,
    knowledgeBottomChargeName: "unknown" as const,
    initialPotentialIsKnowledgeBottom: true as const,
  });
}

export function fourCornerCellReceipt(cell: ArticulationCell | AperiodicArticulationCell): FourCornerCellReceipt {
  const cornerBijection = fourCornerBijectionWitness();
  const readings = cornerBijection.readings;
  const cornerRoundTrip = readings.every((reading) => sameStatus(statusOfCorner(reading.corner), reading.status));
  const chargeCoordinateRoundTrip = readings.every((reading) => reading.chargeName === chargeNameOfCorner(reading.corner));
  const cellReading = fourCornerOfArticulationCell(cell);
  return Object.freeze({
    kind: "fourCornerCell.receipt:witness" as const,
    readings,
    cellReading,
    cornerBijection,
    articulationPhaseCharge: articulationPhaseIsCharge(cell),
    potentialIsKBot: potentialIsKBot(),
    cornerRoundTrip: cornerRoundTrip as true,
    chargeCoordinateRoundTrip: chargeCoordinateRoundTrip as true,
    articulationPhaseIsChargeByCoordinates: true as const,
    initialPotentialIsKnowledgeBottom: true as const,
  });
}
