# allocate-attention-over-obstructions
## Requirements
- `feasible-greedy-selection`: Given obstructions, each with an id, a reconciliation cost, and a benefit (the held-contradiction mass reconciling it removes), and a budget, the operation returns an AttentionAllocation record: the selection built by greedy extension in descending benefit-per-cost order (ties by higher benefit, then ascending id), taking an obstruction only while the running cost stays within the budget, with the total cost, total benefit, the residual (universe benefit minus captured benefit), and the ordered read-next list of the selected ids.
- `feasibility-invariants`: The selection is always feasible (total cost at most the budget), the empty selection is what a zero budget yields with residual equal to the universe benefit, and every prefix of the selection is itself feasible.
## Prohibitions
- `malformed-request-refusal`: The operation must refuse a request whose obstructions is not an array, whose budget is not a non-negative integer, or that holds an obstruction without a string id and non-negative integer cost and benefit.
## Laws
- `attention-allocation` | Obsmetrologia, Cohomology/AttentionAllocation.lean (attention_allocation: Feasible, totalCost, totalBenefit, residual; empty_feasible, cost_monotone_cons, feasible_of_cons, feasible_extend, residual_antitone) | 2026-09-04 | lib/obsmetrologia/Obsmetrologia/Cohomology/AttentionAllocation.lean | Applies to the selection's invariants. | The empty selection is feasible with maximal residual; cost is monotone under extension and feasibility is downward closed; greedy extension within the remaining budget stays feasible and captures benefit; residual is antitone in captured benefit. The Lean proves these invariants, not optimality: the greedy order is this operation's policy, stated as such.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
- `obstruction-pricing` [nonblocking]: How a contested cell's cost and benefit are priced from the trace (certificate size, settling flux) is the next form; this operation takes them as given.
## Package
```json
{"packageName":"@red-cup-engineering/allocate-attention-over-obstructions-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/allocate-attention-over-obstructions.mjs
#!/usr/bin/env node
const isCount = (value) => Number.isInteger(value) && value >= 0;

/**
 * Selects obstructions to reconcile under an attention budget by greedy benefit-per-cost extension, reporting cost, benefit, residual, and the read-next order.
 * @param {object} request A record with obstructions ([{id, cost, benefit}]) and a budget.
 * @returns {object} An AttentionAllocation record.
 * @throws {TypeError} When obstructions, budget, or an obstruction is malformed.
 */
export function allocateAttentionOverObstructions(request) {
  if (!Array.isArray(request?.obstructions) || !isCount(request?.budget)) throw new TypeError("obstructions and a non-negative integer budget are required");
  for (const obstruction of request.obstructions) {
    if (typeof obstruction?.id !== "string" || !isCount(obstruction?.cost) || !isCount(obstruction?.benefit)) throw new TypeError("an obstruction needs a string id and non-negative integer cost and benefit");
  }
  const density = (o) => (o.cost === 0 ? Number.POSITIVE_INFINITY : o.benefit / o.cost);
  const ordered = [...request.obstructions].sort((x, y) => density(y) - density(x) || y.benefit - x.benefit || x.id.localeCompare(y.id));
  const selected = [];
  let cost = 0;
  let benefit = 0;
  for (const obstruction of ordered) {
    if (cost + obstruction.cost > request.budget) continue;
    selected.push(obstruction);
    cost += obstruction.cost;
    benefit += obstruction.benefit;
  }
  const universe = request.obstructions.reduce((sum, o) => sum + o.benefit, 0);
  return {
    type: "AttentionAllocation",
    budget: request.budget,
    readNext: selected.map((o) => o.id),
    selected,
    cost,
    benefit,
    residual: universe - benefit,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("allocateAttentionOverObstructions — Selects obstructions to reconcile under an attention budget by greedy benefit-per-cost extension, reporting cost, benefit, residual, and the read-next order.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(allocateAttentionOverObstructions(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/allocate-attention-over-obstructions.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { allocateAttentionOverObstructions } from "../scripts/allocate-attention-over-obstructions.mjs";
const obstructions = [{ id: "a", cost: 2, benefit: 4 }, { id: "b", cost: 3, benefit: 3 }, { id: "c", cost: 1, benefit: 1 }, { id: "d", cost: 5, benefit: 9 }];
test("selects by benefit density within the budget and reports the residual", () => {
  const out = allocateAttentionOverObstructions({ obstructions, budget: 4 });
  assert.deepEqual(out.readNext, ["a", "c"]);
  assert.equal(out.cost, 3);
  assert.equal(out.benefit, 5);
  assert.equal(out.residual, 12);
});
test("a zero budget yields the empty selection with residual equal to the universe benefit", () => {
  const out = allocateAttentionOverObstructions({ obstructions, budget: 0 });
  assert.deepEqual(out.readNext, []);
  assert.equal(out.residual, 17);
});
test("every prefix of the selection is feasible", () => {
  const out = allocateAttentionOverObstructions({ obstructions, budget: 8 });
  let running = 0;
  for (const o of out.selected) { running += o.cost; assert.ok(running <= 8); }
});
test("refuses a malformed obstruction", () => assert.throws(() => allocateAttentionOverObstructions({ obstructions: [{ id: "x", cost: -1, benefit: 1 }], budget: 1 }), /string id and non-negative integer cost and benefit/u));
```
## Examples
```json name="budget four"
{"input":{"obstructions":[{"id":"a","cost":2,"benefit":4},{"id":"b","cost":3,"benefit":3},{"id":"c","cost":1,"benefit":1}],"budget":4},"output":{"type":"AttentionAllocation","budget":4,"readNext":["a","c"],"selected":[{"id":"a","cost":2,"benefit":4},{"id":"c","cost":1,"benefit":1}],"cost":3,"benefit":5,"residual":3}}
```
## Traceability
- `feasible-greedy-selection` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `attention-allocation`, `node-esm-operation`
- `feasibility-invariants` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `attention-allocation`, `node-esm-operation`
- `malformed-request-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `attention-allocation`, `node-esm-operation`
