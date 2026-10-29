#!/usr/bin/env node
import { completeWork, leanWorkIntake } from "../src/work-management.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot, params) => leanWorkIntake(await completeWork(repoRoot, {
  id: params["id"],
  outcome: params["outcome"] ?? params["q"],
  evidence: params["evidence"],
  source: "operations-manifold.script",
}));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "complete-work", "operations-manifold complete-work result", morphism);
}
