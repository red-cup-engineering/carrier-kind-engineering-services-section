/**
 * knowledge-vault/src/wikilinks - pure Obsidian vault ingestion.
 *
 * Callers supply the in-memory vault map; this module performs no filesystem IO.
 */
import { articleContract, type Article } from "../../sites/article/index.mts";
import { pageContract, type Page } from "../../sites/page/index.mts";
import { requireJsonValue, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { markdownFeatures, type MarkdownFeature } from "../../lib/codecs/markdown/index.mts";
import { splitFrontMatterFence } from "../../lib/codecs/markdown/frontmatter.mts";
import { markdownDataform } from "../../presentation/markdown.mts";
import { contentSlug } from "../../lib/addressing/slug.mts";
import { markdownNodePresentationPaths } from "../../lib/addressing/markdown-node.mts";
import { referencesOfFrontmatter, type CslItem, type ReferenceDialect } from "../../lib/codecs/csl/index.mts";
import { publicationDateReadout, type PublicationDateReadout } from "../../sites/publication-date.mts";
import { coverNerveOfCohomology, type CoverNerveCarrier as CoverNerve } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/coordination-cohomology";
import { cohomologyOfEdgeGraph } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";
import * as matterTopology from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/matter-topology";
import type { MatterTopologyReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/matter-topology";
import type { DigitalGardenGraph } from "../../sites/static-website/generator/digital-garden.mts";

export type VaultFiles = Readonly<Record<string, string>>;

export type VaultToContentOptions = Readonly<{
  readonly basePath?: string;
  readonly postsPath?: string;
  readonly postsAuthor?: string;
}>;

export type VaultFrontMatter = JsonRecord;

export type VaultLink = Readonly<{
  readonly raw: string;
  readonly target: string;
  readonly label: string;
  readonly href: string;
  readonly path?: string;
  readonly anchor?: string;
  readonly unresolved?: true;
}>;

export type VaultEmbed = Readonly<{
  readonly raw: string;
  readonly target: string;
  readonly label: string;
  readonly href: string;
  readonly path?: string;
  readonly anchor?: string;
  readonly asset: boolean;
  readonly unresolved?: true;
}>;

export type VaultArticleContent = Readonly<{
  readonly kind: "article";
  readonly path: string;
  readonly url: string;
  readonly section?: string;
  readonly frontMatter: VaultFrontMatter;
  readonly links: readonly VaultLink[];
  readonly embeds: readonly VaultEmbed[];
  readonly references: readonly CslItem[];
  readonly referenceDialect: ReferenceDialect;
  readonly publicationDate: PublicationDateReadout;
  readonly content: Article;
}>;

export type VaultPageContent = Readonly<{
  readonly kind: "page";
  readonly path: string;
  readonly url: string;
  readonly section?: string;
  readonly frontMatter: VaultFrontMatter;
  readonly links: readonly VaultLink[];
  readonly embeds: readonly VaultEmbed[];
  readonly references: readonly CslItem[];
  readonly referenceDialect: ReferenceDialect;
  readonly publicationDate: PublicationDateReadout;
  readonly content: Page;
}>;

export type VaultNoteContent = VaultArticleContent | VaultPageContent;

export type VaultIngestion = Readonly<{
  readonly notes: readonly VaultNoteContent[];
  readonly articles: readonly Article[];
  readonly pages: readonly Page[];
}>;

export type VaultLinkWorkbenchReference = Readonly<{
  readonly from: string;
  readonly type: "wikilink" | "transclusion" | "markdown-link";
  readonly raw: string;
  readonly target: string;
  readonly label?: string;
  readonly href: string;
  readonly resolvedKind: "note" | "asset" | "unresolved" | "external";
  readonly path?: string;
  readonly anchor?: string;
  readonly image?: boolean;
  readonly span: MarkdownFeature["span"];
}>;

export type VaultLinkWorkbenchBacklink = Readonly<{
  readonly path: string;
  readonly sources: readonly string[];
}>;

export type VaultLinkWorkbench = Readonly<{
  readonly kind: "metroplat.knowledge-vault.link-workbench";
  readonly files: number;
  readonly notes: readonly string[];
  readonly assets: readonly string[];
  readonly links: readonly VaultLinkWorkbenchReference[];
  readonly backlinks: readonly VaultLinkWorkbenchBacklink[];
  readonly unresolved: readonly VaultLinkWorkbenchReference[];
}>;

export type VaultLinkRewrite = Readonly<{
  readonly from: string;
  readonly to: string;
}>;

export type VaultLinkRewriteChange = Readonly<{
  readonly path: string;
  readonly replacements: number;
  readonly before: string;
  readonly after: string;
}>;

export type VaultLinkRewriteResult = Readonly<{
  readonly kind: "metroplat.knowledge-vault.link-rewrite-result";
  readonly files: VaultFiles;
  readonly changed: readonly VaultLinkRewriteChange[];
}>;

type ParsedVaultFile = Readonly<{
  readonly path: string;
  readonly frontMatter: VaultFrontMatter;
  readonly body: string;
  readonly features: readonly MarkdownFeature[];
  readonly title: string;
  readonly slug: string;
  readonly section?: string;
  readonly url: string;
  readonly aliases: readonly string[];
}>;

type VaultIndex = Readonly<{
  readonly notesByPath: ReadonlyMap<string, ParsedVaultFile>;
  readonly notesByKey: ReadonlyMap<string, ParsedVaultFile[]>;
  readonly assetsByKey: ReadonlyMap<string, string[]>;
}>;

type ResolvedReference =
  | Readonly<{ readonly kind: "note"; readonly href: string; readonly path: string; readonly anchor?: string }>
  | Readonly<{ readonly kind: "asset"; readonly href: string; readonly path: string; readonly anchor?: string }>
  | Readonly<{ readonly kind: "unresolved"; readonly href: string; readonly anchor?: string }>;

const MARKDOWN_EXT = /\.(?:md|markdown)$/iu;
const PATH_EMBEDDED_DATE = /(?:^|\/)(\d{4}-\d{2}-\d{2})/u;

function normalizeVaultPath(path: string): string {
  const clean = path.replace(/\\/gu, "/").replace(/^\.\/+/u, "");
  const parts: string[] = [];
  for (const part of clean.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function extensionOf(path: string): string {
  const name = path.split("/").at(-1) ?? path;
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index).toLowerCase();
}

function withoutMarkdownExtension(path: string): string {
  return path.replace(MARKDOWN_EXT, "");
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

function dirname(path: string): string {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function slugify(value: string): string {
  return contentSlug(value, "page");
}

function pathSlug(path: string): string {
  const stem = basename(withoutMarkdownExtension(path));
  const folder = dirname(path).split("/").filter(Boolean).at(-1);
  return slugify(/^(?:index|readme)$/iu.test(stem) && folder !== undefined ? folder : stem);
}

function sectionOf(path: string, frontMatter: VaultFrontMatter): string | undefined {
  const fromMatter = firstString(frontMatter, ["section", "category", "folder"]);
  if (fromMatter !== undefined) return slugify(fromMatter);
  const first = dirname(path).split("/").filter(Boolean)[0];
  return first === undefined ? undefined : slugify(first);
}

function urlOf(path: string, slug: string, section: string | undefined, frontMatter: VaultFrontMatter): string {
  const permalink = firstString(frontMatter, ["permalink", "url"]);
  if (permalink !== undefined && permalink.trim() !== "") {
    const value = permalink.trim();
    return value.startsWith("/") ? value : `/${value.replace(/^\/+/u, "")}`;
  }
  const folderParts = dirname(path).split("/").filter(Boolean).map(slugify);
  const routedParts = folderParts.length === 0 && section !== undefined ? [section] : folderParts;
  const stem = basename(withoutMarkdownExtension(path));
  const parts = /^(?:index|readme)$/iu.test(stem) ? routedParts : [...routedParts, slug];
  if (parts.length === 0) return "/";
  return `/${parts.join("/")}/`;
}

function normalizeBasePath(value: string | undefined): string {
  if (value === undefined || value.trim() === "") return "/";
  const clean = `/${value.replace(/^\/+|\/+$/gu, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
}

function prefixBasePath(href: string, basePath: string | undefined): string {
  const base = normalizeBasePath(basePath);
  if (base === "/" || !href.startsWith("/")) return href;
  if (href === base.slice(0, -1) || href.startsWith(base)) return href;
  const clean = href.replace(/^\/+/u, "");
  const prefixed = `${base}${clean}`;
  return prefixed.endsWith("/") || !href.endsWith("/") ? prefixed : `${prefixed}/`;
}

function readVaultMarkdown(text: string, path: string): {
  readonly frontMatter: VaultFrontMatter;
  readonly body: string;
  readonly features: readonly MarkdownFeature[];
} {
  try {
    const dataform = markdownDataform(text, {
      coordinate: path,
      frontmatterFormats: ["yaml"],
      jsonObjectFrontmatter: true,
    });
    return Object.freeze({
      frontMatter: requireJsonValue(dataform.frontmatter, `vault ${path} frontmatter`) as JsonRecord,
      body: dataform.body,
      features: dataform.features ?? markdownFeatures(dataform.body),
    });
  } catch (error) {
    throw new TypeError(`vault ${path}: ${(error as Error).message}`);
  }
}

function firstString(frontMatter: VaultFrontMatter, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = frontMatter[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
}

function stringList(value: JsonValue | undefined): readonly string[] | undefined {
  if (typeof value === "string") {
    const items = value.split(/[, ]+/u).map((item) => item.trim().replace(/^#/u, "")).filter(Boolean);
    return items.length === 0 ? undefined : Object.freeze(items);
  }
  if (Array.isArray(value)) {
    const items = value.flatMap((item) => typeof item === "string" ? [item.trim().replace(/^#/u, "")] : []).filter(Boolean);
    return items.length === 0 ? undefined : Object.freeze(items);
  }
  return undefined;
}

function firstHeading(body: string): string | undefined {
  for (const line of body.split(/\r?\n/u)) {
    const match = line.match(/^#\s+(.+?)\s*#*\s*$/u);
    if (match !== null && match[1] !== undefined && match[1].trim() !== "") return match[1].trim();
  }
  return undefined;
}

function aliasesOf(frontMatter: VaultFrontMatter): readonly string[] {
  const aliases = stringList(frontMatter["aliases"] ?? frontMatter["alias"]);
  return aliases ?? Object.freeze([]);
}

function titleOf(path: string, frontMatter: VaultFrontMatter, body: string): string {
  return firstString(frontMatter, ["title", "headline", "name"]) ?? firstHeading(body) ?? basename(withoutMarkdownExtension(path));
}

function addIndex(map: Map<string, ParsedVaultFile[]>, key: string, file: ParsedVaultFile): void {
  const clean = key.trim().toLowerCase();
  if (clean === "") return;
  const existing = map.get(clean);
  if (existing === undefined) map.set(clean, [file]);
  else if (!existing.some((item) => item.path === file.path)) existing.push(file);
}

function addAssetIndex(map: Map<string, string[]>, key: string, path: string): void {
  const clean = key.trim().toLowerCase();
  if (clean === "") return;
  const existing = map.get(clean);
  if (existing === undefined) map.set(clean, [path]);
  else if (!existing.includes(path)) existing.push(path);
}

function parseFiles(files: VaultFiles): { readonly markdown: readonly ParsedVaultFile[]; readonly assets: readonly string[] } {
  const markdown: ParsedVaultFile[] = [];
  const assets: string[] = [];
  for (const [rawPath, content] of Object.entries(files).sort(([left], [right]) => left.localeCompare(right))) {
    const path = normalizeVaultPath(rawPath);
    if (path === "") continue;
    if (!MARKDOWN_EXT.test(path)) {
      assets.push(path);
      continue;
    }
    const parsed = readVaultMarkdown(content, path);
    const title = titleOf(path, parsed.frontMatter, parsed.body);
    const slug = slugify(firstString(parsed.frontMatter, ["slug"]) ?? pathSlug(path));
    const section = sectionOf(path, parsed.frontMatter);
    const url = urlOf(path, slug, section, parsed.frontMatter);
    markdown.push(Object.freeze({
      path,
      frontMatter: parsed.frontMatter,
      body: parsed.body,
      features: parsed.features,
      title,
      slug,
      ...(section === undefined ? {} : { section }),
      url,
      aliases: aliasesOf(parsed.frontMatter),
    }));
  }
  return Object.freeze({ markdown: Object.freeze(markdown), assets: Object.freeze(assets.sort()) });
}

function buildIndex(markdown: readonly ParsedVaultFile[], assets: readonly string[]): VaultIndex {
  const notesByPath = new Map<string, ParsedVaultFile>();
  const notesByKey = new Map<string, ParsedVaultFile[]>();
  const assetsByKey = new Map<string, string[]>();
  for (const file of markdown) {
    notesByPath.set(file.path.toLowerCase(), file);
    const stem = withoutMarkdownExtension(file.path);
    for (const key of [file.path, stem, basename(stem), file.title, file.slug, ...file.aliases]) addIndex(notesByKey, key, file);
  }
  for (const asset of assets) {
    addAssetIndex(assetsByKey, asset, asset);
    addAssetIndex(assetsByKey, basename(asset), asset);
  }
  return Object.freeze({ notesByPath, notesByKey, assetsByKey });
}

function splitTarget(raw: string): { readonly target: string; readonly label: string | null } {
  const index = raw.indexOf("|");
  if (index < 0) return Object.freeze({ target: raw.trim(), label: null });
  return Object.freeze({ target: raw.slice(0, index).trim(), label: raw.slice(index + 1).trim() || null });
}

function splitAnchor(target: string): { readonly path: string; readonly anchor?: string } {
  const index = target.indexOf("#");
  if (index < 0) return Object.freeze({ path: target.trim() });
  const anchor = target.slice(index + 1).trim();
  return Object.freeze({ path: target.slice(0, index).trim(), ...(anchor === "" ? {} : { anchor }) });
}

function anchorFragment(anchor: string | undefined): string {
  if (anchor === undefined) return "";
  const clean = anchor.startsWith("^") ? anchor.slice(1) : slugify(anchor);
  return clean === "" ? "" : `#${encodeURIComponent(clean)}`;
}

function resolveUnique<T>(items: readonly T[] | undefined): T | undefined {
  return items !== undefined && items.length === 1 ? items[0] : undefined;
}

function noteAtPath(vaultPath: string, index: VaultIndex): ParsedVaultFile | undefined {
  const matches = markdownNodePresentationPaths(vaultPath)
    .flatMap((candidate) => {
      const note = index.notesByPath.get(candidate.toLowerCase());
      return note === undefined ? [] : [note];
    });
  return resolveUnique(matches);
}

function resolveNotePath(targetPath: string, current: ParsedVaultFile, index: VaultIndex): ParsedVaultFile | undefined {
  if (targetPath === "") return current;
  const normalized = normalizeVaultPath(targetPath);
  const exact = noteAtPath(normalized, index);
  if (exact !== undefined) return exact;
  const relativeBase = dirname(current.path);
  const relative = normalizeVaultPath([relativeBase, normalized].filter(Boolean).join("/"));
  const relativeExact = noteAtPath(relative, index);
  if (relativeExact !== undefined) return relativeExact;
  return resolveUnique(index.notesByKey.get(normalized.toLowerCase()))
    ?? resolveUnique(index.notesByKey.get(slugify(normalized)));
}

function resolveAssetPath(targetPath: string, current: ParsedVaultFile, index: VaultIndex): string | undefined {
  const normalized = normalizeVaultPath(targetPath);
  const exact = resolveUnique(index.assetsByKey.get(normalized.toLowerCase()));
  if (exact !== undefined) return exact;
  const relativeBase = dirname(current.path);
  const relative = normalizeVaultPath([relativeBase, normalized].filter(Boolean).join("/"));
  return resolveUnique(index.assetsByKey.get(relative.toLowerCase())) ?? resolveUnique(index.assetsByKey.get(basename(normalized).toLowerCase()));
}

function assetUrl(path: string): string {
  return `/${path.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

function resolveReference(target: string, current: ParsedVaultFile, index: VaultIndex, opts: VaultToContentOptions): ResolvedReference {
  const split = splitAnchor(target);
  const ext = extensionOf(split.path);
  const note = ext === "" || MARKDOWN_EXT.test(split.path) ? resolveNotePath(split.path, current, index) : undefined;
  if (note !== undefined) {
    return Object.freeze({
      kind: "note" as const,
      href: `${prefixBasePath(note.url, opts.basePath)}${anchorFragment(split.anchor)}`,
      path: note.path,
      ...(split.anchor === undefined ? {} : { anchor: split.anchor }),
    });
  }
  const asset = split.path === "" ? undefined : resolveAssetPath(split.path, current, index);
  if (asset !== undefined) {
    return Object.freeze({
      kind: "asset" as const,
      href: `${prefixBasePath(assetUrl(asset), opts.basePath)}${anchorFragment(split.anchor)}`,
      path: asset,
      ...(split.anchor === undefined ? {} : { anchor: split.anchor }),
    });
  }
  return Object.freeze({
    kind: "unresolved" as const,
    href: `${prefixBasePath(`/${slugify(split.path || target)}/`, opts.basePath)}${anchorFragment(split.anchor)}`,
    ...(split.anchor === undefined ? {} : { anchor: split.anchor }),
  });
}

function markdownLabel(split: { readonly target: string; readonly label: string | null }, resolved: ResolvedReference): string {
  if (split.label !== null) return split.label;
  if (resolved.kind !== "unresolved") return basename(withoutMarkdownExtension(resolved.path));
  return split.target.replace(/#.*$/u, "");
}

type RewritableMarkdownFeature = Extract<MarkdownFeature, { readonly type: "wikilink" | "transclusion" | "markdown-link" }>;

function rewritableMarkdownFeatures(features: readonly MarkdownFeature[]): readonly RewritableMarkdownFeature[] {
  return features.filter((feature): feature is RewritableMarkdownFeature =>
    feature.type === "wikilink" || feature.type === "transclusion" || feature.type === "markdown-link");
}

function resolveBody(file: ParsedVaultFile, index: VaultIndex, opts: VaultToContentOptions): {
  readonly body: string;
  readonly links: readonly VaultLink[];
  readonly embeds: readonly VaultEmbed[];
} {
  const links: VaultLink[] = [];
  const embeds: VaultEmbed[] = [];
  const parts: string[] = [];
  let cursor = 0;
  for (const feature of rewritableMarkdownFeatures(file.features)) {
    if (feature.span.start < cursor) continue;
    parts.push(file.body.slice(cursor, feature.span.start));
    if (feature.type === "markdown-link") {
      parts.push(rewriteMarkdownLinkFeature(feature, file, index, opts));
      cursor = feature.span.end;
      continue;
    }
    const resolved = resolveReference(feature.target, file, index, opts);
    const label = markdownLabel({ target: feature.target, label: feature.label }, resolved);
    if (feature.type === "transclusion") {
      const embed = Object.freeze({
        raw: feature.span.text,
        target: feature.target,
        label,
        href: resolved.href,
        ...(resolved.kind === "unresolved" ? { unresolved: true as const } : { path: resolved.path }),
        ...(resolved.anchor === undefined ? {} : { anchor: resolved.anchor }),
        asset: resolved.kind === "asset",
      });
      embeds.push(embed);
      parts.push(resolved.kind === "asset" ? `![${label}](${resolved.href})` : `[${label}](${resolved.href})`);
      cursor = feature.span.end;
      continue;
    }
    const link = Object.freeze({
      raw: feature.span.text,
      target: feature.target,
      label,
      href: resolved.href,
      ...(resolved.kind === "unresolved" ? { unresolved: true as const } : { path: resolved.path }),
      ...(resolved.anchor === undefined ? {} : { anchor: resolved.anchor }),
    });
    links.push(link);
    parts.push(`[${label}](${resolved.href})`);
    cursor = feature.span.end;
  }
  parts.push(file.body.slice(cursor));
  const body = parts.join("");
  return Object.freeze({ body, links: Object.freeze(links), embeds: Object.freeze(embeds) });
}

function rewriteMarkdownLinkFeature(
  feature: Extract<MarkdownFeature, { readonly type: "markdown-link" }>,
  file: ParsedVaultFile,
  index: VaultIndex,
  opts: VaultToContentOptions,
): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(feature.target)) return feature.span.text;
  const split = splitAnchor(feature.target);
  if (!MARKDOWN_EXT.test(split.path)) return feature.span.text;
  const resolved = resolveReference(feature.target, file, index, opts);
  if (resolved.kind === "unresolved") return feature.span.text;
  const title = feature.title === null ? "" : ` "${feature.title}"`;
  return `${feature.image ? "!" : ""}[${feature.label}](${resolved.href}${title})`;
}

function externalMarkdownTarget(target: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(target);
}

function linkWorkbenchReference(
  file: ParsedVaultFile,
  feature: RewritableMarkdownFeature,
  index: VaultIndex,
  opts: VaultToContentOptions,
): VaultLinkWorkbenchReference {
  if (feature.type === "markdown-link" && externalMarkdownTarget(feature.target)) {
    return Object.freeze({
      from: file.path,
      type: feature.type,
      raw: feature.span.text,
      target: feature.target,
      label: feature.label,
      href: feature.target,
      resolvedKind: "external" as const,
      ...(feature.image ? { image: true as const } : {}),
      span: feature.span,
    });
  }
  const resolved = resolveReference(feature.target, file, index, opts);
  const label = feature.type === "markdown-link"
    ? feature.label
    : markdownLabel({ target: feature.target, label: feature.label }, resolved);
  return Object.freeze({
    from: file.path,
    type: feature.type,
    raw: feature.span.text,
    target: feature.target,
    label,
    href: resolved.href,
    resolvedKind: resolved.kind,
    ...(resolved.kind === "unresolved" ? {} : { path: resolved.path }),
    ...(resolved.anchor === undefined ? {} : { anchor: resolved.anchor }),
    ...(feature.type === "markdown-link" && feature.image ? { image: true as const } : {}),
    span: feature.span,
  });
}

function linkWorkbenchReferences(file: ParsedVaultFile, index: VaultIndex, opts: VaultToContentOptions): readonly VaultLinkWorkbenchReference[] {
  return Object.freeze(rewritableMarkdownFeatures(file.features).map((feature) => linkWorkbenchReference(file, feature, index, opts)));
}

function backlinksOf(links: readonly VaultLinkWorkbenchReference[]): readonly VaultLinkWorkbenchBacklink[] {
  const sourcesByTarget = new Map<string, Set<string>>();
  for (const link of links) {
    if (link.resolvedKind !== "note" || link.path === undefined) continue;
    const sources = sourcesByTarget.get(link.path) ?? new Set<string>();
    sources.add(link.from);
    sourcesByTarget.set(link.path, sources);
  }
  return Object.freeze([...sourcesByTarget.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, sources]) => Object.freeze({ path, sources: Object.freeze([...sources].sort()) })));
}

export function vaultLinkWorkbench(files: VaultFiles, opts: VaultToContentOptions = Object.freeze({})): VaultLinkWorkbench {
  const parsed = parseFiles(files);
  const index = buildIndex(parsed.markdown, parsed.assets);
  const links = Object.freeze(parsed.markdown.flatMap((file) => linkWorkbenchReferences(file, index, opts)));
  return Object.freeze({
    kind: "metroplat.knowledge-vault.link-workbench" as const,
    files: Object.keys(files).length,
    notes: Object.freeze(parsed.markdown.map((file) => file.path)),
    assets: parsed.assets,
    links,
    backlinks: backlinksOf(links),
    unresolved: Object.freeze(links.filter((link) => link.resolvedKind === "unresolved")),
  });
}

function rewriteMatches(rewrite: VaultLinkRewrite, resolved: ResolvedReference): boolean {
  if (resolved.kind !== "note") return false;
  const from = normalizeVaultPath(rewrite.from);
  const resolvedPath = normalizeVaultPath(resolved.path);
  if (from === resolvedPath) return true;
  return withoutMarkdownExtension(from) === withoutMarkdownExtension(resolvedPath);
}

function rewriteForResolved(rewrites: readonly VaultLinkRewrite[], resolved: ResolvedReference): VaultLinkRewrite | undefined {
  return rewrites.find((rewrite) => rewriteMatches(rewrite, resolved));
}

function targetWithAnchor(path: string, anchor: string | undefined): string {
  return anchor === undefined ? path : `${path}#${anchor}`;
}

function rewriteFeatureText(
  feature: RewritableMarkdownFeature,
  file: ParsedVaultFile,
  index: VaultIndex,
  rewrites: readonly VaultLinkRewrite[],
  opts: VaultToContentOptions,
): string | undefined {
  if (feature.type === "markdown-link" && externalMarkdownTarget(feature.target)) return undefined;
  const resolved = resolveReference(feature.target, file, index, opts);
  const rewrite = rewriteForResolved(rewrites, resolved);
  if (rewrite === undefined) return undefined;
  const nextTarget = targetWithAnchor(rewrite.to, resolved.anchor);
  if (feature.type === "markdown-link") {
    const title = feature.title === null ? "" : ` "${feature.title}"`;
    return `${feature.image ? "!" : ""}[${feature.label}](${nextTarget}${title})`;
  }
  const label = feature.label === null ? "" : `|${feature.label}`;
  return `${feature.type === "transclusion" ? "!" : ""}[[${nextTarget}${label}]]`;
}

function replaceMarkdownBody(text: string, body: string): string {
  const fence = splitFrontMatterFence(text);
  if (fence === null) return body;
  return `${text.slice(0, text.length - fence.body.length)}${body}`;
}

function rewriteFileLinks(
  file: ParsedVaultFile,
  original: string,
  index: VaultIndex,
  rewrites: readonly VaultLinkRewrite[],
  opts: VaultToContentOptions,
): VaultLinkRewriteChange | undefined {
  const parts: string[] = [];
  let cursor = 0;
  let replacements = 0;
  for (const feature of rewritableMarkdownFeatures(file.features)) {
    if (feature.span.start < cursor) continue;
    const replacement = rewriteFeatureText(feature, file, index, rewrites, opts);
    if (replacement === undefined) continue;
    parts.push(file.body.slice(cursor, feature.span.start), replacement);
    cursor = feature.span.end;
    replacements += 1;
  }
  if (replacements === 0) return undefined;
  parts.push(file.body.slice(cursor));
  return Object.freeze({
    path: file.path,
    replacements,
    before: original,
    after: replaceMarkdownBody(original, parts.join("")),
  });
}

export function rewriteVaultLinkTargets(
  files: VaultFiles,
  rewrites: readonly VaultLinkRewrite[],
  opts: VaultToContentOptions = Object.freeze({}),
): VaultLinkRewriteResult {
  const parsed = parseFiles(files);
  const index = buildIndex(parsed.markdown, parsed.assets);
  const next: Record<string, string> = { ...files };
  const changes: VaultLinkRewriteChange[] = [];
  for (const file of parsed.markdown) {
    const original = files[file.path];
    if (original === undefined) continue;
    const change = rewriteFileLinks(file, original, index, rewrites, opts);
    if (change === undefined) continue;
    next[file.path] = change.after;
    changes.push(change);
  }
  return Object.freeze({
    kind: "metroplat.knowledge-vault.link-rewrite-result" as const,
    files: Object.freeze(next),
    changed: Object.freeze(changes),
  });
}

function buildArticleCandidate(file: ParsedVaultFile, body: string, date: string): Article {
  const frontMatter = file.frontMatter;
  const author = firstString(frontMatter, ["author", "byline"]) ?? "unknown";
  const rawDraft = frontMatter["draft"];
  const draft = typeof rawDraft === "boolean" ? rawDraft : rawDraft === "true";
  const tags = stringList(frontMatter["tags"]);
  const keywords = stringList(frontMatter["keywords"]);
  const categories = stringList(frontMatter["categories"] ?? frontMatter["category"]);
  const candidate = {
    title: file.title,
    slug: file.slug,
    author,
    date,
    draft,
    ...(file.section === undefined ? {} : { section: file.section }),
    ...(firstString(frontMatter, ["updated", "modified"]) === undefined ? {} : { updated: firstString(frontMatter, ["updated", "modified"])! }),
    ...(firstString(frontMatter, ["beat"]) === undefined ? {} : { beat: firstString(frontMatter, ["beat"])! }),
    ...(firstString(frontMatter, ["seoTerm", "seo_term"]) === undefined ? {} : { seoTerm: firstString(frontMatter, ["seoTerm", "seo_term"])! }),
    ...(firstString(frontMatter, ["excerpt"]) === undefined ? {} : { excerpt: firstString(frontMatter, ["excerpt"])! }),
    ...(firstString(frontMatter, ["metaDescription", "meta_description"]) === undefined ? {} : { metaDescription: firstString(frontMatter, ["metaDescription", "meta_description"])! }),
    ...(firstString(frontMatter, ["description"]) === undefined ? {} : { description: firstString(frontMatter, ["description"])! }),
    ...(firstString(frontMatter, ["summary"]) === undefined ? {} : { summary: firstString(frontMatter, ["summary"])! }),
    ...(keywords === undefined ? {} : { keywords }),
    ...(categories === undefined ? {} : { categories }),
    ...(tags === undefined ? {} : { tags }),
    ...(firstString(frontMatter, ["license"]) === undefined ? {} : { license: firstString(frontMatter, ["license"])! }),
    ...(firstString(frontMatter, ["license_url"]) === undefined ? {} : { license_url: firstString(frontMatter, ["license_url"])! }),
    ...(firstString(frontMatter, ["syndication_rights"]) === undefined ? {} : { syndication_rights: firstString(frontMatter, ["syndication_rights"])! }),
    body,
  };
  return candidate as Article;
}

/** A generic dated article candidate must carry body text; posts-path entries handle body-less dated notes below. */
function frontmatterPublicationDate(file: ParsedVaultFile): PublicationDateReadout {
  return publicationDateReadout([
    { source: "frontmatter:date", value: firstString(file.frontMatter, ["date"]) },
    { source: "frontmatter:published", value: firstString(file.frontMatter, ["published"]) },
    { source: "frontmatter:published_at", value: firstString(file.frontMatter, ["published_at"]) },
  ]);
}

function postsPathPublicationDate(file: ParsedVaultFile, opts: VaultToContentOptions): PublicationDateReadout | null {
  if (opts.postsPath === undefined || !isUnderPostsPath(file.path, opts.postsPath)) return null;
  return publicationDateReadout([
    { source: "frontmatter:date", value: firstString(file.frontMatter, ["date"]) },
    { source: "frontmatter:published", value: firstString(file.frontMatter, ["published"]) },
    { source: "frontmatter:published_at", value: firstString(file.frontMatter, ["published_at"]) },
    { source: "frontmatter:date-created", value: firstString(file.frontMatter, ["date-created"]) },
    { source: "frontmatter:created", value: firstString(file.frontMatter, ["created"]) },
    { source: "path", value: dateFromPath(file.path) },
  ]);
}

function articleCandidate(file: ParsedVaultFile, body: string, date: PublicationDateReadout): Article | null {
  if (date.charge !== "held" || date.date === undefined) return null;
  if (body.trim() === "") return null;
  const candidate = buildArticleCandidate(file, body, date.date);
  return articleContract.validate(candidate) ? candidate : null;
}

function dateFromPath(path: string): string | undefined {
  return path.match(PATH_EMBEDDED_DATE)?.[1];
}

function isUnderPostsPath(path: string, postsPath: string): boolean {
  const clean = postsPath.replace(/^\/+|\/+$/gu, "");
  return clean !== "" && (path === clean || path.startsWith(`${clean}/`));
}

/**
 * Promote a page under `postsPath` to an article unconditionally, using a
 * `YYYY-MM-DD` segment embedded in its path (a common vault convention for
 * dated notes) as the fallback date when no frontmatter date is present.
 * Creation-time frontmatter keys (`date-created`, `created`) count as a date
 * here, wider than the general article date fields, since posts folders
 * commonly rely on note-creation timestamps rather than an explicit publish
 * date. Unlike `articleCandidate`, this does not require the strict
 * Article shape: a posts folder is expected to hold short-form, even body-less,
 * dated entries.
 */
function postsPathArticleCandidate(file: ParsedVaultFile, body: string, opts: VaultToContentOptions, date: PublicationDateReadout): Article | null {
  if (date.charge !== "held" || date.date === undefined) return null;
  const author = firstString(file.frontMatter, ["author", "byline"]) ?? opts.postsAuthor ?? "unknown";
  return buildArticleCandidate({ ...file, frontMatter: { ...file.frontMatter, author } }, body, date.date);
}

function pageCandidate(file: ParsedVaultFile, body: string, url: string): Page {
  const tags = stringList(file.frontMatter["tags"]);
  const date = firstString(file.frontMatter, ["date"]);
  const candidate = {
    title: file.title,
    slug: file.slug,
    path: file.path,
    url,
    ...(file.section === undefined ? {} : { section: file.section }),
    ...(date === undefined ? {} : { date }),
    ...(tags === undefined ? {} : { tags }),
    frontMatter: requireJsonValue(file.frontMatter, `vault ${file.path} frontMatter`) as JsonRecord,
    body,
  };
  return pageContract.assert(candidate, `vault page ${file.path}`) as Page;
}

/** Ingest an in-memory Obsidian vault map into Article and Page content records. */
export function vaultToContent(files: VaultFiles, opts: VaultToContentOptions = Object.freeze({})): VaultIngestion {
  const parsed = parseFiles(files);
  const index = buildIndex(parsed.markdown, parsed.assets);
  const notes: VaultNoteContent[] = [];
  const articles: Article[] = [];
  const pages: Page[] = [];
  for (const file of parsed.markdown) {
    const url = prefixBasePath(file.url, opts.basePath);
    const resolved = resolveBody(file, index, opts);
    const decodedReferences = referencesOfFrontmatter(file.frontMatter);
    const postsDate = postsPathPublicationDate(file, opts);
    const publicationDate = postsDate ?? frontmatterPublicationDate(file);
    const article = postsDate === null
      ? articleCandidate(file, resolved.body, publicationDate)
      : postsPathArticleCandidate(file, resolved.body, opts, publicationDate);
    if (article !== null) {
      articles.push(article);
      notes.push(Object.freeze({
        kind: "article" as const,
        path: file.path,
        url,
        ...(file.section === undefined ? {} : { section: file.section }),
        frontMatter: file.frontMatter,
        links: resolved.links,
        embeds: resolved.embeds,
        references: decodedReferences.items,
        referenceDialect: decodedReferences.dialect,
        publicationDate,
        content: article,
      }));
      continue;
    }
    const page = pageCandidate(file, resolved.body, url);
    pages.push(page);
    notes.push(Object.freeze({
      kind: "page" as const,
      path: file.path,
      url,
      ...(file.section === undefined ? {} : { section: file.section }),
      frontMatter: file.frontMatter,
      links: resolved.links,
      embeds: resolved.embeds,
      references: decodedReferences.items,
      referenceDialect: decodedReferences.dialect,
      publicationDate,
      content: page,
    }));
  }
  return Object.freeze({ notes: Object.freeze(notes), articles: Object.freeze(articles), pages: Object.freeze(pages) });
}

/**
 * Read a digital-garden link graph as the finite cover nerve bounded by its
 * undirected, resolved note links.
 *
 * Vertices are distinct graph note paths. Links are treated as undirected and
 * deduplicated, dangling links are dropped from both vertex and edge counts,
 * and self-links are not counted as edges. The nerve is read off a real
 * `cohomologyOfEdgeGraph` cohomology object (`core/closure/cohomology.mjs`) —
 * union-find and component counting are that primitive's own job, not
 * reimplemented here.
 */
export function vaultLinkGraphNerve(graph: DigitalGardenGraph): CoverNerve {
  const noteByKey = new Map<string, string>();
  for (const note of graph.notes) {
    const key = note.path.toLowerCase();
    if (!noteByKey.has(key)) noteByKey.set(key, note.path);
  }

  const edges = new Set<string>();
  const edgePairs: (readonly [string, string])[] = [];
  for (const link of graph.links) {
    const source = noteByKey.get(link.fromPath.toLowerCase());
    const target = noteByKey.get(link.toPath.toLowerCase());
    if (source === undefined || target === undefined || source === target) continue;
    const [left, right] = source < target ? [source, target] : [target, source];
    const edge = `${left}\u0000${right}`;
    if (edges.has(edge)) continue;
    edges.add(edge);
    edgePairs.push([left, right]);
  }
  return coverNerveOfCohomology(cohomologyOfEdgeGraph([...noteByKey.values()], edgePairs));
}

/** Return the matter-topology receipt carried by a vault link graph nerve. */
export function vaultLinkGraphMatter(graph: DigitalGardenGraph): MatterTopologyReceipt {
  return matterTopology.matterTopologyReceipt(vaultLinkGraphNerve(graph));
}
