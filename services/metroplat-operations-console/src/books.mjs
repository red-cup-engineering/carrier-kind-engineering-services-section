import { fromSection } from "@red-cup-engineering/html-structural-projection-service";

import { renderTuftePacket } from "@red-cup-engineering/web-page-tiling-engine";
/** Read ops ledger books state from MetroPlat over the loopback MCP boundary. @module */

/** The eleven Farolfi report names `ledger-report` admits, per its published JSON Schema. */
export const LEDGER_REPORT_NAMES = Object.freeze([
  "balance", "balance-sheet", "income-statement", "cashflow", "register",
  "accounts", "stats", "lots", "valuation", "reconcile", "check",
]);

const RECONCILE_VERDICTS = Object.freeze(["agreed", "mismatch", "posted-only", "asserted-only", "inactive"]);
const READING_KEYS = Object.freeze(["stats", "balanceSheet", "incomeStatement", "reconcile", "accounts"]);

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function string(value) {
  return typeof value === "string" ? value : undefined;
}

function count(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function reconcileSummary(reading) {
  const summary = object(reading?.summary) ?? {};
  return Object.freeze(Object.fromEntries(RECONCILE_VERDICTS.map((verdict) => [verdict, count(summary[verdict])])));
}

function reconcileRows(reading) {
  return Object.freeze(array(reading?.rows).map(object).filter(Boolean).map((row) => Object.freeze({
    account: string(row.account) ?? "",
    verdict: string(row.verdict) ?? "",
    ...(row.posted === undefined ? {} : { posted: row.posted }),
    ...(row.asserted === undefined ? {} : { asserted: row.asserted }),
  })));
}

/** The first present reading among READING_KEYS, whose journal/generatedAt anchor the whole page. */
function anchorReading(readings) {
  for (const key of READING_KEYS) {
    const reading = object(readings[key]);
    if (reading) return reading;
  }
  return undefined;
}

/**
 * Read the standard set of ledger readings (balance sheet, income statement, reconcile
 * worklist, stats, accounts) from the loopback MetroPlat MCP service's `ledger-readings` tool.
 * @param {(tool: string, input: object) => Promise<unknown>} read MetroPlat's tools, through the federation.
 * @param {{begin?: string, end?: string}} [options]
 * @returns {Promise<object>} `{ source, generatedAt, journal, balanceSheet, incomeStatement,
 *   reconcile: { summary, rows }, stats, accounts }`.
 * @throws {TypeError} When the upstream response is malformed or the call fails.
 */
export async function readMetroplatBooks(read, { begin, end } = {}) {
  const input = { ...(begin === undefined ? {} : { begin }), ...(end === undefined ? {} : { end }) };
  const value = await read("ledger-readings", input);
  const envelope = object(value);
  if (!envelope) throw new TypeError("MetroPlat ledger-readings response was not an object");
  const readings = object(envelope.readings) ?? {};
  const reconcile = object(readings.reconcile);
  const anchor = anchorReading(readings);
  return Object.freeze({
    source: "metroplat-mcp",
    generatedAt: string(anchor?.generatedAt),
    journal: object(anchor?.journal),
    balanceSheet: object(readings.balanceSheet),
    incomeStatement: object(readings.incomeStatement),
    reconcile: Object.freeze({ summary: reconcileSummary(reconcile), rows: reconcileRows(reconcile) }),
    stats: object(readings.stats),
    accounts: object(readings.accounts),
  });
}

function moneyString(entry) {
  const money = object(entry);
  if (!money) return "";
  const value = object(money.value) ?? money;
  if (value?.num === undefined) return "";
  const den = value.den;
  return den === undefined || String(den) === "1" ? String(value.num) : `${value.num}/${den}`;
}

function totalsLine(total) {
  return Object.entries(object(total) ?? {})
    .map(([commodity, entry]) => {
      const amount = moneyString(entry);
      return amount === "" ? undefined : `${amount} ${commodity}`;
    })
    .filter((entry) => entry !== undefined)
    .join(", ");
}

/** Flattens an account tree (Farolfi's `tree.children`) into rows down to `depth` levels. */
function accountTreeRows(tree, depth) {
  const rows = [];
  function walk(node, prefix, level) {
    for (const [name, child] of Object.entries(object(node?.children) ?? {})) {
      const path = prefix === "" ? name : `${prefix}:${name}`;
      rows.push({ path, level, totals: totalsLine(child?.total) });
      if (level < depth) walk(child, path, level + 1);
    }
  }
  walk(tree, "", 1);
  return rows;
}

/** Project ledger readings into shared TUFTE components. */
export function renderBooksHtml(books, { navigation = [] } = {}) {
  const reading = JSON.parse(JSON.stringify(books));
  const report = (title, value) => ({ title, span: 6, table: { columns: ["Account", "Total"], rows: accountTreeRows(value?.tree, 3).map((row) => [row.path, row.totals]) } });
  return renderTuftePacket(fromSection({ affirmed: [{ predicate: "reading", object: reading, citation: "/books" }] }, { subject: "/books", title: "Ledger books" }),
    { source: "/books", settlement: reading, projection: "ops.books.tufte" }, {
      title: "Ledger books", subtitle: books.generatedAt ?? "Current books",
      tiles: [
        { title: navigation.title ?? "Group", links: navigation, span: 12 },
        { title: "Reconcile", span: 12, table: { columns: RECONCILE_VERDICTS, rows: [RECONCILE_VERDICTS.map((verdict) => String(count(books.reconcile?.summary?.[verdict])))] } },
        report("Balance sheet", books.balanceSheet), report("Income statement", books.incomeStatement),
        { title: "Stats", data: books.stats, span: 12 },
        { title: "Source", links: [{ href: "/books", label: "JSON reading" }] },
      ],
    }).html;
}
