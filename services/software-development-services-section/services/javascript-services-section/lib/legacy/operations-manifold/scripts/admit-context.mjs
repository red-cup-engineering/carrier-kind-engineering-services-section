#!/usr/bin/env node
import { admitContext } from "../src/operating/contextualizing/admitting/library/context-admission.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => admitContext(repoRoot, {
  intent: params["intent"] ?? params["q"],
  focus: params["focus"],
  candidateSources: params["candidateSources"] ?? params["sources"],
  budget: params["budget"],
  authority: params["authority"],
  source: "operations-manifold.script",
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "admit-context", "operations-manifold admit-context result", morphism);
}
