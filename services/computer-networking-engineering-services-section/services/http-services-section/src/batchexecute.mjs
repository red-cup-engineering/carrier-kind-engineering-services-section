import { applySetCookies, jarCookieHeader } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cookie";
import { decodeBatchExecute, encodeBatchExecute, wizField } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/batchexecute";

/** Hosts a Google application's sign-in, pages and media redirect among. */
export const GOOGLE_HOST = /(^|\.)(google\.com|googleusercontent\.com|googlevideo\.com|usercontent\.google\.com)$/u;

/**
 * A signed-in session with one of Google's batchexecute web applications, in plain Node.
 *
 * The credential is a browser storage state (Playwright's: `{cookies}`) holding the Google
 * account's cookies. Signing in loads `home` with them, following Google's sign-in redirects
 * inside Google's hosts, and reads the page's CSRF and session tokens. Those last hours, not
 * days, so the session signs in again — re-reading the storage state, which whoever keeps it may
 * have refreshed — every `refreshMs` and once whenever a call is refused.
 *
 * `frontend` names the application's Boq frontend, the path its RPCs are posted under
 * (`/_/<frontend>/data/batchexecute`). A sign-in that yields no tokens throws code
 * BATCHEXECUTE_AUTH_EXPIRED, with `label` saying whose; `request` is the same jar-carrying fetch,
 * for an application's media and other pages; `field(name)` reads one of the signed-in page's
 * WIZ_global_data fields (an application's site keys and flags live there).
 */
export async function openBatchExecuteSession({ home, frontend, label = new URL(home).hostname, readState, fetch = globalThis.fetch, language = "en", refreshMs = 30 * 60_000, now = () => Date.now(), trustedHost = GOOGLE_HOST }) {
  let jar, origin, csrf, session, html = "", signedAt = -Infinity;
  async function request(target, init = {}) {
    let location = target;
    for (let hop = 0; hop < 10; hop += 1) {
      const response = await fetch(location, { ...init, headers: { ...init.headers, cookie: jarCookieHeader(jar, location) }, redirect: "manual" });
      jar = applySetCookies(jar, response.headers.getSetCookie?.() ?? [], location);
      if (response.status < 300 || response.status >= 400 || !response.headers.get("location")) return Object.assign(response, { finalUrl: location });
      await response.body?.cancel();
      location = new URL(response.headers.get("location"), location).href;
      if (new URL(location).protocol !== "https:" || !trustedHost.test(new URL(location).hostname)) throw new Error(`${label} redirected outside Google: ${new URL(location).hostname}`);
    }
    throw new Error(`${label} redirected too many times`);
  }
  async function signIn() {
    jar = readState().cookies.map((cookie) => ({ ...cookie, hostOnly: !cookie.domain.startsWith(".") }));
    const page = await request(home);
    html = await page.text();
    origin = new URL(page.finalUrl).origin;
    csrf = wizField(html, "SNlM0e");
    session = wizField(html, "FdrFJe");
    if (!csrf || !session) throw Object.assign(new Error(`${label} sign-in has expired`), { code: "BATCHEXECUTE_AUTH_EXPIRED" });
    signedAt = now();
  }
  await signIn();

  async function call(rpcId, params, sourcePath) {
    const query = new URLSearchParams({ rpcids: rpcId, "source-path": sourcePath, "f.sid": session, hl: language, rt: "c" });
    const response = await request(`${origin}/_/${frontend}/data/batchexecute?${query}`, { method: "POST", body: encodeBatchExecute(rpcId, params, csrf), headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });
    if (!response.ok) throw Object.assign(new Error(`${label} ${rpcId} answered HTTP ${response.status}`), { code: "BATCHEXECUTE_HTTP_ERROR", status: response.status });
    return decodeBatchExecute(await response.text(), rpcId);
  }
  /**
   * Reads refresh expired sign-in state and may retry once after refusal.
   * A mutation is submitted once. Even a refused frame can consume a single-use
   * action token; replaying the same parameters is not a fresh authorized action.
   * The caller owns reconciliation and any later explicitly admitted attempt.
   */
  async function rpc(rpcId, params, sourcePath = "/", { mutation = false } = {}) {
    if (now() - signedAt > refreshMs) await signIn();
    try { return await call(rpcId, params, sourcePath); } catch (error) {
      if (error.code !== "BATCHEXECUTE_HTTP_ERROR" && error.code !== "BATCHEXECUTE_RPC_REFUSED") throw error;
      if (mutation) throw error;
      await signIn();
      return call(rpcId, params, sourcePath);
    }
  }
  return {
    get origin() { return origin; },
    get signedAt() { return signedAt; },
    field: (name) => wizField(html, name),
    signIn,
    request,
    rpc,
  };
}
