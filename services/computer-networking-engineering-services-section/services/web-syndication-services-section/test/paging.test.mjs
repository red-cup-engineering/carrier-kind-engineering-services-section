// RFC 5005 (Feed Paging and Archiving) and the h-feed shorthand.
import assert from "node:assert/strict";
import test from "node:test";
import { allPages, archiveChain, hfeedAnchors, hfeedLinks, headLinks, linkHeader, mayAssertComplete, pageCount, pageUrl, pagedLinks, paginate, readFeed, serializeAtom, serializeJsonFeed, serializeRss } from "../src/index.mjs";

const BASE = "https://example.org/feed";
const numbers = (n) => Array.from({ length: n }, (_, i) => i);

test("pages are contiguous, non-overlapping slices that reassemble the list; an empty list has one page", () => {
  const list = numbers(25);
  const pages = allPages(list, 10);
  assert.deepEqual(pages.map((p) => p.items.length), [10, 10, 5]);
  assert.deepEqual(pages.flatMap((p) => p.items), list);
  assert.equal(pageCount(0, 10), 1);
  assert.equal(paginate([], 10, 0).isLast, true);
  assert.equal(pageCount(20, 10), 2);
  assert.throws(() => paginate(list, 10, 3), RangeError);
  assert.throws(() => paginate(list, 0, 0), RangeError);
  assert.throws(() => paginate("x", 1, 0), TypeError);
});

test("RFC 5005 3: first and last always, previous and next only where a neighbour exists", () => {
  const rels = (index) => pagedLinks(paginate(numbers(25), 10, index), BASE).map((l) => l.rel);
  assert.deepEqual(rels(0), ["first", "next", "last"]);
  assert.deepEqual(rels(1), ["first", "previous", "next", "last"]);
  assert.deepEqual(rels(2), ["first", "previous", "last"]);
  assert.equal(pageUrl(BASE, 0), BASE);
  assert.equal(pageUrl(BASE, 2), `${BASE}?page=2`);
  assert.equal(pageUrl(`${BASE}?page=2`, 0), BASE, "page 0 is the clean subscription URL");
  const links = pagedLinks(paginate(numbers(25), 10, 1), BASE);
  assert.deepEqual(links.map((l) => l.href), [BASE, BASE, `${BASE}?page=2`, `${BASE}?page=2`]);
  assert.ok(links.every((l) => l.type === "application/atom+xml"));
});

test("RFC 5005 2: only a one-page feed may assert fh:complete", () => {
  assert.equal(mayAssertComplete(paginate(numbers(5), 10, 0)), true);
  assert.equal(mayAssertComplete(paginate(numbers(15), 10, 0)), false);
  const atom = serializeAtom({ title: "T", homePageUrl: "https://example.org/", feedUrl: BASE, author: { name: "A" }, complete: true }, [{ id: "https://example.org/1", url: "https://example.org/1", title: "1", published: "2026-01-01T00:00:00Z" }]);
  assert.match(atom, /xmlns:fh="http:\/\/purl\.org\/syndication\/history\/1\.0"/);
  assert.match(atom, /<fh:complete\/>/);
  assert.doesNotMatch(atom, /<fh:archive\/>/);
});

const history = numbers(25).map((i) => ({ id: `https://example.org/${i}`, n: i }));
test("RFC 5005 4: archives are immutable blocks of the oldest-first history; the subscription document holds the rest", () => {
  const chain = archiveChain(history, 10, BASE);
  assert.equal(chain.archives.length, 2);
  assert.deepEqual(chain.archives[0].items.map((i) => i.n), [9, 8, 7, 6, 5, 4, 3, 2, 1, 0], "newest first within an archive");
  assert.deepEqual(chain.archives[1].items.map((i) => i.n), [19, 18, 17, 16, 15, 14, 13, 12, 11, 10]);
  assert.deepEqual(chain.subscription.items.map((i) => i.n), [24, 23, 22, 21, 20]);
  assert.deepEqual(chain.archives[0].links.map((l) => l.rel), ["next-archive", "current"]);
  assert.deepEqual(chain.archives[1].links.map((l) => l.rel), ["prev-archive", "current"]);
  assert.deepEqual(chain.subscription.links.map((l) => [l.rel, l.href]), [["prev-archive", chain.archives[1].url]]);
  assert.ok(chain.archives.every((a) => a.archive === true) && chain.subscription.archive === false);
  assert.equal(chain.archives[0].links.find((l) => l.rel === "current").href, BASE);
});
test("RFC 5005 4: a growing feed leaves every existing archive unchanged", () => {
  const before = archiveChain(history, 10, BASE);
  const after = archiveChain([...history, ...numbers(7).map((i) => ({ id: `https://example.org/new${i}`, n: 100 + i }))], 10, BASE);
  assert.equal(after.archives.length, 3);
  for (const i of [0, 1]) assert.deepEqual(JSON.stringify(after.archives[i].items), JSON.stringify(before.archives[i].items));
  assert.deepEqual(after.archives[1].links.map((l) => l.rel), ["prev-archive", "next-archive", "current"], "only the neighbouring link set of the formerly last archive gains next-archive");
  assert.equal(archiveChain(numbers(5), 10, BASE).archives.length, 0);
  assert.deepEqual(archiveChain(numbers(5), 10, BASE).subscription.links, []);
});

test("the serializers carry paging links: Atom <link>, RSS atom:link, JSON next_url", () => {
  const channel = (links, extra = {}) => ({ title: "T", homePageUrl: "https://example.org/", feedUrl: BASE, author: { name: "A" }, links, ...extra });
  const one = [{ id: "https://example.org/1", url: "https://example.org/1", title: "1", published: "2026-01-01T00:00:00Z" }];
  const links = pagedLinks(paginate(numbers(25), 10, 1), BASE);
  const atom = serializeAtom(channel(links), one);
  for (const rel of ["first", "previous", "next", "last"]) assert.match(atom, new RegExp(`<link rel="${rel}" href="[^"]+" type="application/atom\\+xml"/>`));
  const rss = serializeRss(channel(links), one);
  assert.match(rss, /<atom:link rel="next" href="https:\/\/example\.org\/feed\?page=2" type="application\/atom\+xml"\/>/);
  assert.equal(JSON.parse(serializeJsonFeed(channel(links), one)).next_url, `${BASE}?page=2`);
  const chain = archiveChain(history, 10, BASE);
  const archived = serializeAtom(channel(chain.archives[1].links, { archive: true }), one);
  assert.match(archived, /<fh:archive\/>/);
  assert.match(archived, /rel="prev-archive"/);
  assert.equal(JSON.parse(serializeJsonFeed(channel(chain.subscription.links), one)).next_url, chain.archives[1].url, "a JSON Feed follows prev-archive as next_url");
  const read = readFeed(archived, { url: BASE });
  assert.equal(read.archive, true);
  assert.deepEqual(read.links.map((l) => l.rel).sort(), ["current", "prev-archive"]);
});

test("h-feed: HTML spells previous as prev; anchors, head links and the Link header agree", () => {
  const links = hfeedLinks(paginate(numbers(25), 10, 1), BASE);
  assert.deepEqual(links.map((l) => l.rel), ["first", "prev", "next", "last"]);
  assert.deepEqual(hfeedLinks(paginate(numbers(25), 10, 1), BASE, { ends: false }).map((l) => l.rel), ["prev", "next"]);
  assert.match(hfeedAnchors(links), /<a rel="prev" href="https:\/\/example\.org\/feed">Prev<\/a>/);
  assert.match(headLinks(links), /<link rel="next" href="https:\/\/example\.org\/feed\?page=2">/);
  assert.equal(linkHeader(links.slice(1, 3), { type: "text/html" }), `<${BASE}>; rel="prev"; type="text/html", <${BASE}?page=2>; rel="next"; type="text/html"`);
  assert.match(headLinks([{ rel: "next", href: 'https://x.example/?a="b"&c=<d>' }]), /href="https:\/\/x\.example\/\?a=&quot;b&quot;&amp;c=&lt;d&gt;"/);
});
