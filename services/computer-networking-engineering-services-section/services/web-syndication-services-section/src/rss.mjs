/**
 * rss -- RSS 2.0 (https://www.rssboard.org/rss-specification) with the RSS Best Practices Profile:
 * required channel `title`, `link` and `description`; items with a `title` or a `description`; a
 * permalink-flagged `guid`; RFC 822 `pubDate`; `atom:link rel="self"`; `enclosure` for attachments;
 * `dc:creator`; `content:encoded` in a CDATA section; and the RFC 5005 relations as `atom:link`s
 * with `fh:complete` / `fh:archive` when the channel asserts them.
 */
import { toRfc822 } from "./dates.mjs";
import { effectiveAuthor, escapeXml, feedUpdated, normalizeFeed } from "./model.mjs";

const cdata = (text) => `<![CDATA[${String(text).replace(/\]\]>/gu, "]]]]><![CDATA[>")}]]>`;
const line = (indent, name, value) => (value === undefined || value === "" ? "" : `${indent}<${name}>${escapeXml(value)}</${name}>\n`);

/** Serialize a channel and items as an RSS 2.0 document. */
export function serializeRss(channelInput, itemsInput) {
  const { channel, items } = normalizeFeed(channelInput, itemsInput);
  const built = feedUpdated(channel, items);
  const fh = channel.complete || channel.archive;
  let out = `<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"${fh ? ' xmlns:fh="http://purl.org/syndication/history/1.0"' : ""}>\n  <channel>\n`;
  out += line("    ", "title", channel.title);
  out += line("    ", "link", channel.homePageUrl);
  out += line("    ", "description", channel.description ?? channel.title);
  out += line("    ", "language", channel.language);
  if (built) out += line("    ", "lastBuildDate", toRfc822(built));
  out += `    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>\n`;
  for (const l of channel.links) out += `    <atom:link rel="${escapeXml(l.rel)}" href="${escapeXml(l.href)}"${l.type ? ` type="${escapeXml(l.type)}"` : ""}${l.title ? ` title="${escapeXml(l.title)}"` : ""}/>\n`;
  if (channel.complete) out += "    <fh:complete/>\n";
  if (channel.archive) out += "    <fh:archive/>\n";
  if (channel.iconUrl) out += `    <image>\n      <url>${escapeXml(channel.iconUrl)}</url>\n      <title>${escapeXml(channel.title)}</title>\n      <link>${escapeXml(channel.homePageUrl)}</link>\n    </image>\n`;
  for (const item of items) {
    const author = effectiveAuthor(item, channel);
    if (item.title === undefined && item.summary === undefined && item.contentHtml === undefined && item.contentText === undefined) throw new TypeError(`item ${item.id} needs a title or a description (RSS 2.0)`);
    out += "    <item>\n";
    out += line("      ", "title", item.title);
    out += line("      ", "link", item.url);
    out += `      <guid isPermaLink="${item.id === item.url}">${escapeXml(item.id)}</guid>\n`;
    if (item.published) out += line("      ", "pubDate", toRfc822(item.published));
    if (author) out += line("      ", "dc:creator", author.name);
    out += line("      ", "description", item.summary ?? item.contentText);
    if (item.contentHtml) out += `      <content:encoded>${cdata(item.contentHtml)}</content:encoded>\n`;
    for (const tag of item.tags ?? []) out += line("      ", "category", tag);
    for (const a of item.attachments) out += `      <enclosure url="${escapeXml(a.url)}" length="${a.sizeInBytes ?? 0}" type="${escapeXml(a.mimeType)}"/>\n`;
    out += "    </item>\n";
  }
  return `${out}  </channel>\n</rss>\n`;
}
