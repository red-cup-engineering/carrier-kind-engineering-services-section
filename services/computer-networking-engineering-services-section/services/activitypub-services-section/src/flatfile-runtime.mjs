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
 * directory is `ACTIVITYPUB_STATE_DIR`.
 */
export function activityPubStateDirectoryOf({ environment = process.env, stateDirectory } = {}) {
  return path.resolve(stateDirectory ?? requiredEnvironment(environment, "ACTIVITYPUB_STATE_DIR"));
}

export function createFlatfileActivityPubRuntime(options = {}) {
  const environment = options.environment ?? process.env;
  const stateDirectory = activityPubStateDirectoryOf({ environment, stateDirectory: options.stateDirectory });
  const queue = options.queue ?? new FlatfileMessageQueue({ directory: path.join(stateDirectory, "queue"), ...(options.queueOptions ?? {}) });
  return Object.freeze({
    stateDirectory,
    queue,
    close: () => {},
  });
}
