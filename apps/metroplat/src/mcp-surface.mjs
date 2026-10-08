/**
 * MCP service apex selection for the package operation family.
 */

import { assembleDefaultServiceMcp } from "./catalog.mjs";
import {metroplatFilesystemBinding,requireMetroplatBinding} from "./mcp-binding.mjs";

/**
 * The induced MCP apex, read/write bound to the service's own data root: the
 * node IS the site it admits into, so MCP callers never name a filesystem
 * root. `dataRoot` is required — every derivation (read/write, and every
 * named state-cut) needs a real root to read against; callers with no
 * explicit root pass the package root, same as every other boundary process.
 */

export function defaultMcpApex(
  dataRoot,
  { trustedOperationSources = [], workOptions = {}, presentationOptions = {}, rootName = "@red-cup-engineering/metroplat", descriptorFamilies, binding:owningBinding, ...bindingOptions } = {},
) {
  const binding = requireMetroplatBinding(owningBinding ?? metroplatFilesystemBinding(dataRoot,bindingOptions),dataRoot);
  return assembleDefaultServiceMcp(binding, rootName, trustedOperationSources, workOptions, descriptorFamilies, presentationOptions).apex;
}
