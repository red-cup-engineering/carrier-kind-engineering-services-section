/**
 * Settlement exchange: how two settlements converge by exchanging exact source artifacts (MetroPlat
 * architecture §7.4). A settlement tells what it holds (per daily feed, the witnesses it has
 * admitted); a peer answers with the admitted witnesses the other lacks, each carrying its own
 * causal source material, plus the referenced artifacts its observation names beyond that; the
 * receiver merges through the journal's one admission path, which re-derives every witness from its
 * observation, verifies every artifact against its content address, and holds a witness whose
 * causes have not arrived in quarantine until they do. Reception order does not matter: the union
 * of source sets rebuilds the same settlement.
 *
 * Arrival packets written beside a day's feeds are presentations, not journal artifacts, and do not
 * travel.
 */
import path from "node:path";
import { dataTierDirectory } from "@red-cup-engineering/eavt/data-artifact-address";
import { admitEvents, listDailyFeedsInternal, readArtifactSource, readEvents } from "./filesystem/write-journal-store.mjs";

const feedName = (root, logPath) => path.relative(root, logPath).split(path.sep).join("/");

function feedLabel(root, feed, date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(date) || typeof feed !== "string" || path.isAbsolute(feed)) {
    throw new TypeError("settlement exchange: feed requires a relative journal path and date");
  }
  const settlement = path.resolve(root);
  const resolved = path.resolve(settlement, feed);
  const basename = path.basename(resolved);
  const prefix = `${date}-admit-`;
  if (path.dirname(resolved) !== path.resolve(dataTierDirectory(settlement, "log", date))
    || feedName(settlement, resolved) !== feed || !basename.startsWith(prefix) || !basename.endsWith(".jsonl")) {
    throw new TypeError(`settlement exchange: feed ${feed} is not a journal feed of this settlement`);
  }
  const label = basename.slice(prefix.length, -".jsonl".length);
  if (!label) throw new TypeError("settlement exchange: feed label is empty");
  return label;
}

function allowed(root, feed, date, feedLabels) {
  const label = feedLabel(root, feed, date);
  return feedLabels === undefined || feedLabels.includes(label);
}

/** What a settlement holds on one date: per feed, the ids of its admitted witnesses. */
export function settlementHoldings(root, date, { feedLabels } = {}) {
  const feeds = {};
  for (const logPath of listDailyFeedsInternal(root, date)) {
    const name = feedName(root, logPath);
    if (allowed(root, name, date, feedLabels)) feeds[name] = readEvents(logPath).map((statement) => statement.id);
  }
  return Object.freeze({ kind: "metroplat.settlement.holdings", date, feeds });
}

/** The admitted witnesses of one date a peer's holdings lack, at most `limit` of them, with the
 *  artifacts their observations reference beyond their own sources. `remaining` counts the rest. */
export function settlementTransfer(root, date, peerHoldings, { limit = 500, feedLabels } = {}) {
  const feeds = {};
  let taken = 0;
  let remaining = 0;
  for (const logPath of listDailyFeedsInternal(root, date)) {
    const name = feedName(root, logPath);
    if (!allowed(root, name, date, feedLabels)) continue;
    const held = new Set(peerHoldings?.feeds?.[name] ?? []);
    const lacking = readEvents(logPath).filter((statement) => !held.has(statement.id));
    const statements = lacking.slice(0, Math.max(0, limit - taken));
    remaining += lacking.length - statements.length;
    if (statements.length === 0) continue;
    taken += statements.length;
    const carried = new Set(statements.flatMap((statement) => statement.sources.map((source) => source.ref)));
    const referenced = new Set(statements.flatMap((statement) => statement.observation.referencedArtifacts ?? []).filter((ref) => !carried.has(ref)));
    const artifacts = [...referenced].map((ref) => readArtifactSource(logPath, ref)).filter((artifact) => artifact !== undefined);
    feeds[name] = Object.freeze({ statements, artifacts });
  }
  return Object.freeze({ kind: "metroplat.settlement.transfer", date, feeds, remaining });
}

/** Merge a peer's transfer: every witness through the journal's admission, per feed. */
export function mergeSettlementTransfer(root, transfer, { feedLabels } = {}) {
  if (transfer?.kind !== "metroplat.settlement.transfer" || transfer.feeds === null || typeof transfer.feeds !== "object") {
    throw new TypeError("settlement exchange: not a settlement transfer");
  }
  const entries = Object.entries(transfer.feeds);
  // Check the entire transfer before admitting any witness.
  for (const [feed, material] of entries) {
    if (!allowed(root, feed, transfer.date, feedLabels)) throw new TypeError(`settlement exchange: feed ${feed} is not granted`);
    if (!Array.isArray(material?.statements) || !Array.isArray(material?.artifacts)) throw new TypeError(`settlement exchange: feed ${feed} carries no statements and artifacts`);
  }
  const receipts = {};
  for (const [feed, material] of entries) {
    const logPath = path.resolve(root, feed);
    const results = admitEvents(logPath, material.statements, material.artifacts);
    receipts[feed] = Object.freeze({
      received: results.length,
      admitted: results.filter((result) => result.admission === "admitted").length,
      quarantined: results.filter((result) => result.admission !== "admitted" && result.admission !== "blocked").length,
      blocked: results.filter((result) => result.admission === "blocked").length,
    });
  }
  return Object.freeze({ kind: "metroplat.settlement.merge", date: transfer.date, feeds: Object.freeze(receipts) });
}
