#!/usr/bin/env node
import { workspaceGraphProjection, workspaceGraphView } from "../src/workspace-view.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => workspaceGraphView(repoRoot, params).then(workspaceGraphProjection);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "graph-workspace", "operations-manifold graph-workspace result", morphism);
}
