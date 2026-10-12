#!/usr/bin/env node
/** MetroPlat's executable contract with the independently hireable ActivityPub provider. */
import { serveActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/server";

function help(): void {
  process.stdout.write([
    "infograph-federation hires @red-cup-engineering/activitypub-services-section (Fedify).",
    "Required: ACTIVITYPUB_ORIGIN ACTIVITYPUB_IDENTIFIER ACTIVITYPUB_ACTOR_NAME",
    "          ACTIVITYPUB_ACTOR_SUMMARY ACTIVITYPUB_KEYS_PATH ACTIVITYPUB_STATE_PATH",
    "Optional: HOST PORT",
    "",
  ].join("\n"));
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    help();
    return;
  }
  await serveActivityPubProvider();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`infograph-federation: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
