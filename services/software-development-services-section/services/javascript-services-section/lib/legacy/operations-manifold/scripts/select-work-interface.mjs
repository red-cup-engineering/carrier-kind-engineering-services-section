#!/usr/bin/env node
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";
import { selectWorkInterface } from "../src/operating/planning/work-interface/select-work-interface.mts";

const morphism = (repoRoot, params) => selectWorkInterface(repoRoot, {
  focus: params["focus"],
  q: params["q"],
  intent: params["intent"],
  limit: params["limit"],
  budget: params["budget"],
  detail: params["detail"],
  office: params["office"],
  agent: params["agent"],
  session: params["session"] ?? params["session_id"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "select-work-interface", "operations-manifold select-work-interface result", morphism);
}
