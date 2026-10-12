#!/usr/bin/env node
/**
 * infograph-serve - the HTTP/OpenAPI/MCP/web-UX transport over the package's operations.
 *
 * The four transports are functorial images of the one `projectSurface` apex: CLI is
 * the `infograph` dispatcher; this binds the same operations to a `node:http` server
 * exposing `GET /` (hole site surface), `POST /` (root hole observation),
 * `GET /:verb` (HTML form), `POST /:verb` (body->stdin->stdout),
 * `GET /openapi.json`, and `POST /mcp`. Operation POSTs run through `dispatch`,
 * while root hole observations write exact EAVT under the configured process data root.
 *
 *   infograph-serve
 *   METROPLAT_DATA_ROOT=/path/to/root infograph-serve
 *   infograph-serve --data-root /path/to/root
 */
import { assembleDefaultService } from "../apps/infograph/catalog.mts";
import { defaultFilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { dataViewResources } from "../dashboards/standing-view/index.mts";
import { tileResource } from "../dashboards/tile/index.mts";
import { discoverClaudeSessionTranscripts, readClaudeSessionWorkClaims } from "../integrations/anthropic/service.mts";
import { filesystemArrivalOptions } from "../integrations/filesystem/services/arrival.mts";
import { filesystemRpcFeedResponder, journalRpcWitness } from "../integrations/filesystem/services/rpc-witness.mts";
import { journalEncounterStore } from "../integrations/filesystem/services/encounter-store.mts";
import { encounterExecutionControl } from "../encounter/index.mts";
import { filesystemServiceLifecycleSink } from "../dashboards/service-lifecycle/index.mts";
import { appendHoleObservationAtRoot } from "../sites/hole/record.mts";
import { isDirectEntrypoint, processArguments, processDataRootConfig, processEntrypointArgument, processEnvNumber, processEnvValue, processIsoNow, processPackageRoot, writeProcessStderr, writeProcessStdout } from "../integrations/process/services/index.mts";
import { serveSchemaNamespace } from "../apps/infograph/http/server.mts";
import { holeRootRoute, holeRouteOwner } from "../sites/hole/route.mts";
import { authorizationFromCapabilityAssertions, authorizationFromStanding } from "../rpc/index.mts";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "../../../../../src/agents/inference/index.mts";
import { openAIChatInferenceSource } from "../integrations/openai/inference-client.mts";
import { AGENT_WORKER_STAGE_VERBS, runAgentWorkerEngine } from "../integrations/agent-worker/index.mts";
import { grantAssertion } from "../lib/capability/index.mts";
import { admitCapabilityAssertions, readCapabilityAssertions } from "../integrations/filesystem/services/capability-assertions.mts";

function main(): void {
  const port = processEnvNumber("PORT", 8787);
  const host = processEnvValue("HOST");
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args: processArguments(),
    envName: "METROPLAT_DATA_ROOT",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;
  const rootName = "@red-cup-engineering/metroplat";
  const subject = "anonymous";
  // The served surface is the mesh of module families: each module's operations
  // mount at the schema nodes they act on; the root node is the pooled
  // coproduct. read/write bind to this node's own root: the node IS the site it
  // admits into.
  const binding = defaultFilesystemBinding(dataRoot, { packageRoot: processPackageRoot(import.meta.url), now: processIsoNow });
  const assembly = assembleDefaultService(binding, rootName);
  const mounts = assembly.mounts;
  const encounters = journalEncounterStore(dataRoot, { namespace: rootName });
  const encounterControl = encounterExecutionControl();
  const inferenceProvider = inferenceProviderOperation(
    "openai.chat-completions",
    openAIChatInferenceSource({ now: processIsoNow }),
    encounters,
    encounterControl,
  );
  const inferenceBinding = {
    operation: inferenceProvider,
    encounters,
    witness: journalRpcWitness(dataRoot, { namespace: rootName }),
    authorize: authorizationFromCapabilityAssertions(
      authorizationFromStanding(new Map([[inferenceProvider.ref, "held"]]), "infograph-inference-provider"),
      () => readCapabilityAssertions(dataRoot),
      "settled-capability-assertions",
    ),
    now: processIsoNow,
  };
  const inferenceEncounters = witnessedInferenceEncounterPort(inferenceBinding);
  const workerModel = processEnvValue("METROPLAT_AGENT_WORKER_MODEL");
  const workerAbort = new AbortController();
  const server = serveSchemaNamespace(mounts, {
    rootPackage: rootName,
    title: rootName,
    routeOwner: holeRouteOwner(),
    rootRoute: holeRootRoute({
      observation: (input, observationOptions) => appendHoleObservationAtRoot(dataRoot, input, {
        ...observationOptions,
        rootName,
      }),
    }),
    resources: [
      ...dataViewResources({ binding }),
      // No transcript-count cap: `readClaudeSessionTranscript`/
      // `readClaudeSessionWorkClaims` now bound each transcript's own read to
      // a fixed byte budget (`src/integrations/anthropic/service`), the durable fix for
      // the earlier 4-transcript/6GB-heap stopgap this replaces.
      ...(binding.claudeSessionRoot === undefined ? [] : [tileResource({
        source: async () => {
          const discovery = await discoverClaudeSessionTranscripts(binding.claudeSessionRoot!);
          return Promise.all(discovery.matches.map((match) => readClaudeSessionWorkClaims(binding.claudeSessionRoot!, match.relative)));
        },
      })]),
    ],
    now: processIsoNow,
    witness: journalRpcWitness(dataRoot, { namespace: rootName }),
    ...filesystemArrivalOptions(dataRoot, rootName),
    journalFeed: filesystemRpcFeedResponder(dataRoot, rootName, processIsoNow),
    claimSession: { dataRoot, rootName, now: processIsoNow },
    lifecycle: filesystemServiceLifecycleSink(dataRoot, rootName),
    subject,
    caller: { transport: "http" },
    openAIChat: { inference: inferenceEncounters, subject },
  });
  const operations = mounts.reduce((count, mount) => count + mount.induced.operations.length, 0);
  server.once("close", () => workerAbort.abort());
  server.listen(port, host, () => {
    writeProcessStdout(`infograph-serve: ${operations} operations across ${mounts.length} module mounts on http://${host ?? "localhost"}:${port}/\n`);
    if (workerModel !== undefined && workerModel.length > 0) {
      const workerId = processEnvValue("METROPLAT_AGENT_WORKER_ID") ?? "infograph-worker";
      const intervalMs = processEnvNumber("METROPLAT_AGENT_WORKER_INTERVAL_MS", 1_000);
      const maxTurns = processEnvNumber("METROPLAT_AGENT_WORKER_MAX_TURNS", 8);
      const workerCapabilityVerbs = new Set([
        ...AGENT_WORKER_STAGE_VERBS,
        ...(processEnvValue("METROPLAT_AGENT_WORKER_CAPABILITIES") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ]);
      const workerCapabilities = [...workerCapabilityVerbs]
        .map((verb) => grantAssertion(rootName, workerId, `${rootName}#${verb}`, processIsoNow()));
      admitCapabilityAssertions({
        dataRoot,
        rootName,
        date: processIsoNow().slice(0, 10),
        assertions: workerCapabilities,
      });
      writeProcessStdout(`infograph-serve: agent worker ${workerId} consuming assigned work with ${workerModel}\n`);
      void runAgentWorkerEngine(assembly.apex, {
        dataRoot,
        rootName,
        workerId,
        model: workerModel,
        inference: inferenceEncounters,
        intervalMs,
        maxTurns,
        signal: workerAbort.signal,
        now: processIsoNow,
      }).catch((error: unknown) => {
        writeProcessStderr(`infograph-serve: agent worker stopped: ${error instanceof Error ? error.message : String(error)}\n`);
      });
    }
  });
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  main();
}
