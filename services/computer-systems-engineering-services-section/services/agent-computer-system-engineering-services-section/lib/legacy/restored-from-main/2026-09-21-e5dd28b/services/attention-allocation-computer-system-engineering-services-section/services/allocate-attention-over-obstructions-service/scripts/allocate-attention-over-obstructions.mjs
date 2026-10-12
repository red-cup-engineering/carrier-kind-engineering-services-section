#!/usr/bin/env node
import { runJavascriptNodeOperation } from "../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";
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
  const result = await runJavascriptNodeOperation({ name: "allocate-attention-over-obstructions", description: "Selects obstructions to reconcile under an attention budget by greedy benefit-per-cost extension, reporting cost, benefit, residual, and the read-next order.", operation: allocateAttentionOverObstructions }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
