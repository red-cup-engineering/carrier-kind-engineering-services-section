/**
 * emit -- microformats2 markup from data (the inverse of ./parse).
 *
 * A microformats2 property names where a parser reads its value, so each type is emitted in the
 * element and attribute the parsing specification reads: `p-*` text content, `u-*` the `href` of
 * `a`/`area`/`link` or the `src` of `img`/`audio`/`video`/`source`, `dt-*` the `datetime` of `time`, and
 * `e-*` the inner HTML (the one verbatim path -- it *is* markup). Every other caller value crosses one
 * escaping gate. Output is deterministic: no clock, no I/O, insertion order. The round trip
 * `parseMicroformats(hEntry(x))` returns the properties `x` named (test/emit.test.mjs).
 */

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text or an attribute value. */
export function escapeHtml(value) {
  return value === null || value === undefined ? "" : String(value).replace(/[&<>"']/gu, (c) => ENTITIES[c]);
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

function attributes(map) {
  let out = "";
  for (const [name, value] of Object.entries(map ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    out += value === true ? ` ${name}` : ` ${name}="${escapeHtml(value)}"`;
  }
  return out;
}

/** An element; `children` is markup already (a string, or strings joined). */
export function el(tag, attrs, children) {
  const open = `<${tag}${attributes(attrs)}`;
  if (VOID.has(tag)) return `${open}>`;
  return `${open}>${Array.isArray(children) ? children.join("") : (children ?? "")}</${tag}>`;
}

/** Distinct class tokens in order. */
export function classes(...tokens) {
  return [...new Set(tokens.flatMap((token) => (token ? String(token).split(/\s+/u) : [])).filter(Boolean))].join(" ");
}

/** A `p-*` property: text content. */
export const p = (name, value, options = {}) => el(options.tag ?? "span", { class: classes(`p-${name}`, options.extraClass) }, escapeHtml(value));

/** A `u-*` property: a link (default `a`, text the URL or `options.text`) or a media element (`img`, `audio`, `video`, `source`). */
export function u(name, url, options = {}) {
  const tag = options.tag ?? "a";
  const cls = classes(`u-${name}`, options.extraClass);
  if (tag === "a" || tag === "area" || tag === "link") return el(tag, { class: cls, href: url }, tag === "link" ? "" : escapeHtml(options.text ?? url));
  return el(tag, { class: cls, src: url, alt: tag === "img" ? options.alt : undefined });
}

/** A `dt-*` property: a `time` element whose `datetime` is the value. */
export const dt = (name, datetime, options = {}) => el("time", { class: classes(`dt-${name}`, options.extraClass), datetime }, escapeHtml(options.text ?? datetime));

/** An `e-*` property: the markup, verbatim. */
export const e = (name, html, options = {}) => el(options.tag ?? "div", { class: classes(`e-${name}`, options.extraClass) }, html === null || html === undefined ? "" : String(html));

const list = (value) => (value === null || value === undefined ? [] : Array.isArray(value) ? value : [value]);

/** An author: a name (a `p-author`) or a nested h-card. */
export function author(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? p("author", value) : hCard(value, { extraClass: "p-author" });
}

/** An h-card: name, url, photo, and the contact properties email, tel, org, note. */
export function hCard(props = {}, options = {}) {
  const parts = [];
  if (props.name != null) parts.push(p("name", props.name));
  if (props.url != null) parts.push(u("url", props.url, { text: props.name ?? props.url }));
  if (props.photo != null) parts.push(u("photo", props.photo, { tag: "img", alt: props.photoAlt }));
  for (const email of list(props.email)) parts.push(u("email", email.startsWith("mailto:") ? email : `mailto:${email}`, { text: email.replace(/^mailto:/u, "") }));
  for (const tel of list(props.tel)) parts.push(p("tel", tel));
  if (props.org != null) parts.push(p("org", props.org));
  if (props.note != null) parts.push(p("note", props.note));
  return el(options.tag ?? "div", { class: classes("h-card", options.extraClass) }, parts);
}

/** An h-cite: the reference to another post. */
export function hCite(props = {}, options = {}) {
  const parts = [];
  if (props.url != null) parts.push(u("url", props.url, { text: props.name ?? props.url, extraClass: "p-name" }));
  else if (props.name != null) parts.push(p("name", props.name));
  if (props.author != null) parts.push(author(props.author));
  if (props.published != null) parts.push(dt("published", props.published));
  if (props.content != null) parts.push(e("content", props.content));
  return el(options.tag ?? "div", { class: classes("h-cite", options.extraClass) }, parts);
}

const citeOrUrl = (name, value) => (value === null || value === undefined ? "" : typeof value === "string" ? u(name, value) : hCite(value, { extraClass: `u-${name}` }));

/** An h-entry with the IndieWeb response context (`in-reply-to`, `like-of`, `repost-of`, `bookmark-of`), syndication and RSVP. */
export function hEntry(props = {}, options = {}) {
  const parts = [];
  if (props.name != null) parts.push(p("name", props.name));
  if (props.author != null) parts.push(author(props.author));
  if (props.published != null) parts.push(dt("published", props.published));
  if (props.updated != null) parts.push(dt("updated", props.updated));
  if (props.url != null) parts.push(u("url", props.url));
  for (const photo of list(props.photo)) parts.push(u("photo", photo, { tag: "img" }));
  if (props.summary != null) parts.push(p("summary", props.summary));
  if (props.content != null) parts.push(e("content", props.content));
  for (const category of list(props.category)) parts.push(p("category", category));
  for (const value of list(props.inReplyTo)) parts.push(citeOrUrl("in-reply-to", value));
  for (const value of list(props.likeOf)) parts.push(citeOrUrl("like-of", value));
  for (const value of list(props.repostOf)) parts.push(citeOrUrl("repost-of", value));
  for (const value of list(props.bookmarkOf)) parts.push(citeOrUrl("bookmark-of", value));
  for (const value of list(props.syndication)) parts.push(u("syndication", value));
  if (props.rsvp != null) parts.push(p("rsvp", props.rsvp));
  return el(options.tag ?? "article", { class: classes("h-entry", options.extraClass) }, parts);
}

/** An h-feed of entries (a feed's `name`, `url` and `author` first). */
export function hFeed(entries = [], feed = {}, options = {}) {
  const parts = [];
  if (feed.name != null) parts.push(p("name", feed.name));
  if (feed.url != null) parts.push(u("url", feed.url));
  if (feed.author != null) parts.push(author(feed.author));
  for (const entry of entries ?? []) parts.push(hEntry(entry));
  return el(options.tag ?? "div", { class: classes("h-feed", options.extraClass) }, parts);
}

/** Predicate -> h-entry property: the lift of settled `(predicate, object)` cells into mf2. Unknown predicates are skipped, never guessed. */
export const PREDICATE_MAP = Object.freeze({
  name: { field: "name" }, title: { field: "name" }, url: { field: "url" }, permalink: { field: "url" },
  content: { field: "content" }, body: { field: "content" }, summary: { field: "summary" }, excerpt: { field: "summary" },
  author: { field: "author" }, published: { field: "published" }, date: { field: "published" },
  updated: { field: "updated" }, modified: { field: "updated" },
  category: { field: "category", repeatable: true }, tag: { field: "category", repeatable: true }, tags: { field: "category", repeatable: true },
  "in-reply-to": { field: "inReplyTo", repeatable: true }, inReplyTo: { field: "inReplyTo", repeatable: true },
  "like-of": { field: "likeOf", repeatable: true }, likeOf: { field: "likeOf", repeatable: true },
  "repost-of": { field: "repostOf", repeatable: true }, repostOf: { field: "repostOf", repeatable: true },
  "bookmark-of": { field: "bookmarkOf", repeatable: true }, bookmarkOf: { field: "bookmarkOf", repeatable: true },
  syndication: { field: "syndication", repeatable: true }, "syndicate-to": { field: "syndication", repeatable: true },
  photo: { field: "photo", repeatable: true }, rsvp: { field: "rsvp" },
});

/** h-entry props from `[{ predicate, object }]` pairs. */
export function propsFromPairs(pairs) {
  const props = {};
  for (const { predicate, object } of pairs) {
    const rule = PREDICATE_MAP[predicate];
    if (rule === undefined) continue;
    if (rule.repeatable) (props[rule.field] ??= []).push(object);
    else props[rule.field] = object;
  }
  return props;
}

/** An h-entry from a settled algebra: only its *affirmed* cells are emitted as positive properties. */
export const entryFromFiniteAlgebra = (algebra, options = {}) => hEntry(propsFromPairs(algebra?.affirmed ?? []), options);

/** An h-entry from chosen cells (`[{ cell: { predicate, object } }]`). */
export const entryFromSelectedCells = (selected, options = {}) => hEntry(propsFromPairs((selected ?? []).map((s) => ({ predicate: s.cell.predicate, object: s.cell.object }))), options);
