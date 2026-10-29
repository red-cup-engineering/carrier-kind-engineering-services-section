#!/usr/bin/env node
import { heartbeat } from "../src/heartbeat.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => heartbeat(repoRoot, { focus: params["focus"], intent: params["intent"] ?? params["q"] });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-heartbeat", "operations-manifold read-heartbeat result", morphism);
}
