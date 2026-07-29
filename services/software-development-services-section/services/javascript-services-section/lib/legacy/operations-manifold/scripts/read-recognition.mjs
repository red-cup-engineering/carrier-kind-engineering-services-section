#!/usr/bin/env node
import { recognition } from "../src/recognition.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => recognition(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-recognition", "operations-manifold read-recognition result", morphism);
}
