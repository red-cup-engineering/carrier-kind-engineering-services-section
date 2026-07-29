#!/usr/bin/env node
import { deriveOrganizationalProfile } from "../src/operating/deriving/organizational-profile/derive-organizational-profile.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => deriveOrganizationalProfile(repoRoot, {
  focus: params["focus"],
  q: params["q"],
  intent: params["intent"],
  limit: params["limit"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "derive-organizational-profile", "operations-manifold derive-organizational-profile result", morphism);
}
