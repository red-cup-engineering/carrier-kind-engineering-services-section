/**
 * parse -- microformats2 parsing (https://microformats.org/wiki/microformats2-parsing).
 *
 * `parseMicroformats(html, { baseUrl })` turns an HTML document into `{ items, rels, "rel-urls" }`:
 * the microformats2 JSON. It follows the parsing specification and is held to the shared
 * microformats test suite (test/suite, from https://github.com/microformats/tests, CC0).
 *
 *  - roots are `h-*` classes; properties `p-*` (plain text), `u-*` (URL), `dt-*` (date/time) and
 *    `e-*` (embedded markup); vendor-prefixed names (`h-x-*`, `p-x-*`) are ordinary names;
 *  - the value class pattern, `abbr`/`data`/`time`/`img`/`area`/`link` attribute rules, implied `name`,
 *    `photo` and `url`, nested microformats as property values (with `value`), and `children`;
 *  - `rels` and `rel-urls` from `a`, `area` and `link`; the first `<base href>` and the caller's base
 *    URL resolve relative references; `<template>` content is ignored;
 *  - classic microformats (hCard, hEntry, ...) are upgraded by the backcompat tables of ./classic.mjs.
 */
import { parse as parseHtml, serialize } from "parse5";
import { CLASSIC_OF_TYPE, CLASSIC_ROOTS, REL_TAG_ROOTS, classicPropertyOf } from "./classic.mjs";

const VOID_TEXT_SKIP = new Set(["script", "style", "template"]);
const ROOT = /^h-(?:[a-z0-9]+-)?[a-z]+(?:-[a-z]+)*$/u;
const PROPERTY = /^(p|u|dt|e)-((?:[a-z0-9]+-)?[a-z]+(?:-[a-z]+)*)$/u;

// -- DOM helpers (parse5 default tree adapter) -------------------------------------------------------
const isElement = (node) => typeof node.tagName === "string";
const isText = (node) => node.nodeName === "#text";
const elementChildren = (node) => (node.childNodes ?? []).filter(isElement);
function attr(node, name) {
  const found = node.attrs?.find((a) => a.name === name);
  return found === undefined ? undefined : found.value;
}
const classList = (node) => (attr(node, "class") ?? "").split(/[\t\n\f\r ]+/u).filter(Boolean);
const trimHtmlSpace = (s) => s.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/gu, "");

/**
 * Resolve a reference against the base. An absolute reference is kept as authored (the suite compares
 * authored URLs verbatim); an empty reference is the base as supplied.
 */
function resolve(value, base) {
  if (value === "") return base.replace(/#.*$/u, "");
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) return value;
  try { return new URL(value, base).href; } catch { return value; }
}

/** All descendant elements in document order, not entering `<template>`. */
function* descendants(node) {
  for (const child of node.childNodes ?? []) {
    if (!isElement(child)) continue;
    yield child;
    if (child.tagName !== "template") yield* descendants(child);
  }
}

// -- text ---------------------------------------------------------------------------------------------------
/** The plain text of a node: script/style dropped, `img` replaced by its alt (else its src), then trimmed. */
function plainText(node, ctx, { trim = true } = {}) {
  let out = "";
  const walk = (n) => {
    for (const child of n.childNodes ?? []) {
      if (isText(child)) out += child.value;
      else if (isElement(child)) {
        if (VOID_TEXT_SKIP.has(child.tagName)) continue;
        if (child.tagName === "img") {
          const alt = attr(child, "alt");
          if (alt !== undefined) out += alt;
          else if (attr(child, "src") !== undefined) out += ` ${resolve(attr(child, "src"), ctx.base)} `;
        } else if (child.tagName === "br") out += "\n";
        else walk(child);
      }
    }
  };
  walk(node);
  return trim ? trimHtmlSpace(out) : out;
}

// -- value class pattern ----------------------------------------------------------------------------------------
/** The `.value` descendants that belong to `node` itself rather than to a nested property or microformat. */
function valueElements(node) {
  const found = [];
  const walk = (n) => {
    for (const child of n.childNodes ?? []) {
      if (!isElement(child) || child.tagName === "template") continue;
      const classes = classList(child);
      if (classes.includes("value") || classes.includes("value-title")) { found.push(child); continue; }
      if (classes.some((c) => ROOT.test(c) || PROPERTY.test(c))) continue;
      walk(child);
    }
  };
  walk(node);
  return found;
}

function valueClassText(el, ctx, { datetime = false } = {}) {
  const tag = el.tagName;
  if (classList(el).includes("value-title") && attr(el, "title") !== undefined) return attr(el, "title");
  if (tag === "img" || tag === "area") return attr(el, "alt") ?? plainText(el, ctx);
  if (tag === "data") return attr(el, "value") ?? plainText(el, ctx);
  if (tag === "abbr") return attr(el, "title") ?? plainText(el, ctx);
  if (datetime && (tag === "time" || tag === "ins" || tag === "del") && attr(el, "datetime") !== undefined) return attr(el, "datetime");
  return plainText(el, ctx);
}

/** The value class pattern's text for a node, or undefined when it has no `.value` parts. */
function valueClassPattern(node, ctx, options) {
  const parts = valueElements(node);
  if (parts.length === 0) return undefined;
  return parts.map((part) => valueClassText(part, ctx, options)).join("");
}

// -- date and time -----------------------------------------------------------------------------------------------------
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const ORDINAL = /^(\d{4})-(\d{3})$/u;
const TIME = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2})(?:\.\d+)?)?\s*([ap])?\.?m?\.?$/iu;
const ZONE = /^(Z|[+-]\d{1,2}(?::?\d{2})?)$/iu;

function ordinalToDate(year, day) {
  const d = new Date(Date.UTC(Number(year), 0, Number(day)));
  return d.getUTCFullYear() === Number(year) ? d.toISOString().slice(0, 10) : undefined;
}

function normalizeZone(zone) {
  return /^z$/iu.test(zone) ? "Z" : zone;
}

function normalizeTime(time) {
  const m = TIME.exec(time.trim());
  if (m === null) return undefined;
  let hour = Number(m[1]);
  if (m[4]) {
    if (hour < 1 || hour > 12) return undefined;
    hour = hour % 12 + (m[4].toLowerCase() === "p" ? 12 : 0);
  }
  const minutes = m[2] === undefined && m[4] ? "00" : m[2];
  const text = `${String(hour).padStart(2, "0")}${minutes === undefined ? "" : `:${minutes}`}${m[3] === undefined ? "" : `:${m[3]}`}`;
  return text;
}

/**
 * Combine the parts of the value class pattern for a date/time: the first date, the first time (with
 * its own zone) and, lacking one, the first zone; a full date-time part serves only when no part is a
 * plain date or time. Returns undefined when nothing is a date or time, so ordinary extraction applies.
 */
function combineDateParts(parts) {
  let date; let time; let zone; let whole;
  for (const raw of parts) {
    const part = raw.trim();
    if (DATE.test(part) || ORDINAL.test(part)) { if (date === undefined) date = normalizeDateOnly(part); continue; }
    if (ZONE.test(part)) { if (zone === undefined) zone = normalizeZone(part); continue; }
    const timeZone = /^(.*?)(Z|[+-]\d{1,2}(?::?\d{2})?)?$/iu.exec(part);
    const t = timeZone === null ? undefined : normalizeTime(timeZone[1]);
    if (t !== undefined) {
      if (time === undefined) { time = t; if (timeZone[2]) zone = zone ?? normalizeZone(timeZone[2]); }
      continue;
    }
    if (whole === undefined) { const normalized = normalizeDateTime(part); if (normalized !== part || DATE.test(part) || /^\d{4}-\d{2}-\d{2}[ T]/u.test(part)) whole = normalized; }
  }
  if (date === undefined && time === undefined) return whole;
  return `${date ?? ""}${date !== undefined && time !== undefined ? " " : ""}${time ?? ""}${time !== undefined || date === undefined ? (zone ?? "") : ""}`;
}

function normalizeDateOnly(part) {
  return DATE.test(part) ? part : ordinalToDate(...ORDINAL.exec(part).slice(1));
}

/** Normalize an authored date/time to the suite's rules: a space between date and time, colon zones, authored precision. */
function normalizeDateTime(value) {
  const m = /^(\d{4}-\d{2}-\d{2}|\d{4}-\d{3})(?:[T ]+(.+))?$/u.exec(value.trim());
  if (m === null) return value;
  const date = DATE.test(m[1]) ? m[1] : ordinalToDate(...ORDINAL.exec(m[1]).slice(1));
  if (date === undefined) return value;
  if (m[2] === undefined) return date;
  const rest = /^(.*?)\s*(Z|[+-]\d{1,2}(?::?\d{2})?)?$/iu.exec(m[2]);
  const time = rest ? normalizeTime(rest[1]) : undefined;
  if (time === undefined) return value;
  return `${date} ${time}${rest[2] ? normalizeZone(rest[2]) : ""}`;
}

// -- property value extraction -----------------------------------------------------------------------------------------
const URL_ATTRIBUTES = [["a", "href"], ["area", "href"], ["link", "href"]];

function pValue(node, ctx) {
  const pattern = valueClassPattern(node, ctx);
  if (pattern !== undefined) return pattern;
  const tag = node.tagName;
  if ((tag === "abbr" || tag === "link") && attr(node, "title") !== undefined) return attr(node, "title");
  if ((tag === "data" || tag === "input") && attr(node, "value") !== undefined) return attr(node, "value");
  if ((tag === "img" || tag === "area") && attr(node, "alt") !== undefined) return attr(node, "alt");
  return plainText(node, ctx);
}

function uValue(node, ctx) {
  const tag = node.tagName;
  for (const [t, a] of URL_ATTRIBUTES) if (tag === t && attr(node, a) !== undefined) return resolve(attr(node, a), ctx.base);
  if (tag === "img" && attr(node, "src") !== undefined) {
    const src = resolve(attr(node, "src"), ctx.base);
    return attr(node, "alt") === undefined ? src : { value: src, alt: attr(node, "alt") };
  }
  if (["audio", "video", "source", "iframe"].includes(tag) && attr(node, "src") !== undefined) return resolve(attr(node, "src"), ctx.base);
  if (tag === "video" && attr(node, "poster") !== undefined) return resolve(attr(node, "poster"), ctx.base);
  if (tag === "object" && attr(node, "data") !== undefined) return resolve(attr(node, "data"), ctx.base);
  const pattern = valueClassPattern(node, ctx);
  if (pattern !== undefined) return resolve(pattern, ctx.base);
  if (tag === "abbr" && attr(node, "title") !== undefined) return resolve(attr(node, "title"), ctx.base);
  if ((tag === "data" || tag === "input") && attr(node, "value") !== undefined) return resolve(attr(node, "value"), ctx.base);
  return resolve(plainText(node, ctx), ctx.base);
}

function dtValue(node, ctx) {
  const tag = node.tagName;
  const parts = valueElements(node);
  if (parts.length > 0) {
    const combined = combineDateParts(parts.map((part) => valueClassText(part, ctx, { datetime: true })));
    if (combined !== undefined) return combined;
  }
  let raw;
  if ((tag === "time" || tag === "ins" || tag === "del") && attr(node, "datetime") !== undefined) raw = attr(node, "datetime");
  else if (tag === "abbr" && attr(node, "title") !== undefined) raw = attr(node, "title");
  else if ((tag === "data" || tag === "input") && attr(node, "value") !== undefined) raw = attr(node, "value");
  else raw = plainText(node, ctx);
  return raw;
}

/** innerHTML with relative URLs resolved (the `html` of an `e-*` value). */
function absoluteInnerHtml(node, ctx) {
  const clone = structuredClone(stripParents(node));
  for (const el of descendants(clone)) {
    for (const a of el.attrs ?? []) {
      if ((a.name === "href" || a.name === "src" || a.name === "data" || a.name === "poster") && a.value !== "") a.value = resolve(a.value, ctx.base);
    }
  }
  return serialize(clone);
}

function stripParents(node) {
  const copy = (n) => {
    const out = { ...n };
    delete out.parentNode;
    if (n.childNodes) out.childNodes = n.childNodes.map(copy);
    if (n.content) out.content = copy(n.content);
    return out;
  };
  return copy(node);
}

function languageOf(node, ctx) {
  for (let n = node; n; n = n.parentNode) {
    const lang = n.attrs ? attr(n, "lang") : undefined;
    if (lang !== undefined) return lang;
  }
  return ctx.language;
}

function eValue(node, ctx) {
  const html = absoluteInnerHtml(node, ctx);
  const lang = languageOf(node, ctx);
  return { value: plainText(node, ctx), html: trimHtmlSpace(html), ...(lang === undefined || lang === "" ? {} : { lang }) };
}

// -- microformats ---------------------------------------------------------------------------------------------------------
function rootsOf(node) {
  const modern = classList(node).filter((c) => ROOT.test(c));
  const classic = classList(node).filter((c) => Object.hasOwn(CLASSIC_ROOTS, c));
  return { modern, classic };
}

function propertyClasses(node, classicRoot) {
  const out = [];
  for (const c of classList(node)) {
    const m = PROPERTY.exec(c);
    if (m !== null) out.push({ kind: m[1], name: m[2] });
  }
  if (classicRoot !== undefined) for (const c of classList(node)) {
    const mapped = classicPropertyOf(classicRoot, c);
    if (mapped !== undefined && !out.some((p) => p.name === mapped.name && p.kind === mapped.kind)) out.push({ ...mapped, classic: true });
  }
  return out;
}

function hasNestedMicroformat(item) {
  return (item.children?.length ?? 0) > 0 || Object.values(item.properties).some((values) => values.some((v) => typeof v === "object" && v !== null && Array.isArray(v.type)));
}

const SOURCES = Symbol("property sources");

/** Record a property value and the kind (p, u, dt, e, or "implied") that produced it. */
function addProperty(item, name, value, kind) {
  (item.properties[name] ??= []).push(value);
  if (item[SOURCES] === undefined) Object.defineProperty(item, SOURCES, { value: {}, enumerable: false });
  (item[SOURCES][name] ??= []).push(kind);
}

/** The first value of `name` that a `kind` property (or an implied one) produced. */
function firstFrom(item, name, kind) {
  const values = item.properties[name] ?? [];
  const sources = item[SOURCES]?.[name] ?? [];
  const index = sources.findIndex((source) => source === kind || source === "implied");
  return index === -1 ? undefined : values[index];
}

function onlyChild(node) {
  const kids = elementChildren(node);
  return kids.length === 1 ? kids[0] : undefined;
}
const onlyOfType = (parent, tag) => {
  const same = elementChildren(parent).filter((c) => c.tagName === tag);
  return same.length === 1 ? same[0] : undefined;
};
const isMicroformat = (node) => classList(node).some((c) => ROOT.test(c) || Object.hasOwn(CLASSIC_ROOTS, c));

function impliedName(node, ctx) {
  const tag = node.tagName;
  if ((tag === "img" || tag === "area") && attr(node, "alt") !== undefined) return trimHtmlSpace(attr(node, "alt"));
  if (tag === "abbr" && attr(node, "title") !== undefined) return trimHtmlSpace(attr(node, "title"));
  const child = onlyChild(node);
  const viaChild = (el) => {
    if (el === undefined || isMicroformat(el)) return undefined;
    if ((el.tagName === "img" || el.tagName === "area") && attr(el, "alt")) return trimHtmlSpace(attr(el, "alt"));
    if (el.tagName === "abbr" && attr(el, "title")) return trimHtmlSpace(attr(el, "title"));
    return undefined;
  };
  const direct = viaChild(child);
  if (direct !== undefined) return direct;
  if (child !== undefined && !isMicroformat(child)) {
    const viaGrandchild = viaChild(onlyChild(child));
    if (viaGrandchild !== undefined) return viaGrandchild;
  }
  return plainText(node, ctx);
}

function impliedPhoto(node, ctx) {
  const take = (el) => {
    if (el.tagName === "img" && attr(el, "src") !== undefined) {
      const src = resolve(attr(el, "src"), ctx.base);
      return attr(el, "alt") !== undefined ? { value: src, alt: attr(el, "alt") } : src;
    }
    if (el.tagName === "object" && attr(el, "data") !== undefined) return resolve(attr(el, "data"), ctx.base);
    return undefined;
  };
  const self = take(node);
  if (self !== undefined && (node.tagName === "img" || node.tagName === "object")) return self;
  for (const tag of ["img", "object"]) {
    const el = onlyOfType(node, tag);
    if (el !== undefined && !isMicroformat(el)) { const v = take(el); if (v !== undefined) return v; }
  }
  const child = onlyChild(node);
  if (child !== undefined && !isMicroformat(child)) for (const tag of ["img", "object"]) {
    const el = onlyOfType(child, tag);
    if (el !== undefined && !isMicroformat(el)) { const v = take(el); if (v !== undefined) return v; }
  }
  return undefined;
}

function impliedUrl(node, ctx) {
  const take = (el) => ((el.tagName === "a" || el.tagName === "area") && attr(el, "href") !== undefined ? resolve(attr(el, "href"), ctx.base) : undefined);
  if (node.tagName === "a" || node.tagName === "area") { const v = take(node); if (v !== undefined) return v; }
  for (const tag of ["a", "area"]) {
    const el = onlyOfType(node, tag);
    if (el !== undefined && !isMicroformat(el)) { const v = take(el); if (v !== undefined) return v; }
  }
  const child = onlyChild(node);
  if (child !== undefined && !isMicroformat(child)) for (const tag of ["a", "area"]) {
    const el = onlyOfType(child, tag);
    if (el !== undefined && !isMicroformat(el)) { const v = take(el); if (v !== undefined) return v; }
  }
  return undefined;
}

function parseItem(node, ctx, impliedType) {
  const { modern, classic } = rootsOf(node);
  const types = modern.length > 0 ? modern : [...classic.map((c) => CLASSIC_ROOTS[c].type), ...(impliedType === undefined ? [] : [impliedType])];
  const classicRoot = modern.length === 0 ? (classic[0] ?? CLASSIC_OF_TYPE[impliedType]) : undefined;
  const item = { type: [...new Set(types)].sort(), properties: {} };
  const kinds = new Set();
  const children = [];
  const walk = (parent) => {
    for (const child of elementChildren(parent)) {
      if (child.tagName === "template") continue;
      const childRoots = rootsOf(child);
      const properties = propertyClasses(child, classicRoot);
      const implied = childRoots.modern.length === 0 && childRoots.classic.length === 0 ? properties.find((p) => p.impliedType)?.impliedType : undefined;
      const isRoot = childRoots.modern.length > 0 || childRoots.classic.length > 0 || implied !== undefined;
      if (isRoot) {
        const nested = parseItem(child, ctx, implied);
        if (properties.length > 0) {
          for (const property of properties) { kinds.add(property.kind); addProperty(item, property.name, nestedValue(property.kind, nested, child, ctx), property.kind); }
        } else children.push(nested);
      } else {
        for (const property of properties) { kinds.add(property.kind); addProperty(item, property.name, plainValue(property.kind, child, ctx, property.classic), property.kind); }
        const tag = classicRoot !== undefined && REL_TAG_ROOTS.has(classicRoot) ? relTag(child, ctx) : undefined;
        if (tag !== undefined && !properties.some((p) => p.name === "category")) { kinds.add("p"); addProperty(item, "category", tag, "p"); }
        if (classicRoot === "hentry" && isBookmark(child) && !properties.some((p) => p.name === "url")) { kinds.add("u"); addProperty(item, "url", resolve(attr(child, "href"), ctx.base), "u"); }
        walk(child);
      }
    }
  };
  walk(node);
  if (children.length > 0) item.children = children;
  if (classicRoot === undefined) applyImplied(item, node, ctx, kinds);
  const id = attr(node, "id");
  if (id !== undefined && id !== "") item.id = id;
  return item;
}

/** rel-bookmark: an hEntry's permalink. */
function isBookmark(node) {
  return ["a", "area"].includes(node.tagName) && attr(node, "href") !== undefined && (attr(node, "rel") ?? "").split(/[\t\n\f\r ]+/u).includes("bookmark");
}

/** rel-tag: a link `rel="tag"` is a category named by the last path segment of its href. */
function relTag(node, ctx) {
  if (!["a", "area"].includes(node.tagName) || attr(node, "href") === undefined) return undefined;
  if (!(attr(node, "rel") ?? "").split(/[\t\n\f\r ]+/u).includes("tag")) return undefined;
  try {
    const segments = new URL(attr(node, "href"), ctx.base).pathname.split("/").filter(Boolean);
    const last = segments.at(-1);
    return last === undefined ? undefined : decodeURIComponent(last);
  } catch { return undefined; }
}

function applyImplied(item, node, ctx, kinds) {
  const props = item.properties;
  const nested = hasNestedMicroformat(item);
  if (props.name === undefined && !kinds.has("p") && !kinds.has("e") && !nested) {
    const name = impliedName(node, ctx);
    if (name !== undefined) addProperty(item, "name", name, "implied");
  }
  if (props.photo === undefined && !nested && !kinds.has("u")) {
    const photo = impliedPhoto(node, ctx);
    if (photo !== undefined) addProperty(item, "photo", photo, "implied");
  }
  if (props.url === undefined && !nested && !kinds.has("u")) {
    const url = impliedUrl(node, ctx);
    if (url !== undefined) addProperty(item, "url", url, "implied");
  }
}

function plainValue(kind, node, ctx, classic = false) {
  if (kind === "p") return pValue(node, ctx);
  if (kind === "u") { const value = uValue(node, ctx); return classic && typeof value === "object" ? value.value : value; }
  if (kind === "dt") return dtValue(node, ctx);
  return eValue(node, ctx);
}

function nestedValue(kind, nested, node, ctx) {
  let value;
  if (kind === "p") value = firstFrom(nested, "name", "p") ?? pValue(node, ctx);
  else if (kind === "u") value = firstFrom(nested, "url", "u") ?? (nested.properties.url === undefined ? uValue(node, ctx) : plainText(node, ctx));
  else if (kind === "dt") value = dtValue(node, ctx);
  else return { ...eValue(node, ctx), ...nested };
  return { value, ...nested };
}

// -- rels ------------------------------------------------------------------------------------------------------------------------
function collectRels(root, ctx) {
  const rels = {};
  const relUrls = {};
  for (const el of descendants(root)) {
    if (!["a", "area", "link"].includes(el.tagName)) continue;
    const href = attr(el, "href");
    const relAttr = attr(el, "rel");
    if (href === undefined || relAttr === undefined) continue;
    const names = [...new Set(relAttr.split(/[\t\n\f\r ]+/u).filter(Boolean).map((r) => r.toLowerCase()))];
    if (names.length === 0) continue;
    const url = resolve(href, ctx.base);
    for (const name of names) {
      rels[name] ??= [];
      if (!rels[name].includes(url)) rels[name].push(url);
    }
    const entry = relUrls[url] ??= { rels: [] };
    for (const name of names) if (!entry.rels.includes(name)) entry.rels.push(name);
    entry.rels.sort();
    for (const field of ["hreflang", "media", "title", "type"]) if (entry[field] === undefined && attr(el, field) !== undefined) entry[field] = attr(el, field);
    if (entry.text === undefined) entry.text = plainText(el, ctx, { trim: false });
  }
  return { rels, relUrls };
}

/** The first `<base href>` of the document, resolved against `baseUrl`. */
function documentBase(document, baseUrl) {
  for (const el of descendants(document)) {
    if (el.tagName === "base" && attr(el, "href") !== undefined) return resolve(attr(el, "href"), baseUrl);
  }
  return baseUrl;
}

/**
 * Parse an HTML document for microformats2.
 * @param html the markup.
 * @param options `{ baseUrl }`, the document's URL, for resolving relative references.
 * @returns `{ items, rels, "rel-urls" }`.
 */
export function parseMicroformats(html, options = {}) {
  if (typeof html !== "string") throw new TypeError("parseMicroformats expects an HTML string");
  const document = parseHtml(html, { scriptingEnabled: false });
  const baseUrl = options.baseUrl ?? "about:blank";
  const ctx = { base: documentBase(document, baseUrl), emitLanguage: false };
  const items = [];
  const visit = (parent) => {
    for (const child of elementChildren(parent)) {
      if (child.tagName === "template") continue;
      const { modern, classic } = rootsOf(child);
      if (modern.length > 0 || classic.length > 0) items.push(parseItem(child, ctx));
      else visit(child);
    }
  };
  visit(document);
  const { rels, relUrls } = collectRels(document, ctx);
  return { items, rels, "rel-urls": relUrls };
}
