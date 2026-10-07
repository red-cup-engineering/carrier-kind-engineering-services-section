/**
 * services/filesystem-store/accountability-record — project a recorded
 * accountable-transaction log into an accountability report document under
 * `data/records`. Split out of the generic `filesystem-store/index.mts` so
 * the generic journal never has to import the accountable-
 * transaction domain directly — this file depends INTO the store's exported
 * domain-record projection operation, not the other way around.
 */
import {
  accountabilityReportContract,
  accountableTransactionCollector,
  verifyAccountableTransaction,
} from "./codec.mjs";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";

/** Project a durable `data/journals` accountable transaction into a report JSON document under `data/records`. */
export function projectLogPathAccountabilityReport(
  logArtifact,
  options = {},
) {
  return journal.projectDomainRecord(
    logArtifact,
    "project-log-accountability-report",
    "accountability-report",
    "log accountability report projection",
    () => accountableTransactionCollector(),
    (collector, row) => {
      collector.push(row);
      return collector;
    },
    (collector) => {
      const transaction = collector.read();
      const report = accountabilityReportContract.assert(
        verifyAccountableTransaction(transaction),
        "accountability report from statement log",
      );
      return {
        payload: report,
        boundary: Object.freeze({ transaction: transaction.id }),
      };
    },
    options,
  );
}
