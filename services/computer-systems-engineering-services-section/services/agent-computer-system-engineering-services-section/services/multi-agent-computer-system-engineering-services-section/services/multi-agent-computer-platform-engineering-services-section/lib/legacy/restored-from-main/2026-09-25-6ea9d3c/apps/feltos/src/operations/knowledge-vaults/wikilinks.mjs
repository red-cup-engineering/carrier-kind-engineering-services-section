/**
 * knowledge-vault/src/wikilinks - pure Obsidian vault ingestion.
 *
 * Callers supply the in-memory vault map; this module performs no filesystem IO.
 */
import { articleContract } from "@red-cup-engineering/static-site-publisher/sites/article";
import { pageContract } from "@red-cup-engineering/static-site-publisher/sites/page";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { readMarkdownFeatures } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-features";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/markdown-engineering-services-section/split-markdown-frontmatter-fence";
import { markdownDataform } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { slugify as slugifyText } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";
import { markdownNodePresentationPaths } from "@red-cup-engineering/computer-system-engine/addressing/markdown-node";
import { referencesOfFrontmatter } from "@red-cup-engineering/csl-json-services-section/csl-references";
import { publicationDateReadout } from "@red-cup-engineering/static-site-publisher/sites/publication-date";
import { coverNerve } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/coordination-cohomology";
import { cohomologyOfEdgeGraph } from "@red-cup-engineering/computer-networking-engineering-services-section/signgraph/cohomology";
import * as matterTopology from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/matter-topology";

const MARKDOWN_EXT = /\.(?:md|markdown)$/iu;
const PATH_EMBEDDED_DATE = /(?:^|\/)(\d{4}-\d{2}-\d{2})/u;

function normalizeVaultPath(path) {
  const clean = path.replace(/\\/gu, "/").replace(/^\.\/+/u, "");
  const parts = [];
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

function extensionOf(path) {
  const name = path.split("/").at(-1) ?? path;
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index).toLowerCase();
}

function withoutMarkdownExtension(path) {
  return path.replace(MARKDOWN_EXT, "");
}

function basename(path) {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

function dirname(path) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function slugify(value) {
  return slugifyText(value) || "page";
}

function pathSlug(path) {
  const stem = basename(withoutMarkdownExtension(path));
  const folder = dirname(path).split("/").filter(Boolean).at(-1);
  return slugify(/^(?:index|readme)$/iu.test(stem) && folder !== undefined ? folder : stem);
}

function sectionOf(path, frontMatter) {
  const fromMatter = firstString(frontMatter, ["section", "category", "folder"]);
  if (fromMatter !== undefined) return slugify(fromMatter);
  const first = dirname(path).split("/").filter(Boolean)[0];
  return first === undefined ? undefined : slugify(first);
}

function urlOf(path, slug, section, frontMatter) {
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

function normalizeBasePath(value) {
  if (value === undefined || value.trim() === "") return "/";
  const clean = `/${value.replace(/^\/+|\/+$/gu, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
}

function prefixBasePath(href, basePath) {
  const base = normalizeBasePath(basePath);
  if (base === "/" || !href.startsWith("/")) return href;
  if (href === base.slice(0, -1) || href.startsWith(base)) return href;
  const clean = href.replace(/^\/+/u, "");
  const prefixed = `${base}${clean}`;
  return prefixed.endsWith("/") || !href.endsWith("/") ? prefixed : `${prefixed}/`;
}

function readVaultMarkdown(text, path)

 {
  try {
    const dataform = markdownDataform(text, {
      coordinate: path,
      frontmatterFormats: ["yaml"],
      jsonObjectFrontmatter: true,
    });
    return Object.freeze({
      frontMatter: requireJsonValue(dataform.frontmatter, `vault ${path} frontmatter`),
      body: dataform.body,
      features: dataform.features ?? readMarkdownFeatures(dataform.body),
    });
  } catch (error) {
    throw new TypeError(`vault ${path}: ${(error).message}`);
  }
}

function firstString(frontMatter, keys) {
  for (const key of keys) {
    const value = frontMatter[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
}

function stringList(value) {
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

function firstHeading(body) {
  for (const line of body.split(/\r?\n/u)) {
    const match = line.match(/^#\s+(.+?)\s*#*\s*$/u);
    if (match !== null && match[1] !== undefined && match[1].trim() !== "") return match[1].trim();
  }
  return undefined;
}

function aliasesOf(frontMatter) {
  const aliases = stringList(frontMatter["aliases"] ?? frontMatter["alias"]);
  return aliases ?? Object.freeze([]);
}

function titleOf(path, frontMatter, body) {
  return firstString(frontMatter, ["title", "headline", "name"]) ?? firstHeading(body) ?? basename(withoutMarkdownExtension(path));
}

function addIndex(map, key, file) {
  const clean = key.trim().toLowerCase();
  if (clean === "") return;
  const existing = map.get(clean);
  if (existing === undefined) map.set(clean, [file]);
  else if (!existing.some((item) => item.path === file.path)) existing.push(file);
}

function addAssetIndex(map, key, path) {
  const clean = key.trim().toLowerCase();
  if (clean === "") return;
  const existing = map.get(clean);
  if (existing === undefined) map.set(clean, [path]);
  else if (!existing.includes(path)) existing.push(path);
}

function parseFiles(files) {
  const markdown = [];
  const assets = [];
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

function buildIndex(markdown, assets) {
  const notesByPath = new Map();
  const notesByKey = new Map();
  const assetsByKey = new Map();
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

function splitTarget(raw) {
  const index = raw.indexOf("|");
  if (index < 0) return Object.freeze({ target: raw.trim(), label: null });
  return Object.freeze({ target: raw.slice(0, index).trim(), label: raw.slice(index + 1).trim() || null });
}

function splitAnchor(target) {
  const index = target.indexOf("#");
  if (index < 0) return Object.freeze({ path: target.trim() });
  const anchor = target.slice(index + 1).trim();
  return Object.freeze({ path: target.slice(0, index).trim(), ...(anchor === "" ? {} : { anchor }) });
}

function anchorFragment(anchor) {
  if (anchor === undefined) return "";
  const clean = anchor.startsWith("^") ? anchor.slice(1) : slugify(anchor);
  return clean === "" ? "" : `#${encodeURIComponent(clean)}`;
}

function resolveUnique(items) {
  return items !== undefined && items.length === 1 ? items[0] : undefined;
}

function noteAtPath(vaultPath, index) {
  const matches = markdownNodePresentationPaths(vaultPath)
    .flatMap((candidate) => {
      const note = index.notesByPath.get(candidate.toLowerCase());
      return note === undefined ? [] : [note];
    });
  return resolveUnique(matches);
}

function resolveNotePath(targetPath, current, index) {
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

function resolveAssetPath(targetPath, current, index) {
  const normalized = normalizeVaultPath(targetPath);
  const exact = resolveUnique(index.assetsByKey.get(normalized.toLowerCase()));
  if (exact !== undefined) return exact;
  const relativeBase = dirname(current.path);
  const relative = normalizeVaultPath([relativeBase, normalized].filter(Boolean).join("/"));
  return resolveUnique(index.assetsByKey.get(relative.toLowerCase())) ?? resolveUnique(index.assetsByKey.get(basename(normalized).toLowerCase()));
}

function assetUrl(path) {
  return `/${path.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

function resolveReference(target, current, index, opts) {
  const split = splitAnchor(target);
  const ext = extensionOf(split.path);
  const note = ext === "" || MARKDOWN_EXT.test(split.path) ? resolveNotePath(split.path, current, index) : undefined;
  if (note !== undefined) {
    return Object.freeze({
      kind: "note",
      href: `${prefixBasePath(note.url, opts.basePath)}${anchorFragment(split.anchor)}`,
      path: note.path,
      ...(split.anchor === undefined ? {} : { anchor: split.anchor }),
    });
  }
  const asset = split.path === "" ? undefined : resolveAssetPath(split.path, current, index);
  if (asset !== undefined) {
    return Object.freeze({
      kind: "asset",
      href: `${prefixBasePath(assetUrl(asset), opts.basePath)}${anchorFragment(split.anchor)}`,
      path: asset,
      ...(split.anchor === undefined ? {} : { anchor: split.anchor }),
    });
  }
  return Object.freeze({
    kind: "unresolved",
    href: `${prefixBasePath(`/${slugify(split.path || target)}/`, opts.basePath)}${anchorFragment(split.anchor)}`,
    ...(split.anchor === undefined ? {} : { anchor: split.anchor }),
  });
}

function markdownLabel(split, resolved) {
  if (split.label !== null) return split.label;
  if (resolved.kind !== "unresolved") return basename(withoutMarkdownExtension(resolved.path));
  return split.target.replace(/#.*$/u, "");
}

function rewritableMarkdownFeatures(features) {
  return features.filter((feature) =>
    feature.type === "wikilink" || feature.type === "transclusion" || feature.type === "markdown-link");
}

function resolveBody(file, index, opts)

 {
  const links = [];
  const embeds = [];
  const parts = [];
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
        ...(resolved.kind === "unresolved" ? { unresolved: true } : { path: resolved.path }),
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
      ...(resolved.kind === "unresolved" ? { unresolved: true } : { path: resolved.path }),
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
  feature,
  file,
  index,
  opts,
) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(feature.target)) return feature.span.text;
  const split = splitAnchor(feature.target);
  if (!MARKDOWN_EXT.test(split.path)) return feature.span.text;
  const resolved = resolveReference(feature.target, file, index, opts);
  if (resolved.kind === "unresolved") return feature.span.text;
  const title = feature.title === null ? "" : ` "${feature.title}"`;
  return `${feature.image ? "!" : ""}[${feature.label}](${resolved.href}${title})`;
}

function externalMarkdownTarget(target) {
  return /^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(target);
}

function linkWorkbenchReference(
  file,
  feature,
  index,
  opts,
) {
  if (feature.type === "markdown-link" && externalMarkdownTarget(feature.target)) {
    return Object.freeze({
      from: file.path,
      type: feature.type,
      raw: feature.span.text,
      target: feature.target,
      label: feature.label,
      href: feature.target,
      resolvedKind: "external",
      ...(feature.image ? { image: true } : {}),
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
    ...(feature.type === "markdown-link" && feature.image ? { image: true } : {}),
    span: feature.span,
  });
}

function linkWorkbenchReferences(file, index, opts) {
  return Object.freeze(rewritableMarkdownFeatures(file.features).map((feature) => linkWorkbenchReference(file, feature, index, opts)));
}

function backlinksOf(links) {
  const sourcesByTarget = new Map();
  for (const link of links) {
    if (link.resolvedKind !== "note" || link.path === undefined) continue;
    const sources = sourcesByTarget.get(link.path) ?? new Set();
    sources.add(link.from);
    sourcesByTarget.set(link.path, sources);
  }
  return Object.freeze([...sourcesByTarget.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, sources]) => Object.freeze({ path, sources: Object.freeze([...sources].sort()) })));
}

export function vaultLinkWorkbench(files, opts = Object.freeze({})) {
  const parsed = parseFiles(files);
  const index = buildIndex(parsed.markdown, parsed.assets);
  const links = Object.freeze(parsed.markdown.flatMap((file) => linkWorkbenchReferences(file, index, opts)));
  return Object.freeze({
    kind: "metroplat.knowledge-vault.link-workbench",
    files: Object.keys(files).length,
    notes: Object.freeze(parsed.markdown.map((file) => file.path)),
    assets: parsed.assets,
    links,
    backlinks: backlinksOf(links),
    unresolved: Object.freeze(links.filter((link) => link.resolvedKind === "unresolved")),
  });
}

function rewriteMatches(rewrite, resolved) {
  if (resolved.kind !== "note") return false;
  const from = normalizeVaultPath(rewrite.from);
  const resolvedPath = normalizeVaultPath(resolved.path);
  if (from === resolvedPath) return true;
  return withoutMarkdownExtension(from) === withoutMarkdownExtension(resolvedPath);
}

function rewriteForResolved(rewrites, resolved) {
  return rewrites.find((rewrite) => rewriteMatches(rewrite, resolved));
}

function targetWithAnchor(path, anchor) {
  return anchor === undefined ? path : `${path}#${anchor}`;
}

function rewriteFeatureText(
  feature,
  file,
  index,
  rewrites,
  opts,
) {
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

function replaceMarkdownBody(text, body) {
  const fence = splitMarkdownFrontmatterFence(text);
  if (fence === null) return body;
  return `${text.slice(0, text.length - fence.body.length)}${body}`;
}

function rewriteFileLinks(
  file,
  original,
  index,
  rewrites,
  opts,
) {
  const parts = [];
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
  files,
  rewrites,
  opts = Object.freeze({}),
) {
  const parsed = parseFiles(files);
  const index = buildIndex(parsed.markdown, parsed.assets);
  const next = { ...files };
  const changes = [];
  for (const file of parsed.markdown) {
    const original = files[file.path];
    if (original === undefined) continue;
    const change = rewriteFileLinks(file, original, index, rewrites, opts);
    if (change === undefined) continue;
    next[file.path] = change.after;
    changes.push(change);
  }
  return Object.freeze({
    kind: "metroplat.knowledge-vault.link-rewrite-result",
    files: Object.freeze(next),
    changed: Object.freeze(changes),
  });
}

function buildArticleCandidate(file, body, date) {
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
    ...(firstString(frontMatter, ["updated", "modified"]) === undefined ? {} : { updated: firstString(frontMatter, ["updated", "modified"]) }),
    ...(firstString(frontMatter, ["beat"]) === undefined ? {} : { beat: firstString(frontMatter, ["beat"]) }),
    ...(firstString(frontMatter, ["seoTerm", "seo_term"]) === undefined ? {} : { seoTerm: firstString(frontMatter, ["seoTerm", "seo_term"]) }),
    ...(firstString(frontMatter, ["excerpt"]) === undefined ? {} : { excerpt: firstString(frontMatter, ["excerpt"]) }),
    ...(firstString(frontMatter, ["metaDescription", "meta_description"]) === undefined ? {} : { metaDescription: firstString(frontMatter, ["metaDescription", "meta_description"]) }),
    ...(firstString(frontMatter, ["description"]) === undefined ? {} : { description: firstString(frontMatter, ["description"]) }),
    ...(firstString(frontMatter, ["summary"]) === undefined ? {} : { summary: firstString(frontMatter, ["summary"]) }),
    ...(keywords === undefined ? {} : { keywords }),
    ...(categories === undefined ? {} : { categories }),
    ...(tags === undefined ? {} : { tags }),
    ...(firstString(frontMatter, ["license"]) === undefined ? {} : { license: firstString(frontMatter, ["license"]) }),
    ...(firstString(frontMatter, ["license_url"]) === undefined ? {} : { license_url: firstString(frontMatter, ["license_url"]) }),
    ...(firstString(frontMatter, ["syndication_rights"]) === undefined ? {} : { syndication_rights: firstString(frontMatter, ["syndication_rights"]) }),
    body,
  };
  return candidate;
}

/** A generic dated article candidate must carry body text; posts-path entries handle body-less dated notes below. */
function frontmatterPublicationDate(file) {
  return publicationDateReadout([
    { source: "frontmatter:date", value: firstString(file.frontMatter, ["date"]) },
    { source: "frontmatter:published", value: firstString(file.frontMatter, ["published"]) },
    { source: "frontmatter:published_at", value: firstString(file.frontMatter, ["published_at"]) },
  ]);
}

function postsPathPublicationDate(file, opts) {
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

function articleCandidate(file, body, date) {
  if (date.reading !== "held" || date.date === undefined) return null;
  if (body.trim() === "") return null;
  const candidate = buildArticleCandidate(file, body, date.date);
  return articleContract.validate(candidate) ? candidate : null;
}

function dateFromPath(path) {
  return path.match(PATH_EMBEDDED_DATE)?.[1];
}

function isUnderPostsPath(path, postsPath) {
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
function postsPathArticleCandidate(file, body, opts, date) {
  if (date.reading !== "held" || date.date === undefined) return null;
  const author = firstString(file.frontMatter, ["author", "byline"]) ?? opts.postsAuthor ?? "unknown";
  return buildArticleCandidate({ ...file, frontMatter: { ...file.frontMatter, author } }, body, date.date);
}

function pageCandidate(file, body, url) {
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
    frontMatter: requireJsonValue(file.frontMatter, `vault ${file.path} frontMatter`),
    body,
  };
  return pageContract.assert(candidate, `vault page ${file.path}`);
}

/** Ingest an in-memory Obsidian vault map into Article and Page content records. */
export function vaultToContent(files, opts = Object.freeze({})) {
  const parsed = parseFiles(files);
  const index = buildIndex(parsed.markdown, parsed.assets);
  const notes = [];
  const articles = [];
  const pages = [];
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
        kind: "article",
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
      kind: "page",
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
 * `cohomologyOfEdgeGraph` cohomology object (SignGraph) —
 * union-find and component counting are that primitive's own job, not
 * reimplemented here.
 */
export function vaultLinkGraphNerve(graph) {
  const noteByKey = new Map();
  for (const note of graph.notes) {
    const key = note.path.toLowerCase();
    if (!noteByKey.has(key)) noteByKey.set(key, note.path);
  }

  const edges = new Set();
  const edgePairs = [];
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
  const linkGraph = cohomologyOfEdgeGraph([...noteByKey.values()], edgePairs);
  return coverNerve(linkGraph.entities.length, linkGraph.cells.length, linkGraph.zeroCohomology.rank);
}

/** Return the matter-topology receipt carried by a vault link graph nerve. */
export function vaultLinkGraphMatter(graph) {
  return matterTopology.matterTopologyReceipt(vaultLinkGraphNerve(graph));
}
