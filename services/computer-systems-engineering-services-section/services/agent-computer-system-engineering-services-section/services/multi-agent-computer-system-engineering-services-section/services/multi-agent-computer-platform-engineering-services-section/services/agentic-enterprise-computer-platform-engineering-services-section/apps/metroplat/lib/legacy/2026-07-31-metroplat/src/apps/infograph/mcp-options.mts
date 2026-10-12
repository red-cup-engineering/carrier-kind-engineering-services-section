/**
 * Process-root wiring for the MCP stdio service.
 */

import { filesystemArrivalOptions } from "../../integrations/filesystem/services/arrival.mts";
import { journalRpcWitness } from "../../integrations/filesystem/services/rpc-witness.mts";
import { filesystemServiceLifecycleSink } from "../../dashboards/service-lifecycle/index.mts";
import {
  processEnvValue,
  processIsoNow,
  type ProcessEnvironment,
} from "../../integrations/process/index.mts";
import type { McpStdioServiceOptions } from "./mcp/stdio.mts";

/** Service options derived from the resolved process data root. */
export function mcpOptions(
  dataRoot: string,
  induced: McpStdioServiceOptions["induced"],
  env: ProcessEnvironment = process.env,
): McpStdioServiceOptions {
  const user = processEnvValue("USER", env);
  const caller = Object.freeze({
    transport: "mcp" as const,
    protocol: "json-rpc" as const,
    ...(user === undefined ? {} : { user }),
  });
  return Object.freeze({
    induced,
    // The MCP boundary presents a named subject so its capability standing is
    // grantable per-holder, rather than authorizing every anonymous caller of
    // this data root. Grants for this holder are admitted to the data root's
    // capability-assertions feed (see `admitCapabilityAssertions`).
    subject: "claude",
    caller,
    now: processIsoNow,
    witness: journalRpcWitness(dataRoot),
    lifecycle: filesystemServiceLifecycleSink(dataRoot, "@red-cup-engineering/metroplat"),
    ...filesystemArrivalOptions(dataRoot, "@red-cup-engineering/metroplat"),
  });
}
