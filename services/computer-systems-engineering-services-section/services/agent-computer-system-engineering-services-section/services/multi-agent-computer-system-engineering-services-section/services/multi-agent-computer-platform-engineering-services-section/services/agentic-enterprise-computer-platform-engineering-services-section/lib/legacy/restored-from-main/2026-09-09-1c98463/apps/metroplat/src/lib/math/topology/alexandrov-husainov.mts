/** Metro's open-set schema over the shared finite Alexandrov implementation. */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
export { finitePoset, defaultPoset, openSet, isUpSet, principalUpSet, intersection, union, allOpenSets, specializes, monotoneMap, topologyReceipt, continuousMonotoneReceipt, husainovBoundaryReceipt, receipt as alexandrovHusainovReceipt } from "@lenticule-science/articulating/predicating/positing/settling/analysis/alexandrov-husainov";
export type { FinitePosetCarrier as FinitePoset, MonotoneMapCarrier as MonotoneMap, AlexandrovTopologyReceipt, ContinuousMonotoneReceipt, HusainovBoundaryReceipt, AlexandrovHusainovReceipt } from "@lenticule-science/articulating/predicating/positing/settling/analysis/alexandrov-husainov";

export const openSetSchemaContractSchema = {
  $id: "metroplat/closure/analysis/alexandrov-husainov/open-set",
  type: "object",
  required: ["kind", "points"],
  properties: {
    kind: { const: "alexandrovHusainov.openSet" },
    points: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "OpenSet",
  description: "An Alexandrov open set: an up-closed set of poset points.",
} as const;

export type OpenSet = FromJsonSchema<typeof openSetSchemaContractSchema>;
