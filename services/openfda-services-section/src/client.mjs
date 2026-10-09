/**
 * openFDA: queries over the FDA's published datasets. One page at a time with the API's own next
 * link, every page by following it, and count queries. An empty match is an empty page, since
 * openFDA answers "no matches" with HTTP 404.
 * @packageDocumentation
 */

const BASE = "https://api.fda.gov";

/** Device registration and listing: one record per device listing, with its establishment's registration and US agent. */
export const DEVICE_REGISTRATION_LISTING = "device/registrationlisting";

function urlOf(endpoint, params, apiKey) {
  const url = new URL(`${BASE}/${endpoint}.json`);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  if (apiKey) url.searchParams.set("api_key", apiKey);
  return url.href;
}

const nextLink = (header) => header?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;

async function getPage(url, { fetch: doFetch = fetch } = {}) {
  const res = await doFetch(url, { headers: { accept: "application/json" } });
  if (res.status === 404) return { meta: null, results: [], next: null };
  if (!res.ok) throw new Error(`openFDA ${url} answered HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  const body = await res.json();
  return { meta: body.meta ?? null, results: body.results ?? [], next: nextLink(res.headers.get("link")) };
}

/**
 * One page of an endpoint's results.
 * @param {string} endpoint e.g. `device/registrationlisting`
 * @param {{search?: string, sort?: string, limit?: number, skip?: number}} params openFDA query parameters
 */
export function openfdaQuery(endpoint, { search, sort, limit = 100, skip } = {}, { apiKey = process.env.OPENFDA_API_KEY, fetch } = {}) {
  return getPage(urlOf(endpoint, { search, sort, limit, skip }, apiKey), { fetch });
}

/** Every result of a search across pages, following openFDA's next links, up to `limit` in all. */
export async function* openfdaAll(endpoint, { search, sort } = {}, { limit = Infinity, pageSize = 1000, apiKey = process.env.OPENFDA_API_KEY, fetch } = {}) {
  let url = urlOf(endpoint, { search, sort, limit: pageSize }, apiKey);
  let yielded = 0;
  while (url) {
    const page = await getPage(url, { fetch });
    for (const result of page.results) {
      yield result;
      if (++yielded >= limit) return;
    }
    url = page.results.length > 0 ? page.next : null;
  }
}

/** A count query: the terms of `count` (a field, `.exact` for whole values) and how many results carry each. */
export async function openfdaCount(endpoint, { search, count, limit = 1000 } = {}, { apiKey = process.env.OPENFDA_API_KEY, fetch } = {}) {
  const page = await getPage(urlOf(endpoint, { search, count, limit }, apiKey), { fetch });
  return page.results;
}
