/**
 * A Microsub timeline page: admitted entries newest first (`updated`/`published`, `uid` breaking
 * ties), paginated by the HTTP section's cursor, so a page stays stable as entries arrive.
 */
import { normalizeEntry } from "./codec.mjs";
import { paginateCursor } from "@red-cup-engineering/http-services-section/pagination";

function rank(entry) {
  return entry.updated ?? entry.published ?? "";
}

/** Sort admitted entries newest-first, then bound them into one Microsub timeline page. */
export function microsubTimeline(entries, opts = {}) {
  const normalized = entries.map(normalizeEntry);
  const sorted = [...normalized].sort((left, right) => {
    const leftRank = rank(left);
    const rightRank = rank(right);
    return leftRank === rightRank ? left.uid.localeCompare(right.uid) : rightRank.localeCompare(leftRank);
  });
  const page = paginateCursor(sorted, (entry) => entry.uid, {
    base: opts.base ?? "http://localhost/",
    path: opts.path ?? "/microsub",
    limit: opts.limit ?? 20,
    ...(opts.before === undefined ? {} : { before: opts.before }),
    ...(opts.after === undefined ? {} : { after: opts.after }),
  });
  const paging = {};
  if (page.links.next !== undefined) paging.after = page.items.at(-1).uid;
  if (opts.after !== undefined) paging.before = opts.after;
  return Object.freeze({
    items: page.items,
    ...(Object.keys(paging).length > 0 ? { paging: Object.freeze(paging) } : {}),
  });
}
