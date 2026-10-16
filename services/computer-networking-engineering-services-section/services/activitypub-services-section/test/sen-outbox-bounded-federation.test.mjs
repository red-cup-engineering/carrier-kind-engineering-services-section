import assert from "node:assert/strict";
import test from "node:test";
import { listAddressedSenOutbox } from "../src/sen-outbox-client.mjs";
import { projectSenActivity } from "../src/sen-activity.mjs";
import { identifyJsonDocument } from "../src/sen-json-document.mjs";
import { ACTIVITYSTREAMS_PUBLIC } from "../src/activitystreams.mjs";

const origin = "https://market.example";
const actor = origin + "/actors/market";
const outbox = actor + "/outbox";
const card = origin + "/.well-known/agent-card.json";
const recipient = "https://buyer.example/actors/buyer";
const read = (fetcher, overrides = {}) => listAddressedSenOutbox({
  outboxUrl: outbox, expectedActor: actor, expectedAgentCard: card,
  recipient, fetcher, ...overrides,
});
function offer(i) {
  return projectSenActivity({
    type: "Offer", origin, identifier: "market", recipient: ACTIVITYSTREAMS_PUBLIC,
    objectBytes: identifyJsonDocument({ type: "TestOffer", sequence: i }).bytes,
    agentCard: card, eventTime: "2026-10-16T18:00:00.000Z",
  });
}
function fixture(items, size = 12) {
  const pages = [];
  for (let i = 0; i < items.length; i += size) {
    const number = pages.length + 1, id = outbox + "?page=" + number;
    pages.push({
      id, type: "OrderedCollectionPage", partOf: outbox,
      orderedItems: items.slice(i, i + size),
      ...(i + size < items.length ? { next: outbox + "?page=" + (number + 1) } : {}),
    });
  }
  const collection = { id: outbox, type: "OrderedCollection", totalItems: items.length,
    ...(pages.length ? { first: pages[0].id } : { orderedItems: [] }),
  };
  const byUrl = new Map([[outbox, collection], ...pages.map(page => [page.id, page])]);
  const requests = [];
  const fetcher = async (url, init) => {
    requests.push(url);
    assert.equal(init.headers.accept, "application/activity+json");
    assert.equal(init.redirect, "error", "untrusted ActivityPub responses cannot follow HTTP redirects");
    const value = byUrl.get(url);
    return value ? Response.json(value) : new Response(null, { status: 404 });
  };
  return { fetcher, requests };
}
test("native SEN client reads 131 source-authored Offers from the real paginated ActivityPub market shape", async () => {
  const offers = Array.from({ length: 131 }, (_, i) => offer(i));
  const f = fixture(offers);
  const observed = await read(f.fetcher);
  assert.equal(observed.length, 131);
  assert.deepEqual(observed.map(entry => entry.activityId), offers.map(entry => entry.id));
  assert.equal(f.requests.length, 12);
  assert.equal(new Set(f.requests).size, f.requests.length);
});
test("a small original inline collection and an empty collection are both supported", async () => {
  const items = [offer(1), offer(2)];
  const observed = await read(async () => Response.json({ type: "OrderedCollection", orderedItems: items }));
  assert.equal(observed.length, 2);
  assert.deepEqual(await read(async () => Response.json({ type: "OrderedCollection", totalItems: 0 })), []);
  await assert.rejects(() => read(async () => Response.json({ type: "OrderedCollection", totalItems: 2 })),
    /no accessible first page/);
});
test("a malicious peer cannot send the reader to a different origin or loopback", async () => {
  for (const target of ["https://foreign.example/steal", "http://127.0.0.1/admin"]) {
    const calls = [];
    const fetcher = async url => { calls.push(url);
      return Response.json({ type: "OrderedCollection", first: target, totalItems: 131 }); };
    await assert.rejects(() => read(fetcher), /crosses its original source origin/);
    assert.deepEqual(calls, [outbox]);
  }
});
test("outbox pages with embedded credentials or fragments never cause a fetch", async () => {
  for (const target of ["https://user:pass@market.example/outbox", outbox + "?page=1#unsafe"]) {
    await assert.rejects(() => read(async () => Response.json({
      type: "OrderedCollection", totalItems: 1, first: target,
    })), /without credentials or fragments/);
  }
});
test("peer pages cannot spend unbounded attention or hide an incomplete denominator", async () => {
  const f = fixture(Array.from({ length: 131 }, (_, i) => offer(i)));
  await assert.rejects(() => read(f.fetcher, { maxPages: 3 }), /bounded page budget/);
  assert.equal(f.requests.length, 4, "the next page is never fetched after the budget runs out");
  const excess = fixture(Array.from({ length: 131 }, (_, i) => offer(i)));
  await assert.rejects(() => read(excess.fetcher, { maxActivities: 100 }), /bounded activity budget/);
});
test("exact source bytes are bounded before parsing a hostile streaming HTTP response", async () => {
  const huge = Response.json({ type: "OrderedCollection",
    orderedItems: [{ ...offer(1), padding: "X".repeat(25000) }],
  });
  await assert.rejects(() => read(async () => huge, { maxPageBytes: 512, maxTotalBytes: 1024 }),
    /bounded read-byte budget/);
});
test("one SEN activity repeated across two pages refuses double-counted evidence", async () => {
  const repeated = offer(1), f = fixture([repeated, repeated], 1);
  await assert.rejects(() => read(f.fetcher), /repeats activity/);
});
test("invalid budgets and mismatched actor origins refuse before transport", async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; throw new Error("unexpected request"); };
  await assert.rejects(() => read(fetcher, { maxPages: 0 }), /positive bounded integer/);
  await assert.rejects(() => read(fetcher, { maxPageBytes: 4096, maxTotalBytes: 512 }),
    /cannot be smaller than/);
  await assert.rejects(() => read(fetcher, { expectedActor: "https://other.example/actors/seller" }),
    /share one origin/);
  assert.equal(calls, 0);
});

test("non-HTTP loopback URLs cannot be smuggled into an ActivityPub page chain", async () => {
  for (const target of ["ftp://localhost/internal", "file:///tmp/forbidden", "http://market.example/unsafe"]) {
    await assert.rejects(() => read(async () => Response.json({
      type: "OrderedCollection", totalItems: 1, first: target,
    })), /without credentials or fragments/);
  }
});
