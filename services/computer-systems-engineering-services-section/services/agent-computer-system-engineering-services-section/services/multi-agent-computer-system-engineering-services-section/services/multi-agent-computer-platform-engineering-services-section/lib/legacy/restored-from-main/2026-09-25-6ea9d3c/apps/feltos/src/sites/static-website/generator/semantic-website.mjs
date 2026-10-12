/**
 * integrations/web/core/static-website/generator/semantic-website - static website with schema.org faces.
 *
 * This genre is a recipe over existing static-website and schema.org primitives:
 * it renders the normal file tree, injects JSON-LD into page heads, and emits
 * a website-level entity @graph without owning a separate HTML pipeline.
 */

import {
  ARTICLE_TYPE,
  BLOG_POSTING_TYPE,

  articleToArticleJsonLd,
  breadcrumbJsonLd,
  entityGraphJsonLd,
  pageToWebPageJsonLd,
  renderJsonLdScript,
  termToCollectionPageJsonLd,
  termToThingJsonLd,
  websiteContextToOrganizationJsonLd,
  websiteContextToWebSiteJsonLd,
} from "@red-cup-engineering/static-site-publisher/sites/codec/schema-org";
import { slug as slugTerm } from "@red-cup-engineering/html-structural-projection-service";
import {
  buildStaticWebsite,
  injectHeadLinks,

} from "./index.mjs";
import { articlesToTermIndexPages } from "@red-cup-engineering/static-site-publisher/sites/static-website/generator/taxonomy";
import { coverNerve } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/coordination-cohomology";
import { cohomologyOfEdgeGraph } from "@red-cup-engineering/computer-networking-engineering-services-section/signgraph/cohomology";
import * as matterTopology from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/matter-topology";

/** Build a schema.org-enriched static website with per-page JSON-LD and an entity @graph. */
export function buildSemanticWebsite(content, opts) {
  const basePath = opts.basePath ?? new URL(opts.websiteUrl).pathname;
  const projection = semanticWebsiteProjection(content, opts, basePath);
  const files = new Map(buildStaticWebsite({
    articles: projection.articles,
    pages: projection.pages,
    assets: Object.freeze([...(content.assets ?? []), ...projection.assets]),
  }, {
    ...opts,
    basePath,
    includeDrafts: opts.includeDrafts ?? false,
    head: mergeHeadOptions(opts.head, projection.headByPath),
  }));

  const graphPath = outputPath(opts.graphPath ?? "index.jsonld");
  if (files.has(graphPath)) throw new TypeError(`buildSemanticWebsite: duplicate graph output path ${graphPath}`);
  files.set(graphPath, `${JSON.stringify(projection.structuredData.graph, null, 2)}\n`);
  return files;
}

/** Build the live JSON-LD faces served by the semantic-website projection. */
export function buildSemanticWebsiteStructuredData(content, opts) {
  const basePath = opts.basePath ?? new URL(opts.websiteUrl).pathname;
  return semanticWebsiteProjection(content, opts, basePath).structuredData;
}

function semanticWebsiteProjection(content, opts, basePath) {
  const includeDrafts = opts.includeDrafts ?? false;
  const articles = admittedArticles(content.articles, includeDrafts);
  const pages = admittedPages(content.pages ?? [], includeDrafts);
  const websiteRoot = absoluteRoot(opts.websiteUrl, basePath);
  const website = websiteContextToWebSiteJsonLd({
    websiteUrl: websiteRoot,
    title: opts.title,
    ...(opts.description === undefined ? {} : { description: opts.description }),
    ...(opts.language === undefined ? {} : { language: opts.language }),
    ...(opts.author === undefined ? {} : { author: opts.author }),
    ...(opts.websiteName === undefined ? {} : { websiteName: opts.websiteName }),
  });
  const organization = websiteContextToOrganizationJsonLd({
    websiteUrl: websiteRoot,
    title: opts.title,
    ...(opts.author === undefined ? {} : { author: opts.author }),
    ...(opts.websiteName === undefined ? {} : { websiteName: opts.websiteName }),
  });
  const postsPath = opts.postsPath ?? "posts";
  const taxonomy = taxonomyProjection(articles, basePath, opts.websiteUrl, website["@id"], postsPath);
  const termRefs = termRefsByArticle(articles, taxonomy.terms);
  const headByPath = new Map();
  const graphNodes = [jsonLdNode(website), jsonLdNode(organization)];
  const articleRoutes = [];
  const authorNodes = new Map();

  for (const term of taxonomy.terms) {
    graphNodes.push(term.thing, term.collection);
  }

  for (const article of articles) {
    const output = articleOutputPath(article, postsPath);
    const absoluteUrl = absoluteHref(opts.websiteUrl, basePath, output);
    const authorId = personId(websiteRoot, article.author);
    authorNodes.set(authorId, Object.freeze({
      "@id": authorId,
      "@type": "Person",
      name: article.author,
    }));
    const node = articleToArticleJsonLd(articleForSchema(article, absoluteUrl), {
      type: opts.articleType ?? ARTICLE_TYPE,
      id: `${absoluteUrl}#article`,
      url: absoluteUrl,
      authorId,
      termRefs: termRefs.get(article.slug) ?? [],
    });
    graphNodes.push(jsonLdNode(node));
    articleRoutes.push(Object.freeze({
      slug: article.slug,
      path: articleJsonLdOutputPath(output),
      jsonLd: jsonLdNode(node),
    }));
    headByPath.set(output, scripts([
      jsonLdNode(node),
      jsonLdNode(breadcrumbJsonLd(output, { websiteUrl: websiteRoot, rootName: opts.title, id: `${absoluteUrl}#breadcrumb` })),
    ]));
  }

  for (const page of pages) {
    const output = pageOutputPath(page);
    const absoluteUrl = absoluteHref(opts.websiteUrl, basePath, output);
    const authorName = page.author ?? opts.author;
    const authorId = authorName === undefined ? undefined : personId(websiteRoot, authorName);
    if (authorId !== undefined && authorName !== undefined) {
      authorNodes.set(authorId, Object.freeze({
        "@id": authorId,
        "@type": "Person",
        name: authorName,
      }));
    }
    const node = pageToWebPageJsonLd(pageForSchema(page, absoluteUrl), {
      id: `${absoluteUrl}#webpage`,
      url: absoluteUrl,
      ...(authorName === undefined ? {} : { authorName }),
      ...(authorId === undefined ? {} : { authorId }),
    });
    graphNodes.push(jsonLdNode(node));
    headByPath.set(output, scripts([
      jsonLdNode(node),
      jsonLdNode(breadcrumbJsonLd(output, { websiteUrl: websiteRoot, rootName: opts.title, id: `${absoluteUrl}#breadcrumb` })),
    ]));
  }

  for (const author of authorNodes.values()) graphNodes.push(author);

  const graph = entityGraphJsonLd(graphNodes);
  const homeScripts = opts.embedGraphOnHome === true
    ? [jsonLdNode(website), jsonLdNode(graph)]
    : [jsonLdNode(website)];
  headByPath.set("index.html", scripts(homeScripts));

  return Object.freeze({
    articles,
    pages,
    assets: taxonomy.assets,
    headByPath,
    structuredData: Object.freeze({
      kind: "metroplat.semantic-website.structured-data",
      graph: jsonLdNode(graph),
      articles: Object.freeze(articleRoutes),
    }),
  });
}

/**
 * Read a semantic-website entity `@graph` as the finite cover nerve bounded by
 * internal `@id` cross-references.
 *
 * Vertices are distinct `@graph` node `@id` values. References are treated as undirected
 * and deduplicated, dangling `@id` values are dropped from both vertex and edge counts,
 * and self-references are not counted as edges. The nerve is read off a real
 * `cohomologyOfEdgeGraph` cohomology object (SignGraph) —
 * union-find and component counting are that primitive's own job, not
 * reimplemented here.
 */
export function entityGraphNerve(graph) {
  const nodes = graphNodesById(graph);
  const edges = new Set();
  const edgePairs = [];
  for (const [source, node] of nodes) {
    for (const target of referencedIds(node)) {
      if (!nodes.has(target) || source === target) continue;
      const [left, right] = source < target ? [source, target] : [target, source];
      const edge = `${left}\u0000${right}`;
      if (edges.has(edge)) continue;
      edges.add(edge);
      edgePairs.push([left, right]);
    }
  }
  const linkGraph = cohomologyOfEdgeGraph([...nodes.keys()], edgePairs);
  return coverNerve(linkGraph.entities.length, linkGraph.cells.length, linkGraph.zeroCohomology.rank);
}

/** Return the matter-topology receipt carried by a semantic-website entity `@graph` nerve. */
export function entityGraphMatter(graph) {
  return matterTopology.matterTopologyReceipt(entityGraphNerve(graph));
}

function admittedArticles(articles, includeDrafts) {
  return Object.freeze(articles
    .filter((article) => includeDrafts || !article.draft)
    .map((article) => Object.freeze({ ...article })));
}

function admittedPages(pages, includeDrafts) {
  return Object.freeze(pages
    .filter((page) => includeDrafts || !(page.draft ?? false))
    .map((page) => Object.freeze({ ...page })));
}

function taxonomyProjection(
  articles,
  basePath,
  websiteUrl,
  websiteId,
  postsPath,
) {
  const termNodes = Object.freeze([
    ...termsForDimension(articles, "tags", basePath, websiteUrl, websiteId, postsPath),
    ...termsForDimension(articles, "categories", basePath, websiteUrl, websiteId, postsPath),
  ]);
  const scriptsByPath = new Map(termNodes.map((term) => [term.path, scripts([
    term.collection,
    jsonLdNode(breadcrumbJsonLd(term.path, { websiteUrl: absoluteRoot(websiteUrl, basePath), id: `${term.absoluteUrl}#breadcrumb` })),
  ])]));
  const assets = Object.freeze([
    ...articlesToTermIndexPages(articles, { dimension: "tags", basePath, pathPrefix: "tags", includeRoot: true }),
    ...articlesToTermIndexPages(articles, { dimension: "categories", basePath, pathPrefix: "categories", includeRoot: true }),
  ].map((asset) => {
    const head = scriptsByPath.get(asset.path);
    if (head === undefined) return asset;
    return Object.freeze({
      ...asset,
      contents: injectHeadLinks(asset.contents, head),
    });
  }));
  return Object.freeze({ assets, terms: termNodes });
}

function termsForDimension(
  articles,
  dimension,
  basePath,
  websiteUrl,
  websiteId,
  postsPath,
) {
  return Object.freeze([...termsByName(articles, dimension)]
    .map(([term, termArticles]) => {
      const termSlug = slugTerm(term);
      const path = indexOutputPath(dimension, termSlug);
      const href = websiteHref(basePath, path);
      const absoluteUrl = absoluteHref(websiteUrl, basePath, path);
      const itemUrls = Object.freeze(termArticles.map((article) => absoluteHref(websiteUrl, basePath, articleOutputPath(article, postsPath))));
      const collection = termToCollectionPageJsonLd({
        term,
        url: absoluteUrl,
        dimension,
        websiteId,
        itemUrls,
      });
      const thing = termToThingJsonLd({
        term,
        url: absoluteUrl,
        dimension,
      });
      return Object.freeze({
        dimension,
        term,
        slug: termSlug,
        path,
        href,
        absoluteUrl,
        termId: String(thing["@id"]),
        collectionId: String(collection["@id"]),
        itemUrls,
        collection: jsonLdNode(collection),
        thing,
      });
    })
    .sort((left, right) => left.dimension.localeCompare(right.dimension) || left.term.localeCompare(right.term)));
}

function termsByName(articles, dimension) {
  const out = new Map();
  for (const article of articles) {
    for (const term of uniqueTerms(article[dimension] ?? [])) {
      const bucket = out.get(term) ?? [];
      bucket.push(article);
      out.set(term, bucket);
    }
  }
  return new Map([...out].map(([term, bucket]) => [term, Object.freeze(bucket.sort(newestFirst))]));
}

function termRefsByArticle(articles, terms) {
  const byKey = new Map(terms.map((term) => [`${term.dimension}:${term.term}`, term]));
  const out = new Map();
  for (const article of articles) {
    const refs = [];
    for (const dimension of ["tags", "categories"]) {
      for (const term of uniqueTerms(article[dimension] ?? [])) {
        const node = byKey.get(`${dimension}:${term}`);
        if (node === undefined) continue;
        refs.push(Object.freeze({
          "@id": node.termId,
          "@type": "Thing",
          name: node.term,
        }));
      }
    }
    out.set(article.slug, Object.freeze(refs));
  }
  return out;
}

function articleForSchema(article, url) {
  const { outputPath: _outputPath, permalink: _permalink, ...schema } = article;
  return Object.freeze({ ...schema, url });
}

function pageForSchema(page, url) {
  const {
    author: _author,
    draft: _draft,
    outputPath: _outputPath,
    permalink: _permalink,
    ...schema
  } = page;
  return Object.freeze({ ...schema, url });
}

function mergeHeadOptions(head, semanticHead) {
  const byOutputPath = new Map();
  if (head?.byOutputPath !== undefined) {
    for (const [path, links] of headEntries(head.byOutputPath)) byOutputPath.set(path, links);
  }
  for (const [path, links] of semanticHead) {
    byOutputPath.set(path, Object.freeze([...(byOutputPath.get(path) ?? []), ...links]));
  }
  return Object.freeze({
    ...(head?.links === undefined ? {} : { links: head.links }),
    byOutputPath,
  });
}

function headEntries(byOutputPath) {
  if (byOutputPath === undefined) return [];
  if (byOutputPath instanceof Map) return Object.freeze([...byOutputPath.entries()]);
  return Object.freeze(Object.entries(byOutputPath));
}

function scripts(nodes) {
  return Object.freeze(nodes.map((node) => `  ${renderJsonLdScript(node)}`));
}

function jsonLdNode(value) {
  return value;
}

function articleOutputPath(article, postsPath) {
  const hint = firstString(article.outputPath, article.permalink, article.path);
  if (hint !== undefined) return outputPath(hint);
  return indexOutputPath(postsPath, article.slug);
}

function pageOutputPath(page) {
  const hint = firstString(page.outputPath, page.permalink, page.url);
  if (hint !== undefined) return outputPath(hint);
  return indexOutputPath("", page.slug);
}

function indexOutputPath(prefix, slug) {
  const path = [prefix, cleanOutputPath(slug), "index.html"].filter(Boolean).join("/");
  return outputPath(path);
}

function outputPath(path) {
  const clean = cleanOutputPath(path);
  if (clean === "") throw new TypeError("buildSemanticWebsite: output path must not be empty");
  if (clean.endsWith("/")) return `${clean}index.html`;
  if (clean.split("/").at(-1)?.includes(".") === true) return clean;
  return `${clean}/index.html`;
}

function articleJsonLdOutputPath(path) {
  const out = outputPath(path);
  if (out.endsWith("/index.html")) return `${out.slice(0, -"index.html".length - 1)}.jsonld`;
  if (out.endsWith(".html")) return `${out.slice(0, -".html".length)}.jsonld`;
  return `${out}.jsonld`;
}

function graphNodesById(graph) {
  const value = graph["@graph"];
  if (!Array.isArray(value)) return new Map();
  const out = new Map();
  for (const node of value) {
    if (!isJsonLdObject(node)) continue;
    const id = node["@id"];
    if (typeof id === "string" && !out.has(id)) out.set(id, node);
  }
  return out;
}

function referencedIds(node) {
  const out = new Set();
  const visit = (value, topLevelKey) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!isJsonLdObject(value)) return;
    const id = value["@id"];
    if (topLevelKey !== "@id" && typeof id === "string") out.add(id);
    for (const [key, nested] of Object.entries(value)) visit(nested, key);
  };
  for (const [key, value] of Object.entries(node)) visit(value, key);
  return Object.freeze([...out]);
}

function isJsonLdObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanOutputPath(value) {
  const collapsed = value.replace(/\\/gu, "/").replace(/^\/+/u, "").replace(/\/+/gu, "/");
  const parts = collapsed.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.some((part) => part === "..")) throw new TypeError(`buildSemanticWebsite: unsafe output path ${value}`);
  return parts.join("/");
}

function websiteHref(basePath, path) {
  const out = outputPath(path);
  const withoutIndex = out.endsWith("/index.html") ? out.slice(0, -"index.html".length) : out;
  const joined = [normalizeBasePath(basePath).replace(/\/+$/u, ""), withoutIndex.replace(/^\/+/u, "")].filter(Boolean).join("/");
  return normalizeBasePath(joined).replace(/\/$/u, withoutIndex.endsWith("/") ? "/" : "");
}

function absoluteHref(websiteUrl, basePath, path) {
  return new URL(websiteHref(basePath, path), new URL(websiteUrl).origin).toString();
}

function absoluteRoot(websiteUrl, basePath) {
  return new URL(normalizeBasePath(basePath), new URL(websiteUrl).origin).toString();
}

function normalizeBasePath(value) {
  const path = value.trim() === "" ? "/" : value;
  const clean = `/${path.replace(/^\/+|\/+$/gu, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
}

function firstString(...values) {
  for (const value of values) {
    if (value !== undefined && value.trim() !== "") return value;
  }
  return undefined;
}

function uniqueTerms(terms) {
  const seen = new Set();
  const out = [];
  for (const value of terms) {
    const term = value.trim();
    if (term === "" || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return Object.freeze(out);
}

function newestFirst(left, right) {
  return publishedTime(right) - publishedTime(left)
    || left.slug.localeCompare(right.slug);
}

function publishedTime(article) {
  const time = Date.parse(article.date);
  if (Number.isNaN(time)) throw new TypeError(`buildSemanticWebsite: article ${article.slug} has an unparseable date ${article.date}`);
  return time;
}

function personId(websiteRoot, name) {
  return `${websiteRoot}#person-${slugTerm(name)}`;
}
