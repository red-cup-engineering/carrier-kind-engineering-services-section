/**
 * contracts/admissibility-presentation - material-boundary admissibility
 * presentations and their generated implementation projections.
 */

import { relationalPredicate } from "./contract.mjs";

/** An admissibility presentation of material at a boundary, not merely a schema/type projection. */

/** The generated implementation projections of one admissibility presentation. */

export function admissibilityPresentation(spec) {
  return Object.freeze({
    kind: "metroplat.admissibility-presentation",
    id: spec.id,
    material: spec.material,
    address: spec.address,
    admissibility: relationalPredicate(spec.admissibility),
    invariants: Object.freeze([...spec.invariants]),
    permittedLenses: Object.freeze([...spec.permittedLenses]),
    projections: Object.freeze([...spec.projections]),
  });
}

export function admissibilityProjectionBundle(spec) {
  return Object.freeze({
    kind: "metroplat.admissibility-projection-bundle",
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
