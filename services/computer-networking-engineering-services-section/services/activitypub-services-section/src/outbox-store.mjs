import { readFile } from "node:fs/promises";
import path from "node:path";
import { Activity } from "@fedify/vocab";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createActivityPubJournalOutbox } from "./journal-custody.mjs";
import { readSqlActivityPubCustody } from "./import-sql-custody.mjs";

/**
 * Read a static, read-once-at-boot ActivityPub outbox from one JSON file: a
 * JSON array of already-authored activity envelopes. `undefined` yields an
 * always-empty outbox rather than requiring every caller to special-case no
 * outbox file. Superseded, once a live/appendable outbox is wanted, by
 * `createActivityPubOutboxStore` below (the same file shape, upgraded to a
 * store that stays current across the process's lifetime).
 */
export async function loadActivityPubOutbox(outboxPath) {
  if (outboxPath === undefined) return async () => ({ items: [] });
  const source = JSON.parse(await readFile(path.resolve(outboxPath), "utf8"));
  if (!Array.isArray(source) || source.length === 0) {
    throw new TypeError("ActivityPub outbox file must contain a nonempty JSON array");
  }
  const items = await Promise.all(source.map(async (item, index) => {
    try {
      return await Activity.fromJsonLd(item);
    } catch (error) {
      throw new TypeError(`ActivityPub outbox item ${index} is invalid: ${error.message}`);
    }
  }));
  return async ({ cursor }) => ({
    items: cursor === undefined || cursor === null ? items : [],
  });
}

async function readOutboxFile(resolved) {
  try {
    const raw = await readFile(resolved, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("ActivityPub outbox file must contain a JSON array");
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

/** Import authored JSON activities into durable custody, preserving display order.
 * The JSON source is input only; publishing never rewrites it. */
export async function importActivityPubOutbox(outboxPath, outbox) {
  const items = await readOutboxFile(path.resolve(outboxPath));
  for (const item of [...items].reverse()) await outbox.append(item);
}

/** Standalone disk binding of the same journal custody a local provider keeps.
 * Existing authored JSON remains an optional import source; an outbox kept in SQLite
 * before custody moved to the journal is admitted once, read-only. */
export async function createActivityPubOutboxStore({ outboxPath }) {
  if (typeof outboxPath !== "string" || outboxPath.trim() === "") throw new TypeError("ActivityPub outbox store requires an outboxPath");
  const resolved = path.resolve(outboxPath);
  const root = `${resolved}.journal`;
  await mkdir(root, { recursive: true });
  const outbox = createActivityPubJournalOutbox({ root });
  const databasePath = `${resolved}.sqlite`;
  if (existsSync(databasePath) && !existsSync(path.join(root, "sql-admission.json"))) {
    const { outgoing, requests } = readSqlActivityPubCustody(databasePath);
    const byId = new Map(requests.map(request => [request.activityId, request]));
    for (const wire of outgoing) {
      const request = byId.get(wire.id);
      if (request === undefined) await outbox.append(wire);
      else await outbox.retainRequest(wire, { expectedRequestNi: request.requestNi });
    }
    await writeFile(path.join(root, "sql-admission.json"), `${JSON.stringify({ type: "ActivityPubSqlOutboxAdmission", version: 1, from: databasePath, at: new Date().toISOString(), outgoing: outgoing.length }, null, 2)}\n`, { flag: "wx" });
  }
  await importActivityPubOutbox(resolved, outbox);
  return Object.freeze({ ...outbox, path: resolved, root, close: () => {} });
}
