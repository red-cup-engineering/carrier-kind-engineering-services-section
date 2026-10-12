/** Pure folds over durably admitted encounter evidence. */
import { contentAddress } from "../lib/identity/index.mts";
import type { JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { EncounterMove, EncounterRun, EncounterTerminal } from "./model.mts";
import type { EncounterAdmission } from "./witness.mts";

export type EncounterStanding = "open" | "settled" | "contested";

export interface EncounterReading {
  readonly kind: "metroplat.encounter.reading";
  readonly id: string;
  readonly run: string;
  readonly standing: EncounterStanding;
  readonly moves: readonly EncounterMove[];
  readonly terminals: readonly EncounterTerminal[];
  /** Journal event ids at the read's durable causal frontier. */
  readonly frontier: readonly string[];
  readonly admissions: readonly EncounterAdmission[];
}

function contributionOf(admission: EncounterAdmission): EncounterMove | EncounterTerminal | undefined {
  const material = admission.material as unknown as {
    readonly kind?: unknown;
    readonly contribution?: EncounterMove | EncounterTerminal;
  };
  return material.kind === "metroplat.encounter.contribution" ? material.contribution : undefined;
}

function terminalClaim(terminal: EncounterTerminal): string {
  return contentAddress(Object.freeze({
    kind: "metroplat.encounter.terminal-claim" as const,
    run: terminal.run,
    type: terminal.type,
    disposition: terminal.disposition,
    claim: terminal.claim,
  }) as unknown as JsonValue);
}

/** Read one monotone run section without collapsing contradictory terminal evidence. */
export function encounterReading(
  run: EncounterRun,
  admissions: readonly EncounterAdmission[],
  frontier: readonly string[],
): EncounterReading {
  const admitted = admissions.filter((entry) => entry.run === run.id);
  const moves = new Map<string, EncounterMove>();
  const terminals = new Map<string, EncounterTerminal>();
  for (const admission of admitted) {
    const contribution = contributionOf(admission);
    if (contribution?.run !== run.id) continue;
    if (contribution.kind === "metroplat.encounter.move") moves.set(contribution.id, contribution);
    else terminals.set(contribution.id, contribution);
  }
  const moveList = Object.freeze([...moves.values()]);
  const terminalList = Object.freeze([...terminals.values()]);
  const claims = new Set(terminalList.map(terminalClaim));
  const standing: EncounterStanding = claims.size === 0 ? "open" : claims.size === 1 ? "settled" : "contested";
  const normalizedFrontier = Object.freeze([...new Set(frontier)].sort());
  const identity = Object.freeze({
    kind: "metroplat.encounter.reading-identity" as const,
    run: run.id,
    standing,
    moves: moveList.map((move) => move.id),
    terminals: terminalList.map((terminal) => terminal.id),
    frontier: normalizedFrontier,
  });
  return Object.freeze({
    kind: "metroplat.encounter.reading" as const,
    id: contentAddress(identity as unknown as JsonValue),
    run: run.id,
    standing,
    moves: moveList,
    terminals: terminalList,
    frontier: normalizedFrontier,
    admissions: Object.freeze([...admitted]),
  });
}
