/**
 * USAspending.gov's award-search API: federal grants, contracts and other awards by agency,
 * keyword and time period. No key is required. Used to find federal buyer-side funders of a
 * market (grantees a program actually paid), not to place any request on the founder's behalf.
 * @packageDocumentation
 */

const SEARCH_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/";

/** Grant and cooperative-agreement award-type codes (not contracts, not loans). */
export const GRANT_AWARD_TYPE_CODES = Object.freeze(["02", "03", "04", "05"]);

async function postJson(url, body, opts = {}) {
  const doFetch = opts.fetch ?? fetch;
  const res = await doFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`USAspending ${url} answered HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

/**
 * Search awards by keyword within one or more agencies and a time period, newest or largest
 * first. `filters` follows USAspending's own filter object; `keywords`, `agencyNames` and
 * `fiscalYearStart`/`fiscalYearEnd` are shorthand for the common case.
 */
export async function searchAwards({
  keywords = [],
  agencyNames = [],
  awardTypeCodes = GRANT_AWARD_TYPE_CODES,
  fiscalYearStart,
  fiscalYearEnd,
  fields = ["Award ID", "Recipient Name", "Award Amount", "Awarding Sub Agency", "Description", "Start Date"],
  page = 1,
  limit = 50,
  sort = "Award Amount",
  order = "desc",
  ...opts
} = {}) {
  const filters = {
    award_type_codes: awardTypeCodes,
    ...(keywords.length > 0 ? { keywords } : {}),
    ...(agencyNames.length > 0 ? { agencies: agencyNames.map((name) => ({ type: "awarding", tier: "toptier", name })) } : {}),
    ...(fiscalYearStart && fiscalYearEnd ? { time_period: [{ start_date: fiscalYearStart, end_date: fiscalYearEnd }] } : {}),
  };
  const body = await postJson(SEARCH_URL, { filters, fields, page, limit, sort, order }, opts);
  return body.results ?? [];
}

/** Every matching award across pages, up to `limit` total (default 500), newest/largest first. */
export async function* searchAwardsAll(request, { limit = 500, pageSize = 100 } = {}) {
  let page = 1;
  let yielded = 0;
  for (;;) {
    const results = await searchAwards({ ...request, page, limit: pageSize });
    if (results.length === 0) return;
    for (const award of results) {
      yield award;
      if (++yielded >= limit) return;
    }
    if (results.length < pageSize) return;
    page += 1;
  }
}
