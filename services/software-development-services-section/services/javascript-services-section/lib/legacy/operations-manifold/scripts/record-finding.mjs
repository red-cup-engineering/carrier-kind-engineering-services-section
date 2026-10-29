#!/usr/bin/env node
import { recordFinding } from "../src/operating/remembering/codex/findings.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => recordFinding(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "record-codex-finding", "operations-manifold record-codex-finding result", morphism);
}
