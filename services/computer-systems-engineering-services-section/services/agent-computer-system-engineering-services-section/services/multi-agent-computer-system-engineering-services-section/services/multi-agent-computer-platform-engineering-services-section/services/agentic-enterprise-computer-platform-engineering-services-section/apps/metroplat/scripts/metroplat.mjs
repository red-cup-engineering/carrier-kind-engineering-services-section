#!/usr/bin/env node
/**
 * metroplat - the single dispatcher binary.
 *
 * It binds the process boundary (argv, stdin, stdout, stderr, exit) to the pure
 * `dispatch` over the package's operations. Domain logic lives in the operations; this
 * file owns transport, once. Journal admission uses the process data root resolved from
 * the package root default, optional config, METROPLAT_DATA_ROOT, or --data-root.
 */
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { filesystemArrivalOptions } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { transportCloudEvent } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import { processLeaseCoordinator } from "@red-cup-engineering/computer-system-engine/rpc/coordination";

import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processArgumentsWithoutConfigFlags, processDataRootConfig } from "@red-cup-engineering/node-process-services-section/config";
import { isDirectEntrypoint, processArguments, processEntrypointArgument, processPackageRoot } from "@red-cup-engineering/node-process-services-section/entrypoint";
import { processEnvironment, processEnvValue } from "@red-cup-engineering/node-process-services-section/environment";
import { runProcessMain } from "@red-cup-engineering/node-process-services-section/main-runner";
import { readProcessStdinText, writeProcessStderr, writeProcessStdout } from "@red-cup-engineering/node-process-services-section/stdio";
import { projectCliServiceWithReadiness } from "../src/surface.mjs";
import { platformOperationFamilyDescriptors } from "../src/catalog.mjs";
import { activateMcpRequestedCapabilities } from "@red-cup-engineering/metroplat/mcp-options";
import { INFOGRAPH_PROCESS_OPTION_FLAGS, resolveInfographProcessOptions } from "@red-cup-engineering/metroplat/process-options";
import { installedMetroplatFromProcessOptions } from "@red-cup-engineering/metroplat/instance";
import { cliHelpRequested, cliHelpText } from "@red-cup-engineering/metroplat/cli/codec";
import { dispatchProjectedSurface } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";

async function main() {
  const stdin = await readProcessStdinText();
  const args = processArguments();
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args,
    envName: "METROPLAT_DATA_ROOT", configFileName: "metroplat.config.json",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;
  // Subject, capability, and session-root requests resolve exactly as they
  // do at the MCP stdio boundary (../src/process-options.mjs);
  // only the unsupplied-everywhere default differs (anonymous here, claude
  // there). Resolved before the binding so --claude-session-root/
  // --codex-session-root (and their env forms) actually reach it, the same
  // way the FeltOS enterprise host provider threads them into defaultMcpApex.
  const processOptions = resolveInfographProcessOptions(args, "anonymous", processEnvironment());
  // read/write bind to the resolved process root, same as the HTTP and MCP
  // bindings; an explicit --data-root argument still wins inside the action.
  const binding = defaultFilesystemBinding(dataRoot, {
    packageRoot: processPackageRoot(import.meta.url),
    now: processIsoNow,
    ...(processOptions.claudeSessionRoot === undefined ? {} : { claudeSessionRoot: processOptions.claudeSessionRoot }),
    ...(processOptions.codexSessionRoot === undefined ? {} : { codexSessionRoot: processOptions.codexSessionRoot }),
  });
  const installed = await installedMetroplatFromProcessOptions(processOptions, binding);
  const rootName = installed.identity.id;
  const induced = projectCliServiceWithReadiness(binding, installed.operationSources, rootName,
    processOptions.instance === undefined ? undefined : platformOperationFamilyDescriptors,
    { instanceIdentity: installed.identity });
  const user = processEnvValue("USER");
  const caller = {
    transport: "cli",
    ...(user === undefined ? {} : { user }),
  };
  activateMcpRequestedCapabilities(dataRoot, induced, processOptions);
  const dispatchArgs = processArgumentsWithoutConfigFlags(args, [
    "--data-root",
    "--config",
    ...INFOGRAPH_PROCESS_OPTION_FLAGS,
  ]);
  if (cliHelpRequested(dispatchArgs)) {
    writeProcessStdout(cliHelpText(induced.discovery));
    return 0;
  }
  // The sole dispatcher is asynchronous because transcript-backed derivers
  // (claude-fleet,
  // claude-session-status, schema-conformance) stream bounded reads.
  const observedAt = processIsoNow();
  const arrival = filesystemArrivalOptions(dataRoot, rootName).onArrival(transportCloudEvent("cli", Object.freeze({
    kind: "metroplat.cli.arrival-material",
    argv: Object.freeze([...dispatchArgs]),
    stdin,
    caller,
  }), observedAt));
  const result = await dispatchProjectedSurface(induced, dispatchArgs, stdin, {
    subject: processOptions.subject,
    caller,
    now: () => observedAt,
    witness: journalRpcWitness(dataRoot, { namespace: rootName }),
    coordinate: processLeaseCoordinator(dataRoot),
    request: arrival.cloudEventIdentity,
    causes: arrival.admission?.statements?.map((statement) => statement.id) ?? [],
  });
  if (result.stdout !== "") writeProcessStdout(result.stdout);
  if (result.stderr !== "") writeProcessStderr(result.stderr);
  return result.code;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "metroplat" });
}
