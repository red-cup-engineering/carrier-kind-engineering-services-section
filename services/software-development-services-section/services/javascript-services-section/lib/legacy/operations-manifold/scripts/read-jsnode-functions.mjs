#!/usr/bin/env node
import { queryApiIndex } from "../src/api-index.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => queryApiIndex(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-jsnode-functions", "operations-manifold read-jsnode-functions result", morphism);
}
