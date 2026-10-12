/**
 * src/journal - the causal audit journal, whole: the pure model and its
 * filesystem store in one place.
 *
 * This is the one door to witnessed causal matter. Exact artifacts are
 * received, dependency-closed WitnessCores are admitted, and journal read
 * models fold that one source.
 * Other application persistence is not implicitly converted into journal
 * events. Import from this index; internals are implementation, not a second
 * public surface.
 *
 * - `witness.mjs` — the one causal source object.
 * - `substrate.mjs` — reception, quarantine, and structural admission.
 * - `frontier.mjs` — exact observed closures and pure frontiers.
 * - `reading/` — schema-checked reading coherence.
 * - `filesystem/` — filesystem admission, reads, and projections.
 */
export * from "./event.mjs";
export * from "./causal-graph.mjs";
export * from "./judgment.mjs";
export * from "./witness.mjs";
export * from "./substrate.mjs";
export * from "./frontier.mjs";
export * from "./section.mjs";
export * from "./reading/index.mjs";
export * from "./journal.mjs";
export {
  journalContentArtifact,
  journalObservation,
  journalRecordArtifact,
  journalStateArtifact,
  observeJournalOperation,

} from "./filesystem/operations/index.mjs";
