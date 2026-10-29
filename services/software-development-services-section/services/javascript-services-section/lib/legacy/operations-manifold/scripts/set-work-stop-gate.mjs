#!/usr/bin/env node
import { leanWorkGate, workStopGate } from "../src/work-management.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot) => leanWorkGate(await workStopGate(repoRoot));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "set-work-stop-gate", "operations-manifold set-work-stop-gate result", morphism);
}
