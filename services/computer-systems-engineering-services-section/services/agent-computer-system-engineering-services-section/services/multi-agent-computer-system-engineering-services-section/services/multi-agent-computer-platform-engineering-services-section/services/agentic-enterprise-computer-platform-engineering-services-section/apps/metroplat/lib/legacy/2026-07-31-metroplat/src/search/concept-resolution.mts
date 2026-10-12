/**
 * term-intension/concept-resolution — witness "this term already exists at
 * these schema addresses" facts, so later readouts can start from settled
 * anchors before recomputing a fresh sweep.
 */
import { requireJsonValue, type JsonValue } from "../lib/codecs/json/core.mts";
import { toEavt, type EAVT } from "../lib/codecs/json/jsonl/eavt/index.mts";
import type { StatementCoordinate, StatementValue } from "../lib/records/persistence.mts";

export interface ConceptResolutionFeed {
  readonly kind: "feed";
  readonly name: string;
  cellize(value: ConceptResolution, at: StatementCoordinate): readonly EAVT[];
}

/** One resolved "term already exists at these schema addresses, sharing this attribute" fact. */
export interface ConceptResolution {
  readonly term: string;
  readonly canonicalFiles: readonly string[];
  readonly sharedAttribute: string;
  readonly resolvedBy: string;
}

function resolutionEntity(resolution: ConceptResolution): JsonValue {
  return Object.freeze({ kind: "metroplat.concept-resolution.term", term: resolution.term });
}

function resolutionValue(resolution: ConceptResolution, at: StatementCoordinate): StatementValue {
  return requireJsonValue(Object.freeze({
    term: resolution.term,
    canonicalFiles: Object.freeze([...resolution.canonicalFiles]),
    sharedAttribute: resolution.sharedAttribute,
    resolvedBy: resolution.resolvedBy,
    at,
  }), "concept resolution") as StatementValue;
}

/** The concept-resolution feed: one resolved term becomes one source EAVT row. */
export const conceptResolutionFeed: ConceptResolutionFeed = Object.freeze({
  kind: "feed",
  name: "concept-resolve",
  functional: Object.freeze(["resolved-as"]),
  cellize: (resolution: ConceptResolution, at: StatementCoordinate): readonly EAVT[] => Object.freeze([
    toEavt({
      e: resolutionEntity(resolution),
      a: "resolved-as",
      v: resolutionValue(resolution, at),
      t: requireJsonValue(at, "concept resolution time"),
    }),
  ]),
});

/** Cellize one resolution through the package-owned feed. */
export function conceptResolutionRows(resolution: ConceptResolution, at: StatementCoordinate): readonly EAVT[] {
  return conceptResolutionFeed.cellize(resolution, at);
}

/** Read a resolution row's term back out of a plain EAVT row's entity. */
export function conceptResolutionTerm(row: EAVT): string | undefined {
  const [e] = row;
  if (e !== null && typeof e === "object" && !Array.isArray(e) && "term" in e) {
    const term = (e as { term: unknown }).term;
    return typeof term === "string" ? term : undefined;
  }
  return undefined;
}

export function conceptResolutionOfRow(row: EAVT): ConceptResolution | undefined {
  const [, attribute, value] = row;
  if (attribute !== "resolved-as" || value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const term = typeof record.term === "string" ? record.term : undefined;
  const sharedAttribute = typeof record.sharedAttribute === "string" ? record.sharedAttribute : undefined;
  const resolvedBy = typeof record.resolvedBy === "string" ? record.resolvedBy : undefined;
  const canonicalFiles = Array.isArray(record.canonicalFiles)
    ? record.canonicalFiles.filter((entry): entry is string => typeof entry === "string")
    : undefined;
  if (term === undefined || sharedAttribute === undefined || resolvedBy === undefined || canonicalFiles === undefined) return undefined;
  return Object.freeze({ term, canonicalFiles: Object.freeze(canonicalFiles), sharedAttribute, resolvedBy });
}
