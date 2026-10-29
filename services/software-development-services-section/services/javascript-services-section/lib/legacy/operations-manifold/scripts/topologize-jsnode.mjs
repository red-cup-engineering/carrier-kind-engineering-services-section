#!/usr/bin/env node
import { topologizeJsnode, topologizeJsnodeScriptParams } from "@emsenn/jsnode-ick/topology";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => topologizeJsnode(repoRoot, topologizeJsnodeScriptParams(params));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "topologize-jsnode", "operations-manifold topologize-jsnode result", morphism);
}
