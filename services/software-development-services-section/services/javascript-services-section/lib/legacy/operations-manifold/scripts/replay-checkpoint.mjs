#!/usr/bin/env node
import { replayCheckpoint } from "../src/checkpoints.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => replayCheckpoint(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "replay-checkpoint", "operations-manifold replay-checkpoint result", morphism);
}
