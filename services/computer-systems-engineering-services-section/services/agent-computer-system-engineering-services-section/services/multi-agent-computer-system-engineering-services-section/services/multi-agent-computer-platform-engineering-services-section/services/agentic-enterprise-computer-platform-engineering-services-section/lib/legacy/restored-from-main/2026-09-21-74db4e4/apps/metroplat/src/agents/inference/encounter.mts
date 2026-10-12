/** Inference-domain interpretation of the general witnessed encounter substrate. */
import type { JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  encounter,
  encounterRun,
  encounterTerminal,
  type Encounter,
  type EncounterRun,
  type EncounterTerminal,
  type EncounterReading,
} from "../../encounter/index.mts";
import type { OperationExecutionContext } from "../../rpc/index.mts";
import type { InferenceCall, InferenceOutcome } from "./model.mts";

export function encounterFromInferenceCall(call: InferenceCall): Encounter {
  return encounter({
    encounterClass: "inference",
    subject: call.id,
    metadata: Object.freeze({ model: call.model }),
  });
}

export function encounterRunFromInferenceCall(
  call: InferenceCall,
  context: OperationExecutionContext,
  retryOf?: string,
): EncounterRun {
  const semantic = encounterFromInferenceCall(call);
  return encounterRun({
    encounter: semantic.id,
    invocation: context.invocation.id,
    operation: context.operation.ref,
    request: context.invocation.request,
    ...(retryOf === undefined ? {} : { retryOf }),
    // The admitted call carries the stable boundary coordinate used to find the
    // same run section again; dispatcher start time is evidence, not identity.
    openedAt: call.observedAt,
    causes: context.evidence,
  });
}

export function encounterTerminalFromInferenceOutcome(
  run: EncounterRun,
  outcome: InferenceOutcome,
  causes: readonly string[] = [],
): EncounterTerminal {
  const disposition = outcome.kind === "metroplat.inference.result"
    ? "completed" as const
    : outcome.condition === "cancelled" ? "cancelled" as const : "obstructed" as const;
  return encounterTerminal({
    run: run.id,
    type: outcome.kind,
    disposition,
    claim: Object.freeze({
      kind: "metroplat.inference.outcome-claim" as const,
      outcome: outcome.id,
    }),
    value: outcome as unknown as JsonValue,
    causes,
    observedAt: outcome.observedAt,
  });
}

export function inferenceOutcomeFromEncounterTerminal(terminal: EncounterTerminal): InferenceOutcome {
  const value = terminal.value as unknown as { readonly kind?: unknown };
  if (value.kind !== "metroplat.inference.result" && value.kind !== "metroplat.inference.obstruction") {
    throw new TypeError("inference encounter terminal does not carry an inference outcome");
  }
  return terminal.value as unknown as InferenceOutcome;
}

export interface InferenceEncounterTranscript {
  readonly kind: "metroplat.inference.encounter-transcript";
  readonly run: string;
  readonly standing: EncounterReading["standing"];
  readonly moves: EncounterReading["moves"];
  readonly outcome?: InferenceOutcome;
  readonly frontier: readonly string[];
}

/** Living provider-neutral transcript read directly from one admitted encounter section. */
export function inferenceTranscriptFromEncounterReading(reading: EncounterReading): InferenceEncounterTranscript {
  const terminal = reading.terminals.at(-1);
  return Object.freeze({
    kind: "metroplat.inference.encounter-transcript" as const,
    run: reading.run,
    standing: reading.standing,
    moves: reading.moves,
    ...(terminal === undefined ? {} : { outcome: inferenceOutcomeFromEncounterTerminal(terminal) }),
    frontier: reading.frontier,
  });
}
