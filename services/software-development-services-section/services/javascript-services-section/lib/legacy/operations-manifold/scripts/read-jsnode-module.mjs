#!/usr/bin/env node
import { readJsnodeModuleView } from "../src/workspace-view.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => readJsnodeModuleView(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-jsnode-module", "operations-manifold read-jsnode-module result", morphism);
}
