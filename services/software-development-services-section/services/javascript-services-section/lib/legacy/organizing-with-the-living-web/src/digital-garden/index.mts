import type { FeedAuthor, FeedChannel, FeedItem, SitemapUrl } from "@emsenn/organizing-with-the-web/feed";
import {
  assertHttpUrl,
  atom,
  escapeHtmlText,
  jsonFeed,
  joinUrl,
  maybeString,
  normalizePath,
  robots,
  rss2,
  scalars,
  sitemap,
  slugify,
} from "@emsenn/organizing-with-the-web/feed";
import type { MicroformatAuthor, MicroformatEntry, MicroformatFeed, MicroformatProperties } from "@emsenn/organizing-with-the-semantic-web/microformats";
import { hEntry, hFeed } from "@emsenn/organizing-with-the-semantic-web/microformats";
import { securityTxt, type SecurityTxt } from "@emsenn/organizing-with-the-semantic-web/page-metadata";
import type { App, Repr } from "@emsenn/relating/running/http";
import type { FiniteAlgebra, TaxonomyRelation } from "@emsenn/organizing-with-the-semantic-web/taxonomy";
import { buildTaxonomy, termsOf } from "@emsenn/organizing-with-the-semantic-web/taxonomy";
import { minimal, render, type Theme, type ThemeContext } from "@emsenn/organizing-with-the-web/theming";

// A garden charge is a name-level reading with the four bedrock charge value
// names: potential (witnessed), active (below threshold), stable (held
// contradiction), absurd (no evidence either way).
export type GardenCharge = "potential" | "active" | "stable" | "absurd";
export type GrowthStage = "seedling" | "budding" | "evergreen";

export type GardenCell = Readonly<{
  predicate: string;
  object: unknown;
  citation?: string;
  claimedBy?: string;
  contraryClaimedBy?: string;
}>;

export type GardenAlgebra = Readonly<{
  subject: string;
  potential?: readonly GardenCell[];
  active?: readonly GardenCell[];
  stable?: readonly GardenCell[];
  t?: unknown;
}>;

export type GardenNoteInput = Readonly<{
  algebra: GardenAlgebra;
  body?: string;
  slug?: string;
  path?: string;
  url?: string;
  title?: string;
  author?: string | MicroformatAuthor;
}>;

export type GardenNote = Readonly<{
  subject: string;
  slug: string;
  url: string;
  title: string;
  body: string;
  htmlBody: string;
  summary?: string;
  published?: string;
  updated?: string;
  author?: string | MicroformatAuthor;
  stage: GrowthStage | null;
  stageContested: boolean;
  tags: readonly string[];
  targets: readonly string[];
  algebra: GardenAlgebra;
}>;

export type WikiLink = Readonly<{
  target: string;
  slug: string;
  label: string;
  fragment: string | null;
  index: number;
}>;

export type LinkGraph = Readonly<{
  notes: readonly string[];
  outgoing: ReadonlyMap<string, readonly string[]>;
  at: (source: string, target: string) => GardenCharge;
}>;

export type TopicCluster = Readonly<{
  topic: string;
  count: number;
  notes: readonly GardenNote[];
}>;

export type GardenConfig = Readonly<{
  title: string;
  baseUrl: string;
  notePath?: string;
  description?: string;
  author?: string | MicroformatAuthor;
  language?: string;
  theme?: Theme;
  themeContext?: ThemeContext;
}>;

export type GardenPage = Readonly<{
  note: GardenNote;
  backlinks: readonly GardenNote[];
  entry: string;
  html: string;
}>;

export type DigitalGarden = Readonly<{
  config: Required<Pick<GardenConfig, "title" | "baseUrl" | "notePath" | "description" | "language">> & Pick<GardenConfig, "author" | "theme" | "themeContext">;
  notes: readonly GardenNote[];
  graph: LinkGraph;
  taxonomy: TaxonomyRelation;
  clusters: readonly TopicCluster[];
  unfiled: readonly GardenNote[];
  health: Readonly<{
    orphans: readonly string[];
    brokenLinks: readonly { source: string; target: string }[];
    contestedGrowth: readonly string[];
  }>;
  notePage: (slug: string) => GardenPage | undefined;
  index: () => string;
}>;

export type GardenAppOptions = Readonly<{
  indexPath?: string;
  manifestPath?: string;
  healthPath?: string;
  feedJsonPath?: string;
  feedAtomPath?: string;
  feedRssPath?: string;
  sitemapPath?: string;
  robotsPath?: string;
  securityTxtPath?: string;
  security?: SecurityTxt;
}>;

const WIKILINK = /\[\[([^\]\[|#]+)(#[^\]\[|]+)?(\|[^\]\[]+)?\]\]/g;
const TAG_PREDICATES = new Set(["tag", "tags", "category", "categories", "topic", "cluster", "keyword"]);
const STAGE_PREDICATES = new Set(["growth", "stage"]);
const FEED_FALLBACK_UPDATED = "1970-01-01T00:00:00Z";
export const STAGES = Object.freeze(["seedling", "budding", "evergreen"] as const);

const STAGE_SYNONYMS: Readonly<Record<string, GrowthStage>> = Object.freeze({
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

export { joinUrl, slugify };

function trimBase(baseUrl: string): string {
  const base = String(baseUrl ?? "").replace(/\/+$/, "");
  assertHttpUrl(base, "baseUrl");
  return base;
}

function stableSlug(value: unknown): string {
  const slug = slugify(value);
  return slug.length > 0 ? slug : "note";
}

function repr(body: unknown, type: string, status = 200): Repr {
  return { status, type, body: typeof body === "string" ? body : JSON.stringify(body) };
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].filter(Boolean).sort());
}

function feedAuthor(author: string | MicroformatAuthor | undefined): FeedAuthor | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return author ? { name: author } : undefined;
  return { name: author.name, ...(author.url ? { url: author.url } : {}) };
}

export function parseWikilinks(body: unknown): readonly WikiLink[] {
  const out: WikiLink[] = [];
  for (const match of String(body ?? "").matchAll(WIKILINK)) {
    const target = String(match[1] ?? "").trim();
    const fragment = match[2] ? String(match[2]).slice(1).trim() : null;
    const label = match[3] ? String(match[3]).slice(1).trim() : target;
    out.push(Object.freeze({ target, slug: slugify(target), label, fragment, index: match.index ?? 0 }));
  }
  return Object.freeze(out);
}

export function linkTargets(body: unknown): readonly string[] {
  return uniqueSorted(parseWikilinks(body).map((link) => link.slug));
}

export function renderWikilinks(body: unknown, resolve: (slug: string) => string | null | undefined): string {
  return escapeHtmlText(body).replace(WIKILINK, (_full, rawTarget: string, rawFragment?: string, rawAlias?: string) => {
    const slug = slugify(String(rawTarget).trim());
    const fragment = rawFragment ? slugify(String(rawFragment).slice(1).trim()) : "";
    const label = rawAlias ? String(rawAlias).slice(1).trim() : String(rawTarget).trim();
    const href = resolve(slug);
    if (!href) {
      const target = fragment ? `${slug}#${fragment}` : slug;
      return `<a href="#${escapeHtmlText(target)}" class="wikilink broken" data-broken="true" data-slug="${escapeHtmlText(slug)}">${escapeHtmlText(label)}</a>`;
    }
    const url = fragment ? `${href}#${fragment}` : href;
    return `<a href="${escapeHtmlText(url)}" class="wikilink" data-slug="${escapeHtmlText(slug)}">${escapeHtmlText(label)}</a>`;
  });
}

export function buildLinkGraph(linksBySlug: ReadonlyMap<string, readonly string[]> | Readonly<Record<string, readonly string[]>> | Iterable<readonly [string, readonly string[]]>): LinkGraph {
  const entries = linksBySlug instanceof Map
    ? [...linksBySlug.entries()]
    : Symbol.iterator in Object(linksBySlug)
      ? [...linksBySlug as Iterable<readonly [string, readonly string[]]>]
      : Object.entries(linksBySlug ?? {});
  const outgoing = new Map<string, readonly string[]>();
  const noteSlugs = new Set<string>();
  const linked = new Set<string>();
  for (const [source, targets] of entries) {
    const list = uniqueSorted(targets ?? []);
    outgoing.set(source, list);
    noteSlugs.add(source);
    for (const target of list) {
      noteSlugs.add(target);
      linked.add(`${source}\u0000${target}`);
    }
  }
  const notes = uniqueSorted(noteSlugs);
  return Object.freeze({
    notes,
    outgoing,
    at(source: string, target: string): GardenCharge {
      return linked.has(`${source}\u0000${target}`) ? "potential" : "absurd";
    },
  });
}

export function outlinks(graph: LinkGraph, slug: string): readonly string[] {
  return Object.freeze([...(graph.outgoing.get(slug) ?? [])].sort());
}

export function backlinks(graph: LinkGraph, slug: string): readonly string[] {
  return uniqueSorted(graph.notes.filter((source) => graph.at(source, slug) === "potential"));
}

export function allBacklinks(graph: LinkGraph): ReadonlyMap<string, readonly string[]> {
  return new Map(graph.notes.map((slug) => [slug, backlinks(graph, slug)]));
}

export function orphans(graph: LinkGraph): readonly string[] {
  return uniqueSorted(graph.notes.filter((slug) => backlinks(graph, slug).length === 0 && outlinks(graph, slug).length === 0));
}

export function brokenLinks(graph: LinkGraph, authoredSlugs: Iterable<string>): readonly { source: string; target: string }[] {
  const authored = new Set(authoredSlugs);
  const broken: { source: string; target: string }[] = [];
  for (const [source, targets] of graph.outgoing) {
    for (const target of targets) if (!authored.has(target)) broken.push({ source, target });
  }
  return Object.freeze(broken.sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target)));
}

export function normalizeStage(value: unknown): GrowthStage | null {
  const key = String(value ?? "").trim().toLowerCase();
  return STAGE_SYNONYMS[key] ?? null;
}

export function stageOf(algebra: Pick<GardenAlgebra, "potential" | "stable">): { stage: GrowthStage | null; contested: boolean } {
  const contested = (algebra.stable ?? []).some((cell) => STAGE_PREDICATES.has(cell.predicate));
  const stageCell = (algebra.potential ?? []).find((cell) => STAGE_PREDICATES.has(cell.predicate));
  return { stage: normalizeStage(stageCell?.object), contested };
}

function stageRank(stage: GrowthStage | null): number {
  return stage ? STAGES.indexOf(stage) : -1;
}

export function compareStage(left: GrowthStage | null, right: GrowthStage | null): number {
  return stageRank(left) - stageRank(right);
}

export function growthCharge(algebra: Pick<GardenAlgebra, "potential" | "stable">, threshold: GrowthStage = "seedling"): GardenCharge {
  const { stage, contested } = stageOf(algebra);
  if (contested) return "stable";
  if (!stage) return "absurd";
  return stageRank(stage) >= stageRank(threshold) ? "potential" : "active";
}

export function meetsGrowth(algebra: Pick<GardenAlgebra, "potential" | "stable">, threshold: GrowthStage = "seedling"): boolean {
  return growthCharge(algebra, threshold) === "potential";
}

export function tagsOf(algebra: Pick<GardenAlgebra, "potential">, normalize: (tag: string) => string = slugify): readonly string[] {
  const tags: string[] = [];
  for (const cell of algebra.potential ?? []) {
    if (!TAG_PREDICATES.has(cell.predicate)) continue;
    tags.push(...scalars(cell.object).map(normalize).filter(Boolean));
  }
  return uniqueSorted(tags);
}

function fieldValue(algebra: Pick<GardenAlgebra, "potential">, predicates: readonly string[]): string | undefined {
  const wanted = new Set(predicates);
  const cell = (algebra.potential ?? []).find((candidate) => wanted.has(candidate.predicate));
  return maybeString(cell?.object);
}

function normalizeConfig(config: GardenConfig): DigitalGarden["config"] {
  if (!config.title) throw new TypeError("config.title is required");
  const baseUrl = trimBase(config.baseUrl);
  return Object.freeze({
    title: config.title,
    baseUrl,
    notePath: config.notePath ?? "notes",
    description: config.description ?? "",
    language: config.language ?? "en",
    ...(config.author ? { author: config.author } : {}),
    ...(config.theme ? { theme: config.theme } : {}),
    ...(config.themeContext ? { themeContext: config.themeContext } : {}),
  });
}

function noteUrl(config: DigitalGarden["config"], slug: string, path?: string, url?: string): string {
  const candidate = url ?? (path ? joinUrl(config.baseUrl, path) : joinUrl(config.baseUrl, joinUrl(config.notePath, slug)));
  assertHttpUrl(candidate, "note.url");
  return candidate;
}

export function normalizeNote(input: GardenNoteInput, config: GardenConfig): GardenNote {
  const cfg = normalizeConfig(config);
  const subject = input.algebra.subject;
  const slug = stableSlug(input.slug ?? subject);
  const body = input.body ?? fieldValue(input.algebra, ["body", "content"]) ?? "";
  const { stage, contested } = stageOf(input.algebra);
  const title = input.title ?? fieldValue(input.algebra, ["title", "name"]) ?? subject;
  const summary = fieldValue(input.algebra, ["summary", "description"]);
  const published = fieldValue(input.algebra, ["published", "date", "created"]);
  const updated = fieldValue(input.algebra, ["updated", "modified"]);
  const author = input.author ?? fieldValue(input.algebra, ["author"]);
  const url = noteUrl(cfg, slug, input.path, input.url);
  return Object.freeze({
    subject,
    slug,
    url,
    title,
    body,
    htmlBody: renderWikilinks(body, () => null),
    ...(summary ? { summary } : {}),
    ...(published ? { published } : {}),
    ...(updated ? { updated } : {}),
    ...(author ? { author } : {}),
    stage,
    stageContested: contested,
    tags: tagsOf(input.algebra),
    targets: linkTargets(body),
    algebra: input.algebra,
  });
}

export function clusterByTopic(notes: readonly GardenNote[]): ReadonlyMap<string, readonly GardenNote[]> {
  const clusters = new Map<string, GardenNote[]>();
  for (const note of notes) {
    for (const tag of note.tags) {
      const bucket = clusters.get(tag) ?? [];
      bucket.push(note);
      clusters.set(tag, bucket);
    }
  }
  return new Map([...clusters.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([topic, list]) => [topic, Object.freeze(rankByMaturity(list))]));
}

export function unfiled(notes: readonly GardenNote[]): readonly GardenNote[] {
  return Object.freeze(rankByMaturity(notes.filter((note) => note.tags.length === 0)));
}

export function rankByMaturity<T extends { subject: string; stage: GrowthStage | null }>(notes: readonly T[]): readonly T[] {
  return Object.freeze([...notes].sort((a, b) => compareStage(b.stage, a.stage) || a.subject.localeCompare(b.subject)));
}

export function topicIndex(notes: readonly GardenNote[]): readonly TopicCluster[] {
  return Object.freeze([...clusterByTopic(notes).entries()].map(([topic, list]) => Object.freeze({ topic, count: list.length, notes: list })));
}

function backlinkAlgebra(note: GardenNote, sources: readonly GardenNote[]): GardenAlgebra {
  return Object.freeze({
    subject: note.subject,
    potential: sources.map((source) => Object.freeze({
      predicate: "backlink",
      object: source.url,
      citation: source.url,
    })),
    active: [],
    stable: [],
  });
}

function renderBacklinks(sources: readonly GardenNote[]): string {
  if (sources.length === 0) return "";
  const links = sources.map((source) => `<li><a class="u-url" rel="mentioned-by" href="${escapeHtmlText(source.url)}">${escapeHtmlText(source.title)}</a></li>`).join("");
  return `<section class="backlinks"><h2>Backlinks</h2><ul>${links}</ul></section>`;
}

export function noteHEntry(note: GardenNote, backlinksForNote: readonly GardenNote[] = []): string {
  const props: MicroformatProperties = {
    name: note.title,
    url: note.url,
    uid: note.url,
    content: `${note.htmlBody}${renderBacklinks(backlinksForNote)}`,
    ...(note.summary ? { summary: note.summary } : {}),
    ...(note.author ? { author: note.author } : {}),
    ...(note.tags.length > 0 ? { category: [...note.tags, ...(note.stage ? [note.stage] : [])] } : note.stage ? { category: [note.stage] } : {}),
  };
  return hEntry(props);
}

function timelineFeed(config: DigitalGarden["config"], notes: readonly GardenNote[]): MicroformatFeed {
  const entries: MicroformatEntry[] = notes.map((note) => ({
    id: note.url,
    url: note.url,
    title: note.title,
    contentHtml: note.htmlBody,
    ...(note.summary ? { summary: note.summary } : {}),
    ...(typeof note.author === "string" ? { author: { name: note.author } } : note.author ? { author: note.author } : {}),
    tags: [...note.tags, ...(note.stage ? [note.stage] : [])],
  }));
  return {
    title: config.title,
    url: config.baseUrl,
    ...(typeof config.author === "string" ? { author: { name: config.author } } : config.author ? { author: config.author } : {}),
    entries,
  };
}

export function gardenFeedChannel(garden: DigitalGarden, feedUrl = joinUrl(garden.config.baseUrl, "feed.xml")): FeedChannel {
  const author = feedAuthor(garden.config.author);
  return {
    title: garden.config.title,
    homePageUrl: garden.config.baseUrl,
    feedUrl,
    ...(garden.config.description ? { description: garden.config.description } : {}),
    ...(author ? { author } : {}),
    language: garden.config.language,
    updated: garden.notes.map((note) => note.updated ?? note.published).filter((value): value is string => !!value).sort().at(-1) ?? FEED_FALLBACK_UPDATED,
  };
}

export function gardenFeedItems(garden: DigitalGarden): readonly FeedItem[] {
  return garden.notes.map((note) => {
    const author = feedAuthor(note.author);
    const tags = [...note.tags, ...(note.stage ? [note.stage] : [])];
    return {
      id: note.url,
      url: note.url,
      title: note.title,
      contentHtml: note.htmlBody,
      ...(note.summary ? { summary: note.summary } : {}),
      ...(author ? { author } : {}),
      ...(note.published ? { published: note.published } : {}),
      updated: note.updated ?? note.published ?? FEED_FALLBACK_UPDATED,
      ...(tags.length > 0 ? { tags } : {}),
      language: garden.config.language,
    };
  });
}

export function gardenSitemapUrls(garden: DigitalGarden): readonly SitemapUrl[] {
  return [
    { loc: garden.config.baseUrl, priority: 1.0 },
    ...garden.notes.map((note) => ({
      loc: note.url,
      ...(note.updated ?? note.published ? { lastmod: note.updated ?? note.published } : {}),
      changefreq: note.stage === "evergreen" ? "monthly" : "weekly",
      priority: note.stage === "evergreen" ? 0.7 : 0.5,
    } satisfies SitemapUrl)),
  ];
}

function renderIndex(garden: DigitalGarden): string {
  const clusters = garden.clusters.map((cluster) => {
    const notes = cluster.notes.map((note) => `<li><a href="${escapeHtmlText(note.url)}">${escapeHtmlText(note.title)}</a>${note.stage ? ` <span class="p-category">${escapeHtmlText(note.stage)}</span>` : ""}</li>`).join("");
    return `<section class="garden-cluster"><h2>${escapeHtmlText(cluster.topic)}</h2><ul>${notes}</ul></section>`;
  }).join("");
  const loose = garden.unfiled.length > 0
    ? `<section class="garden-cluster"><h2>unfiled</h2><ul>${garden.unfiled.map((note) => `<li><a href="${escapeHtmlText(note.url)}">${escapeHtmlText(note.title)}</a></li>`).join("")}</ul></section>`
    : "";
  return render(garden.config.theme ?? minimal, `${clusters}${loose}${hFeed(timelineFeed(garden.config, garden.notes))}`, {
    title: garden.config.title,
    siteName: garden.config.title,
    description: garden.config.description,
    lang: garden.config.language,
    ...garden.config.themeContext,
  });
}

// Boundary translation: @emsenn/web-taxonomy keys its FiniteAlgebra with
// its own presence vocabulary (affirmed/denied/contradicted), which is not
// the bedrock charge vocabulary. The garden's buckets map onto it here.
function taxonomyAlgebras(notes: readonly GardenNote[]): readonly FiniteAlgebra[] {
  return notes.map((note) => ({
    subject: note.subject,
    affirmed: (note.algebra.potential ?? []).flatMap((cell) => TAG_PREDICATES.has(cell.predicate) ? scalars(cell.object).map((object) => ({ predicate: cell.predicate, object })) : []),
    denied: (note.algebra.active ?? []).flatMap((cell) => TAG_PREDICATES.has(cell.predicate) ? scalars(cell.object).map((object) => ({ predicate: cell.predicate, object })) : []),
    contradicted: (note.algebra.stable ?? []).flatMap((cell) => TAG_PREDICATES.has(cell.predicate) ? scalars(cell.object).map((object) => ({ predicate: cell.predicate, object })) : []),
  }));
}

export function buildGarden(config: GardenConfig, inputNotes: readonly GardenNoteInput[]): DigitalGarden {
  const cfg = normalizeConfig(config);
  const earlyNotes = inputNotes.map((input) => normalizeNote(input, cfg));
  const bySlug = new Map(earlyNotes.map((note) => [note.slug, note]));
  const notes = Object.freeze(earlyNotes.map((note) => Object.freeze({
    ...note,
    htmlBody: renderWikilinks(note.body, (slug) => bySlug.get(slug)?.url),
  })));
  const graph = buildLinkGraph(new Map(notes.map((note) => [note.slug, note.targets])));
  const authored = notes.map((note) => note.slug);
  const backlinksBySlug = allBacklinks(graph);
  const bySlugAfterRender = new Map(notes.map((note) => [note.slug, note]));
  const garden = Object.freeze({
    config: cfg,
    notes,
    graph,
    taxonomy: buildTaxonomy(taxonomyAlgebras(notes)),
    clusters: topicIndex(notes),
    unfiled: unfiled(notes),
    health: Object.freeze({
      orphans: orphans(graph).filter((slug) => bySlugAfterRender.has(slug)),
      brokenLinks: brokenLinks(graph, authored),
      contestedGrowth: notes.filter((note) => note.stageContested).map((note) => note.slug).sort(),
    }),
    notePage(slug: string): GardenPage | undefined {
      const note = bySlugAfterRender.get(slug);
      if (!note) return undefined;
      const sources = (backlinksBySlug.get(slug) ?? []).flatMap((source) => bySlugAfterRender.get(source) ?? []);
      const entry = noteHEntry(note, sources);
      const html = render(cfg.theme ?? minimal, entry, {
        title: note.title,
        siteName: cfg.title,
        description: note.summary ?? cfg.description,
        canonical: note.url,
        lang: cfg.language,
        ...(typeof note.author === "string" ? { author: note.author } : note.author?.name ? { author: note.author.name } : {}),
        ...cfg.themeContext,
      });
      return Object.freeze({ note, backlinks: sources, entry, html });
    },
    index() {
      return renderIndex(this as DigitalGarden);
    },
  } satisfies DigitalGarden);
  return garden;
}

function noteRouteTemplate(garden: DigitalGarden): string {
  const path = String(garden.config.notePath ?? "notes").replace(/^\/+|\/+$/g, "");
  return path ? `/${path}/:slug` : "/:slug";
}

function publicGardenSummary(garden: DigitalGarden): Record<string, unknown> {
  return {
    title: garden.config.title,
    baseUrl: garden.config.baseUrl,
    description: garden.config.description,
    language: garden.config.language,
    feeds: {
      rss: joinUrl(garden.config.baseUrl, "feed.xml"),
      atom: joinUrl(garden.config.baseUrl, "feed.atom"),
      json: joinUrl(garden.config.baseUrl, "feed.json"),
      sitemap: joinUrl(garden.config.baseUrl, "sitemap.xml"),
      robots: joinUrl(garden.config.baseUrl, "robots.txt"),
    },
    notes: garden.notes.map((note) => ({
      subject: note.subject,
      slug: note.slug,
      url: note.url,
      title: note.title,
      stage: note.stage,
      stageContested: note.stageContested,
      tags: note.tags,
      targets: note.targets,
      summary: note.summary ?? null,
    })),
    clusters: garden.clusters.map((cluster) => ({
      topic: cluster.topic,
      count: cluster.count,
      notes: cluster.notes.map((note) => note.slug),
    })),
    health: garden.health,
  };
}

export function gardenApp(garden: DigitalGarden, options: GardenAppOptions = {}): App {
  const indexPath = normalizePath(options.indexPath, "/");
  const manifestPath = normalizePath(options.manifestPath, "/garden.json");
  const healthPath = normalizePath(options.healthPath, "/garden-health.json");
  const feedJsonPath = normalizePath(options.feedJsonPath, "/feed.json");
  const feedAtomPath = normalizePath(options.feedAtomPath, "/feed.atom");
  const feedRssPath = normalizePath(options.feedRssPath, "/feed.xml");
  const sitemapPath = normalizePath(options.sitemapPath, "/sitemap.xml");
  const robotsPath = normalizePath(options.robotsPath, "/robots.txt");
  const securityTxtPath = normalizePath(options.securityTxtPath, "/.well-known/security.txt");
  const security = options.security;
  const feedUrl = new URL(feedRssPath, garden.config.baseUrl).href;
  const channel = gardenFeedChannel(garden, feedUrl);
  const items = gardenFeedItems(garden);
  const sitemapUrl = new URL(sitemapPath, garden.config.baseUrl).href;
  const notePaths = new Map(garden.notes.map((note) => [new URL(note.url).pathname, note.slug]));
  const languages = Object.freeze([garden.config.language]);
  return {
    resources: [
      {
        id: "digital-garden.index",
        name: "Digital Garden Index",
        route: indexPath,
        match: indexPath,
        methods: ["GET"],
        produces: ["text/html"],
        languages,
        handler: async () => repr(garden.index(), "text/html; charset=utf-8"),
      },
      {
        id: "digital-garden.manifest",
        name: "Digital Garden Manifest",
        route: manifestPath,
        match: manifestPath,
        methods: ["GET"],
        produces: ["application/json"],
        languages,
        handler: async () => repr(publicGardenSummary(garden), "application/json; charset=utf-8"),
      },
      {
        id: "digital-garden.health",
        name: "Digital Garden Health",
        route: healthPath,
        match: healthPath,
        methods: ["GET"],
        produces: ["application/json"],
        handler: async () => repr({
          health: garden.health,
          counts: {
            notes: garden.notes.length,
            clusters: garden.clusters.length,
            brokenLinks: garden.health.brokenLinks.length,
            contestedGrowth: garden.health.contestedGrowth.length,
            orphans: garden.health.orphans.length,
          },
        }, "application/json; charset=utf-8"),
      },
      {
        id: "digital-garden.feed.json",
        name: "Digital Garden JSON Feed",
        route: feedJsonPath,
        match: feedJsonPath,
        methods: ["GET"],
        produces: ["application/feed+json"],
        languages,
        handler: async () => repr(jsonFeed({ ...channel, feedUrl: new URL(feedJsonPath, garden.config.baseUrl).href }, items), "application/feed+json; charset=utf-8"),
      },
      {
        id: "digital-garden.feed.atom",
        name: "Digital Garden Atom Feed",
        route: feedAtomPath,
        match: feedAtomPath,
        methods: ["GET"],
        produces: ["application/atom+xml"],
        languages,
        handler: async () => repr(atom({ ...channel, feedUrl: new URL(feedAtomPath, garden.config.baseUrl).href }, items), "application/atom+xml; charset=utf-8"),
      },
      {
        id: "digital-garden.feed.rss",
        name: "Digital Garden RSS Feed",
        route: feedRssPath,
        match: feedRssPath,
        methods: ["GET"],
        produces: ["application/rss+xml"],
        languages,
        handler: async () => repr(rss2(channel, items), "application/rss+xml; charset=utf-8"),
      },
      {
        id: "digital-garden.sitemap",
        name: "Digital Garden Sitemap",
        route: sitemapPath,
        match: sitemapPath,
        methods: ["GET"],
        produces: ["application/xml"],
        handler: async () => repr(sitemap(gardenSitemapUrls(garden)), "application/xml; charset=utf-8"),
      },
      {
        id: "digital-garden.robots",
        name: "Digital Garden Robots",
        route: robotsPath,
        match: robotsPath,
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => repr(robots(sitemapUrl), "text/plain; charset=utf-8"),
      },
      ...(security ? [{
        id: "digital-garden.security-txt",
        name: "Digital Garden Security Contact Policy",
        route: securityTxtPath,
        match: securityTxtPath,
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => repr(securityTxt(security), "text/plain; charset=utf-8"),
      }] : []),
      {
        id: "digital-garden.note",
        name: "Digital Garden Note",
        route: noteRouteTemplate(garden),
        match(path) {
          const slug = notePaths.get(path);
          return slug ? { slug } : null;
        },
        methods: ["GET"],
        produces: ["text/html"],
        languages,
        handler: async (ctx) => {
          const page = garden.notePage(ctx.params.slug ?? "");
          return page ? repr(page.html, "text/html; charset=utf-8") : null;
        },
      },
    ],
  };
}

export function buildGardenApp(config: GardenConfig, inputNotes: readonly GardenNoteInput[], options: GardenAppOptions = {}): App {
  return gardenApp(buildGarden(config, inputNotes), options);
}

export function noteGrowthCharge(note: GardenNote, threshold: GrowthStage = "seedling"): GardenCharge {
  return growthCharge(note.algebra, threshold);
}

export function noteTopics(garden: DigitalGarden, slug: string): readonly string[] {
  return termsOf(garden.taxonomy, slug).map((term) => term.object);
}

export { backlinkAlgebra };
