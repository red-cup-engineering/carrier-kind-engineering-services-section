/**
 * integrations/jupyter — every piece of this package's Jupyter integration,
 * in one directory: `src/` (JSON schemas and the ipynb/kernel-message
 * codec — no host I/O). The projection into and out of the record/content
 * artifact tiers is one operation among many in the shared
 * filesystem journal and its
 * `integrations/filesystem/services/store` effectful counterpart, since all domains that
 * execution records through the log/state/record/content tiers share that one
 * pipeline rather than each owning a copy of it.
 *
 * @packageDocumentation
 */
export * as schema from "./schema.mts";
export * as codec from "./codec.mts";
export * from "./schema.mts";
export * from "./codec.mts";
export * from "./projection.mts";
