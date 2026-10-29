#!/usr/bin/env node
import { readMessages } from "../src/operating/messaging/channels/channel-message.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => readMessages(repoRoot, {
  channel: params["channel"],
  focus: params["focus"],
  q: params["q"],
  limit: params["limit"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-messages", "operations-manifold read-messages result", morphism);
}
