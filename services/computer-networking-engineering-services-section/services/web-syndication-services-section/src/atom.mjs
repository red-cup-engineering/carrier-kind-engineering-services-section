/**
 * atom -- Atom 1.0 (RFC 4287). Every MUST: `atom:id` (an IRI; an item whose id is not one is identified
 * by its URL), `atom:title`, `atom:updated` on feed and entries; an `rel="alternate"` link on each entry;
 * an author on the feed or on every entry (§4.1.1); text constructs typed `html` and escaped. RFC 5005
 * relations are `atom:link`s, with `fh:complete` / `fh:archive` markers.
 */
import { toRfc3339 } from "./dates.mjs";
import { effectiveAuthor, effectiveUpdated, escapeXml, feedUpdated, isIri, normalizeFeed } from "./model.mjs";

const person = (tag, who, indent) => `${indent}<${tag}>\n${indent}  <name>${escapeXml(who.name)}</name>\n${who.url ? `${indent}  <uri>${escapeXml(who.url)}</uri>\n` : ""}${who.email ? `${indent}  <email>${escapeXml(who.email)}</email>\n` : ""}${indent}</${tag}>\n`;

/** Serialize a channel and items as an Atom 1.0 feed. */
export function serializeAtom(channelInput, itemsInput) {
  const { channel, items } = normalizeFeed(channelInput, itemsInput);
  const updated = feedUpdated(channel, items);
  if (updated === undefined) throw new TypeError("atom:updated is required (RFC 4287 4.1.1): no dated item and no channel.updated");
  if (channel.author === undefined) {
    const missing = items.find((item) => item.author === undefined);
    if (missing) throw new TypeError(`RFC 4287 4.1.1: a feed without an author needs an author on every entry (item ${missing.id} has none)`);
  }
  const fh = channel.complete || channel.archive;
  let out = `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"${fh ? ' xmlns:fh="http://purl.org/syndication/history/1.0"' : ""}${channel.language ? ` xml:lang="${escapeXml(channel.language)}"` : ""}>\n`;
  out += `  <title>${escapeXml(channel.title)}</title>\n`;
  if (channel.description) out += `  <subtitle>${escapeXml(channel.description)}</subtitle>\n`;
  out += `  <id>${escapeXml(isIri(channel.id) ? channel.id : channel.feedUrl)}</id>\n`;
  out += `  <updated>${toRfc3339(updated)}</updated>\n`;
  out += `  <link rel="self" type="application/atom+xml" href="${escapeXml(channel.feedUrl)}"/>\n`;
  out += `  <link rel="alternate" type="text/html" href="${escapeXml(channel.homePageUrl)}"/>\n`;
  for (const l of channel.links) out += `  <link rel="${escapeXml(l.rel)}" href="${escapeXml(l.href)}" type="${escapeXml(l.type ?? "application/atom+xml")}"${l.title ? ` title="${escapeXml(l.title)}"` : ""}/>\n`;
  if (channel.complete) out += "  <fh:complete/>\n";
  if (channel.archive) out += "  <fh:archive/>\n";
  if (channel.author) out += person("author", channel.author, "  ");
  if (channel.iconUrl) out += `  <icon>${escapeXml(channel.iconUrl)}</icon>\n`;
  for (const item of items) {
    const author = item.author ?? (channel.author === undefined ? effectiveAuthor(item, channel) : undefined);
    out += "  <entry>\n";
    out += `    <title>${escapeXml(item.title ?? item.url)}</title>\n`;
    out += `    <id>${escapeXml(isIri(item.id) ? item.id : item.url)}</id>\n`;
    out += `    <link rel="alternate" type="text/html" href="${escapeXml(item.url)}"/>\n`;
    out += `    <updated>${toRfc3339(effectiveUpdated(item))}</updated>\n`;
    if (item.published) out += `    <published>${toRfc3339(item.published)}</published>\n`;
    if (author) out += person("author", author, "    ");
    if (item.summary) out += `    <summary type="html">${escapeXml(item.summary)}</summary>\n`;
    if (item.contentHtml) out += `    <content type="html">${escapeXml(item.contentHtml)}</content>\n`;
    else if (item.contentText) out += `    <content type="text">${escapeXml(item.contentText)}</content>\n`;
    for (const tag of item.tags ?? []) out += `    <category term="${escapeXml(tag)}"/>\n`;
    for (const a of item.attachments) out += `    <link rel="enclosure" type="${escapeXml(a.mimeType)}" href="${escapeXml(a.url)}"${a.sizeInBytes === undefined ? "" : ` length="${a.sizeInBytes}"`}${a.title ? ` title="${escapeXml(a.title)}"` : ""}/>\n`;
    out += "  </entry>\n";
  }
  return `${out}</feed>\n`;
}
