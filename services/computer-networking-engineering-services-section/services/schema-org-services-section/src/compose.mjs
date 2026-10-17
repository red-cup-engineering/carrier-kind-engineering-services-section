/**
 * compose -- structured data from settled knowledge. One declared table per target vocabulary names the
 * correspondence from `(predicate, object)` cells (it infers nothing; unnamed predicates are skipped),
 * and only *affirmed* cells are emitted: a denial is the absence of a claim and a contradiction is
 * unsettled, so either as a positive property would misstate the data. The same cells yield identical
 * JSON-LD and meta tags from a settled algebra or from chosen cells, so the markup cannot drift.
 */
import { article, breadcrumbList, graph, ldScript, webSite } from "./jsonld.mjs";
import { socialMetaTags } from "./meta.mjs";

const F = (field, repeatable = false) => ({ field, repeatable });

export const SCHEMA_PREDICATE_MAP = Object.freeze({
  headline: F("headline"), title: F("headline"), name: F("headline"),
  description: F("description"), summary: F("description"), excerpt: F("description"),
  url: F("url"), permalink: F("url"),
  datePublished: F("datePublished"), published: F("datePublished"), date: F("datePublished"),
  dateModified: F("dateModified"), updated: F("dateModified"), modified: F("dateModified"),
  author: F("author"), publisher: F("publisher"),
  image: F("image", true), photo: F("image", true),
  keywords: F("keywords", true), keyword: F("keywords", true), tag: F("keywords", true), tags: F("keywords", true), category: F("keywords", true),
});

export const META_PREDICATE_MAP = Object.freeze({
  title: F("title"), headline: F("title"), name: F("title"),
  description: F("description"), summary: F("description"), excerpt: F("description"),
  url: F("url"), permalink: F("url"),
  image: F("image", true), photo: F("image", true),
  published: F("publishedTime"), datePublished: F("publishedTime"), date: F("publishedTime"),
  modified: F("modifiedTime"), dateModified: F("modifiedTime"), updated: F("modifiedTime"),
  author: F("author", true),
  tag: F("tags", true), tags: F("tags", true), category: F("tags", true), keyword: F("tags", true), keywords: F("tags", true),
  siteName: F("siteName"), site: F("site"), creator: F("creator"),
});

/** Fold `[{ predicate, object }]` into properties by a table; repeatable fields accumulate, the rest take the last value. */
export function foldProps(pairs, map) {
  const props = {};
  for (const { predicate, object } of pairs) {
    const rule = Object.hasOwn(map, predicate) ? map[predicate] : undefined;
    if (rule === undefined || object === null || object === undefined || object === "") continue;
    if (rule.repeatable) (props[rule.field] ??= []).push(object);
    else props[rule.field] = object;
  }
  return props;
}

export const foldSchemaProps = (pairs) => foldProps(pairs, SCHEMA_PREDICATE_MAP);
export const foldMetaProps = (pairs) => foldProps(pairs, META_PREDICATE_MAP);

const fromAffirmed = (algebra) => (algebra?.affirmed ?? []).map((c) => ({ predicate: c.predicate, object: c.object }));
const fromSelected = (cells) => (cells ?? []).map((s) => ({ predicate: s.cell.predicate, object: s.cell.object }));

export const articleFromFiniteAlgebra = (algebra, overrides = {}) => article({ ...foldSchemaProps(fromAffirmed(algebra)), ...overrides });
export const articleFromSelectedCells = (cells, overrides = {}) => article({ ...foldSchemaProps(fromSelected(cells)), ...overrides });
export const socialTagsFromFiniteAlgebra = (algebra, overrides = {}) => socialMetaTags({ type: "article", ...foldMetaProps(fromAffirmed(algebra)), ...overrides });
export const socialTagsFromSelectedCells = (cells, overrides = {}) => socialMetaTags({ type: "article", ...foldMetaProps(fromSelected(cells)), ...overrides });

/** Everything a page head needs from a settled algebra: `{ jsonLd, jsonLdScript, metaTags }`. */
export function headFromFiniteAlgebra(algebra, options = {}) {
  const jsonLd = graph(
    articleFromFiniteAlgebra(algebra, options.article ?? {}),
    options.site ? webSite(options.site) : undefined,
    options.breadcrumbs?.length ? breadcrumbList(options.breadcrumbs) : undefined,
  );
  return { jsonLd, jsonLdScript: ldScript(jsonLd, options.indent ?? 0), metaTags: socialTagsFromFiniteAlgebra(algebra, options.meta ?? {}) };
}
