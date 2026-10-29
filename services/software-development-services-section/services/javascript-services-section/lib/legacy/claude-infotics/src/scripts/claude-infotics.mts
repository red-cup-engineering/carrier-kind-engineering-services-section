#!/usr/bin/env node
/**
 * claude-infotics — the single dispatcher binary.
 *
 * Binds the process boundary (argv, stdin, stdout, stderr, exit) to MetroPlat's
 * `dispatchProjectedSurface` over the claude-infotics surface. Domain logic lives
 * in the operations; this file owns transport, once — the same shape as the
 * reference `infograph` bin. No hand-rolled arg parser.
 */
import {
  defaultFilesystemBinding,
  journalRpcWitness,
} from "@red-cup-engineering/metroplat/integrations/filesystem";
import {
  cliHelpRequested,
  cliHelpText,
  dispatchProjectedSurface,
} from "@red-cup-engineering/metroplat/integrations/cli";
import {
  isDirectEntrypoint,
  processArguments,
  processArgumentsWithoutConfigFlags,
  processDataRootConfig,
  processEntrypointArgument,
  processIsoNow,
  processPackageRoot,
  readProcessStdinText,
  runProcessMain,
  writeProcessStderr,
  writeProcessStdout,
} from "@red-cup-engineering/metroplat/integrations/process";

import { claudeInfoticsSurface } from "../surface.mts";
import { CLAUDE_INFOTICS_PROGRAM, CLAUDE_INFOTICS_SUBJECT } from "../authorization.mts";

async function main(): Promise<number> {
  const stdin = await readProcessStdinText();
  const args = processArguments();
  const packageRoot = processPackageRoot(import.meta.url);
  // The data root is configurable and load-bearing: `defaultFilesystemBinding`
  // derives `claudeSessionRoot` from it (~/.claude/projects/<dataRoot-as-dashes>),
  // so reading a project's Claude transcripts requires pointing this at THAT
  // project's root — e.g. `--data-root /home/emsenn/info`. Defaulting it to this
  // package would look for sessions nobody ever recorded there.
  const dataRoot = processDataRootConfig({
    defaultRoot: packageRoot,
    args,
    envName: "CLAUDE_INFOTICS_DATA_ROOT",
    configEnvName: "CLAUDE_INFOTICS_CONFIG",
  }).dataRoot;
  const binding = defaultFilesystemBinding(dataRoot, { packageRoot });
  const observedAt = processIsoNow();
  const surface = claudeInfoticsSurface(binding, observedAt);
  const dispatchArgs = processArgumentsWithoutConfigFlags(args);
  if (cliHelpRequested(dispatchArgs)) {
    writeProcessStdout(cliHelpText(surface.discovery));
    return 0;
  }
  const result = await dispatchProjectedSurface(surface, dispatchArgs, stdin, {
    subject: CLAUDE_INFOTICS_SUBJECT,
    program: CLAUDE_INFOTICS_PROGRAM,
    now: () => observedAt,
    witness: journalRpcWitness(dataRoot),
  });
  if (result.stdout !== "") writeProcessStdout(result.stdout);
  if (result.stderr !== "") writeProcessStderr(result.stderr);
  return result.code;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "claude-infotics" });
}
