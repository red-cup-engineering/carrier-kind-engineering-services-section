#!/usr/bin/env node
import { operationsManifoldWorkItems, projectOperationsManifoldWorkItemsReading } from "../src/work-projection.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot, params) => projectOperationsManifoldWorkItemsReading(
  await operationsManifoldWorkItems(repoRoot, {
    focus: params["focus"],
    detail: params["detail"],
    limit: params["limit"],
    offset: params["offset"],
  }),
  {
    focus: params["focus"],
    detail: params["detail"],
    limit: params["limit"],
    offset: params["offset"],
  },
);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-work-items", "operations-manifold read-work-items result", morphism);
}
