#!/usr/bin/env node
import { planJSNodeMove } from "../src/jsnode-moves.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => planJSNodeMove(repoRoot, params["q"] ?? params["command"] ?? "");

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "plan-jsnode-move", "operations-manifold plan-jsnode-move result", morphism);
}
