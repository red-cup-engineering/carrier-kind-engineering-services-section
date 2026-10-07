import { parentPort, workerData } from "node:worker_threads";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { installedMetroplatInstance } from "@red-cup-engineering/metroplat/instance";
import { enterpriseWebConfig } from "./instance-config.mjs";
import { installedEnterpriseWeb } from "./installed-web.mjs";
import { enterpriseOperationRuntime } from "./enterprise-runtime.mjs";
import { openMetroplatMcp } from "@red-cup-engineering/metroplat/mcp-host";
import { metroplatEnvironment } from "./serve-instance.mjs";

const environment = { ...workerData.environment };
const executionContext = new AsyncLocalStorage();
const pendingOpenings = new Map();

function openOnHost(opening) {
  const executionId = executionContext.getStore();
  if (typeof executionId !== "string") throw new TypeError("federated opening requires an active enterprise execution");
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    pendingOpenings.set(id, { resolve, reject });
    try { parentPort.postMessage({ kind: "open-work", id, executionId, opening }); }
    catch (error) { pendingOpenings.delete(id); reject(error); }
  });
}

async function openExecutionSurface() {
  const web = await installedEnterpriseWeb(workerData.hostPath);
  const instancePath = web.instancePath;
  const installedMetroplat = await installedMetroplatInstance(instancePath, null, {}, workerData.hostPath);
  const installed = { ...installedMetroplat, web };
  const config = enterpriseWebConfig(installed, instancePath, environment, { requireTls: true });
  Object.assign(environment, Object.fromEntries(Object.entries(metroplatEnvironment(config)).filter(([, value]) => value !== undefined)));
  const runtime = enterpriseOperationRuntime({ installed, config, environment, activityPubProvider: () => undefined, openWork: openOnHost });
  const metroplat = await openMetroplatMcp({
    dataRoot: config.metroplatDataRoot,
    clockStateRoot: path.join(config.stateDir, "clock"),
    environment,
    instancePath,
    moduleBasePath: installed.web.hostPath,
    operationSources: runtime.operationSources,
    createWorkOptions: runtime.createWorkOptions,
  });
  const surface = await metroplat.operationSurface();
  // Only the already-authorized execution operation crosses this boundary.
  // Intake and execution bodies run here; an opening alone crosses back to the
  // host thread, where the supervised ActivityPub provider and queue remain owned.
  const operations = new Map(surface.operations
    .filter((candidate) => candidate.verb === "enterprise-loop-run" || candidate.verb === "enterprise-work-run")
    .map((candidate) => [candidate.verb, candidate]));
  if (operations.size !== 2) throw new TypeError("enterprise execution worker has no complete enterprise turn operation family");
  return operations;
}

let operations;
// Link-only (a boot probe): every static import above has linked by now; open nothing.
const ready = workerData.linkOnly === true
  ? Promise.resolve().then(() => parentPort.postMessage({ kind: "linked" }))
  : openExecutionSurface().then((opened) => {
    operations = opened;
    parentPort.postMessage({ kind: "ready" });
  });

parentPort.on("message", async (message) => {
  if (message?.kind === "open-work-result") {
    const pending = pendingOpenings.get(message.id);
    if (pending === undefined) return;
    pendingOpenings.delete(message.id);
    if (message.ok) pending.resolve(message.value);
    else {
      const error = new Error(message.error?.message ?? "host work opening failed");
      error.name = message.error?.name ?? "Error";
      pending.reject(error);
    }
    return;
  }
  if (message?.kind !== "execute") return;
  const { id, operation: verb, input, arguments: arguments_, context } = message;
  try {
    await ready;
    const operation = operations.get(verb);
    if (operation === undefined) throw new TypeError(`enterprise worker does not serve ${String(verb)}`);
    const value = await executionContext.run(id, () => operation.execute(input, arguments_, Object.freeze({
      kind: "metroplat.rpc.execution-context", invocation: context.invocation, decision: context.decision, operation,
      startedAt: context.startedAt, evidence: context.evidence,
    })));
    parentPort.postMessage({ kind: "result", id, value });
  } catch (error) {
    parentPort.postMessage({ kind: "error", id, error: { name: error?.name ?? "Error", message: error instanceof Error ? error.message : String(error) } });
  }
});

ready.catch((error) => parentPort.postMessage({ kind: "startup-error", error: { message: error instanceof Error ? error.message : String(error) } }));
