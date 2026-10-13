#!/usr/bin/env node
/**
 * infograph-mcp - stdio MCP server for the package operation surface.
 */
import { conurbationMcpApex } from "../apps/infograph/mcp-surface.mts";
import { mcpOptions } from "../apps/infograph/mcp-options.mts";
import { serveMcpStdio } from "../apps/infograph/mcp/index.mts";
import { isDirectEntrypoint, processArguments, processDataRootConfig, processEntrypointArgument, processPackageRoot, processStdin, processStdout, runProcessMain } from "../integrations/process/index.mts";

async function main(): Promise<number> {
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args: processArguments(),
    envName: "METROPLAT_DATA_ROOT",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;
  // A data root's own single-apex behavior is unchanged: `conurbationMcpApex`
  // is exactly `defaultMcpApex(dataRoot)` whenever 0 or 1 inhabited roots are
  // discovered under it. It only composes when `dataRoot` really is a
  // conurbation of more than one inhabited root.
  const induced = conurbationMcpApex(dataRoot);
  await serveMcpStdio(processStdin(), processStdout(), {
    ...mcpOptions(dataRoot, induced),
  });
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "infograph-mcp" });
}
