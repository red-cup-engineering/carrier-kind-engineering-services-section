#!/usr/bin/env node
import { codexExecTraceProjectionFromParams } from "../src/holography/llm/codex-exec-trace.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => codexExecTraceProjectionFromParams(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "trace-codex-exec", "operations-manifold trace-codex-exec result", morphism);
}
