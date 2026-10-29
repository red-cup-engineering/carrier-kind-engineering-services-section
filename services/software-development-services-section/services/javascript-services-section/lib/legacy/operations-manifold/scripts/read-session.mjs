#!/usr/bin/env node
import { readSession } from "../src/session.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => readSession(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-session", "operations-manifold read-session result", morphism);
}
