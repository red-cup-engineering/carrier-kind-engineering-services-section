#!/usr/bin/env node
import { readJsnodeTypesView } from "../src/workspace-view.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => readJsnodeTypesView(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-jsnode-types", "operations-manifold read-jsnode-types result", morphism);
}
