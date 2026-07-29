#!/usr/bin/env node
import { projectContextSuit } from "../src/operating/contextualizing/suiting/library/context-control.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => projectContextSuit(repoRoot, {
  admission: params["admission"],
  intent: params["intent"] ?? params["q"],
  focus: params["focus"],
  office: params["office"],
  agent: params["agent"],
  session: params["session"] ?? params["session_id"],
  budget: params["budget"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "project-context-suit", "operations-manifold project-context-suit result", morphism);
}
