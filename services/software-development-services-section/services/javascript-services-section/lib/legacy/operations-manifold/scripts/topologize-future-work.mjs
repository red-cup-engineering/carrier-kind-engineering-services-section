#!/usr/bin/env node
import { futureWorkTopology } from "../src/operating/planning/topologizing/future-work/library/future-work-topology.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => futureWorkTopology(repoRoot, {
  focus: params["focus"],
  q: params["q"],
  intent: params["intent"],
  limit: params["limit"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "topologize-future-work", "operations-manifold topologize-future-work result", morphism);
}
