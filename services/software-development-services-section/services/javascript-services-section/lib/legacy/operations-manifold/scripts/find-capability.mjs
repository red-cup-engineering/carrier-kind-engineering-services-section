#!/usr/bin/env node
import { capabilitySearch } from "../src/capability-index.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => capabilitySearch(repoRoot, params["q"] ?? "", { refresh: params["refresh"] === "1" || params["refresh"] === "true" });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "find-capability", "operations-manifold find-capability result", morphism);
}
