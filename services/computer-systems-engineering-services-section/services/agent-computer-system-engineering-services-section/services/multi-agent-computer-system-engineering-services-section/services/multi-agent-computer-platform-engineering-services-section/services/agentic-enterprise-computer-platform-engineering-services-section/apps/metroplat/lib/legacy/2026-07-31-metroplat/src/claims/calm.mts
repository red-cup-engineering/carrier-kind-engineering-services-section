/**
 * coordination/calm — the CALM theorem read over a glued claim-session settlement.
 *
 * CALM (Consistency As Logical Monotonicity): a computation is coordination-free
 * iff it is monotone. This is not a second merge system. `glueClaimSessions`
 * (`./session.mjs`) already computes the witness this reads:
 * `conflicts` (cells settled to `contested` — the knowledge-join found
 * opposing evidence) and `coordination` (the cover-nerve H1 rank over the
 * source/cell/stance federated cover — nonzero exactly when sources disagree in
 * a way that is not a simple tree of agreement). Monotone here means neither
 * residue is present: every source's contribution lifted through the glue by
 * knowledge accumulation alone, with no held contradiction and no cyclic
 * cross-source obstruction.
 *
 * The prior `crdt-cohomological-calm` module (core/closure/analysis and its
 * evaluators wrapper) proved these same-shaped facts — H1 vanishing, monotone
 * merge, quiescence as closure fixed point — only about a hardcoded two-cell
 * toy example it built itself; nothing in the running system ever fed it real
 * data, and no test exercised it (there is no test/ tree in this package). This
 * module replaces that disconnected proof shell with a reading of the glue's
 * own real fields.
 */
import { schemaFrom, type FromSchema } from "../lib/schema/contract.mts";
import type { GluedClaimSessions } from "./index.mts";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 } as const;

export const calmClassificationSchema = {
  $id: "metroplat/coordination/calm/classification",
  title: "CalmClassification",
  description: "A CALM theorem classification of a glued claim-session settlement: coordination-free iff monotone. The witness is glueClaimSessions' own conflicts/coordination fields.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "theorem", "operation", "monotone", "coordination", "witness"],
  properties: {
    kind: { const: "metroplat.coordination.calm-classification" },
    theorem: { const: "CALM" },
    operation: { const: "glueClaimSessions" },
    monotone: { type: "boolean" },
    coordination: { enum: ["coordination-free", "consensus-required"] },
    witness: {
      type: "object",
      additionalProperties: false,
      required: ["contested", "federationOnly"],
      properties: {
        contested: nonnegativeIntegerSchema,
        federationOnly: nonnegativeIntegerSchema,
      },
    },
  },
} as const;

export type CalmClassification = FromSchema<typeof calmClassificationSchema>;
export const calmClassificationContract = schemaFrom(calmClassificationSchema);

/**
 * Classify an already-glued claim-session settlement by CALM.
 *
 * `contested` is the count of cells the glue's own knowledge-join settled to
 * `contested` (a held conflict — `glued.conflicts.length`). `federationOnly` is
 * the glue's own cover-nerve H1 rank (`glued.coordination.rank`) — nonzero
 * exactly when the source/cell/stance cover has a cycle no single source's
 * agreement tree explains. Monotone iff both are zero: no contested cell, no
 * cyclic cross-source obstruction.
 */
export function classifyCalmOfGlue(glued: GluedClaimSessions): CalmClassification {
  const contested = glued.conflicts.length;
  const federationOnly = glued.coordination.rank;
  const monotone = contested === 0 && federationOnly === 0;
  return calmClassificationContract.assert(Object.freeze({
    kind: "metroplat.coordination.calm-classification" as const,
    theorem: "CALM" as const,
    operation: "glueClaimSessions" as const,
    monotone,
    coordination: monotone ? "coordination-free" as const : "consensus-required" as const,
    witness: Object.freeze({ contested, federationOnly }),
  }), "CALM classification") as CalmClassification;
}
