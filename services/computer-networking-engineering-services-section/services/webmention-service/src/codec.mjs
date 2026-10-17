
/**
 * codecs/text/webmention — the Webmention wire grammars.
 *
 * Source input: a POST request body (`application/x-www-form-urlencoded`
 * or `application/json`) or an already-fetched HTML/Link-header document.
 * Target representation: a {@link MentionRequest} (admitted `source`/
 * `target`/`vouch`) or a set of discovered endpoint/link-hit facts. Loss
 * boundary: `parseMentionRequest` validates exactly `source`+`target`
 * (+ optional `vouch`) and rejects anything else — it does not attempt to
 * recover a request from a malformed body, per rule 17.
 *
 * The HTML-side readers (`webmentionEndpointsInHtml`, `linksToTarget`,
 * `outboundLinks`) reuse the generic tag scanner at
 * `formats/html/scan` rather than re-tokenizing markup here.
 *
 * @packageDocumentation
 */
import { assertHttpUrl } from "@red-cup-engineering/uri-services-section/http-url";
import { observationBatch } from "@red-cup-engineering/eavt-services-section/relation-web";
import { parseLinkHeader } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/link";
import { htmlDocumentBase, relTokens, scanHtmlStartTags } from "@red-cup-engineering/html-structural-projection-service/scan";

const TYPE_TABLE = Object.freeze([
  ["u-in-reply-to", "reply"],
  ["u-like-of", "like"],
  ["u-repost-of", "repost"],
  ["u-bookmark-of", "bookmark"],
]);

/** Elements and the URL-bearing attribute a receiver inspects while verifying (W3C Webmention 3.2.2). */
const LINK_ATTRIBUTE = Object.freeze({ a: "href", link: "href", img: "src", video: "src", audio: "src", source: "src" });

const MF2_LINK_PROPS = Object.freeze(["in-reply-to", "like-of", "repost-of", "bookmark-of"]);

/** Reject a source/target pair this codec's material cannot represent: non-URLs, non-http(s), or identical. */
export function validateMentionPair(source, target) {
  if (typeof source !== "string" || typeof target !== "string") return "source and target must both be strings";
  let s;
  let t;
  try { s = new URL(source); } catch { return "source is not a valid URL"; }
  try { t = new URL(target); } catch { return "target is not a valid URL"; }
  if (s.protocol !== "http:" && s.protocol !== "https:") return "source scheme must be http/https";
  if (t.protocol !== "http:" && t.protocol !== "https:") return "target scheme must be http/https";
  if (s.href === t.href) return "source and target must differ";
  return null;
}

/**
 * Parse a Webmention POST body into an admitted {@link MentionRequest}, or
 * throw — this codec's member is exactly `source`+`target`(+`vouch`), never
 * a partially-recovered guess.
 */
export function parseMentionRequest(rawBody, contentType = "application/x-www-form-urlencoded") {
  let source;
  let target;
  let vouch;
  if (contentType.toLowerCase().includes("application/json")) {
    let parsed;
    try {
      parsed = JSON.parse(rawBody || "{}");
    } catch {
      throw new TypeError("webmention: request body is not valid JSON");
    }
    source = typeof parsed["source"] === "string" ? parsed["source"] : undefined;
    target = typeof parsed["target"] === "string" ? parsed["target"] : undefined;
    vouch = typeof parsed["vouch"] === "string" ? parsed["vouch"] : undefined;
  } else {
    const params = new URLSearchParams(rawBody || "");
    source = params.get("source") ?? undefined;
    target = params.get("target") ?? undefined;
    vouch = params.get("vouch") ?? undefined;
  }
  if (!source || !target) throw new TypeError("webmention: source and target are required");
  const badPair = validateMentionPair(source, target);
  if (badPair) throw new TypeError(`webmention: ${badPair}`);
  return Object.freeze({ source, target, ...(vouch === undefined ? {} : { vouch }) });
}

/** Whether `target` is a resource under `baseUrl` (Webmentions this site's receiver should accept). */
export function acceptsTarget(target, baseUrl) {
  let targetUrl;
  let base;
  try { targetUrl = new URL(target); } catch { return false; }
  try { base = new URL(baseUrl); } catch { return false; }
  if (targetUrl.host !== base.host) return false;
  if (targetUrl.protocol !== base.protocol && !(base.protocol === "http:" && targetUrl.protocol === "https:")) return false;
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  if (basePath === "/") return true;
  return targetUrl.pathname === base.pathname || targetUrl.pathname.startsWith(basePath);
}

function fragmentionFallbacks(target, baseUrl = target) {
  try {
    const url = new URL(target, baseUrl);
    if (!url.hash) return [];
    url.hash = "";
    return Object.freeze([url.href]);
  } catch {
    return [];
  }
}

/** Discover `rel=webmention` endpoints advertised in an already-fetched HTML document. */
export function webmentionEndpointsInHtml(html, baseUrl) {
  const base = htmlDocumentBase(html, baseUrl);
  const found = [];
  for (const tag of scanHtmlStartTags(html)) {
    if (tag.name !== "link" && tag.name !== "a") continue;
    if (!relTokens(tag.attrs).includes("webmention")) continue;
    const href = tag.attrs["href"];
    if (href === undefined) continue;
    try {
      found.push(new URL(href, base).href);
    } catch {
      // Skip unparseable endpoints.
    }
  }
  return Object.freeze(found);
}

/** Discover `rel=webmention` endpoints advertised in an already-fetched response's `Link` header. */
export function webmentionEndpointsInLinkHeader(linkHeaderValue, responseUrl) {
  const out = [];
  for (const link of parseLinkHeader(linkHeaderValue)) {
    const rel = (link.params["rel"] ?? "").toLowerCase().split(/\s+/);
    if (!rel.includes("webmention")) continue;
    try {
      out.push(new URL(link.href, responseUrl).href);
    } catch {
      // Skip unparseable endpoints.
    }
  }
  return Object.freeze(out);
}

function linksToTargets(html, baseUrl, targets) {
  const base = htmlDocumentBase(html, baseUrl);
  const targetHrefs = new Set();
  for (const target of targets) {
    try {
      targetHrefs.add(new URL(target, base).href);
    } catch {
      // Ignore invalid fallback targets.
    }
  }
  if (targetHrefs.size === 0) return Object.freeze([]);
  const hits = [];
  for (const tag of scanHtmlStartTags(html)) {
    const attribute = LINK_ATTRIBUTE[tag.name];
    if (attribute === undefined) continue;
    const href = tag.attrs[attribute];
    if (href === undefined) continue;
    let resolved;
    try {
      resolved = new URL(href, base).href;
    } catch {
      continue;
    }
    if (!targetHrefs.has(resolved)) continue;
    const classes = (tag.attrs["class"] ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const mf2Props = MF2_LINK_PROPS.filter((prop) => classes.includes(`u-${prop}`)).map((prop) => `u-${prop}`);
    hits.push(Object.freeze({ tag: tag.name, mf2Props: Object.freeze(mf2Props), index: tag.index }));
  }
  return Object.freeze(hits);
}

/** Find `<a>`/`<link>` hits in an already-fetched document that point at `target` (or its fragmentless form). */
export function linksToTarget(html, baseUrl, target) {
  const base = htmlDocumentBase(html, baseUrl);
  return linksToTargets(html, baseUrl, [target, ...fragmentionFallbacks(target, base)]);
}

/**
 * Whether a parsed JSON source document mentions `target`: any string value exactly equal to it
 * (W3C Webmention 3.2.2: "if the document is JSON, any value ... exactly matching the target").
 * Classification reads the microformats2 JSON relation properties (`in-reply-to`, `like-of`, ...)
 * whose value, or whose nested `value`/`url`, is the target.
 */
export function jsonMentionHits(value, target) {
  const hits = [];
  const matches = (v) => {
    if (typeof v === "string") return v === target;
    if (Array.isArray(v)) return v.some(matches);
    if (v !== null && typeof v === "object") return matches(v["value"]) || matches(v["url"]) || matches(v["properties"]?.["url"]);
    return false;
  };
  const walk = (node, key) => {
    if (typeof node === "string") {
      if (node === target) hits.push(Object.freeze({ tag: "json", mf2Props: Object.freeze(MF2_LINK_PROPS.includes(key) ? [`u-${key}`] : []), index: hits.length }));
      return;
    }
    if (Array.isArray(node)) { for (const item of node) walk(item, key); return; }
    if (node !== null && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (MF2_LINK_PROPS.includes(k) && matches(v)) { hits.push(Object.freeze({ tag: "json", mf2Props: Object.freeze([`u-${k}`]), index: hits.length })); continue; }
        walk(v, k);
      }
    }
  };
  walk(value, "");
  return Object.freeze(hits);
}

/** Occurrences of `target` in a plain-text source (W3C Webmention 3.2.2: a text/plain source is a "contains" check). */
export function textMentionHits(text, target) {
  const hits = [];
  if (target === "") return Object.freeze(hits);
  for (let at = text.indexOf(target); at !== -1; at = text.indexOf(target, at + target.length)) hits.push(Object.freeze({ tag: "text", mf2Props: Object.freeze([]), index: at }));
  return Object.freeze(hits);
}

/** Every http/https link an already-fetched document points outward to. */
export function outboundLinks(html, baseUrl) {
  const base = htmlDocumentBase(html, baseUrl);
  const found = new Set();
  for (const tag of scanHtmlStartTags(html)) {
    if (tag.name !== "a" && tag.name !== "link") continue;
    const href = tag.attrs["href"];
    if (href === undefined) continue;
    try {
      const resolved = new URL(href, base);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") found.add(resolved.href);
    } catch {
      // Skip unparseable links.
    }
  }
  return Object.freeze([...found].sort());
}

/** Classify link hits by the microformats2 relation vocabulary, defaulting to a plain mention. */
export function classifyMention(hits) {
  const all = new Set();
  for (const hit of hits) for (const prop of hit.mf2Props) all.add(prop);
  for (const [prop, type] of TYPE_TABLE) if (all.has(prop)) return type;
  return "mention";
}

/**
 * A received Webmention as a SignGraph relation-web observation: its source is the receiving
 * endpoint, admitted when the mention was accepted (refused, with its reason, when it was not), and
 * its one relation is `source —type→ target` (reply, like, repost, bookmark or mention), told for
 * when the source verified, against when it retracted or was deleted, with the verdict as evidence.
 */
export function mentionObservation(result, { endpoint, receivedAt } = {}) {
  const source = { protocol: "webmention", ...(endpoint === undefined ? {} : { endpoint }), ...(receivedAt === undefined ? {} : { receivedAt }) };
  if (!result.accepted) return observationBatch({ source, admission: { status: "refused", refusal: { status: result.status, reason: result.reason ?? "refused" } }, relations: [] });
  const { verdict, request } = result;
  const relation = { subject: request.source, predicate: verdict.type ?? "mention", object: request.target, evidence: verdict };
  if (verdict.verified) return observationBatch({ source, relations: [{ ...relation, polarity: "for" }] });
  if (verdict.retract) return observationBatch({ source, relations: [{ ...relation, predicate: "mention", polarity: "against" }] });
  return observationBatch({ source, admission: { status: "refused", refusal: { status: verdict.status, reason: verdict.reason ?? verdict.status } }, relations: [] });
}
