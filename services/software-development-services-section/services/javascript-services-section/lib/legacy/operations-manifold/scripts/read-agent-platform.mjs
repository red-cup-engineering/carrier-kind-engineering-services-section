#!/usr/bin/env node
import { agentPlatform } from "../src/agent-platform.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => agentPlatform(repoRoot, {
  focus: params["focus"],
  detail: params["detail"],
  limit: params["limit"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-agent-platform", "operations-manifold read-agent-platform result", morphism);
}
