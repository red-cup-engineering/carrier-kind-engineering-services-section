import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

/**
 * The SQLite ActivityPub custody is read once, never written: what it held (verified arrivals,
 * followers, outgoing activities, Fedify's key-value entries and undelivered queue messages) is
 * admitted into the journal custody and flat-file runtime, and a receipt beside the journal marks
 * the admission so it is not repeated. No SQL writer survives; the file is left as it was, as the
 * evidence the admission was read from.
 */
// Admission preserves the original verified-arrival commitment. Reading a
// changed legacy row cannot create a fresh receipt that attests the changed bytes.
function admittedArrival(row) {
  const activity = JSON.parse(row.activity_json), receipt = JSON.parse(row.receipt_json);
  if (receipt.type !== "ActivityPubVerifiedArrivalReceipt" || receipt.version !== 1
    || receipt.recipient !== (row.recipient ?? null)
    || sha256Hex(row.activity_json) !== receipt.bodySha256
    || sha256Hex(canonicalJson(receipt)) !== row.content_sha256) {
    throw new Error("legacy verified arrival differs from its original custody commitment");
  }
  return { activity, recipient: row.recipient ?? undefined };
}

const tables = (database) => new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));

/** Everything a SQLite custody file held, read without writing it. */
export function readSqlActivityPubCustody(databasePath) {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const held = tables(database);
    const all = (table, order) => (held.has(table) ? database.prepare(`SELECT * FROM "${table}" ORDER BY ${order}`).all() : []);
    return Object.freeze({
      arrivals: all("activitypub_verified_arrivals", "id").map(admittedArrival),
      followers: all("activitypub_followers", "id").map((row) => ({ identifier: row.identifier, actorId: row.actor_id, inboxId: row.inbox_id, sharedInboxId: row.shared_inbox_id ?? undefined })),
      outgoing: all("activitypub_outgoing_activities", "seq").map((row) => JSON.parse(row.activity_json)),
      requests: all("activitypub_outgoing_activities", "seq").filter(row => typeof row.request_ni === "string").map(row => ({ activityId: row.activity_id, requestNi: row.request_ni, activity: JSON.parse(row.activity_json) })),
      kv: all("fedify_kv", "created").filter((row) => row.expires == null || row.expires > Date.now()).map((row) => ({ key: JSON.parse(row.key), value: JSON.parse(row.value), ...(row.expires == null ? {} : { ttlMs: row.expires - Date.now() }) })),
      messages: all("fedify_message", "scheduled").map((row) => ({ message: JSON.parse(row.message), delayMs: Math.max(0, row.scheduled - Date.now()), orderingKey: row.ordering_key ?? undefined })),
    });
  } finally {
    database.close();
  }
}

/**
 * Admit a SQLite custody file into journal custody once. Returns the receipt: what was admitted,
 * or the earlier receipt when the admission already happened, or null when there is no file.
 */
export async function admitSqlActivityPubCustody({ databasePath, custody, queue, receiptPath = path.join(custody.root, "sql-admission.json") }) {
  if (typeof databasePath !== "string" || !existsSync(databasePath)) return null;
  if (existsSync(receiptPath)) return JSON.parse(readFileSync(receiptPath, "utf8"));
  const held = readSqlActivityPubCustody(databasePath);
  for (const arrival of held.arrivals) await custody.inbox.retain({ jsonLd: arrival.activity, ...(arrival.recipient === undefined ? {} : { recipient: arrival.recipient }) });
  for (const follower of held.followers) await custody.followers.add(follower);
  const requests = new Map(held.requests.map(row => [row.activityId, row]));
  let outgoing = 0;
  for (const wire of held.outgoing) {
    try {
      const request = requests.get(wire.id);
      const result = request === undefined ? await custody.outbox.append(wire) : await custody.outbox.retainRequest(wire, { expectedRequestNi: request.requestNi });
      if (result.appended) outgoing += 1;
    }
    catch (error) { throw new Error(`SQLite outgoing activity ${wire?.id} could not be admitted: ${error.message}`); }
  }
  for (const entry of held.kv) await custody.kv.set(entry.key, entry.value, entry.ttlMs === undefined ? undefined : { ttl: entry.ttlMs });
  if (queue !== undefined) for (const message of held.messages) await queue.enqueue(message.message, { delay: message.delayMs, ...(message.orderingKey === undefined ? {} : { orderingKey: message.orderingKey }) });
  const receipt = Object.freeze({
    type: "ActivityPubSqlCustodyAdmission", version: 1, from: path.resolve(databasePath), at: new Date().toISOString(),
    arrivals: held.arrivals.length, followers: held.followers.length, outgoing, kv: held.kv.length, messages: queue === undefined ? 0 : held.messages.length,
  });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  return receipt;
}
