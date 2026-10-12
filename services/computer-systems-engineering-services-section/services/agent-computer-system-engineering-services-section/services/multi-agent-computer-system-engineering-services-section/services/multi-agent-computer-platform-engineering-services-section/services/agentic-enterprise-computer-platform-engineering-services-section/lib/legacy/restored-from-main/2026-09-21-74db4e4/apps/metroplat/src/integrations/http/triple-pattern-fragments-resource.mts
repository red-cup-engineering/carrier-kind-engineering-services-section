
import type { IncomingMessage } from "node:http";
import { negotiateType } from "./codec/index.mts";
import type { Triple } from "../../lib/codecs/json/jsonl/eavt/triple/index.mts";
import {
  fragmentJson,
  fragmentJsonLd,
  fragmentTurtle,
  queryTripleFragment,
  type FragmentPageOptions,
  type TriplePattern,
} from "./triple-pattern-fragments.mts";
import type { Context, Resource } from "./app-surface.mts";
import { jsonRepr, textRepr } from "./representation.mts";

/** Live source of admitted Triples the Fragments resource queries per request. */
export interface TriplePatternFragmentsResourceSource {
  readonly triples: readonly Triple[] | (() => readonly Triple[] | Promise<readonly Triple[]>);
  readonly base?: string;
  readonly path?: string;
  readonly limit?: number;
  readonly maxLimit?: number;
}

const JSON_TYPE = "application/json; charset=utf-8";
const JSONLD_TYPE = "application/ld+json; charset=utf-8";
const TURTLE_TYPE = "text/turtle; charset=utf-8";

function acceptHeader(ctx: Context): string | undefined {
  const accept = (ctx.req as Partial<IncomingMessage> | undefined)?.headers?.["accept"];
  return Array.isArray(accept) ? accept[0] : accept;
}

function patternFrom(url: URL): TriplePattern {
  const s = url.searchParams.get("s");
  const p = url.searchParams.get("p");
  const o = url.searchParams.get("o");
  return Object.freeze({
    ...(s ? { s } : {}),
    ...(p ? { p } : {}),
    ...(o ? { o } : {}),
  });
}

function intParam(url: URL, name: string): number | undefined {
  const value = url.searchParams.get(name);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

async function triplesFrom(source: TriplePatternFragmentsResourceSource): Promise<readonly Triple[]> {
  return typeof source.triples === "function" ? await source.triples() : source.triples;
}

/**
 * Build the HTTP Resource serving Triple Pattern Fragments over admitted
 * Triples, content-negotiated between JSON, JSON-LD, and Turtle — a thin
 * mount over the `triple-pattern-fragments` projection, with no fragment or
 * RDF-serialization law of its own.
 */
export function triplePatternFragmentsResource(source: TriplePatternFragmentsResourceSource): Resource {
  const path = source.path ?? "/query";
  const base = source.base ?? "http://localhost/";
  return Object.freeze({
    match: path,
    route: path,
    id: "metroplat.triple-pattern-fragments.query",
    name: "Triple Pattern Fragments Query",
    methods: Object.freeze(["GET", "HEAD"]),
    produces: Object.freeze([JSONLD_TYPE, TURTLE_TYPE, JSON_TYPE]),
    handler: async (ctx: Context) => {
      const pattern = patternFrom(ctx.url);
      const triples = await triplesFrom(source);
      const page = intParam(ctx.url, "page");
      const limit = intParam(ctx.url, "limit") ?? source.limit;
      const opts: FragmentPageOptions = {
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
