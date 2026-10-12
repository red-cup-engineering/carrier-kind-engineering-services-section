/**
 * integrations/filesystem — this package's host-disk integration, in one
 * directory: shared path and filesystem primitives, journal-backed artifact
 * storage, and the root-bound `read`/`write` service used by applications and
 * external integrations.
 *
 * `services/read-write`'s `writeAtRoot` still folds a recorded claim to a
 * target file after source admission. Making target-file materialization itself
 * multi-agent-safe is coordination work above these host disk effects: admit
 * concurrent claims as source material, then let settlement decide the derived
 * target, instead of hiding conflict behind a filesystem mutex.
 *
 * @packageDocumentation
 */
export * as stores from "../../lib/addressing/index.mjs";
export * as filesystem from "../../lib/filesystem/index.mjs";
export * as filesystemStore from "../../journal/index.mjs";
export * from "../../lib/addressing/index.mjs";
export * from "../../lib/filesystem/index.mjs";
export * from "../../journal/index.mjs";
export * from "./services/arrival.mjs";
export * from "./services/arrival-processing.mjs";
export * from "./services/capability-assertions.mjs";
export * from "./services/encounter-store.mjs";
export * from "./services/rpc-witness.mjs";
export * from "./schemas.mjs";
export * from "./services/read-write.mjs";
export * from "./services/agent-context.mjs";
export * from "./services/journal-projections.mjs";
export * from "./services/run-causal-set.mjs";
export * from "./services/session-presence.mjs";
export * from "./services/workspace-readout.mjs";
export * from "./services/directory-readout/index.mjs";
export * from "./services/package-form/schema.mjs";
export * from "./services/package-form/service.mjs";
export * as workspaceScanner from "./services/workspace-scanner/service.mjs";
export * from "./services/workspace-scanner/service.mjs";
export * from "./services/arc42-sad-workbench.mjs";
export * from "./services/specification-workbench.mjs";
export * from "./directory-manifest.mjs";
