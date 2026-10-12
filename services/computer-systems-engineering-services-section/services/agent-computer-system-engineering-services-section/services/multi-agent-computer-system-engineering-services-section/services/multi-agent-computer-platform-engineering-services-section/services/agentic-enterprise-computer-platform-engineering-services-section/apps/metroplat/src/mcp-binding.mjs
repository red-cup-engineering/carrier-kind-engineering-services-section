/**
 * The hosting runtime and MCP surface share one owning binding. Creating it does
 * not establish physical custody: an installed owner must supply the resource.
 */
import path from "node:path";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { processPackageRoot } from "@red-cup-engineering/node-process-services-section/entrypoint";
export function metroplatFilesystemBinding(dataRoot, options = {}) {
  return defaultFilesystemBinding(dataRoot, { ...options, packageRoot: options.packageRoot ?? processPackageRoot(import.meta.url) });
}
export function requireMetroplatBinding(binding, dataRoot) {
  if (!binding || typeof binding !== "object" || typeof binding.dataRoot !== "string"
    || binding.dataRoot !== path.resolve(dataRoot)) {
    throw new TypeError("MetroPlat owning binding must serve the exact configured data root");
  }
  return binding;
}
