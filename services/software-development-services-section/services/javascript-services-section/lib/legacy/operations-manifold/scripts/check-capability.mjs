#!/usr/bin/env node
import { operationsManifoldCapabilityCheck } from "../src/agents/index.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => operationsManifoldCapabilityCheck(repoRoot, params["q"] ?? "", { refresh: params["refresh"] === "1" || params["refresh"] === "true" });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "check-capability", "operations-manifold check-capability result", morphism);
}
