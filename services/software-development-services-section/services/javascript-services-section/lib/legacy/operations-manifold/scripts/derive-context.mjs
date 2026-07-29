#!/usr/bin/env node
import { deriveContext } from "../src/cognition.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => deriveContext(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "derive-context", "operations-manifold derive-context result", morphism);
}
