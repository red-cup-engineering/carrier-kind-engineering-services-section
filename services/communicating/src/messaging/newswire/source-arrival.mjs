// A feed observation is a SignCell utterance projected through communicating's
// CloudEvents carrier. Its claim names the feed, item, and replay identity.

import { sha256Digest } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { mark, utterance } from "@red-cup-engineering/signcell/utterance";
import { cloudEventCarrier, cloudEventFromUtterance } from "../cloudevents.mjs";
const FEED_KINDS = Object.freeze(["rss", "atom"]);
const EVENT_TYPE = "assertive";

function fail(where, message) {
  throw new TypeError(`${where}: ${message}`);
}

function text(value, where, name) {
  if (typeof value !== "string" || value.trim() === "") fail(where, `${name} must be a non-empty string`);
  return value;
}

function httpUrl(value, where, name) {
  text(value, where, name);
  let url;
  try { url = new URL(value); } catch { fail(where, `${name} must be a URL`); }
  if (url.protocol !== "http:" && url.protocol !== "https:") fail(where, `${name} must be an http(s) URL`);
  return value;
}

function isoTime(value, where, name) {
  text(value, where, name);
  if (!Number.isFinite(Date.parse(value))) fail(where, `${name} must be an ISO 8601 time`);
  return value;
}

/** A syndication feed the broker reads: `{ id, url, kind }`, kind rss or atom. */
export const syndicationFeed = Object.freeze({
  assert(value, where = "syndication feed") {
    if (!value || typeof value !== "object") fail(where, "must be an object");
    if (!FEED_KINDS.includes(value.kind)) fail(where, `kind must be one of ${FEED_KINDS.join(", ")}`);
    return Object.freeze({ id: text(value.id, where, "id"), url: httpUrl(value.url, where, "url"), kind: value.kind });
  },
});

function itemTextList(value, where, name) {
  if (!Array.isArray(value) || value.length > 64) fail(where, `${name} must be an array of at most 64 strings`);
  return Object.freeze(value.map((entry) => text(entry, where, name)));
}

function assertItem(item, where) {
  if (!item || typeof item !== "object") fail(where, "item must be an object");
  return Object.freeze({
    externalId: text(item.externalId, where, "item.externalId"),
    url: httpUrl(item.url, where, "item.url"),
    title: text(item.title, where, "item.title"),
    ...(item.summary === undefined ? {} : { summary: text(item.summary, where, "item.summary") }),
    ...(item.published === undefined ? {} : { published: isoTime(item.published, where, "item.published") }),
    ...(item.authors === undefined ? {} : { authors: itemTextList(item.authors, where, "item.authors") }),
    ...(item.categories === undefined ? {} : { categories: itemTextList(item.categories, where, "item.categories") }),
  });
}

/** The key two observations of one feed item share, whenever they were made. */
export function sourceArrivalKey(feedId, externalId) {
  return sha256Digest(`${feedId}\n${externalId}`);
}

/** A source arrival: a CloudEvents 1.0 envelope carrying one feed item's first observation. */
export const sourceArrival = Object.freeze({
  assert(value, where = "source arrival") {
    cloudEventCarrier.assert(value, where);
    if (value.type !== EVENT_TYPE) fail(where, `type must be ${EVENT_TYPE}`);
    const feed = syndicationFeed.assert(value.data?.feed, `${where} feed`);
    const item = assertItem(value.data?.item, where);
    const deduplicationKey = sourceArrivalKey(feed.id, item.externalId);
    if (value.data?.deduplicationKey !== deduplicationKey) fail(where, "deduplicationKey does not match the feed and item");
    if (value.source !== feed.url) fail(where, "source must name the observed feed");
    isoTime(value.time, where, "time");
    return Object.freeze({ ...value, data: Object.freeze({ feed, item, deduplicationKey }) });
  },
});

/** The source arrival for one observed feed item. */
export function sourceArrivalFromObservation({ feed, item, observedAt }) {
  const admittedFeed = syndicationFeed.assert(feed, "observed feed");
  const admittedItem = assertItem(item, "observed item");
  const deduplicationKey = sourceArrivalKey(admittedFeed.id, admittedItem.externalId);
  const time = isoTime(observedAt, "observation", "observedAt");
  return sourceArrival.assert(cloudEventFromUtterance(
    utterance(mark(admittedFeed.url), mark({ feed: admittedFeed, item: admittedItem, deduplicationKey })),
    EVENT_TYPE,
    time,
    { id: `${deduplicationKey}@${time}` },
  ));
}
