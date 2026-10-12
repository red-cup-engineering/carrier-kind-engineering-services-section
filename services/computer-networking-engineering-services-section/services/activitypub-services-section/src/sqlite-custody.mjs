import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { SqliteKvStore } from "@fedify/sqlite";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { extractSenActivity } from "./sen-activity.mjs";
import { Activity } from "@fedify/vocab";
import { semanticAddress } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/u;

function digest(value) {
  return sha256Hex(value);
}

// Column discovery and history migration share the writer lock. A second host
// opening the same carrier observes the completed migration, never half a schema.
function migrate(database, change) {
  const wait = database.prepare("PRAGMA busy_timeout").get().timeout;
  database.exec("PRAGMA busy_timeout = 5000");
  try {
    database.exec("BEGIN IMMEDIATE");
    try {
      change();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.exec(`PRAGMA busy_timeout = ${wait}`);
  }
}



const validReceipt = (receipt) => receipt !== null && typeof receipt === "object"
  && receipt.type === "ActivityPubVerifiedArrivalReceipt"
  && receipt.version === 1
  && /^[a-f0-9]{64}$/u.test(receipt.bodySha256)
  && (typeof receipt.recipient === "string" || receipt.recipient === null);

/**
 * Content-addressed, immutable verified-arrival custody plus a bounded
 * newest-first inbox scan, both backed by one local SQLite table. This is
 * the devbox counterpart to r2-custody.mjs's `inbox`: same receipt shape and
 * dedup contract, but — because a local file has no R2-style "no history
 * scan" constraint — it also exports `list`, so a devbox instance can serve
 * its own actor inbox collection without an injected external index.
 */
function verifiedArrivalTable(database, tableName) {
  if (typeof tableName !== "string" || !TABLE_NAME_PATTERN.test(tableName)) {
    throw new TypeError("ActivityPub SQLite custody table name is invalid");
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_sha256 TEXT NOT NULL UNIQUE,
      activity_json TEXT NOT NULL,
      receipt_json TEXT NOT NULL,
      recipient TEXT,
      observed_at INTEGER NOT NULL
    )
  `);
  database.exec(`CREATE INDEX IF NOT EXISTS "${tableName}_recipient_page" ON "${tableName}" (recipient,id)`);
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
  migrate(database, () => {
    const columns = new Set(database.prepare(`PRAGMA table_info("${tableName}")`).all().map(column => column.name));
    for (const column of ["reply_request", "reply_sender"]) {
      if (!columns.has(column)) database.exec(`ALTER TABLE "${tableName}" ADD COLUMN ${column} TEXT`);
    }
    database.exec(`CREATE INDEX IF NOT EXISTS "${tableName}_reply" ON "${tableName}" (recipient,reply_request,reply_sender,id DESC)`);
    {
      const index = database.prepare(`UPDATE "${tableName}" SET reply_request=?,reply_sender=? WHERE content_sha256=?`);
      for (const row of database.prepare(`SELECT content_sha256,activity_json FROM "${tableName}" WHERE reply_request IS NULL AND json_extract(activity_json, '$.type') IN ('Accept','Create')`).iterate()) {
        const reply = correlate(JSON.parse(row.activity_json));
        if (reply) index.run(reply.request, reply.sender, row.content_sha256);
      }
    }
  });
  const indexReply=database.prepare(`UPDATE "${tableName}" SET reply_request=?,reply_sender=? WHERE content_sha256=?`);
  const replyRow=database.prepare(`SELECT * FROM "${tableName}" WHERE recipient=? AND reply_request=? AND reply_sender=? ORDER BY id DESC LIMIT 1`);
  const countRecipient=database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}" WHERE recipient = ?`);
  const selectRecipient=database.prepare(`SELECT id,activity_json FROM "${tableName}" WHERE recipient = ? AND id < ? ORDER BY id DESC LIMIT ?`);
  const receiptKey = (receipt) => digest(canonicalJson(receipt));
  const selectByKey = database.prepare(`SELECT activity_json, receipt_json FROM "${tableName}" WHERE content_sha256 = ?`);
  const insert = database.prepare(`
    INSERT INTO "${tableName}" (content_sha256, activity_json, receipt_json, recipient, observed_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const countAll = database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}"`);
  const selectPage = database.prepare(`
    SELECT id, activity_json FROM "${tableName}" WHERE id < ? ORDER BY id DESC LIMIT ?
  `);
  return Object.freeze({
    async retain(arrival) {
      const activity = arrival?.jsonLd;
      if (activity === null || typeof activity !== "object" || Array.isArray(activity)) {
        throw new TypeError("verified ActivityPub arrival is required");
      }
      const activityJson = canonicalJson(activity);
      const receipt = Object.freeze({
        type: "ActivityPubVerifiedArrivalReceipt",
        version: 1,
        bodySha256: digest(activityJson),
        recipient: arrival.recipient ?? null,
      });
      const receiptJson = canonicalJson(receipt);
      const key = receiptKey(receipt);
      const existing = selectByKey.get(key);
      if (existing !== undefined) {
        if (existing.activity_json !== activityJson || existing.receipt_json !== receiptJson) {
          throw new Error("immutable ActivityPub custody record differs from the verified arrival");
        }
      } else {
        insert.run(key, activityJson, receiptJson, arrival.recipient ?? null, Date.now());
      }
      const reply=correlate(activity);if(reply)indexReply.run(reply.request,reply.sender,key);
      return receipt;
    },
    async replyFor({identifier,request,sender}){
      if([identifier,request,sender].some(value=>typeof value!=='string'||!value))throw new TypeError('reply lookup requires its actor, request and expected sender');
      const row=replyRow.get(identifier,request,sender);if(!row)return null;
      const receipt=JSON.parse(row.receipt_json);
      if(!validReceipt(receipt)||receipt.recipient!==identifier||digest(row.activity_json)!==receipt.bodySha256||receiptKey(receipt)!==row.content_sha256)throw new Error('correlated reply differs from verified custody');
      const activity=JSON.parse(row.activity_json),reply=correlate(activity);
      if(reply?.request!==request||reply.sender!==sender)throw new Error('correlated reply index differs from its evidence');
      return Object.freeze(activity);
    },
    async get(receipt) {
      if (!validReceipt(receipt)) throw new TypeError("ActivityPub verified-arrival receipt is invalid");
      const row = selectByKey.get(receiptKey(receipt));
      if (row === undefined) return null;
      if (row.receipt_json !== canonicalJson(receipt) || digest(row.activity_json) !== receipt.bodySha256) {
        throw new Error("immutable ActivityPub custody record does not match its receipt");
      }
      return Object.freeze({ activity: JSON.parse(row.activity_json), receipt });
    },
    async list({ identifier, cursor, limit } = {}) {
      const cap = Math.min(Math.max(Number.isSafeInteger(limit) ? limit : 100, 1), 100);
      let before = Number.MAX_SAFE_INTEGER;
      if (cursor !== undefined) {
        before = Number(cursor);
        if (!Number.isSafeInteger(before)) throw new TypeError("ActivityPub inbox cursor is invalid");
      }
      const rows = identifier===undefined?selectPage.all(before, cap + 1):selectRecipient.all(identifier,before,cap+1);
      const page = rows.slice(0, cap);
      const totalItems = identifier===undefined?countAll.get().count:countRecipient.get(identifier).count;
      return Object.freeze({
        items: Object.freeze(page.map((row) => JSON.parse(row.activity_json))),
        totalItems,
        ...(rows.length > cap ? { nextCursor: String(page[page.length - 1].id) } : {}),
      });
    },
  });
}

/**
 * Durable follower record keyed by (identifier, actor), backed by the same
 * SQLite file as the KV store, queue, and verified-arrival custody. Records
 * are added on a verified inbound Follow and removed on a verified Undo of
 * that Follow — see provider.mjs's inbox listeners, which own that protocol
 * logic; this table is only storage.
 */
function followersTable(database, tableName) {
  if (typeof tableName !== "string" || !TABLE_NAME_PATTERN.test(tableName)) {
    throw new TypeError("ActivityPub SQLite followers table name is invalid");
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      inbox_id TEXT NOT NULL,
      shared_inbox_id TEXT,
      followed_at INTEGER NOT NULL,
      UNIQUE(identifier, actor_id)
    )
  `);
  const upsert = database.prepare(`
    INSERT INTO "${tableName}" (identifier, actor_id, inbox_id, shared_inbox_id, followed_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(identifier, actor_id) DO UPDATE SET inbox_id = excluded.inbox_id, shared_inbox_id = excluded.shared_inbox_id
  `);
  const remove = database.prepare(`DELETE FROM "${tableName}" WHERE identifier = ? AND actor_id = ?`);
  const countForIdentifier = database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}" WHERE identifier = ?`);
  const selectPage = database.prepare(`
    SELECT id, actor_id, inbox_id, shared_inbox_id FROM "${tableName}"
    WHERE identifier = ? AND id < ? ORDER BY id DESC LIMIT ?
  `);
  return Object.freeze({
    async add({ identifier, actorId, inboxId, sharedInboxId }) {
      if (typeof identifier !== "string" || identifier === "") throw new TypeError("ActivityPub follower identifier is required");
      if (typeof actorId !== "string" || actorId === "") throw new TypeError("ActivityPub follower actorId is required");
      if (typeof inboxId !== "string" || inboxId === "") throw new TypeError("ActivityPub follower inboxId is required");
      upsert.run(identifier, actorId, inboxId, sharedInboxId ?? null, Date.now());
    },
    async remove({ identifier, actorId }) {
      remove.run(identifier, actorId);
    },
    async count({ identifier }) {
      return countForIdentifier.get(identifier).count;
    },
    async list({ identifier, cursor, limit }) {
      const cap = Math.min(Math.max(Number.isSafeInteger(limit) ? limit : 100, 1), 100);
      let before = Number.MAX_SAFE_INTEGER;
      if (cursor !== undefined) {
        before = Number(cursor);
        if (!Number.isSafeInteger(before)) throw new TypeError("ActivityPub followers cursor is invalid");
      }
      const rows = selectPage.all(identifier, before, cap + 1);
      const page = rows.slice(0, cap);
      return Object.freeze({
        items: Object.freeze(page.map((row) => Object.freeze({
          actorId: row.actor_id,
          inboxId: row.inbox_id,
          sharedInboxId: row.shared_inbox_id,
        }))),
        ...(rows.length > cap ? { nextCursor: String(page[page.length - 1].id) } : {}),
      });
    },
  });
}

/** One immutable outgoing activity carrier per id, with indexed actor reads.
 * SignStuff owns content identity; SQLite owns custody and concurrent insertion. */
export function createActivityPubSqliteOutbox({ database, tableName = "activitypub_outgoing_activities" }) {
  if (!TABLE_NAME_PATTERN.test(tableName)) throw new TypeError("ActivityPub SQLite outbox table name is invalid");
  database.exec(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id TEXT NOT NULL UNIQUE,
      actor_id TEXT NOT NULL,
      content_ni TEXT NOT NULL,
      is_public INTEGER NOT NULL CHECK (is_public IN (0, 1)),
      activity_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "${tableName}_actor" ON "${tableName}" (actor_id, is_public, seq DESC);
    CREATE INDEX IF NOT EXISTS "${tableName}_public" ON "${tableName}" (is_public, seq DESC)
  `);
  // Migrate the existing outgoing carrier; requests keep their original observed time.
  migrate(database, () => {
    if (!database.prepare(`PRAGMA table_info("${tableName}")`).all().some(column => column.name === "request_ni")) {
      database.exec(`ALTER TABLE "${tableName}" ADD COLUMN request_ni TEXT`);
    }
    database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS "${tableName}_request" ON "${tableName}" (request_ni) WHERE request_ni IS NOT NULL`);
  });
  const byRequest = database.prepare(`SELECT * FROM "${tableName}" WHERE request_ni = ?`);
  const insertRequest = database.prepare(`INSERT INTO "${tableName}" (activity_id, actor_id, content_ni, is_public, activity_json, request_ni) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`);
  const insert = database.prepare(`INSERT INTO "${tableName}" (activity_id, actor_id, content_ni, is_public, activity_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(activity_id) DO NOTHING`);
  const byId = database.prepare(`SELECT * FROM "${tableName}" WHERE activity_id = ?`);
  const allCount = database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}"`);
  const actorCount = database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}" WHERE actor_id = ?`);
  const allPage = database.prepare(`SELECT * FROM "${tableName}" WHERE seq < ? ORDER BY seq DESC LIMIT 101`);
  const actorPage = database.prepare(`SELECT * FROM "${tableName}" WHERE actor_id = ? AND seq < ? ORDER BY seq DESC LIMIT 101`);
  const publicCount = database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}" WHERE is_public = 1`);
  const actorPublicCount = database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}" WHERE actor_id = ? AND is_public = 1`);
  const publicPage = database.prepare(`SELECT * FROM "${tableName}" WHERE is_public = 1 AND seq < ? ORDER BY seq DESC LIMIT 101`);
  const actorPublicPage = database.prepare(`SELECT * FROM "${tableName}" WHERE actor_id = ? AND is_public = 1 AND seq < ? ORDER BY seq DESC LIMIT 101`);
  const count = ({ actorId, publicOnly = false } = {}) => (actorId === undefined
    ? (publicOnly ? publicCount : allCount).get()
    : (publicOnly ? actorPublicCount : actorCount).get(actorId)).count;
  const open = async (row) => {
    const wire = JSON.parse(row.activity_json);
    if (semanticAddress(wire).id !== row.content_ni) throw new Error("ActivityPub outgoing custody differs from its SignStuff identity");
    return Activity.fromJsonLd(wire);
  };
  return Object.freeze({
    count,
    async get({ activityId, actorId, publicOnly = false }) {
      const row = byId.get(activityId);
      return row === undefined || (publicOnly && row.is_public !== 1) || (actorId !== undefined && row.actor_id !== actorId) ? null : open(row);
    },
    async listOutbox({ actorId, cursor, publicOnly = false } = {}) {
      const before = cursor === undefined || cursor === null ? Number.MAX_SAFE_INTEGER : Number(cursor);
      if (!Number.isSafeInteger(before) || before < 1 || (cursor != null && String(before) !== cursor)) throw new TypeError("ActivityPub outbox cursor is invalid");
      const rows = actorId === undefined ? (publicOnly ? publicPage : allPage).all(before) : (publicOnly ? actorPublicPage : actorPage).all(actorId, before);
      const page = rows.slice(0, 100);
      return Object.freeze({
        items: Object.freeze(await Promise.all(page.map(open))),
        totalItems: count({ actorId, publicOnly }),
        ...(rows.length > 100 ? { nextCursor: String(page.at(-1).seq) } : {}),
      });
    },
    async retainRequest(wire) {
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
      const identity = semanticAddress(wire);
      const changed = insertRequest.run(wire.id, actor, identity.id, 0, canonicalJson(wire), requestNi).changes;
      const row = byRequest.get(requestNi);
      if (!row) throw new TypeError("reusable request collides with another outgoing event");
      await open(row);
      return Object.freeze({ appended: changed === 1, contentNi: row.content_ni, held: Object.freeze(JSON.parse(row.activity_json)) });
    },
    async append(wire) {
      if (!wire || typeof wire !== "object" || Array.isArray(wire) || typeof wire.id !== "string" || wire.id === "") throw new TypeError("ActivityPub outbox append requires one activity object with a string id");
      const activity = await Activity.fromJsonLd(wire);
      if (activity.id?.href !== wire.id || activity.actorIds.length !== 1) throw new TypeError("ActivityPub outgoing custody requires one durable activity and one actor");
      const identity = semanticAddress(wire);
      const visibleRecipients = [...activity.toIds, ...activity.ccIds, ...activity.audienceIds];
      const addressed = [...visibleRecipients, ...activity.btoIds, ...activity.bccIds];
      // Unaddressed authored publications preserve their existing public role.
      // Addressed peer messages stay private unless explicitly addressed to Public.
      const isPublic = addressed.length === 0 || visibleRecipients.some(id => id.href === "https://www.w3.org/ns/activitystreams#Public");
      const changed = insert.run(wire.id, activity.actorIds[0].href, identity.id, Number(isPublic), canonicalJson(wire)).changes;
      const row = byId.get(wire.id);
      if (row.content_ni !== identity.id) throw new TypeError("ActivityPub outgoing activity id already names different immutable content");
      return Object.freeze({ appended: changed === 1, contentNi: identity.id });
    },
  });
}

export function createActivityPubSqliteCustody({ database, tableName = "activitypub_verified_arrivals", followersTableName = "activitypub_followers" }) {
  if (database === null || typeof database !== "object") throw new TypeError("ActivityPub SQLite custody requires an open database handle");
  const inbox = verifiedArrivalTable(database, tableName);
  const followers = followersTable(database, followersTableName);
  const outbox = createActivityPubSqliteOutbox({ database });
  return Object.freeze({ kv: new SqliteKvStore(database), inbox, inboxIndex: inbox, followers, outbox });
}
