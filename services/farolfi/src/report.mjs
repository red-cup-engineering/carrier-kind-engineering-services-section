import { toLedgerJson } from "./report-json.mjs";
import loadLedger, { } from "@red-cup-engineering/organizing/accounting/ledger";
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

} from "@red-cup-engineering/organizing/accounting/report";

import { detectJournalFormat, parseJournalFile, parseJournalText } from "./journal.mjs";

import { compileJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
import { sha256Digest, sha256Hex } from "@red-cup-engineering/cryptographic-data-service/integrity";

export const LEDGER_REPORT_NAMES = Object.freeze(["balance", "balance-sheet", "income-statement", "cashflow", "register", "accounts", "stats", "lots", "valuation", "reconcile", "check"]);

/** A check keeps the organizing worklist and additionally makes an explicitly requested
 * transaction-metadata completeness policy visible; it never converts absent evidence to
 * a zero or a settled reconciliation verdict. */

/** Admits a host-bound journal carrier. Callers may use path or inline text,
 * but report queries never carry this authority. */
export function admitLedgerJournalInput(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Farolfi journal input must be an object");
  const input = value;
  if (typeof input.path === "string" && input.path.length > 0 && input.text === undefined) return Object.freeze({ kind: "path", path: input.path });
  if (typeof input.text === "string" && input.path === undefined) {
    if (input.format !== undefined && input.format !== "beancount" && input.format !== "hledger") throw new TypeError("Farolfi text journal has an unsupported format");
    return Object.freeze({ kind: "text", text: input.text, ...(input.format === undefined ? {} : { format: input.format }) });
  }
  throw new TypeError("Farolfi journal input must name exactly one of path or text");
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
});

const ledgerReportQueryValidator = compileJsonSchema(ledgerReportQuerySchema);

export function admitLedgerReportQuery(value) {
  const result = ledgerReportQueryValidator.validate(value);
  if (!result.valid) throw new TypeError(`ledger report query: ${result.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
  const query = value;
  if (query.begin !== undefined && query.end !== undefined && query.begin !== null && query.end !== null && query.begin > query.end) throw new TypeError("ledger report query begin must not be after end");
  return Object.freeze(query);
}

/** Boundary codec for URL query text. It supplies the only report default and
 * returns field-addressed refusal evidence for HTTP forms. */
export function readLedgerQuery(search) {
  const fields = ["report", "account", "begin", "end", "depth", "status", "payee", "requireMeta", "reportingCommodity"];
  const raw = Object.fromEntries(fields.flatMap((field) => {
    const value = search.get(field);
    return value === null || value === "" ? [] : [[field, field === "depth" ? Number(value) : value]];
  }));
  const candidate = { report: "balance-sheet", ...raw };
  const result = ledgerReportQueryValidator.validate(candidate);
  const errors = Object.fromEntries(result.issues.map((issue) => [(issue.path.split("/").filter(Boolean)[0] || "query"), issue.message]));
  if (result.valid && typeof candidate.begin === "string" && typeof candidate.end === "string" && candidate.begin > candidate.end) errors.begin = "must not be after end";
  const query = Object.keys(errors).length === 0 ? admitLedgerReportQuery(candidate) : Object.freeze({ report: "balance-sheet" });
  return Object.freeze({ query, errors: Object.freeze(errors) });
}

const ledgers = new WeakMap();

function contentIdOf(entries) {
  const bytes = JSON.stringify(toLedgerJson(entries));
  return sha256Digest(bytes);
}

function sourceFilesOf(entries) {
  const files = new Set();
  for (const entry of entries) {
    if ("source" in entry && entry.source?.file) files.add(entry.source.file);
  }
  return Object.freeze([...files].sort());
}

/** Parses one journal once. Path input resolves Beancount/hledger includes relative to each
 * containing file; text input has no filesystem carrier, so its include directives remain
 * explicit unresolved entries rather than being resolved against a temporary directory. */
export function readLedgerSnapshot(input, observedAt = new Date().toISOString()) {
  if (input === null || typeof input !== "object" || (input.kind !== "path" && input.kind !== "text")) {
    throw new TypeError("Farolfi ledger snapshot input must be a path or text journal");
  }
  if (input.kind === "path" && (typeof input.path !== "string" || input.path.length === 0)) throw new TypeError("Farolfi path journal requires a path");
  if (input.kind === "text" && typeof input.text !== "string") throw new TypeError("Farolfi text journal requires text");
  const parsed = input.kind === "path"
    ? parseJournalFile(input.path)
    : parseJournalText(input.text, { ...(input.format === undefined ? {} : { format: input.format }) });
  const journal = input.kind === "path"
    ? Object.freeze({ kind: "path", path: input.path, format: detectJournalFormat({ path: input.path }) })
    : Object.freeze({ kind: "text", format: input.format ?? detectJournalFormat({ text: input.text }) });
  const parsedSnapshotDigest = contentIdOf(parsed.entries);
  const sourceId = input.kind === "path" ? `path:${resolve(input.path)}` : "inline-text";
  const snapshot = Object.freeze({
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

function ledgerOf(snapshot) {
  const ledger = ledgers.get(snapshot);
  if (ledger === undefined) throw new TypeError("Farolfi ledger snapshot was not admitted by readLedgerSnapshot");
  return ledger;
}

function reportData(snapshot, report, options) {
  const ledger = ledgerOf(snapshot);
  const filters = { account: options.account ?? null, begin: options.begin ?? null, end: options.end ?? null, depth: options.depth ?? null, status: options.status ?? null, payee: options.payee ?? null };
  switch (report) {
    case "balance": return balanceReport(ledger, filters);
    case "balance-sheet": return balanceSheetReport(ledger, { end: filters.end });
    case "income-statement": return incomeStatementReport(ledger, { begin: filters.begin, end: filters.end });
    case "cashflow": return cashflowReport(ledger, filters);
    case "register": return registerReport(ledger, filters);
    case "accounts": return accountsReport(ledger, { account: filters.account });
    case "stats": return statsReport(ledger);
    case "lots": return lotsReport(ledger, filters);
    case "valuation": return valuationReport(ledger, { account: filters.account, end: filters.end, reportingCommodity: options.reportingCommodity ?? null });
    case "reconcile": return reconciliationReport(ledger, { account: filters.account, end: filters.end });
    case "check": {
      const requiredMetadata = options.requireMeta ?? null;
      const missingMetadata = requiredMetadata === null ? [] : ledger.transactions
        .filter((entry) => {
          const value = entry.meta[requiredMetadata];
          return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
        })
        .map((entry) => Object.freeze({ date: entry.date, narration: entry.narration, source: entry.source }));
      const policy = requiredMetadata === null
        ? null
        : Object.freeze({ requiredMetadata, missingMetadata: Object.freeze(missingMetadata) });
      return Object.freeze({ ...checkReport(ledger), policy });
    }
  }
}

export function readLedgerReport(snapshot, queryInput) {
  const query = admitLedgerReportQuery(queryInput);
  const { report, ...options } = query;
  if (!LEDGER_REPORT_NAMES.includes(report)) throw new TypeError("unsupported ledger report");
  return Object.freeze({
    kind: "ledger-report",
    report,
    journal: snapshot.journal,
    snapshot,
    generatedAt: snapshot.observedAt,
    data: reportData(snapshot, report, options),
  });
}

function jsonObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

export function admitLedgerSnapshotJson(value) {
  const snapshot = jsonObject(value, "ledger snapshot");
  if (snapshot.kind !== "ledger-snapshot" || typeof snapshot.id !== "string" || typeof snapshot.parsedSnapshotDigest !== "string" || typeof snapshot.sourceId !== "string" || typeof snapshot.observedAt !== "string" || !Array.isArray(snapshot.sourceFiles) || typeof snapshot.entryCount !== "number") throw new TypeError("invalid ledger snapshot transport");
  return Object.freeze(snapshot);
}

export function admitLedgerReportJson(value) {
  const report = jsonObject(value, "ledger report");
  if (report.kind !== "ledger-report" || !LEDGER_REPORT_NAMES.includes(report.report) || typeof report.generatedAt !== "string") throw new TypeError("invalid ledger report transport");
  admitLedgerSnapshotJson(report.snapshot);
  if (report.data === null || typeof report.data !== "object" || Array.isArray(report.data)) throw new TypeError("ledger report transport requires report data");
  return Object.freeze(report);
}

export function admitLedgerReadingsJson(value) {
  const readings = jsonObject(value, "ledger readings");
  if (readings.kind !== "ledger-readings" || typeof readings.observedAt !== "string") throw new TypeError("invalid ledger readings transport");
  admitLedgerSnapshotJson(readings.snapshot);
  for (const key of ["balanceSheet", "incomeStatement", "reconcile", "stats", "accounts"]) admitLedgerReportJson(readings[key]);
  if (readings.selectedReport !== undefined) admitLedgerReportJson(readings.selectedReport);
  return Object.freeze(readings);
}

export function readLedgerReadings(snapshot, query) {
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
