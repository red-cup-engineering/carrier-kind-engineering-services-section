/**
 * A refreshing client-credentials token cache for a confidential machine client (RFC 6749 §4.4,
 * client_secret_post), optionally for one resource (RFC 8707): a harness or script keeps a
 * bearer token current without asking for one on every call.
 *
 * @param {{ tokenUrl: string | URL, clientId: string, clientSecret: string, resource?: string, fetchImpl?: typeof fetch, now?: () => number, refreshMarginMs?: number }} params
 * @returns {{ getToken: (options?: { forceRefresh?: boolean }) => Promise<string>, invalidate: () => void }}
 */
export function createClientCredentialsClient({
  tokenUrl,
  clientId,
  clientSecret,
  resource,
  fetchImpl = fetch,
  now = Date.now,
  refreshMarginMs = 30_000,
}) {
  if (!tokenUrl) throw new TypeError("tokenUrl is required");
  if (!clientId || !clientSecret) throw new TypeError("clientId and clientSecret are required");
  let cached = null;

  async function requestToken() {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      ...(resource === undefined ? {} : { resource }),
    });
    const response = await fetchImpl(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!response.ok) {
      const description = await response.text().catch(() => "");
      throw new Error(`client_credentials token request failed: ${response.status} ${description}`);
    }
    const payload = await response.json();
    if (typeof payload?.access_token !== "string") throw new Error("token response missing access_token");
    const expiresInMs = Number.isFinite(payload.expires_in) ? payload.expires_in * 1000 : 3_600_000;
    cached = { token: payload.access_token, expiresAt: now() + expiresInMs };
    return cached.token;
  }

  return Object.freeze({
    async getToken({ forceRefresh = false } = {}) {
      if (!forceRefresh && cached && cached.expiresAt - refreshMarginMs > now()) return cached.token;
      return requestToken();
    },
    invalidate() {
      cached = null;
    },
  });
}
