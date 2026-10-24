// Convenience wrapper around collectColonyReport() that saves each report to
// a plain JSON file and can read back the most recent one. No providers are
// wired in by default; callers pass whichever provider objects they have.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { COLONY_ACTOR, COLONY_REPORT_TEAM_ACTOR, collectColonyReport } from "./colony-report.mjs";

// collectColonyReport()'s own Metric shape (`{ id, label, amount, unit, ...extra }`)
// doesn't carry `domain`/`kind`/`displayOrder` — fields the ColonyCivicIntervalReport
// contract requires (see @coesite-operations/union-report-team's collectUnionReport(),
// which groups metrics by `{ id, label, unit, domain, kind, displayOrder }` and sorts
// the aggregated result by `displayOrder`, so an undefined value there would either
// throw digesting the group key or break the final sort). This derives those three
// fields for each raw metric: `domain` from the "events-by-domain/<domain>" id when
// present, else the catch-all "operations" domain (a real DOMAINS member, used for
// every cross-cutting/summary metric that isn't about one specific domain); `kind`
// is "stock" exactly when the metric carries the stock-only `status` field that
// colony-report.mjs's own metric() attaches, else "flow"; `displayOrder` is each
// metric's position in collectColonyReport()'s own deterministic emission order.
function civicMetric(rawMetric, displayOrder) {
  const domain = rawMetric.id.startsWith("events-by-domain/") ? rawMetric.id.slice("events-by-domain/".length) : "operations";
  const kind = rawMetric.status !== undefined ? "stock" : "flow";
  return { ...rawMetric, domain, kind, displayOrder };
}

const DEFAULT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "data");

// The `identifyJsonSemanticContent` digest is objectKind-bound: hashing the
// same value under two different objectKind strings produces two different
// ids. `@coesite-operations/union-report-team`'s `collectUnionReport()`
// re-derives each admitted colony report's `reportDigest`/`cursorDigest`
// itself, hashed under its own fixed objectKind, `"union-report.record"`
// (see its `src/union-report.mjs`), and refuses any colony report whose
// digest doesn't match that recomputation. So a colony report only round-
// trips as "accepted" by that subscriber if it was digest-bound under the
// exact same objectKind — hence the default below.
function digest(value, objectKind = "union-report.record") {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
}

function fileNameFor(recordedAt) {
  return `${recordedAt.replace(/[:.]/gu, "-")}.json`;
}

/** Collects a report and writes it to `dir` as a timestamped JSON file. */
export async function collectAndSaveColonyReport({ window, recordedAt, providers = [], dir = DEFAULT_DIR }) {
  const report = await collectColonyReport({ window, recordedAt, providers });
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fileNameFor(report.recordedAt)), JSON.stringify(report, null, 2));
  return report;
}

/**
 * Wraps collectColonyReport() into the digest-bound `ColonyCivicIntervalReport`
 * contract shape expected by contracted colony-report subscribers (e.g. the
 * `DEFAULT_COLONY_SUBSCRIPTIONS` entry in
 * `@coesite-operations/union-report-team`'s `default-union-report.mjs`,
 * mirroring the sibling `@causeway-services/turntide-islands-colony-report-team`
 * package's `collectTTIColonyReport`): one report naming this colony's and
 * this report team's actor identity, with a digest-bound replay cursor, plus
 * the aggregated events/stocks/metrics from `collectColonyReport`.
 */
export async function collectBareCedarFogColonyReport({ window, recordedAt, providers = [], digestObjectKind = "union-report.record" }) {
  const report = await collectColonyReport({ window, recordedAt, providers });
  // Echo the caller's own `window` object verbatim (not `report.window`,
  // which `collectColonyReport`'s `reportingWindow()` normalizes down to
  // just `{ fromExclusive, toInclusive }`, dropping any other fields such as
  // a `baseline` flag). Callers like `@coesite-operations/union-report-team`
  // digest-compare this report's `window` against the exact window object
  // they passed in, so silently dropping fields here would always fail that
  // comparison.
  const cursorBody = {
    type: "BareCedarFogColonyReportReplayCursor",
    version: 1,
    window,
    responseDigests: report.responses.map((response) => digest(response, digestObjectKind)).sort(),
  };
  const cursor = { ...cursorBody, cursorDigest: digest(cursorBody, digestObjectKind) };
  const body = {
    type: "ColonyCivicIntervalReport",
    schemaVersion: 1,
    actor: COLONY_REPORT_TEAM_ACTOR,
    colonyActor: COLONY_ACTOR,
    colonyKind: "bare-cedar-fog",
    recordedAt: report.recordedAt,
    window,
    cursor,
    responses: report.responses,
    events: report.events,
    stocks: report.stocks,
    metrics: report.metrics.map((rawMetric, index) => civicMetric(rawMetric, index)),
    coverage: { admitted: report.coverage.providers, accepted: report.coverage.ok, refused: report.coverage.failed },
  };
  return { ...body, reportDigest: digest(body, digestObjectKind) };
}

/** Reads the most recently saved report from `dir`, or null if there is none. */
export async function readLatestColonyReport({ dir = DEFAULT_DIR } = {}) {
  let files;
  try {
    files = await readdir(dir);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const reportFiles = files.filter((name) => name.endsWith(".json")).sort();
  if (reportFiles.length === 0) return null;
  const contents = await readFile(join(dir, reportFiles.at(-1)), "utf8");
  return JSON.parse(contents);
}
