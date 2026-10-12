
/**
 * integrations/federation/indieauth/client — the live HTTP client for
 * `rel=me` mutual-link
 * verification.
 *
 * Fetches the profile (`me`) and client (`client_id`) pages, then admits
 * the result through `admission/indieauth`'s `verifyRelMeBodies`. This
 * module owns only the two network calls; the mutual-link law lives in
 * admission.
 *
 * @packageDocumentation
 */
import {
  verifyRelMeBodies,
  type RelMeVerdict,
} from "./validation.mts";

export interface IndieAuthClientOptions {
  readonly fetch?: typeof fetch;
}

function liveFetch(label: string, provided: typeof fetch | undefined): typeof fetch {
  if (provided !== undefined) return provided;
  if (typeof globalThis.fetch !== "function") throw new TypeError(`${label}: no fetch implementation available (pass opts.fetch)`);
  return globalThis.fetch;
}

async function fetchPage(doFetch: typeof fetch, url: string): Promise<{ html: string; linkHeader: string | null }> {
  const res = await doFetch(url, { method: "GET", redirect: "follow", headers: { accept: "text/html, */*;q=0.8" } });
  if (res.status < 200 || res.status >= 300) throw new TypeError(`rel=me fetch returned HTTP ${res.status}`);
  return { html: await res.text(), linkHeader: res.headers.get("link") };
}

/** Fetch `me` and `clientId` and admit their mutual `rel=me` verdict. */
export async function verifyRelMe(me: string, clientId: string, opts: IndieAuthClientOptions = {}): Promise<RelMeVerdict> {
  const doFetch = liveFetch("verifyRelMe", opts.fetch);
  try {
    const [profile, client] = await Promise.all([fetchPage(doFetch, me), fetchPage(doFetch, clientId)]);
    return verifyRelMeBodies({
      me,
      clientId,
      profileHtml: profile.html,
      profileLinkHeader: profile.linkHeader,
      clientHtml: client.html,
      clientLinkHeader: client.linkHeader,
    });
  } catch (error) {
    return { verified: false, me, clientId, reason: error instanceof Error ? error.message : String(error) };
  }
}
