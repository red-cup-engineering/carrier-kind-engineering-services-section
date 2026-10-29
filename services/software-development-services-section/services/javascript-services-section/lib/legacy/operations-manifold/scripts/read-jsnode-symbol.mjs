#!/usr/bin/env node
import { readJsnodeSymbolView } from "../src/workspace-view.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => readJsnodeSymbolView(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-jsnode-symbol", "operations-manifold read-jsnode-symbol result", morphism);
}
