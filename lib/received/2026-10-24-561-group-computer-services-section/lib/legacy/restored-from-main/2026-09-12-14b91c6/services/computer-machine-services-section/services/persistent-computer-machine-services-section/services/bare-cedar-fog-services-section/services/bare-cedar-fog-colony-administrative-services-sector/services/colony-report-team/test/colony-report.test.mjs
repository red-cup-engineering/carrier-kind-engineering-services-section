import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { COLONY_ACTOR, COLONY_REPORT_TEAM_ACTOR, collectColonyReport, reportingWindow, sumDecimals } from "../src/colony-report.mjs";
import { collectAndSaveColonyReport, collectBareCedarFogColonyReport, readLatestColonyReport } from "../src/default-colony-report.mjs";

const window = { fromExclusive: "2026-07-19T20:00:00.000Z", toInclusive: "2026-07-19T21:00:00.000Z" };

test("reportingWindow rejects a window that does not increase", () => {
  assert.throws(() => reportingWindow({ fromExclusive: "2026-07-19T21:00:00.000Z", toInclusive: "2026-07-19T20:00:00.000Z" }), TypeError);
});

test("sumDecimals adds exact decimal strings without floating-point error", () => {
  assert.equal(sumDecimals(["0.1", "0.2"]), "0.3");
  assert.equal(sumDecimals(["10", "-3", "0.5"]), "7.5");
});

test("collects events and stocks from an accepted provider and computes metrics", async () => {
  const provider = {
    name: "test-provider",
    collect: async () => ({
      events: [{
        id: "urn:event:1", occurredAt: "2026-07-19T20:30:00.000Z", domain: "contracts",
        kind: "contract-awarded", summary: "One contract was awarded.", outcome: "succeeded",
        evidence: ["urn:evidence:1"], quantities: [{ label: "Contracts awarded", amount: "1", unit: "contracts" }],
      }],
      stocks: [{ id: "contracts-open", observedAt: window.toInclusive, domain: "contracts", label: "Open contracts", amount: "4", unit: "contracts", status: "observed" }],
      unsupportedDomains: ["economy"],
    }),
  };
  const report = await collectColonyReport({ window, recordedAt: window.toInclusive, providers: [provider] });
  assert.equal(report.coverage.ok, 1);
  assert.equal(report.events.length, 1);
  assert.equal(report.events[0].provider, "test-provider");
  assert.equal(report.metrics.find((item) => item.id === "events-by-domain/contracts").amount, "1");
  assert.equal(report.metrics.find((item) => item.id.startsWith("stock/")).amount, "4");
  assert.equal(report.metrics.find((item) => item.id === "quantity/test-provider/Contracts awarded").amount, "1");
});

test("a provider that throws is recorded as a failure without breaking the report", async () => {
  const provider = { name: "flaky-provider", collect: async () => { throw new Error("upstream unavailable"); } };
  const report = await collectColonyReport({ window, recordedAt: window.toInclusive, providers: [provider] });
  assert.equal(report.coverage.failed, 1);
  assert.equal(report.responses[0].status, "error");
  assert.match(report.responses[0].reason, /upstream unavailable/u);
});

test("rejects an event outside the reporting window", async () => {
  const provider = {
    name: "bad-clock",
    collect: async () => ({
      events: [{ id: "urn:event:late", occurredAt: "2026-07-19T22:00:00.000Z", domain: "work", kind: "work", summary: "Too late.", outcome: "observed" }],
      stocks: [],
    }),
  };
  const report = await collectColonyReport({ window, recordedAt: window.toInclusive, providers: [provider] });
  assert.equal(report.coverage.failed, 1);
  assert.match(report.responses[0].reason, /outside the reporting window/u);
});

test("rejects an event with an unknown domain", async () => {
  const provider = {
    name: "bad-domain",
    collect: async () => ({
      events: [{ id: "urn:event:1", occurredAt: "2026-07-19T20:30:00.000Z", domain: "not-a-real-domain", kind: "work", summary: "s", outcome: "observed" }],
      stocks: [],
    }),
  };
  const report = await collectColonyReport({ window, recordedAt: window.toInclusive, providers: [provider] });
  assert.equal(report.coverage.failed, 1);
  assert.match(report.responses[0].reason, /unknown domain/u);
});

test("rejects duplicate provider names", async () => {
  const provider = { name: "dup", collect: async () => ({ events: [], stocks: [] }) };
  await assert.rejects(
    collectColonyReport({ window, recordedAt: window.toInclusive, providers: [provider, provider] }),
    TypeError,
  );
});

test("saves a report to disk and reads it back as the latest", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "colony-report-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const report = await collectAndSaveColonyReport({ window, recordedAt: window.toInclusive, providers: [], dir });
  const latest = await readLatestColonyReport({ dir });
  assert.deepEqual(latest, report);
});

test("readLatestColonyReport returns null when there is nothing saved yet", async () => {
  const dir = join(tmpdir(), `colony-report-missing-${Date.now()}`);
  assert.equal(await readLatestColonyReport({ dir }), null);
});

test("collectBareCedarFogColonyReport wraps a report in the digest-bound ColonyCivicIntervalReport contract", async () => {
  const report = await collectBareCedarFogColonyReport({ window, recordedAt: window.toInclusive, providers: [] });
  assert.equal(report.type, "ColonyCivicIntervalReport");
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.actor, COLONY_REPORT_TEAM_ACTOR);
  assert.equal(report.colonyActor, COLONY_ACTOR);
  assert.equal(report.cursor.version, 1);
  assert.deepEqual(report.window, window);
  assert.equal(typeof report.reportDigest, "string");
  assert.equal(typeof report.cursor.cursorDigest, "string");
  const { reportDigest, ...reportBody } = report;
  const { cursorDigest, ...cursorBody } = report.cursor;
  const second = await collectBareCedarFogColonyReport({ window, recordedAt: window.toInclusive, providers: [] });
  assert.deepEqual({ ...second, reportDigest: undefined, cursor: { ...second.cursor, cursorDigest: undefined } }, { ...reportBody, reportDigest: undefined, cursor: { ...cursorBody, cursorDigest: undefined } });
});
