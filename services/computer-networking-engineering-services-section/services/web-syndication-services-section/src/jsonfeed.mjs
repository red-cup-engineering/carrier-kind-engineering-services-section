/**
 * jsonfeed -- JSON Feed 1.1 (https://www.jsonfeed.org/version/1.1/). Required: `version`, `title`, `items`;
 * each item has an `id` string and `content_html` or `content_text` (an item with neither gets the
 * summary or title as `content_text`, so it is never invalid); `authors` (1.1, an array); `language`;
 * `attachments`; `next_url` for paging (from a `next` or `prev-archive` link, RFC 5005).
 */
import { toRfc3339 } from "./dates.mjs";
import { effectiveAuthor, normalizeFeed } from "./model.mjs";

const author = (who) => (who ? { name: who.name, ...(who.url ? { url: who.url } : {}) } : undefined);

/** The JSON Feed 1.1 object for a channel and items. */
export function jsonFeedObject(channelInput, itemsInput) {
  const { channel, items } = normalizeFeed(channelInput, itemsInput);
  const next = channel.links.find((l) => l.rel === "next") ?? channel.links.find((l) => l.rel === "prev-archive");
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: channel.title,
    home_page_url: channel.homePageUrl,
    feed_url: channel.feedUrl,
    ...(channel.description ? { description: channel.description } : {}),
    ...(channel.language ? { language: channel.language } : {}),
    ...(channel.iconUrl ? { icon: channel.iconUrl } : {}),
    ...(channel.author ? { authors: [author(channel.author)] } : {}),
    ...(next ? { next_url: next.href } : {}),
    items: items.map((item) => {
      const who = author(effectiveAuthor(item, channel));
      return {
        id: item.id,
        url: item.url,
        ...(item.title ? { title: item.title } : {}),
        ...(item.contentHtml ? { content_html: item.contentHtml } : {}),
        ...(item.contentText || !item.contentHtml ? { content_text: item.contentText ?? item.summary ?? item.title ?? item.url } : {}),
        ...(item.summary ? { summary: item.summary } : {}),
        ...(item.imageUrl ? { image: item.imageUrl } : {}),
        ...(item.published ? { date_published: toRfc3339(item.published) } : {}),
        ...(item.updated ? { date_modified: toRfc3339(item.updated) } : {}),
        ...(who ? { authors: [who] } : {}),
        ...(item.tags?.length ? { tags: [...item.tags] } : {}),
        ...(item.language ? { language: item.language } : {}),
        ...(item.attachments.length ? { attachments: item.attachments.map((a) => ({ url: a.url, mime_type: a.mimeType, ...(a.title ? { title: a.title } : {}), ...(a.sizeInBytes === undefined ? {} : { size_in_bytes: a.sizeInBytes }), ...(a.durationInSeconds === undefined ? {} : { duration_in_seconds: a.durationInSeconds }) })) } : {}),
      };
    }),
  };
}

/** Serialize a channel and items as a JSON Feed 1.1 document. */
export const serializeJsonFeed = (channel, items) => `${JSON.stringify(jsonFeedObject(channel, items), null, 2)}\n`;
