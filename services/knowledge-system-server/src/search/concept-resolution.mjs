/**
 * term-intension/concept-resolution — witness "this term already exists at
 * these schema addresses" facts, so later readouts can start from settled
 * anchors before recomputing a fresh sweep.
 */
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { toEavt } from "@red-cup-engineering/eavt/row";

/** One resolved "term already exists at these schema addresses, sharing this attribute" fact. */

function resolutionEntity(resolution) {
  return Object.freeze({ kind: "metroplat.concept-resolution.term", term: resolution.term });
}

function resolutionValue(resolution, at) {
  return requireJsonValue(Object.freeze({
    term: resolution.term,
    canonicalFiles: Object.freeze([...resolution.canonicalFiles]),
    sharedAttribute: resolution.sharedAttribute,
    resolvedBy: resolution.resolvedBy,
    at,
  }), "concept resolution");
}

/** The concept-resolution feed: one resolved term becomes one source EAVT row. */
export const conceptResolutionFeed = Object.freeze({
  kind: "feed",
  name: "concept-resolve",
  functional: Object.freeze(["resolved-as"]),
  cellize: (resolution, at) => Object.freeze([
    toEavt({
      e: resolutionEntity(resolution),
      a: "resolved-as",
      v: resolutionValue(resolution, at),
      t: requireJsonValue(at, "concept resolution time"),
    }),
  ]),
});

/** Cellize one resolution through the package-owned feed. */
export function conceptResolutionRows(resolution, at) {
  return conceptResolutionFeed.cellize(resolution, at);
}

/** Read a resolution row's term back out of a plain EAVT row's entity. */
export function conceptResolutionTerm(row) {
  const [e] = row;
  if (e !== null && typeof e === "object" && !Array.isArray(e) && "term" in e) {
    const term = (e).term;
    return typeof term === "string" ? term : undefined;
  }
  return undefined;
}

export function conceptResolutionOfRow(row) {
  const [, attribute, value] = row;
  if (attribute !== "resolved-as" || value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value;
  const term = typeof record.term === "string" ? record.term : undefined;
  const sharedAttribute = typeof record.sharedAttribute === "string" ? record.sharedAttribute : undefined;
  const resolvedBy = typeof record.resolvedBy === "string" ? record.resolvedBy : undefined;
  const canonicalFiles = Array.isArray(record.canonicalFiles)
    ? record.canonicalFiles.filter((entry) => typeof entry === "string")
    : undefined;
  if (term === undefined || sharedAttribute === undefined || resolvedBy === undefined || canonicalFiles === undefined) return undefined;
  return Object.freeze({ term, canonicalFiles: Object.freeze(canonicalFiles), sharedAttribute, resolvedBy });
}
