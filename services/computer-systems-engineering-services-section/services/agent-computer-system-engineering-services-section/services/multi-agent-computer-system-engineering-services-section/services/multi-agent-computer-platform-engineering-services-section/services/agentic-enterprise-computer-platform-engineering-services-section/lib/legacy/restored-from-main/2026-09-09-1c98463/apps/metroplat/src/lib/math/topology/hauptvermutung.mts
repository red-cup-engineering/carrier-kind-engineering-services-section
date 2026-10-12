/**
 * analysis/hauptvermutung - finite spacetime fingerprints.
 *
 * order-intrinsic fingerprint `(relations, action)` computed from a finite
 * causal order alone. Continuum uniqueness remains outside this Node surface.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import {
  apexCount,
  bdAction,
  diamondCausalSet,
  closeCausalSet,
  type CausalSet,
  type CausalClosureObstruction,
} from "../order/causal.mts";


export const spacetimeFingerprintSchema = {
  $id: "metroplat/closure/analysis/hauptvermutung/spacetime-fingerprint",
  type: "object",
  required: ["kind", "relations", "action"],
  properties: {
    kind: { const: "lorentzian.spacetimeFingerprint" },
    relations: { type: "number" },
    action: { type: "number" },
  },
  additionalProperties: false,
  title: "SpacetimeFingerprint",
  description: "An order-intrinsic fingerprint (relations, action) computed from a finite causal order.",
} as const;

export type SpacetimeFingerprint = FromJsonSchema<typeof spacetimeFingerprintSchema>;

export interface HauptvermutungReceipt {
  readonly kind: "lorentzian.hauptvermutungFingerprint:witness";
  readonly fingerprint: SpacetimeFingerprint;
  readonly diamondFingerprint: SpacetimeFingerprint;
  readonly orderIntrinsic: true;
  readonly manifoldFree: true;
  readonly continuumUniquenessBoundary: "faithful embedding uniqueness remains frontier";
}

function isObstruction(value: unknown): value is CausalClosureObstruction {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: string }).kind === "lorentzian.causalSettle-obstruction";
}

/** Read the order-intrinsic spacetime fingerprint `(relations, action)`. */
export function fingerprint(causalSet: CausalSet): SpacetimeFingerprint | CausalClosureObstruction {
  const settled = closeCausalSet(causalSet);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  const normalized = Object.freeze({ kind: "lorentzian.causalSet" as const, events: settled.events, links: settled.closure });
  const action = bdAction(normalized);
  if (isObstruction(action)) return action;
  return Object.freeze({
    kind: "lorentzian.spacetimeFingerprint" as const,
    relations: apexCount(settled.events, settled.closure),
    action,
  });
}

/** Bundle the finite, testable content of the Hauptvermutung module. */
export function hauptvermutungReceipt(causalSet: CausalSet = diamondCausalSet): HauptvermutungReceipt | CausalClosureObstruction {
  const value = fingerprint(causalSet);
  if (isObstruction(value)) return value;
  const diamond = fingerprint(diamondCausalSet) as SpacetimeFingerprint;
  if (diamond.relations !== 5 || diamond.action !== 1) {
    throw new TypeError("hauptvermutung.receipt: diamond fingerprint law failed");
  }
  return Object.freeze({
    kind: "lorentzian.hauptvermutungFingerprint:witness" as const,
    fingerprint: value,
    diamondFingerprint: diamond,
    orderIntrinsic: true as const,
    manifoldFree: true as const,
    continuumUniquenessBoundary: "faithful embedding uniqueness remains frontier" as const,
  });
}
