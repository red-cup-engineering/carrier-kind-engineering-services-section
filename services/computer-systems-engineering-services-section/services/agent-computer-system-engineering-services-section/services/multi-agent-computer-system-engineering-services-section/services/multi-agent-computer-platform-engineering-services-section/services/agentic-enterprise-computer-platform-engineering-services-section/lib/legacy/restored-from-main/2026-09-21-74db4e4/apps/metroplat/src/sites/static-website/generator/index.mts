/**
 * integrations/web/core/static-website/generator - pure GitHub Pages-ready file tree projection.
 *
 * This face composes the existing Article HTML, feed, sitemap, and robots
 * projections. It returns an output tree; callers own persistence and deploys.
 */
import type { Article } from "../../article/index.mts";
import type { Page } from "../../page/index.mts";
import { articlesToJsonFeed, type JsonFeedMeta } from "../../codec/feed.mts";
import { escapeAttr } from "@red-cup-engineering/html-structural-projection-service";
import { htmlElement, htmlFragment, renderHtmlDocument } from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { articlesToAtom, type ArticleFeedMeta } from "../../codec/atom.mts";
import { articlesToRss, type RssFeedMeta } from "../../codec/rss.mts";
import { urlsToSitemap, type SitemapUrlEntry } from "../../codec/sitemap.mts";
import { articleToHtmlPage, articlesToHFeed } from "../render/article-html.mts";
import { pageToHtmlPage, type PageHtmlOptions } from "../render/page-html.mts";
import {
  livingWebIndieWebPageProfile,
  staticDocumentToThemedPageStylesheet,
  themedPageBodyAttributes,
  themedPageStyleTag,
  type ThemedPageProfile,
} from "../render/themed-page.mts";
import { robotsTxt } from "../../../integrations/http/robots.mts";
import type { ArticleHtmlOptions } from "../render/article-html.mts";
import type { RobotsTxtOptions } from "../../../integrations/http/robots.mts";

export type StaticWebsiteFileMap = ReadonlyMap<string, string>;

export type StaticWebsiteArticleContent = Article & {
  readonly path?: string;
  readonly outputPath?: string;
  readonly permalink?: string;
  readonly url?: string;
};

export type StaticWebsitePageContent = Page & {
  readonly author?: string;
  readonly draft?: boolean;
  readonly outputPath?: string;
  readonly permalink?: string;
};

export type StaticWebsiteContent = StaticWebsiteArticleContent | StaticWebsitePageContent;

export interface StaticWebsiteAsset {
  readonly path: string;
  readonly contents: string;
  readonly href?: string;
  readonly rel?: "stylesheet" | "modulepreload" | "preload" | "icon" | "manifest" | "alternate";
  readonly type?: string;
  readonly media?: string;
}

export interface StaticWebsiteHeadOptions {
  readonly links?: readonly string[];
  readonly byOutputPath?: ReadonlyMap<string, readonly string[]> | Readonly<Record<string, readonly string[]>>;
}

export type StaticWebsiteTheme = "living-web-indieweb" | ThemedPageProfile | false;

export interface StaticWebsiteContentInput {
  readonly articles?: readonly StaticWebsiteArticleContent[];
  readonly pages?: readonly StaticWebsitePageContent[];
  readonly assets?: readonly StaticWebsiteAsset[];
}

export interface StaticWebsiteOptions {
  readonly websiteUrl: string;
  readonly title: string;
  readonly description?: string;
  readonly language?: string;
  readonly author?: string;
  readonly websiteName?: string;
  readonly basePath?: string;
  readonly postsPath?: string;
  readonly includeDrafts?: boolean;
  readonly indexOrder?: "path" | "input";
  readonly head?: StaticWebsiteHeadOptions;
  readonly theme?: StaticWebsiteTheme;
  readonly assets?: readonly StaticWebsiteAsset[];
  readonly robots?: {
    readonly userAgent?: string;
    readonly allow?: readonly string[];
    readonly disallow?: readonly string[];
  };
}

type StaticWebsiteContentIterable = Iterable<StaticWebsiteContent>;

type RoutedArticleContent = Readonly<{
  content: Article;
  kind: "article";
  outputPath: string;
  href: string;
  absoluteUrl: string;
  sitemapSlug: string;
}>;

type RoutedPageContent = Readonly<{
  content: Page;
  kind: "page";
  outputPath: string;
  href: string;
  absoluteUrl: string;
  sitemapSlug: string;
}>;

type RoutedContent = RoutedArticleContent | RoutedPageContent;

type FeedArticle = Article & { readonly url: string };

interface StaticWebsiteThemeProjection {
  readonly profile: ThemedPageProfile;
  readonly bodyAttributes: ReturnType<typeof themedPageBodyAttributes>;
  readonly styleTag: string;
}

interface NormalizedStaticWebsiteContentInput {
  readonly articles: readonly Article[];
  readonly pages: readonly Page[];
  readonly assets: readonly StaticWebsiteAsset[];
}

/** Build a complete static output tree without touching the filesystem. */
export function buildStaticWebsite(
  content: StaticWebsiteContentInput | StaticWebsiteContentIterable,
  opts: StaticWebsiteOptions,
): StaticWebsiteFileMap {
  const normalized = normalizeContent(content, opts);
  const website = websiteContext(opts);
  const articleRoutes = routeArticles(normalized.articles, opts, website);
  const pageRoutes = routePages(normalized.pages, opts, website);
  const routes = [...articleRoutes, ...pageRoutes].sort((left, right) => left.outputPath.localeCompare(right.outputPath));
  const indexRoutes = orderedIndexRoutes(articleRoutes, pageRoutes, opts);
  const files = new Map<string, string>();
  const assets = [...(normalized.assets ?? []), ...(opts.assets ?? [])];
  const theme = staticWebsiteThemeProjection(opts.theme);

  for (const asset of assets) {
    putFile(files, outputPath(asset.path), asset.contents);
  }

  const headLinks = websiteHeadLinks(website, assets);
  putFile(files, "index.html", renderIndex(indexRoutes, opts, website, headLinksForOutputPath("index.html", headLinks, opts.head)));

  for (const route of routes) {
    const html = renderRouteHtml(route, opts, website, theme);
    putFile(files, route.outputPath, injectHeadLinks(html, headLinksForOutputPath(route.outputPath, headLinks, opts.head)));
  }

  const feedMeta = feedMetaOf(opts, website);
  const feedArticles = articleRoutes.map((route): FeedArticle => ({ ...route.content, url: route.absoluteUrl }));
  putFile(files, "feed.xml", articlesToRss(feedMeta, feedArticles));
  putFile(files, "atom.xml", articlesToAtom(feedMeta, feedArticles));
  putFile(files, "feed.json", articlesToJsonFeed(feedMeta, feedArticles));

  const sitemapEntries = routes.map(routeSitemapEntry);
  putFile(files, "sitemap.xml", urlsToSitemap(sitemapEntries, { websiteUrl: website.origin, pathPrefix: website.pathPrefix }));
  const robotsOptions: RobotsTxtOptions = {
    sitemapUrl: website.absoluteUrl("sitemap.xml"),
    ...(opts.robots?.userAgent === undefined ? {} : { userAgent: opts.robots.userAgent }),
    ...(opts.robots?.allow === undefined ? {} : { allow: opts.robots.allow }),
    ...(opts.robots?.disallow === undefined ? {} : { disallow: opts.robots.disallow }),
  };
  putFile(files, "robots.txt", robotsTxt(robotsOptions));
  putFile(files, ".nojekyll", "");

  return files;
}

function staticWebsiteThemeProfile(theme: StaticWebsiteTheme | undefined): ThemedPageProfile | undefined {
  if (theme === undefined || theme === false) return undefined;
  if (theme === "living-web-indieweb") return livingWebIndieWebPageProfile;
  return theme;
}

function renderRouteHtml(
  route: RoutedContent,
  opts: StaticWebsiteOptions,
  website: WebsiteContext,
  theme: StaticWebsiteThemeProjection | undefined,
): string {
  if (route.kind === "article") {
    const htmlOptions = articleHtmlOptions(route, opts, website);
    return theme === undefined
      ? articleToHtmlPage(route.content, htmlOptions)
      : injectThemedPageStyle(articleToHtmlPage(route.content, {
        ...htmlOptions,
        bodyAttributes: theme.bodyAttributes,
      }), theme);
  }
  const htmlOptions = pageHtmlOptions(route, opts);
  return theme === undefined
    ? pageToHtmlPage(route.content, htmlOptions)
    : injectThemedPageStyle(pageToHtmlPage(route.content, {
      ...htmlOptions,
      bodyAttributes: theme.bodyAttributes,
    }), theme);
}

function staticWebsiteThemeProjection(theme: StaticWebsiteTheme | undefined): StaticWebsiteThemeProjection | undefined {
  const profile = staticWebsiteThemeProfile(theme);
  if (profile === undefined) return undefined;
  return Object.freeze({
    profile,
    bodyAttributes: themedPageBodyAttributes(profile),
    styleTag: themedPageStyleTag(profile, staticDocumentToThemedPageStylesheet(profile)),
  });
}

function injectThemedPageStyle(html: string, theme: StaticWebsiteThemeProjection): string {
  return html.replace("</head>", `  ${theme.styleTag}\n</head>`);
}

function articleHtmlOptions(route: RoutedArticleContent, opts: StaticWebsiteOptions, website: WebsiteContext): ArticleHtmlOptions {
  return {
    websiteName: opts.websiteName ?? opts.title,
    baseUrl: website.absoluteRoot.replace(/\/+$/u, ""),
    url: route.absoluteUrl,
    ...(opts.language === undefined ? {} : { lang: opts.language }),
  };
}

function pageHtmlOptions(route: RoutedPageContent, opts: StaticWebsiteOptions): PageHtmlOptions {
  return {
    websiteName: opts.websiteName ?? opts.title,
    url: route.absoluteUrl,
    ...(opts.author === undefined ? {} : { author: opts.author }),
    ...(opts.language === undefined ? {} : { lang: opts.language }),
  };
}

function routeSitemapEntry(route: RoutedContent): SitemapUrlEntry {
  const lastmod = route.kind === "article" ? route.content.updated ?? route.content.date : route.content.date;
  return {
    loc: route.absoluteUrl,
    ...(lastmod === undefined ? {} : { lastmod }),
    draft: false,
  };
}

function orderedIndexRoutes(articleRoutes: readonly RoutedArticleContent[], pageRoutes: readonly RoutedPageContent[], opts: StaticWebsiteOptions): readonly RoutedContent[] {
  if ((opts.indexOrder ?? "path") === "input") return [...articleRoutes, ...pageRoutes];
  return [...articleRoutes, ...pageRoutes].sort((left, right) => left.outputPath.localeCompare(right.outputPath));
}

function normalizeContent(content: StaticWebsiteContentInput | StaticWebsiteContentIterable, opts: StaticWebsiteOptions): NormalizedStaticWebsiteContentInput {
  const includeDrafts = opts.includeDrafts ?? false;
  if (isContentInput(content)) {
    return {
      articles: admittedArticles(content.articles ?? [], includeDrafts),
      pages: admittedPages(content.pages ?? [], includeDrafts),
      assets: [...(content.assets ?? [])],
    };
  }
  return { articles: admittedArticles(Array.from(content) as readonly StaticWebsiteArticleContent[], includeDrafts), pages: [], assets: [] };
}

function isContentInput(value: StaticWebsiteContentInput | StaticWebsiteContentIterable): value is StaticWebsiteContentInput {
  return typeof value === "object" && value !== null && (
    "articles" in value || "pages" in value || "assets" in value
  );
}

function admittedArticles(content: readonly StaticWebsiteArticleContent[], includeDrafts: boolean): Article[] {
  return content
    .filter((article) => includeDrafts || !(article.draft ?? false))
    .map((article): Article => ({ ...article, draft: article.draft }));
}

function admittedPages(content: readonly StaticWebsitePageContent[], includeDrafts: boolean): Page[] {
  return content
    .filter((page) => includeDrafts || !(page.draft ?? false))
    .map((page): Page => ({ ...page }));
}

function routeArticles(articles: readonly Article[], opts: StaticWebsiteOptions, website: WebsiteContext): RoutedArticleContent[] {
  const prefix = cleanOutputPath(opts.postsPath ?? "posts");
  return articles.map((article) => routeContent(article, "article", routeOutput(article, "article", prefix), website));
}

function routePages(pages: readonly Page[], opts: StaticWebsiteOptions, website: WebsiteContext): RoutedPageContent[] {
  const prefix = cleanOutputPath(opts.postsPath === "" ? "" : "");
  return pages.map((page) => routeContent(page, "page", routeOutput(page, "page", prefix), website));
}

function routeContent(content: Article, kind: "article", targetOutputPath: string, website: WebsiteContext): RoutedArticleContent;
function routeContent(content: Page, kind: "page", targetOutputPath: string, website: WebsiteContext): RoutedPageContent;
function routeContent(content: Article | Page, kind: "article" | "page", targetOutputPath: string, website: WebsiteContext): RoutedContent {
  const href = website.hrefForOutput(targetOutputPath);
  return Object.freeze({
    content,
    kind,
    outputPath: targetOutputPath,
    href,
    absoluteUrl: website.absoluteHref(href),
    sitemapSlug: hrefToSitemapSlug(href, website.basePath),
  }) as RoutedContent;
}

function routeOutput(content: Article | Page, kind: "article" | "page", fallbackPrefix: string): string {
  const routed = routeHint(content, kind);
  if (routed !== undefined) return outputPath(routed);
  return indexOutputPath(fallbackPrefix, content.slug);
}

function routeHint(content: Article | Page, kind: "article" | "page"): string | undefined {
  const routed = content as (Article | Page) & {
    readonly outputPath?: string;
    readonly path?: string;
    readonly permalink?: string;
    readonly url?: string;
  };
  if (kind === "page") return firstString(routed.outputPath, routed.permalink, routed.url);
  return firstString(routed.outputPath, routed.permalink, routed.path);
}

function indexOutputPath(prefix: string, slug: string): string {
  const path = [prefix, cleanOutputPath(slug), "index.html"].filter(Boolean).join("/");
  return outputPath(path);
}

export interface WebsiteContext {
  readonly origin: string;
  readonly basePath: string;
  readonly pathPrefix: string;
  readonly absoluteRoot: string;
  hrefForOutput(outputPath: string): string;
  absoluteHref(href: string): string;
  absoluteUrl(outputPath: string): string;
}

export function websiteContext(opts: StaticWebsiteOptions): WebsiteContext {
  const root = new URL(opts.websiteUrl);
  const basePath = normalizeBasePath(opts.basePath ?? root.pathname);
  const origin = root.origin;
  const absoluteRoot = new URL(basePath, origin).toString();
  return {
    origin,
    basePath,
    pathPrefix: cleanOutputPath(basePath),
    absoluteRoot,
    hrefForOutput: (path) => websiteHref(basePath, path),
    absoluteHref: (href) => new URL(href, origin).toString(),
    absoluteUrl: (path) => new URL(websiteHref(basePath, path), origin).toString(),
  };
}

function feedMetaOf(opts: StaticWebsiteOptions, website: WebsiteContext): RssFeedMeta & ArticleFeedMeta & JsonFeedMeta {
  return {
    title: opts.title,
    homePageUrl: website.absoluteRoot,
    websiteUrl: website.absoluteRoot,
    feedUrl: website.absoluteUrl("feed.xml"),
    ...(opts.description === undefined ? {} : { description: opts.description }),
    ...(opts.language === undefined ? {} : { language: opts.language }),
    ...(opts.author === undefined ? {} : { author: opts.author }),
  };
}

function renderIndex(routes: readonly RoutedContent[], opts: StaticWebsiteOptions, website: WebsiteContext, headLinks: readonly string[]): string {
  const articleFeedItems = routes
    .filter((route) => route.kind === "article")
    .map((route): Article => ({ ...route.content, slug: `${route.sitemapSlug}/` }));
  const pageItems = routes
    .filter((route) => route.kind === "page")
    .map((route) => htmlElement("li", {}, [
      htmlElement("a", { href: route.href }, [route.content.title]),
    ]));
  const pageNav = pageItems.length === 0 ? null : htmlElement("nav", { "aria-label": "Pages" }, [
    htmlElement("ul", {}, pageItems),
  ]);
  const hFeed = injectWebsiteRelativeBase(articlesToHFeed(articleFeedItems, { title: "Posts", baseUrl: "/" }), website);
  return renderHtmlDocument({
    lang: opts.language ?? "en",
    head: [
      htmlElement("meta", { charset: "utf-8" }),
      htmlElement("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      htmlElement("title", {}, [opts.title]),
      opts.description === undefined ? null : htmlElement("meta", { name: "description", content: opts.description }),
      ...headLinks.map(htmlFragment),
    ],
    body: [
      htmlElement("main", {}, [
        htmlElement("h1", {}, [opts.title]),
        pageNav,
        htmlFragment(hFeed),
      ]),
    ],
  });
}

function injectWebsiteRelativeBase(html: string, website: WebsiteContext): string {
  if (website.basePath === "/") return html;
  return html.replace(/href="\//gu, `href="${website.basePath}`);
}

export function websiteHeadLinks(website: WebsiteContext, assets: readonly StaticWebsiteAsset[]): readonly string[] {
  const discovery = [
    linkTag({ rel: "alternate", type: "application/rss+xml", href: website.hrefForOutput("feed.xml") }),
    linkTag({ rel: "alternate", type: "application/atom+xml", href: website.hrefForOutput("atom.xml") }),
    linkTag({ rel: "alternate", type: "application/feed+json", href: website.hrefForOutput("feed.json") }),
    linkTag({ rel: "sitemap", type: "application/xml", href: website.hrefForOutput("sitemap.xml") }),
  ];
  const assetLinks = assets
    .filter((asset) => asset.rel !== undefined)
    .map((asset) => {
      const attrs: { rel: string; href: string; type?: string; media?: string } = {
        rel: asset.rel!,
        href: asset.href ?? website.hrefForOutput(asset.path),
      };
      if (asset.type !== undefined) attrs.type = asset.type;
      if (asset.media !== undefined) attrs.media = asset.media;
      return linkTag(attrs);
    });
  return [...discovery, ...assetLinks].map((line) => `  ${line}`);
}

function linkTag(attrs: { readonly rel: string; readonly href: string; readonly type?: string; readonly media?: string }): string {
  const parts = [
    `rel="${escapeAttr(attrs.rel)}"`,
    attrs.type === undefined ? null : `type="${escapeAttr(attrs.type)}"`,
    `href="${escapeAttr(attrs.href)}"`,
    attrs.media === undefined ? null : `media="${escapeAttr(attrs.media)}"`,
  ].filter((part): part is string => part !== null);
  return `<link ${parts.join(" ")}>`;
}

export function injectHeadLinks(html: string, headLinks: readonly string[]): string {
  if (headLinks.length === 0) return html;
  return html.replace("</head>", `${headLinks.join("\n")}\n</head>`);
}

function headLinksForOutputPath(outputPath: string, baseHeadLinks: readonly string[], head: StaticWebsiteHeadOptions | undefined): readonly string[] {
  if (head === undefined) return baseHeadLinks;
  const global = head.links ?? [];
  const page = headByOutputPath(head.byOutputPath, outputPath);
  return Object.freeze([...baseHeadLinks, ...global, ...page]);
}

function headByOutputPath(byOutputPath: StaticWebsiteHeadOptions["byOutputPath"], outputPath: string): readonly string[] {
  if (byOutputPath === undefined) return [];
  if (hasMapGet(byOutputPath)) return byOutputPath.get(outputPath) ?? [];
  return (byOutputPath as Readonly<Record<string, readonly string[]>>)[outputPath] ?? [];
}

function hasMapGet(value: StaticWebsiteHeadOptions["byOutputPath"]): value is ReadonlyMap<string, readonly string[]> {
  return typeof (value as { readonly get?: unknown }).get === "function";
}

function putFile(files: Map<string, string>, path: string, contents: string): void {
  if (files.has(path)) throw new TypeError(`buildStaticWebsite: duplicate output path ${path}`);
  files.set(path, contents);
}

function outputPath(path: string): string {
  const clean = cleanOutputPath(path);
  if (clean === "") throw new TypeError("buildStaticWebsite: output path must not be empty");
  if (clean.endsWith("/")) return `${clean}index.html`;
  if (clean.split("/").at(-1)?.includes(".") === true) return clean;
  return `${clean}/index.html`;
}

function cleanOutputPath(value: string): string {
  const collapsed = value.replace(/\\/gu, "/").replace(/^\/+/u, "").replace(/\/+/gu, "/");
  const parts = collapsed.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.some((part) => part === "..")) throw new TypeError(`buildStaticWebsite: unsafe output path ${value}`);
  return parts.join("/");
}

function websiteHref(basePath: string, path: string): string {
  const out = outputPath(path);
  const withoutIndex = out.endsWith("/index.html") ? out.slice(0, -"index.html".length) : out;
  const joined = [basePath.replace(/\/+$/u, ""), withoutIndex.replace(/^\/+/u, "")].filter(Boolean).join("/");
  return normalizeBasePath(joined).replace(/\/$/u, withoutIndex.endsWith("/") ? "/" : "");
}

function normalizeBasePath(value: string): string {
  const path = value.trim() === "" ? "/" : value;
  const clean = `/${path.replace(/^\/+|\/+$/gu, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
}

function hrefToSitemapSlug(href: string, basePath: string): string {
  const base = basePath === "/" ? "/" : basePath;
  const withoutBase = href.startsWith(base) ? href.slice(base.length) : href.replace(/^\/+/u, "");
  return withoutBase.replace(/^\/+|\/+$/gu, "");
}

function firstString(...values: readonly (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim() !== "") return value;
  }
  return undefined;
}
