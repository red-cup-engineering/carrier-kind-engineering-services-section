/**
 * search — ranked lookup over JSNodePackages.
 *
 * A term is sought in name, then tags, then description: the first field that
 * carries it fixes the match's rank, so a name hit always outranks a tag hit
 * outranks a description hit. This is a free-text read, not a meme-floor
 * operation — description is prose, not a term — so it lives beside the
 * carriers it ranks rather than in the utterance settling.
 */
import type { JSNodePackage } from "./jsnode-topology.mjs";

export type MatchField = "name" | "tag" | "description";

/** The preference order: lower rank is a stronger match. */
export const MATCH_RANK: Readonly<Record<MatchField, number>> = Object.freeze({
  name: 0,
  tag: 1,
  description: 2,
});

export interface PackageMatch {
  readonly package: JSNodePackage;
  /** The strongest field that carried the term. */
  readonly field: MatchField;
  readonly rank: number;
  /** For a tag hit, the specific tag that matched; otherwise absent. */
  readonly tag?: string;
}

function bestMatch(pkg: JSNodePackage, needle: string): PackageMatch | undefined {
  if (pkg.name.toLowerCase().includes(needle)) {
    return Object.freeze({ package: pkg, field: "name" as const, rank: MATCH_RANK.name });
  }
  const tag = pkg.tags.find((t) => t.toLowerCase().includes(needle));
  if (tag !== undefined) {
    return Object.freeze({ package: pkg, field: "tag" as const, rank: MATCH_RANK.tag, tag });
  }
  if (pkg.description.toLowerCase().includes(needle)) {
    return Object.freeze({ package: pkg, field: "description" as const, rank: MATCH_RANK.description });
  }
  return undefined;
}

/**
 * Rank packages carrying `term` (case-insensitive substring) by where the term
 * lands: name, then tag, then description. Ties within a rank break on name.
 * An empty or whitespace term matches nothing — use the workspace listing for
 * the full set rather than overloading search with "everything".
 */
export function searchPackages(
  packages: readonly JSNodePackage[],
  term: string,
): readonly PackageMatch[] {
  const needle = term.trim().toLowerCase();
  if (needle.length === 0) return Object.freeze([]);
  const matches: PackageMatch[] = [];
  for (const pkg of packages) {
    const match = bestMatch(pkg, needle);
    if (match !== undefined) matches.push(match);
  }
  matches.sort((a, b) => a.rank - b.rank || a.package.name.localeCompare(b.package.name));
  return Object.freeze(matches);
}
