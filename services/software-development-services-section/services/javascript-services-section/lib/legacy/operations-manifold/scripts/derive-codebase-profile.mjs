#!/usr/bin/env node
import { deriveCodebaseProfile } from "../src/operating/deriving/codebase-profile/derive-codebase-profile.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => deriveCodebaseProfile(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "derive-codebase-profile", "operations-manifold derive-codebase-profile result", morphism);
}
