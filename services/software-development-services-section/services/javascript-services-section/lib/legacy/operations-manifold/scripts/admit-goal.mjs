#!/usr/bin/env node
import { intakeGoal } from "../src/goals.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => intakeGoal(repoRoot, {
  text: params["text"] ?? params["q"],
  title: params["title"],
  focus: params["focus"],
  priority: params["priority"],
  source: "operations-manifold.script",
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "admit-goal", "operations-manifold admit-goal result", morphism);
}
