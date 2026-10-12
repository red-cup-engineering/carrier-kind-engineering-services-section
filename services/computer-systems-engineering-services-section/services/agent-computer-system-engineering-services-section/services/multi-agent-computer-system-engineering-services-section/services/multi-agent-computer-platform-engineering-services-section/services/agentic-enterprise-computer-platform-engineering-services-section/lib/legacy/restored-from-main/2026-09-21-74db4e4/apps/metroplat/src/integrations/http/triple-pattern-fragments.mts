
/**
 * projections/triple-pattern-fragments — paginated Linked Data Fragments over
 * admitted Triples.
 *
 * A triple pattern (`s`/`p`/`o`, any subset bound) filters an admitted Triple
 * collection; the match is paginated into one {@link FragmentPage}, projected
 * to plain JSON, a Hydra `PagedCollection` JSON-LD document, or a Turtle
 * document — reusing `codecs/text/turtle` and `codecs/text/json/json-ld`
 * (slice a's IRI law and document writers) rather than re-deriving RDF
 * serialization here.
 *
 * The quarry's per-triple potential/active/stable charge dimension is not
 * carried: metroplat's admitted {@link Triple} (EAVT-projected) has no
 * charge attached per row, so a pattern here matches on `s`/`p`/`o` alone.
 *
 * Pagination itself is not re-derived here: `queryTripleFragment` is a thin
 * pattern filter over `projections/pagination`'s `paginateOffset`, the one
 * seat every numbered-page collection in this package shares.
 */
import { assertTriple, type Triple } from "../../lib/codecs/json/jsonl/eavt/triple/index.mts";
import { iriRef, writeTurtle } from "../../lib/codecs/turtle/index.mts";
import { tripleGraphToJsonLd } from "../../sites/codec/json-ld.mts";
import { paginateOffset, type PageLinks } from "./pagination.mts";

export interface TriplePattern {
  readonly s?: string;
  readonly p?: string;
  readonly o?: string;
}

export interface FragmentPageOptions {
  readonly base?: string;
  readonly path?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly maxLimit?: number;
}

export interface FragmentPageLinks extends PageLinks {
  readonly last: string;
}

export interface FragmentPage {
  readonly query: Readonly<{ page: number; limit: number; maxLimit: number } & TriplePattern>;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly page: number;
  readonly limit: number;
  readonly triples: readonly Triple[];
  readonly links: FragmentPageLinks;
}

const DEFAULT_MAX_LIMIT = 1000;

/** Whether an admitted Triple matches a (possibly partial) subject/predicate/object pattern. */
export function tripleMatches(triple: Triple, pattern: TriplePattern = {}): boolean {
  if (pattern.s !== undefined && String(triple.s) !== pattern.s) return false;
  if (pattern.p !== undefined && String(triple.p) !== pattern.p) return false;
  if (pattern.o !== undefined && String(triple.o) !== pattern.o) return false;
  return true;
}

/** Filter admitted Triples by pattern, then paginate the match into one Fragment page. */
export function queryTripleFragment(triples: readonly Triple[], pattern: TriplePattern = {}, opts: FragmentPageOptions = {}): FragmentPage {
  const admitted = triples.map((value) => assertTriple(value));
  const maxLimit = opts.maxLimit ?? DEFAULT_MAX_LIMIT;
  const matched = admitted.filter((triple) => tripleMatches(triple, pattern));
  const extraParams = Object.fromEntries(Object.entries(pattern).filter(([, value]) => value !== undefined)) as Record<string, string>;
  const offsetOpts: Parameters<typeof paginateOffset>[1] = {
    base: opts.base ?? "http://localhost/",
    path: opts.path ?? "/query",
    maxLimit,
    extraParams,
    limit: opts.limit ?? 200, // TPF's own established default, distinct from pagination's general default
    ...(opts.page === undefined ? {} : { page: opts.page }),
  };
  const page = paginateOffset(matched, offsetOpts);
  return Object.freeze({
    query: Object.freeze({ page: page.page, limit: page.limit, maxLimit, ...pattern }),
    totalItems: page.totalItems,
    totalPages: page.totalPages,
    page: page.page,
    limit: page.limit,
    triples: page.items,
    links: page.links as FragmentPageLinks,
  });
}

/** Project a Fragment page to a plain JSON body. */
export function fragmentJson(page: FragmentPage): Record<string, unknown> {
  return {
    query: page.query,
    totalItems: page.totalItems,
    totalPages: page.totalPages,
    page: page.page,
    limit: page.limit,
    links: page.links,
    triples: page.triples,
  };
}

/**
 * Project a Fragment page to a Hydra `PagedCollection` JSON-LD document,
 * reusing the JSON-LD codec's subject grouping for `hydra:member`.
 */
export function fragmentJsonLd(page: FragmentPage, opts: { base?: string } = {}): Record<string, unknown> {
  const base = opts.base ?? "http://localhost/";
  const graph = tripleGraphToJsonLd(page.triples, { base });
  return {
    "@context": {
      hydra: "http://www.w3.org/ns/hydra/core#",
      void: "http://rdfs.org/ns/void#",
      ...graph["@context"],
    },
    "@id": page.links.self,
    "@type": ["hydra:Collection", "hydra:PagedCollection"],
    "hydra:totalItems": page.totalItems,
    "void:triples": page.totalItems,
    "hydra:itemsPerPage": page.limit,
    "hydra:first": { "@id": page.links.first },
    "hydra:last": { "@id": page.links.last },
    ...(page.links.previous === undefined ? {} : { "hydra:previous": { "@id": page.links.previous } }),
    ...(page.links.next === undefined ? {} : { "hydra:next": { "@id": page.links.next } }),
    "hydra:member": graph["@graph"],
  };
}

/** Project a Fragment page to a Turtle document, reusing the Turtle codec's document writer. */
export function fragmentTurtle(page: FragmentPage, opts: { base?: string } = {}): string {
  const base = opts.base ?? "http://localhost/";
  const header = [
    `@prefix hydra: <http://www.w3.org/ns/hydra/core#> .`,
    `@prefix void: <http://rdfs.org/ns/void#> .`,
    `${iriRef(page.links.self)} a hydra:Collection, hydra:PagedCollection ;`,
    `  hydra:totalItems ${page.totalItems} ;`,
    `  hydra:itemsPerPage ${page.limit} ;`,
    `  void:triples ${page.totalItems} .`,
    "",
  ].join("\n");
  return `${header}\n${writeTurtle(page.triples, { base })}`;
}
