#!/usr/bin/env node
import { operationsLedger } from "../src/operating/recording/operations/ledgering/library/operation-ledger.mts";
import { projectOperationLedgerSnapshot } from "../src/operating/recording/operations/folding/library/operation-ledger-fold.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot, params) => projectOperationLedgerSnapshot(await operationsLedger(repoRoot), {
  detail: params["detail"],
  limit: params["limit"],
  offset: params["offset"],
  focus: params["focus"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-operations-ledger", "operations-manifold read-operations-ledger result", morphism);
}
