/**
 * extract -- read the structured data back out of a page: the JSON-LD blocks
 * (`<script type="application/ld+json">`) and the Open Graph / Twitter Card meta tags, the way a
 * consumer (a search engine, a link unfurler, Webmention display) would.
 */
import { parse } from "parse5";

function* elements(node) {
  for (const child of node.childNodes ?? []) {
    if (typeof child.tagName === "string") yield child;
    if (child.tagName !== "template") yield* elements(child);
  }
}
const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;

/** All JSON-LD blocks of a document: `{ nodes, errors }`; a block that is not valid JSON is an error, not a throw. */
export function extractJsonLd(html) {
  const nodes = [];
  const errors = [];
  for (const el of elements(parse(html))) {
    if (el.tagName !== "script" || (attr(el, "type") ?? "").toLowerCase() !== "application/ld+json") continue;
    const text = (el.childNodes ?? []).map((c) => c.value ?? "").join("");
    try { nodes.push(JSON.parse(text)); } catch (error) { errors.push(error.message); }
  }
  return { nodes, errors };
}

/** Open Graph (`og:*`, `article:*`) and Twitter (`twitter:*`) metadata as `{ key: [values] }`. */
export function extractSocialMeta(html) {
  const meta = {};
  for (const el of elements(parse(html))) {
    if (el.tagName !== "meta") continue;
    const key = attr(el, "property") ?? attr(el, "name");
    const content = attr(el, "content");
    if (key === undefined || content === undefined || !/^(og|article|twitter|profile|book|music|video):/u.test(key)) continue;
    (meta[key] ??= []).push(content);
  }
  return meta;
}
