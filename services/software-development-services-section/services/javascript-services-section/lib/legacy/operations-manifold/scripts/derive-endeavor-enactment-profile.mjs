#!/usr/bin/env node
import { deriveEndeavorEnactmentProfile } from "../src/operating/deriving/endeavor-enactment-profile/derive-endeavor-enactment-profile.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => deriveEndeavorEnactmentProfile(repoRoot, {
  focus: params["focus"],
  q: params["q"],
  intent: params["intent"],
  limit: params["limit"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "derive-endeavor-enactment-profile", "operations-manifold derive-endeavor-enactment-profile result", morphism);
}
