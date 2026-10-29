#!/usr/bin/env node
import { operationsManifoldAgents } from "../src/agents/index.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = () => operationsManifoldAgents();

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-agents", "operations-manifold read-agents result", morphism);
}
