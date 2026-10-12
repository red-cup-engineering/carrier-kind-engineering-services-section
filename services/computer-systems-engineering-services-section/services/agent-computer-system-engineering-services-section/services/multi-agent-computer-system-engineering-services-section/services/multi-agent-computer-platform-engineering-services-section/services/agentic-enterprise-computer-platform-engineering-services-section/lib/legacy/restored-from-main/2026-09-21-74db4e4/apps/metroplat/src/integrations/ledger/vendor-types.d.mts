/** Types for the canonical JavaScript ledger operation boundaries. */
declare module "@red-cup-engineering/read-ledger-report-service" {
  export function readLedgerReport(input: Record<string, unknown>): Promise<unknown>;
}

declare module "@red-cup-engineering/read-set-of-ledger-readings-service" {
  export function readSetOfLedgerReadings(input: Record<string, unknown>): Promise<unknown>;
}
