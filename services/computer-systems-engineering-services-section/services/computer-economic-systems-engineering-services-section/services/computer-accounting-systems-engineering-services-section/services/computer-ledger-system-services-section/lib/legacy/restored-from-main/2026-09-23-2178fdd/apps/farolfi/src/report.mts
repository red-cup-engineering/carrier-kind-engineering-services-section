import { toLedgerJson } from "./report-json.mjs";
import loadLedger, { type Entry, type Source } from "@red-cup-engineering/agentic-organization-engine/accounting/ledger";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  accountsReport,
  balanceReport,
  balanceSheetReport,
  cashflowReport,
  checkReport,
  incomeStatementReport,
  lotsReport,
  reconciliationReport,
  registerReport,
  statsReport,
  valuationReport,
  type AccountsReport,
  type BalanceReport,
  type BalanceSheetReport,
  type CashflowReport,
  type CheckReport,
  type IncomeStatementReport,
  type LotsReport,
  type ReconciliationReport,
  type RegisterReport,
  type StatsReport,
  type ValuationReport,
} from "@red-cup-engineering/agentic-organization-engine/accounting/report";

import { detectJournalFormat, parseJournalFile, parseJournalText, type JournalFormat } from "./journal.mjs";
import type { LedgerJson } from "./report-json.mjs";
import { compileJsonSchema, type JsonSchema } from "@red-cup-engineering/computer-data-type-engine";
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";

export const LEDGER_REPORT_NAMES = Object.freeze(["balance", "balance-sheet", "income-statement", "cashflow", "register", "accounts", "stats", "lots", "valuation", "reconcile", "check"] as const);
export type LedgerReportName = typeof LEDGER_REPORT_NAMES[number];

export interface LedgerReportByName {
  readonly balance: BalanceReport;
  readonly "balance-sheet": BalanceSheetReport;
  readonly "income-statement": IncomeStatementReport;
  readonly cashflow: CashflowReport;
  readonly register: RegisterReport;
  readonly accounts: AccountsReport;
  readonly stats: StatsReport;
  readonly lots: LotsReport;
  readonly valuation: ValuationReport;
  readonly reconcile: ReconciliationReport;
  readonly check: LedgerCheckReport;
}

export type RequiredMetadataPolicy =
  | null
  | Readonly<{
    readonly requiredMetadata: string;
    readonly missingMetadata: readonly Readonly<{
      readonly date: string;
      readonly narration: string;
      readonly source: Source | null;
    }>[];
  }>;

/** A check keeps the organizing worklist and additionally makes an explicitly requested
 * transaction-metadata completeness policy visible; it never converts absent evidence to
 * a zero or a settled reconciliation verdict. */
export type LedgerCheckReport = CheckReport & Readonly<{ readonly policy: RequiredMetadataPolicy }>;

export type LedgerJournalInput =
  | Readonly<{ readonly kind: "path"; readonly path: string }>
  | Readonly<{ readonly kind: "text"; readonly text: string; readonly format?: JournalFormat }>;

/** Admits a host-bound journal carrier. Callers may use path or inline text,
 * but report queries never carry this authority. */
export function admitLedgerJournalInput(value: unknown): LedgerJournalInput {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Farolfi journal input must be an object");
  const input = value as Record<string, unknown>;
  if (typeof input.path === "string" && input.path.length > 0 && input.text === undefined) return Object.freeze({ kind: "path", path: input.path });
  if (typeof input.text === "string" && input.path === undefined) {
    if (input.format !== undefined && input.format !== "beancount" && input.format !== "hledger") throw new TypeError("Farolfi text journal has an unsupported format");
    return Object.freeze({ kind: "text", text: input.text, ...(input.format === undefined ? {} : { format: input.format as JournalFormat }) });
  }
  throw new TypeError("Farolfi journal input must name exactly one of path or text");
}

export type LedgerJournalProvenance =
  | Readonly<{ readonly kind: "path"; readonly path: string; readonly format: JournalFormat }>
  | Readonly<{ readonly kind: "text"; readonly format: JournalFormat }>;

export interface LedgerSnapshotIdentity {
  readonly kind: "ledger-snapshot";
  readonly id: string;
  /** Digest of the parsed, include-expanded carrier, including source locations. */
  readonly parsedSnapshotDigest: string;
  /** Source identity names the source locator; it is intentionally distinct from content. */
  readonly sourceId: string;
  readonly journal: LedgerJournalProvenance;
  readonly observedAt: string;
  readonly sourceFiles: readonly string[];
  readonly entryCount: number;
}

export type LedgerSnapshot = Readonly<LedgerSnapshotIdentity>;

export interface LedgerReportOptions {
  readonly account?: string | null;
  readonly begin?: string | null;
  readonly end?: string | null;
  readonly depth?: number | null;
  readonly status?: string | null;
  readonly payee?: string | null;
  readonly requireMeta?: string | null;
  readonly reportingCommodity?: string | null;
  readonly generatedAt?: string;
}

/** Caller-controlled report selection. A journal locator is deliberately absent:
 * hosts admit their own journal source before applying a caller query. */
/** Plain JSON Schema for consumers that use the shared schema admission primitive. */
export const ledgerReportQuerySchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schema.561.group/farolfi/ledger-report-query.json",
  type: "object",
  additionalProperties: false,
  required: ["report"],
  properties: {
    report: { enum: LEDGER_REPORT_NAMES },
    account: { type: ["string", "null"] }, begin: { type: ["string", "null"], format: "date" }, end: { type: ["string", "null"], format: "date" },
    depth: { type: ["integer", "null"], minimum: 1 }, status: { type: ["string", "null"] }, payee: { type: ["string", "null"] },
    requireMeta: { type: ["string", "null"] }, reportingCommodity: { type: ["string", "null"] },
  },
} as const);
export type LedgerReportQuery<N extends LedgerReportName = LedgerReportName> = FromJsonSchema<typeof ledgerReportQuerySchema> & Readonly<{ readonly report: N }>;
const ledgerReportQueryValidator = compileJsonSchema(ledgerReportQuerySchema as JsonSchema);

export function admitLedgerReportQuery(value: unknown): LedgerReportQuery {
  const result = ledgerReportQueryValidator.validate(value);
  if (!result.valid) throw new TypeError(`ledger report query: ${result.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
  const query = value as LedgerReportQuery;
  if (query.begin !== undefined && query.end !== undefined && query.begin !== null && query.end !== null && query.begin > query.end) throw new TypeError("ledger report query begin must not be after end");
  return Object.freeze(query);
}

export type LedgerQueryBinding = Readonly<{ readonly query: LedgerReportQuery; readonly errors: Readonly<Record<string, string>> }>;

/** Boundary codec for URL query text. It supplies the only report default and
 * returns field-addressed refusal evidence for HTTP forms. */
export function readLedgerQuery(search: URLSearchParams): LedgerQueryBinding {
  const fields = ["report", "account", "begin", "end", "depth", "status", "payee", "requireMeta", "reportingCommodity"] as const;
  const raw = Object.fromEntries(fields.flatMap((field) => {
    const value = search.get(field);
    return value === null || value === "" ? [] : [[field, field === "depth" ? Number(value) : value]];
  }));
  const candidate: Record<string, unknown> = { report: "balance-sheet", ...raw };
  const result = ledgerReportQueryValidator.validate(candidate);
  const errors = Object.fromEntries(result.issues.map((issue) => [(issue.path.split("/").filter(Boolean)[0] || "query"), issue.message]));
  if (result.valid && typeof candidate.begin === "string" && typeof candidate.end === "string" && candidate.begin > candidate.end) errors.begin = "must not be after end";
  const query = Object.keys(errors).length === 0 ? admitLedgerReportQuery(candidate) : Object.freeze({ report: "balance-sheet" }) as LedgerReportQuery;
  return Object.freeze({ query, errors: Object.freeze(errors) });
}

export type LedgerReport<N extends LedgerReportName = LedgerReportName> = Readonly<{
  readonly kind: "ledger-report";
  readonly report: N;
  readonly journal: LedgerJournalProvenance;
  readonly snapshot: LedgerSnapshotIdentity;
  readonly generatedAt: string;
  readonly data: LedgerReportByName[N];
}>;

const ledgers = new WeakMap<LedgerSnapshot, ReturnType<typeof loadLedger>>();

function contentIdOf(entries: readonly Entry[]): string {
  const bytes = JSON.stringify(toLedgerJson(entries));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function sourceFilesOf(entries: readonly Entry[]): readonly string[] {
  const files = new Set<string>();
  for (const entry of entries) {
    if ("source" in entry && entry.source?.file) files.add(entry.source.file);
  }
  return Object.freeze([...files].sort());
}

/** Parses one journal once. Path input resolves Beancount/hledger includes relative to each
 * containing file; text input has no filesystem carrier, so its include directives remain
 * explicit unresolved entries rather than being resolved against a temporary directory. */
export function readLedgerSnapshot(input: LedgerJournalInput, observedAt = new Date().toISOString()): LedgerSnapshot {
  if (input === null || typeof input !== "object" || (input.kind !== "path" && input.kind !== "text")) {
    throw new TypeError("Farolfi ledger snapshot input must be a path or text journal");
  }
  if (input.kind === "path" && (typeof input.path !== "string" || input.path.length === 0)) throw new TypeError("Farolfi path journal requires a path");
  if (input.kind === "text" && typeof input.text !== "string") throw new TypeError("Farolfi text journal requires text");
  const parsed = input.kind === "path"
    ? parseJournalFile(input.path)
    : parseJournalText(input.text, { ...(input.format === undefined ? {} : { format: input.format }) });
  const journal: LedgerJournalProvenance = input.kind === "path"
    ? Object.freeze({ kind: "path", path: input.path, format: detectJournalFormat({ path: input.path }) })
    : Object.freeze({ kind: "text", format: input.format ?? detectJournalFormat({ text: input.text }) });
  const parsedSnapshotDigest = contentIdOf(parsed.entries);
  const sourceId = input.kind === "path" ? `path:${resolve(input.path)}` : "inline-text";
  const snapshot: LedgerSnapshot = Object.freeze({
    kind: "ledger-snapshot",
    id: `${sourceId}@${parsedSnapshotDigest}`,
    parsedSnapshotDigest,
    sourceId,
    journal,
    observedAt,
    sourceFiles: sourceFilesOf(parsed.entries),
    entryCount: parsed.entries.length,
  });
  ledgers.set(snapshot, loadLedger(parsed.entries));
  return snapshot;
}

function ledgerOf(snapshot: LedgerSnapshot): ReturnType<typeof loadLedger> {
  const ledger = ledgers.get(snapshot);
  if (ledger === undefined) throw new TypeError("Farolfi ledger snapshot was not admitted by readLedgerSnapshot");
  return ledger;
}

function reportData<N extends LedgerReportName>(snapshot: LedgerSnapshot, report: N, options: LedgerReportOptions): LedgerReportByName[N] {
  const ledger = ledgerOf(snapshot);
  const filters = { account: options.account ?? null, begin: options.begin ?? null, end: options.end ?? null, depth: options.depth ?? null, status: options.status ?? null, payee: options.payee ?? null };
  switch (report) {
    case "balance": return balanceReport(ledger, filters) as LedgerReportByName[N];
    case "balance-sheet": return balanceSheetReport(ledger, { end: filters.end }) as LedgerReportByName[N];
    case "income-statement": return incomeStatementReport(ledger, { begin: filters.begin, end: filters.end }) as LedgerReportByName[N];
    case "cashflow": return cashflowReport(ledger, filters) as LedgerReportByName[N];
    case "register": return registerReport(ledger, filters) as LedgerReportByName[N];
    case "accounts": return accountsReport(ledger, { account: filters.account }) as LedgerReportByName[N];
    case "stats": return statsReport(ledger) as LedgerReportByName[N];
    case "lots": return lotsReport(ledger, filters) as LedgerReportByName[N];
    case "valuation": return valuationReport(ledger, { account: filters.account, end: filters.end, reportingCommodity: options.reportingCommodity ?? null }) as LedgerReportByName[N];
    case "reconcile": return reconciliationReport(ledger, { account: filters.account, end: filters.end }) as LedgerReportByName[N];
    case "check": {
      const requiredMetadata = options.requireMeta ?? null;
      const missingMetadata = requiredMetadata === null ? [] : ledger.transactions
        .filter((entry) => {
          const value = entry.meta[requiredMetadata];
          return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
        })
        .map((entry) => Object.freeze({ date: entry.date, narration: entry.narration, source: entry.source }));
      const policy: RequiredMetadataPolicy = requiredMetadata === null
        ? null
        : Object.freeze({ requiredMetadata, missingMetadata: Object.freeze(missingMetadata) });
      return Object.freeze({ ...checkReport(ledger), policy }) as LedgerReportByName[N];
    }
  }
}

export function readLedgerReport<N extends LedgerReportName>(snapshot: LedgerSnapshot, query: LedgerReportQuery<N>): LedgerReport<N>;
export function readLedgerReport<N extends LedgerReportName>(snapshot: LedgerSnapshot, queryInput: LedgerReportQuery<N>): LedgerReport<N> {
  const query = admitLedgerReportQuery(queryInput) as LedgerReportQuery<N>;
  const { report, ...options } = query;
  if (!LEDGER_REPORT_NAMES.includes(report)) throw new TypeError("unsupported ledger report");
  return Object.freeze({
    kind: "ledger-report",
    report,
    journal: snapshot.journal,
    snapshot,
    generatedAt: snapshot.observedAt,
    data: reportData(snapshot, report, options),
  }) as LedgerReport<N>;
}

export type LedgerReadings = Readonly<{
  readonly kind: "ledger-readings";
  readonly snapshot: LedgerSnapshotIdentity;
  readonly observedAt: string;
  readonly balanceSheet: LedgerReport<"balance-sheet">;
  readonly incomeStatement: LedgerReport<"income-statement">;
  readonly reconcile: LedgerReport<"reconcile">;
  readonly stats: LedgerReport<"stats">;
  readonly accounts: LedgerReport<"accounts">;
  readonly selectedReport?: LedgerReport;
}>;

export type LedgerSnapshotJson = LedgerJson<LedgerSnapshot>;
export type LedgerReportJson<N extends LedgerReportName = LedgerReportName> = LedgerJson<LedgerReport<N>>;
export type LedgerReadingsJson = LedgerJson<LedgerReadings>;

function jsonObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value as Record<string, unknown>;
}

export function admitLedgerSnapshotJson(value: unknown): LedgerSnapshotJson {
  const snapshot = jsonObject(value, "ledger snapshot");
  if (snapshot.kind !== "ledger-snapshot" || typeof snapshot.id !== "string" || typeof snapshot.parsedSnapshotDigest !== "string" || typeof snapshot.sourceId !== "string" || typeof snapshot.observedAt !== "string" || !Array.isArray(snapshot.sourceFiles) || typeof snapshot.entryCount !== "number") throw new TypeError("invalid ledger snapshot transport");
  return Object.freeze(snapshot) as LedgerSnapshotJson;
}

export function admitLedgerReportJson(value: unknown): LedgerReportJson {
  const report = jsonObject(value, "ledger report");
  if (report.kind !== "ledger-report" || !LEDGER_REPORT_NAMES.includes(report.report as LedgerReportName) || typeof report.generatedAt !== "string") throw new TypeError("invalid ledger report transport");
  admitLedgerSnapshotJson(report.snapshot);
  if (report.data === null || typeof report.data !== "object" || Array.isArray(report.data)) throw new TypeError("ledger report transport requires report data");
  return Object.freeze(report) as LedgerReportJson;
}

export function admitLedgerReadingsJson(value: unknown): LedgerReadingsJson {
  const readings = jsonObject(value, "ledger readings");
  if (readings.kind !== "ledger-readings" || typeof readings.observedAt !== "string") throw new TypeError("invalid ledger readings transport");
  admitLedgerSnapshotJson(readings.snapshot);
  for (const key of ["balanceSheet", "incomeStatement", "reconcile", "stats", "accounts"]) admitLedgerReportJson(readings[key]);
  if (readings.selectedReport !== undefined) admitLedgerReportJson(readings.selectedReport);
  return Object.freeze(readings) as LedgerReadingsJson;
}

export function readLedgerReadings(snapshot: LedgerSnapshot, query: LedgerReportQuery): LedgerReadings {
  const observedAt = snapshot.observedAt;
  const base = query;
  const reports = {
    balanceSheet: readLedgerReport(snapshot, { ...base, report: "balance-sheet" }),
    incomeStatement: readLedgerReport(snapshot, { ...base, report: "income-statement" }),
    reconcile: readLedgerReport(snapshot, { ...base, report: "reconcile" }),
    stats: readLedgerReport(snapshot, { ...base, report: "stats" }),
    accounts: readLedgerReport(snapshot, { ...base, report: "accounts" }),
  };
  const selectedReport = Object.values(reports).find((report) => report.report === query.report) ?? readLedgerReport(snapshot, query);
  return Object.freeze({ kind: "ledger-readings", snapshot, observedAt, ...reports, selectedReport });
}
