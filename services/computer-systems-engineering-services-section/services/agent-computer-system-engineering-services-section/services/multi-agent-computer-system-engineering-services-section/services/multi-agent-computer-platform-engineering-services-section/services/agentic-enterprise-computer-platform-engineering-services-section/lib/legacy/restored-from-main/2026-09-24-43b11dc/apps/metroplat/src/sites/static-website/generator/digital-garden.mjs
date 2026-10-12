/**
 * integrations/web/core/static-website/generator/digital-garden - vault notes as a static garden.
 *
 * This genre recipe stays bounded to existing package atoms: vault ingestion
 * resolves wikilinks, static-website renders the output tree, and diagram/SVG
 * projections surface the note graph. The graph's H1 rank is routed through
 * the existing matter-topology receipt rather than measured locally.
 */

import { vaultLinkGraphMatter, vaultToContent } from "../../../integrations/knowledge-vaults/wikilinks.mjs";
import { escapeAttr, escapeText } from "@red-cup-engineering/html-structural-projection-service";
import { projectSvg } from "@red-cup-engineering/xml-document-rendering-service/svg";
import { presentedCategoryDiagram, diagramToSvgDataform } from "@red-cup-engineering/computer-networking-engineering-services-section/signgraph/diagram";
import { buildStaticWebsite } from "./index.mjs";
import { articlesToTermIndexPages } from "@red-cup-engineering/static-site-publisher/sites/static-website/generator/taxonomy";

/** A note's declared maturity, author-set frontmatter (`stage`/`growth`), never derived from content. */

const GROWTH_STAGE_SYNONYMS = Object.freeze({
  seed: "seedling",
  seedling: "seedling",
  sapling: "budding",
  budding: "budding",
  growing: "budding",
  developing: "budding",
  evergreen: "evergreen",
  mature: "evergreen",
  tended: "evergreen",
});

/** Normalize a declared stage value (any case, common synonyms), or `null` if undeclared/unrecognized. */
export function normalizeGrowthStage(value) {
  const key = String(value ?? "").trim().toLowerCase();
  return GROWTH_STAGE_SYNONYMS[key] ?? null;
}

function growthStageOf(frontMatter) {
  return normalizeGrowthStage(frontMatter["stage"] ?? frontMatter["growth"]);
}

export const digitalGardenCoreGaps = Object.freeze([
]);

/** Build a digital garden output tree from an in-memory markdown vault. */
export function buildDigitalGarden(files, opts) {
  const basePath = opts.basePath ?? new URL(opts.websiteUrl).pathname;
  const ingestion = vaultToContent(files, { basePath });
  const notes = admittedGardenNotes(ingestion.notes, opts);
  const backlinks = backlinksByPath(notes);
  const articles = notes
    .filter((note) => note.kind === "article")
    .map((note) => Object.freeze({
      ...note.content,
      body: appendBacklinks(note.content.body, backlinks.get(note.path) ?? []),
      url: stripBasePath(note.url, basePath),
    }));
  const pages = notes
    .filter((note) => note.kind === "page")
    .map((note) => Object.freeze({
      ...note.content,
      body: appendBacklinks(note.content.body, backlinks.get(note.path) ?? []),
      url: stripBasePath(note.url, basePath),
    }));

  const tagAssets = articlesToTermIndexPages(articles, { dimension: "tags", basePath, pathPrefix: "tags", includeRoot: true });
  const filesOut = new Map(buildStaticWebsite({ articles, pages, assets: tagAssets }, opts));
  const graph = digitalGardenGraph(notes);
  const graphPath = cleanOutputPath(opts.graphPath ?? "graph.svg");
  const manifestPath = cleanOutputPath(opts.manifestPath ?? "garden.json");
  if (opts.includeGraph !== false) {
    const diagram = presentedCategoryDiagram({
      title: `${opts.title} note graph`,
      description: `${graph.notes.length} notes, ${graph.links.length} resolved wikilinks.`,
      objects: graph.notes.map((note) => ({
        id: note.path,
        kind: "note",
        label: note.title,
        href: note.href,
      })),
      morphisms: graph.links.map((link, index) => ({
        id: `link:${index}`,
        from: link.fromPath,
        to: link.toPath,
        kind: "wikilink",
        label: link.label,
      })),
    });
    filesOut.set(graphPath, `${projectSvg(diagramToSvgDataform(diagram))}\n`);
  }
  const health = digitalGardenHealth(notes, graph);
  filesOut.set(manifestPath, `${JSON.stringify({
    ...graph,
    graphPath,
    health,
    gaps: digitalGardenCoreGaps,
  }, null, 2)}\n`);
  filesOut.set("index.html", renderGardenIndex(notes, opts, graphPath, manifestPath));
  return filesOut;
}

/** Read the resolved note graph that the digital-garden projection surfaces. */
export function digitalGardenGraph(notes) {
  const notesByPath = new Map(notes.map((note) => [note.path.toLowerCase(), note]));
  const links = [];
  const seen = new Set();
  for (const source of notes) {
    for (const link of source.links) {
      if (link.unresolved === true || link.path === undefined) continue;
      const target = notesByPath.get(link.path.toLowerCase());
      if (target === undefined) continue;
      const key = `${source.path}\u0000${target.path}\u0000${link.href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push(Object.freeze({
        fromPath: source.path,
        toPath: target.path,
        href: link.href,
        label: link.label,
      }));
    }
  }
  const graph = Object.freeze({
    kind: "metroplat.digital-garden.link-graph",
    notes: Object.freeze(notes.map((note) => Object.freeze({
      path: note.path,
      title: note.title,
      href: note.url,
      stage: note.stage,
    }))),
    links: Object.freeze(links),
    h1Rank: null,
    h1RankStatus: "measured:matter-topology-receipt",
  });
  const matter = vaultLinkGraphMatter(graph);
  return Object.freeze({
    ...graph,
    h1Rank: Object.freeze({
      value: matter.h1Rank,
      derivation: "vaultLinkGraphMatter",
    }),
  });
}

function admittedGardenNotes(notes, opts) {
  return Object.freeze(notes
    .filter((note) => opts.includeDrafts === true || !draftOf(note))
    .map((note) => Object.freeze({
      kind: note.kind,
      path: note.path,
      url: note.url,
      title: note.content.title,
      links: note.links,
      stage: growthStageOf(note.frontMatter),
      content: note.content,
    })));
}

/** Orphan notes (no resolved link in either direction) and unresolved wikilink targets, over the same admitted material as the graph. */
export function digitalGardenHealth(notes, graph) {
  const linked = new Set();
  for (const link of graph.links) {
    linked.add(link.fromPath);
    linked.add(link.toPath);
  }
  const orphans = notes
    .filter((note) => !linked.has(note.path))
    .map((note) => Object.freeze({ path: note.path, title: note.title, href: note.url }));
  const brokenLinks = [];
  for (const note of notes) {
    for (const link of note.links) {
      if (link.unresolved === true) {
        brokenLinks.push(Object.freeze({ sourcePath: note.path, sourceTitle: note.title, label: link.label, target: link.target }));
      }
    }
  }
  return Object.freeze({
    kind: "metroplat.digital-garden.health",
    orphans: Object.freeze(orphans),
    brokenLinks: Object.freeze(brokenLinks),
  });
}

function draftOf(note) {
  if (note.kind === "article") return note.content.draft;
  const raw = note.frontMatter["draft"];
  return raw === true || raw === "true";
}

function backlinksByPath(notes) {
  const notesByPath = new Map(notes.map((note) => [note.path.toLowerCase(), note]));
  const backlinks = new Map();
  const seen = new Set();
  for (const source of notes) {
    for (const link of source.links) {
      if (link.unresolved === true || link.path === undefined) continue;
      const target = notesByPath.get(link.path.toLowerCase());
      if (target === undefined) continue;
      const key = `${target.path}\u0000${source.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const bucket = backlinks.get(target.path) ?? [];
      bucket.push(Object.freeze({
        sourcePath: source.path,
        sourceTitle: source.title,
        sourceHref: source.url,
      }));
      backlinks.set(target.path, bucket);
    }
  }
  return new Map([...backlinks].map(([path, entries]) => [path, Object.freeze(entries.sort((left, right) =>
    left.sourceTitle.localeCompare(right.sourceTitle) || left.sourcePath.localeCompare(right.sourcePath)))]));
}

function appendBacklinks(body, backlinks) {
  const trimmed = body.trimEnd();
  const listing = backlinks.length === 0
    ? "No backlinks yet."
    : backlinks.map((backlink) => `- [${markdownLabel(backlink.sourceTitle)}](${backlink.sourceHref})`).join("\n");
  return `${trimmed}\n\n## Backlinks\n\n${listing}\n`;
}

function markdownLabel(value) {
  return value.replace(/[[\]\\]/g, "\\$&");
}

function renderGardenIndex(notes, opts, graphPath, manifestPath) {
  const graphHref = websiteHref(opts, graphPath);
  const manifestHref = websiteHref(opts, manifestPath);
  const noteItems = notes
    .map((note) => `      <li><a href="${escapeAttr(note.url)}">${escapeText(note.title)}</a></li>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="${escapeAttr(opts.language ?? "en")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeText(opts.title)}</title>${opts.description === undefined ? "" : `
  <meta name="description" content="${escapeAttr(opts.description)}">`}
  <link rel="alternate" type="application/rss+xml" href="${escapeAttr(websiteHref(opts, "feed.xml"))}">
  <link rel="alternate" type="application/atom+xml" href="${escapeAttr(websiteHref(opts, "atom.xml"))}">
  <link rel="alternate" type="application/feed+json" href="${escapeAttr(websiteHref(opts, "feed.json"))}">
  <link rel="sitemap" type="application/xml" href="${escapeAttr(websiteHref(opts, "sitemap.xml"))}">
</head>
<body>
  <main>
    <h1>${escapeText(opts.title)}</h1>
    <nav aria-label="Garden">
      <a href="${escapeAttr(graphHref)}">Graph</a>
      <a href="${escapeAttr(manifestHref)}">Manifest</a>
    </nav>
    <section class="h-feed">
      <h2>Notes</h2>
      <ol>
${noteItems}
      </ol>
    </section>
  </main>
</body>
</html>
`;
}

function websiteHref(opts, path) {
  const basePath = normalizeBasePath(opts.basePath ?? new URL(opts.websiteUrl).pathname);
  const clean = cleanOutputPath(path);
  const withoutIndex = clean.endsWith("/index.html") ? clean.slice(0, -"index.html".length) : clean;
  const joined = [basePath.replace(/\/+$/u, ""), withoutIndex.replace(/^\/+/u, "")].filter(Boolean).join("/");
  return normalizeBasePath(joined).replace(/\/$/u, withoutIndex.endsWith("/") ? "/" : "");
}

function normalizeBasePath(value) {
  const path = value.trim() === "" ? "/" : value;
  const clean = `/${path.replace(/^\/+|\/+$/gu, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
}

function stripBasePath(href, basePath) {
  const base = normalizeBasePath(basePath);
  if (base === "/") return href;
  if (href.startsWith(base)) return `/${href.slice(base.length)}`;
  const baseWithoutSlash = base.slice(0, -1);
  if (href === baseWithoutSlash) return "/";
  return href;
}

function cleanOutputPath(value) {
  const collapsed = value.replace(/\\/gu, "/").replace(/^\/+/u, "").replace(/\/+/gu, "/");
  const parts = collapsed.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.some((part) => part === "..")) throw new TypeError(`buildDigitalGarden: unsafe output path ${value}`);
  const clean = parts.join("/");
  if (clean === "") throw new TypeError("buildDigitalGarden: output path must not be empty");
  return clean;
}
