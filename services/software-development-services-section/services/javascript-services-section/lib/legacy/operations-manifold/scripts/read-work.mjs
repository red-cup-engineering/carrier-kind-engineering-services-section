#!/usr/bin/env node
import { operationsManifoldWork, projectWorkSnapshot } from "../src/work-management.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot, params) => projectWorkSnapshot(await operationsManifoldWork(repoRoot), {
  detail: params["detail"],
  limit: params["limit"],
  offset: params["offset"],
  focus: params["focus"],
  status: params["status"],
  workStatus: params["workStatus"],
  gate: params["gate"],
  agent: params["agent"],
  session: params["session"] ?? params["session_id"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-work", "operations-manifold read-work result", morphism);
}
