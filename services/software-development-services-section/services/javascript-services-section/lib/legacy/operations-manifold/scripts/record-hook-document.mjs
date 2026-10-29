#!/usr/bin/env node
import { operationsManifoldDocumentScriptBoundaryDocument, runOperationsManifoldDocumentScript } from "../src/document-scripts.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (_repoRoot, params) => runOperationsManifoldDocumentScript("record-hook-document", operationsManifoldDocumentScriptBoundaryDocument(params));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "record-hook-document", "operations-manifold record-hook-document result", morphism);
}
