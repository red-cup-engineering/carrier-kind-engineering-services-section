// RSS 2.0, Atom 1.0 (RFC 4287) and JSON Feed 1.1 conformance, each case a requirement of its standard.
import assert from "node:assert/strict";
import test from "node:test";
import { childOf, childrenOf, parseRfc3339, parseRfc822, parseXml, readFeed, serializeAtom, serializeJsonFeed, serializeRss, jsonFeedObject, toDate, toRfc3339, toRfc822 } from "../src/index.mjs";

const channel = { title: "Field notes", homePageUrl: "https://example.org/", feedUrl: "https://example.org/feed.xml", description: "Notes & news", language: "en-US", author: { name: "Editor", url: "https://example.org/editor" } };
const items = [
  { id: "https://example.org/posts/hello", url: "https://example.org/posts/hello", title: "Hello <world>", contentHtml: "<p>Hi & bye ]]> done.</p>", summary: "Hi", published: "2026-06-05T14:00:00+02:00", updated: "2026-06-06T08:30:00Z", tags: ["intro", "meta"], author: { name: "Morgan", url: "https://example.org/morgan" } },
  { id: "post-2", url: "https://example.org/posts/two", title: "Two", contentText: "plain", published: "2026-06-01T00:00:00Z" },
];

test("dates: an offset instant is the same moment in UTC, GMT and a calendar date", () => {
  assert.equal(toRfc3339("2026-06-05T14:00:00+02:00"), "2026-06-05T12:00:00Z");
  assert.equal(toRfc822("2026-06-05T14:00:00+02:00"), "Fri, 05 Jun 2026 12:00:00 GMT");
  assert.equal(toDate("2026-06-05T23:30:00-05:00"), "2026-06-06");
  assert.equal(parseRfc3339("2026-06-05T12:00:00.500Z"), Date.UTC(2026, 5, 5, 12, 0, 0, 500));
  for (const bad of ["2026-02-30T00:00:00Z", "2026-06-05", "2026-13-01T00:00:00Z", "yesterday", undefined]) assert.throws(() => parseRfc3339(bad), TypeError, String(bad));
  assert.equal(parseRfc822("Fri, 05 Jun 2026 12:00:00 GMT"), Date.UTC(2026, 5, 5, 12));
  assert.equal(parseRfc822("5 Jun 26 08:00 EST"), Date.UTC(2026, 5, 5, 13));
  assert.equal(parseRfc822("5 Jun 2026 12:00 +0200"), Date.UTC(2026, 5, 5, 10));
  assert.equal(parseRfc822("nonsense"), undefined);
});

test("RSS 2.0: channel title, link and description; item guid, RFC 822 pubDate, enclosure and categories", () => {
  const xml = serializeRss({ ...channel, links: [{ rel: "next", href: "https://example.org/feed.xml?page=1" }] }, [...items, { ...items[1], id: "post-3", title: undefined, summary: "described", attachments: [{ url: "https://example.org/a.mp3", mimeType: "audio/mpeg", sizeInBytes: 1234 }] }]);
  const rss = parseXml(xml);
  assert.deepEqual([rss.name, rss.attrs.version], ["rss", "2.0"]);
  const ch = childOf(rss, "channel");
  assert.deepEqual(["title", "link", "description"].map((n) => childOf(ch, n).text), ["Field notes", "https://example.org/", "Notes & news"]);
  assert.equal(childOf(ch, "language").text, "en-US");
  assert.ok(childrenOf(ch, "atom:link").some((l) => l.attrs.rel === "self" && l.attrs.href === "https://example.org/feed.xml"));
  assert.ok(childrenOf(ch, "atom:link").some((l) => l.attrs.rel === "next"));
  const [first, second, third] = childrenOf(ch, "item");
  assert.equal(childOf(first, "title").text, "Hello <world>");
  assert.equal(childOf(first, "guid").attrs.isPermaLink, "true");
  assert.equal(childOf(second, "guid").attrs.isPermaLink, "false");
  assert.equal(childOf(first, "pubDate").text, "Fri, 05 Jun 2026 12:00:00 GMT");
  assert.equal(childOf(first, "dc:creator").text, "Morgan");
  assert.equal(childOf(second, "dc:creator").text, "Editor", "the channel author fills in");
  assert.equal(childOf(first, "content:encoded").text, "<p>Hi & bye ]]> done.</p>", "a CDATA end marker inside content survives");
  assert.deepEqual(childrenOf(first, "category").map((c) => c.text), ["intro", "meta"]);
  assert.deepEqual([childOf(third, "enclosure").attrs.url, childOf(third, "enclosure").attrs.length, childOf(third, "enclosure").attrs.type], ["https://example.org/a.mp3", "1234", "audio/mpeg"]);
  assert.equal(childOf(third, "title"), undefined);
  assert.throws(() => serializeRss(channel, [{ id: "x", url: "https://example.org/x", published: "2026-06-01T00:00:00Z" }]), /title or a description/);
});

test("Atom 1.0: feed and entry id, title and updated; self and alternate links; typed html text constructs (RFC 4287 4.1, 4.2)", () => {
  const feed = parseXml(serializeAtom(channel, items));
  assert.deepEqual([feed.name, feed.attrs.xmlns, feed.attrs["xml:lang"]], ["feed", "http://www.w3.org/2005/Atom", "en-US"]);
  assert.deepEqual(["id", "title", "updated"].map((n) => childOf(feed, n).text), ["https://example.org/feed.xml", "Field notes", "2026-06-06T08:30:00Z"]);
  const links = childrenOf(feed, "link");
  assert.ok(links.some((l) => l.attrs.rel === "self" && l.attrs.type === "application/atom+xml"));
  assert.ok(links.some((l) => l.attrs.rel === "alternate" && l.attrs.href === "https://example.org/"));
  const [one, two] = childrenOf(feed, "entry");
  for (const entry of [one, two]) for (const n of ["id", "title", "updated"]) assert.ok(childOf(entry, n), `entry ${n}`);
  assert.equal(childOf(one, "content").attrs.type, "html");
  assert.equal(childOf(one, "content").text, "<p>Hi & bye ]]> done.</p>");
  assert.equal(childOf(one, "summary").attrs.type, "html");
  assert.equal(childOf(one, "published").text, "2026-06-05T12:00:00Z");
  assert.equal(childOf(childOf(one, "author"), "name").text, "Morgan");
  assert.equal(childOf(two, "id").text, "https://example.org/posts/two", "an id that is not an IRI is replaced by the item URL (atom:id MUST be an IRI)");
  assert.equal(childOf(two, "content").attrs.type, "text");
  assert.equal(childOf(two, "updated").text, "2026-06-01T00:00:00Z", "updated falls back to published");
});

test("RFC 4287 4.1.1: a feed with no author needs an author on every entry; atom:updated is required", () => {
  const { author: _author, ...bare } = channel;
  assert.throws(() => serializeAtom(bare, items), /author on every entry/);
  assert.doesNotThrow(() => serializeAtom(bare, items.map((i) => ({ ...i, author: { name: "A" } }))));
  assert.throws(() => serializeAtom(channel, []), /atom:updated/);
  assert.match(serializeAtom({ ...channel, updated: "2026-01-01T00:00:00Z" }, []), /<updated>2026-01-01T00:00:00Z<\/updated>/);
});

test("JSON Feed 1.1: version, title and items; every item has an id and content_html or content_text", () => {
  const feed = jsonFeedObject({ ...channel, links: [{ rel: "next", href: "https://example.org/feed.json?page=1" }] }, items);
  assert.deepEqual([feed.version, feed.title, feed.feed_url, feed.next_url], ["https://jsonfeed.org/version/1.1", "Field notes", "https://example.org/feed.xml", "https://example.org/feed.json?page=1"]);
  assert.deepEqual(feed.authors, [{ name: "Editor", url: "https://example.org/editor" }]);
  assert.equal(feed.items[0].date_published, "2026-06-05T12:00:00Z");
  assert.equal(feed.items[0].date_modified, "2026-06-06T08:30:00Z");
  assert.deepEqual(feed.items[0].authors, [{ name: "Morgan", url: "https://example.org/morgan" }]);
  for (const item of feed.items) { assert.equal(typeof item.id, "string"); assert.ok(item.content_html || item.content_text); }
  const bare = jsonFeedObject(channel, [{ id: "x", url: "https://example.org/x", title: "Only a title", published: "2026-06-01T00:00:00Z" }]);
  assert.equal(bare.items[0].content_text, "Only a title");
  assert.equal(JSON.parse(serializeJsonFeed(channel, items)).items.length, 2);
});

test("model: URLs, instants and authors are validated, never guessed", () => {
  assert.throws(() => serializeRss({ ...channel, homePageUrl: "not a url" }, []), /homePageUrl/);
  assert.throws(() => serializeRss(channel, [{ id: "x", url: "https://example.org/x", title: "T" }]), /published or updated/);
  assert.throws(() => serializeRss(channel, [{ id: "x", url: "https://example.org/x", title: "T", published: "June" }]), /RFC 3339/);
  assert.throws(() => serializeRss(channel, [{ ...items[0], author: { url: "https://example.org/" } }]), /author.name/);
  assert.throws(() => serializeRss({ ...channel, title: "" }, []), /title/);
});

test("the reader recovers what each serializer wrote, in the same model", () => {
  for (const [format, body] of [["rss", serializeRss(channel, items)], ["atom", serializeAtom(channel, items)], ["json", serializeJsonFeed(channel, items)]]) {
    const read = readFeed(body, { url: "https://example.org/feed.xml" });
    assert.equal(read.format, format);
    assert.equal(read.channel.title, "Field notes");
    assert.equal(read.items.length, 2);
    assert.equal(read.items[0].title, "Hello <world>", format);
    assert.equal(read.items[0].published, "2026-06-05T12:00:00Z", format);
    assert.deepEqual(read.items[0].tags, ["intro", "meta"], format);
    assert.equal(read.items[0].author.name, "Morgan");
    assert.equal(read.items[0].contentHtml, "<p>Hi & bye ]]> done.</p>");
  }
});

test("the XML reader refuses what a feed never needs", () => {
  assert.throws(() => parseXml('<!DOCTYPE feed [<!ENTITY x "boom">]><feed>&x;</feed>'), /internal subset/);
  assert.throws(() => parseXml("<feed>&unknown;</feed>"), /undeclared entity/);
  assert.throws(() => parseXml("<a><b></a></b>"), /mismatched/);
  assert.throws(() => parseXml("<a>"), /unclosed/);
  assert.equal(parseXml("<a>&lt;&#65;&#x42;&amp;</a>").text, "<AB&");
  assert.throws(() => readFeed("<html/>"), /not a feed/);
  assert.throws(() => readFeed('{"version":"x","items":[]}'), /not a JSON Feed/);
});
