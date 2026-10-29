#!/usr/bin/env node
import { dreamContext } from "../src/cognition.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => dreamContext(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "dream-context", "operations-manifold dream-context result", morphism);
}
