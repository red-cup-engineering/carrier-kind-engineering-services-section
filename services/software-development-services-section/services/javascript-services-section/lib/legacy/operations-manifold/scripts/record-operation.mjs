#!/usr/bin/env node
import { leanOperationRecord, recordOperation } from "../src/operating/recording/operations/ledgering/library/operation-ledger.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot, params) => leanOperationRecord(await recordOperation(repoRoot, {
  kind: params["kind"],
  subject: params["subject"],
  predicate: params["predicate"],
  object: params["object"],
  trace: params["trace"],
  layer: params["layer"],
  nucleus: params["nucleus"],
  tool: params["tool"],
  paths: params["paths"],
  tokens: params["tokens"],
  estimatedTokens: params["estimatedTokens"],
  inputBytes: params["inputBytes"],
  outputBytes: params["outputBytes"],
  budgetLimitTokens: params["budgetLimitTokens"],
  costUsd: params["costUsd"],
  durationMs: params["durationMs"],
  agent: params["agent"],
  source: "operations-manifold.script",
  evidence: params["evidence"],
  note: params["note"],
  valueOld: params["valueOld"],
  valueNew: params["valueNew"],
}));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "record-operation", "operations-manifold record-operation result", morphism);
}
