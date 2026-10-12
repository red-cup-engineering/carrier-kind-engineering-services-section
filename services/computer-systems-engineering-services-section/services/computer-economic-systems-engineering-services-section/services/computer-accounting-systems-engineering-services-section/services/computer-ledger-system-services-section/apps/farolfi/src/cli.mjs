import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import loadLedger, { isTransaction, malformed } from "@red-cup-engineering/organizing/accounting/ledger";
import { reconcileReceiptCandidates } from "@red-cup-engineering/organizing/accounting/receipt-intake";
import {
  accountsReport,
  balanceReport,
  balanceSheetReport,
  cashflowReport,
  checkReport,
  incomeStatementReport,
  lotsReport,
  printReport,
  reconciliationReport,
  registerReport,
  renderAccounts,
  renderBalance,
  renderBalanceSheet,
  renderCashflow,
  renderCheck,
  renderIncomeStatement,
  renderLots,
  renderPrint,
  renderReconciliation,
  renderRegister,
  renderStats,
  statsReport,
  valuationReport,
  renderValuation,
} from "@red-cup-engineering/organizing/accounting/report";

import { parseJournalFile, parseJournalText } from "./journal.mjs";

const defaults = () => ({
  format: null,
  output: "text",
  account: null,
  begin: null,
  end: null,
  depth: null,
  status: null,
  payee: null,
  requireMeta: null,
  to: null,
  reportingCommodity: null,
  help: false,
});

export function parseCli(argv) {
  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        format: { type: "string", short: "f" },
        output: { type: "string", short: "o", default: "text" },
        account: { type: "string", short: "a" },
        begin: { type: "string", short: "b" },
        end: { type: "string", short: "e" },
        depth: { type: "string", short: "d" },
        status: { type: "string", short: "s" },
        payee: { type: "string", short: "p" },
        "require-meta": { type: "string" },
        to: { type: "string" },
        "reporting-commodity": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
    const string = (value) => typeof value === "string" ? value : null;
    const format = string(parsed.values.format);
    const output = string(parsed.values.output);
    const to = string(parsed.values.to);
    if (format && format !== "beancount" && format !== "hledger") throw new Error(`unsupported format: ${format}`);
    if (to && to !== "beancount" && to !== "hledger") throw new Error(`unsupported output format: ${to}`);
    if (output !== "text" && output !== "json") throw new Error(`unsupported output mode: ${output}`);
    const depthText = string(parsed.values.depth);
    const depth = depthText === null ? null : Number(depthText);
    if (depth !== null && (!Number.isInteger(depth) || depth < 1)) throw new Error(`invalid depth: ${depthText}`);
    return {
      command: parsed.positionals[0] ?? null,
      files: parsed.positionals.slice(1),
      options: {
        format: format,
        output,
        account: string(parsed.values.account),
        begin: string(parsed.values.begin),
        end: string(parsed.values.end),
        depth,
        status: string(parsed.values.status),
        payee: string(parsed.values.payee),
        requireMeta: string(parsed.values["require-meta"]),
        to: to,
        reportingCommodity: string(parsed.values["reporting-commodity"]),
        help: parsed.values.help === true,
      },
    };
  } catch (error) {
    return { command: null, files: [], options: defaults(), error: error instanceof Error ? error.message : String(error) };
  }
}

function entriesFrom(files, options) {
  if (files.length === 0) {
    let text = "";
    try { text = readFileSync(0, "utf8"); } catch { /* empty stdin */ }
    return parseJournalText(text, { ...(options.format ? { format: options.format } : {}) }).entries;
  }
  const entries = [];
  for (const file of files) {
    try { entries.push(...parseJournalFile(file).entries); }
    catch (error) { entries.push(malformed({ raw: file, reason: error instanceof Error ? error.message : String(error) })); }
  }
  return entries;
}

const json = (value) => JSON.stringify(value, (_key, item) => {
  if (typeof item === "bigint") return item.toString();
  if (item instanceof Map) return Object.fromEntries(item);
  if (item instanceof Set) return [...item];
  return item;
}, 2);

function receiptCandidates(entries) {
  return entries.map((entry) => {
    if (!isTransaction(entry)) return entry;
    const sourceId = entry.meta.source_id;
    const encodedEvidence = entry.meta.evidence_ids;
    if (typeof sourceId !== "string" || typeof encodedEvidence !== "string") return entry;
    try {
      const evidence = JSON.parse(encodedEvidence);
      return { sourceId, evidence, transaction: entry };
    } catch { return entry; }
  });
}

export function dispatch(command, files, options) {
  if (command === "intake") {
    if (files.length < 2) return { text: usage("intake requires an existing book followed by a candidate journal"), exitCode: 2 };
    if (options.to === "hledger") return { text: usage("intake hledger export is not supported because receipt metadata would not round-trip"), exitCode: 2 };
    const existing = entriesFrom([files[0]], options);
    const candidates = receiptCandidates(entriesFrom(files.slice(1), options));
    const report = reconcileReceiptCandidates(existing, candidates);
    const acceptedJournal = renderPrint(printReport(report.accepted.map(({ transaction }) => transaction), { format: options.to ?? "beancount" }));
    const deviation = report.conflicts.length + report.refused.length;
    return { text: options.output === "json" ? json({ ...report, acceptedJournal }) : acceptedJournal, exitCode: deviation === 0 ? 0 : 1 };
  }
  return dispatchEntries(command, entriesFrom(files, options), options);
}

/** One report over entries already read, such as an entity's consolidated books. */
export function dispatchEntries(command, entries, options) {
  if (command === "print" || command === "convert") {
    return { text: renderPrint(printReport(entries, { format: options.to ?? "beancount" })), exitCode: 0 };
  }
  const ledger = loadLedger(entries);
  const filters = { account: options.account, begin: options.begin, end: options.end, depth: options.depth, status: options.status, payee: options.payee };
  switch (command) {
    case "bal":
    case "balance": {
      const report = balanceReport(ledger, filters);
      return { text: options.output === "json" ? json(report) : renderBalance(report, ledger), exitCode: 0 };
    }
    case "bs": {
      const report = balanceSheetReport(ledger, filters);
      return { text: options.output === "json" ? json(report) : renderBalanceSheet(report, ledger), exitCode: 0 };
    }
    case "is": {
      const report = incomeStatementReport(ledger, filters);
      return { text: options.output === "json" ? json(report) : renderIncomeStatement(report, ledger), exitCode: 0 };
    }
    case "cashflow": {
      const report = cashflowReport(ledger, filters);
      return { text: options.output === "json" ? json(report) : renderCashflow(report, ledger), exitCode: 0 };
    }
    case "reg":
    case "register": {
      const report = registerReport(ledger, filters);
      return { text: options.output === "json" ? json(report) : renderRegister(report, ledger), exitCode: 0 };
    }
    case "accounts": {
      const report = accountsReport(ledger, filters);
      return { text: options.output === "json" ? json(report) : renderAccounts(report), exitCode: 0 };
    }
    case "stats": {
      const report = statsReport(ledger);
      return { text: options.output === "json" ? json(report) : renderStats(report), exitCode: 0 };
    }
    case "lots": {
      const report = lotsReport(ledger, filters);
      return { text: options.output === "json" ? json(report) : renderLots(report, ledger), exitCode: 0 };
    }
    case "valuation": {
      const report = valuationReport(ledger, { ...filters, reportingCommodity: options.reportingCommodity });
      return { text: options.output === "json" ? json(report) : renderValuation(report, ledger), exitCode: 0 };
    }
    case "reconcile": {
      const report = reconciliationReport(ledger, { account: options.account, end: options.end });
      return { text: options.output === "json" ? json(report) : renderReconciliation(report), exitCode: 0 };
    }
    case "check": {
      const report = checkReport(ledger);
      const requiredMetadata = options.requireMeta;
      const missingMetadata = requiredMetadata === null
        ? []
        : ledger.transactions
          .filter((entry) => {
            const value = entry.meta[requiredMetadata];
            return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
          })
          .map((entry) => ({
            date: entry.date,
            narration: entry.narration,
            source: entry.source,
          }));
      const exitCode = missingMetadata.length === 0 ? 0 : 1;
      if (options.output === "json") {
        return {
          text: json({
            ...report,
            policy: requiredMetadata === null ? null : { requiredMetadata, missingMetadata },
            exitCode,
          }),
          exitCode,
        };
      }
      const rendered = [renderCheck(report)];
      if (requiredMetadata !== null) {
        if (missingMetadata.length === 0) rendered.push(`required transaction metadata ${requiredMetadata}: complete.`);
        else {
          rendered.push(`missing required transaction metadata ${requiredMetadata} (${missingMetadata.length}):`);
          for (const item of missingMetadata) {
            const location = item.source?.file ? `${item.source.file}:${item.source.line}` : "unknown source";
            rendered.push(`  ${location}  ${item.date}  ${item.narration}`);
          }
        }
      }
      return { text: rendered.join("\n"), exitCode };
    }
    default:
      return { text: usage(`unknown command: ${command}`), exitCode: 2 };
  }
}

export function usage(message) {
  const lines = message ? [`farolfi: ${message}`, ""] : [];
  lines.push(
    "usage: farolfi <command> [files...] [flags]",
    "",
    "commands:",
    "  bal | balance     account balances",
    "  bs                balance sheet",
    "  is                income statement",
    "  cashflow          cash-account changes",
    "  reg | register    postings with running totals",
    "  accounts          list accounts",
    "  stats             journal statistics",
    "  lots              open acquisition lots at historical cost",
    "  valuation         costed lots at latest dated market prices",
    "  reconcile         posted balances vs balance assertions, per account",
    "  check             reconciliation worklist",
    "  intake BOOK CANDIDATE...  reconcile candidates and render accepted include",
    "  print             render as Beancount",
    "  convert --to F    render as beancount or hledger",
    "",
    "flags: -f format  -o text|json  -a account-re  -b begin  -e end",
    "       -d depth   -s status     -p payee-re    --require-meta key",
    "       --to format  --reporting-commodity COMMODITY  -h help",
  );
  return lines.join("\n");
}
