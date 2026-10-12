/**
 * integrations/ledger — thin `ledger-report`/`ledger-readings` verbs over the
 * published computer-ledger-system-services-section operations.
 * @packageDocumentation
 */
import { readLedgerReport } from "@red-cup-engineering/computer-ledger-system-services-section/scripts/read-ledger-report.mjs";
import { readSetOfLedgerReadings } from "@red-cup-engineering/computer-ledger-system-services-section/scripts/read-set-of-ledger-readings.mjs";
import { processEnvValue } from "../process/index.mts";
import { schemaFrom } from "../../lib/schema/contract.mts";
import { operation, type Operation } from "../../rpc/index.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";

const LEDGER_REPORT_NAMES = Object.freeze([
  "balance", "balance-sheet", "income-statement", "cashflow", "register",
  "accounts", "stats", "lots", "valuation", "reconcile", "check",
]);

const ledgerReportFiltersSchema = Object.freeze({
  begin: { type: "string" as const, description: "Inclusive ISO date lower bound for dated reports." },
  end: { type: "string" as const, description: "Exclusive ISO date upper bound for dated reports." },
  account: { type: "string" as const, description: "Account-name regular expression filter." },
  depth: { type: "integer" as const, minimum: 1, description: "Account-tree depth to roll balances up to." },
  status: { type: "string" as const, description: "Posting/transaction status filter." },
  payee: { type: "string" as const, description: "Payee regular expression filter." },
  requireMeta: { type: "string" as const, description: "For report \"check\" only: a transaction metadata key every transaction must carry." },
});

/** Domain schema for `ledger-report`: the section's own request schema minus `journal`,
 *  which this deployment resolves itself rather than accepting from a caller. */
export const ledgerReportRequestContract = schemaFrom({
  $id: "metroplat/ledger/report-request",
  type: "object",
  required: ["report"],
  additionalProperties: false,
  properties: {
    report: { enum: LEDGER_REPORT_NAMES },
    ...ledgerReportFiltersSchema,
  },
} as const);

/** Domain schema for `ledger-readings`: the same filters, no `report` (the reading set is fixed). */
export const ledgerReadingsRequestContract = schemaFrom({
  $id: "metroplat/ledger/readings-request",
  type: "object",
  additionalProperties: false,
  properties: { ...ledgerReportFiltersSchema },
} as const);

/**
 * Reads `METROPLAT_LEDGER_JOURNAL` from the process environment.
 * @throws {TypeError} When the setting is unset or empty — never a silent empty result.
 */
function ledgerJournalPath(): string {
  const path = processEnvValue("METROPLAT_LEDGER_JOURNAL");
  if (path === undefined || path.trim() === "") {
    throw new TypeError("ledger-report: METROPLAT_LEDGER_JOURNAL is not set; this deployment has no configured book of record");
  }
  return path;
}

/** The `ledger-report` and `ledger-readings` operations. */
export function ledgerReportOperations(): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "ledger-report",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read one accounting report from this deployment's configured book of record.",
      description: "Domain: { report, begin?, end?, account?, depth?, status?, payee?, requireMeta? }. Resolves the journal from METROPLAT_LEDGER_JOURNAL and delegates to @red-cup-engineering/computer-ledger-system-services-section's readLedgerReport; no report logic of its own.",
      domain: ledgerReportRequestContract,
      run: async (input: unknown): Promise<unknown> => readLedgerReport({
        ...(input as Record<string, unknown>),
        journal: { path: ledgerJournalPath() },
      }) as Promise<JsonValue>,
    }),
    operation({
      verb: "ledger-readings",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read the standard set of books readings (balance sheet, income statement, reconcile, stats, accounts) in one call.",
      description: "Domain: { begin?, end?, account?, depth?, status?, payee?, requireMeta? }. Resolves the journal from METROPLAT_LEDGER_JOURNAL and delegates to @red-cup-engineering/computer-ledger-system-services-section's readSetOfLedgerReadings; no report logic of its own.",
      domain: ledgerReadingsRequestContract,
      run: async (input: unknown): Promise<unknown> => readSetOfLedgerReadings({
        ...(input as Record<string, unknown>),
        journal: { path: ledgerJournalPath() },
      }) as Promise<JsonValue>,
    }),
  ]);
}
