#!/usr/bin/env node
import { enactStrategy } from "../src/operating/enacting/strategizing/strategy-enactment.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => enactStrategy(repoRoot, {
  focus: params["focus"],
  intent: params["intent"],
  q: params["q"] ?? params["__stdin"],
  phase: params["phase"],
  move: params["move"],
  moves: params["moves"],
  limit: params["limit"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "enact-strategy", "operations-manifold enact-strategy result", morphism);
}
