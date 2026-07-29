#!/usr/bin/env node
import { readOpinions } from "../src/opinions.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot) => readOpinions(repoRoot);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-opinions", "operations-manifold read-opinions result", morphism);
}
