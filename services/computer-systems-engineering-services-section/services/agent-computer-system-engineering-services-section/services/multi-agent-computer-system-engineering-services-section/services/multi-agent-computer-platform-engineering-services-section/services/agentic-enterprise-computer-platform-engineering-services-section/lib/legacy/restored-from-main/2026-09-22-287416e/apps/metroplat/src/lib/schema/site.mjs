/**
 * schema/site — explicit schema incidence (nodes, edges, slot refs, and
 * reference resolution) for the contract kernel.
 *
 * This module owns no second schema-site runtime: it is the local import
 * path every metroplat consumer of schema incidence uses, retaining the
 * canonical `@lenticule-science/metrologic/settling/schema/site` implementation as the
 * sole source of this semantics.
 */
export {
  schemaSiteLeg,
  schemaReferenceIncidence,
  schemaSlotRef,
  schemaNodeId,
  schemaNodePath,
  schemaNodeParent,
  schemaSiteNodes,
  schemaSiteIncidence,
  siteExtrema,
  siteEdges,
  siteBulkBoundary,
  siteBulk,
  siteForm,
  siteFormBoundaryKinds,
  siteBulkHasBoundary,
  siteBulkBoundarySchema,

} from "@lenticule-science/metrologic/settling/schema/site";
