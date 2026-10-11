import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { journalCursorStart } from "@red-cup-engineering/semiotic-eavt-services-section/read-semantic-records-since";
import { semanticRecordOf } from "@red-cup-engineering/semiotic-eavt-services-section/query-semantic-records";
import { parseJournalWitness } from "@red-cup-engineering/semiotic-eavt-services-section/journal/event";
import { journalDirectoryOf } from "@red-cup-engineering/semiotic-eavt-services-section/journal/store-root";
import { kindFeeds, feedSize, linesFrom } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/feed-tail";
import { segmentPath } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/segment-store";
import { relative } from "node:path";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { deliverActivity } from "@red-cup-engineering/activitypub-services-section";

/**
 * How present a peer actor is: its own declaration in `peerPresences`, else the work peers' shared
 * presence, else continuous. A known-intermittent peer has no inbound transport while it is away
 * (a colony in an ephemeral cloud environment: its HTTPS transport sends and never receives).
 */
export function presenceOf(config, actor) {
  return config.peerPresences?.[actor] ?? config.workPeerPresence ?? "continuous";
}

/**
 * What this node holds for a known-intermittent peer: each activity it addressed to that peer,
 * kept as it was authored, under the peer's actor, until the peer pulls it (`heldDeliveryResponse`).
 */
export const HELD_DELIVERY_OBJECT_KIND = "held-peer-delivery";
const HELD_PAGE = 50;

const heldJournal = (dataRoot) => createSemanticRecordJournal({ root: dataRoot, objectKind: HELD_DELIVERY_OBJECT_KIND });

/** The held activities addressed to `recipient`, oldest first, each once, as { id, activity }. */
function heldRows(dataRoot, recipient) {
  const seen = new Set();
  const rows = [];
  for (const { id, record } of heldJournal(dataRoot).query({ category: "held" })) {
    if (record?.recipient !== recipient || seen.has(id)) continue;
    seen.add(id);
    rows.push(Object.freeze({ id, activity: record.activity }));
  }
  return rows;
}

/** Hold one activity for `recipient`. Holding the same activity again is a no-op. */
export function holdForPeer({ dataRoot, recipient, activity, at = new Date().toISOString() }) {
  if (typeof dataRoot !== "string" || dataRoot === "") throw new TypeError("holding a delivery needs this node's data root");
  if (typeof recipient !== "string" || recipient === "") throw new TypeError("a held delivery names the actor it is held for");
  if (activity === null || typeof activity !== "object" || Array.isArray(activity)) throw new TypeError("a held delivery is one authored activity");
  const record = JSON.parse(JSON.stringify({ recipient, activity }));
  const bytes = JSON.stringify(record.activity);
  const known = heldRows(dataRoot, recipient).find((row) => JSON.stringify(row.activity) === bytes);
  if (known !== undefined) return Object.freeze({ held: true, recipient, id: known.id });
  const { id } = heldJournal(dataRoot).record({ category: "held", recordedAt: at, record, told: { for: true, against: false } });
  return Object.freeze({ held: true, recipient, id });
}

const HELD_CURSOR = "held-peer-delivery.cursor.v1";
const CURSOR_PREFIX = "held-v2.";
const INLINE_CURSOR_PREFIX = "held-v1.";
const ADDRESS = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const CURSOR_ADDRESS = /^held-v2\.[A-Za-z0-9_-]{43}$/u;
const cursorJournal = dataRoot => createSemanticRecordJournal({ root: dataRoot, objectKind: "held-peer-delivery-cursor" });
const invalidCursor = message => Object.assign(new TypeError(message), { code: "ERR_HELD_DELIVERY_CURSOR" });

function cursorOf(after, recipient, dataRoot) {
  // An old semantic address cannot prove an admission frontier. Replay it safely once.
  if (after === undefined || after === null || ADDRESS.test(after)) {
    return { cursor: journalCursorStart(HELD_DELIVERY_OBJECT_KIND), reset: after != null };
  }
  let value;
  if (typeof after === "string" && CURSOR_ADDRESS.test(after)) {
    const id = "ni:///sha-256;" + after.slice(CURSOR_PREFIX.length);
    value = cursorJournal(dataRoot).query({ category: "continuation" }).find(row => row.id === id)?.record;
    if (value === undefined) throw invalidCursor("held delivery cursor is not in this node's custody");
  } else if (typeof after === "string" && after.startsWith(INLINE_CURSOR_PREFIX) && after.length <= 65536) {
    // Accept already issued inline cursors that fit transport, but never emit another one.
    try { value = JSON.parse(Buffer.from(after.slice(INLINE_CURSOR_PREFIX.length), "base64url").toString("utf8")); }
    catch { throw invalidCursor("held delivery cursor must contain valid cursor data"); }
  } else {
    throw invalidCursor("held delivery cursor must be one bounded admission cursor");
  }
  const cursor = value?.cursor;
  if (value?.kind !== HELD_CURSOR || value.recipient !== recipient
    || cursor?.kind !== "semiotic-eavt.journal-cursor.v1" || cursor.objectKind !== HELD_DELIVERY_OBJECT_KIND
    || cursor.feeds === null || typeof cursor.feeds !== "object" || Array.isArray(cursor.feeds)
    || Object.values(cursor.feeds).some(offset => !Number.isSafeInteger(offset) || offset < 0)) {
    throw invalidCursor("held delivery cursor must belong to this recipient and journal");
  }
  return { cursor, reset: false };
}

function encodeCursor(cursor, recipient, dataRoot) {
  // Keep the complete frontier in existing durable semantic custody. Only its fixed-length
  // content identity travels in the signed URL, independently of how many daily feeds exist.
  // This separate object kind never changes the held-delivery feeds being acknowledged.
  const journal = cursorJournal(dataRoot);
  const record = { kind: HELD_CURSOR, recipient, cursor };
  const bytes = canonicalJson(record);
  const existing = journal.query({ category: "continuation" }).find(row => canonicalJson(row.record) === bytes);
  const id = existing?.id ?? journal.record({ category: "continuation", record,
    recordedAt: new Date().toISOString(), told: { for: true, against: false } }).id;
  if (!ADDRESS.test(id)) throw new TypeError("held delivery custody returned no canonical content identity");
  return CURSOR_PREFIX + id.slice("ni:///sha-256;".length);
}

/**
 * A bounded page in the journal's append custody, never a recordedAt watermark. The Data owner's
 * feed handles, byte reader and witness projection are the same contracts readSince uses. Retain
 * offsets only through the page's last admitted witness, so a fifty-item page cannot acknowledge
 * its unsent tail. New earlier-date feeds and appends to old feeds are read from their own offsets.
 * A shortened feed replays, as the native journal cursor contract requires.
 */
export function heldDeliveryPage({ dataRoot, recipient, after, limit = HELD_PAGE }) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError("held delivery page limit must be a positive integer");
  const cap = Math.min(limit, HELD_PAGE);
  const start = cursorOf(after, recipient, dataRoot);
  const store = journalDirectoryOf(heldJournal(dataRoot).root);
  const feeds = kindFeeds(store, HELD_DELIVERY_OBJECT_KIND);
  const shortened = feeds.some(log => feedSize(log) < (start.cursor.feeds[relative(store, log)] ?? 0));
  const positions = shortened ? {} : { ...start.cursor.feeds };
  const rows = [], seen = new Set();
  outer: for (const log of feeds) {
    const feed = relative(store, log), from = positions[feed] ?? 0, end = feedSize(log);
    for (const entry of linesFrom(segmentPath(log), from, end)) {
      const record = semanticRecordOf(parseJournalWitness(JSON.parse(entry.line)));
      positions[feed] = entry.next;
      if (record?.category !== "held" || record.record?.recipient !== recipient || seen.has(record.id)) continue;
      seen.add(record.id);
      rows.push(Object.freeze({ id: record.id, activity: record.record.activity }));
      if (rows.length === cap) break outer;
    }
  }
  const cursor = Object.freeze({ ...journalCursorStart(HELD_DELIVERY_OBJECT_KIND), feeds: Object.freeze(positions) });
  return Object.freeze({ items: Object.freeze(rows), after: encodeCursor(cursor, recipient, dataRoot), reset: start.reset || shortened });
}

/** Held activities after an admission cursor; historical address cursors safely replay. */
export function heldFor(options) { return heldDeliveryPage(options).items; }

/**
 * Hand one addressed activity to its recipient: pushed to its inbox, or, when the recipient is a
 * known-intermittent peer, held for it to pull. A push to such a peer could reach it only while it
 * is present, and a queued delivery that never arrives says nothing to its sender, so this node
 * holds instead of pushing; the peer pulls whatever it lacks when it is there.
 */
export async function deliverOrHold({ config, provider, deliver = deliverActivity, request, at }) {
  if (presenceOf(config, request.recipient) === "known-intermittent" && config.metroplatDataRoot !== undefined) {
    return holdForPeer({ dataRoot: config.metroplatDataRoot, recipient: request.recipient, activity: request.activity, at });
  }
  return deliver(provider, request);
}

/**
 * The actor whose key verifiably signed `request`, as the ActivityPub provider (Fedify) reads its
 * HTTP signature on the provider's declared public face; undefined when it is unsigned or does not verify.
 */
export async function signedRequestActor(provider, request) {
  const url = new URL(request.url);
  const onFace = new Request(new URL(url.pathname + url.search, provider.origin), request);
  const owner = await provider.federation.createContext(onFace, undefined).getSignedKeyOwner();
  return owner?.id?.href;
}

const heldRefusal = (status, reason) => Response.json({ type: "HeldDeliveryRefusal", reason }, {
  status, headers: { "cache-control": "private, no-store" },
});

/**
 * Serve a known-intermittent peer what is held for it: a GET of this node's instance actor outbox
 * with `held-for=<peer actor>` (and `after=<custodied continuation>` to resume), signed by that same actor.
 * `signerOf(request)` answers the actor whose key verifiably signed the request, or nothing.
 * Anything else is not this route (undefined) and falls through to the ordinary outbox.
 */
export async function heldDeliveryResponse({ config, request, signerOf }) {
  const url = new URL(request.url);
  const recipient = url.searchParams.get("held-for");
  if (request.method !== "GET" || recipient === null || !/^\/actors\/[^/]+\/outbox$/u.test(url.pathname)) return undefined;
  const instance = config.activityPub?.instanceActor?.identifier;
  if (instance === undefined || url.pathname !== `/actors/${encodeURIComponent(instance)}/outbox`) {
    return heldRefusal(404, "held deliveries are served at this node's instance actor outbox");
  }
  if (config.metroplatDataRoot === undefined) return heldRefusal(404, "this node keeps no data root and holds nothing");
  let signer;
  try { signer = await signerOf(request); } catch { signer = undefined; }
  if (typeof signer !== "string") return heldRefusal(401, "a pull of held deliveries must be signed by the actor they are held for");
  if (signer !== recipient) return heldRefusal(403, "a peer pulls only what is held for its own actor");
  if (presenceOf(config, signer) !== "known-intermittent") return heldRefusal(403, `${signer} is not a known-intermittent peer of this node; nothing is held for it`);
  const after = url.searchParams.get("after") ?? undefined;
  try { cursorOf(after, recipient, config.metroplatDataRoot); }
  catch (error) {
    if (error.code !== "ERR_HELD_DELIVERY_CURSOR") throw error;
    return heldRefusal(400, error.message);
  }
  const delivery = heldDeliveryPage({ dataRoot: config.metroplatDataRoot, recipient, after });
  const items = delivery.items;
  const page = new URL(`/actors/${encodeURIComponent(instance)}/outbox`, config.publicBaseUrl);
  page.searchParams.set("held-for", recipient);
  const self = new URL(page);
  if (url.searchParams.has("after")) self.searchParams.set("after", url.searchParams.get("after"));
  const next = new URL(page);
  if (items.length > 0) next.searchParams.set("after", delivery.after);
  return new Response(JSON.stringify({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: self.href,
    type: "OrderedCollectionPage",
    partOf: new URL(`/actors/${encodeURIComponent(instance)}/outbox`, config.publicBaseUrl).href,
    orderedItems: items.map(({ activity }) => activity),
    ...(items.length > 0 ? { next: next.href } : {}),
    ...(delivery.reset ? { heldCursorReset: true } : {}),
  }), { status: 200, headers: { "content-type": "application/activity+json", "cache-control": "private, no-store" } });
}

/** A GET signed by this node's instance actor, through the ActivityPub provider's own key custody. */
export const signedGetAs = (provider, identifier) => async (url) => {
  if (provider?.federation === undefined || provider.origin === undefined) throw new TypeError("pulling held deliveries requires the instance ActivityPub actor");
  const load = await provider.federation.createContext(new URL(provider.origin), undefined).getDocumentLoader({ identifier });
  return (await load(url)).document;
};


export function failuresSaid(failed, limit = 3) {
  const counts = new Map();
  for (const { why = "no reason given" } of failed) counts.set(why, (counts.get(why) ?? 0) + 1);
  return [...counts].sort((left, right) => right[1] - left[1]).slice(0, limit)
    .map(([why, count]) => `${count} × ${why.slice(0, 300)}`).join("; ");
}

/**
 * A failed move is tolerated as away only when every attributed failed recipient is effectively
 * known-intermittent. The shared default must never excuse a continuous per-peer override.
 * Existing callers supplying an explicit single presence retain that single-peer contract;
 * the host always supplies its complete config and genuine per-move peer observations.
 */
export function catchUpOutcome({ shipped, failed, peers = [] }, policy = "continuous") {
  const held = failed.filter(entry => {
    if (!entry.away) return false;
    if (typeof policy === "string") return policy === "known-intermittent";
    const recipients = peers.flatMap(({ peer, failed: attempts = [] }) => attempts
      .filter(attempt => entry.id !== undefined && attempt.id === entry.id)
      .map(attempt => ({ peer, ...attempt })));
    // Missing recipient evidence cannot earn intermittent tolerance.
    return recipients.length > 0 && recipients.every(({ peer, away }) => away === true
      && presenceOf(policy, peer) === "known-intermittent");
  });
  const undelivered = failed.filter(entry => !held.includes(entry));
  if (undelivered.length > 0) throw new TypeError(`work-peer-catch-up: ${undelivered.length} of ${shipped.length + failed.length} moves were not delivered: ${failuresSaid(undelivered)}`);
  return Object.freeze({ shipped: shipped.length, ...(held.length === 0 ? {} : { held: held.length, peer: "away" }) });
}
