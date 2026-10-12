/**
 * integrations/web/core/static-website/generator/digital-garden - vault notes as a static garden.
 *
 * This genre recipe stays bounded to existing package atoms: vault ingestion
 * resolves wikilinks, static-website renders the output tree, and diagram/SVG
 * projections surface the note graph. The graph's H1 rank is routed through
 * the existing matter-topology receipt rather than measured locally.
 */
import type { Article } from "../../article/index.mts";
import type { Page } from "../../page/index.mts";
import { vaultLinkGraphMatter, vaultToContent, type VaultNoteContent, type VaultFiles, type VaultFrontMatter, type VaultLink } from "../../../integrations/knowledge-vaults/wikilinks.mts";
import { escapeAttr, escapeText } from "@red-cup-engineering/html-structural-projection-service";
import { projectSvg } from "../../../lib/codecs/xml-svg/svg/index.mts";
import { diagramToSvgDataform, presentedCategoryDiagram } from "../../../lib/codecs/diagram/index.mts";
import { buildStaticWebsite, type StaticWebsiteAsset, type StaticWebsiteFileMap, type StaticWebsiteOptions } from "./index.mts";
import { articlesToTermIndexPages } from "./taxonomy.mts";

export type DigitalGardenFileMap = StaticWebsiteFileMap;

export interface DigitalGardenOptions extends StaticWebsiteOptions {
  readonly graphPath?: string;
  readonly manifestPath?: string;
  readonly includeGraph?: boolean;
}

export interface DigitalGardenCoreGap {
  readonly ingredient: string;
  readonly missingCapability: string;
  readonly coreHome: string;
  readonly minimalSignature: string;
  readonly cohomologyLayer: "already-measures-after-adapter" | "not-applicable";
  readonly unblocks: readonly string[];
}

export interface DigitalGardenBacklink {
  readonly sourcePath: string;
  readonly sourceTitle: string;
  readonly sourceHref: string;
}

export interface DigitalGardenGraphLink {
  readonly fromPath: string;
  readonly toPath: string;
  readonly href: string;
  readonly label: string;
}

export interface DigitalGardenGraph {
  readonly kind: "metroplat.digital-garden.link-graph";
  readonly notes: readonly DigitalGardenGraphNote[];
  readonly links: readonly DigitalGardenGraphLink[];
  readonly h1Rank:
    | null
    | Readonly<{
      readonly value: number;
      readonly derivation: string;
    }>;
  readonly h1RankStatus: "measured:matter-topology-receipt";
}

export interface DigitalGardenGraphNote {
  readonly path: string;
  readonly title: string;
  readonly href: string;
  readonly stage?: GrowthStage | null;
}

/** A note's declared maturity, author-set frontmatter (`stage`/`growth`), never derived from content. */
export type GrowthStage = "seedling" | "budding" | "evergreen";

const GROWTH_STAGE_SYNONYMS: Readonly<Record<string, GrowthStage>> = Object.freeze({
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
export function normalizeGrowthStage(value: unknown): GrowthStage | null {
  const key = String(value ?? "").trim().toLowerCase();
  return GROWTH_STAGE_SYNONYMS[key] ?? null;
}

function growthStageOf(frontMatter: VaultFrontMatter): GrowthStage | null {
  return normalizeGrowthStage(frontMatter["stage"] ?? frontMatter["growth"]);
}

export interface DigitalGardenOrphanNote {
  readonly path: string;
  readonly title: string;
  readonly href: string;
}

export interface DigitalGardenBrokenLink {
  readonly sourcePath: string;
  readonly sourceTitle: string;
  readonly label: string;
  readonly target: string;
}

export interface DigitalGardenHealth {
  readonly kind: "metroplat.digital-garden.health";
  readonly orphans: readonly DigitalGardenOrphanNote[];
  readonly brokenLinks: readonly DigitalGardenBrokenLink[];
}

type GardenContent = VaultNoteContent & {
  readonly content: Article | Page;
};

type GardenNote = Readonly<{
  readonly kind: VaultNoteContent["kind"];
  readonly path: string;
  readonly url: string;
  readonly title: string;
  readonly links: readonly VaultLink[];
  readonly stage: GrowthStage | null;
  readonly content: Article | Page;
}>;

export const digitalGardenCoreGaps: readonly DigitalGardenCoreGap[] = Object.freeze([
]);

/** Build a digital garden output tree from an in-memory markdown vault. */
export function buildDigitalGarden(files: VaultFiles, opts: DigitalGardenOptions): DigitalGardenFileMap {
  const basePath = opts.basePath ?? new URL(opts.websiteUrl).pathname;
  const ingestion = vaultToContent(files, { basePath });
  const notes = admittedGardenNotes(ingestion.notes, opts);
  const backlinks = backlinksByPath(notes);
  const articles = notes
    .filter((note): note is GardenNote & { readonly kind: "article"; readonly content: Article } => note.kind === "article")
    .map((note) => Object.freeze({
      ...note.content,
      body: appendBacklinks(note.content.body, backlinks.get(note.path) ?? []),
      url: stripBasePath(note.url, basePath),
    }));
  const pages = notes
    .filter((note): note is GardenNote & { readonly kind: "page"; readonly content: Page } => note.kind === "page")
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
export function digitalGardenGraph(notes: readonly GardenNote[]): DigitalGardenGraph {
  const notesByPath = new Map(notes.map((note) => [note.path.toLowerCase(), note]));
  const links: DigitalGardenGraphLink[] = [];
  const seen = new Set<string>();
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
    kind: "metroplat.digital-garden.link-graph" as const,
    notes: Object.freeze(notes.map((note) => Object.freeze({
      path: note.path,
      title: note.title,
      href: note.url,
      stage: note.stage,
    }))),
    links: Object.freeze(links),
    h1Rank: null,
    h1RankStatus: "measured:matter-topology-receipt" as const,
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

function admittedGardenNotes(notes: readonly VaultNoteContent[], opts: DigitalGardenOptions): readonly GardenNote[] {
  return Object.freeze(notes
    .filter((note) => opts.includeDrafts === true || !draftOf(note))
    .map((note): GardenNote => Object.freeze({
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
export function digitalGardenHealth(notes: readonly GardenNote[], graph: DigitalGardenGraph): DigitalGardenHealth {
  const linked = new Set<string>();
  for (const link of graph.links) {
    linked.add(link.fromPath);
    linked.add(link.toPath);
  }
  const orphans = notes
    .filter((note) => !linked.has(note.path))
    .map((note) => Object.freeze({ path: note.path, title: note.title, href: note.url }));
  const brokenLinks: DigitalGardenBrokenLink[] = [];
  for (const note of notes) {
    for (const link of note.links) {
      if (link.unresolved === true) {
        brokenLinks.push(Object.freeze({ sourcePath: note.path, sourceTitle: note.title, label: link.label, target: link.target }));
      }
    }
  }
  return Object.freeze({
    kind: "metroplat.digital-garden.health" as const,
    orphans: Object.freeze(orphans),
    brokenLinks: Object.freeze(brokenLinks),
  });
}

function draftOf(note: VaultNoteContent): boolean {
  if (note.kind === "article") return note.content.draft;
  const raw = note.frontMatter["draft"];
  return raw === true || raw === "true";
}

function backlinksByPath(notes: readonly GardenNote[]): ReadonlyMap<string, readonly DigitalGardenBacklink[]> {
  const notesByPath = new Map(notes.map((note) => [note.path.toLowerCase(), note]));
  const backlinks = new Map<string, DigitalGardenBacklink[]>();
  const seen = new Set<string>();
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

function appendBacklinks(body: string, backlinks: readonly DigitalGardenBacklink[]): string {
  const trimmed = body.trimEnd();
  const listing = backlinks.length === 0
    ? "No backlinks yet."
    : backlinks.map((backlink) => `- [${markdownLabel(backlink.sourceTitle)}](${backlink.sourceHref})`).join("\n");
  return `${trimmed}\n\n## Backlinks\n\n${listing}\n`;
}

function markdownLabel(value: string): string {
  return value.replace(/[[\]\\]/g, "\\$&");
}

function renderGardenIndex(notes: readonly GardenNote[], opts: DigitalGardenOptions, graphPath: string, manifestPath: string): string {
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

function websiteHref(opts: DigitalGardenOptions, path: string): string {
  const basePath = normalizeBasePath(opts.basePath ?? new URL(opts.websiteUrl).pathname);
  const clean = cleanOutputPath(path);
  const withoutIndex = clean.endsWith("/index.html") ? clean.slice(0, -"index.html".length) : clean;
  const joined = [basePath.replace(/\/+$/u, ""), withoutIndex.replace(/^\/+/u, "")].filter(Boolean).join("/");
  return normalizeBasePath(joined).replace(/\/$/u, withoutIndex.endsWith("/") ? "/" : "");
}

function normalizeBasePath(value: string): string {
  const path = value.trim() === "" ? "/" : value;
  const clean = `/${path.replace(/^\/+|\/+$/gu, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
}

function stripBasePath(href: string, basePath: string): string {
  const base = normalizeBasePath(basePath);
  if (base === "/") return href;
  if (href.startsWith(base)) return `/${href.slice(base.length)}`;
  const baseWithoutSlash = base.slice(0, -1);
  if (href === baseWithoutSlash) return "/";
  return href;
}

function cleanOutputPath(value: string): string {
  const collapsed = value.replace(/\\/gu, "/").replace(/^\/+/u, "").replace(/\/+/gu, "/");
  const parts = collapsed.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.some((part) => part === "..")) throw new TypeError(`buildDigitalGarden: unsafe output path ${value}`);
  const clean = parts.join("/");
  if (clean === "") throw new TypeError("buildDigitalGarden: output path must not be empty");
  return clean;
}
