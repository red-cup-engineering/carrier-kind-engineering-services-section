

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const idSchema = { type: "string", minLength: 1 };
const nonemptyStringArray = { type: "array", minItems: 1, items: idSchema };
const optionalString = { type: "string", minLength: 1 };
const siteBulkBoundarySchema = {
  type: "object",
  required: ["id", "kind"],
  properties: {
    id: idSchema,
    kind: { enum: ["schema", "codec", "file", "protocol", "route", "evidence"] },
    schema: optionalString,
    address: optionalString,
    codec: optionalString,
    protocol: optionalString,
    method: optionalString,
    href: optionalString,
    description: optionalString,
  },
  additionalProperties: true,
};
const siteBulkSchema = {
  type: "object",
  required: ["id", "boundaries", "constraints"],
  properties: {
    id: idSchema,
    boundaries: { type: "array", minItems: 1, items: siteBulkBoundarySchema },
    constraints: nonemptyStringArray,
  },
  additionalProperties: false,
};
const causalLinkSchema = {
  type: "object",
  required: ["from", "to"],
  properties: {
    from: idSchema,
    to: idSchema,
  },
  additionalProperties: false,
};

const rootRouteProjectorRouteSchema = {
  type: "object",
  required: ["route", "method", "path", "address"],
  properties: {
    route: { enum: ["settlement", "root-observation"] },
    method: { enum: ["GET", "POST"] },
    path: idSchema,
    address: idSchema,
    statementLog: optionalString,
    evidence: optionalString,
  },
  additionalProperties: false,
};

const projectRootCompartmentSchema = {
  type: "object",
  required: ["name", "root", "role", "owns", "exposes", "evidence"],
  properties: {
    name: { enum: ["lib", "src", "sites", "services", "apps", "scripts", "data", "publication"] },
    root: idSchema,
    role: { enum: ["material-law", "package-realization", "settlement-body", "process-boundary", "runnable-assembly", "procedure", "artifact-store", "publication-status"] },
    owns: nonemptyStringArray,
    exposes: nonemptyStringArray,
    evidence: nonemptyStringArray,
  },
  additionalProperties: false,
};

const projectRootRegistrySchema = {
  type: "object",
  required: ["kind", "id", "address"],
  properties: {
    kind: { enum: ["app-optic-registry", "lean-project-theorem-map", "service-boundary-registry", "service-deployment-policy", "service-lifecycle-coverage", "settlement-route-projector-registry", "script-procedure"] },
    id: idSchema,
    address: idSchema,
  },
  additionalProperties: false,
};

export const rootRouteProjectorDescriptorSchema = {
  $id: "metroplat/settlements/route-projector",
  title: "RootRouteProjectorDescriptor",
  description: "A serializable descriptor for a settlement-owned root route projector; the live function stays in sites/ while routed results are checked by the running root-route projection schema.",
  type: "object",
  required: ["kind", "id", "settlement", "projector", "routes", "evidence"],
  properties: {
    kind: { const: "metroplat.settlements.route-projector" },
    id: idSchema,
    settlement: idSchema,
    projector: idSchema,
    routes: { type: "array", minItems: 1, items: rootRouteProjectorRouteSchema },
    evidence: nonemptyStringArray,
  },
  additionalProperties: false,
};

export const projectRootDescriptorSchema = {
  $id: "metroplat/settlements/project-root",
  title: "ProjectRootDescriptor",
  description: "A phase-bearing project-root settlement descriptor gathering package material, realization, process boundaries, apps, procedures, data artifacts, and publication status without importing those compartments into sites/.",
  type: "object",
  required: ["kind", "id", "package", "root", "phase", "compartments", "registries", "frontier", "evidence"],
  properties: {
    kind: { const: "metroplat.settlements.project-root" },
    id: idSchema,
    package: idSchema,
    root: idSchema,
    phase: idSchema,
    compartments: { type: "array", minItems: 1, items: projectRootCompartmentSchema },
    registries: { type: "array", minItems: 1, items: projectRootRegistrySchema },
    frontier: nonemptyStringArray,
    evidence: nonemptyStringArray,
  },
  additionalProperties: false,
};

export const rootRouteProjectorRegistrySchema = {
  $id: "metroplat/settlements/route-projector-registry",
  title: "RootRouteProjectorRegistry",
  description: "The package-level registry of settlement-owned root route projectors exposed from sites/.",
  type: "object",
  required: ["kind", "package", "projectors", "evidence"],
  properties: {
    kind: { const: "metroplat.settlements.route-projector-registry" },
    package: idSchema,
    projectors: { type: "array", items: rootRouteProjectorDescriptorSchema },
    evidence: nonemptyStringArray,
  },
  additionalProperties: false,
};

const holeRouteSchema = {
  type: "object",
  required: ["kind", "id", "path", "observationSchema", "statementLogSchema", "feed"],
  properties: {
    kind: { const: "metroplat.settlements.hole" },
    id: { const: "metroplat/settlements/hole" },
    path: { const: "/" },
    observationSchema: { const: "metroplat/settlements/hole/observation" },
    statementLogSchema: { const: "metroplat/witness/eavt-log" },
    feed: { const: "hole" },
  },
  additionalProperties: false,
};

const holeObservationSchema = {
  type: "object",
  required: ["kind", "settlement", "source", "observedAt", "theoremReference", "causalSet"],
  properties: {
    kind: { enum: ["metroplat.settlements.hole.observation", "metroplat.settlements.hole.obstruction"] },
    settlement: { const: "metroplat/settlements/hole" },
    source: { type: "string", minLength: 1 },
    observedAt: {},
    theoremReference: { const: "Obsmetrologia.Relational.Spacetime.Boundary.Hole" },
    causalSet: {
      type: "object",
      required: ["kind", "events", "links"],
      properties: {
        kind: { const: "lorentzian.causalSet" },
        events: { type: "array", items: idSchema },
        links: { type: "array", items: causalLinkSchema },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: true,
};

export const projectRootDescriptorContract = schemaFrom(projectRootDescriptorSchema);
export const rootRouteProjectorDescriptorContract = schemaFrom(rootRouteProjectorDescriptorSchema);
export const rootRouteProjectorRegistryContract = schemaFrom(rootRouteProjectorRegistrySchema);

export const siteBulkContract = schemaFrom({
  $id: "metroplat/site/bulk",
  title: "SiteBulk",
  description: "The bulk of a site form, represented as the boundaries and constraints appropriate to that form.",
  ...siteBulkSchema,
});

export const siteFormContract = schemaFrom({
  $id: "metroplat/site/form",
  title: "SiteForm",
  description: "A package-readable site form: objects, covers, bulk boundaries, constraints, and proof frontier.",
  type: "object",
  required: ["kind", "id", "name", "siteKind", "complexity", "proofStatus", "objects", "morphisms", "covers", "bulk", "frontier"],
  properties: {
    kind: { const: "metroplat.site.form" },
    id: idSchema,
    name: idSchema,
    siteKind: { enum: ["grothendieck-site", "bounded-subsite", "enriched-site", "package-boundary"] },
    complexity: { enum: ["minimal", "bounded", "rich", "complete"] },
    proofStatus: { enum: ["lean-proved", "runtime-finite-receipt", "documented-frontier"] },
    theoremReference: optionalString,
    objects: nonemptyStringArray,
    morphisms: nonemptyStringArray,
    covers: nonemptyStringArray,
    bulk: siteBulkSchema,
    frontier: { type: "array", items: idSchema },
  },
  additionalProperties: false,
});

export const holeRouteContract = schemaFrom({
  $id: "metroplat/settlements/hole",
  title: "HoleSettlement",
  description: "The finite no-readout settlement whose observations compute hole interior, exterior, shroud, and shroud-sourced effects from a causal set and readout region.",
  ...holeRouteSchema,
});

export const holeSurfaceContract = schemaFrom({
  $id: "metroplat/settlements/hole/surface",
  title: "HoleSurface",
  description: "The root surface for posting finite causal/readout observations and accessing induced package projections.",
  type: "object",
  required: ["kind", "settlement", "package", "root", "observation", "projections"],
  properties: {
    kind: { const: "metroplat.settlements.hole.surface" },
    settlement: { $ref: "hole" },
    package: { type: "string", minLength: 1 },
    root: { type: "string", minLength: 1 },
    observation: {
      type: "object",
      required: ["method", "href", "schema", "statementLog"],
      properties: {
        method: { const: "POST" },
        href: { type: "string", minLength: 1 },
        schema: { const: "metroplat/settlements/hole/observation" },
        statementLog: { const: "metroplat/witness/eavt-log" },
      },
      additionalProperties: false,
    },
    projections: { type: "object" },
  },
  additionalProperties: false,
}, [holeRouteContract]);

export const holeObservationContract = schemaFrom({
  $id: "metroplat/settlements/hole/observation",
  title: "HoleObservation",
  description: "A computed finite hole report: no-readout interior, readout exterior, shroud, shroud-sourced effects, and checked causal laws.",
  ...holeObservationSchema,
});

const dataArtifactSchemaContractSchema = {
  type: "object",
  required: ["kind", "tier", "role", "path", "mediaType", "schema"],
  properties: {
    kind: { const: "metroplat.data-artifact-descriptor" },
    tier: { enum: ["log", "state", "record", "content"] },
    role: { enum: ["source", "sufficient-statistic", "rate-distortion-code", "lossy-cut"] },
    path: { type: "string", minLength: 1 },
    mediaType: { type: "string", minLength: 1 },
    schema: { enum: ["metroplat/witness/eavt-log", "metroplat/witness/state-view", "data/records", "content"] },
  },
  additionalProperties: false,
};

const statementWriteReceiptSchema = {
  type: "object",
  required: ["operation", "artifact", "rows", "appended"],
  properties: {
    operation: { const: "write-statement-rows" },
    artifact: dataArtifactSchemaContractSchema,
    rows: { type: "integer", minimum: 0 },
    appended: { type: "integer", minimum: 0 },
  },
  additionalProperties: true,
};

export const holeKeratinousBoundaryContract = schemaFrom({
  $id: "metroplat/settlements/hole/keratinous-boundary",
  title: "HoleKeratinousBoundary",
  description: "The named finite hole boundary binding POST / ingress, computed observation exposure, EAVT statement feed, and durable statement-write artifact as one internal boundary object.",
  type: "object",
  required: ["kind", "settlement", "ingress", "observationSchema", "statementLogSchema", "feed", "observation", "rows", "append", "exposure", "exposureReport"],
  properties: {
    kind: { const: "metroplat.settlements.hole.keratinous-boundary" },
    settlement: holeRouteSchema,
    ingress: {
      type: "object",
      required: ["protocol", "method", "href", "schema", "statementLog"],
      properties: {
        protocol: { const: "http" },
        method: { const: "POST" },
        href: { type: "string", minLength: 1 },
        schema: { const: "metroplat/settlements/hole/observation" },
        statementLog: { const: "metroplat/witness/eavt-log" },
      },
      additionalProperties: false,
    },
    observationSchema: { const: "metroplat/settlements/hole/observation" },
    statementLogSchema: { const: "metroplat/witness/eavt-log" },
    feed: { const: "hole" },
    observation: holeObservationSchema,
    rows: { type: "integer", minimum: 0 },
    append: statementWriteReceiptSchema,
    exposure: { type: "object" },
    exposureReport: { type: "object" },
  },
  additionalProperties: false,
});
