import type { EAVT } from "../codecs/json/jsonl/eavt/index.mts";
import type { StatementCoordinate } from "@lenticule-science/metrologic/settling/records/persistence";

/**
 * Description of how one observation enters recorded source material.
 *
 * Callers provide the domain-specific part: a stable feed name, a cellizer that
 * turns one observation into EAVT rows, and the attributes whose projected state
 * should be latest-statement-wins. Filesystem persistence and state writes live in
 * `services/filesystem-store`.
 */
export interface Feed<Observation> {
  /** Stable feed name; used as the file stem by concrete stores. */
  readonly name: string;
  /** Turn one observation, recorded at `at`, into EAVT cells. */
  readonly cellize: (observation: Observation, at: StatementCoordinate) => readonly EAVT[];
  /** Attributes holding one value at a time (latest statement wins on projection). */
  readonly functional: readonly string[];
}
