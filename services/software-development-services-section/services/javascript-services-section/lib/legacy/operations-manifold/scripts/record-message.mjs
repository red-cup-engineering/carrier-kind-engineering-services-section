#!/usr/bin/env node
import { recordMessage, recordMessageScriptParams } from "../src/operating/messaging/channels/channel-message.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => recordMessage(repoRoot, recordMessageScriptParams(params));

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "record-message", "operations-manifold record-message result", morphism);
}
