import { append, get, has, logDates, put, readLog } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
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
 * An activity held is a `held-peer-delivery` record `{ recipient, activity }` (holding the same activity
 * again is the same record) and one log line `{ at, recipient, of }` naming it, at the instant it was held, which
 * the peer's pull reads: a late admission is read from the day it was held, never from the day its activity names.
 */
export const HELD_DELIVERY_TYPE = "held-peer-delivery";
const HELD_PAGE = 50;

/** Hold one activity for `recipient`. Holding the same activity again is a no-op. */
export function holdForPeer({ dataRoot, recipient, activity }) {
  if (typeof dataRoot !== "string" || dataRoot === "") throw new TypeError("holding a delivery needs this node's data root");
  if (typeof recipient !== "string" || recipient === "") throw new TypeError("a held delivery names the actor it is held for");
  if (activity === null || typeof activity !== "object" || Array.isArray(activity)) throw new TypeError("a held delivery is one authored activity");
  const record = JSON.parse(JSON.stringify({ recipient, activity }));
  const id = semanticId(record);
  if (has(dataRoot, HELD_DELIVERY_TYPE, id)) return Object.freeze({ held: true, recipient, id });
  // The line first: a line whose record never arrived reads as nothing, and a record without its line would never be pulled.
  append(dataRoot, HELD_DELIVERY_TYPE, { at: new Date().toISOString(), recipient, of: id });
  put(dataRoot, HELD_DELIVERY_TYPE, record);
  return Object.freeze({ held: true, recipient, id });
}

const CURSOR = /^held-v3\.(\d{4}-\d{2}-\d{2})\.(\d{1,15})$/u;
const invalidCursor = message => Object.assign(new TypeError(message), { code: "ERR_HELD_DELIVERY_CURSOR" });

/** Where a pull resumes in the held log: the day and the byte position after the last line it read. */
function cursorOf(after) {
  if (after === undefined || after === null) return { date: null, position: 0 };
  const found = typeof after === "string" ? CURSOR.exec(after) : null;
  if (found === null) throw invalidCursor("held delivery cursor must be a valid cursor: held-v3.<day>.<position>");
  return { date: found[1], position: Number(found[2]) };
}

const encodeCursor = ({ date, position }) => (date === null ? undefined : `held-v3.${date}.${position}`);

/**
 * A bounded page of the held log, read from the cursor's day and byte position: the activities held
 * for `recipient`, oldest first, each once. The cursor it returns stands after the last line read, so a
 * fifty-item page cannot acknowledge its unsent tail; later days and appends to the cursor's day are read
 * from their own positions.
 */
export function heldDeliveryPage({ dataRoot, recipient, after, limit = HELD_PAGE }) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError("held delivery page limit must be a positive integer");
  const cap = Math.min(limit, HELD_PAGE);
  const start = cursorOf(after);
  let cursor = start;
  const rows = [], seen = new Set();
  outer: for (const date of logDates(dataRoot, HELD_DELIVERY_TYPE)) {
    if (start.date !== null && date < start.date) continue;
    for (const { line, next } of readLog(dataRoot, HELD_DELIVERY_TYPE, date, { from: date === start.date ? start.position : 0 })) {
      cursor = { date, position: next };
      if (line.recipient !== recipient || typeof line.of !== "string" || seen.has(line.of)) continue;
      const record = get(dataRoot, HELD_DELIVERY_TYPE, line.of);
      if (record === undefined) continue;
      seen.add(line.of);
      rows.push(Object.freeze({ id: line.of, activity: record.activity }));
      if (rows.length === cap) break outer;
    }
  }
  return Object.freeze({ items: Object.freeze(rows), after: encodeCursor(cursor) });
}

/** Held activities after a cursor. */
export function heldFor(options) { return heldDeliveryPage(options).items; }

/**
 * Hand one addressed activity to its recipient: pushed to its inbox, or, when the recipient is a
 * known-intermittent peer, held for it to pull. A push to such a peer could reach it only while it
 * is present, and a queued delivery that never arrives says nothing to its sender, so this node
 * holds instead of pushing; the peer pulls whatever it lacks when it is there.
 */
export async function deliverOrHold({ config, provider, deliver = deliverActivity, request, at }) {
  if (presenceOf(config, request.recipient) === "known-intermittent" && config.metroplatDataRoot !== undefined) {
    return holdForPeer({ dataRoot: config.metroplatDataRoot, recipient: request.recipient, activity: request.activity });
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
  try { cursorOf(after); }
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
  if (items.length > 0 && delivery.after !== undefined) next.searchParams.set("after", delivery.after);
  return new Response(JSON.stringify({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: self.href,
    type: "OrderedCollectionPage",
    partOf: new URL(`/actors/${encodeURIComponent(instance)}/outbox`, config.publicBaseUrl).href,
    orderedItems: items.map(({ activity }) => activity),
    ...(items.length > 0 ? { next: next.href } : {}),
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
