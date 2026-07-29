#!/usr/bin/env node
import { readJsnodePackageView } from "../src/workspace-view.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => readJsnodePackageView(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-jsnode-package", "operations-manifold read-jsnode-package result", morphism);
}
