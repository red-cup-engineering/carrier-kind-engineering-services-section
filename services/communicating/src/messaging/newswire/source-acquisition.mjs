/** Read syndication formats through the shared codecs; no publication policy lives here. */
import { parseArxivAtom, parseFeed, parseJsonFeed } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/web-feed";
import { fetchText } from "@red-cup-engineering/http-services-section/fetch-text";

const boundedCount = (value, fallback = 20) => Number.isInteger(value) && value > 0 ? Math.min(value, 100) : fallback;

function arxivUrl(source) {
  if (typeof source.query !== "string" || source.query === "") throw new TypeError("arxiv source requires a query");
  const params = new URLSearchParams({ search_query: source.query, start: "0", max_results: String(boundedCount(source.max, 10)), sortBy: source.sortBy ?? "submittedDate", sortOrder: source.sortOrder ?? "descending" });
  return `http://export.arxiv.org/api/query?${params}`;
}

function fetchOptions(source, io) {
  return { ...(io.fetchImpl ? { fetchImpl: io.fetchImpl } : {}), ...(source.retries === undefined ? {} : { retries: source.retries }), ...(io.backoff ? { backoff: (attempt) => io.backoff(Math.min(1000 * 2 ** attempt, 30_000)) } : {}) };
}

export async function acquireSyndicationSource(source, io = {}) {
  const maximum = boundedCount(source.max);
  if (source.adapter === "rss") {
    const url = source.url ?? source.query;
    if (typeof url !== "string" || url === "") throw new TypeError("RSS or Atom source requires a URL");
    return parseFeed(await fetchText(url, fetchOptions(source, io))).slice(0, maximum);
  }
  if (source.adapter === "arxiv") return parseArxivAtom(await fetchText(arxivUrl(source), fetchOptions(source, io))).slice(0, maximum);
  if (source.adapter === "newswire") {
    if (typeof source.url !== "string" || source.url === "") throw new TypeError("JSON Feed source requires a base URL");
    const url = `${source.url.replace(/\/?$/u, "/")}feed.json`;
    return parseJsonFeed(await fetchText(url, fetchOptions(source, io)), { source: source.url }).slice(0, maximum);
  }
  throw new TypeError(`unknown syndication carrier: ${source.adapter}`);
}
