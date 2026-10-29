#!/usr/bin/env node
import { codexPlan } from "../src/codex-plan.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => codexPlan(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "plan-codex", "operations-manifold plan-codex result", morphism);
}
