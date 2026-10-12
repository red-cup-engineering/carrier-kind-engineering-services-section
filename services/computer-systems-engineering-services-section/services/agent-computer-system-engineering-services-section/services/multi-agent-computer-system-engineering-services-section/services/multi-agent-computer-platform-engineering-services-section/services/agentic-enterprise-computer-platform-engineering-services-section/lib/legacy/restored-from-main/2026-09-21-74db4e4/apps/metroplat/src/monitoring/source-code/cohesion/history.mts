/**
 * @packageDocumentation
 *
 * Pure temporal projection of already-admitted module-cohesion outcomes.
 * Journal traversal belongs to the application adapter in monitoring/operations.
 *
 * @metroplatSubject source-code
 */
import {
  moduleCohesionHistoryContract,
  type ModuleCohesionHistory,
  type ModuleCohesionPage,
} from "./schema.mts";
import { recordHistoryOfStages, type RecordHistoryOptions } from "../../substrate/history.mts";

export type ModuleCohesionHistoryOptions = RecordHistoryOptions;

export interface ModuleCohesionStage {
  readonly source: string;
  readonly observation: string;
  readonly at: string;
  readonly invocation: string;
  readonly receipt: string;
  readonly causes: readonly string[];
  readonly valuation: ModuleCohesionPage["valuation"];
}

/** Fold distinct consecutive cohesion observations from at most 31 explicit dates. */
export function moduleCohesionHistoryOfStages(
  dates: readonly string[],
  source: { readonly rows: number; readonly malformed: number; readonly stages: readonly ModuleCohesionStage[] },
  options: ModuleCohesionHistoryOptions = {},
): ModuleCohesionHistory {
  const history = recordHistoryOfStages(dates, source.stages, (stage) => stage.valuation.record, options);
  return moduleCohesionHistoryContract.assert(Object.freeze({
    kind: "metroplat.monitoring.source-code.module-cohesion-history" as const,
    dates: history.dates,
    rows: source.rows,
    malformed: source.malformed,
    observations: history.observations,
    stages: history.stages,
    transitions: history.transitions,
  }), "module cohesion history") as ModuleCohesionHistory;
}
