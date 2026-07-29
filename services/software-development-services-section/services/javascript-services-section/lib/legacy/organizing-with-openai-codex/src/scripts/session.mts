#!/usr/bin/env node
// codex-session — the coding-agent session computer: capsule, finding, impact,
// recall. Thin entry over @emsenn/organizing-with-openai-codex/session's runSessionCli.
import process from "node:process";
import { runSessionCli } from "../session/index.mjs";

runSessionCli(process.argv.slice(2)).then((result) => {
  process.stdout.write(result.output + "\n");
  process.exit(result.code);
});
