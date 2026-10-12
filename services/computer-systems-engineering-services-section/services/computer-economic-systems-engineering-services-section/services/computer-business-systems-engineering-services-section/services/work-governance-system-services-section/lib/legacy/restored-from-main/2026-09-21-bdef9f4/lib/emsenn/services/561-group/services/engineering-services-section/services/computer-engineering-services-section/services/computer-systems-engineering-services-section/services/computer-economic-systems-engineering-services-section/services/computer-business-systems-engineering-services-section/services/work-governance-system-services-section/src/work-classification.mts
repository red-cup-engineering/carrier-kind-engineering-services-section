/**
 * The free-algebra classification of work by its settled operation and
 * settled inputs/path. These are determination coordinates, not evidence
 * values: a settled pair is a process, never a contradiction.
 */
export type Settlement = "open" | "settled";

export interface WorkDetermination {
  readonly operation: Settlement;
  readonly inputsAndPath: Settlement;
}

export type WorkKind = "inquiry" | "derivation" | "procedure" | "process";

export const WORK_KINDS: readonly WorkKind[] = Object.freeze([
  "inquiry",
  "derivation",
  "procedure",
  "process",
]);

export const DETERMINATION_OF_WORK_KIND: Readonly<Record<WorkKind, WorkDetermination>> = Object.freeze({
  inquiry: Object.freeze({ operation: "open", inputsAndPath: "open" }),
  derivation: Object.freeze({ operation: "settled", inputsAndPath: "open" }),
  procedure: Object.freeze({ operation: "open", inputsAndPath: "settled" }),
  process: Object.freeze({ operation: "settled", inputsAndPath: "settled" }),
});

export function classifyWork({ operation, inputsAndPath }: WorkDetermination): WorkKind {
  if (operation === "settled") return inputsAndPath === "settled" ? "process" : "derivation";
  return inputsAndPath === "settled" ? "procedure" : "inquiry";
}

export function settleOperation(work: WorkDetermination): WorkDetermination {
  return Object.freeze({ operation: "settled", inputsAndPath: work.inputsAndPath });
}

export function settleInputsAndPath(work: WorkDetermination): WorkDetermination {
  return Object.freeze({ operation: work.operation, inputsAndPath: "settled" });
}
