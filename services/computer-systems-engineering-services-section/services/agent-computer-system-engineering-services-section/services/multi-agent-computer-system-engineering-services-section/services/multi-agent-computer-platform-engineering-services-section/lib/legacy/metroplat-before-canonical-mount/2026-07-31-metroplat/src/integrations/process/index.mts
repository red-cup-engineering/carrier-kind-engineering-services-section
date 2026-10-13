/**
 * integrations/process — this package's host-process integration:
 * `services/` (argv, env, clock, entropy, stdio, lifecycle, child-process
 * command, config-file resolution, and main-runner boundaries). No `src/`
 * layer yet — there is no pure schema/codec logic over process state today,
 * only the effectful read, matching `integrations/git`'s own layout.
 *
 * @packageDocumentation
 */
export * from "./services/index.mts";
