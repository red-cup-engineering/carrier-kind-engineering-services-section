#!/usr/bin/env node
import { leanWorkIntake, updateWork, updateWorkScriptParams } from "../src/work-management.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = async (repoRoot, params) => leanWorkIntake(await updateWork(repoRoot, updateWorkScriptParams(params)));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "update-work", "operations-manifold update-work result", morphism);
}
