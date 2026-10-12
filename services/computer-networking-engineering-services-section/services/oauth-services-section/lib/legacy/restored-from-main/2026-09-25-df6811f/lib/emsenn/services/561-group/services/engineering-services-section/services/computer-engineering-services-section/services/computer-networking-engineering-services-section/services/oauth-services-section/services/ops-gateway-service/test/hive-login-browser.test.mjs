import assert from "node:assert/strict";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { Readable } from "node:stream";
import test from "node:test";
import { createBrowserSessionAuth } from "../src/browser-session.mjs";
import { hiveLoginApp } from "../src/hive-login.mjs";

const PLAYWRIGHT_MODULE = process.env.OPS_HIVE_LOGIN_PLAYWRIGHT_MODULE
  ?? "/mnt/c/Users/emsen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const { chromium } = await import(PLAYWRIGHT_MODULE);

function pageBrowser(html, fetchImpl) {
  const handlers = {};
  const timers = [];
  const status = { textContent: "" };
  const button = { disabled: true };
  const form = {
    style: {}, querySelector: () => button,
    addEventListener: (name, handler) => { handlers[name] = handler; },
  };
  const elements = {
    "hive-login-status": status, "hive-login-form": form,
    "hive-login-account": { value: "operator" },
  };
  const window = { addEventListener: (name, handler) => { handlers[name] = handler; } };
  runInNewContext(/<script>([\s\S]*?)<\/script>/.exec(html)[1], {
    window, document: { readyState: "loading", getElementById: (id) => elements[id] },
    fetch: fetchImpl, AbortController,
    setTimeout: (handler, delay) => { const timer = { handler, delay }; timers.push(timer); return timer; },
    clearTimeout: (timer) => { const index = timers.indexOf(timer); if (index >= 0) timers.splice(index, 1); },
  });
  return { window, handlers, status, button, timers };
}

async function fixture(t, { taskStatus = 200, verify } = {}) {
  const stateDir = mkdtempSync(join(tmpdir(), "ops-hive-browser-"));
  t.after(() => rmSync(stateDir, { recursive: true, force: true }));
  const browser = createBrowserSessionAuth({
    publicBaseUrl: "https://ops.561.group",
    oauth: { validateToken: () => null, revoke() {} },
    registry: { isEmailAdmitted: () => false, isHiveAdmitted: (account) => account === "operator" },
  });
  const verifiedInputs = [];
  let taskReads = 0;
  const app = hiveLoginApp({
    stateDir, browser, registry: { isHiveAdmitted: (account) => account === "operator" },
    verify: verify ?? (async (input) => {
      verifiedInputs.push(input);
      return { verified: true, account: input.account, role: "posting", publicKey: "fixture-key" };
    }),
  });
  const resources = [
    ...app.resources,
    { id: "tasks", match: "/network", methods: ["GET"], handler: browser.guardHandler(() => {
      taskReads += 1;
      return { status: taskStatus, type: "text/html", body: "<h1>Task page</h1>" };
    }, () => ({ status: 401, response: { status: 401 } })) },
  ];
  let cookie = "";
  const fetches = [];
  async function browserFetch(path, options = {}) {
    fetches.push(path);
    const req = Readable.from(options.body ? [Buffer.from(options.body)] : []);
    req.headers = { ...options.headers, ...(cookie ? { cookie } : {}) };
    const resource = resources.find((candidate) => candidate.match === path);
    const representation = await resource.handler({ req, url: new URL(path, "https://ops.561.group") });
    const response = new Response(representation.body, {
      status: representation.status ?? 200, headers: { "content-type": representation.type, ...representation.headers },
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";", 1)[0];
    if (response.status === 303) return browserFetch(response.headers.get("location"));
    return response;
  }
  const page = await (await browserFetch("/login/hive")).text();
  return { page, browserFetch, browser, verifiedInputs, fetches,
    cookie: () => cookie, taskReads: () => taskReads };
}

test("approved Keychain signature establishes a browser session and navigates without fetching the unavailable task page", async (t) => {
  const f = await fixture(t, { taskStatus: 503 });
  let finish;
  const completed = new Promise((resolve) => { finish = resolve; });
  const ui = pageBrowser(f.page, async (...args) => {
    const response = await f.browserFetch(...args);
    queueMicrotask(() => setImmediate(finish));
    return response;
  });
  ui.window.hive_keychain = { requestSignBuffer(account, message, role, callback) {
    assert.equal(role, "Posting");
    callback({ success: true, result: "fixture-signature", publicKey: "fixture-key" });
  } };
  ui.handlers.load?.();
  ui.handlers.submit({ preventDefault() {} });
  await completed;
  assert.equal(f.verifiedInputs.length, 1);
  assert.equal(f.browser.validSession({ cookie: f.cookie() }).claims.account, "operator");
  assert.equal(ui.window.location, "/network");
  assert.equal(f.taskReads(), 0, "login success is independent of the task provider");
});

test("after signing the page shows verification progress while the callback is pending", async (t) => {
  const f = await fixture(t);
  const ui = pageBrowser(f.page, () => new Promise(() => {}));
  ui.window.hive_keychain = { requestSignBuffer(_account, _message, _role, callback) {
    callback({ success: true, result: "fixture-signature" });
  } };
  ui.handlers.load?.();
  ui.handlers.submit({ preventDefault() {} });
  assert.match(ui.status.textContent, /verifying/i);
  assert.equal(ui.button.disabled, true);
});

test("verification refusal is displayed and does not create a session or navigate", async (t) => {
  const f = await fixture(t, { verify: async () => ({ verified: false, reason: "public key is not authorized for this account" }) });
  let finish;
  const completed = new Promise((resolve) => { finish = resolve; });
  const ui = pageBrowser(f.page, async (...args) => {
    const response = await f.browserFetch(...args);
    setImmediate(finish);
    return response;
  });
  ui.window.hive_keychain = { requestSignBuffer(_account, _message, _role, callback) {
    callback({ success: true, result: "wrong-signature" });
  } };
  ui.handlers.load?.();
  ui.handlers.submit({ preventDefault() {} });
  await completed;
  assert.match(ui.status.textContent, /public key is not authorized/);
  assert.equal(f.browser.validSession({ cookie: f.cookie() }), null);
  assert.equal(ui.window.location, undefined);
});

test("the browser page submits one callback, then displays an authority refusal", async (t) => {
  const f = await fixture(t, { verify: async () => ({ verified: false, reason: "public key is not authorized for this account" }) });
  const browser = await chromium.launch({
    executablePath: "/home/emsenn/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
    headless: true,
  });
  t.after(() => browser.close());
  const page = await browser.newPage();
  let callbacks = 0;
  await page.route("https://ops.561.group/**", async (route) => {
    const request = route.request();
    if (request.url() === "https://ops.561.group/login/hive" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "text/html", body: f.page });
      return;
    }
    if (request.url() === "https://ops.561.group/login/hive/callback" && request.method() === "POST") {
      callbacks += 1;
      const response = await f.browserFetch("/login/hive/callback", {
        method: "POST", headers: request.headers(), body: request.postData(),
      });
      await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
      return;
    }
    await route.abort();
  });
  await page.addInitScript(() => {
    window.hive_keychain = { requestSignBuffer(_account, _message, _role, callback) {
      callback({ success: true, result: "fixture-signature", publicKey: "fixture-key" });
    } };
  });
  await page.goto("https://ops.561.group/login/hive");
  await page.locator("#hive-login-account").fill("operator");
  await page.locator("#hive-login-form").evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
  await page.getByRole("status").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.getElementById("hive-login-status")?.textContent?.includes("public key is not authorized"));
  assert.equal(callbacks, 1);
  assert.equal(f.browser.validSession({ cookie: f.cookie() }), null);
  assert.equal(page.url(), "https://ops.561.group/login/hive");
});

test("the browser page aborts a delayed verifier callback and offers retry", async (t) => {
  const f = await fixture(t);
  const browser = await chromium.launch({
    executablePath: "/home/emsenn/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
    headless: true,
  });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.clock.install({ time: new Date() });
  await page.route("https://ops.561.group/**", async (route) => {
    const request = route.request();
    if (request.url() === "https://ops.561.group/login/hive" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "text/html", body: f.page });
      return;
    }
    if (request.url() === "https://ops.561.group/login/hive/callback") return;
    await route.abort();
  });
  await page.addInitScript(() => {
    window.hive_keychain = { requestSignBuffer(_account, _message, _role, callback) {
      callback({ success: true, result: "fixture-signature", publicKey: "fixture-key" });
    } };
  });
  await page.goto("https://ops.561.group/login/hive");
  await page.locator("#hive-login-account").fill("operator");
  await page.locator("#hive-login-form").evaluate((form) => form.requestSubmit());
  await page.clock.fastForward(25_000);
  await page.waitForFunction(() => document.getElementById("hive-login-status")?.textContent?.includes("timed out"));
  await page.getByRole("link", { name: "Start a new sign-in attempt" }).waitFor({ state: "visible" });
  assert.equal(f.browser.validSession({ cookie: f.cookie() }), null);
});
