#!/usr/bin/env node
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { serveEnterpriseInstance } from "../src/serve-instance.mjs";
import { installSamplingSignal } from "../src/diagnostics.mjs";
import { superviseRequiredNativeActor } from "../src/native-actor-service.mjs";

// A stopped node exits once it has drained, and within 30 s even if a handle (a companion, a queue,
// a poll) stays open, instead of waiting for systemd to kill it.
let actorRestart = false;
const shutdown = {
  onDrain: () => { setTimeout(() => process.exit(1), 30_000).unref(); },
  onClosed: () => process.exit(actorRestart ? 1 : 0),
};

installSamplingSignal({ stateDir: process.env.METROPLAT_WEB_STATE_DIR });

await runMain(async () => {
  const lifecycle = await serveEnterpriseInstance({ hostPath: process.env.FELTOS_ENTERPRISE_HOST, shutdown });
  void superviseRequiredNativeActor(lifecycle.platform.capabilities()["native-actor"], lifecycle.shutdown, () => {
    actorRestart = true;
    // A fast event-loop drain can beat the self-sent signal; preserve failure at once.
    process.exitCode = 1;
    process.stderr.write("[feltos-enterprise-host] required native actor stopped; restarting service\n");
    process.kill(process.pid, "SIGTERM");
  });
  return lifecycle;
}, {
  moduleUrl: import.meta.url,
  formatError: (error) => `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  exitCode: 1,
});
