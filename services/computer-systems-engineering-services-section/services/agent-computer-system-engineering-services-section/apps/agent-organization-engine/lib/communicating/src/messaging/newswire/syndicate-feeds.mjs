/** Project many admitted source feeds into configured syndicate feeds. No editorial claims. */
import { atom, jsonFeed, rss2 } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/web-feed";
import { admitSetOfFeedArrivals, normalizeFeedList } from "./feed-arrivals.mjs";
import { sourceArrival } from "./source-arrival.mjs";

const formats = Object.freeze({
  rss: { render: rss2, mediaType: "application/rss+xml; charset=utf-8" },
  atom: { render: atom, mediaType: "application/atom+xml; charset=utf-8" },
  json: { render: jsonFeed, mediaType: "application/feed+json; charset=utf-8" },
});

function nonempty(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}
function httpUrl(value, label) {
  nonempty(value, label);
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError(`${label} must be an absolute HTTP(S) URL`); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new TypeError(`${label} must be an absolute HTTP(S) URL without credentials`);
  }
  return parsed.href;
}
function unique(values, label) {
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must be unique`);
}

/**
 * Admit destination routing as data. Each source can supply many destinations,
 * and each destination can aggregate many sources. Unknown sources are refused.
 */
export function admitSyndicateRoutes({ sources, destinations }) {
  const feeds = normalizeFeedList(sources);
  unique(feeds.map((feed) => feed.id), "source feed ids");
  if (!Array.isArray(destinations) || destinations.length === 0) throw new TypeError("destinations must be a non-empty array");
  const sourceIds = new Set(feeds.map((feed) => feed.id));
  const routes = destinations.map((destination) => {
    const id = nonempty(destination?.id, "destination.id");
    const format = destination?.format;
    if (!Object.hasOwn(formats, format)) throw new TypeError(`destination ${id} has unsupported format`);
    const selected = destination?.sourceFeedIds;
    if (!Array.isArray(selected) || selected.length === 0) throw new TypeError(`destination ${id} needs sourceFeedIds`);
    selected.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) throw new TypeError(`destination ${id} names unknown source feed ${sourceId}`);
    });
    unique(selected, `destination ${id} sourceFeedIds`);
    const maxItems = destination.maxItems ?? 100;
    if (!Number.isSafeInteger(maxItems) || maxItems < 1) throw new TypeError(`destination ${id} maxItems must be positive`);
    return Object.freeze({
      id, format, sourceFeedIds: Object.freeze([...selected]), maxItems,
      title: nonempty(destination.title, `destination ${id} title`),
      homePageUrl: httpUrl(destination.homePageUrl, `destination ${id} homePageUrl`),
      feedUrl: httpUrl(destination.feedUrl, `destination ${id} feedUrl`),
      ...(destination.description === undefined ? {} : { description: nonempty(destination.description, `destination ${id} description`) }),
      ...(destination.language === undefined ? {} : { language: nonempty(destination.language, `destination ${id} language`) }),
    });
  });
  unique(routes.map((route) => route.id), "destination ids");
  unique(routes.map((route) => route.feedUrl), "destination feed URLs");
  return Object.freeze({ sources: feeds, destinations: Object.freeze(routes) });
}

function projectedItem(arrival) {
  const { item } = arrival.data;
  return {
    id: item.url, url: item.url, title: item.title,
    ...(item.summary === undefined ? {} : { summary: item.summary }),
    ...(item.published === undefined ? { updated: arrival.time } : { published: item.published }),
    ...(item.authors?.length ? { author: { name: item.authors[0] } } : {}),
    ...(item.categories?.length ? { tags: item.categories } : {}),
  };
}

/**
 * Project admitted arrival observations. A repeated original URL appears once
 * per destination; the receipt retains every contributing arrival identity.
 */
export function projectSyndicateFeeds({ routes, arrivals, observedAt }) {
  if (!routes || !Array.isArray(routes.destinations)) throw new TypeError("admitted syndicate routes are required");
  const instant = new Date(observedAt);
  if (Number.isNaN(instant.valueOf()) || instant.toISOString() !== observedAt) throw new TypeError("observedAt must be a UTC instant");
  if (!Array.isArray(arrivals)) throw new TypeError("arrivals must be an array");
  const admitted = arrivals.map((value) => sourceArrival.assert(value));
  const feeds = routes.destinations.map((route) => {
    const selected = new Set(route.sourceFeedIds);
    const byUrl = new Map();
    for (const arrival of admitted) {
      if (!selected.has(arrival.data.feed.id)) continue;
      const url = arrival.data.item.url;
      const entry = byUrl.get(url);
      if (entry) {
        entry.arrivalIds.push(arrival.id);
        entry.sourceFeedIds.add(arrival.data.feed.id);
      } else byUrl.set(url, { arrival, arrivalIds: [arrival.id], sourceFeedIds: new Set([arrival.data.feed.id]) });
    }
    const entries = [...byUrl.values()]
      .sort((left, right) => {
        const a = left.arrival.data.item.published ?? left.arrival.time;
        const b = right.arrival.data.item.published ?? right.arrival.time;
        return b.localeCompare(a) || left.arrival.data.item.url.localeCompare(right.arrival.data.item.url);
      })
      .slice(0, route.maxItems);
    const channel = {
      title: route.title, homePageUrl: route.homePageUrl, feedUrl: route.feedUrl,
      updated: observedAt,
      ...(route.description ? { description: route.description } : {}),
      ...(route.language ? { language: route.language } : {}),
    };
    const items = entries.map(({ arrival }) => projectedItem(arrival));
    return Object.freeze({
      id: route.id, format: route.format, feedUrl: route.feedUrl,
      mediaType: formats[route.format].mediaType,
      body: formats[route.format].render(channel, items),
      items: Object.freeze(entries.map(({ arrival, arrivalIds, sourceFeedIds }) => Object.freeze({
        url: arrival.data.item.url,
        sourceFeedIds: Object.freeze([...sourceFeedIds]),
        arrivalIds: Object.freeze(arrivalIds),
      }))),
    });
  });
  return Object.freeze({ observedAt, feeds: Object.freeze(feeds) });
}

/** Fetch each configured source once, then project every selected destination. */
export async function syndicateFeedSnapshot({ sources, destinations, io, observedAt = new Date().toISOString(), maxItemsPerFeed = 40 }) {
  const routes = admitSyndicateRoutes({ sources, destinations });
  const { events } = await admitSetOfFeedArrivals({
    feeds: routes.sources, cursor: { version: 2, feeds: {} }, io, maxItemsPerFeed,
    now: () => observedAt,
  });
  return projectSyndicateFeeds({ routes, arrivals: events, observedAt });
}
