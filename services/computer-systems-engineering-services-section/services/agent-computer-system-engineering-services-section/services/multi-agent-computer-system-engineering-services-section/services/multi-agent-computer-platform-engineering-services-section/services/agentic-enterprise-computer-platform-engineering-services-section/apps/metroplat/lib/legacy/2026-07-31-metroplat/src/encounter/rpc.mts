/** General witnessed RPC operation for explicitly cancelling an active encounter run. */
import { isJsonRecord } from "../lib/codecs/json/core.mts";
import { operation, type Operation } from "../rpc/index.mts";
import type { EncounterExecutionControl } from "./control.mts";

export function encounterCancellationOperation(
  control: EncounterExecutionControl,
  verb = "cancel-encounter",
): Operation {
  return operation({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    relation: "protocol",
    effects: Object.freeze({
      class: "external" as const,
      replay: "safe" as const,
      coordination: "coordination-free" as const,
      deterministic: "unmeasured" as const,
      totality: "partial" as const,
    }),
    summary: "Cancel one active witnessed encounter execution without cancelling its readers.",
    run: (input, _arguments, context) => {
      if (context === undefined) throw new TypeError("encounter cancellation requires governed RPC execution context");
      if (!isJsonRecord(input) || typeof input.run !== "string" || input.run.length === 0) {
        throw new TypeError("encounter cancellation requires { run }");
      }
      return Object.freeze({
        kind: "metroplat.encounter.cancellation" as const,
        run: input.run,
        cancelled: control.cancel(input.run, context.evidence),
      });
    },
  });
}
