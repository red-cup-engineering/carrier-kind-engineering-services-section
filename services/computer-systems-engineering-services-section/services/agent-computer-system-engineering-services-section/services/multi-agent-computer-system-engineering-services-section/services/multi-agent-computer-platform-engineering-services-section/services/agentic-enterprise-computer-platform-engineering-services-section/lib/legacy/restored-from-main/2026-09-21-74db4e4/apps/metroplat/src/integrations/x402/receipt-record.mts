/**
 * integrations/x402/receipt-record — project a statement log into an x402 payment receipt document.
 * The journal store stays generic: this integration depends into its exported fold engine instead of adding x402 vocabulary to runtime.
 * The x402 receipt vocabulary itself (the collector, the boundary admission)
 * is not metroplat's to define — it is the published
 * `@red-cup-engineering/x402-value-settlement-service`; this file is the one
 * place metroplat's journal engine gets parameterized with it.
 */
import { admitX402Receipt, x402ReceiptStatementCollector } from "@red-cup-engineering/x402-value-settlement-service";
import {
  journal,
  type
  LogX402ReceiptProjection,
  type JournalObservationOptions,
} from "../../journal/index.mts";
import type { DataArtifactHandle } from "../../lib/addressing/index.mts";
import type { JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

/** Project a durable `data/journals` x402 receipt ledger into a receipt JSON document under `data/records`. */
export function projectLogPathX402Receipt(
  logArtifact: DataArtifactHandle,
  options: JournalObservationOptions = {},
): LogX402ReceiptProjection {
  return journal.projectDomainRecord(
    logArtifact,
    "project-log-x402-receipt",
    "x402-receipt",
    "log x402 receipt projection",
    () => x402ReceiptStatementCollector(),
    (collector, row) => {
      collector.push(row);
      return collector;
    },
    (collector, source) => {
      const { statementRows, ...receipt } = collector.read();
      return {
        payload: admitX402Receipt(Object.freeze({
          ...receipt,
          statementLogReference: Object.freeze({
            kind: "metroplat.witness-ledger-reference" as const,
            path: source.logPath,
            mediaType: "application/eavt+jsonl; charset=utf-8",
            rows: statementRows,
            ...(source.malformed === 0 ? {} : { malformed: source.malformed }),
          }),
        }), "x402 receipt from statement log") as unknown as JsonValue,
      };
    },
    options,
  );
}
