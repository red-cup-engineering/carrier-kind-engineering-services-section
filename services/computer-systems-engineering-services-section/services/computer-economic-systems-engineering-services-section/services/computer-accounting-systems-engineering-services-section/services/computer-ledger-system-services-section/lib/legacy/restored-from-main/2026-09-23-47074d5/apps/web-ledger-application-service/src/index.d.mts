import { LEDGER_REPORT_NAMES, type LedgerReadingsJson, type LedgerReportQuery } from "@red-cup-engineering/farolfi";

export { LEDGER_REPORT_NAMES };

export function renderExactAmount(value: unknown): string | undefined;

/** Pure TUFTE projection. Farolfi owns query and JSON transport admission. */
export function renderLedgerApplication(input: {
  readonly readings: LedgerReadingsJson;
  readonly query: LedgerReportQuery;
  readonly navigation?: readonly { readonly href: string; readonly label: string; readonly current?: boolean }[];
  readonly action?: string;
  readonly title?: string;
}): string;
