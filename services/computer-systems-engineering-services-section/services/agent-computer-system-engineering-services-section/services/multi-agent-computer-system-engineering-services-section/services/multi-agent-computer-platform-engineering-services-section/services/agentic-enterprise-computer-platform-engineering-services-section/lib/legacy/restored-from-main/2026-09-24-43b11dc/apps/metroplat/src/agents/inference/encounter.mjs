/** Inference-domain interpretation of the general witnessed encounter substrate. */

import { encounter, encounterRun, encounterTerminal } from "../../encounter/model.mjs";

export function encounterFromInferenceCall(call) {
  return encounter({
    encounterClass: "inference",
    subject: call.id,
    metadata: Object.freeze({ model: call.model }),
  });
}

export function encounterRunFromInferenceCall(
  call,
  context,
  retryOf,
) {
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
  run,
  outcome,
  causes = [],
) {
  const disposition = outcome.kind === "metroplat.inference.result"
    ? "completed"
    : outcome.condition === "cancelled" ? "cancelled" : "obstructed";
  return encounterTerminal({
    run: run.id,
    type: outcome.kind,
    disposition,
    claim: Object.freeze({
      kind: "metroplat.inference.outcome-claim",
      outcome: outcome.id,
    }),
    value: outcome,
    causes,
    observedAt: outcome.observedAt,
  });
}

export function inferenceOutcomeFromEncounterTerminal(terminal) {
  const value = terminal.value;
  if (value.kind !== "metroplat.inference.result" && value.kind !== "metroplat.inference.obstruction") {
    throw new TypeError("inference encounter terminal does not carry an inference outcome");
  }
  return terminal.value;
}

/** Living provider-neutral transcript read directly from one admitted encounter section. */
export function inferenceTranscriptFromEncounterReading(reading) {
  const terminal = reading.terminals.at(-1);
  return Object.freeze({
    kind: "metroplat.inference.encounter-transcript",
    run: reading.run,
    standing: reading.standing,
    moves: reading.moves,
    ...(terminal === undefined ? {} : { outcome: inferenceOutcomeFromEncounterTerminal(terminal) }),
    frontier: reading.frontier,
  });
}
