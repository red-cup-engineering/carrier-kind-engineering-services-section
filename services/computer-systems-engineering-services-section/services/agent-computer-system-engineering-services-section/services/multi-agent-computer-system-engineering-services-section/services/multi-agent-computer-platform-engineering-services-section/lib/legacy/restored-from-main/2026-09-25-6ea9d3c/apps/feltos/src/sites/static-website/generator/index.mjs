/**
 * integrations/web/core/static-website/generator - pure GitHub Pages-ready file tree projection.
 *
 * This face composes the existing Article HTML, feed, sitemap, and robots
 * projections. It returns an output tree; callers own persistence and deploys.
 */

import { articlesToJsonFeed } from "@red-cup-engineering/static-site-publisher/sites/codec/feed";
import { escapeAttr } from "@red-cup-engineering/html-structural-projection-service";
import { htmlElement, htmlFragment, renderHtmlDocument } from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { articlesToAtom } from "@red-cup-engineering/static-site-publisher/sites/codec/atom";
import { articlesToRss } from "@red-cup-engineering/static-site-publisher/sites/codec/rss";
import { urlsToSitemap } from "@red-cup-engineering/static-site-publisher/sites/codec/sitemap";
import { articleToHtmlPage, articlesToHFeed } from "@red-cup-engineering/static-site-publisher/sites/static-website/render/article-html";
import { pageToHtmlPage } from "@red-cup-engineering/static-site-publisher/sites/static-website/render/page-html";
import {
  livingWebIndieWebPageProfile,
  staticDocumentToThemedPageStylesheet,
  themedPageBodyAttributes,
  themedPageStyleTag,

} from "@red-cup-engineering/static-site-publisher/sites/static-website/render/themed-page";
import { robotsTxt } from "@red-cup-engineering/computer-web-server/platform-http/robots";

/** Build a complete static output tree without touching the filesystem. */
export function buildStaticWebsite(
  content,
  opts,
) {
  const normalized = normalizeContent(content, opts);
  const website = websiteContext(opts);
  const articleRoutes = routeArticles(normalized.articles, opts, website);
  const pageRoutes = routePages(normalized.pages, opts, website);
  const routes = [...articleRoutes, ...pageRoutes].sort((left, right) => left.outputPath.localeCompare(right.outputPath));
  const indexRoutes = orderedIndexRoutes(articleRoutes, pageRoutes, opts);
  const files = new Map();
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
  const feedArticles = articleRoutes.map((route) => ({ ...route.content, url: route.absoluteUrl }));
  putFile(files, "feed.xml", articlesToRss(feedMeta, feedArticles));
  putFile(files, "atom.xml", articlesToAtom(feedMeta, feedArticles));
  putFile(files, "feed.json", articlesToJsonFeed(feedMeta, feedArticles));

  const sitemapEntries = routes.map(routeSitemapEntry);
  putFile(files, "sitemap.xml", urlsToSitemap(sitemapEntries, { websiteUrl: website.origin, pathPrefix: website.pathPrefix }));
  const robotsOptions = {
    sitemapUrl: website.absoluteUrl("sitemap.xml"),
    ...(opts.robots?.userAgent === undefined ? {} : { userAgent: opts.robots.userAgent }),
    ...(opts.robots?.allow === undefined ? {} : { allow: opts.robots.allow }),
    ...(opts.robots?.disallow === undefined ? {} : { disallow: opts.robots.disallow }),
  };
  putFile(files, "robots.txt", robotsTxt(robotsOptions));
  putFile(files, ".nojekyll", "");

  return files;
}

function staticWebsiteThemeProfile(theme) {
  if (theme === undefined || theme === false) return undefined;
  if (theme === "living-web-indieweb") return livingWebIndieWebPageProfile;
  return theme;
}

function renderRouteHtml(
  route,
  opts,
  website,
  theme,
) {
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

function staticWebsiteThemeProjection(theme) {
  const profile = staticWebsiteThemeProfile(theme);
  if (profile === undefined) return undefined;
  return Object.freeze({
    profile,
    bodyAttributes: themedPageBodyAttributes(profile),
    styleTag: themedPageStyleTag(profile, staticDocumentToThemedPageStylesheet(profile)),
  });
}

function injectThemedPageStyle(html, theme) {
  return html.replace("</head>", `  ${theme.styleTag}\n</head>`);
}

function articleHtmlOptions(route, opts, website) {
  return {
    websiteName: opts.websiteName ?? opts.title,
    baseUrl: website.absoluteRoot.replace(/\/+$/u, ""),
    url: route.absoluteUrl,
    ...(opts.language === undefined ? {} : { lang: opts.language }),
  };
}

function pageHtmlOptions(route, opts) {
  return {
    websiteName: opts.websiteName ?? opts.title,
    url: route.absoluteUrl,
    ...(opts.author === undefined ? {} : { author: opts.author }),
    ...(opts.language === undefined ? {} : { lang: opts.language }),
  };
}

function routeSitemapEntry(route) {
  const lastmod = route.kind === "article" ? route.content.updated ?? route.content.date : route.content.date;
  return {
    loc: route.absoluteUrl,
    ...(lastmod === undefined ? {} : { lastmod }),
    draft: false,
  };
}

function orderedIndexRoutes(articleRoutes, pageRoutes, opts) {
  if ((opts.indexOrder ?? "path") === "input") return [...articleRoutes, ...pageRoutes];
  return [...articleRoutes, ...pageRoutes].sort((left, right) => left.outputPath.localeCompare(right.outputPath));
}

function normalizeContent(content, opts) {
  const includeDrafts = opts.includeDrafts ?? false;
  if (isContentInput(content)) {
    return {
      articles: admittedArticles(content.articles ?? [], includeDrafts),
      pages: admittedPages(content.pages ?? [], includeDrafts),
      assets: [...(content.assets ?? [])],
    };
  }
  return { articles: admittedArticles(Array.from(content), includeDrafts), pages: [], assets: [] };
}

function isContentInput(value) {
  return typeof value === "object" && value !== null && (
    "articles" in value || "pages" in value || "assets" in value
  );
}

function admittedArticles(content, includeDrafts) {
  return content
    .filter((article) => includeDrafts || !(article.draft ?? false))
    .map((article) => ({ ...article, draft: article.draft }));
}

function admittedPages(content, includeDrafts) {
  return content
    .filter((page) => includeDrafts || !(page.draft ?? false))
    .map((page) => ({ ...page }));
}

function routeArticles(articles, opts, website) {
  const prefix = cleanOutputPath(opts.postsPath ?? "posts");
  return articles.map((article) => routeContent(article, "article", routeOutput(article, "article", prefix), website));
}

function routePages(pages, opts, website) {
  const prefix = cleanOutputPath(opts.postsPath === "" ? "" : "");
  return pages.map((page) => routeContent(page, "page", routeOutput(page, "page", prefix), website));
}

function routeContent(content, kind, targetOutputPath, website) {
  const href = website.hrefForOutput(targetOutputPath);
  return Object.freeze({
    content,
    kind,
    outputPath: targetOutputPath,
    href,
    absoluteUrl: website.absoluteHref(href),
    sitemapSlug: hrefToSitemapSlug(href, website.basePath),
  });
}

function routeOutput(content, kind, fallbackPrefix) {
  const routed = routeHint(content, kind);
  if (routed !== undefined) return outputPath(routed);
  return indexOutputPath(fallbackPrefix, content.slug);
}

function routeHint(content, kind) {
  const routed = content

;
  if (kind === "page") return firstString(routed.outputPath, routed.permalink, routed.url);
  return firstString(routed.outputPath, routed.permalink, routed.path);
}

function indexOutputPath(prefix, slug) {
  const path = [prefix, cleanOutputPath(slug), "index.html"].filter(Boolean).join("/");
  return outputPath(path);
}

export function websiteContext(opts) {
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

function feedMetaOf(opts, website) {
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

function renderIndex(routes, opts, website, headLinks) {
  const articleFeedItems = routes
    .filter((route) => route.kind === "article")
    .map((route) => ({ ...route.content, slug: `${route.sitemapSlug}/` }));
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

function injectWebsiteRelativeBase(html, website) {
  if (website.basePath === "/") return html;
  return html.replace(/href="\//gu, `href="${website.basePath}`);
}

export function websiteHeadLinks(website, assets) {
  const discovery = [
    linkTag({ rel: "alternate", type: "application/rss+xml", href: website.hrefForOutput("feed.xml") }),
    linkTag({ rel: "alternate", type: "application/atom+xml", href: website.hrefForOutput("atom.xml") }),
    linkTag({ rel: "alternate", type: "application/feed+json", href: website.hrefForOutput("feed.json") }),
    linkTag({ rel: "sitemap", type: "application/xml", href: website.hrefForOutput("sitemap.xml") }),
  ];
  const assetLinks = assets
    .filter((asset) => asset.rel !== undefined)
    .map((asset) => {
      const attrs = {
        rel: asset.rel,
        href: asset.href ?? website.hrefForOutput(asset.path),
      };
      if (asset.type !== undefined) attrs.type = asset.type;
      if (asset.media !== undefined) attrs.media = asset.media;
      return linkTag(attrs);
    });
  return [...discovery, ...assetLinks].map((line) => `  ${line}`);
}

function linkTag(attrs) {
  const parts = [
    `rel="${escapeAttr(attrs.rel)}"`,
    attrs.type === undefined ? null : `type="${escapeAttr(attrs.type)}"`,
    `href="${escapeAttr(attrs.href)}"`,
    attrs.media === undefined ? null : `media="${escapeAttr(attrs.media)}"`,
  ].filter((part) => part !== null);
  return `<link ${parts.join(" ")}>`;
}

export function injectHeadLinks(html, headLinks) {
  if (headLinks.length === 0) return html;
  return html.replace("</head>", `${headLinks.join("\n")}\n</head>`);
}

function headLinksForOutputPath(outputPath, baseHeadLinks, head) {
  if (head === undefined) return baseHeadLinks;
  const global = head.links ?? [];
  const page = headByOutputPath(head.byOutputPath, outputPath);
  return Object.freeze([...baseHeadLinks, ...global, ...page]);
}

function headByOutputPath(byOutputPath, outputPath) {
  if (byOutputPath === undefined) return [];
  if (hasMapGet(byOutputPath)) return byOutputPath.get(outputPath) ?? [];
  return (byOutputPath)[outputPath] ?? [];
}

function hasMapGet(value) {
  return typeof (value).get === "function";
}

function putFile(files, path, contents) {
  if (files.has(path)) throw new TypeError(`buildStaticWebsite: duplicate output path ${path}`);
  files.set(path, contents);
}

function outputPath(path) {
  const clean = cleanOutputPath(path);
  if (clean === "") throw new TypeError("buildStaticWebsite: output path must not be empty");
  if (clean.endsWith("/")) return `${clean}index.html`;
  if (clean.split("/").at(-1)?.includes(".") === true) return clean;
  return `${clean}/index.html`;
}

function cleanOutputPath(value) {
  const collapsed = value.replace(/\\/gu, "/").replace(/^\/+/u, "").replace(/\/+/gu, "/");
  const parts = collapsed.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.some((part) => part === "..")) throw new TypeError(`buildStaticWebsite: unsafe output path ${value}`);
  return parts.join("/");
}

function websiteHref(basePath, path) {
  const out = outputPath(path);
  const withoutIndex = out.endsWith("/index.html") ? out.slice(0, -"index.html".length) : out;
  const joined = [basePath.replace(/\/+$/u, ""), withoutIndex.replace(/^\/+/u, "")].filter(Boolean).join("/");
  return normalizeBasePath(joined).replace(/\/$/u, withoutIndex.endsWith("/") ? "/" : "");
}

function normalizeBasePath(value) {
  const path = value.trim() === "" ? "/" : value;
  const clean = `/${path.replace(/^\/+|\/+$/gu, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
}

function hrefToSitemapSlug(href, basePath) {
  const base = basePath === "/" ? "/" : basePath;
  const withoutBase = href.startsWith(base) ? href.slice(base.length) : href.replace(/^\/+/u, "");
  return withoutBase.replace(/^\/+|\/+$/gu, "");
}

function firstString(...values) {
  for (const value of values) {
    if (value !== undefined && value.trim() !== "") return value;
  }
  return undefined;
}
