/**
 * cells — what an agent acting as one cell in a mesh must have established before it acts, as
 * source-bound evidence each derived by a pure function. None of it is authority: authentication
 * (workload identity), representation, custody, visibility, carrier, handoff and independent
 * receiving are kept apart so that none can be silently conflated with another or supplied as a
 * conclusion by the caller. Standings are FOUR readings ("extremal" family) derived from affirming
 * and denying assertions, each content-addressed by `semanticId`.
 */
export * from "./visibility.mjs";
export * from "./carrier.mjs";
export * from "./handoff.mjs";
export * from "./custody.mjs";
export * from "./representation.mjs";
export * from "./receiving.mjs";
export * from "./trace-context.mjs";
export * from "./workload-identity.mjs";
