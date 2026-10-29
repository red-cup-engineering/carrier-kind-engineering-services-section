#!/usr/bin/env node
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";
import { siteOperations } from "../src/site-admin.mts";

const morphism = (repoRoot, params) => siteOperations(repoRoot, { focus: params["focus"] });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-site-operations", "operations-manifold read-site-operations result", morphism);
}
