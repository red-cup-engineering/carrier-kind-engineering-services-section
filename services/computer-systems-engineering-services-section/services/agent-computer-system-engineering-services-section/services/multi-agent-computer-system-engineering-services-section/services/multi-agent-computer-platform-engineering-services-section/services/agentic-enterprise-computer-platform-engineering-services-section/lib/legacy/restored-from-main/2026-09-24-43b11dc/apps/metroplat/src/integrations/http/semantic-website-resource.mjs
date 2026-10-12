

import {
  buildSemanticWebsiteStructuredData,

} from "../../sites/static-website/generator/semantic-website.mjs";

import { jsonRepr } from "@red-cup-engineering/computer-web-server/platform-http/representation";

/** Semantic-website content and options exposed by the HTTP app as JSON-LD resources. */

/**
 * Build HTTP Resource handlers for a semantic-website structured-data face.
 *
 * The resources are live: each request rebuilds the schema.org graph from the
 * supplied content and options, then serializes it through `jsonRepr` with the
 * JSON-LD media type.
 */
export function semanticWebsiteStructuredDataResources(source) {
  const match = (path) => structuredDataAtPath(source, path) !== undefined;
  return Object.freeze([Object.freeze({
    match,
    id: "metroplat.semantic-website.structured-data",
    name: "semantic-website structured data",
    methods: Object.freeze(["GET", "HEAD"]),
    produces: Object.freeze(["application/ld+json"]),
    handler: (ctx) => {
      const jsonLd = structuredDataAtPath(source, ctx.url.pathname);
      if (jsonLd === undefined) return undefined;
      return jsonRepr(jsonLd, { type: "application/ld+json; charset=utf-8", pretty: true });
    },
  })]);
}

function structuredDataAtPath(source, path) {
  const route = cleanResourcePath(path);
  const data = buildSemanticWebsiteStructuredData(source.content, source.options);
  const graphPath = cleanResourcePath(source.options.graphPath ?? "index.jsonld");
  if (route === graphPath) return data.graph;
  const article = data.articles.find((candidate) =>
    route === cleanResourcePath(candidate.path) || route === `${candidate.slug}.jsonld`);
  return article?.jsonLd;
}

function cleanResourcePath(path) {
  return decodeURIComponent(path).replace(/^\/+/u, "").replace(/\/+/gu, "/");
}
