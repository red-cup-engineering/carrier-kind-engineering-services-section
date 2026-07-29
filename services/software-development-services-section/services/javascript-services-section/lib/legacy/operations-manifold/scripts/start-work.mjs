#!/usr/bin/env node
import { leanWorkIntake, startWork, startWorkScriptParams } from "../src/work-management.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot, params) => leanWorkIntake(await startWork(repoRoot, startWorkScriptParams(params)));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "start-work", "operations-manifold start-work result", morphism);
}
