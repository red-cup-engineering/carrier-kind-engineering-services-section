import assert from "node:assert/strict";

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { readLedgerReport, readLedgerSnapshot, toLedgerJson } from "@red-cup-engineering/farolfi";
import { startNativeApplication as start } from "@red-cup-engineering/computer-web-server/native-application";
import { createOpsMcpGatewayApp } from "../src/app.mjs";

const mainLedger = new URL("../../../../../../../../../../561-group-services-section/data/logs/ledgers/561-group-main-ledger.beancount", import.meta.url);
const reportNames = ["balance", "balance-sheet", "income-statement", "cashflow", "register", "accounts", "stats", "lots", "valuation", "reconcile", "check"];
const oauth = {
  metadata: () => ({ issuer: "https://ops.test.invalid" }),
  registerClient: () => ({ client_id: "ledger-browser" }),
  exchangeCode: () => ({ access_token: "browser-good", token_type: "Bearer", expires_in: 3600 }),
  validateToken: (token) => token === "good" ? { email: "operator@example.invalid" } : null,
  revoke: () => {},
};

let browser;
let running;
let origin;
let stateDir;
let calls = [];

function transport(value) {
  // This is the same network boundary used by MetroPlat: typed Maps and bigint values
  // become plain JSON before the gateway's MCP client receives them.
  return JSON.parse(JSON.stringify(toLedgerJson(value)));
}

function mcpResponse(value) {
  return new Response(JSON.stringify({
    jsonrpc: "2.0", id: 1,
    result: { content: [{ type: "text", text: JSON.stringify(value) }] },
  }), { headers: { "content-type": "application/json" } });
}

before(async () => {
  assert.match(readFileSync(mainLedger, "utf8"), /561 Group main ledger/);
  const snapshot = readLedgerSnapshot({ kind: "path", path: mainLedger.pathname }, "2026-09-08T00:00:00.000Z");
  const standard = Object.freeze({
    kind: "ledger-readings",
    readings: Object.freeze({
      balanceSheet: transport(readLedgerReport(snapshot, { report: "balance-sheet" })),
      incomeStatement: transport(readLedgerReport(snapshot, { report: "income-statement" })),
      reconcile: transport(readLedgerReport(snapshot, { report: "reconcile" })),
      stats: transport(readLedgerReport(snapshot, { report: "stats" })),
      accounts: transport(readLedgerReport(snapshot, { report: "accounts" })),
    }),
  });
  const report = (name, input) => transport(readLedgerReport(snapshot, { ...input, report: name }));
  const fetchImpl = async (_url, options) => {
    const request = JSON.parse(options.body);
    calls.push(request.params);
    if (request.params.name === "ledger-readings") {
      const input = request.params.arguments.input;
      return mcpResponse({ ...standard, selectedReport: report(input.report ?? "balance-sheet", input) });
    }
    if (request.params.name === "ledger-report") return mcpResponse(report(request.params.arguments.input.report, request.params.arguments.input));
    throw new Error(`unexpected MetroPlat tool ${request.params.name}`);
  };
  stateDir = mkdtempSync(join(tmpdir(), "ops-ledger-browser-"));
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "http://127.0.0.1",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
    stateDir,
  }, { oauth, fetchImpl });
  running = await start(app, { host: "127.0.0.1", port: 0 });
  origin = `http://127.0.0.1:${running.port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
});

after(async () => {
  await browser?.close();
  await running?.close();
  rmSync(stateDir, { recursive: true, force: true });
});

async function admittedPage(t, options = {}) {
  const context = await browser.newContext({ extraHTTPHeaders: { authorization: "Bearer good" }, ...options });
  t.after(() => context.close());
  return context.newPage();
}

test("the authenticated HTTP gateway projects a nonempty ledger table with exact amounts and account drilldowns", async (t) => {
  const page = await admittedPage(t, { javaScriptEnabled: false });
  const before = calls.length;
  await page.goto(`${origin}/books/view?report=balance-sheet`);
  await assert.doesNotReject(() => page.getByRole("table", { name: "balance-sheet accounts" }).waitFor());
  assert.ok(await page.getByRole("table", { name: "balance-sheet accounts" }).locator("tbody tr").count() > 0);
  assert.ok(await page.locator("td.tufte-align-end").count() > 0, "expected an exact total cell");
  const link = page.locator("a[href*='report=register']").first();
  const target = await link.getAttribute("href");
  assert.match(target ?? "", /account=/);
  await Promise.all([page.waitForURL(/\/books\/view\?report=register/), link.click()]);
  assert.equal(new URL(page.url()).searchParams.get("report"), "register");
  assert.deepEqual(calls.slice(before).map((request) => request.name), ["ledger-readings", "ledger-readings"]);
  assert.deepEqual(calls.slice(before).map((request) => request.arguments.input.report), ["balance-sheet", "register"]);
});

test("the native GET form works without JavaScript and keeps its dates and selected report", async (t) => {
  const page = await admittedPage(t, { javaScriptEnabled: false });
  await page.goto(`${origin}/books/view?report=balance-sheet`);
  await page.getByLabel("Report").selectOption("register");
  await page.getByLabel("Begin date").fill("2026-01-01");
  await page.getByLabel("End date").fill("2026-09-08");
  await Promise.all([page.waitForURL(/report=register/), page.getByRole("button", { name: "Read report" }).click()]);
  const url = new URL(page.url());
  assert.equal(url.searchParams.get("report"), "register");
  assert.equal(url.searchParams.get("begin"), "2026-01-01");
  assert.equal(url.searchParams.get("end"), "2026-09-08");
});

test("invalid dates have a server-rendered accessible error", async (t) => {
  const page = await admittedPage(t, { javaScriptEnabled: false });
  await page.goto(`${origin}/books/view?report=balance-sheet&begin=2026-99-99`);
  await assert.doesNotReject(() => page.getByRole("alert").getByText("Use YYYY-MM-DD.").waitFor());
  assert.equal(await page.getByLabel("Begin date").getAttribute("aria-invalid"), "true");
});

test("every admitted report choice renders data or its specific empty state over the HTTP gateway", async (t) => {
  const page = await admittedPage(t, { javaScriptEnabled: false });
  for (const report of reportNames) {
    await page.goto(`${origin}/books/view?report=${encodeURIComponent(report)}`);
    const heading = report === "reconcile" ? "Reconciliation status" : report === "register" ? "Register" : report === "accounts" ? "Accounts" : report;
    const reportTile = page.locator(".tufte-tile").filter({ has: page.getByRole("heading", { name: heading, exact: true }) }).first();
    const dataRows = await reportTile.locator("tbody tr").count();
    const empty = await reportTile.getByText(/No (accounts|postings|entries|reconciliation rows|values) matched this reading\.|No values reported\.|Unavailable from the admitted ledger reading\./).count();
    assert.ok(dataRows > 0 || empty > 0, `${report} must show data or a meaningful empty state`);
  }
});
