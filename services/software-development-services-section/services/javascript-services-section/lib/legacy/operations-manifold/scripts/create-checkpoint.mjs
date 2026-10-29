#!/usr/bin/env node
import { createCheckpoint } from "../src/checkpoints.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => createCheckpoint(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "create-checkpoint", "operations-manifold create-checkpoint result", morphism);
}
