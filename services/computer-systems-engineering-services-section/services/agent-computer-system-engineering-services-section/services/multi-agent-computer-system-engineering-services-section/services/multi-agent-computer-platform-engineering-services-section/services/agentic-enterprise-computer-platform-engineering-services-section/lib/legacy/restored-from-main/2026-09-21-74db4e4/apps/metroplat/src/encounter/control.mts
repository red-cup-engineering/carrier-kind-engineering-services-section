/** Process-local handles for executions governed and evidenced elsewhere. */
import type { EncounterRun } from "./model.mts";

export interface EncounterExecutionControl {
  readonly begin: (run: EncounterRun) => AbortSignal;
  readonly cancel: (run: string, causes?: readonly string[]) => boolean;
  readonly cancellationCauses: (run: string) => readonly string[];
  readonly end: (run: string) => void;
}

/** Subscriber lifetime is absent here; only an explicit execution act calls `cancel`. */
export function encounterExecutionControl(): EncounterExecutionControl {
  const active = new Map<string, AbortController>();
  const causes = new Map<string, readonly string[]>();
  return Object.freeze({
    begin(run: EncounterRun) {
      const present = active.get(run.id);
      if (present !== undefined) return present.signal;
      const controller = new AbortController();
      active.set(run.id, controller);
      return controller.signal;
    },
    cancel(run: string, evidence: readonly string[] = []) {
      const controller = active.get(run);
      if (controller === undefined) return false;
      causes.set(run, Object.freeze([...new Set(evidence)].sort()));
      controller.abort();
      return true;
    },
    cancellationCauses(run: string) { return causes.get(run) ?? Object.freeze([]); },
    end(run: string) {
      active.delete(run);
      causes.delete(run);
    },
  });
}
