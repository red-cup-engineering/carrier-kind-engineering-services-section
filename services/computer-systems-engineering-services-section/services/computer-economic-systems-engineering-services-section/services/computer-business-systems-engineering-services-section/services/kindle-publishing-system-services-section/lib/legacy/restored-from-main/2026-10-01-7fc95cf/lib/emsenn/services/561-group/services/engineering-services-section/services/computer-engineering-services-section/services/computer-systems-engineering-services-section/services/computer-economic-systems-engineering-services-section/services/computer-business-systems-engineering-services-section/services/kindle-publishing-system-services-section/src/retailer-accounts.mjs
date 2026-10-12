import { chmod, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { guidePerson } from "./browser-assist.mjs";

/**
 * The house's accounts at book retailers, and the browser sessions that stand
 * for them. The founder signs in once, in a visible browser. The session is
 * then kept as Playwright storage state, private to the user (0600) and
 * outside the repository. No password or cookie value ever passes through
 * code or output.
 *
 * `mapped` names the date a read-only discovery confirmed the portal's pages.
 * A portal that is not yet mapped has its sign-in hosts and paths from the
 * retailers' help pages (2026-09-29). Its sign-in capture ends when the
 * person says so, not on a URL, until a discovery walk records a real home
 * page.
 */
const account = (value) => Object.freeze({ ...value, channels: Object.freeze(value.channels), signIn: Object.freeze(value.signIn) });
export const RETAILER_ACCOUNTS = Object.freeze({
  kdp: account({
    name: "Amazon KDP", channels: ["kdp", "kdp-paperback"], mapped: "2026-09-29",
    portal: /(^|\.)kdp\.amazon\.com$/u, start: "https://kdp.amazon.com", home: "https://kdp.amazon.com/bookshelf",
    homePath: /^\/(?:[a-z]{2}_[A-Z]{2}\/)?(?:bookshelf|dashboard)(?:\/|$)/u,
    signIn: { paths: /\/ap\/(?:signin|challenge|mfa|cvf)|\/signin/iu },
  }),
  "apple-books": account({
    name: "Apple Books for Authors", channels: ["apple-books"], mapped: null,
    portal: /^authors\.apple\.com$/u, start: "https://authors.apple.com/", home: "https://authors.apple.com/",
    signIn: { hosts: /^(?:idmsa|appleid)\.apple\.com$/u, paths: /\/(?:sign-?in|login)(?:\/|$)/iu },
  }),
  "google-play-books": account({
    name: "Google Play Books Partner Center", channels: ["google-play-books"], mapped: null,
    portal: /^play\.google\.com$/u, portalPath: /^\/books\/publish(?:\/|$)/u, start: "https://play.google.com/books/publish/", home: "https://play.google.com/books/publish/",
    signIn: { hosts: /^accounts\.google\.com$/u },
  }),
  "barnes-noble-press": account({
    name: "Barnes & Noble Press", channels: ["barnes-noble-press"], mapped: null,
    portal: /^press\.barnesandnoble\.com$/u, start: "https://press.barnesandnoble.com/", home: "https://press.barnesandnoble.com/",
    signIn: { paths: /\/(?:sign-?in|login)(?:\/|$)/iu },
  }),
});

export const RETAILER_LOGIN_TIMEOUT_MS = 15 * 60 * 1000;
/** Page text that says a person, not code, must act: a challenge, a sign-in, an expired session. */
export const HUMAN_PATTERNS = /captcha|verify (?:it'?s|your) identity|two[- ]factor|2fa|one[- ]time password|sign in to your account|session expired/iu;

export function retailerAccount(retailer) {
  if (!Object.hasOwn(RETAILER_ACCOUNTS, retailer)) throw new TypeError(`no retailer account ${retailer}; known: ${Object.keys(RETAILER_ACCOUNTS).join(", ")}`);
  return RETAILER_ACCOUNTS[retailer];
}
/** The account a retail channel submits through: KDP's ebook and paperback share one. */
export function retailerForChannel(channel) {
  const found = Object.entries(RETAILER_ACCOUNTS).find(([, value]) => value.channels.includes(channel));
  if (!found) throw new TypeError(`no retailer account submits the ${channel} channel`);
  return found[0];
}
export const storageStatePathFor = (retailer) => join(homedir(), ".config", "561-group", `${retailer}-storage-state.json`);
export const retailerLoginCommand = (retailer) => `npm run retailer-login -- ${retailer}`;

const parse = (value) => { try { return new URL(String(value)); } catch { return null; } };
export function onPortal(retailer, value) {
  const url = parse(value), { portal, portalPath } = retailerAccount(retailer);
  return Boolean(url) && url.protocol === "https:" && portal.test(url.hostname) && (!portalPath || portalPath.test(url.pathname));
}
export function signingIn(retailer, value) {
  const url = parse(value), { signIn } = retailerAccount(retailer);
  return Boolean(url) && Boolean(signIn.hosts?.test(url.hostname) || signIn.paths?.test(url.pathname));
}
/** A page only a signed-in account reaches: the mapped home page, or, before mapping, any portal page that is not a sign-in. */
export function atHome(retailer, value) {
  const { homePath } = retailerAccount(retailer);
  return onPortal(retailer, value) && !signingIn(retailer, value) && (!homePath || homePath.test(new URL(String(value)).pathname));
}
function portalUrl(retailer, value, what) {
  if (!onPortal(retailer, value)) throw new TypeError(`${retailerAccount(retailer).name} ${what} must be an HTTPS page of its portal`);
  return String(value);
}

/**
 * When the portal sends the page to sign-in or a challenge, wait while the
 * person at the visible browser completes it, then return to the page that
 * was asked for.
 */
export async function awaitSignIn(retailer, page, url, { humanWaitMs = RETAILER_LOGIN_TIMEOUT_MS, notify = (message) => process.stderr.write(`${message}\n`) } = {}) {
  if (!signingIn(retailer, page.url())) return false;
  notify(`Sign in to ${retailerAccount(retailer).name} in the open browser window; waiting up to ${Math.round(humanWaitMs / 60_000)} minutes.`);
  await page.waitForURL((current) => onPortal(retailer, current) && !signingIn(retailer, current), { timeout: humanWaitMs });
  if (!page.url().startsWith(url)) await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  return true;
}

async function launchChromium(options) {
  const { chromium } = await import("playwright");
  return chromium.launch(options);
}

export async function writePrivateStorageState(path, value) {
  const target = resolve(path);
  const directory = dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    await chmod(temporary, 0o600);
    await rename(temporary, target);
    await chmod(target, 0o600);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
  return target;
}

/** Capture a sign-in the person completes, without ever receiving account credentials. */
export async function captureRetailerLogin(retailer, options = {}, capabilities = {}) {
  if (Object.hasOwn(options, "password")) throw new TypeError("login capture does not accept a password");
  const account = retailerAccount(retailer);
  const { storageStatePath = storageStatePathFor(retailer), start = account.start, timeoutMs = RETAILER_LOGIN_TIMEOUT_MS } = options;
  const browser = await (capabilities.launchChromium ?? launchChromium)({ headless: false });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(portalUrl(retailer, start, "start page"), { waitUntil: "domcontentloaded" });
    if (account.homePath) await page.waitForURL((url) => atHome(retailer, String(url)), { timeout: timeoutMs });
    else await guidePerson(context, `Sign in to ${account.name}. When its dashboard shows, click Done.`, [{ label: "Done", final: true }], { timeout: timeoutMs, notify: capabilities.notify });
    const state = await context.storageState();
    const path = await writePrivateStorageState(storageStatePath, state);
    return Object.freeze({ retailer, path, cookieCount: Array.isArray(state.cookies) ? state.cookies.length : 0 });
  } finally {
    await browser.close();
  }
}

/** Check a saved session headlessly, without exposing any stored cookie value. */
export async function isRetailerSessionValid(retailer, { storageState = storageStatePathFor(retailer), home = retailerAccount(retailer).home } = {}, capabilities = {}) {
  try {
    const mode = (await stat(storageState)).mode & 0o777;
    if ((mode & 0o077) !== 0) return false;
    JSON.parse(await readFile(storageState, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return false;
    throw error;
  }
  const browser = await (capabilities.launchChromium ?? launchChromium)({ headless: true });
  try {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await page.goto(portalUrl(retailer, home, "home page"), { waitUntil: "domcontentloaded" });
    const body = await page.locator("body").innerText();
    return atHome(retailer, page.url()) && !HUMAN_PATTERNS.test(body);
  } finally {
    await browser.close();
  }
}

/** The retailer-login command: one argument, the retailer; the person signs in in the window it opens. */
export async function runRetailerLoginCli({ args = [], stdout = process.stdout, ...options } = {}, capabilities = {}) {
  if (args.length !== 1 || args[0].startsWith("-")) throw new TypeError(`usage: retailer-login <${Object.keys(RETAILER_ACCOUNTS).join("|")}>; complete sign-in in the visible browser`);
  const result = await captureRetailerLogin(args[0], options, capabilities);
  stdout.write(`${result.path}\n${result.cookieCount}\n`);
  return result;
}
