#!/usr/bin/env node
import { agentCard } from "../src/federation.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => agentCard(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-agent-card", "operations-manifold read-agent-card result", morphism);
}
