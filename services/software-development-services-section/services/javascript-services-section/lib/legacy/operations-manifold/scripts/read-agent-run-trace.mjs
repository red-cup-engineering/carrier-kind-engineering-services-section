#!/usr/bin/env node
import { agentRunTraceProjectionFromParams } from "../src/holography/llm/agent-run-trace.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => agentRunTraceProjectionFromParams(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-agent-run-trace", "operations-manifold read-agent-run-trace result", morphism);
}
