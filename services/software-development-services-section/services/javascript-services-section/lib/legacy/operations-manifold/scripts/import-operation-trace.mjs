#!/usr/bin/env node
import { importOperationsFromTrace, leanOperationTraceImport } from "../src/operating/recording/operations/ledgering/library/operation-ledger.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot, params) => leanOperationTraceImport(await importOperationsFromTrace(repoRoot, {
  format: params["format"],
  jsonl: params["jsonl"],
  file: params["file"],
  run: params["run"],
  focus: params["focus"],
  limit: params["limit"],
  source: "operations-manifold.script",
}));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "import-operation-trace", "operations-manifold import-operation-trace result", morphism);
}
