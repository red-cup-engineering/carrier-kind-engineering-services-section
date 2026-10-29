#!/usr/bin/env node
import { consolidateMemory } from "../src/cognition.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => consolidateMemory(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "consolidate-memory", "operations-manifold consolidate-memory result", morphism);
}
