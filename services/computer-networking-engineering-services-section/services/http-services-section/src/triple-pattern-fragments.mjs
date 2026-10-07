/**
 * triple-pattern-fragments — Linked Data Fragments' triple pattern interface
 * over admitted Triples: a pattern (`s`/`p`/`o`, any subset bound) filters the
 * collection, the match is paginated into one fragment page, and the page is
 * written as plain JSON, a Hydra `PagedCollection` JSON-LD document or Turtle.
 * `triplePatternFragmentsResource` mounts it as one HTTP resource,
 * content-negotiated between the three.
 */
import { iriRef, writeTurtle } from "@red-cup-engineering/turtle-services-section/turtle";
import { tripleGraphToJsonLd } from "@red-cup-engineering/rdf-data-model-services-section/json-ld";
import { assertTriple } from "@red-cup-engineering/eavt/triple";
import { negotiateType } from "./negotiation.mjs";
import { paginateOffset } from "./pagination.mjs";
import { jsonRepr, textRepr } from "./representation/form-http-response-representation.mjs";
const DEFAULT_MAX_LIMIT = 1000;

/** Whether an admitted Triple matches a (possibly partial) subject/predicate/object pattern. */
export function tripleMatches(triple, pattern = {}) {
  if (pattern.s !== undefined && String(triple.s) !== pattern.s) return false;
  if (pattern.p !== undefined && String(triple.p) !== pattern.p) return false;
  if (pattern.o !== undefined && String(triple.o) !== pattern.o) return false;
  return true;
}

/** Filter admitted Triples by pattern, then paginate the match into one Fragment page. */
export function queryTripleFragment(triples, pattern = {}, opts = {}) {
  const admitted = triples.map((value) => assertTriple(value));
  const maxLimit = opts.maxLimit ?? DEFAULT_MAX_LIMIT;
  const matched = admitted.filter((triple) => tripleMatches(triple, pattern));
  const extraParams = Object.fromEntries(Object.entries(pattern).filter(([, value]) => value !== undefined));
  const offsetOpts = {
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
    links: page.links,
  });
}

/** Project a Fragment page to a plain JSON body. */
export function fragmentJson(page) {
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
export function fragmentJsonLd(page, opts = {}) {
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
export function fragmentTurtle(page, opts = {}) {
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

const JSON_TYPE = "application/json; charset=utf-8";
const JSONLD_TYPE = "application/ld+json; charset=utf-8";
const TURTLE_TYPE = "text/turtle; charset=utf-8";

function acceptHeader(ctx) {
  const accept = (ctx.req)?.headers?.["accept"];
  return Array.isArray(accept) ? accept[0] : accept;
}

function patternFrom(url) {
  const s = url.searchParams.get("s");
  const p = url.searchParams.get("p");
  const o = url.searchParams.get("o");
  return Object.freeze({
    ...(s ? { s } : {}),
    ...(p ? { p } : {}),
    ...(o ? { o } : {}),
  });
}

function intParam(url, name) {
  const value = url.searchParams.get(name);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

async function triplesFrom(source) {
  return typeof source.triples === "function" ? await source.triples() : source.triples;
}

/**
 * Build the HTTP Resource serving Triple Pattern Fragments over admitted
 * Triples, content-negotiated between JSON, JSON-LD, and Turtle — a thin
 * mount over the `triple-pattern-fragments` projection, with no fragment or
 * RDF-serialization law of its own.
 */
export function triplePatternFragmentsResource(source) {
  const path = source.path ?? "/query";
  const base = source.base ?? "http://localhost/";
  return Object.freeze({
    match: path,
    route: path,
    id: "triple-pattern-fragments.query",
    name: "Triple Pattern Fragments Query",
    methods: Object.freeze(["GET", "HEAD"]),
    produces: Object.freeze([JSONLD_TYPE, TURTLE_TYPE, JSON_TYPE]),
    handler: async (ctx) => {
      const pattern = patternFrom(ctx.url);
      const triples = await triplesFrom(source);
      const page = intParam(ctx.url, "page");
      const limit = intParam(ctx.url, "limit") ?? source.limit;
      const opts = {
        base,
        path,
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(source.maxLimit !== undefined ? { maxLimit: source.maxLimit } : {}),
      };
      const fragmentPage = queryTripleFragment(triples, pattern, opts);
      const negotiated = ctx.negotiatedType ?? negotiateType(acceptHeader(ctx), [JSONLD_TYPE, TURTLE_TYPE, JSON_TYPE]) ?? JSON_TYPE;
      if (negotiated === TURTLE_TYPE) return textRepr(fragmentTurtle(fragmentPage, { base }), { type: TURTLE_TYPE });
      if (negotiated === JSONLD_TYPE) return jsonRepr(fragmentJsonLd(fragmentPage, { base }), { type: JSONLD_TYPE, pretty: true });
      return jsonRepr(fragmentJson(fragmentPage), { type: JSON_TYPE, pretty: true });
    },
  });
}
