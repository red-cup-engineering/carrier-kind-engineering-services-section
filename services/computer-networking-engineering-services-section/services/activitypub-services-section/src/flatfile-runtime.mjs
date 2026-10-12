import path from "node:path";
import { FlatfileMessageQueue } from "./flatfile-queue.mjs";

function requiredEnvironment(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required for the local ActivityPub runtime`);
  return value;
}

/**
 * The local durable runtime of one ActivityPub face: a state directory holding the journal custody,
 * the flat-file key-value cache and the delivery spool. Pending deliveries survive a restart. The
 * directory is `ACTIVITYPUB_STATE_DIR`, or, for a deployment configured before custody left SQLite,
 * `<ACTIVITYPUB_SQLITE_PATH without .sqlite>.state`, beside the SQLite file it admits once.
 */
export function activityPubStateDirectoryOf({ environment = process.env, statePath, stateDirectory } = {}) {
  if (stateDirectory ?? environment.ACTIVITYPUB_STATE_DIR) return path.resolve(stateDirectory ?? environment.ACTIVITYPUB_STATE_DIR);
  const sqlitePath = path.resolve(statePath ?? requiredEnvironment(environment, "ACTIVITYPUB_SQLITE_PATH"));
  return sqlitePath.replace(/\.sqlite$/u, "") + ".state";
}

export function createFlatfileActivityPubRuntime(options = {}) {
  const environment = options.environment ?? process.env;
  const stateDirectory = activityPubStateDirectoryOf({ environment, statePath: options.statePath, stateDirectory: options.stateDirectory });
  const queue = options.queue ?? new FlatfileMessageQueue({ directory: path.join(stateDirectory, "queue"), ...(options.queueOptions ?? {}) });
  const sqlitePath = options.statePath ?? environment.ACTIVITYPUB_SQLITE_PATH;
  return Object.freeze({
    stateDirectory,
    statePath: sqlitePath === undefined ? undefined : path.resolve(sqlitePath),
    queue,
    close: () => {},
  });
}
