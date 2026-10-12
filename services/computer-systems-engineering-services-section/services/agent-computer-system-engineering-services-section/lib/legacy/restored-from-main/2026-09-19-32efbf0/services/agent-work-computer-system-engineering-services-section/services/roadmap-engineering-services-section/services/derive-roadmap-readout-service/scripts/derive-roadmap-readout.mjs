#!/usr/bin/env node
import { classifyWorkDemand } from "@red-cup-engineering/classify-work-demand-service";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const HORIZON_BY_WORK_TYPE = Object.freeze({
  process: Object.freeze({ modality: "determined", horizon: "now" }),
  derivation: Object.freeze({ modality: "necessary", horizon: "soon" }),
  procedure: Object.freeze({ modality: "possible", horizon: "later" }),
  inquiry: Object.freeze({ modality: "impossible-now", horizon: "eventually" }),
});

// A dispatch item is undischarged by construction (frontier lists open
// duties only), so "done" is never true at the item level here; the total
// done count is taken from the dispatch's own derived count instead.
function stateOf(item) {
  const blockers = item?.structural?.blockers;
  const structurallyBlocked = Array.isArray(blockers) && blockers.length > 0;
  const structuralState = item?.structural?.state ?? item?.state;
  const coordinationClear = (item?.coordination?.state ?? "clear") === "clear";
  if (structurallyBlocked || structuralState === "blocked" || !coordinationClear) return "blocked";
  return "ready";
}

/**
 * Derives one RoadmapReadout from the work rail's agent-work-dispatch
 * settlement: frontier items grouped by their declared `parent` cell, each
 * carrying a horizon and modality read by composing classify-work-demand's
 * skillful-work quartet over the item's own scope and text (the founder's
 * corner rule: Process/both-closed -> Determined/Now, Derivation/Delta-only
 * -> Necessary/Soon, Procedure/sigma-only -> Possible/Later, Inquiry/neither
 * -> Impossible-now/Eventually) rather than guessed from prose, with ready
 * and blocked read from the item's own structural and coordination state,
 * done taken as the dispatch's own derived count since a discharged item
 * never appears in `frontier`, and money rows taken only from `ledger`
 * since this operation writes and stores nothing.
 * @param {object} request
 * @param {object} request.dispatch An agent-work-dispatch settlement: `{agents,
 *   blocked, coordination, date, done, evidence, feed, frontier[{agent,
 *   conflicts, coordination, intent, level, office, parent, passive, reasons,
 *   scope, standing, state, status, structural, text, via}], kind, malformed,
 *   policy, queue, ready, sourceRows, subject}`.
 * @param {object} [request.ledger] A read-ledger-report-service register result.
 * @param {object[]} [request.registry] Optional registry rows, passed through.
 * @returns {object} `{kind: "RoadmapReadout", date, cells:[{cell, items:[{scope,
 *   parent, text, state, workType, modality, horizon}], ready, blocked, done}],
 *   totals: {ready, blocked, done}, money, registry}`.
 * @throws {TypeError} When `dispatch.frontier` is not an array.
 */
export function deriveRoadmapReadout(request) {
  const dispatch = request?.dispatch;
  if (!dispatch || !Array.isArray(dispatch.frontier)) throw new TypeError("dispatch.frontier is required");
  const byParent = new Map();
  const seen = new Set();
  for (const item of dispatch.frontier) {
    if (typeof item?.scope !== "string" || seen.has(item.scope)) continue;
    seen.add(item.scope);
    const parent = typeof item.parent === "string" ? item.parent : "unparented";
    const state = stateOf(item);
    const demand = classifyWorkDemand({ scope: item.scope, text: item.text ?? "" });
    const { modality, horizon } = HORIZON_BY_WORK_TYPE[demand.workType];
    const row = { scope: item.scope, parent, text: item.text ?? null, state, workType: demand.workType, modality, horizon };
    const group = byParent.get(parent) ?? { cell: parent, items: [], ready: 0, blocked: 0, done: 0 };
    group.items.push(row);
    if (state === "ready") group.ready += 1; else group.blocked += 1;
    byParent.set(parent, group);
  }
  const cells = [...byParent.values()].sort((a, b) => a.cell.localeCompare(b.cell));
  const totals = {
    ready: typeof dispatch.ready === "number" ? dispatch.ready : cells.reduce((n, c) => n + c.ready, 0),
    blocked: typeof dispatch.blocked === "number" ? dispatch.blocked : cells.reduce((n, c) => n + c.blocked, 0),
    done: typeof dispatch.done === "number" ? dispatch.done : 0,
  };
  const ledger = request.ledger ?? null;
  const money = ledger ? { source: "ledger", rows: Array.isArray(ledger?.rows) ? ledger.rows : ledger } : { source: "none", rows: [] };
  const registry = Array.isArray(request?.registry) ? request.registry : [];
  return { kind: "RoadmapReadout", date: dispatch.date ?? null, cells, totals, money, registry };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-roadmap-readout", description: "Derives one RoadmapReadout from the work rail's agent-work-dispatch settlement: frontier items grouped by their declared `parent` cell, each carrying a horizon and modality read by composing classify-work-demand's skillful-work quartet over the item's own scope and text (the founder's corner rule: Process/both-closed -> Determined/Now, Derivation/Delta-only -> Necessary/Soon, Procedure/sigma-only -> Possible/Later, Inquiry/neither -> Impossible-now/Eventually) rather than guessed from prose, with ready and blocked read from the item's own structural and coordination state, done taken as the dispatch's own derived count since a discharged item never appears in `frontier`, and money rows taken only from `ledger` since this operation writes and stores nothing.", operation: deriveRoadmapReadout }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
