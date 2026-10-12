import assert from "node:assert/strict";
import { admitLedgerReportQuery, readLedgerReadings, readLedgerSnapshot, toLedgerJson } from "@red-cup-engineering/farolfi";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderExactAmount, renderLedgerApplication } from "../src/index.mjs";

const mainLedger = new URL("../../../../../../../../../../../../../../561-group-services-section/data/logs/ledgers/561-group-main-ledger.beancount", import.meta.url);
const snapshot = readLedgerSnapshot({ kind: "path", path: mainLedger.pathname }, "2026-09-08T00:00:00.000Z");

function render(query) {
  return renderLedgerApplication({ query, readings: toLedgerJson(readLedgerReadings(snapshot, query)), navigation: [{ href: "/tasks/view", label: "Work" }] });
}

test("the pure renderer consumes Farolfi-admitted readings and native query inputs", () => {
  assert.ok(readFileSync(mainLedger, "utf8").includes("561 Group main ledger"));
  const query = admitLedgerReportQuery({ report: "balance-sheet", begin: "2026-01-01", end: "2026-09-08", account: "Assets:Cash" });
  const html = render(query);
  assert.match(html, /<form[^>]*method="get"/);
  assert.match(html, /type="date"/);
  assert.match(html, /href="\/tasks\/view"/);
  assert.match(html, /<caption>Balance sheet accounts<\/caption>/);
  assert.match(html, /href="\/books\/view\?report=register&amp;begin=2026-01-01&amp;end=2026-09-08&amp;account=Assets%3ACash/);
  assert.doesNotMatch(html, /<script/);
});

test("exact Farolfi money is projected without float conversion", () => {
  assert.equal(renderExactAmount({ value: { num: "1", den: "3" }, grade: "USD" }), "1/3 USD");
  const html = render(admitLedgerReportQuery({ report: "register" }));
  assert.match(html, /Inference and compute: anthropic claude-sonnet-5/);
  assert.match(html, /73174567\/10000000 USD/);
});

test("all specialized report projections consume their canonical Farolfi fields", () => {
  const valuation = render(admitLedgerReportQuery({ report: "valuation" }));
  assert.match(valuation, /<caption>Position valuation<\/caption>/);
  assert.match(valuation, /Assets:Digital-Assets:Banano:Native/);
  assert.match(valuation, /19999677632601467554750584653869\/100000000000000000000000000000 BAN/);
  const lots = render(admitLedgerReportQuery({ report: "lots" }));
  assert.match(lots, /<caption>Open lots<\/caption>/);
  assert.match(lots, /No open lots\./);
  const check = render(admitLedgerReportQuery({ report: "check" }));
  assert.match(check, /Integrity and metadata status/);
  assert.match(check, /Passed/);
  assert.match(check, /No metadata policy requested/);
  const reconciliation = render(admitLedgerReportQuery({ report: "reconcile" }));
  assert.match(reconciliation, /Actual/);
  assert.match(reconciliation, /Asserted/);
  assert.match(reconciliation, /Assertion date/);
  assert.match(reconciliation, /19999677632601467554750584653869\/100000000000000000000000000000 BAN/);
  assert.doesNotMatch(valuation, /\{&quot;account&quot;/);
});
