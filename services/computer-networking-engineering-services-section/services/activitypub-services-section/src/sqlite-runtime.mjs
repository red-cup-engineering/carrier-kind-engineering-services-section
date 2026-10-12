import { DatabaseSync } from "node:sqlite";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { SqliteMessageQueue } from "@fedify/sqlite";

function requiredEnvironment(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required for the local ActivityPub runtime`);
  return value;
}

/**
 * Construct the local-disk devbox scheduler for one loopback ActivityPub
 * face. `@fedify/sqlite`'s SqliteMessageQueue polls the same file the KV and
 * custody adapters share (see sqlite-custody.mjs), so one open
 * `node:sqlite` handle is a complete durable devbox instance: no network
 * credentials, no external service, state and pending deliveries both
 * survive a process restart.
 */
export async function createSqliteActivityPubRuntime(options = {}) {
  const environment = options.environment ?? process.env;
  const statePath = path.resolve(options.statePath ?? requiredEnvironment(environment, "ACTIVITYPUB_SQLITE_PATH"));
  if (options.database === undefined) await mkdir(path.dirname(statePath), { recursive: true });
  const database = options.database ?? new DatabaseSync(statePath);
  const queue = options.queue ?? new SqliteMessageQueue(database, options.queueOptions);
  return Object.freeze({
    statePath,
    database,
    queue,
    close: () => database.close(),
  });
}
