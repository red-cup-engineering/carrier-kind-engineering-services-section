/**
 * paging -- RFC 5005, Feed Paging and Archiving, and the h-feed shorthand.
 *
 *  - {@link paginate} slices an ordered list into zero-indexed pages (page n is items [n*size, (n+1)*size)),
 *    newest first; page 0's URL is the clean base, page n is `base?page=n`.
 *  - Paged feeds (RFC 5005 3): `first`, `last`, `previous`, `next` links ({@link pagedLinks}); `previous`
 *    is Atom's spelling, `prev` is HTML's ({@link hfeedLinks}).
 *  - Complete feeds (2): the whole feed in one document, asserted by `fh:complete` ({@link mayAssertComplete}).
 *  - Archived feeds (4): {@link archiveChain} splits an *oldest-first* history into immutable archive
 *    documents (`fh:archive`, `prev-archive` / `next-archive`, `current`) and one subscription document
 *    that links to the newest archive. An archive's items never change as the feed grows (section 4: "the
 *    archive document MUST NOT change"), so only the subscription document is rewritten.
 * Pass the resulting `links` (and `complete` / `archive`) to the Atom, RSS and JSON Feed serializers.
 */
export const FH_NAMESPACE = "http://purl.org/syndication/history/1.0";
export const ATOM_TYPE = "application/atom+xml";

const positive = (n, what) => {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`${what} must be a positive integer, got ${String(n)}`);
  return n;
};

/** The number of pages of `total` items; an empty list still has one page. */
export const pageCount = (total, size) => (total === 0 ? 1 : Math.ceil(total / positive(size, "page size")));

/** One page: the slice, `offset`, `pageCount`, `isFirst` / `isLast`, and the neighbouring indices (null at the ends). */
export function paginate(items, size, index) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  positive(size, "page size");
  const count = pageCount(items.length, size);
  if (!Number.isInteger(index) || index < 0 || index >= count) throw new RangeError(`page index ${String(index)} out of range [0, ${count - 1}]`);
  return Object.freeze({
    index, size, pageCount: count, total: items.length, offset: index * size,
    items: items.slice(index * size, (index + 1) * size),
    isFirst: index === 0, isLast: index === count - 1, firstIndex: 0, lastIndex: count - 1,
    previousIndex: index === 0 ? null : index - 1, nextIndex: index === count - 1 ? null : index + 1,
  });
}

/** Every page of the list. */
export function allPages(items, size) {
  return Array.from({ length: pageCount(items.length, size) }, (_, index) => paginate(items, size, index));
}

/** A link record `{ rel, href, type?, title? }`. */
export function link(rel, href, options = {}) {
  if (typeof rel !== "string" || rel === "" || typeof href !== "string" || href === "") throw new TypeError("a link needs a rel and an href");
  return Object.freeze({ rel, href, ...(options.type ? { type: options.type } : {}), ...(options.title ? { title: options.title } : {}) });
}

/** The URL of page `index`: the base for page 0, else the base with `?page=index`. */
export function pageUrl(base, index, { param = "page", origin } = {}) {
  if (!Number.isInteger(index) || index < 0) throw new RangeError("page index must be a non-negative integer");
  const url = origin === undefined ? new URL(base) : new URL(base, origin);
  if (index === 0) url.searchParams.delete(param);
  else url.searchParams.set(param, String(index));
  return url.href;
}

const builder = (base, options) => options.build ?? ((index) => pageUrl(base, index, options));

/** RFC 5005 3: `first` and `last` always, `previous` and `next` where a neighbour exists. */
export function pagedLinks(page, base, options = {}) {
  const build = builder(base, options);
  const type = options.type ?? ATOM_TYPE;
  return [
    link("first", build(page.firstIndex), { type }),
    ...(page.previousIndex === null ? [] : [link("previous", build(page.previousIndex), { type })]),
    ...(page.nextIndex === null ? [] : [link("next", build(page.nextIndex), { type })]),
    link("last", build(page.lastIndex), { type }),
  ];
}

/** Whether a feed may assert `fh:complete`: it must be one document with all of its items. */
export const mayAssertComplete = (page) => page != null && page.pageCount === 1;

/**
 * RFC 5005 4 as an immutable chain. `itemsOldestFirst` is the whole history, oldest first; every full
 * block of `size` items becomes an archive document that will never change, and the remainder (fewer
 * than `size` items, possibly none) is the subscription document. Returns
 * `{ archives: [{ index, items, url, links, archive: true }], subscription: { items, url, links } }`.
 * `archiveUrl(i)` names archive i (default `base?archive=i`, i from 0 = oldest).
 */
export function archiveChain(itemsOldestFirst, size, base, options = {}) {
  positive(size, "archive size");
  const type = options.type ?? ATOM_TYPE;
  const archiveUrl = options.archiveUrl ?? ((i) => { const u = new URL(base); u.searchParams.set("archive", String(i)); return u.href; });
  const full = Math.floor(itemsOldestFirst.length / size);
  const current = options.current ?? new URL(base).href;
  const archives = Array.from({ length: full }, (_, i) => Object.freeze({
    index: i, archive: true, url: archiveUrl(i),
    items: itemsOldestFirst.slice(i * size, (i + 1) * size).reverse(),
    links: Object.freeze([
      ...(i > 0 ? [link("prev-archive", archiveUrl(i - 1), { type })] : []),
      ...(i < full - 1 ? [link("next-archive", archiveUrl(i + 1), { type })] : []),
      link("current", current, { type }),
    ]),
  }));
  const rest = itemsOldestFirst.slice(full * size).reverse();
  return Object.freeze({
    archives: Object.freeze(archives),
    subscription: Object.freeze({ items: rest, url: current, archive: false, links: Object.freeze(full > 0 ? [link("prev-archive", archiveUrl(full - 1), { type })] : []) }),
  });
}

/** h-feed / IndieWeb pagination: `first`, `prev`, `next`, `last` (HTML spells it `prev`). */
export function hfeedLinks(page, base, options = {}) {
  const build = builder(base, options);
  const extra = options.type ? { type: options.type } : {};
  const ends = options.ends ?? true;
  return [
    ...(ends ? [link("first", build(page.firstIndex), extra)] : []),
    ...(page.previousIndex === null ? [] : [link("prev", build(page.previousIndex), extra)]),
    ...(page.nextIndex === null ? [] : [link("next", build(page.nextIndex), extra)]),
    ...(ends ? [link("last", build(page.lastIndex), extra)] : []),
  ];
}

const attr = (s) => String(s).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&#39;");
const quoted = (s) => String(s).replace(/\\/gu, "\\\\").replace(/"/gu, '\\"');
const label = (rel) => rel.replace(/-/gu, " ").replace(/^./u, (c) => c.toUpperCase());

/** In-document `<a rel>` anchors for an h-feed page. */
export const hfeedAnchors = (links) => links.map((l) => `<a rel="${attr(l.rel)}" href="${attr(l.href)}">${label(l.rel)}</a>`).join("\n");
/** `<head>` `<link>` elements for a page. */
export const headLinks = (links) => links.map((l) => `<link rel="${attr(l.rel)}" href="${attr(l.href)}"${l.type ? ` type="${attr(l.type)}"` : ""}>`).join("\n");
/** An RFC 8288 `Link` header value for the links. */
export const linkHeader = (links, options = {}) => links.map((l) => `<${l.href}>; rel="${quoted(l.rel)}"${l.type ?? options.type ? `; type="${quoted(l.type ?? options.type)}"` : ""}${l.title ? `; title="${quoted(l.title)}"` : ""}`).join(", ");
