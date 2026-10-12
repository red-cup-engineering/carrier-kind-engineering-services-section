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
export * from "./event.mts";
export * from "./causal-graph.mts";
export * from "./judgment.mts";
export * from "./witness.mts";
export * from "./substrate.mts";
export * from "./frontier.mts";
export * from "./section.mts";
export * from "./reading/index.mts";
export * from "./journal.mts";
export {
  journalContentArtifact,
  journalObservation,
  journalRecordArtifact,
  journalStateArtifact,
  observeJournalOperation,
  type ContentArtifactProjection,
  type EventWriteResult,
  type FeedStateProjection,
  type JournalObservation,
  type JournalObservationOptions,
  type JupyterNotebookProjection,
  type JupyterRecordProjection,
  type LogAccountabilityReportProjection,
  type LogCredentialProjection,
  type LogCredentialProjectionOptions,
  type LogRaftSafetyJudgmentProjection,
  type LogX402ReceiptProjection,
  type MementoStateProjection,
  type MementoTimeMapProjection,
  type MementoTimeMapProjectionOptions,
  type RecordCommitResult,
  type RecordArtifactProjection,
  type RootEventWriteOptions,
} from "./filesystem/operations/index.mts";
