#!/usr/bin/env node
import { measureOpinions } from "../src/opinions.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => measureOpinions(repoRoot, {
  subject: params["subject"] ?? params["text"] ?? params["q"],
  scope: params["scope"],
  assessments: params["assessments"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "measure-opinions", "operations-manifold measure-opinions result", morphism);
}
