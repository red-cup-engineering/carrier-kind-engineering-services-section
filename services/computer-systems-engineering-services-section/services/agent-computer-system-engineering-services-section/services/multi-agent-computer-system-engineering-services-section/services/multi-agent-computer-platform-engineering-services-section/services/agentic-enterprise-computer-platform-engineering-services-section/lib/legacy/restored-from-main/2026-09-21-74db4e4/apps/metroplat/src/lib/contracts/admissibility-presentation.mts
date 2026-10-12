/**
 * contracts/admissibility-presentation - material-boundary admissibility
 * presentations and their generated implementation projections.
 */

import { relationalPredicate, type ContractValue, type RelationalPredicate } from "./contract.mts";

export type AdmissibilityPresentationProjection =
  | "json-schema"
  | "typescript-type"
  | "validator"
  | "wire-codec"
  | "resource"
  | "statement-row";

/** An admissibility presentation of material at a boundary, not merely a schema/type projection. */
export interface AdmissibilityPresentation {
  readonly kind: "metroplat.admissibility-presentation";
  readonly id: string;
  readonly material: string;
  readonly address: string;
  readonly admissibility: RelationalPredicate;
  readonly invariants: readonly string[];
  readonly permittedLenses: readonly string[];
  readonly projections: readonly AdmissibilityPresentationProjection[];
}

/** The generated implementation projections of one admissibility presentation. */
export interface AdmissibilityProjectionBundle {
  readonly kind: "metroplat.admissibility-projection-bundle";
  readonly id: string;
  readonly address: string;
  readonly material: string;
  readonly presentation: string;
  readonly schemaId: string;
  readonly schema: ContractValue;
  readonly structuralType: ContractValue;
  readonly declaration: string;
  readonly validator: {
    readonly implementation: string;
    readonly acceptsValidSample: boolean;
    readonly rejectsInvalidSample: boolean;
  };
  readonly wire: {
    readonly codec: "json";
    readonly mediaType: string;
    readonly resource: string;
  };
  readonly resources: readonly string[];
  readonly projections: readonly AdmissibilityPresentationProjection[];
  readonly verifies: readonly string[];
}

export function admissibilityPresentation(spec: Omit<AdmissibilityPresentation, "kind">): AdmissibilityPresentation {
  return Object.freeze({
    kind: "metroplat.admissibility-presentation" as const,
    id: spec.id,
    material: spec.material,
    address: spec.address,
    admissibility: relationalPredicate(spec.admissibility),
    invariants: Object.freeze([...spec.invariants]),
    permittedLenses: Object.freeze([...spec.permittedLenses]),
    projections: Object.freeze([...spec.projections]),
  });
}

export function admissibilityProjectionBundle(spec: Omit<AdmissibilityProjectionBundle, "kind">): AdmissibilityProjectionBundle {
  return Object.freeze({
    kind: "metroplat.admissibility-projection-bundle" as const,
    id: spec.id,
    address: spec.address,
    material: spec.material,
    presentation: spec.presentation,
    schemaId: spec.schemaId,
    schema: spec.schema,
    structuralType: spec.structuralType,
    declaration: spec.declaration,
    validator: Object.freeze({ ...spec.validator }),
    wire: Object.freeze({ ...spec.wire }),
    resources: Object.freeze([...spec.resources]),
    projections: Object.freeze([...spec.projections]),
    verifies: Object.freeze([...spec.verifies]),
  });
}
