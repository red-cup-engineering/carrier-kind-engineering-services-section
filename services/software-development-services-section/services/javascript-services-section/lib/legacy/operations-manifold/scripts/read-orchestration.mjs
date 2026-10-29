#!/usr/bin/env node
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";
import { orchestration } from "../src/orchestration.mts";

const morphism = (repoRoot, params) => orchestration(repoRoot, { focus: params["focus"] });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-orchestration", "operations-manifold read-orchestration result", morphism);
}
