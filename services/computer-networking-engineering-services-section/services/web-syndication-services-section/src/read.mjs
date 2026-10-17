/**
 * read -- a feed as a reader sees it: `readFeed(body)` recognizes Atom 1.0, RSS 2.0 and JSON Feed (1.0
 * and 1.1) and returns `{ format, channel, items, links, complete, archive }` in this package's model
 * (instants as RFC 3339), so a subscriber (Microsub, a reader) follows RFC 5005 `next` / `prev-archive`
 * links without caring which format carried them. Malformed XML is an error, not a guess.
 */
import { parseRfc3339, parseRfc822, toRfc3339 } from "./dates.mjs";
import { childOf, childrenOf, parseXml } from "./xml.mjs";

const text = (element) => element?.text.trim() || undefined;
const absolute = (value, base) => { try { return new URL(value, base).href; } catch { return value; } };

function instantOf(value) {
  if (value === undefined) return undefined;
  try { return toRfc3339(parseRfc3339(value.trim())); } catch { /* try RSS */ }
  const ms = parseRfc822(value);
  return ms === undefined ? undefined : toRfc3339(ms);
}

function atomLinks(element, base) {
  return childrenOf(element, "link").map((l) => ({ rel: l.attrs.rel ?? "alternate", href: absolute(l.attrs.href ?? "", base), ...(l.attrs.type ? { type: l.attrs.type } : {}), ...(l.attrs.title ? { title: l.attrs.title } : {}), ...(l.attrs.length ? { length: Number(l.attrs.length) } : {}) }));
}

function atomPerson(element) {
  if (!element) return undefined;
  const name = text(childOf(element, "name"));
  return name === undefined ? undefined : { name, ...(text(childOf(element, "uri")) ? { url: text(childOf(element, "uri")) } : {}), ...(text(childOf(element, "email")) ? { email: text(childOf(element, "email")) } : {}) };
}

function readAtom(root, url) {
  const base = root.attrs["xml:base"] ?? url;
  const links = atomLinks(root, base);
  const alt = links.find((l) => l.rel === "alternate");
  const self = links.find((l) => l.rel === "self");
  const channel = {
    title: text(childOf(root, "title")), ...(text(childOf(root, "subtitle")) ? { description: text(childOf(root, "subtitle")) } : {}),
    ...(alt ? { homePageUrl: alt.href } : {}), ...(self ? { feedUrl: self.href } : {}), id: text(childOf(root, "id")),
    updated: instantOf(text(childOf(root, "updated"))), ...(root.attrs["xml:lang"] ? { language: root.attrs["xml:lang"] } : {}),
    ...(atomPerson(childOf(root, "author")) ? { author: atomPerson(childOf(root, "author")) } : {}),
  };
  const items = childrenOf(root, "entry").map((entry) => {
    const entryLinks = atomLinks(entry, base);
    const content = childOf(entry, "content");
    const summary = childOf(entry, "summary");
    const html = (e) => (e && (e.attrs.type === "html" || e.attrs.type === "xhtml") ? text(e) : undefined);
    const plain = (e) => (e && (e.attrs.type === undefined || e.attrs.type === "text") ? text(e) : undefined);
    return {
      id: text(childOf(entry, "id")), url: entryLinks.find((l) => l.rel === "alternate")?.href ?? entryLinks[0]?.href, title: text(childOf(entry, "title")),
      ...(html(content) ? { contentHtml: html(content) } : {}), ...(plain(content) ? { contentText: plain(content) } : {}), ...(text(summary) ? { summary: text(summary) } : {}),
      published: instantOf(text(childOf(entry, "published"))), updated: instantOf(text(childOf(entry, "updated"))),
      ...(atomPerson(childOf(entry, "author")) ? { author: atomPerson(childOf(entry, "author")) } : {}),
      tags: childrenOf(entry, "category").map((c) => c.attrs.term).filter(Boolean),
      attachments: entryLinks.filter((l) => l.rel === "enclosure").map((l) => ({ url: l.href, mimeType: l.type, ...(l.length ? { sizeInBytes: l.length } : {}) })),
    };
  });
  return { format: "atom", channel, items, links: links.filter((l) => !["self", "alternate", "enclosure"].includes(l.rel)), complete: Boolean(childOf(root, "fh:complete")), archive: Boolean(childOf(root, "fh:archive")) };
}

function readRss(root, url) {
  const ch = childOf(root, "channel");
  if (!ch) throw new SyntaxError("RSS without a channel");
  const links = childrenOf(ch, "atom:link").map((l) => ({ rel: l.attrs.rel ?? "alternate", href: absolute(l.attrs.href ?? "", url), ...(l.attrs.type ? { type: l.attrs.type } : {}) }));
  const self = links.find((l) => l.rel === "self");
  const channel = {
    title: text(childOf(ch, "title")), homePageUrl: text(childOf(ch, "link")), description: text(childOf(ch, "description")),
    ...(self ? { feedUrl: self.href } : {}), ...(text(childOf(ch, "language")) ? { language: text(childOf(ch, "language")) } : {}),
    ...(instantOf(text(childOf(ch, "lastBuildDate"))) ? { updated: instantOf(text(childOf(ch, "lastBuildDate"))) } : {}),
  };
  const items = childrenOf(ch, "item").map((item) => {
    const guid = childOf(item, "guid");
    const creator = text(childOf(item, "dc:creator")) ?? text(childOf(item, "author"));
    return {
      id: text(guid) ?? text(childOf(item, "link")), url: text(childOf(item, "link")) ?? (guid?.attrs.isPermaLink !== "false" ? text(guid) : undefined),
      ...(text(childOf(item, "title")) ? { title: text(childOf(item, "title")) } : {}),
      ...(text(childOf(item, "content:encoded")) ? { contentHtml: text(childOf(item, "content:encoded")) } : {}),
      ...(text(childOf(item, "description")) ? { summary: text(childOf(item, "description")) } : {}),
      published: instantOf(text(childOf(item, "pubDate"))), ...(creator ? { author: { name: creator } } : {}),
      tags: childrenOf(item, "category").map(text).filter(Boolean),
      attachments: childrenOf(item, "enclosure").map((e) => ({ url: e.attrs.url, mimeType: e.attrs.type, ...(Number(e.attrs.length) ? { sizeInBytes: Number(e.attrs.length) } : {}) })),
    };
  });
  return { format: "rss", channel, items, links: links.filter((l) => l.rel !== "self"), complete: Boolean(childOf(ch, "fh:complete")), archive: Boolean(childOf(ch, "fh:archive")) };
}

function readJson(feed, url) {
  const authorOf = (o) => { const a = o.authors?.[0] ?? o.author; return a?.name ? { name: a.name, ...(a.url ? { url: a.url } : {}) } : undefined; };
  const channel = {
    title: feed.title, ...(feed.home_page_url ? { homePageUrl: feed.home_page_url } : {}), feedUrl: feed.feed_url ?? url,
    ...(feed.description ? { description: feed.description } : {}), ...(feed.language ? { language: feed.language } : {}),
    ...(authorOf(feed) ? { author: authorOf(feed) } : {}), ...(feed.icon ? { iconUrl: feed.icon } : {}),
  };
  const items = feed.items.map((item) => ({
    id: String(item.id), url: item.url, ...(item.title ? { title: item.title } : {}),
    ...(item.content_html ? { contentHtml: item.content_html } : {}), ...(item.content_text ? { contentText: item.content_text } : {}), ...(item.summary ? { summary: item.summary } : {}),
    published: item.date_published ? instantOf(item.date_published) : undefined, updated: item.date_modified ? instantOf(item.date_modified) : undefined,
    ...(authorOf(item) ? { author: authorOf(item) } : {}), tags: item.tags ?? [], ...(item.image ? { imageUrl: item.image } : {}),
    attachments: (item.attachments ?? []).map((a) => ({ url: a.url, mimeType: a.mime_type, ...(a.size_in_bytes ? { sizeInBytes: a.size_in_bytes } : {}) })),
  }));
  return { format: "json", channel, items, links: feed.next_url ? [{ rel: "next", href: absolute(feed.next_url, url) }] : [], complete: false, archive: false };
}

/** Read a feed document. `url` is its location, for resolving relative references. */
export function readFeed(body, { url } = {}) {
  const trimmed = String(body).trim();
  if (trimmed.startsWith("{")) {
    let feed;
    try { feed = JSON.parse(trimmed); } catch { throw new SyntaxError("JSON Feed is not valid JSON"); }
    if (typeof feed.version !== "string" || !feed.version.startsWith("https://jsonfeed.org/version/") || !Array.isArray(feed.items)) throw new SyntaxError("not a JSON Feed (needs version and items)");
    return readJson(feed, url);
  }
  const root = parseXml(trimmed);
  if (root.name === "feed") return readAtom(root, url);
  if (root.name === "rss") return readRss(root, url);
  throw new SyntaxError(`not a feed: root element <${root.name}>`);
}
