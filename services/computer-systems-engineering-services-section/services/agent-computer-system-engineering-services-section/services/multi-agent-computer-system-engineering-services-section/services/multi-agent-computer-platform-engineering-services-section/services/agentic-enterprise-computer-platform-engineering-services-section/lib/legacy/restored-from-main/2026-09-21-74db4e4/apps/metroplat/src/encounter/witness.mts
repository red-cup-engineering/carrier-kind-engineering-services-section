/** Required evidence port between an encounter execution and durable causal admission. */
import type { JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { EncounterContribution, EncounterRun } from "./model.mts";

export type EncounterEvidence =
  | Readonly<{ kind: "metroplat.encounter.opened"; run: EncounterRun; at: string }>
  | Readonly<{ kind: "metroplat.encounter.contribution"; run: string; contribution: EncounterContribution; at: string }>;

export interface EncounterAdmission {
  readonly kind: "metroplat.encounter.admission";
  readonly id: string;
  readonly evidence: EncounterEvidence["kind"];
  readonly run: string;
  readonly eventIds: readonly string[];
  readonly material: JsonValue;
}

export interface EncounterWitness {
  /** Admit opening or contribution evidence. No contribution is observable before this returns. */
  readonly admit: (run: EncounterRun, evidence: EncounterEvidence) => EncounterAdmission;
  /** Current durable causal frontier of this run's own section. */
  readonly causalHead: (run: EncounterRun) => readonly string[];
}

export interface EncounterFollowOptions {
  /** Journal event frontier already observed by this subscriber. */
  readonly after?: readonly string[];
  readonly signal?: AbortSignal;
  readonly pollIntervalMs?: number;
}

export interface EncounterReader {
  readonly read: (run: EncounterRun) => readonly EncounterAdmission[];
  readonly follow: (run: EncounterRun, options?: EncounterFollowOptions) => AsyncIterable<EncounterAdmission>;
}

/** @metroplatSubject encounter */
export type EncounterStore = EncounterWitness & EncounterReader;

/** One execution and its independently consumable durable section. */
export interface EncounterSession<T> {
  readonly encounter: string;
  readonly run: EncounterRun;
  readonly admissions: AsyncIterable<EncounterAdmission>;
  readonly settled: Promise<T>;
}
