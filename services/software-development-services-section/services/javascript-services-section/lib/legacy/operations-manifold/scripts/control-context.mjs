#!/usr/bin/env node
import { contextControl } from "../src/operating/contextualizing/suiting/library/context-control.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot) => contextControl(repoRoot);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "control-context", "operations-manifold control-context result", morphism);
}
