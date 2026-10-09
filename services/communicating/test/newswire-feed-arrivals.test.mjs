import assert from "node:assert/strict";
import test from "node:test";
import { admitSetOfFeedArrivals, boundSummary, loadCursor, normalizeFeedList } from "../src/messaging/newswire/feed-arrivals.mjs";
import { utteranceFromCloudEvent } from "../src/messaging/cloudevents.mjs";

const FEED = { id: "test-wire", url: "https://example.test/wire/rss.xml", kind: "rss" };
function rssItem({ title, link, description = "", pubDate = "Wed, 02 Sep 2026 10:00:00 GMT" }) { return `<item><title>${title}</title><link>${link}</link><description>${description}</description><pubDate>${pubDate}</pubDate></item>`; }
function fetcherFor(xml) { return { fetchImpl: async () => ({ ok: true, status: 200, text: async () => xml }) }; }
const fixedNow = () => "2026-09-09T15:00:00.000Z";

test("first run emits the shared source-arrival carrier and canonical replay keys", async () => {
  const xml = `<rss><channel>${rssItem({ title: "Alpha arrives", link: "https://example.test/alpha" })}${rssItem({ title: "Beta arrives", link: "https://example.test/beta" })}</channel></rss>`;
  const { events, cursor } = await admitSetOfFeedArrivals({ feeds: [FEED], cursor: loadCursor("/nonexistent/cursor.json"), io: fetcherFor(xml), now: fixedNow });
  assert.equal(events.length, 2); assert.equal(events[0].specversion, "1.0"); assert.equal(events[0].type, "assertive");
  assert.equal(events[0].data.feed.id, "test-wire"); assert.equal(events[0].data.item.title, "Alpha arrives"); assert.match(events[0].id, /^sha256:/u);
  assert.deepEqual(utteranceFromCloudEvent(events[0]).claim.mark.value, events[0].data);
  assert.deepEqual(cursor, { version: 2, feeds: { "test-wire": events.map((event) => event.data.deduplicationKey) } });
});
test("replay suppression is stable across separate observations", async () => {
  const xml = `<rss><channel>${rssItem({ title: "Alpha arrives", link: "https://example.test/alpha" })}</channel></rss>`;
  const first = await admitSetOfFeedArrivals({ feeds: [FEED], cursor: loadCursor("/nonexistent/cursor.json"), io: fetcherFor(xml), now: fixedNow });
  const second = await admitSetOfFeedArrivals({ feeds: [FEED], cursor: first.cursor, io: fetcherFor(xml), now: () => "2026-09-09T16:00:00.000Z" });
  assert.equal(first.events.length, 1); assert.deepEqual(second.events, []);
});
test("a legacy cursor suppresses an old event without retaining its legacy key", async () => {
  const xml = `<rss><channel>${rssItem({ title: "Alpha arrives", link: "https://example.test/alpha" })}</channel></rss>`;
  const result = await admitSetOfFeedArrivals({ feeds: [FEED], cursor: { version: 1, feeds: { "test-wire": ["sha256:df760dd67b9e1def928515869fe0e8e9512315f8c9f52d5a541fe8ea82a1d664"] } }, io: fetcherFor(xml), now: fixedNow });
  assert.deepEqual(result.events, []); assert.equal(result.cursor.version, 2);
});
test("a later item arrives while prior canonical key remains suppressed", async () => {
  const first = await admitSetOfFeedArrivals({ feeds: [FEED], cursor: loadCursor("/nonexistent/cursor.json"), io: fetcherFor(`<rss><channel>${rssItem({ title: "Alpha", link: "https://example.test/alpha" })}</channel></rss>`), now: fixedNow });
  const second = await admitSetOfFeedArrivals({ feeds: [FEED], cursor: first.cursor, io: fetcherFor(`<rss><channel>${rssItem({ title: "Beta", link: "https://example.test/beta" })}${rssItem({ title: "Alpha", link: "https://example.test/alpha" })}</channel></rss>`), now: fixedNow });
  assert.equal(second.events.length, 1); assert.equal(second.events[0].data.item.title, "Beta");
});
test("provider summary bounding remains outside the portable carrier", () => { const truncated = boundSummary("x".repeat(3000)); assert.ok(Buffer.byteLength(truncated, "utf8") <= 2048); assert.match(truncated, /… \[truncated\]$/u); });
test("feed directories are accepted in bare and wrapped form", () => { assert.equal(normalizeFeedList([{ id: "a", url: "https://example.test/a" }])[0].kind, "rss"); assert.equal(normalizeFeedList({ feeds: [{ id: "a", url: "https://example.test/a", kind: "atom" }] })[0].kind, "atom"); });
