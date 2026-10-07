import {
  SIGN_IN_TIMEOUT_MS, atHome, awaitSignIn, captureSignIn, isSessionValid, sessionPath, signInCommand, webAccount, writePrivateStorageState,
} from "@red-cup-engineering/assisted-browser-services-section/accounts";

/** KDP's web account, under the names the KDP loop has always used. */
export { writePrivateStorageState };
export const DEFAULT_KDP_MARKETPLACE = webAccount("kdp").start;
export const DEFAULT_KDP_STORAGE_STATE_PATH = sessionPath("kdp");
export const KDP_LOGIN_COMMAND = signInCommand("kdp");
export const KDP_LOGIN_TIMEOUT_MS = SIGN_IN_TIMEOUT_MS;
export const KDP_SIGN_IN = webAccount("kdp").signIn.paths;

/** Title setup always asks for a step-up sign-in; wait for the person, then return to the page asked for. */
export const awaitKdpSignIn = (page, url, options) => awaitSignIn("kdp", page, url, options);
export const isKdpDashboardUrl = (value) => atHome("kdp", value);

function kdpOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !webAccount("kdp").portal.test(url.hostname)) throw new TypeError("KDP marketplace must be an HTTPS kdp.amazon.com origin");
  return url.origin;
}

/** Capture a human-completed KDP login without ever receiving account credentials. */
export async function captureKdpLogin({ marketplace = DEFAULT_KDP_MARKETPLACE, ...options } = {}, capabilities = {}) {
  if (Object.hasOwn(options, "password")) throw new TypeError("KDP login capture does not accept a password");
  const { account, ...result } = await captureSignIn("kdp", { ...options, start: kdpOrigin(marketplace) }, capabilities);
  return Object.freeze(result);
}

/** Validate a saved KDP browser session without exposing any stored cookie values. */
export const isKdpSessionValid = ({ storageState = DEFAULT_KDP_STORAGE_STATE_PATH, marketplace = DEFAULT_KDP_MARKETPLACE } = {}, capabilities = {}) =>
  isSessionValid("kdp", { storageState, home: `${kdpOrigin(marketplace)}/bookshelf` }, capabilities);
