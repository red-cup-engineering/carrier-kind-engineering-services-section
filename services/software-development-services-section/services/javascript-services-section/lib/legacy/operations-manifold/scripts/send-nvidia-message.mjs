#!/usr/bin/env node
import { sendNvidiaMessage, sendNvidiaMessageScriptParams } from "../src/operating/messaging/channels/channel-message.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => sendNvidiaMessage(repoRoot, sendNvidiaMessageScriptParams(params));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "send-nvidia-message", "operations-manifold send-nvidia-message result", morphism);
}
