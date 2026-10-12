import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { Activity } from "@fedify/vocab";
import { semanticAddress } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { each, get, put, readHead, threadName, writeHead } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import path from "node:path";
import { FlatfileKvStore } from "./flatfile-kv.mjs";
import { extractSenActivity } from "./sen-activity.mjs";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";

const correlate=activity=>{
    try{
      const actor=typeof activity.actor==='string'?activity.actor:activity.actor?.id;
      const to=Array.isArray(activity.to)?activity.to[0]:activity.to;
      const recipient=typeof to==='string'?to:to?.id;
      const projection=extractSenActivity({...activity,actor},{expectedActor:actor,expectedRecipient:recipient});
      const content=admitNormalizedSemanticContent(projection.objectBytes,projection.objectNi);
      if(content.envelope.objectKind!=='metroplat.dispatch.result')return null;
      const value=termToJson(content.envelope.settledBody);
      if(typeof value.request!=='string')return null;
      return {request:value.request,sender:projection.cloudEvent.source};
    }catch{return null;}
  };

/**
 * ActivityPub custody as records of the store at one root: every verified arrival (`activitypub-inbox`),
 * every follow and its undoing (`activitypub-follower`, `following` false for an undone follow) and every
 * outgoing activity (`activitypub-outbox`) is a record carrying the instant it was recorded. Reads fold the
 * records in that order; nothing is updated in place. An arrival and an outgoing activity are also found by
 * a head named by their key, so retaining one again reads one file. Fedify's disposable key-value cache is a
 * flat-file store beside it.
 */
export const INBOX_TYPE = "activitypub-inbox";
export const FOLLOWER_TYPE = "activitypub-follower";
export const OUTBOX_TYPE = "activitypub-outbox";
const PAGE = 100;

/** Recording instants that strictly increase within the process, so record order is append order. */
function instants() {
  let last = 0;
  return () => {
    const now = Math.max(Date.now(), last + 1);
    last = now;
    return new Date(now).toISOString();
  };
}

/** Every record of a type in the order it was recorded. */
const recordedIn = (root, type) => [...each(root, type)].map(({ record }) => record)
  .sort((left, right) => (left.at < right.at ? -1 : left.at > right.at ? 1 : 0));

/** Keep a record and the head that finds it by `name`; the first record kept under a name stays. */
function keep(root, type, name, record) {
  const address = put(root, type, record);
  writeHead(root, type, threadName(semanticAddress({ type, name }).id), { frontier: [address] });
}

/** The record kept under `name`, or undefined. */
function kept(root, type, name) {
  const address = readHead(root, type, threadName(semanticAddress({ type, name }).id))?.frontier[0];
  return address === undefined ? undefined : get(root, type, address);
}

const validReceipt = (receipt) => receipt !== null && typeof receipt === "object"
  && receipt.type === "ActivityPubVerifiedArrivalReceipt"
  && receipt.version === 1
  && /^[a-f0-9]{64}$/u.test(receipt.bodySha256)
  && (typeof receipt.recipient === "string" || receipt.recipient === null);

const capOf = (limit) => Math.min(Math.max(Number.isSafeInteger(limit) ? limit : PAGE, 1), PAGE);

/** Newest-first page of `rows` (oldest first) before the cursor position. */
function pageOf(rows, { cursor, limit, invalid }) {
  const cap = capOf(limit);
  let before = rows.length;
  if (cursor !== undefined && cursor !== null) {
    before = Number(cursor);
    if (!Number.isSafeInteger(before) || before < 0 || String(before) !== String(cursor)) throw new TypeError(invalid);
  }
  const end = Math.min(before, rows.length);
  const start = Math.max(0, end - cap);
  return { items: rows.slice(start, end).reverse(), ...(start > 0 ? { nextCursor: String(start) } : {}) };
}

function inboxOf(root, now) {
  const arrivals = () => recordedIn(root, INBOX_TYPE);
  const keyOf = (receipt) => sha256Hex(canonicalJson(receipt));
  return Object.freeze({
    async retain(arrival) {
      const activity = arrival?.jsonLd;
      if (activity === null || typeof activity !== "object" || Array.isArray(activity)) throw new TypeError("verified ActivityPub arrival is required");
      const activityJson = canonicalJson(activity);
      const receipt = Object.freeze({ type: "ActivityPubVerifiedArrivalReceipt", version: 1, bodySha256: sha256Hex(activityJson), recipient: arrival.recipient ?? null });
      const key = keyOf(receipt);
      const held = kept(root, INBOX_TYPE, key);
      if (held !== undefined) {
        if (canonicalJson(held.activity) !== activityJson || canonicalJson(held.receipt) !== canonicalJson(receipt)) throw new Error("immutable ActivityPub custody record differs from the verified arrival");
        return receipt;
      }
      keep(root, INBOX_TYPE, key, { key, receipt, recipient: receipt.recipient, activity, at: now() });
      return receipt;
    },
    async replyFor({ identifier, request, sender }) {
      if ([identifier, request, sender].some(value => typeof value !== "string" || !value)) throw new TypeError("reply lookup requires its actor, request and expected sender");
      const held = arrivals().findLast(row => row.recipient === identifier && correlate(row.activity)?.request === request && correlate(row.activity)?.sender === sender);
      if (held === undefined) return null;
      if (!validReceipt(held.receipt) || held.receipt.recipient !== identifier || sha256Hex(canonicalJson(held.activity)) !== held.receipt.bodySha256 || keyOf(held.receipt) !== held.key) throw new Error("correlated reply differs from verified custody");
      return Object.freeze(held.activity);
    },
    async get(receipt) {
      if (!validReceipt(receipt)) throw new TypeError("ActivityPub verified-arrival receipt is invalid");
      const held = kept(root, INBOX_TYPE, keyOf(receipt));
      if (held === undefined) return null;
      if (canonicalJson(held.receipt) !== canonicalJson(receipt) || sha256Hex(canonicalJson(held.activity)) !== receipt.bodySha256) throw new Error("immutable ActivityPub custody record does not match its receipt");
      return Object.freeze({ activity: held.activity, receipt });
    },
    async list({ identifier, cursor, limit } = {}) {
      const rows = arrivals().filter((row) => identifier === undefined || row.recipient === identifier);
      const page = pageOf(rows, { cursor, limit, invalid: "ActivityPub inbox cursor is invalid" });
      return Object.freeze({ items: Object.freeze(page.items.map((row) => row.activity)), totalItems: rows.length, ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }) });
    },
  });
}

function followersOf(root, now) {
  /** The current followers of one identifier, in the order each first followed since it last stopped. */
  const current = (identifier) => {
    const following = new Map();
    for (const record of recordedIn(root, FOLLOWER_TYPE)) {
      if (record.identifier !== identifier) continue;
      if (record.following === true) {
        following.delete(record.actorId);
        following.set(record.actorId, { actorId: record.actorId, inboxId: record.inboxId, sharedInboxId: record.sharedInboxId ?? null });
      } else {
        following.delete(record.actorId);
      }
    }
    return [...following.values()];
  };
  return Object.freeze({
    async add({ identifier, actorId, inboxId, sharedInboxId }) {
      if (typeof identifier !== "string" || identifier === "") throw new TypeError("ActivityPub follower identifier is required");
      if (typeof actorId !== "string" || actorId === "") throw new TypeError("ActivityPub follower actorId is required");
      if (typeof inboxId !== "string" || inboxId === "") throw new TypeError("ActivityPub follower inboxId is required");
      put(root, FOLLOWER_TYPE, { identifier, actorId, inboxId, sharedInboxId: sharedInboxId ?? null, following: true, at: now() });
    },
    async remove({ identifier, actorId }) {
      if (!current(identifier).some((follower) => follower.actorId === actorId)) return;
      put(root, FOLLOWER_TYPE, { identifier, actorId, following: false, at: now() });
    },
    async count({ identifier }) { return current(identifier).length; },
    async list({ identifier, cursor, limit }) {
      const page = pageOf(current(identifier), { cursor, limit, invalid: "ActivityPub followers cursor is invalid" });
      return Object.freeze({ items: Object.freeze(page.items.map((item) => Object.freeze(item))), ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }) });
    },
  });
}

/** Outgoing activities, one immutable carrier per id, as records of the store at `root`. */
export function createActivityPubJournalOutbox({ root, now = instants() } = {}) {
  const outgoing = () => {
    const byId = new Map();
    for (const record of recordedIn(root, OUTBOX_TYPE)) if (!byId.has(record.activityId)) byId.set(record.activityId, record);
    return [...byId.values()];
  };
  const keepOutgoing = (record) => keep(root, OUTBOX_TYPE, record.activityId, { ...record, at: now() });
  const select = ({ actorId, publicOnly = false } = {}) => outgoing().filter((row) => (actorId === undefined || row.actorId === actorId) && (!publicOnly || row.isPublic));
  const open = async (row) => {
    if (semanticAddress(row.activity).id !== row.contentNi) throw new Error("ActivityPub outgoing custody differs from its SignCell identity");
    return Activity.fromJsonLd(row.activity);
  };
  return Object.freeze({
    count: (selection) => select(selection).length,
    async get({ activityId, actorId, publicOnly = false }) {
      const row = kept(root, OUTBOX_TYPE, activityId);
      return row === undefined || (publicOnly && !row.isPublic) || (actorId !== undefined && row.actorId !== actorId) ? null : open(row);
    },
    async listOutbox({ actorId, cursor, publicOnly = false } = {}) {
      if (cursor != null && (!/^[1-9][0-9]*$/u.test(String(cursor)))) throw new TypeError("ActivityPub outbox cursor is invalid");
      const rows = select({ actorId, publicOnly });
      const page = pageOf(rows, { cursor: cursor ?? undefined, limit: PAGE, invalid: "ActivityPub outbox cursor is invalid" });
      return Object.freeze({ items: Object.freeze(await Promise.all(page.items.map(open))), totalItems: rows.length, ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }) });
    },
    async retainRequest(wire, { expectedRequestNi } = {}) {
      if (!wire || typeof wire !== "object" || Array.isArray(wire) || typeof wire.id !== "string" || wire.id === "") throw new TypeError("ActivityPub request custody requires one activity with a string id");
      const activity = await Activity.fromJsonLd(wire);
      if (activity.id?.href !== wire.id) throw new TypeError("ActivityPub request id must name its durable activity");
      if (activity.typeId?.href !== "https://www.w3.org/ns/activitystreams#Create" && wire.type !== "Create") throw new TypeError("reusable actor request must be Create");
      if (activity.actorIds.length !== 1 || activity.toIds.length !== 1
          || activity.ccIds.length || activity.btoIds.length || activity.bccIds.length || activity.audienceIds.length) throw new TypeError("reusable actor request needs one sender and one private recipient");
      const actor = activity.actorIds[0].href, recipient = activity.toIds[0].href;
      if (recipient === "https://www.w3.org/ns/activitystreams#Public") throw new TypeError("reusable actor work requires a private recipient");
      const projection = extractSenActivity(wire, { expectedActor: actor, expectedRecipient: recipient });
      // The observed event and A2A message keep their real identifiers. Only
      // lookup omits messageId, which names a transmission, not changed work.
      const { messageId: _messageId, ...message } = projection.a2aMessage;
      const requestNi = semanticAddress({ actor, recipient, type: wire.type, objectNi: projection.objectNi,
        agentCard: projection.agentCard, message }).id;
      if (expectedRequestNi !== undefined && expectedRequestNi !== requestNi) throw new TypeError("admitted request identity differs from its retained source");
      const held = outgoing().find(row => row.requestNi === requestNi);
      if (held !== undefined) {
        await open(held);
        return Object.freeze({ appended: false, contentNi: held.contentNi, held: Object.freeze(held.activity) });
      }
      if (outgoing().some(row => row.activityId === wire.id)) throw new TypeError("reusable request collides with another outgoing event");
      const identity = semanticAddress(wire);
      keepOutgoing({ activityId: wire.id, actorId: actor, contentNi: identity.id, isPublic: false, requestNi, activity: JSON.parse(canonicalJson(wire)) });
      return Object.freeze({ appended: true, contentNi: identity.id, held: Object.freeze(JSON.parse(canonicalJson(wire))) });
    },
    async append(wire) {
      if (!wire || typeof wire !== "object" || Array.isArray(wire) || typeof wire.id !== "string" || wire.id === "") throw new TypeError("ActivityPub outbox append requires one activity object with a string id");
      const activity = await Activity.fromJsonLd(wire);
      if (activity.id?.href !== wire.id || activity.actorIds.length !== 1) throw new TypeError("ActivityPub outgoing custody requires one durable activity and one actor");
      const identity = semanticAddress(wire);
      const held = kept(root, OUTBOX_TYPE, wire.id);
      if (held !== undefined) {
        if (held.contentNi === identity.id) return Object.freeze({ appended: false, contentNi: held.contentNi });
        throw new TypeError("ActivityPub outgoing activity id already names different immutable content");
      }
      const visibleRecipients = [...activity.toIds, ...activity.ccIds, ...activity.audienceIds];
      const addressed = [...visibleRecipients, ...activity.btoIds, ...activity.bccIds];
      // Unaddressed authored publications preserve their existing public role.
      // Addressed peer messages stay private unless explicitly addressed to Public.
      const isPublic = addressed.length === 0 || visibleRecipients.some((id) => id.href === "https://www.w3.org/ns/activitystreams#Public");
      keepOutgoing({ activityId: wire.id, actorId: activity.actorIds[0].href, contentNi: identity.id, isPublic, activity: JSON.parse(canonicalJson(wire)) });
      return Object.freeze({ appended: true, contentNi: identity.id });
    },
  });
}

/** The whole custody of one ActivityPub state directory: store records and the flat-file KV. */
export function createActivityPubJournalCustody({ stateDirectory } = {}) {
  if (typeof stateDirectory !== "string" || stateDirectory === "") throw new TypeError("ActivityPub journal custody requires a state directory");
  const root = path.resolve(stateDirectory, "journal");
  const now = instants();
  const inbox = inboxOf(root, now);
  return Object.freeze({
    kv: new FlatfileKvStore({ directory: path.resolve(stateDirectory, "kv") }),
    inbox,
    inboxIndex: inbox,
    followers: followersOf(root, now),
    outbox: createActivityPubJournalOutbox({ root, now }),
    root,
  });
}
