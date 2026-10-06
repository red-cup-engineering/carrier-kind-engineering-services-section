/** Pure path law for the pre-event JSONL compatibility layer: where a legacy
 *  log's retry/attempt sidecar directory lives. No filesystem effect: reading
 *  the legacy files this law addresses lives in `write-journal-store.mjs`. */

export function legacyAttemptDirectoryPath(logPath) {
  const suffix = [".", "attempts"].join("");
  return `${logPath}${suffix}`;
}
