#!/usr/bin/env node
import { inquireContext } from "../src/cognition.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => inquireContext(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "inquire-context", "operations-manifold inquire-context result", morphism);
}
