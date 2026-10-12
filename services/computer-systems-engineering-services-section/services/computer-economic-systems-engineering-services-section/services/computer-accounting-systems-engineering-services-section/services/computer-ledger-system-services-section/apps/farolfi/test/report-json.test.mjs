import assert from "node:assert/strict";
import { test } from "node:test";
import { admitLedgerJournalInput, admitLedgerReportQuery, ledgerReportQuerySchema, readLedgerReadings, toLedgerJson, readLedgerSnapshot, readLedgerReport } from "../src/index.mjs";
test("ledger transport preserves exact quantities and keyed trees without serialization side effects", () => {
 const source = new Map([["Assets:Cash", { total: {num: 9007199254740993n, den: 7n}, optional: undefined }]]);
 const result = toLedgerJson(source);
 assert.deepEqual(result, {"Assets:Cash": {total: {num: "9007199254740993", den: "7"}}});
 assert.equal(typeof source.get("Assets:Cash").total.num, "bigint");
 assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
 assert.throws(() => toLedgerJson(new Map([[1, "bad key"]])), /keys/);
 assert.throws(() => toLedgerJson(NaN), /unsupported/);
});

test("one admitted query selects a report and derives the five-reading overview", () => {
 const journal = admitLedgerJournalInput({ text: "2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n2026-01-02 * \"Opening\"\n  Assets:Cash  25 USD\n  Equity:Opening  -25 USD\n" });
 const snapshot = readLedgerSnapshot(journal, "2026-09-08T00:00:00.000Z");
 const query = admitLedgerReportQuery({ report: "balance-sheet", account: "Assets" });
 assert.equal(readLedgerReport(snapshot, query).report, "balance-sheet");
 const readings = readLedgerReadings(snapshot, query);
 assert.equal(readings.balanceSheet.report, "balance-sheet");
 assert.equal(readings.selectedReport?.report, "balance-sheet");
 assert.deepEqual(ledgerReportQuerySchema.required, ["report"]);
 assert.throws(() => admitLedgerReportQuery({ report: "balance", journal: { path: "forbidden" } }), /additional properties/);
});

test("snapshot provenance is compact and metadata checks retain source line evidence", () => {
 const snapshot=readLedgerSnapshot({kind:"text",text:"2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n2026-01-02 * \"Opening\"\n  Assets:Cash  25 USD\n  Equity:Opening  -25 USD\n"});
 assert.deepEqual(snapshot.sourceFiles,[]);assert.equal(snapshot.entryCount,3);
 const report=toLedgerJson(readLedgerReport(snapshot,{report:"register"}));assert.equal(report.data.rows.length,2);
 const check=toLedgerJson(readLedgerReport(snapshot,{report:"check",requireMeta:"source_id"}));
 assert.ok(check.data.policy.missingMetadata[0].source.line>0);
 assert.ok(JSON.stringify(toLedgerJson(snapshot)).length<1000);
 assert.throws(()=>readLedgerReport(snapshot,{report:"unknown"}),/allowed values/);
});
