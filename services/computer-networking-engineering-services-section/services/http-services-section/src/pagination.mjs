
/**
 * pagination — the one seat for paginating an admitted
 * collection, offset-numbered or cursor-keyed.
 *
 * Two admitted collections in this package need two different pagination
 * models: a numbered page over a fixed list (Triple Pattern Fragments,
 * static-website indexes, feeds) and a before/after cursor over a
 * chronologically-keyed list (a Microsub timeline, where items keep
 * arriving and a page must stay stable under insertion). `paginateOffset`
 * and `paginateCursor` are those two laws; `paginationLinkHeader` derives
 * the shared `Link` header from either page's links, reusing
 * `codecs/text/http/link`'s writer rather than re-deriving it.
 */
import { linkHeader } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/link";

const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_LIMIT = 1000;

function clampLimit(limit, maxLimit) {
  if (limit === undefined || !Number.isSafeInteger(limit) || limit <= 0) return Math.min(DEFAULT_LIMIT, maxLimit);
  return Math.min(limit, maxLimit);
}

function clampPage(page, totalPages) {
  if (page === undefined || !Number.isSafeInteger(page) || page <= 0) return 1;
  return Math.min(page, totalPages);
}

function offsetUrl(opts, pageParam, limitParam, targetPage, limit) {
  const url = new URL(opts.path ?? "/", opts.base);
  for (const [key, value] of Object.entries(opts.extraParams ?? {})) url.searchParams.set(key, value);
  url.searchParams.set(pageParam, String(targetPage));
  url.searchParams.set(limitParam, String(limit));
  return url.href;
}

/** Paginate `items` into one numbered page, with self/first/last/prev/next links under `base`. */
export function paginateOffset(items, opts) {
  const pageParam = opts.pageParam ?? "page";
  const limitParam = opts.limitParam ?? "limit";
  const maxLimit = opts.maxLimit ?? DEFAULT_MAX_LIMIT;
  const limit = clampLimit(opts.limit, maxLimit);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const page = clampPage(opts.page, totalPages);
  const start = (page - 1) * limit;
  const at = (target) => offsetUrl(opts, pageParam, limitParam, target, limit);
  return Object.freeze({
    page,
    limit,
    totalItems,
    totalPages,
    items: Object.freeze(items.slice(start, start + limit)),
    links: Object.freeze({
      self: at(page),
      first: at(1),
      last: at(totalPages),
      ...(page > 1 ? { previous: at(page - 1) } : {}),
      ...(page < totalPages ? { next: at(page + 1) } : {}),
    }),
  });
}

function cursorUrl(opts, params) {
  const url = new URL(opts.path ?? "/", opts.base);
  for (const [key, value] of Object.entries(opts.extraParams ?? {})) url.searchParams.set(key, value);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.href;
}

/**
 * Paginate a list already sorted newest-first by `keyOf`, into one page
 * bounded by an optional `after` (exclusive lower bound) and `before`
 * (exclusive upper bound) cursor — the shape a live-growing timeline needs
 * to stay stable under insertion, unlike an offset page.
 */
export function paginateCursor(sortedItems, keyOf, opts) {
  const maxLimit = opts.maxLimit ?? DEFAULT_MAX_LIMIT;
  const limit = clampLimit(opts.limit, maxLimit);
  const beforeParam = opts.beforeParam ?? "before";
  const afterParam = opts.afterParam ?? "after";
  const limitParam = opts.limitParam ?? "limit";

  const afterIndex = opts.after === undefined ? 0 : sortedItems.findIndex((item) => keyOf(item) === opts.after) + 1;
  const fromAfter = sortedItems.slice(Math.max(0, afterIndex));
  const beforeIndex = opts.before === undefined ? -1 : fromAfter.findIndex((item) => keyOf(item) === opts.before);
  const bounded = beforeIndex >= 0 ? fromAfter.slice(0, beforeIndex) : fromAfter;
  const page = bounded.slice(0, limit);

  const params = { [limitParam]: String(limit) };
  const links = {
    self: cursorUrl(opts, { ...params, ...(opts.after === undefined ? {} : { [afterParam]: opts.after }), ...(opts.before === undefined ? {} : { [beforeParam]: opts.before }) }),
    first: cursorUrl(opts, params),
  };
  if (page.length > 0 && bounded.length > limit) links.after = keyOf(page[page.length - 1]);
  if (opts.after !== undefined) links.before = opts.after;

  return Object.freeze({
    items: Object.freeze(page),
    limit,
    links: Object.freeze({
      self: links.self,
      first: links.first,
      ...(links.after === undefined ? {} : { next: cursorUrl(opts, { ...params, [afterParam]: links.after }) }),
      ...(links.before === undefined ? {} : { previous: cursorUrl(opts, { ...params, [beforeParam]: links.before }) }),
    }),
  });
}

/** The shared `Link` header for any page's links (offset or cursor alike). */
export function paginationLinkHeader(links) {
  return linkHeader([
    { href: links.self, rel: "self" },
    { href: links.first, rel: "first" },
    ...(links.last === undefined ? [] : [{ href: links.last, rel: "last" }]),
    ...(links.previous === undefined ? [] : [{ href: links.previous, rel: "prev" }]),
    ...(links.next === undefined ? [] : [{ href: links.next, rel: "next" }]),
  ]);
}
