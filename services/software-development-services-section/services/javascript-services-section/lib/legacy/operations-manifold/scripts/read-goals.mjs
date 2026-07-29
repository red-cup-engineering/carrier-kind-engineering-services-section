#!/usr/bin/env node
import { operationsManifoldGoals } from "../src/goals.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot) => operationsManifoldGoals(repoRoot);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-goals", "operations-manifold read-goals result", morphism);
}
