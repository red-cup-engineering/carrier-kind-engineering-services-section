/**
 * src/mcp-host - MetroPlat's MCP surface over one data root, built in the process that serves it.
 * A node mounts the returned handler directly (an in-process MCP transport); nothing starts
 * MetroPlat as a child of its own. `environment` carries MetroPlat's settings (METROPLAT_*), and
 * `args` the same flags the CLI reads. A hosting service passes instancePath
 * directly; CLI callers may select an instance through process options.
 */
import { activateMcpRequestedCapabilities, mcpOptions, mcpProcessConfig } from "@red-cup-engineering/metroplat/mcp-options";
import { installedMetroplatFromProcessOptions, installedMetroplatInstance } from "@red-cup-engineering/metroplat/instance";
import {metroplatFilesystemBinding,requireMetroplatBinding} from "./mcp-binding.mjs";
import { programMcpToolsWithEndpoints } from "./presentation/program-surface.mjs";
import { platformOperationFamilyDescriptors } from "./catalog.mjs";

export async function openMetroplatMcp({ dataRoot, environment = process.env, args = [], instancePath, moduleBasePath, createWorkOptions, binding:owningBinding, operationSources = [] } = {}) {
  const processConfig = mcpProcessConfig(args, environment);
  if (instancePath !== undefined && (typeof instancePath !== "string" || instancePath.length === 0)) {
    throw new TypeError("MetroPlat instance path must be a nonempty string");
  }
  if (instancePath !== undefined && processConfig.instance !== undefined && processConfig.instance !== instancePath) {
    throw new TypeError("MetroPlat host instance differs from process options");
  }
  const install = (binding, options = {}) => instancePath === undefined
    ? installedMetroplatFromProcessOptions(processConfig, binding, options)
    : installedMetroplatInstance(instancePath, binding, options, moduleBasePath ?? instancePath);
  if(owningBinding!==undefined)requireMetroplatBinding(owningBinding,dataRoot);
  const installed = await install(null);
  let opened;
  const open = async () => opened ??= (async () => {
  const rootName = installed.identity.id;
  let induced;
  const hostedWork = createWorkOptions === undefined ? {} : await createWorkOptions({
    identity: installed.identity,
    dataRoot,
    environment,
    processConfig,
    operationOf: (reference) => induced?.operations.find((candidate) => candidate.ref === reference),
    operationSurface: () => induced,
  });
  if (hostedWork === null || typeof hostedWork !== "object" || Array.isArray(hostedWork)) {
    throw new TypeError("MetroPlat host work options must be an object");
  }
  const workOptions = Object.freeze({ ...hostedWork, environment, instanceIdentity: installed.identity });
  const repositoryRoot = owningBinding?.repositoryRoot ?? environment.METROPLAT_REPOSITORY_ROOT;
  const binding = requireMetroplatBinding(owningBinding ?? metroplatFilesystemBinding(dataRoot,{repositoryRoot}),dataRoot);
  // An instance serves its own data root. Other nodes are federated as declared peers by the
  // host; MetroPlat does not discover them by walking the filesystem.
  const { defaultMcpApex } = await import("./mcp-surface.mjs");
  const operational = await install(binding,workOptions);
  induced = defaultMcpApex(dataRoot, {
    rootName,
    binding,
    ...(repositoryRoot === undefined ? {} : { repositoryRoot }),
    ...(processConfig.claudeSessionRoot === undefined ? {} : { claudeSessionRoot: processConfig.claudeSessionRoot }),
    ...(processConfig.codexSessionRoot === undefined ? {} : { codexSessionRoot: processConfig.codexSessionRoot }),
    trustedOperationSources: [...operational.operationSources, ...operationSources],
    presentationOptions: { deriveSchemaResources: false, deriveLspResources: false, derivePrompts: false },
    workOptions,
    ...(hostedWork.agencyRoot===undefined?{}:{agencyRoot:hostedWork.agencyRoot}),
    ...(hostedWork.resolveActorSubject===undefined?{}:{resolveActorSubject:hostedWork.resolveActorSubject}),
    ...((instancePath ?? processConfig.instance) === undefined ? {} : { descriptorFamilies: platformOperationFamilyDescriptors }),
  });
  activateMcpRequestedCapabilities(dataRoot, induced, processConfig);
  const options = mcpOptions(dataRoot, induced, environment, processConfig.subject, rootName);
  return Object.freeze({ induced, options });
  })();
  return Object.freeze({
    operationSurface: async () => (await open()).induced,
    handle: async (message) => {
      if (message?.method === "initialize") return { jsonrpc: "2.0", id: message.id, result: {
        protocolVersion: ["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"].includes(message.params?.protocolVersion) ? message.params.protocolVersion : "2025-11-25",
        capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false } },
        serverInfo: { name: installed.identity.id, version: "0.1.0" },
      } };
      if (message?.method === "tools/list") {
        const { induced } = await open();
        return { jsonrpc: "2.0", id: message.id, result: {
          tools: programMcpToolsWithEndpoints(induced.operations, induced.discovery.programs, induced.discovery.package),
        } };
      }
      const runtime = await open();
      const { programMcpHandle } = await import("./presentation/serving.mjs");
      return (await programMcpHandle(runtime.induced, message, runtime.options)) ?? null;
    },
  });
}
