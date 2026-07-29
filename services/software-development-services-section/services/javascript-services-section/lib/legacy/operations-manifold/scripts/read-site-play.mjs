#!/usr/bin/env node
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";
import { sitePlay } from "../src/site-play.mts";

const morphism = (repoRoot, params) => sitePlay(repoRoot, { focus: params["focus"] });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-site-play", "operations-manifold read-site-play result", morphism);
}
