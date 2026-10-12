/**
 * models/plasma/reconnection-curvature - reconnection as curvature.
 *
 * This captures `Obsmetrologia.Relational.Plasma.ReconnectionCurvature`:
 * frozen-in flux as absence of non-Scott firing, reconnection as its failure,
 * flat-regime prohibition, and a canonical curved reconnection event.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";


export const fieldLineFlowSchema = {
  $id: "metroplat/models/plasma/reconnection-curvature/field-line-flow",
  type: "object",
  required: ["kind", "update", "history", "nonScottContinuous"],
  properties: {
    kind: { const: "relational.plasma.reconnection.fieldLineFlow" },
    update: { type: "string" },
    history: { type: "string" },
    nonScottContinuous: { type: "boolean" },
  },
  additionalProperties: false,
  title: "FieldLineFlow",
  description: "A field-line flow's update/history readout and whether it is non-Scott continuous.",
} as const;

export type FieldLineFlow = FromJsonSchema<typeof fieldLineFlowSchema>;

export const closureRegimeDataSchema = {
  $id: "metroplat/models/plasma/reconnection-curvature/closure-regime-data",
  type: "object",
  required: ["kind", "scottContinuous", "cohomologyVanishes"],
  properties: {
    kind: { const: "relational.plasma.regime" },
    scottContinuous: { type: "boolean" },
    cohomologyVanishes: { type: "boolean" },
  },
  additionalProperties: false,
  title: "ClosureRegimeData",
  description: "Whether the plasma regime is Scott continuous and its cohomology vanishes.",
} as const;

export type ClosureRegimeData = FromJsonSchema<typeof closureRegimeDataSchema>;

export interface ReconnectionCurvatureWitness {
  readonly kind: "relational.plasma.reconnection.curvature:witness";
  readonly flow: FieldLineFlow;
  readonly reconnectionEvent: true;
  readonly h1Nonzero: true;
  readonly regimeCurved: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Plasma.frozen_in_iff_no_reconnection",
    "Obsmetrologia.Relational.Plasma.reconnection_event_implies_firing",
    "Obsmetrologia.Relational.Plasma.reconnection_event_implies_H1_nonzero",
    "Obsmetrologia.Relational.Plasma.reconnection_event_regime_curved",
  ];
}

export interface IdealFlowNoReconnectionWitness {
  readonly kind: "relational.plasma.reconnection.ideal_no_reconnection:witness";
  readonly flow: FieldLineFlow;
  readonly noReconnection: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Plasma.ideal_flow_has_no_reconnection",
    "Obsmetrologia.Relational.Plasma.flat_regime_forbids_reconnection_event",
  ];
}

export interface PlasmaReconnectionCurvatureReceipt {
  readonly kind: "relational.plasma.reconnection.receipt:witness";
  readonly canonical: ReconnectionCurvatureWitness;
  readonly ideal: IdealFlowNoReconnectionWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Plasma.ReconnectionCurvature";
}

export function fieldLineFlow(update: string, history: string, nonScottContinuous: boolean): FieldLineFlow {
  return Object.freeze({
    kind: "relational.plasma.reconnection.fieldLineFlow" as const,
    update,
    history,
    nonScottContinuous,
  });
}

export function frozenIn(flow: FieldLineFlow): boolean {
  return !flow.nonScottContinuous;
}

export function reconnectionEvent(flow: FieldLineFlow): boolean {
  return flow.nonScottContinuous;
}

export function flatRegime(scottContinuous = true): ClosureRegimeData {
  return Object.freeze({
    kind: "relational.plasma.regime" as const,
    scottContinuous,
    cohomologyVanishes: scottContinuous,
  });
}

export function canonicalReconnection(): FieldLineFlow {
  return fieldLineFlow("forallAnteOp", "botTopPrefix", true);
}

export function idealFieldLineFlow(): FieldLineFlow {
  return fieldLineFlow("closure.op", "directedPrefix", false);
}

export function reconnectionCurvature(flow: FieldLineFlow): ReconnectionCurvatureWitness {
  if (!reconnectionEvent(flow) || frozenIn(flow)) throw new TypeError("reconnectionCurvature: flow is frozen-in");
  return Object.freeze({
    kind: "relational.plasma.reconnection.curvature:witness" as const,
    flow,
    reconnectionEvent: true as const,
    h1Nonzero: true as const,
    regimeCurved: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.frozen_in_iff_no_reconnection",
      "Obsmetrologia.Relational.Plasma.reconnection_event_implies_firing",
      "Obsmetrologia.Relational.Plasma.reconnection_event_implies_H1_nonzero",
      "Obsmetrologia.Relational.Plasma.reconnection_event_regime_curved",
    ] as const),
  });
}

export function idealFlowHasNoReconnection(flow = idealFieldLineFlow()): IdealFlowNoReconnectionWitness {
  if (reconnectionEvent(flow)) throw new TypeError("idealFlowHasNoReconnection: flow reconnects");
  return Object.freeze({
    kind: "relational.plasma.reconnection.ideal_no_reconnection:witness" as const,
    flow,
    noReconnection: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.ideal_flow_has_no_reconnection",
      "Obsmetrologia.Relational.Plasma.flat_regime_forbids_reconnection_event",
    ] as const),
  });
}

export function plasmaReconnectionCurvatureReceipt(): PlasmaReconnectionCurvatureReceipt {
  return Object.freeze({
    kind: "relational.plasma.reconnection.receipt:witness" as const,
    canonical: reconnectionCurvature(canonicalReconnection()),
    ideal: idealFlowHasNoReconnection(),
    capturedLeanModule: "Obsmetrologia.Relational.Plasma.ReconnectionCurvature" as const,
  });
}
