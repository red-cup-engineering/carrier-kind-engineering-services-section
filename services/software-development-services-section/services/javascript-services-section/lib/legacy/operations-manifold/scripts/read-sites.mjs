#!/usr/bin/env node
import { siteAdministration } from "../src/site-admin.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => siteAdministration(repoRoot, { focus: params["focus"] });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-sites", "operations-manifold read-sites result", morphism);
}
