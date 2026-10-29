#!/usr/bin/env node
import { assessDrift } from "../src/operating/contextualizing/assessing/drift/library/drift-assessment.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => assessDrift(repoRoot, {
  admission: params["admission"],
  intent: params["intent"] ?? params["q"],
  focus: params["focus"],
  action: params["action"],
  tool: params["tool"],
  paths: params["paths"],
  outcome: params["outcome"],
  evidence: params["evidence"],
  authority: params["authority"],
  budget: params["budget"],
  source: "operations-manifold.script",
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "assess-drift", "operations-manifold assess-drift result", morphism);
}
