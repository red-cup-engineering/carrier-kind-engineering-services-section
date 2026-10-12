#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";
import { computeWithGit, GIT_COMPUTER_ACTIONS } from "../src/operations.mjs";

const COMMAND_ACTION = Object.freeze({
  worktree: "worktree.status",
  log: "log.read",
  refs: "refs.read",
  remotes: "remotes.read",
});

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const repo = argument("--repo", rest) ?? process.cwd();
  const limitText = argument("--limit", rest);
  const revision = argument("--revision", rest);
  return {
    command,
    repo: path.resolve(repo),
    json: rest.includes("--json"),
    ...(limitText === undefined ? {} : { limit: Number.parseInt(limitText, 10) }),
    ...(revision === undefined ? {} : { revision }),
  };
}

function usage() {
  return [
    "git-compute worktree [--repo <path>] [--json]",
    "git-compute log      [--repo <path>] [--limit N] [--revision <rev>] [--json]",
    "git-compute refs     [--repo <path>] [--json]",
    "git-compute remotes  [--repo <path>] [--json]",
    "",
  ].join("\n");
}

async function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.command === undefined || parsed.command === "help" || parsed.command === "--help") {
    process.stdout.write(usage());
    return 0;
  }
  const action = COMMAND_ACTION[parsed.command];
  if (action === undefined) {
    throw new TypeError(
      `unknown command ${parsed.command} (expected one of ${Object.keys(COMMAND_ACTION).join(", ")}; actions: ${GIT_COMPUTER_ACTIONS.join(", ")})`,
    );
  }

  const token = {
    repoRoot: parsed.repo,
    ...(parsed.limit === undefined ? {} : { limit: parsed.limit }),
    ...(parsed.revision === undefined ? {} : { revision: parsed.revision }),
  };
  const admission = await computeWithGit(action, token);

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(admission, null, 2)}\n`);
  } else {
    const head = JSON.stringify({
      action: admission.action,
      admitted: admission.admitted,
      status: admission.status,
      ...(admission.obstruction === undefined ? {} : { obstruction: admission.obstruction.kind }),
    });
    const rows = admission.utterances.map((uttered) =>
      JSON.stringify({
        e: uttered.token.mark.value,
        a: uttered.claim.mark.value,
      }),
    );
    process.stdout.write([head, ...rows].join("\n") + "\n");
  }
  return admission.admitted ? 0 : 1;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`git-compute: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
