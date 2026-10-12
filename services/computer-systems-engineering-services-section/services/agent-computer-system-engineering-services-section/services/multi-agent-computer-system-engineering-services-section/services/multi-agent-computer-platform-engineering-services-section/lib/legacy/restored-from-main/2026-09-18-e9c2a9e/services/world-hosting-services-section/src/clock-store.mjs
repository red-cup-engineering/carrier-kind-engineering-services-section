import { loadJsonSnapshot, saveJsonSnapshot } from "@red-cup-engineering/feltos/persistence";
import { createGcsClient } from "@red-cup-engineering/footing/gcs-client";

/**
 * Persists lastTickAt (epoch ms), the one fact request-driven catch-up needs to survive a
 * restart. Separate object/file from world-store.mjs's engine snapshot on purpose. Extracted
 * from farstone.561.group's src/clock-store.mts; `clockKind` (hardcoded there) is now a
 * parameter so a migrating site can pass its historic tag and stay byte-compatible.
 * @module clock-store
 */

/**
 * @typedef {Object} ClockState
 * @property {number} lastTickAt
 */

/**
 * @typedef {Object} ClockStore
 * @property {string} describe
 * @property {() => Promise<ClockState|null>} load
 * @property {(state: ClockState) => Promise<void>} save
 */

const DEFAULT_CLOCK_KIND = "world-host.world-clock.v1";

/**
 * @param {string} path
 * @returns {string}
 */
function fileClockPath(path) {
  return `${path}.clock.json`;
}

/**
 * @param {string} object
 * @returns {string}
 */
function bucketClockObject(object) {
  return object.endsWith(".json") ? `${object.slice(0, -".json".length)}.clock.json` : `${object}.clock.json`;
}

/**
 * @param {unknown} value
 * @param {string} clockKind
 * @returns {value is {kind: string, lastTickAt: number}}
 */
function isValidClockPayload(value, clockKind) {
  return typeof value === "object" && value !== null
    && /** @type {{kind?: unknown}} */ (value).kind === clockKind
    && Number.isFinite(/** @type {{lastTickAt?: unknown}} */ (value).lastTickAt);
}

/**
 * @typedef {Object} OpenClockStoreOptions
 * @property {Omit<import("@red-cup-engineering/footing/gcs-client").GcsClientOptions, "bucket">} [gcsClientOptions]
 * @property {string} [clockKind] - the persisted payload's `kind` tag; defaults to a generic
 *   world-hosting tag. Pass a site's historic value (e.g. "farstone.world-clock.v1") to stay
 *   byte-compatible with an already-persisted clock file.
 */

/**
 * Open a clock store for the given backend (mirrors world-store.mjs's `openWorldStore`).
 * @param {import("./world-store.mjs").WorldBackend} backend
 * @param {OpenClockStoreOptions} [opts]
 * @returns {ClockStore|null} `null` means "no backend configured"
 */
export function openClockStore(backend, opts = {}) {
  if (backend.kind === "none") return null;
  const clockKind = opts.clockKind ?? DEFAULT_CLOCK_KIND;

  if (backend.kind === "file") {
    const path = fileClockPath(backend.path);
    return {
      describe: path,
      async load() {
        const payload = await loadJsonSnapshot(path, { fallback: () => null });
        return isValidClockPayload(payload, clockKind) ? { lastTickAt: payload.lastTickAt } : null;
      },
      async save(state) {
        await saveJsonSnapshot(path, { kind: clockKind, lastTickAt: state.lastTickAt });
      },
    };
  }

  // retry:true preserves this store's pre-footing default (footing's own default is opt-in-off).
  const client = createGcsClient({ bucket: backend.bucket, retry: true, ...opts.gcsClientOptions });
  const object = bucketClockObject(backend.object);
  const describe = `gs://${backend.bucket}/${object}`;

  // Caches the generation its own last write returned instead of an extra getObject before
  // every putObject; falls back to a fresh getObject on the first call or a 412.
  let cachedGeneration;

  return {
    describe,
    async load() {
      const found = await client.getObject(object);
      if (found === null) return null;
      cachedGeneration = found.generation;
      let payload;
      try {
        payload = JSON.parse(found.text);
      } catch {
        return null; // a corrupt/foreign clock object degrades to "unknown" — never fatal, catch-up just runs 0 ticks
      }
      return isValidClockPayload(payload, clockKind) ? { lastTickAt: payload.lastTickAt } : null;
    },
    async save(state) {
      // Best-effort, unconditional-in-practice overwrite: a single-writer deploy pin means
      // real contention here is not expected, and losing one clock write to a genuine race
      // just means catch-up under-runs by a bounded amount next time, not corruption.
      const text = JSON.stringify({ kind: clockKind, lastTickAt: state.lastTickAt });
      let precondition = cachedGeneration;
      if (precondition === undefined) {
        const current = await client.getObject(object);
        precondition = current?.generation ?? "0";
      }
      let result = await client.putObject(object, text, precondition);
      if (!result.ok) {
        // Our cached generation was stale (a real, if rare, single-writer-violation race) —
        // refetch the true current generation and retry exactly once more, best-effort.
        const current = await client.getObject(object);
        precondition = current?.generation ?? "0";
        result = await client.putObject(object, text, precondition);
      }
      if (result.ok) cachedGeneration = result.generation;
    },
  };
}
