import assert from "node:assert/strict";
import test from "node:test";
import { webSubPublication, webSubLinkHeader } from "../src/purchase-publication.mjs";

test("webSubPublication admits updates and derives eventIds", () => {
  const publication = webSubPublication({
    topic: "https://example.test/topic",
    hub: "https://example.test/hub",
    self: "https://example.test/self",
    updates: [["e1", "a1", "v1", "2026-09-11T00:00:00Z"]],
  });
  assert.equal(publication.kind, "websub.publication");
  assert.equal(publication.eventIds.length, 1);
  assert.equal(publication.contentType, "application/eavt+jsonl; charset=utf-8");
});

test("webSubLinkHeader forms the RFC 8288 hub/self Link field", () => {
  const header = webSubLinkHeader({ hub: "https://example.test/hub", self: "https://example.test/self" });
  assert.equal(header, '<https://example.test/hub>; rel="hub", <https://example.test/self>; rel="self"');
});
