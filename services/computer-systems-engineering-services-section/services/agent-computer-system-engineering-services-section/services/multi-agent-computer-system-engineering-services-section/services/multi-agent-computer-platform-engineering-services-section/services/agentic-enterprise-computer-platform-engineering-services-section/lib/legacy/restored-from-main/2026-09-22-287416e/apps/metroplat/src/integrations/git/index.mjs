/**
 * integrations/git — this package's git integration, in one directory:
 * `services/` (live worktree state via the process-command boundary). No
 * `src/` layer yet — there is no pure schema/codec logic over git state
 * today, only the effectful read.
 *
 * @packageDocumentation
 */
export * from "./service.mjs";
