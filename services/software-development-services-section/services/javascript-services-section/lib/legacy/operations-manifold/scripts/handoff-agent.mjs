#!/usr/bin/env node
import { agentHandoff } from "../src/federation.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => agentHandoff(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "handoff-agent", "operations-manifold handoff-agent result", morphism);
}
