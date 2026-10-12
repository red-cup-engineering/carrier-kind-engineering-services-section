import { LEDGER_REPORT_NAMES } from "@red-cup-engineering/farolfi";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";

export { LEDGER_REPORT_NAMES };

const TREE_REPORTS = new Set(["balance", "balance-sheet", "income-statement", "cashflow"]);
const UNAVAILABLE = "Unavailable from the admitted ledger reading.";

/** Formats Farolfi's JSON-bound exact Money carrier without decimal parsing or rounding. */
export function renderExactAmount(amount) {
  if (amount === null) return undefined;
  const { value: { num, den }, grade } = amount;
  return grade === undefined ? (den === "1" ? num : `${num}/${den}`) : `${den === "1" ? num : `${num}/${den}`} ${grade}`;
}

function totals(bag) {
  const amounts = Object.entries(bag).map(([commodity, amount]) => {
    const exact = renderExactAmount(amount);
    return exact.includes(" ") ? exact : `${exact} ${commodity}`;
  });
  return amounts.length === 0 ? "No commodities reported." : amounts.join(", ");
}

function reportUrl(report, query, account) {
  const params = new URLSearchParams({ report });
  if (query.begin) params.set("begin", query.begin);
  if (query.end) params.set("end", query.end);
  if (account) params.set("account", account);
  return `/books/view?${params}`;
}

function accountTreeRows(tree, query) {
  const rows = [];
  const walk = (node, prefix) => {
    for (const [name, child] of Object.entries(node.children)) {
      const account = prefix ? `${prefix}:${name}` : name;
      rows.push([{ text: account, href: reportUrl("register", query, account) }, { text: totals(child.total), align: "end" }]);
      walk(child, account);
    }
  };
  walk(tree, "");
  return rows;
}

function treeTile(report, query, title = report.report) {
  const rows = accountTreeRows(report.data.tree, query);
  return { title, span: 6, table: { caption: `${title} accounts`, columns: [{ id: "account", label: "Account", rowHeader: true }, { id: "total", label: "Exact total", align: "end" }], rows, empty: "No accounts matched this reading." } };
}

function reconcileTile(report, query) {
  const rows = report.data.rows.map(({ account, commodity, posted, asserted, assertedAt, verdict }) => [
    { text: account, href: reportUrl("register", query, account) }, { text: commodity ?? "All commodities" }, { text: posted ?? UNAVAILABLE, align: "end" }, { text: asserted ?? UNAVAILABLE, align: "end" }, { text: assertedAt ?? UNAVAILABLE }, { text: verdict },
  ]);
  return { title: "Reconciliation status", span: 12, table: { caption: "Reconciliation worklist", columns: [{ id: "account", label: "Account", rowHeader: true }, { id: "commodity", label: "Commodity" }, { id: "posted", label: "Actual", align: "end" }, { id: "asserted", label: "Asserted", align: "end" }, { id: "asserted-at", label: "Assertion date" }, { id: "verdict", label: "Status" }], rows, empty: "No reconciliation rows matched this reading." } };
}

function registerTile(report, query) {
  const rows = report.data.rows.map(({ date, description, account, amount }) => [{ text: date }, { text: description }, { text: account, href: reportUrl("register", query, account) }, { text: renderExactAmount(amount) ?? UNAVAILABLE, align: "end" }]);
  return { title: "Register", span: 12, table: { caption: "Account register", columns: [{ id: "date", label: "Date" }, { id: "description", label: "Description" }, { id: "account", label: "Account", rowHeader: true }, { id: "amount", label: "Exact amount", align: "end" }], rows, empty: "No postings matched this reading." } };
}

function reportTile(report, query) {
  if (report === undefined) return { title: "Selected report", span: 12, content: UNAVAILABLE };
  if (TREE_REPORTS.has(report.report)) return treeTile(report, query);
  if (report.report === "reconcile") return reconcileTile(report, query);
  if (report.report === "register") return registerTile(report, query);
  if (report.report === "accounts") return { title: "Accounts", span: 12, table: { caption: "Ledger accounts", columns: [{ id: "account", label: "Account", rowHeader: true }], rows: report.data.accounts.map((account) => [{ text: account, href: reportUrl("register", query, account) }]), empty: "No accounts matched this reading." } };
  if (report.report === "stats") return { title: "Statistics", span: 12, table: { caption: "Journal statistics", columns: [{ id: "measure", label: "Measure", rowHeader: true }, { id: "value", label: "Value", align: "end" }], rows: ["transactions", "postings", "accounts", "commodities", "directives", "malformed", "held", "synthesized", "span"].map((key) => [{ text: key }, { text: String(report.data[key]), align: "end" }]), empty: "No statistics available." } };
  if (report.report === "check") {
    const { ok, contradictions, failures, malformed, policy } = report.data;
    const policyStatus = policy === null ? "No metadata policy requested" : `${policy.missingMetadata.length} missing ${policy.requiredMetadata} values`;
    return { title: "Ledger integrity", span: 12, table: { caption: "Integrity and metadata status", columns: [{ id: "check", label: "Check", rowHeader: true }, { id: "status", label: "Status" }], rows: [[{ text: "Integrity" }, { text: ok ? "Passed" : "Held contradictions or failures" }], [{ text: "Contradictions" }, { text: String(contradictions.length) }], [{ text: "Failures" }, { text: String(failures.length) }], [{ text: "Malformed entries" }, { text: String(malformed.length) }], [{ text: "Metadata policy" }, { text: policyStatus }]], empty: "No integrity evidence available." } };
  }
  if (report.report === "valuation") return { title: "Valuation", span: 12, table: { caption: "Position valuation", columns: [{ id: "account", label: "Account", rowHeader: true }, { id: "units", label: "Units", align: "end" }, { id: "book", label: "Book value", align: "end" }, { id: "market", label: "Market value", align: "end" }, { id: "unrealized", label: "Unrealized", align: "end" }, { id: "date", label: "Price date" }], rows: report.data.rows.map(({ account, units, bookValue, marketValue, unrealized, priceDate }) => [{ text: account, href: reportUrl("register", query, account) }, { text: renderExactAmount(units), align: "end" }, { text: renderExactAmount(bookValue) ?? "Unpriced", align: "end" }, { text: renderExactAmount(marketValue) ?? "Unpriced", align: "end" }, { text: renderExactAmount(unrealized) ?? "Unpriced", align: "end" }, { text: priceDate ?? "Unpriced" }]), empty: "No positions matched this reading." } };
  if (report.report === "lots") return { title: "Lots", span: 12, table: { caption: "Open lots", columns: [{ id: "account", label: "Account", rowHeader: true }, { id: "units", label: "Units", align: "end" }, { id: "unit-cost", label: "Unit cost", align: "end" }, { id: "date", label: "Acquired" }, { id: "label", label: "Label" }], rows: report.data.lots.map(({ account, units, unitCost, date, label }) => [{ text: account, href: reportUrl("register", query, account) }, { text: renderExactAmount(units), align: "end" }, { text: renderExactAmount(unitCost), align: "end" }, { text: date }, { text: label ?? "Unlabelled" }]), empty: "No open lots." } };
  throw new TypeError(`unhandled admitted ledger report: ${report.report}`);
}

function queryForm(query, action) {
  return { title: "Query the ledger", span: 12, form: { action, method: "get", errors: query.errors, fields: [{ name: "report", label: "Report", kind: "select", value: query.report, options: LEDGER_REPORT_NAMES.map((value) => ({ value, label: value })) }, { name: "begin", label: "Begin date", kind: "date", value: query.begin, max: query.end || undefined }, { name: "end", label: "End date", kind: "date", value: query.end, min: query.begin || undefined }, { name: "account", label: "Account", value: query.account, placeholder: "Assets:Cash:Operating" }], submitters: [{ label: "Read report" }] } };
}

function provenanceTile(report) {
  if (report === undefined) return { title: "Provenance", span: 12, content: UNAVAILABLE };
  const { generatedAt, snapshot } = report;
  const lines = [["Generated", generatedAt], ["Observed", snapshot.observedAt], ["Snapshot", snapshot.id], ["Parsed snapshot", snapshot.parsedSnapshotDigest], ["Source", snapshot.sourceId], ["Entries", String(snapshot.entryCount)], ["Files", snapshot.sourceFiles.join(", ")]];
  return { title: "Provenance", span: 12, table: { caption: "Reading provenance", columns: [{ id: "field", label: "Field", rowHeader: true }, { id: "value", label: "Value" }], rows: lines.map(([field, value]) => [{ text: field }, { text: value }]), empty: UNAVAILABLE } };
}

/** Pure TUFTE projection of Farolfi-admitted JSON ledger readings. */
export function renderLedgerApplication({ readings, query, navigation = [], action = "/books/view", title = "Ledger books" }) {
  const { selectedReport, balanceSheet, incomeStatement, reconcile } = readings;
  const provenance = selectedReport ?? balanceSheet ?? incomeStatement ?? reconcile;
  return renderTufteDocument({ title, subtitle: provenance?.generatedAt ?? "No admitted ledger reading", navigation, tiles: [queryForm(query, action), reportTile(selectedReport, query), treeTile(balanceSheet, query, "Balance sheet"), treeTile(incomeStatement, query, "Income statement"), reconcileTile(reconcile, query), provenanceTile(provenance), { title: "Data", span: 12, links: [{ href: "/books", label: "JSON readings" }, { href: `/books/report?${new URLSearchParams({ report: query.report, ...(query.begin ? { begin: query.begin } : {}), ...(query.end ? { end: query.end } : {}), ...(query.account ? { account: query.account } : {}) })}`, label: "Selected report JSON" }] }] });
}
