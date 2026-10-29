#!/usr/bin/env node
import { deriveContextRelevance } from "../src/operating/contextualizing/suiting/library/context-relevance.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => deriveContextRelevance(repoRoot, {
  prompt: params["prompt"],
  intent: params["intent"],
  q: params["q"] ?? params["__stdin"],
  focus: params["focus"],
  limit: params["limit"],
  refresh: params["refresh"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "derive-context-relevance", "operations-manifold derive-context-relevance result", morphism);
}
