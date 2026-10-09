/**
 * The consolidated screening list, downloaded whole from the International Trade Administration.
 * No key is required. The file is about 34 MB of JSON with one `results` array.
 * @packageDocumentation
 */

export const CONSOLIDATED_LIST_URL = "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json";

/** Every entry on the list today. */
export async function fetchConsolidatedList({ fetch: doFetch = fetch, url = CONSOLIDATED_LIST_URL } = {}) {
  const res = await doFetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`consolidated screening list ${url} answered HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.results)) throw new Error("consolidated screening list: no results array");
  return body.results;
}
