#!/usr/bin/env node
/**
 * infograph - the single dispatcher binary.
 *
 * It binds the process boundary (argv, stdin, stdout, stderr, exit) to the pure
 * `dispatch` over the package's operations. Domain logic lives in the operations; this
 * file owns transport, once. Journal admission uses the process data root resolved from
 * the package root default, optional config, METROPLAT_DATA_ROOT, or --data-root.
 */
import { defaultFilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { filesystemArrivalOptions } from "../integrations/filesystem/services/arrival.mts";
import { journalRpcWitness } from "../integrations/filesystem/services/rpc-witness.mts";
import { transportCloudEvent } from "../rpc/index.mts";
import type { JsonValue } from "../lib/codecs/json/core.mts";
import {
  isDirectEntrypoint,
  processArguments,
  processArgumentsWithoutConfigFlags,
  processDataRootConfig,
  processEntrypointArgument,
  processEnvValue,
  processIsoNow,
  processPackageRoot,
  readProcessStdinText,
  runProcessMain,
  writeProcessStderr,
  writeProcessStdout,
} from "../integrations/process/index.mts";
import { projectCliServiceWithReadiness } from "../apps/infograph/surface.mts";
import { cliHelpRequested, cliHelpText } from "../integrations/cli/codec.mts";
import { dispatchProjectedSurface } from "../integrations/cli/dispatch.mts";

async function main(): Promise<number> {
  const stdin = await readProcessStdinText();
  const args = processArguments();
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args,
    envName: "METROPLAT_DATA_ROOT",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;
  // read/write bind to the resolved process root, same as the HTTP and MCP
  // bindings; an explicit --data-root argument still wins inside the action.
  const binding = defaultFilesystemBinding(dataRoot, { packageRoot: processPackageRoot(import.meta.url) });
  const induced = projectCliServiceWithReadiness(binding);
  const user = processEnvValue("USER");
  const caller = {
    transport: "cli",
    ...(user === undefined ? {} : { user }),
  };
  const dispatchArgs = processArgumentsWithoutConfigFlags(args);
  if (cliHelpRequested(dispatchArgs)) {
    writeProcessStdout(cliHelpText(induced.discovery));
    return 0;
  }
  // The sole dispatcher is asynchronous because transcript-backed derivers
  // (claude-fleet,
  // claude-session-status, schema-conformance) stream bounded reads.
  const observedAt = processIsoNow();
  const arrival = filesystemArrivalOptions(dataRoot).onArrival(transportCloudEvent("cli", Object.freeze({
    kind: "metroplat.cli.arrival-material" as const,
    argv: Object.freeze([...dispatchArgs]),
    stdin,
    caller,
  }) as JsonValue, observedAt));
  const result = await dispatchProjectedSurface(induced, dispatchArgs, stdin, {
    subject: "anonymous",
    caller,
    now: () => observedAt,
    witness: journalRpcWitness(dataRoot),
    request: arrival.cloudEventIdentity,
    causes: arrival.admission?.statements?.map((statement) => statement.id) ?? [],
  });
  if (result.stdout !== "") writeProcessStdout(result.stdout);
  if (result.stderr !== "") writeProcessStderr(result.stderr);
  return result.code;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "infograph" });
}
