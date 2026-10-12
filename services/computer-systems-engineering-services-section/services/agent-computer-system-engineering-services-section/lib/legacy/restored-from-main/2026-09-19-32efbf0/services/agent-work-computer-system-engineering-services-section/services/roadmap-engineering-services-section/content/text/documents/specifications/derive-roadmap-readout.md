# derive-roadmap-readout
## Requirements
- `cells-by-parent`: The operation groups the dispatch's `frontier` items by their declared `parent` cell (endeavor, campaign, project, or plan) into one readout cell per parent, each carrying its member items and its own ready/blocked/done counts.
- `horizon-by-composition`: The operation reads each item's modality and horizon by composing `@red-cup-engineering/classify-work-demand-service`'s `classifyWorkDemand` over the item's `scope` and `text`, then the founder's corner rule (Process/both-closed -> Determined/Now, Derivation/Delta-only -> Necessary/Soon, Procedure/sigma-only -> Possible/Later, Inquiry/neither -> Impossible-now/Eventually); it never reads or guesses a horizon from prose directly.
- `ready-blocked-from-item-state`: An item is `blocked` when its `structural.blockers` is non-empty, its `structural.state` (or `state`) is `"blocked"`, or its `coordination.state` is not `"clear"`; otherwise it is `ready`.
- `done-from-dispatch-count`: The readout's total `done` is the dispatch's own `done` count (a discharged item never appears in `frontier`, so `done` cannot be read from frontier items themselves); no discharge is invented or guessed at the item level.
- `money-from-ledger-only`: A `money` field appears in the readout only from the given `ledger` input; the operation never derives money from `dispatch` or `registry`.
- `stdout-only`: The operation returns a value; it performs no filesystem write of any kind. Its README states why: roadmaps are readouts, derived on demand, never a stored file (2026-09-06 ruling).
## Prohibitions
- `no-frontier-refusal`: The operation must refuse a request whose `dispatch.frontier` is not an array.
- `no-persistence`: The operation must never write its result, or any part of it, to a filesystem path; it is a pure transform from `{dispatch, ledger?, registry?}` to one `RoadmapReadout` value.
- `no-duplicate-scopes`: The operation must not emit two rows for the same `scope`; a repeated scope in `frontier` is read once.
## Laws
- `roadmaps-are-derived` | Roadmaps are derived from journaled work, never handwritten (ruling 2026-09-06) | v1 | lib/emsenn/services/561-group/services/561-group-services-section/data/records/2026-09-06-ruling-roadmaps-are-derived-from-journaled-work-never-handwritten.json | Applies to the whole operation. | A roadmap is a readout produced by an engineering service and derived from real tasks in the work journals; temporal state is never written into a permanent file.
- `work-orchestration-modality-horizon-force` | Work orchestration by modality, horizon, and force | v1 | lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/09/04/2026-09-04-note-on-work-orchestration-by-modality-horizon-and-force.md | Applies to the horizon-by-composition requirement's corner rule. | A work record's horizon is derived from its modality by the founder's rule and never stored as an independent field that can drift.
- `nuclear-quartet-work-types` | Skillful-work quartet (Nuclear Quartet Theorem) | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/agent-work-computer-system-engineering-services-section/content/text/documents/articles/specifications/skillful-work.md | Applies to the classify-work-demand composition. | Inquiry is the raw algebra, Procedure is Fix(sigma) meaning-closed, Derivation is Fix(delta) execution-closed, Process is both closed; the corner names the modality and horizon this operation reads.
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/README.md | Applies to the shared examples projected to the JSNode import and command faces. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
- `metroplat-agent-work-dispatch-schema` | metroplat.agent-work.dispatch-settlement (agent-work-dispatch) | v1 | https://ops.561.group/mcp | Applies to the shape of the `dispatch` input this operation reads. | The operation reads exactly the settlement's own fields (agents, blocked, coordination, date, done, evidence, feed, frontier, kind, malformed, policy, queue, ready, sourceRows, subject) and invents none of its own.
## Open questions
- `deeper-than-immediate-parent` [nonblocking]: "Cells grouped by parent (endeavor/campaign/project)" could mean the full ancestor chain up to a named level, not only the item's immediate declared `parent`; the dispatch settlement does not carry the ancestor chain per item (only a count of `sourceRows`), so this operation groups by the immediate `parent` field alone. Resolution blocked by: `agent-work-dispatch` carrying each item's full ancestor chain, or a founder ruling that immediate parent is the intended cell.
- `registry-rows-unused` [nonblocking]: `registry` rows are accepted and passed through verbatim but not yet folded into any cell (no requirement named what a registry row should change in a cell). Resolution blocked by: a founder ruling naming what a registry row contributes to a cell.
## Package
```json
{"packageName":"@red-cup-engineering/derive-roadmap-readout-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/classify-work-demand-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-roadmap-readout.mjs
#!/usr/bin/env node
import { classifyWorkDemand } from "@red-cup-engineering/classify-work-demand-service";

const HORIZON_BY_WORK_TYPE = Object.freeze({
  Process: Object.freeze({ modality: "determined", horizon: "now" }),
  Derivation: Object.freeze({ modality: "necessary", horizon: "soon" }),
  Procedure: Object.freeze({ modality: "possible", horizon: "later" }),
  Inquiry: Object.freeze({ modality: "impossible-now", horizon: "eventually" }),
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
  if (process.argv.includes("--help")) {
    process.stdout.write("deriveRoadmapReadout — Derives one RoadmapReadout from the work rail's agent-work-dispatch settlement: frontier items grouped by their declared `parent` cell, each carrying a horizon and modality read by composing classify-work-demand's skillful-work quartet over the item's own scope and text (the founder's corner rule: Process/both-closed -> Determined/Now, Derivation/Delta-only -> Necessary/Soon, Procedure/sigma-only -> Possible/Later, Inquiry/neither -> Impossible-now/Eventually) rather than guessed from prose, with ready and blocked read from the item's own structural and coordination state, done taken as the dispatch's own derived count since a discharged item never appears in `frontier`, and money rows taken only from `ledger` since this operation writes and stores nothing.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(deriveRoadmapReadout(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-roadmap-readout.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveRoadmapReadout } from "../scripts/derive-roadmap-readout.mjs";

function frontierItem(overrides) {
  return {
    agent: "a1", office: "eo", status: "open", state: "ready", standing: "held",
    structural: { blockers: [], state: "ready" }, coordination: { state: "clear" },
    reasons: [], conflicts: [], intent: "i", level: "task", passive: "a1", via: "office",
    ...overrides,
  };
}

test("frontier items group by parent, each with a derived horizon and modality", () => {
  const dispatch = {
    kind: "metroplat.agent-work.dispatch-settlement", subject: "agent-work-dispatch", date: "2026-09-06",
    policy: "declared-duty-with-structural-and-coordination-readiness", agents: [], coordination: "clear",
    coordinationCost: 0, evidence: [], feed: "daily-claim-sessions", malformed: 0, queue: [],
    ready: 2, blocked: 1, done: 0, sourceRows: 10,
    frontier: [
      frontierItem({ scope: "task:exact-deps-lib-x", parent: "plan:2026-09-03-core-stability", text: "pin exact" }),
      frontierItem({ scope: "task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93", parent: "project:the-roadmap-engine-test-thread", text: "the first counterparty test edge" }),
      frontierItem({ scope: "task:2026-09-06-0335-shipped-x", parent: "project:the-roadmap-engine-test-thread", text: "the unit shipped", state: "blocked", structural: { blockers: ["dep:x"], state: "blocked" } }),
    ],
  };
  const readout = deriveRoadmapReadout({ dispatch });
  assert.equal(readout.kind, "RoadmapReadout");
  assert.equal(readout.cells.length, 2);
  const plan = readout.cells.find((c) => c.cell === "plan:2026-09-03-core-stability");
  assert.equal(plan.items[0].workType, "Process");
  assert.equal(plan.items[0].modality, "determined");
  assert.equal(plan.items[0].horizon, "now");
  const project = readout.cells.find((c) => c.cell === "project:the-roadmap-engine-test-thread");
  assert.equal(project.items.length, 2);
  assert.equal(project.items[0].horizon, "eventually");
  assert.equal(project.ready, 1);
  assert.equal(project.blocked, 1);
  assert.deepEqual(readout.totals, { ready: 2, blocked: 1, done: 0 });
});

test("a repeated scope in frontier is read once", () => {
  const dispatch = { frontier: [frontierItem({ scope: "task:x", parent: "plan:p", text: "t" }), frontierItem({ scope: "task:x", parent: "plan:p", text: "t" })], ready: 1, blocked: 0, done: 0, date: "2026-09-06" };
  const readout = deriveRoadmapReadout({ dispatch });
  assert.equal(readout.cells[0].items.length, 1);
});

test("money comes only from ledger, never from dispatch or registry", () => {
  const dispatch = { frontier: [], ready: 0, blocked: 0, done: 3, date: "2026-09-06" };
  const readout = deriveRoadmapReadout({ dispatch, ledger: { rows: [{ account: "cash", amount: 100 }] }, registry: [{ name: "x" }] });
  assert.deepEqual(readout.money, { source: "ledger", rows: [{ account: "cash", amount: 100 }] });
  assert.deepEqual(readout.registry, [{ name: "x" }]);
  assert.equal(readout.totals.done, 3);
});

test("no ledger means no money rows", () => {
  const dispatch = { frontier: [], ready: 0, blocked: 0, done: 0, date: "2026-09-06" };
  const readout = deriveRoadmapReadout({ dispatch });
  assert.deepEqual(readout.money, { source: "none", rows: [] });
});

test("refuses a dispatch without a frontier array", () => {
  assert.throws(() => deriveRoadmapReadout({ dispatch: {} }), /dispatch\.frontier is required/u);
});
```
## Examples
```json name="frontier items group by parent, each with a derived horizon and modality"
{"input":{"dispatch":{"kind":"metroplat.agent-work.dispatch-settlement","subject":"agent-work-dispatch","date":"2026-09-06","policy":"declared-duty-with-structural-and-coordination-readiness","agents":[],"coordination":"clear","coordinationCost":0,"evidence":[],"feed":"daily-claim-sessions","malformed":0,"queue":[],"ready":2,"blocked":1,"done":0,"sourceRows":10,"frontier":[{"agent":"a1","office":"eo","status":"open","state":"ready","standing":"held","structural":{"blockers":[],"state":"ready"},"coordination":{"state":"clear"},"reasons":[],"conflicts":[],"intent":"i","level":"task","passive":"a1","via":"office","scope":"task:exact-deps-lib-x","parent":"plan:2026-09-03-core-stability","text":"pin exact"},{"agent":"a1","office":"eo","status":"open","state":"ready","standing":"held","structural":{"blockers":[],"state":"ready"},"coordination":{"state":"clear"},"reasons":[],"conflicts":[],"intent":"i","level":"task","passive":"a1","via":"office","scope":"task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93","parent":"project:the-roadmap-engine-test-thread","text":"the first counterparty test edge"},{"agent":"a1","office":"eo","status":"open","state":"blocked","standing":"held","structural":{"blockers":["dep:x"],"state":"blocked"},"coordination":{"state":"clear"},"reasons":[],"conflicts":[],"intent":"i","level":"task","passive":"a1","via":"office","scope":"task:2026-09-06-0335-shipped-x","parent":"project:the-roadmap-engine-test-thread","text":"the unit shipped"}]}},"output":{"kind":"RoadmapReadout","date":"2026-09-06","cells":[{"cell":"plan:2026-09-03-core-stability","items":[{"scope":"task:exact-deps-lib-x","parent":"plan:2026-09-03-core-stability","text":"pin exact","state":"ready","workType":"Process","modality":"determined","horizon":"now"}],"ready":1,"blocked":0,"done":0},{"cell":"project:the-roadmap-engine-test-thread","items":[{"scope":"task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93","parent":"project:the-roadmap-engine-test-thread","text":"the first counterparty test edge","state":"ready","workType":"Inquiry","modality":"impossible-now","horizon":"eventually"},{"scope":"task:2026-09-06-0335-shipped-x","parent":"project:the-roadmap-engine-test-thread","text":"the unit shipped","state":"blocked","workType":"Inquiry","modality":"impossible-now","horizon":"eventually"}],"ready":1,"blocked":1,"done":0}],"totals":{"ready":2,"blocked":1,"done":0},"money":{"source":"none","rows":[]},"registry":[]}}
```
```json name="money comes only from ledger; an empty dispatch still reports the dispatch's own done count"
{"input":{"dispatch":{"frontier":[],"ready":0,"blocked":0,"done":3,"date":"2026-09-06"},"ledger":{"rows":[{"account":"cash","amount":100}]}},"output":{"kind":"RoadmapReadout","date":"2026-09-06","cells":[],"totals":{"ready":0,"blocked":0,"done":3},"money":{"source":"ledger","rows":[{"account":"cash","amount":100}]},"registry":[]}}
```
## Traceability
- `cells-by-parent` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `metroplat-agent-work-dispatch-schema`, `admitted-example-face-equivalence`, `node-esm-operation`
- `horizon-by-composition` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `work-orchestration-modality-horizon-force`, `nuclear-quartet-work-types`, `node-esm-operation`
- `ready-blocked-from-item-state` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `metroplat-agent-work-dispatch-schema`, `node-esm-operation`
- `done-from-dispatch-count` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `roadmaps-are-derived`, `node-esm-operation`
- `money-from-ledger-only` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `roadmaps-are-derived`, `node-esm-operation`
- `stdout-only` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `roadmaps-are-derived`, `node-esm-operation`
- `no-frontier-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `metroplat-agent-work-dispatch-schema`, `node-esm-operation`
- `no-persistence` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `roadmaps-are-derived`, `node-esm-operation`
- `no-duplicate-scopes` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `metroplat-agent-work-dispatch-schema`, `node-esm-operation`
