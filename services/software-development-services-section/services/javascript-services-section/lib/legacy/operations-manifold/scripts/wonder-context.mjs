#!/usr/bin/env node
import { wonderContext } from "../src/cognition.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => wonderContext(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "wonder-context", "operations-manifold wonder-context result", morphism);
}
