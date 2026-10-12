/**
 * records holds the base record shapes for marks, tokens, claims, utterances, persisted statement rows, and their row-level identity laws.
 * It may import values and schema, but it must not import logic, fixpoint, math, codecs, capability, rendering, or search.
 */
export * from "./utterance/index.mjs";
export * from "@lenticule-science/metrologic/settling/records/persistence";
