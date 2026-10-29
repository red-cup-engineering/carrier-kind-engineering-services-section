#!/usr/bin/env node
import { federation } from "../src/federation.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => federation(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-federation", "operations-manifold read-federation result", morphism);
}
