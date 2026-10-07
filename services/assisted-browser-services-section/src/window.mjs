import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";

/**
 * The browser windows the house drives: a visible one the person at the node
 * watches and helps in, and a headless one for work that needs nobody.
 *
 * Under WSL the visible window is the person's own Windows Edge. WSLg
 * registers a Linux Chromium window with Windows but may never show it (seen
 * 2026-09-30, even with software rendering and a fixed position), while a
 * Windows window always shows. Edge runs in a profile of its own, separate
 * from the person's everyday one, at %LOCALAPPDATA%\561-group\assisted-browser,
 * and is driven over its DevTools port, which WSL reaches on 127.0.0.1. Each
 * window is a fresh browser context loaded from the account's saved session,
 * so a session is kept the same way whichever browser showed it.
 *
 * `capabilities.playwright` replaces the Playwright module,
 * `capabilities.launchChromium` the Chromium launch, and `capabilities.window`
 * ("edge" or "chromium") the choice of visible browser.
 */
export const WINDOW_VIEWPORT = Object.freeze({ width: 1400, height: 1000 });
const WINDOWS_EDGE = "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const EDGE_DEBUG_PORT = 9333;
const EDGE_PROFILE = "561-group\\assisted-browser";

const playwrightModule = async (capabilities) => capabilities.playwright ?? await import("playwright");
const exists = (path) => stat(path).then(() => true, () => false);
const sessionOptions = async (storageState) => (storageState && await exists(storageState) ? { storageState } : {});

/** Wait for `promise` at most `ms`, never throwing: for teardown that must finish whatever the browser does. */
async function bounded(promise, ms = 10_000) {
  let timer;
  await Promise.race([Promise.resolve(promise).catch(() => {}), new Promise((resolve) => { timer = setTimeout(resolve, ms); })]);
  clearTimeout(timer);
}

export const underWsl = (env = process.env) => Boolean(env.WSL_DISTRO_NAME) && existsSync(WINDOWS_EDGE);

async function launchChromium(options, capabilities) {
  if (capabilities.launchChromium) return capabilities.launchChromium(options);
  const { chromium } = await playwrightModule(capabilities);
  return chromium.launch(options);
}

/**
 * The Windows %LOCALAPPDATA% that holds the Edge profile. It is read from the Windows drive when the
 * profile is already there: every call into Windows crosses WSL interop, which under load fails
 * outright (`UtilAcceptVsock: accept4 failed 110`, seen 2026-10-02), so it is crossed only when the
 * drive cannot say.
 */
async function windowsLocalAppData(execFileSync) {
  const { readdir } = await import("node:fs/promises");
  for (const user of await readdir("/mnt/c/Users").catch(() => [])) {
    if (existsSync(`/mnt/c/Users/${user}/AppData/Local/${EDGE_PROFILE.replace("\\", "/")}`)) return `C:\\Users\\${user}\\AppData\\Local`;
  }
  return execFileSync("cmd.exe", ["/c", "echo %LOCALAPPDATA%"], { cwd: "/mnt/c", encoding: "utf8", timeout: 20_000 }).trim();
}

/**
 * Edge on its DevTools port: the one already answering, or one started now. Starting Edge crosses
 * WSL interop, whose handshake can time out and leave nothing started, so a start whose port stays
 * silent is tried again before giving up.
 */
async function edgeBrowser(capabilities) {
  const endpoint = `http://127.0.0.1:${EDGE_DEBUG_PORT}`;
  const answers = async () => { try { return (await fetch(`${endpoint}/json/version`)).ok; } catch { return false; } };
  let started = false;
  if (!(await answers())) {
    const { execFileSync, spawn } = await import("node:child_process");
    const localAppData = await windowsLocalAppData(execFileSync);
    const start = () => spawn(WINDOWS_EDGE, [
      `--remote-debugging-port=${EDGE_DEBUG_PORT}`, `--user-data-dir=${localAppData}\\${EDGE_PROFILE}`,
      "--no-first-run", "--no-default-browser-check", "--new-window", "about:blank",
    ], { cwd: "/mnt/c", detached: true, stdio: "ignore" }).on("error", () => {}).unref();
    started = true;
    start();
    for (let attempt = 1; !(await answers()); attempt += 1) {
      if (attempt >= 120) throw new Error(`Edge's DevTools port did not answer at ${endpoint} after three starts (WSL interop to Windows may be failing: try cmd.exe /c ver)`);
      if (attempt % 40 === 0) start();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  const { chromium } = await playwrightModule(capabilities);
  return { browser: await chromium.connectOverCDP(endpoint), started };
}

/**
 * A visible window, loaded with the saved session when there is one. Returns
 * `{ context, page, close }`; `close` closes what this call opened, and Edge
 * itself only when this call started it.
 */
export async function openWindow({ storageState, viewport = WINDOW_VIEWPORT } = {}, capabilities = {}) {
  const session = await sessionOptions(storageState);
  if ((capabilities.window ?? (underWsl() ? "edge" : "chromium")) === "edge") {
    const { browser, started } = await edgeBrowser(capabilities);
    const context = await browser.newContext({ ...session, viewport: null });
    const page = await context.newPage();
    // Edge's own first window is empty; the person works in this one.
    if (started) for (const blank of browser.contexts()[0]?.pages() ?? []) await blank.close().catch(() => {});
    // Each step is bounded: once the person closes the window or Edge itself,
    // the DevTools connection can drop without settling what was asked of it.
    const close = async () => {
      await bounded(context.close());
      if (started && browser.isConnected()) await bounded(browser.newBrowserCDPSession().then((cdp) => cdp.send("Browser.close")));
      await bounded(browser.close());
    };
    return { context, page, close };
  }
  const browser = await launchChromium({ headless: false }, capabilities);
  const context = await browser.newContext({ ...session, viewport });
  return { context, page: await context.newPage(), close: () => browser.close() };
}

/** A headless browser context, loaded with the saved session when there is one. Returns `{ context, page, close }`. */
export async function openHeadless({ storageState, viewport = WINDOW_VIEWPORT, ...contextOptions } = {}, capabilities = {}) {
  const browser = await launchChromium({ headless: true }, capabilities);
  const context = await browser.newContext({ ...await sessionOptions(storageState), viewport, ...contextOptions });
  return { context, page: await context.newPage(), close: () => browser.close() };
}
