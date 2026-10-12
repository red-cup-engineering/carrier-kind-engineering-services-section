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
export * as stores from "../../lib/addressing/index.mts";
export * as filesystem from "../../lib/filesystem/index.mts";
export * as filesystemStore from "../../journal/index.mts";
export * from "../../lib/addressing/index.mts";
export * from "../../lib/filesystem/index.mts";
export * from "../../journal/index.mts";
export * from "./services/arrival.mts";
export * from "./services/arrival-processing.mts";
export * from "./services/capability-assertions.mts";
export * from "./services/encounter-store.mts";
export * from "./services/rpc-witness.mts";
export * from "./schemas.mts";
export * from "./services/read-write.mts";
export * from "./services/agent-context.mts";
export * from "./services/journal-projections.mts";
export * from "./services/run-causal-set.mts";
export * from "./services/session-presence.mts";
export * from "./services/workspace-readout.mts";
export * from "./services/directory-readout/index.mts";
export * from "./services/package-form/schema.mts";
export * from "./services/package-form/service.mts";
export * as workspaceScanner from "./services/workspace-scanner/service.mts";
export * from "./services/workspace-scanner/service.mts";
export * from "./services/arc42-sad-workbench.mts";
export * from "./services/specification-workbench.mts";
export * from "./directory-manifest.mts";
