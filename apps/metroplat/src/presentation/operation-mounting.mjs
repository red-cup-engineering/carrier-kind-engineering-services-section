/** Lightweight operation-family mounting used during catalog assembly. Rich namespace rendering
 * remains in mounting.mjs and is loaded only when its resource is read. */
import { schemaNodeId } from "@red-cup-engineering/metrologic/settling/schema/site";
import { projectSurface } from "./surface.mjs";
import { resource } from "@red-cup-engineering/computer-system-engine/rpc/resource";

const behaviorNodePrefix = (module) => (module.split("/").filter(Boolean).at(-1) ?? "action").replace(/^@/, "") || "action";
const moduleOperationNodeOf = (module, operation) => schemaNodeId(operation.domain?.id ?? operation.codomain?.id ?? `${behaviorNodePrefix(module)}/${operation.verb}`);

function operationsByNode(operations, nodeOf) {
  const byNode = new Map();
  for (const operation of operations) byNode.set(nodeOf(operation), [...(byNode.get(nodeOf(operation)) ?? []), operation]);
  return byNode;
}

export function moduleMounts(module, operations, options = {}) {
  const byNode = operationsByNode(operations, (operation) => moduleOperationNodeOf(module, operation));
  return Object.freeze([...byNode.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([nodeId, at]) => Object.freeze({
    name: byNode.size === 1 ? module : `${module}:${nodeId}`,
    induced: lazySurface(at, { ...options, packageName: module }),
    nodeId,
  })));
}

function lazySurface(operations, options) {
  let projected;
  const read = (field) => (projected ??= projectSurface(operations, options))[field];
  return Object.freeze({
    operations: Object.freeze([...operations]),
    get discovery() { return read("discovery"); },
    get capabilities() { return read("capabilities"); },
    get catalog() { return read("catalog"); },
    get description() { return read("description"); },
    get authorize() { return read("authorize"); },
    get resources() { return read("resources"); },
    get prompts() { return read("prompts"); },
  });
}

export const schemaNamespaceUri = () => "metroplat://schema-namespace";

export function schemaNamespaceResource(mounts) {
  return resource({
    uri: schemaNamespaceUri(),
    name: "schema namespace",
    description: "The mounted schema-node mesh: namespace nodes, module mounts, per-mount operations manifolds, and the cross-module composition graph.",
    read: async () => {
      const { schemaNamespaceReport } = await import("./mounting.mjs");
      return `${JSON.stringify(schemaNamespaceReport(mounts()), null, 2)}\n`;
    },
  });
}
