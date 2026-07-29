#!/usr/bin/env node
import { rememberContext } from "../src/cognition.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => rememberContext(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "remember-context", "operations-manifold remember-context result", morphism);
}
