/**
 * Microsub's request grammar: timeline and search queries and the mark read/unread/starred/unstarred
 * mutations, entries normalized to an h-feed shape, and a mutation as SignGraph relations of its reader.
 */
import { observationBatch } from "@red-cup-engineering/eavt-services-section/relation-web";

function positiveLimit(value, fallback, max) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function optional(value) {
  return value === null || value === "" ? undefined : value;
}

/** Admit a `?q=timeline` query's parameters as a {@link MicrosubTimelineRequest}. */
export function timelineRequest(params, defaultLimit, maxLimit) {
  const before = optional(params.get("before"));
  const after = optional(params.get("after"));
  return Object.freeze({
    channel: params.get("channel") || "default",
    limit: positiveLimit(params.get("limit"), defaultLimit, maxLimit),
    ...(before === undefined ? {} : { before }),
    ...(after === undefined ? {} : { after }),
  });
}

/** Admit a `?q=search` query's parameters as a {@link MicrosubSearchRequest}, or throw if no query is given. */
export function searchRequest(params, defaultLimit, maxLimit) {
  const query = params.get("search") ?? params.get("query") ?? "";
  if (!query) throw new TypeError("microsub: search query is required");
  const channel = optional(params.get("channel"));
  return Object.freeze({
    query,
    limit: positiveLimit(params.get("limit"), defaultLimit, maxLimit),
    ...(channel === undefined ? {} : { channel }),
  });
}

function entryIdentifiers(form) {
  const entries = form.getAll("entry").filter(Boolean);
  const single = form.get("url") ?? form.get("uid");
  return Object.freeze(entries.length > 0 ? entries : single ? [single] : []);
}

/** Admit a mark-read/unread/starred/unstarred form body as a {@link MicrosubMutationRequest}, or throw. */
export function mutationRequest(form) {
  const entry = entryIdentifiers(form);
  if (entry.length === 0) throw new TypeError("microsub: entry is required");
  const channel = optional(form.get("channel"));
  return Object.freeze({ entry, ...(channel === undefined ? {} : { channel }) });
}

/** Normalize a possibly-loose entry object into a {@link MicrosubEntry}, requiring a `uid`. */
export function normalizeEntry(entry) {
  if (!entry.uid) throw new TypeError("microsub: entry.uid is required");
  return Object.freeze({
    uid: entry.uid,
    ...(entry.url === undefined ? {} : { url: entry.url }),
    ...(entry.name === undefined ? {} : { name: entry.name }),
    ...(entry.content === undefined ? {} : { content: entry.content }),
    ...(entry.summary === undefined ? {} : { summary: entry.summary }),
    ...(entry.published === undefined ? {} : { published: entry.published }),
    ...(entry.updated === undefined ? {} : { updated: entry.updated }),
    ...(entry.author === undefined ? {} : { author: Object.freeze({ ...entry.author }) }),
    ...(entry.read === undefined ? {} : { read: entry.read }),
    ...(entry.starred === undefined ? {} : { starred: entry.starred }),
    ...(entry.channel === undefined ? {} : { channel: entry.channel }),
    ...(entry.category === undefined ? {} : { category: Object.freeze([...entry.category]) }),
    ...(entry.properties === undefined ? {} : { properties: Object.freeze({ ...entry.properties }) }),
  });
}

const MUTATION_RELATIONS = Object.freeze({
  mark_read: ["read", "for"], mark_unread: ["read", "against"],
  mark_starred: ["starred", "for"], mark_unstarred: ["starred", "against"],
});

/** A Microsub mutation as a SignGraph relation-web observation: each entry is read (or starred) by the
 *  reader, told for when marked and against when unmarked, the channel as the relation's datum. */
export function mutationObservation(action, request, reader) {
  const relation = MUTATION_RELATIONS[action];
  if (relation === undefined) throw new TypeError(`microsub: unsupported action ${action}`);
  const [predicate, polarity] = relation;
  return observationBatch({
    source: { protocol: "microsub", action },
    relations: request.entry.map((entry) => ({ subject: reader, predicate, object: entry, polarity, ...(request.channel === undefined ? {} : { datum: { channel: request.channel } }) })),
  });
}
