import { loadEngine, saveEngine, encodeSnapshot, decodeSnapshot } from "@red-cup-engineering/feltos/persistence";
import { createGcsClient } from "@red-cup-engineering/footing/gcs-client";

/**
 * World persistence backend selection and load/save, generic over any FeltOS world:
 * FELTOS_BUCKET set -> GCS; FELTOS_SAVE alone -> local file; neither -> in-memory only.
 * Bucket save is a conditional REPLACE guarded by GCS generation, retried on 412.
 * Extracted from farstone.561.group's src/world-store.mts; already generic.
 * @module world-store
 */

/**
 * @typedef {Object} WorldStoreEnv
 * @property {string} [FELTOS_SAVE]
 * @property {string} [FELTOS_BUCKET]
 */

/**
 * @typedef {{kind: "none"}|{kind: "file", path: string}|{kind: "bucket", bucket: string, object: string}} WorldBackend
 */

const DEFAULT_BUCKET_OBJECT = "world.json";
const MAX_SAVE_RETRIES = 20;

/**
 * Read the two env vars into a concrete backend choice.
 * @param {WorldStoreEnv} [env] - injectable for tests; defaults to process.env
 * @returns {WorldBackend}
 */
export function resolveWorldBackend(env = /** @type {WorldStoreEnv} */ (process.env)) {
  const bucket = env.FELTOS_BUCKET;
  if (bucket !== undefined && bucket !== "") {
    const object = env.FELTOS_SAVE !== undefined && env.FELTOS_SAVE !== "" ? env.FELTOS_SAVE : DEFAULT_BUCKET_OBJECT;
    return { kind: "bucket", bucket, object };
  }
  const path = env.FELTOS_SAVE;
  if (path !== undefined && path !== "") return { kind: "file", path };
  return { kind: "none" };
}

/** @typedef {(() => unknown)|unknown} Fallback */

/**
 * @param {Fallback} fallback
 * @returns {unknown}
 */
function resolveFallback(fallback) {
  return typeof fallback === "function" ? /** @type {() => unknown} */ (fallback)() : fallback;
}

/**
 * @typedef {Object} WorldStore
 * @property {string} describe - human-readable description of where this store persists to, for the boot log line
 * @property {(fallback: Fallback) => Promise<unknown>} load
 * @property {(engine: unknown) => Promise<void>} save
 */

/**
 * @typedef {Object} OpenWorldStoreOptions
 * @property {Omit<import("@red-cup-engineering/footing/gcs-client").GcsClientOptions, "bucket">} [gcsClientOptions]
 */

/**
 * Open a world store for the given backend.
 * @param {WorldBackend} backend
 * @param {OpenWorldStoreOptions} [opts]
 * @returns {WorldStore|null} `null` means "no backend configured" — caller keeps the engine in memory only
 */
export function openWorldStore(backend, opts = {}) {
  if (backend.kind === "none") return null;

  if (backend.kind === "file") {
    return {
      describe: backend.path,
      load: (fallback) => loadEngine(backend.path, { fallback: /** @type {never} */ (fallback) }),
      save: (engine) => saveEngine(backend.path, /** @type {never} */ (engine)),
    };
  }

  // retry:true preserves this store's pre-footing default (footing's own default is opt-in-off).
  const client = createGcsClient({ bucket: backend.bucket, retry: true, ...opts.gcsClientOptions });
  const object = backend.object;
  const describe = `gs://${backend.bucket}/${object}`;

  return {
    describe,
    async load(fallback) {
      let found;
      try {
        found = await client.getObject(object);
      } catch (error) {
        if (fallback === undefined) throw error;
        return resolveFallback(fallback);
      }
      if (found === null) {
        if (fallback === undefined) throw new Error(`world-store: no object at ${describe} and no fallback given`);
        return resolveFallback(fallback);
      }
      try {
        return decodeSnapshot(found.text);
      } catch (error) {
        if (fallback === undefined) throw error;
        return resolveFallback(fallback);
      }
    },
    async save(engine) {
      const text = encodeSnapshot(/** @type {never} */ (engine));
      for (let attempt = 0; attempt < MAX_SAVE_RETRIES; attempt++) {
        const current = await client.getObject(object);
        const precondition = current?.generation ?? "0";
        const result = await client.putObject(object, text, precondition);
        if (result.ok) return;
        // 412 — another save landed between our read and our write. Loop: re-read the
        // now-current generation and retry our own overwrite against it.
      }
      throw new Error(`world-store: gcs save exhausted ${MAX_SAVE_RETRIES} retries for ${describe} (sustained contention)`);
    },
  };
}
