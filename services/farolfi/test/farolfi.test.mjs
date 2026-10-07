import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import loadLedger from "@red-cup-engineering/organizing/accounting/ledger";

import { dispatch, parseCli } from "../src/cli.mjs";
import { detectJournalFormat, parseJournalFile, parseJournalText } from "../src/journal.mjs";

const book = `option "title" "Example"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening-Balances USD

2026-01-01 * "Opening balance"
  source_id: "opening-statement"
  Assets:Cash  125.50 USD
  Equity:Opening-Balances  -125.50 USD
`;

const options = {
  format: "beancount",
  output: "text",
  account: null,
  begin: null,
  end: null,
  depth: null,
  status: null,
  payee: null,
  requireMeta: null,
  to: null,
  help: false,
};

test("Beancount journals feed the maintained organizing ledger", () => {
  const parsed = parseJournalText(book, { format: "beancount" });
  const ledger = loadLedger(parsed.entries);
  assert.equal(ledger.transactions.length, 1);
  assert.equal(ledger.worklist.length, 0);
  assert.equal(ledger.transactions[0].meta.source_id, "opening-statement");
  assert.equal(ledger.transactions[0].postings.length, 2);
  assert.equal(detectJournalFormat({ path: "main.beancount", text: book }), "beancount");
});

test("intake renders a replay-safe costed candidate and preserves scalar evidence metadata", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-intake-"));
  const existing = join(directory, "book.beancount");
  const candidate = join(directory, "candidate.beancount");
  writeFileSync(existing, "", "utf8");
  writeFileSync(candidate, `2026-09-05 * "Hive Engine trade"
  source_id: "a6308f23ba5026f1e670e61cea257eaf62524322-0"
  evidence_ids: "[\\"ni:///sha-256;witness\\"]"
  venue: "hive-engine"
  Assets:Digital:SWAP.HIVE  -0.99502065 SWAP.HIVE
  Assets:Digital:GLD  4.1917 GLD {{0.99502065 SWAP.HIVE}}
`, "utf8");
  const first = dispatch("intake", [existing, candidate], options);
  assert.equal(first.exitCode, 0);
  assert.match(first.text, /source_id: "a6308f23ba5026f1e670e61cea257eaf62524322-0"/);
  assert.ok(first.text.includes('evidence_ids: "[\\"ni:///sha-256;witness\\"]"'));
  const emitted = join(directory, "accepted.beancount");
  writeFileSync(emitted, first.text, "utf8");
  const replay = dispatch("intake", [emitted, candidate], options);
  assert.equal(replay.exitCode, 0);
  assert.equal(replay.text, "");
});

test("hledger journals use the same accounting records", () => {
  const parsed = parseJournalText(`2026/01/02 * Coffee
  Expenses:Food  4.25 USD
  Assets:Cash
`, { format: "hledger" });
  const ledger = loadLedger(parsed.entries);
  assert.equal(ledger.transactions.length, 1);
  assert.equal(ledger.worklist.length, 0);
});

test("Beancount notes and events remain typed non-posting ledger records", () => {
  const text = `${book}
2026-01-02 note Assets:Cash "Statement requested; do not infer zero"
  status: "pending-evidence"
2026-01-02 event "source" "CHAIN-FIXTURE"
  status: "available"
`;
  const ledger = loadLedger(parseJournalText(text, { format: "beancount" }).entries);
  assert.equal(ledger.malformed.length, 0);
  const note = ledger.directives.find((directive) => directive.directive === "note");
  const event = ledger.directives.find((directive) => directive.directive === "event");
  assert.equal(note.comment, "Statement requested; do not infer zero");
  assert.equal(note.meta.status, "pending-evidence");
  assert.equal(event.description, "CHAIN-FIXTURE");
  assert.equal(event.meta.status, "available");
});

test("Beancount balance metadata remains attached to the reconciliation assertion", () => {
  const text = `${book}
2026-01-02 balance Assets:Cash  10 ~ 0.01 USD
  reconciliation_id: "REC-1"
  status: "reconciled"
`;
  const ledger = loadLedger(parseJournalText(text, { format: "beancount" }).entries);
  const assertion = ledger.directives.find((directive) => directive.directive === "balance");
  assert.equal(assertion.meta.reconciliation_id, "REC-1");
  assert.equal(assertion.meta.status, "reconciled");
  assert.equal(assertion.tolerance, "0.01");
});

test("includes resolve relative to their containing journal", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-"));
  writeFileSync(join(directory, "accounts.beancount"), "2026-01-01 open Assets:Cash USD\n", "utf8");
  writeFileSync(join(directory, "main.beancount"), 'include "accounts.beancount"\n', "utf8");
  const parsed = parseJournalFile(join(directory, "main.beancount"));
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[0].directive, "include");
  assert.equal(parsed.entries[0].resolved, true);
  assert.equal(parsed.entries[1].directive, "open");
});

test("a glob include resolves every matching file in sorted order", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-glob-"));
  writeFileSync(join(directory, "2026-09-04-accounts.beancount"), "2026-01-01 open Assets:Cash USD\n", "utf8");
  writeFileSync(join(directory, "2026-09-05-accounts.beancount"), "2026-01-01 open Assets:Bank USD\n", "utf8");
  writeFileSync(join(directory, "main.beancount"), 'include "2026-*-accounts.beancount"\n', "utf8");
  const parsed = parseJournalFile(join(directory, "main.beancount"));
  const includeEntries = parsed.entries.filter((entry) => entry.directive === "include");
  const openEntries = parsed.entries.filter((entry) => entry.directive === "open");
  assert.equal(includeEntries.length, 2);
  assert.ok(includeEntries.every((entry) => entry.resolved === true));
  assert.equal(openEntries.length, 2);
  assert.deepEqual(openEntries.map((entry) => entry.account).sort(), ["Assets:Bank", "Assets:Cash"]);
});

test("a glob include with zero matches is held as malformed, not silently dropped", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-glob-empty-"));
  writeFileSync(join(directory, "main.beancount"), 'include "2026-*-nothing-here.beancount"\n', "utf8");
  const parsed = parseJournalFile(join(directory, "main.beancount"));
  const malformed = parsed.entries.find((entry) => entry.kind === "malformed");
  assert.ok(malformed, "expected a malformed entry for the zero-match glob");
  assert.equal(malformed.reason, "glob-no-match");
});

test("Farolfi delegates reports to organizing", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-"));
  const path = join(directory, "main.beancount");
  writeFileSync(path, book, "utf8");
  assert.match(dispatch("balance", [path], options).text, /Assets\s+125\.5 USD[\s\S]*Cash\s+125\.5 USD/);
  assert.match(dispatch("bs", [path], options).text, /Assets/);
  assert.match(dispatch("check", [path], options).text, /no held contradictions/);
});

test("reconcile joins posted balances against balance assertions", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-reconcile-"));
  const path = join(directory, "main.beancount");
  const text = `${book}
2026-02-01 balance Assets:Cash  125.50 USD
2026-02-01 balance Equity:Opening-Balances  -1 USD
`;
  writeFileSync(path, text, "utf8");

  const rendered = dispatch("reconcile", [path], options).text;
  assert.match(rendered, /Assets:Cash/);
  assert.match(rendered, /agreed: 1/);
  assert.match(rendered, /mismatch: 1/);

  const scoped = dispatch("reconcile", [path], { ...options, account: "^Assets:Cash$" }).text;
  assert.match(scoped, /Assets:Cash/);
  assert.doesNotMatch(scoped, /Equity:Opening-Balances/);

  const report = JSON.parse(dispatch("reconcile", [path], { ...options, output: "json" }).text);
  const byAccount = Object.fromEntries(report.rows.map((row) => [row.account, row]));
  assert.equal(byAccount["Assets:Cash"].verdict, "agreed");
  assert.equal(byAccount["Assets:Cash"].posted, "251/2 USD");
  assert.equal(byAccount["Equity:Opening-Balances"].verdict, "mismatch");
  assert.equal(report.summary.agreed, 1);
  assert.equal(report.summary.mismatch, 1);
});

test("JSON tree reports preserve map-backed balances", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-json-"));
  const path = join(directory, "main.beancount");
  writeFileSync(path, book, "utf8");
  const jsonOptions = { ...options, output: "json" };

  const balance = JSON.parse(dispatch("balance", [path], jsonOptions).text);
  assert.deepEqual(Object.keys(balance.tree.children), ["Assets", "Equity"]);
  assert.ok(balance.tree.total.USD);
  assert.ok(balance.tree.children.Assets.total.USD);

  const balanceSheet = JSON.parse(dispatch("bs", [path], jsonOptions).text);
  assert.deepEqual(Object.keys(balanceSheet.tree.children), ["Assets", "Equity"]);
  assert.ok(balanceSheet.tree.children.Equity.total.USD);
});

test("the executable flushes JSON reports larger than the stdout buffer", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-large-json-"));
  const path = join(directory, "main.beancount");
  const postings = Array.from({ length: 400 }, (_, index) => {
    const account = `Assets:Generated:Account-${String(index).padStart(4, "0")}`;
    return `  ${account}  1 USD\n  Equity:Opening-Balances  -1 USD`;
  }).join("\n");
  writeFileSync(path, `2026-01-01 * "Large JSON report"\n${postings}\n`, "utf8");

  const result = spawnSync(
    process.execPath,
    [join(import.meta.dirname, "../src/bin/farolfi.mjs"), "balance", path, "-o", "json"],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.length > 65_536);
  const report = JSON.parse(result.stdout);
  assert.equal(Object.keys(report.tree.children.Assets.children.Generated.children).length, 400);
});

test("Farolfi exposes historical lots and dated valuation without conflating them", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-lots-"));
  const path = join(directory, "main.beancount");
  writeFileSync(path, `2026-01-01 open Assets:Broker:Shares SHARE "FIFO"
2026-01-01 open Assets:Broker:Cash USD
2026-01-01 open Equity:Opening USD

2026-01-02 * "Acquire shares"
  Assets:Broker:Shares  3 SHARE {5 USD, "lot-a"}
  Assets:Broker:Cash  -15 USD

2026-02-01 price SHARE 8 USD
`, "utf8");

  const lots = dispatch("lots", [path], options).text;
  assert.match(lots, /3 SHARE/);
  assert.match(lots, /5 USD/);
  assert.match(lots, /15 USD/);

  const valuation = dispatch("valuation", [path], options).text;
  assert.match(valuation, /24 USD/);
  assert.match(valuation, /9 USD/);
  assert.match(valuation, /2026-02-01/);
});

test("Group-scale decimal balances remain exact and compact", () => {
  const groupBook = `2026-08-27 open Assets:Digital-Assets:Hive:Liquid HIVE,HBD
2026-08-27 open Assets:Digital-Assets:Hive:Staked HP
2026-08-27 open Assets:Digital-Assets:EVM:Base:Native ETH
2026-08-27 open Equity:Opening-Balances HIVE,HBD,HP,ETH

2026-08-27 * "Opening Hive balances"
  Assets:Digital-Assets:Hive:Liquid  142.423 HIVE
  Assets:Digital-Assets:Hive:Liquid  17.412 HBD
  Assets:Digital-Assets:Hive:Staked  921.247 HP
  Equity:Opening-Balances  -142.423 HIVE
  Equity:Opening-Balances  -17.412 HBD
  Equity:Opening-Balances  -921.247 HP

2026-08-27 * "Opening EVM balances"
  Assets:Digital-Assets:EVM:Base:Native  0.01532910 ETH
  Equity:Opening-Balances  -0.01532910 ETH
`;
  const directory = mkdtempSync(join(tmpdir(), "farolfi-group-"));
  const path = join(directory, "main.beancount");
  writeFileSync(path, groupBook, "utf8");

  const ledger = loadLedger(parseJournalFile(path).entries);
  assert.equal(ledger.transactions.length, 2);
  assert.equal(ledger.worklist.length, 0);
  assert.match(dispatch("balance", [path], options).text, /142\.423 HIVE/);
  assert.match(dispatch("balance", [path], options).text, /0\.0153291 ETH/);
});

test("CLI rejects invalid formats and depths", () => {
  assert.match(parseCli(["balance", "--format", "made-up"]).error, /unsupported format/);
  assert.match(parseCli(["balance", "--depth", "zero"]).error, /invalid depth/);
});

test("check can enforce required transaction metadata without changing ledger settlement", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-meta-"));
  const path = join(directory, "main.beancount");
  writeFileSync(path, `${book}
2026-01-02 * "Unsupported purchase"
  Assets:Cash  -5 USD
  Equity:Opening-Balances  5 USD
`, "utf8");

  const required = { ...options, requireMeta: "source_id" };
  const result = dispatch("check", [path], required);
  assert.equal(result.exitCode, 1);
  assert.match(result.text, /missing required transaction metadata source_id \(1\)/);
  assert.match(result.text, /Unsupported purchase/);

  const jsonResult = dispatch("check", [path], { ...required, output: "json" });
  const decoded = JSON.parse(jsonResult.text);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.policy.missingMetadata.length, 1);
  assert.equal(decoded.exitCode, 1);
});

test("required transaction metadata passes when every transaction carries it", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-meta-"));
  const path = join(directory, "main.beancount");
  writeFileSync(path, book, "utf8");
  const result = dispatch("check", [path], { ...options, requireMeta: "source_id" });
  assert.equal(result.exitCode, 0);
  assert.match(result.text, /required transaction metadata source_id: complete/);
});

test("--reporting-commodity values a mixed KWH/USD journal in KWH using forward and inverse price directives", () => {
  const directory = mkdtempSync(join(tmpdir(), "farolfi-reporting-commodity-"));
  const path = join(directory, "main.beancount");
  writeFileSync(path, `2026-01-01 open Assets:Solar:PVBank KWH
2026-01-01 open Assets:Cash:Operating USD
2026-01-01 open Equity:Opening-Balances

2026-01-01 * "Opening PV bank"
  Assets:Solar:PVBank  100 KWH
  Equity:Opening-Balances  -100 KWH

2026-01-01 * "Opening cash"
  Assets:Cash:Operating  20 USD
  Equity:Opening-Balances  -20 USD

2026-01-15 price KWH 0.20 USD
2026-01-15 price USD 5 KWH
`, "utf8");

  const parsed = parseCli(["valuation", path, "--reporting-commodity", "KWH", "-o", "json"]);
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.options.reportingCommodity, "KWH");

  const result = dispatch("valuation", [path], parsed.options);
  const report = JSON.parse(result.text);
  assert.equal(report.reportingCommodity, "KWH");
  const pvRow = report.rows.find((row) => row.account === "Assets:Solar:PVBank");
  assert.equal(pvRow.marketValue.value.num, "100");
  assert.equal(pvRow.marketValue.grade, "KWH");
  const cashRow = report.rows.find((row) => row.account === "Assets:Cash:Operating");
  assert.equal(cashRow.marketValue.value.num, "100");
  assert.equal(cashRow.marketValue.grade, "KWH");

  const defaultedJson = dispatch("valuation", [path], { ...options, output: "json" });
  assert.equal(JSON.parse(defaultedJson.text).reportingCommodity, "USD");
});
