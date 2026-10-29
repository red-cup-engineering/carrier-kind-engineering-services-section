#!/usr/bin/env node
import { codebaseReading } from "../src/codebase-reading.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => codebaseReading(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-codebase", "operations-manifold read-codebase result", morphism);
}
