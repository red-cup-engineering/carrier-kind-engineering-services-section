// Newswire intake: read configured feeds and deliver unseen SignCell observations
// through the communicating CloudEvents carrier. The caller owns the cursor path.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { sourceArrivalFromObservation, syndicationFeed } from "./source-arrival.mjs";
import { acquireSyndicationSource } from "./source-acquisition.mjs";
import { sha256Digest } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const DEFAULT_MAX_ITEMS_PER_FEED = 40;
const SUMMARY_BYTE_LIMIT = 2048;
const TRUNCATION_MARKER = "… [truncated]";
const CURSOR_KEYS_PER_FEED = 500;

export function normalizeFeedList(value) {
  const feeds = Array.isArray(value) ? value : value?.feeds;
  if (!Array.isArray(feeds)) throw new TypeError("feed list must be an array or {feeds:[...]}");
  return Object.freeze(feeds.map((feed) => syndicationFeed.assert({ id: feed?.id, url: feed?.url, kind: feed?.kind === "atom" ? "atom" : "rss" }, "configured syndication feed")));
}

/** Provider-specific payload policy remains at the network boundary. */
export function boundSummary(text, byteLimit = SUMMARY_BYTE_LIMIT) {
  if (Buffer.byteLength(text, "utf8") <= byteLimit) return text;
  const budget = Math.max(0, byteLimit - Buffer.byteLength(TRUNCATION_MARKER, "utf8"));
  let buffer = Buffer.from(text, "utf8").subarray(0, budget);
  while (buffer.length > 0 && Buffer.from(buffer.toString("utf8"), "utf8").length !== buffer.length) buffer = buffer.subarray(0, buffer.length - 1);
  return `${buffer.toString("utf8")}${TRUNCATION_MARKER}`;
}

function legacyCursorKey(feedId, item) { return sha256Digest(`${feedId}\n${item.id ?? item.url}`); }
function itemObservation(feed, item, observedAt) {
  return sourceArrivalFromObservation({
    feed,
    observedAt,
    item: {
      externalId: item.id ?? item.url,
      url: item.url,
      title: item.title,
      ...(item.summary ? { summary: boundSummary(item.summary) } : {}),
      ...(item.published && Number.isFinite(Date.parse(item.published)) ? { published: new Date(item.published).toISOString() } : {}),
      ...(Array.isArray(item.authors) ? { authors: item.authors } : {}),
      ...(Array.isArray(item.categories) ? { categories: item.categories } : {}),
    },
  });
}

/** Load a legacy v1 cursor or the v2 canonical replay-key cursor. */
export function loadCursor(cursorPath) {
  if (!existsSync(cursorPath)) return { version: 2, feeds: {} };
  try {
    const parsed = JSON.parse(readFileSync(cursorPath, "utf8"));
    return { version: parsed?.version === 2 ? 2 : 1, feeds: parsed && typeof parsed === "object" && parsed.feeds && typeof parsed.feeds === "object" ? parsed.feeds : {} };
  } catch { return { version: 2, feeds: {} }; }
}
export function saveCursor(cursorPath, cursor) { mkdirSync(dirname(cursorPath), { recursive: true }); writeFileSync(cursorPath, `${JSON.stringify(cursor, null, 2)}\n`); }

/** Fetch through the provider effect and emit only unseen shared carriers. */
export async function admitSetOfFeedArrivals({ feeds, cursor, io = {}, maxItemsPerFeed = DEFAULT_MAX_ITEMS_PER_FEED, now = () => new Date().toISOString() }) {
  const nextCursor = { version: 2, feeds: { ...cursor.feeds } };
  const events = [], obstructions = [];
  // Each wire is an independent source: all are acquired at once, an unreachable wire is named
  // and keeps its cursor for the next admission, and arrivals fold in configured feed order.
  const configured = feeds.map((configuredFeed) => syndicationFeed.assert(configuredFeed, "configured syndication feed"));
  const acquired = await Promise.allSettled(configured.map((feed) => acquireSyndicationSource({ adapter: "rss", url: feed.url, max: maxItemsPerFeed }, io)));
  for (const [index, feed] of configured.entries()) {
    if (acquired[index].status === "rejected") { obstructions.push(Object.freeze({ feedId: feed.id, url: feed.url, reason: String(acquired[index].reason?.cause?.code ?? acquired[index].reason?.message ?? acquired[index].reason) })); continue; }
    const items = acquired[index].value;
    const seen = new Set(nextCursor.feeds[feed.id] ?? []);
    const freshKeys = [];
    for (const item of items) {
      const arrival = itemObservation(feed, item, now());
      const key = arrival.data.deduplicationKey;
      // The only v1 compatibility rule: avoid replaying already-seen legacy rows.
      if (seen.has(key) || (cursor.version === 1 && seen.has(legacyCursorKey(feed.id, item)))) continue;
      events.push(arrival); freshKeys.push(key); seen.add(key);
    }
    if (freshKeys.length > 0) nextCursor.feeds[feed.id] = [...(nextCursor.feeds[feed.id] ?? []), ...freshKeys].slice(-CURSOR_KEYS_PER_FEED);
  }
  return Object.freeze({ events: Object.freeze(events), cursor: Object.freeze(nextCursor), obstructions: Object.freeze(obstructions) });
}
