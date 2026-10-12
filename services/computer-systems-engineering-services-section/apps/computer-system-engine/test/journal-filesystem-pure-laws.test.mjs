/** Unit coverage for the journal storage engine's pure laws: the event
 *  codec (event <-> EAVT row), head-index path arithmetic, and the
 *  territory read-through cache's ordering and signature-reuse behavior.
 *  None of these touch a filesystem effect -- every fixture here is an
 *  in-memory value or an injected function, never a real path. The
 *  effects those laws are computed against or written through live in
 *  `write-journal-store.mjs`, covered separately by the integration-style
 *  `journal-filesystem.test.mjs`/`journal-territory-cache.test.mjs`. */
import assert from "node:assert/strict";
import test from "node:test";

import { eventForRow, parseLegacyLineAsEvents, rowFromStatement } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/events";
import { headPath } from "@red-cup-engineering/computer-system-engine/journal/filesystem/heads";
import {
  clearTerritoryEventsCache,
  readThroughDateEvents,
  readThroughTerritoryEvents,

} from "@red-cup-engineering/computer-system-engine/journal/filesystem/territory-cache";

test.beforeEach(() => {
  clearTerritoryEventsCache();
});

// ── event codec round trip ──

test("eventForRow/rowFromStatement round-trip an EAVT row through its event payload", () => {
  const row = Object.freeze(["metroplat.pure-law", "attribute", { nested: "value" }, "2026-09-21T00:00:00.000Z"]);
  const event = eventForRow(row, "test:pure-law");
  assert.equal(event.observation.seat, "test:pure-law");
  assert.deepEqual(rowFromStatement(event), row);
});

test("eventForRow is deterministic: the same row and seat produce the same event address", () => {
  const row = Object.freeze(["e", "a", "v", "2026-09-21T00:00:00.000Z"]);
  const first = eventForRow(row, "test:pure-law");
  const second = eventForRow(row, "test:pure-law");
  assert.equal(first.id, second.id);
  assert.deepEqual(first, second);
});

test("rowFromStatement returns undefined for a statement whose payload is not an EAVT row", () => {
  const verdict = parseLegacyLineAsEvents("not valid jsonl eavt", "test:pure-law", "2026-09-21T00:00:00.000Z", "fixture:1")[0];
  assert.equal(rowFromStatement(verdict), undefined);
  assert.equal(verdict.observation.payload.kind, "metroplat.journal.inadmissibility-verdict");
});

test("parseLegacyLineAsEvents round-trips a legacy EAVT line back through eventForRow's own codec", () => {
  const row = ["legacy-entity", "legacy-attribute", "legacy-value", "2026-09-21T00:00:00.000Z"];
  const line = JSON.stringify(row);
  const [event] = parseLegacyLineAsEvents(line, "test:pure-law", "2026-09-21T00:00:00.000Z", "fixture:1");
  assert.deepEqual(rowFromStatement(event), eventForRow(row, "test:pure-law").observation.payload);
});

// ── head-index path arithmetic ──

test("headPath is a pure function of every argument: changing any one changes the path", () => {
  const base = headPath({ indexDirectory: "/data/root/data/state/log-state" }, "2026-09-21", "hook-sessions", "session-1");
  assert.equal(headPath({ indexDirectory: "/data/root/data/state/log-state" }, "2026-09-21", "hook-sessions", "session-1"), base);
  assert.notEqual(headPath({ indexDirectory: "/data/other-root/data/state/log-state" }, "2026-09-21", "hook-sessions", "session-1"), base);
  assert.notEqual(headPath({ indexDirectory: "/data/root/data/state/log-state" }, "2026-09-22", "hook-sessions", "session-1"), base);
  assert.notEqual(headPath({ indexDirectory: "/data/root/data/state/log-state" }, "2026-09-21", "other-namespace", "session-1"), base);
  assert.notEqual(headPath({ indexDirectory: "/data/root/data/state/log-state" }, "2026-09-21", "hook-sessions", "session-2"), base);
});

test("headPath addresses a JSON document under the namespace directory, named by the key's digest", () => {
  const path1 = headPath({ indexDirectory: "/data/root/data/state/log-state" }, "2026-09-21", "hook-sessions", "session-1");
  assert.match(path1, /\/heads\/2026-09-21\/hook-sessions\/[0-9a-f]{64}\.json$/u);
});

// ── territory ordering ──

test("readThroughTerritoryEvents folds discovered logs' events in the discovered log-path order", () => {
  const events = readThroughTerritoryEvents("/territory-root", {
    discoverLogPaths: () => ["/a.jsonl", "/b.jsonl", "/c.jsonl"],
    readLog: (logPath) => [`${logPath}#1`, `${logPath}#2`],
    territorySignature: () => "sig-1",
  });
  assert.deepEqual(events.events, ["/a.jsonl#1", "/a.jsonl#2", "/b.jsonl#1", "/b.jsonl#2", "/c.jsonl#1", "/c.jsonl#2"]);
  assert.deepEqual(events.logPaths, ["/a.jsonl", "/b.jsonl", "/c.jsonl"]);
});

test("readThroughDateEvents folds discovered logs' events in the discovered log-path order, uncached", () => {
  const events = readThroughDateEvents("/territory-root", {
    discoverLogPaths: () => ["/x.jsonl", "/y.jsonl"],
    readLog: (logPath) => [`${logPath}#event`],
  });
  assert.deepEqual(events.events, ["/x.jsonl#event", "/y.jsonl#event"]);
});

// ── cache signature ──

test("readThroughTerritoryEvents reuses the previous log-path discovery when the signature is unchanged", () => {
  let discoverCalls = 0;
  const source = (signature) => ({
    discoverLogPaths: () => { discoverCalls += 1; return ["/a.jsonl"]; },
    readLog: () => ["row"],
    territorySignature: () => signature,
  });
  readThroughTerritoryEvents("/same-root", source("sig-1"));
  readThroughTerritoryEvents("/same-root", source("sig-1"));
  readThroughTerritoryEvents("/same-root", source("sig-1"));
  assert.equal(discoverCalls, 1);
});

test("readThroughTerritoryEvents re-discovers once the signature changes", () => {
  let discoverCalls = 0;
  const source = (signature) => ({
    discoverLogPaths: () => { discoverCalls += 1; return ["/a.jsonl"]; },
    readLog: () => ["row"],
    territorySignature: () => signature,
  });
  readThroughTerritoryEvents("/same-root", source("sig-1"));
  readThroughTerritoryEvents("/same-root", source("sig-2"));
  assert.equal(discoverCalls, 2);
});

test("readThroughTerritoryEvents keys the cache by root, so two roots never share a discovery", () => {
  let discoverCalls = 0;
  const source = (root) => ({
    discoverLogPaths: () => { discoverCalls += 1; return [`${root}/a.jsonl`]; },
    readLog: () => ["row"],
    territorySignature: () => "same-signature-both-roots",
  });
  readThroughTerritoryEvents("/root-one", source("/root-one"));
  readThroughTerritoryEvents("/root-two", source("/root-two"));
  assert.equal(discoverCalls, 2);
});

test("clearTerritoryEventsCache forces the next call to re-discover even with an unchanged signature", () => {
  let discoverCalls = 0;
  const source = {
    discoverLogPaths: () => { discoverCalls += 1; return ["/a.jsonl"]; },
    readLog: () => ["row"],
    territorySignature: () => "sig-1",
  };
  readThroughTerritoryEvents("/cleared-root", source);
  clearTerritoryEventsCache();
  readThroughTerritoryEvents("/cleared-root", source);
  assert.equal(discoverCalls, 2);
});
