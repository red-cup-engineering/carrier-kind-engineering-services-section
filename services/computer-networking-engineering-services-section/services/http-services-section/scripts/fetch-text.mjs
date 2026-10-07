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
 * @param {number} [options.retries] - how many times a 429 or 5xx is retried (4 by default, at most 6).
 * @param {(attempt: number) => Promise<void>} [options.backoff] - waits before a retry (1s doubling, at most 30s, by default).
 * @param {RequestInit} [options.init] - forwarded to fetch (headers such as a user agent).
 * @returns {Promise<string>}
 */
export async function fetchText(url, { fetchImpl = fetch, retries = 4, backoff, init } = {}) {
  const bounded = Number.isInteger(retries) && retries >= 0 ? Math.min(retries, 6) : 4;
  const wait = backoff ?? ((attempt) => sleep(Math.min(1000 * 2 ** attempt, 30_000)));
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetchImpl(url, init);
    if (response.ok) return response.text();
    if ((response.status === 429 || response.status >= 500) && attempt < bounded) {
      await wait(attempt);
      continue;
    }
    throw new Error(`fetch failed: ${response.status} for ${url}`);
  }
}
