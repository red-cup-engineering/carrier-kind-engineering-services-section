#!/usr/bin/env node
import { fileTouchMarket } from "../src/operating/recording/operations/ledgering/library/operation-ledger.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => fileTouchMarket(repoRoot, {
  focus: params["focus"] ?? params["q"] ?? params["__stdin"],
  limit: params["limit"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "market-file-touch", "operations-manifold market-file-touch result", morphism);
}
