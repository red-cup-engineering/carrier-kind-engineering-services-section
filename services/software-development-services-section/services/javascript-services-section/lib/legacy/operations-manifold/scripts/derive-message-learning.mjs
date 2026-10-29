#!/usr/bin/env node
import { deriveMessageLearning } from "../src/operating/learning/messages/derive-message-learning.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => deriveMessageLearning(repoRoot, {
  channel: params["channel"],
  focus: params["focus"],
  q: params["q"],
  limit: params["limit"],
  status: params["status"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "derive-message-learning", "operations-manifold derive-message-learning result", morphism);
}
