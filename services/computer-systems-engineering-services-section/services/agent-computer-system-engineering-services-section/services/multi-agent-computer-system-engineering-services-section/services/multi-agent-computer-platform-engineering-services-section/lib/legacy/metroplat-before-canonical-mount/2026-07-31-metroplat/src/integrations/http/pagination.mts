
/**
 * projections/pagination — the one seat for paginating an admitted
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
import { linkHeader } from "./codec/link.mts";

export interface PageLinks {
  readonly self: string;
  readonly first: string;
  readonly last?: string;
  readonly previous?: string;
  readonly next?: string;
}

export interface OffsetPage<T> {
  readonly page: number;
  readonly limit: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly items: readonly T[];
  readonly links: PageLinks;
}

export interface OffsetPageOptions {
  readonly base: string;
  readonly path?: string;
  readonly pageParam?: string;
  readonly limitParam?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly maxLimit?: number;
  readonly extraParams?: Readonly<Record<string, string>>;
}

const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_LIMIT = 1000;

function clampLimit(limit: number | undefined, maxLimit: number): number {
  if (limit === undefined || !Number.isSafeInteger(limit) || limit <= 0) return Math.min(DEFAULT_LIMIT, maxLimit);
  return Math.min(limit, maxLimit);
}

function clampPage(page: number | undefined, totalPages: number): number {
  if (page === undefined || !Number.isSafeInteger(page) || page <= 0) return 1;
  return Math.min(page, totalPages);
}

function offsetUrl(opts: OffsetPageOptions, pageParam: string, limitParam: string, targetPage: number, limit: number): string {
  const url = new URL(opts.path ?? "/", opts.base);
  for (const [key, value] of Object.entries(opts.extraParams ?? {})) url.searchParams.set(key, value);
  url.searchParams.set(pageParam, String(targetPage));
  url.searchParams.set(limitParam, String(limit));
  return url.href;
}

/** Paginate `items` into one numbered page, with self/first/last/prev/next links under `base`. */
export function paginateOffset<T>(items: readonly T[], opts: OffsetPageOptions): OffsetPage<T> {
  const pageParam = opts.pageParam ?? "page";
  const limitParam = opts.limitParam ?? "limit";
  const maxLimit = opts.maxLimit ?? DEFAULT_MAX_LIMIT;
  const limit = clampLimit(opts.limit, maxLimit);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const page = clampPage(opts.page, totalPages);
  const start = (page - 1) * limit;
  const at = (target: number): string => offsetUrl(opts, pageParam, limitParam, target, limit);
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

export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly limit: number;
  readonly links: PageLinks;
}

export interface CursorPageOptions {
  readonly base: string;
  readonly path?: string;
  readonly before?: string;
  readonly after?: string;
  readonly limit?: number;
  readonly maxLimit?: number;
  readonly beforeParam?: string;
  readonly afterParam?: string;
  readonly limitParam?: string;
  readonly extraParams?: Readonly<Record<string, string>>;
}

function cursorUrl(opts: CursorPageOptions, params: Readonly<Record<string, string>>): string {
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
export function paginateCursor<T>(sortedItems: readonly T[], keyOf: (item: T) => string, opts: CursorPageOptions): CursorPage<T> {
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

  const params: Record<string, string> = { [limitParam]: String(limit) };
  const links: { self: string; first: string; before?: string; after?: string } = {
    self: cursorUrl(opts, { ...params, ...(opts.after === undefined ? {} : { [afterParam]: opts.after }), ...(opts.before === undefined ? {} : { [beforeParam]: opts.before }) }),
    first: cursorUrl(opts, params),
  };
  if (page.length > 0 && bounded.length > limit) links.after = keyOf(page[page.length - 1]!);
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
export function paginationLinkHeader(links: PageLinks): string {
  return linkHeader([
    { href: links.self, rel: "self" },
    { href: links.first, rel: "first" },
    ...(links.last === undefined ? [] : [{ href: links.last, rel: "last" }]),
    ...(links.previous === undefined ? [] : [{ href: links.previous, rel: "prev" }]),
    ...(links.next === undefined ? [] : [{ href: links.next, rel: "next" }]),
  ]);
}
