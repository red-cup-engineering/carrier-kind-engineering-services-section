#!/usr/bin/env node
import { planWorkspacePackageDescription } from "../src/package-surface.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => planWorkspacePackageDescription(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "plan-jsnode-description", "operations-manifold plan-jsnode-description result", morphism);
}
