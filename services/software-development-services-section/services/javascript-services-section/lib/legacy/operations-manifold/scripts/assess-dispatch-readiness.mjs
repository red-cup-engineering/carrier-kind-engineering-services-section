#!/usr/bin/env node
import { assessDispatchReadiness } from "../src/operating/governing/dispatching/readiness.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => assessDispatchReadiness(repoRoot, {
  operation: params["operation"],
  q: params["q"] ?? params["__stdin"],
  agent: params["agent"],
  office: params["office"],
  capabilities: params["capabilities"],
  focus: params["focus"],
  intent: params["intent"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "assess-dispatch-readiness", "operations-manifold assess-dispatch-readiness result", morphism);
}
