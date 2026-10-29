#!/usr/bin/env node
import { readSessionPhase } from "../src/session-phase.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => readSessionPhase(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-session-phase", "operations-manifold read-session-phase result", morphism);
}
