/**
 * model -- the one feed model every format is derived from (so a field added here appears in RSS,
 * Atom and JSON Feed at once, and a per-item author or title overrides the channel's in all three).
 *
 * Channel: `{ title, homePageUrl, feedUrl, description?, language?, author?, iconUrl?, id?, updated?,
 * links?, complete?, archive? }`. Item: `{ id, url, title?, contentHtml?, contentText?, summary?,
 * published?, updated?, author?, tags?, imageUrl?, language?, attachments? }`. Instants are RFC 3339
 * strings the caller supplies; there is no clock.
 */
import { parseRfc3339, toRfc3339 } from "./dates.mjs";

const XML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

/** Escape text or an attribute value for XML. */
export const escapeXml = (value) => (value === null || value === undefined ? "" : String(value).replace(/[&<>"']/gu, (c) => XML_ENTITIES[c]));

/** Whether `value` is an absolute IRI (a scheme and a rest), as Atom ids must be. */
export function isIri(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/u.test(value);
}

function httpUrl(value, field) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("scheme");
    return url.href;
  } catch {
    throw new TypeError(`${field} must be an absolute HTTP(S) URL`);
  }
}

function person(value, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value.name !== "string" || value.name === "") throw new TypeError(`${field}.name is required`);
  return Object.freeze({ name: value.name, ...(value.url ? { url: httpUrl(value.url, `${field}.url`) } : {}), ...(value.email ? { email: String(value.email) } : {}) });
}

function instant(value, field) {
  if (value === undefined) return undefined;
  try { parseRfc3339(value); } catch { throw new TypeError(`${field} must be an RFC 3339 instant`); }
  return toRfc3339(value);
}

const link = (l, i) => {
  if (typeof l?.rel !== "string" || l.rel === "" || typeof l.href !== "string" || l.href === "") throw new TypeError(`channel.links[${i}] needs rel and href`);
  return Object.freeze({ rel: l.rel, href: l.href, ...(l.type ? { type: l.type } : {}), ...(l.title ? { title: l.title } : {}) });
};

/** Validate and normalize a channel. */
export function normalizeChannel(channel) {
  if (channel === null || typeof channel !== "object") throw new TypeError("a channel is required");
  if (typeof channel.title !== "string" || channel.title === "") throw new TypeError("channel.title is required");
  return Object.freeze({
    title: channel.title,
    homePageUrl: httpUrl(channel.homePageUrl, "channel.homePageUrl"),
    feedUrl: httpUrl(channel.feedUrl, "channel.feedUrl"),
    ...(channel.description ? { description: String(channel.description) } : {}),
    ...(channel.language ? { language: String(channel.language) } : {}),
    ...(channel.author ? { author: person(channel.author, "channel.author") } : {}),
    ...(channel.iconUrl ? { iconUrl: httpUrl(channel.iconUrl, "channel.iconUrl") } : {}),
    ...(channel.id ? { id: String(channel.id) } : {}),
    ...(channel.updated ? { updated: instant(channel.updated, "channel.updated") } : {}),
    links: Object.freeze((channel.links ?? []).map(link)),
    complete: channel.complete === true,
    archive: channel.archive === true,
  });
}

/** Validate and normalize an item. */
export function normalizeItem(item, index = 0) {
  const field = `items[${index}]`;
  if (item === null || typeof item !== "object") throw new TypeError(`${field} must be an object`);
  if (typeof item.id !== "string" || item.id === "") throw new TypeError(`${field}.id is required`);
  const url = httpUrl(item.url, `${field}.url`);
  const published = instant(item.published, `${field}.published`);
  const updated = instant(item.updated, `${field}.updated`);
  if (published === undefined && updated === undefined) throw new TypeError(`${field} requires published or updated`);
  return Object.freeze({
    id: item.id, url,
    ...(item.title ? { title: String(item.title) } : {}),
    ...(item.contentHtml ? { contentHtml: String(item.contentHtml) } : {}),
    ...(item.contentText ? { contentText: String(item.contentText) } : {}),
    ...(item.summary ? { summary: String(item.summary) } : {}),
    ...(published ? { published } : {}),
    ...(updated ? { updated } : {}),
    ...(item.author ? { author: person(item.author, `${field}.author`) } : {}),
    ...(item.tags?.length ? { tags: Object.freeze(item.tags.map(String)) } : {}),
    ...(item.imageUrl ? { imageUrl: httpUrl(item.imageUrl, `${field}.imageUrl`) } : {}),
    ...(item.language ? { language: String(item.language) } : {}),
    attachments: Object.freeze((item.attachments ?? []).map((a, i) => {
      if (typeof a?.url !== "string" || typeof a.mimeType !== "string") throw new TypeError(`${field}.attachments[${i}] needs url and mimeType`);
      return Object.freeze({ url: httpUrl(a.url, `${field}.attachments[${i}].url`), mimeType: a.mimeType, ...(a.title ? { title: String(a.title) } : {}), ...(Number.isInteger(a.sizeInBytes) ? { sizeInBytes: a.sizeInBytes } : {}), ...(Number.isInteger(a.durationInSeconds) ? { durationInSeconds: a.durationInSeconds } : {}) });
    })),
  });
}

/** Normalize a channel and its items together. */
export function normalizeFeed(channel, items) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  return { channel: normalizeChannel(channel), items: items.map(normalizeItem) };
}

/** An item's author, else the channel's. */
export const effectiveAuthor = (item, channel) => item.author ?? channel.author;
/** An item's last-modified instant. */
export const effectiveUpdated = (item) => item.updated ?? item.published;
/** The channel's updated instant: its own, else the newest item's. */
export function feedUpdated(channel, items) {
  if (channel.updated) return channel.updated;
  return items.map(effectiveUpdated).sort().at(-1);
}
