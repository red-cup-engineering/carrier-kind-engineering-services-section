/**
 * @packageDocumentation
 *
 * Pure temporal projection of already-admitted module-topology-valuation outcomes.
 * Journal traversal belongs to the application adapter in monitoring/operations.
 *
 * Each admitted `module-topology-valuation` outcome contributes one stage.
 * Consecutive distinct observations are related in both the Belnap knowledge
 * order and the truth order:
 *
 * - **knowledge ascending** — more evidence observed (pos ↑ or neg ↑)
 * - **truth ascending** — conformance improving (pos ↑ and neg ↓)
 *
 * where pos = held modules (conformant), neg = denied + contested modules
 * (non-conformant or contradicting evidence).
 *
 * @metroplatSubject source-code
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { recordHistoryOfStages, type RecordHistoryOptions, type RecordHistoryTransition } from "../../substrate/history.mts";
import type { FourCensus } from "@red-cup-engineering/computer-data-engine/bilattice-charge";

export type ModuleTopologyValuationHistoryOptions = RecordHistoryOptions;

/** One admitted module-topology-valuation observation extracted from the RPC journal. */
export interface ModuleTopologyValuationStage {
  readonly source: string;
  readonly observation: string;
  readonly at: string;
  readonly invocation: string;
  readonly receipt: string;
  readonly causes: readonly string[];
  /** FOUR-census over all modules valued in this observation.
   *  `pos = summary.held`, `neg = summary.denied + summary.contested`
   *  for the evidence-record that drives history transitions. */
  readonly summary: FourCensus;
}

// ---------------------------------------------------------------------------
// History contract schema
// ---------------------------------------------------------------------------

const moduleTopologyValuationHistorySchema = {
  $id: "metroplat/monitoring/source-code/module-topology-valuation-history",
  type: "object" as const,
  required: ["kind", "dates", "rows", "malformed", "observations", "stages", "transitions"] as const,
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.monitoring.source-code.module-topology-valuation-history" },
    dates: { type: "array" as const, items: { type: "string" as const }, minItems: 1, maxItems: 31 },
    rows: { type: "integer" as const, minimum: 0 },
    malformed: { type: "integer" as const, minimum: 0 },
    observations: { type: "integer" as const, minimum: 0 },
    stages: {
      type: "array" as const,
      items: {
        type: "object" as const,
        required: ["source", "observation", "at", "invocation", "receipt", "causes", "summary"] as const,
        additionalProperties: false,
        properties: {
          source: { type: "string" as const },
          observation: { type: "string" as const },
          at: { type: "string" as const },
          invocation: { type: "string" as const },
          receipt: { type: "string" as const },
          causes: { type: "array" as const, items: { type: "string" as const } },
          summary: {
            type: "object" as const,
            required: ["held", "denied", "contested", "unknown"] as const,
            additionalProperties: false,
            properties: {
              held: { type: "integer" as const, minimum: 0 },
              denied: { type: "integer" as const, minimum: 0 },
              contested: { type: "integer" as const, minimum: 0 },
              unknown: { type: "integer" as const, minimum: 0 },
            },
          },
        },
      },
    },
    transitions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        required: ["from", "to", "knowledge", "truth"] as const,
        additionalProperties: false,
        properties: {
          from: { type: "string" as const },
          to: { type: "string" as const },
          knowledge: { enum: ["equal", "ascending", "descending", "incomparable"] as const },
          truth: { enum: ["equal", "ascending", "descending", "incomparable"] as const },
        },
      },
    },
  },
} as const;

export const moduleTopologyValuationHistoryContract = schemaFrom(moduleTopologyValuationHistorySchema);

export type ModuleTopologyValuationHistory = FromJsonSchema<typeof moduleTopologyValuationHistorySchema>;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fold distinct consecutive topology-valuation observations into a bounded history.
 *
 * Transitions relate consecutive observations in both the knowledge order
 * (total evidence observed) and the truth order (conformance direction):
 *
 *   evidence record: `pos = summary.held`, `neg = summary.denied + summary.contested`
 *
 * A truth-ascending transition means the codebase moved toward conformance
 * (more held, fewer denied/contested modules).  A truth-descending one
 * signals regression. Incomparable means both dimensions moved in opposite
 * directions simultaneously — the paraconsistent Monitor captures this
 * without collapsing to either verdict. */
export function moduleTopologyValuationHistoryOfStages(
  dates: readonly string[],
  source: { readonly rows: number; readonly malformed: number; readonly stages: readonly ModuleTopologyValuationStage[] },
  options: ModuleTopologyValuationHistoryOptions = {},
): ModuleTopologyValuationHistory {
  const history = recordHistoryOfStages(
    dates,
    source.stages,
    (stage) => Object.freeze({
      kind: "evidence.record" as const,
      // Positive mass: conformant (held) modules — evidence for correctness.
      pos: stage.summary.held,
      // Negative mass: non-conformant (denied) and paraconsistent (contested) modules.
      neg: stage.summary.denied + stage.summary.contested,
    }),
    options,
  );
  return moduleTopologyValuationHistoryContract.assert(Object.freeze({
    kind: "metroplat.monitoring.source-code.module-topology-valuation-history" as const,
    dates: history.dates,
    rows: source.rows,
    malformed: source.malformed,
    observations: history.observations,
    stages: history.stages as unknown as readonly ModuleTopologyValuationStage[],
    transitions: history.transitions as unknown as readonly RecordHistoryTransition[],
  }), "module topology valuation history") as ModuleTopologyValuationHistory;
}
