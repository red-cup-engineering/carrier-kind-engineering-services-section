/**
 * page-html projections - semantic HTML pages for Page content records.
 *
 * Page rendering preserves the Page contract: dates are optional and undated
 * pages do not become h-entry/article publications.
 */
import type { Page } from "../../page/index.mts";
import { type HtmlValue } from "@red-cup-engineering/html-structural-projection-service";
import { htmlElement, htmlFragment, type HtmlChild } from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { pageToWebPageJsonLd, renderJsonLdScript, type JsonLdObject } from "../../codec/schema-org.mts";
import { markdownBodyToHtml } from "../../../lib/codecs/markdown/index.mts";
import { renderStaticWebsiteHtmlPresentation, staticWebsiteBodyAttributes, type StaticWebsitePresentationNode } from "./html-presentation.mts";

export interface PageHtmlOptions {
  readonly lang?: string;
  readonly websiteName?: string;
  readonly url?: string;
  readonly author?: string;
  readonly bodyAttributes?: Readonly<Record<string, HtmlValue>>;
}

/** Project one Page content record to a full WebPage HTML document. */
export function pageToHtmlPage(page: Page, options: PageHtmlOptions = {}): string {
  const lang = options.lang ?? "en";
  const description = pageDescription(page);
  const jsonLd = pageToWebPageJsonLd(page, {
    ...(options.url === undefined ? {} : { url: options.url }),
    ...(options.author === undefined ? {} : { authorName: options.author }),
  }) as unknown as JsonLdObject;
  const bodyHtml = markdownBodyToHtml(page.body);

  return renderStaticWebsiteHtmlPresentation({
    title: page.title,
    lang,
    head: renderHead(page, description, jsonLd),
    token: `page:${page.slug}`,
    claim: "renders-static-page",
    bodyAttributes: options.bodyAttributes ?? staticWebsiteBodyAttributes(),
    roots: Object.freeze(["main"]),
    nodes: pagePresentationNodes(page, bodyHtml),
  });
}

function pagePresentationNodes(page: Page, bodyHtml: string): readonly StaticWebsitePresentationNode[] {
  const headerChildren = page.date === undefined ? ["title"] : ["title", "date"];
  return Object.freeze([
    { nodeId: "main", element: "main", attributes: { "data-metroplat-locus": "main" }, children: ["page"] },
    { nodeId: "page", element: "article", attributes: { class: "web-page", "data-slug": page.slug, "data-metroplat-locus": "entry" }, children: ["header", "content"] },
    { nodeId: "header", element: "header", attributes: { "data-metroplat-locus": "header" }, children: headerChildren },
    { nodeId: "title", element: "h1", attributes: { "data-metroplat-locus": "title" }, text: page.title },
    ...(page.date === undefined ? [] : [{ nodeId: "date", element: "time", attributes: { datetime: page.date, "data-metroplat-locus": "published" }, text: page.date }]),
    { nodeId: "content", element: "div", attributes: { class: "e-content", "data-metroplat-locus": "content" }, html: bodyHtml },
  ]);
}

function renderHead(page: Page, description: string | undefined, jsonLd: JsonLdObject): readonly HtmlChild[] {
  return [
    description === undefined ? null : htmlElement("meta", { name: "description", content: description }),
    htmlFragment(renderJsonLdScript(jsonLd)),
  ];
}

function pageDescription(page: Page): string | undefined {
  const source = page.frontMatter;
  for (const key of ["metaDescription", "meta_description", "description", "summary", "excerpt"]) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}
