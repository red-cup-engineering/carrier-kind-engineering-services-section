/**
 * ProPublica's Nonprofit Explorer API (`projects.propublica.org/nonprofits/api`): searching the
 * IRS exempt-organization list by name/keyword, and reading one organization's address and
 * filings by EIN. No key is required.
 * @packageDocumentation
 */

const BASE = "https://projects.propublica.org/nonprofits/api/v2";

/**
 * A zero-result search answers HTTP 404 with a valid, well-shaped JSON body (`total_results: 0`,
 * `organizations: []`) rather than 200; every other non-2xx status is a real failure. So a 404 is
 * only swallowed once its body has parsed as JSON, and re-thrown if parsing fails too.
 */
async function getJson(url, opts = {}) {
  const doFetch = opts.fetch ?? fetch;
  const res = await doFetch(url, { headers: { accept: "application/json" } });
  if (res.ok) return res.json();
  if (res.status === 404) {
    try { return await res.json(); }
    catch { /* fall through to the thrown error below */ }
  }
  throw new Error(`ProPublica Nonprofit Explorer ${url} answered HTTP ${res.status}`);
}

/** Search nonprofits by name or keyword, optionally within one state (`state` is a USPS code) or NTEE code. */
export async function searchOrganizations(query, { state, ntee, page = 0, ...opts } = {}) {
  const url = new URL(`${BASE}/search.json`);
  url.searchParams.set("q", query);
  if (state) url.searchParams.set("state[id]", state);
  if (ntee) url.searchParams.set("ntee[id]", ntee);
  if (page) url.searchParams.set("page", String(page));
  const body = await getJson(url, opts);
  return body.organizations ?? [];
}

/** Every matching organization across pages, up to `limit` total (default 200). */
export async function* searchOrganizationsAll(query, { limit = 200, ...request } = {}) {
  let page = 0;
  let yielded = 0;
  for (;;) {
    const organizations = await searchOrganizations(query, { ...request, page });
    if (organizations.length === 0) return;
    for (const organization of organizations) {
      yield organization;
      if (++yielded >= limit) return;
    }
    page += 1;
  }
}

/** One organization's IRS Business Master File record (name, address, NTEE code, latest financials). */
export async function getOrganization(ein, opts = {}) {
  const body = await getJson(new URL(`${BASE}/organizations/${ein}.json`), opts);
  return body.organization;
}
