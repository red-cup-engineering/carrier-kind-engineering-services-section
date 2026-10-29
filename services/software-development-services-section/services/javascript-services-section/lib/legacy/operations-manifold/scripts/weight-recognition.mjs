#!/usr/bin/env node
import { recognitionWeight } from "../src/recognition.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => recognitionWeight(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "weight-recognition", "operations-manifold weight-recognition result", morphism);
}
