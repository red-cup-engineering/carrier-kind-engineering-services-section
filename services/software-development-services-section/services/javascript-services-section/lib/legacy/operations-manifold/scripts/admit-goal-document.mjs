#!/usr/bin/env node
import { operationsManifoldDocumentScriptBoundaryDocument, runOperationsManifoldDocumentScript } from "../src/document-scripts.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (_repoRoot, params) => runOperationsManifoldDocumentScript("admit-goal-document", operationsManifoldDocumentScriptBoundaryDocument(params));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "admit-goal-document", "operations-manifold admit-goal-document result", morphism);
}
