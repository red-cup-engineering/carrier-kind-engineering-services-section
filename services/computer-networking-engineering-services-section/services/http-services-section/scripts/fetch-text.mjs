// fetch-text — fetch a URL's body as text, retrying a 429 or a 5xx with
// exponential backoff: the polling client that feed intakes and other
// scheduled readers of someone else's server share.

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Fetch `url` and return its body as text.
 *
 * @param {string|URL} url
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl] - the fetch to call (the global one by default).
 * @param {number} [options.retries] - caller-selected non-negative safe integer retry count (4 by default).
 * @param {(attempt: number) => Promise<void>} [options.backoff] - waits before a retry (1s doubling, at most 30s, by default).
 * @param {RequestInit} [options.init] - forwarded to fetch (headers such as a user agent).
 * @returns {Promise<string>}
 */
export async function fetchText(url, { fetchImpl = fetch, retries = 4, backoff, init } = {}) {
  // The caller/host selects the work budget. A source-level six-retry ceiling
  // is not a networking law; malformed caller selection must not silently reset.
  if (!Number.isSafeInteger(retries) || retries < 0)
    throw new TypeError("HTTP text fetch retries must be a non-negative safe integer");
  const wait = backoff ?? ((attempt) => sleep(Math.min(1000 * 2 ** attempt, 30_000)));
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetchImpl(url, init);
    if (response.ok) return response.text();
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      await wait(attempt);
      continue;
    }
    throw new Error(`fetch failed: ${response.status} for ${url}`);
  }
}
