#!/usr/bin/env node
import { intakeOpinion } from "../src/opinions.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => intakeOpinion(repoRoot, {
  claim: params["claim"] ?? params["text"] ?? params["q"],
  kind: params["kind"],
  stance: params["stance"],
  severity: params["severity"],
  scope: params["scope"] ?? params["scopes"],
  way: params["way"],
  source: "operations-manifold.script",
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "admit-opinion", "operations-manifold admit-opinion result", morphism);
}
