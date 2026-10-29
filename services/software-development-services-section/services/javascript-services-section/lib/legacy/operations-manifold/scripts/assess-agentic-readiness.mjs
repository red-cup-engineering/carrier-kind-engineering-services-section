#!/usr/bin/env node
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";
import { agenticReadiness } from "../src/agentic-readiness.mts";

const morphism = (repoRoot) => agenticReadiness(repoRoot);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "assess-agentic-readiness", "operations-manifold assess-agentic-readiness result", morphism);
}
