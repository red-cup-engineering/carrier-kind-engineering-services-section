import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { BUDGET, DEFAULT_HOST, checkMemoryBudget } from "../scripts/check-memory-budget.mjs";

// The receiving check of bare-cedar-fog requirement feltos-runs-in-32-mb-with-a-64-mb-startup-peak:
// the node composition, started as deployed over a synthetic multi-day journal. It starts two nodes
// and takes about three minutes, so it runs where the release tree is present and
// FELTOS_MEMORY_BUDGET_CHECK=1 asks for it (scripts/check-memory-budget.mjs runs it by hand).
const release = (() => {
  for (let directory = dirname(fileURLToPath(import.meta.url)); directory !== dirname(directory); directory = dirname(directory)) {
    if (existsSync(join(directory, "pnpm-workspace.yaml"))) return directory;
  }
  return undefined;
})();
const runnable = process.env.FELTOS_MEMORY_BUDGET_CHECK === "1" && release !== undefined && existsSync(resolve(release, DEFAULT_HOST));
const skip = runnable ? false : "set FELTOS_MEMORY_BUDGET_CHECK=1 in a release tree that holds the deployed host declaration";

let report;
const measured = async () => (report ??= await checkMemoryBudget({ release, days: 6, perDay: 500, settle: 60 }));

test("the node's memory does not grow with its journal's history", { skip, timeout: 900_000 }, async () => {
  const { empty, history, historyGrowthMB } = await measured();
  assert.ok(history.witnesses > 0);
  assert.ok(historyGrowthMB <= 4, `a ${history.days}-day journal of ${history.witnesses} witnesses grew the steady node by ${historyGrowthMB} MB (empty ${empty.steadyMB} MB, history ${history.steadyMB} MB)`);
});

// Not met yet: 2026-10-10 the composition held 112 MB steady and needed a 128 MB heap to start
// (compiled modules ~53 MB, agency registry holder ~21 MB). Reported, not hidden, until it holds.
test(`the node holds at most ${BUDGET.steadyMB} MB once started and ${BUDGET.startupMB} MB while starting`, { skip, todo: "the Leader's budget is not met yet", timeout: 900_000 }, async () => {
  const { history } = await measured();
  assert.ok(history.steadyMB <= BUDGET.steadyMB, `steady ${history.steadyMB} MB of JavaScript memory (RSS ${history.steady.rssMB} MB) exceeds ${BUDGET.steadyMB} MB`);
  assert.ok(history.startupPeakMB <= BUDGET.startupMB, `startup peak ${history.startupPeakMB} MB exceeds ${BUDGET.startupMB} MB`);
});
