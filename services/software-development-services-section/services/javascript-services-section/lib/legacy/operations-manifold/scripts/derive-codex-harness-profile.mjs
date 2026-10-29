#!/usr/bin/env node
import { deriveCodexHarnessProfile } from "../src/operating/deriving/codex-harness-profile/derive-codex-harness-profile.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => deriveCodexHarnessProfile(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "derive-codex-harness-profile", "operations-manifold derive-codex-harness-profile result", morphism);
}
