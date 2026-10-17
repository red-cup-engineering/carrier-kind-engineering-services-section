/**
 * jsonld -- schema.org structured data as JSON-LD 1.1 nodes: plain objects with `@context`
 * (https://schema.org), `@type`, optionally `@id`, in the shapes search engines read (Article and its
 * subtypes, Person, Organization, WebSite with its SearchAction, WebPage, BreadcrumbList, ImageObject).
 * Nullish and empty values are omitted (open world: emit only what can be named). URLs must be absolute
 * and dates ISO 8601 -- a value schema.org would not accept is an error here, not a silent non-result.
 * Validate any node against the vocabulary with ./vocabulary.
 */
import { escapeScriptJson, isAbsoluteUrl } from "./html.mjs";

export const SCHEMA_CONTEXT = "https://schema.org";
export const ARTICLE_TYPES = Object.freeze(["Article", "BlogPosting", "NewsArticle", "TechArticle", "Report", "SocialMediaPosting", "ScholarlyArticle"]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[Tt]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:\d{2})?)?$/u;

function prune(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

/** One value as itself, several as an array, none as undefined. */
function many(value) {
  if (value === null || value === undefined) return undefined;
  const list = (Array.isArray(value) ? value : [value]).filter((x) => x !== null && x !== undefined && x !== "");
  return list.length === 0 ? undefined : list.length === 1 ? list[0] : list;
}

function url(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  if (!isAbsoluteUrl(value)) throw new TypeError(`${field} must be an absolute URL`);
  return value;
}

/** Whether the YYYY-MM-DD at the start of `value` is a day that exists (Date.parse alone lets 02-31 roll over). */
function realCalendarDate(value) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

function date(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !ISO_DATE.test(value) || !realCalendarDate(value)) throw new TypeError(`${field} must be an ISO 8601 date or date-time`);
  return value;
}

function urls(value, field) {
  const list = many(value);
  if (list === undefined) return undefined;
  return Array.isArray(list) ? list.map((v) => url(v, field)) : url(list, field);
}

/** An ImageObject, or a bare URL string for a plain image. */
export function imageObject(image) {
  if (image === null || image === undefined) return undefined;
  if (typeof image === "string") return url(image, "image");
  return prune({ "@type": "ImageObject", url: url(image.url, "image.url"), width: image.width, height: image.height, caption: image.caption });
}

/** A Person: a name, or `{ name, url, image, email, sameAs }`. */
export function person(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return prune({ "@type": "Person", name: value });
  return prune({ "@type": "Person", "@id": value.id, name: value.name, url: url(value.url, "person.url"), image: imageObject(value.image), email: value.email, sameAs: urls(value.sameAs, "person.sameAs") });
}

/** An Organization: a name, or `{ name, url, logo, sameAs }`. */
export function organization(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return prune({ "@type": "Organization", name: value });
  return prune({ "@type": "Organization", "@id": value.id, name: value.name, url: url(value.url, "organization.url"), logo: imageObject(value.logo), sameAs: urls(value.sameAs, "organization.sameAs") });
}

/** An Article (or `props.type`, one of ARTICLE_TYPES): headline, description, dates, author, publisher, image, keywords. */
export function article(props = {}) {
  const type = props.type ?? "Article";
  if (!ARTICLE_TYPES.includes(type)) throw new TypeError(`unsupported article type ${type}`);
  const page = props.mainEntityOfPage ?? props.url;
  return prune({
    "@context": SCHEMA_CONTEXT, "@type": type, "@id": props.id,
    headline: props.headline, description: props.description, url: url(props.url, "url"),
    mainEntityOfPage: page ? { "@type": "WebPage", "@id": url(page, "mainEntityOfPage") } : undefined,
    datePublished: date(props.datePublished, "datePublished"), dateModified: date(props.dateModified, "dateModified"),
    author: props.author === undefined ? undefined : person(props.author), publisher: props.publisher === undefined ? undefined : organization(props.publisher),
    image: many([].concat(props.image ?? []).map(imageObject)), keywords: many(props.keywords), inLanguage: props.language,
  });
}

/** A WebPage. */
export function webPage(props = {}) {
  return prune({ "@context": SCHEMA_CONTEXT, "@type": props.type ?? "WebPage", "@id": props.id, name: props.name, url: url(props.url, "url"), description: props.description, inLanguage: props.language, isPartOf: props.siteUrl ? { "@type": "WebSite", "@id": url(props.siteUrl, "siteUrl") } : undefined, breadcrumb: props.breadcrumb });
}

/** A WebSite; `searchUrl` (a template containing `{search_term_string}`) adds the SearchAction. */
export function webSite(props = {}) {
  if (props.searchUrl !== undefined && !props.searchUrl.includes("{search_term_string}")) throw new TypeError("searchUrl must contain {search_term_string}");
  const action = props.searchUrl
    ? { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: props.searchUrl }, "query-input": "required name=search_term_string" }
    : undefined;
  return prune({ "@context": SCHEMA_CONTEXT, "@type": "WebSite", "@id": props.id, name: props.name, url: url(props.url, "url"), description: props.description, potentialAction: action });
}

/** A BreadcrumbList; crumbs without a name are skipped and positions are numbered from 1 over the rest. */
export function breadcrumbList(crumbs = []) {
  let position = 0;
  const items = [];
  for (const crumb of crumbs) {
    if (!crumb?.name) continue;
    position += 1;
    items.push(prune({ "@type": "ListItem", position, name: crumb.name, item: url(crumb.url, "breadcrumb url") }));
  }
  return prune({ "@context": SCHEMA_CONTEXT, "@type": "BreadcrumbList", itemListElement: items });
}

/** Several nodes under one `@context` (an `@graph`); one node is itself; none is undefined. */
export function graph(...nodes) {
  const present = nodes.filter((n) => n !== null && n !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return { "@context": SCHEMA_CONTEXT, "@graph": present.map(({ "@context": _context, ...rest }) => rest) };
}

/** A node as JSON text. */
export const stringifyLd = (node, indent = 0) => JSON.stringify(node, null, indent);

/** A node as an escaping-safe `<script type="application/ld+json">` element. */
export function ldScript(node, indent = 0) {
  if (node === null || node === undefined) return "";
  return `<script type="application/ld+json">${escapeScriptJson(stringifyLd(node, indent))}</script>`;
}
