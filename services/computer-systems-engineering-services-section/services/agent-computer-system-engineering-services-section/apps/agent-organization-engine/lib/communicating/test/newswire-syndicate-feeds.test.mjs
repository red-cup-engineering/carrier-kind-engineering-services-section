import assert from "node:assert/strict";
import test from "node:test";
import { parseFeed } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/web-feed";
import { admitSyndicateRoutes, projectSyndicateFeeds, syndicateFeedSnapshot } from "../src/messaging/newswire/syndicate-feeds.mjs";

const observedAt = "2026-09-28T12:00:00.000Z";
const sources = [
  { id: "science", url: "https://science.example/feed.xml", kind: "rss" },
  { id: "city", url: "https://city.example/feed.xml", kind: "rss" },
];
const destinations = [
  { id: "combined", format: "rss", title: "Combined wire", homePageUrl: "https://wire.example/", feedUrl: "https://wire.example/all.xml", sourceFeedIds: ["science", "city"] },
  { id: "science-atom", format: "atom", title: "Science wire", homePageUrl: "https://wire.example/", feedUrl: "https://wire.example/science.atom", sourceFeedIds: ["science"] },
  { id: "city-json", format: "json", title: "City wire", homePageUrl: "https://wire.example/", feedUrl: "https://wire.example/city.json", sourceFeedIds: ["city"] },
];

test("many source feeds project to many syndicate feeds with original links and provenance", async () => {
  const documents = new Map([
    [sources[0].url, '<rss><channel><item><guid>science-one</guid><title>Shared report</title><link>https://source.example/shared</link><description>Source summary</description><dc:creator>Research office</dc:creator><category>Science</category><pubDate>Sun, 27 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>'],
    [sources[1].url, '<rss><channel><item><guid>city-one</guid><title>Shared report</title><link>https://source.example/shared</link><description>Second feed summary</description><pubDate>Sun, 27 Sep 2026 10:00:00 GMT</pubDate></item><item><guid>city-two</guid><title>Local filing</title><link>https://city.example/filing</link></item></channel></rss>'],
  ]);
  const fetched = [];
  const result = await syndicateFeedSnapshot({
    sources, destinations, observedAt,
    io: { fetchImpl: async (url) => {
      fetched.push(url);
      return { ok: true, status: 200, text: async () => documents.get(url) };
    } },
  });
  assert.deepEqual(fetched, sources.map((source) => source.url));
  assert.equal(result.feeds.length, 3);
  const combined = result.feeds[0];
  assert.equal(combined.items.length, 2);
  assert.deepEqual(combined.items.find((item) => item.url === "https://source.example/shared").sourceFeedIds, ["science", "city"]);
  assert.equal(combined.items.find((item) => item.url === "https://source.example/shared").arrivalIds.length, 2);
  assert.deepEqual(parseFeed(combined.body).map((item) => item.url).sort(), ["https://city.example/filing", "https://source.example/shared"]);
  assert.match(combined.body, /<dc:creator>Research office<\/dc:creator>/u);
  assert.doesNotMatch(combined.body, /<pubDate>[^<]*<\/pubDate>\s*<\/item>\s*<item>/u);
  assert.match(result.feeds[1].body, /<feed xmlns="http:\/\/www.w3.org\/2005\/Atom"/u);
  assert.equal(JSON.parse(result.feeds[2].body).items.length, 2);
});

test("unknown route source is refused before projection", () => {
  assert.throws(() => admitSyndicateRoutes({ sources, destinations: [{ ...destinations[0], sourceFeedIds: ["missing"] }] }), /unknown source feed/u);
});

test("an unadmitted source arrival cannot become a syndicate item", () => {
  const routes = admitSyndicateRoutes({ sources, destinations });
  assert.throws(() => projectSyndicateFeeds({ routes, arrivals: [{ type: "assertive" }], observedAt }), /cloud|event|specversion|object/u);
});
