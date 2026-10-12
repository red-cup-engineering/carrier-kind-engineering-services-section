/** General witnessed RPC operation for explicitly cancelling an active encounter run. */
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import { operation } from "../rpc/operation.mjs";

export function encounterCancellationOperation(
  control,
  verb = "cancel-encounter",
) {
  return operation({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    relation: "protocol",
    effects: Object.freeze({
      class: "external",
      replay: "safe",
      coordination: "coordination-free",
      deterministic: "unmeasured",
      totality: "partial",
    }),
    summary: "Cancel one active witnessed encounter execution without cancelling its readers.",
    run: (input, _arguments, context) => {
      if (context === undefined) throw new TypeError("encounter cancellation requires governed RPC execution context");
      if (!isJsonRecord(input) || typeof input.run !== "string" || input.run.length === 0) {
        throw new TypeError("encounter cancellation requires { run }");
      }
      return Object.freeze({
        kind: "metroplat.encounter.cancellation",
        run: input.run,
        cancelled: control.cancel(input.run, context.evidence),
      });
    },
  });
}
