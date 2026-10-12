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
} from "@red-cup-engineering/node-process-services-section";
import type { McpStdioServiceOptions } from "./mcp/stdio.mts";
import type { ProjectedSurface } from "../../presentation/index.mts";
import { can, grantAssertion } from "../../lib/capability/index.mts";
import {
  admitCapabilityAssertions,
  readCapabilityAssertions,
} from "../../integrations/filesystem/services/capability-assertions.mts";
import { nonempty, resolveInfographProcessOptions, type InfographProcessOptions } from "./process-options.mts";

export type McpProcessConfig = InfographProcessOptions;

const MCP_CAPABILITY_RESOURCE = "infograph";
const MCP_CAPABILITY_ISSUER = "infograph:mcp-session-activation";

/** Resolve the actor and optional host stores for one MCP process boundary. */
export function mcpProcessConfig(
  args: readonly string[],
  env: ProcessEnvironment = process.env,
  cwd = process.cwd(),
): McpProcessConfig {
  return resolveInfographProcessOptions(args, "claude", env, cwd);
}

export interface McpCapabilityActivation {
  readonly subject: string;
  readonly requested: readonly string[];
  readonly granted: readonly string[];
  readonly alreadyHeld: readonly string[];
}

/** Admit only catalog-backed capabilities requested at this MCP process boundary. */
export function activateMcpRequestedCapabilities(
  dataRoot: string,
  induced: ProjectedSurface,
  config: McpProcessConfig,
  now = processIsoNow,
): McpCapabilityActivation {
  const available = new Set(induced.operations.map((operation) => operation.verb));
  const unknown = config.requestedCapabilityVerbs.filter((verb) => !available.has(verb));
  if (unknown.length > 0) {
    throw new TypeError(`infograph-mcp: requested capabilities are not catalog operations: ${unknown.join(", ")}`);
  }

  const assertions = readCapabilityAssertions(dataRoot);
  const requested = config.requestedCapabilityVerbs.map((verb) => `${MCP_CAPABILITY_RESOURCE}#${verb}`);
  const alreadyHeld: string[] = [];
  const toGrant: string[] = [];
  for (const grants of requested) {
    const standing = can(assertions, config.subject, grants);
    if (standing.value === "held") alreadyHeld.push(grants);
    else if (standing.value === "unknown") toGrant.push(grants);
    else throw new TypeError(`infograph-mcp: ${config.subject} has ${standing.value} standing for ${grants}`);
  }

  if (toGrant.length > 0) {
    const at = now();
    admitCapabilityAssertions({
      dataRoot,
      rootName: MCP_CAPABILITY_RESOURCE,
      date: at.slice(0, 10),
      assertions: toGrant.map((grants) => grantAssertion(MCP_CAPABILITY_ISSUER, config.subject, grants, at)),
    });
  }
  return Object.freeze({
    subject: config.subject,
    requested: Object.freeze(requested),
    granted: Object.freeze(toGrant),
    alreadyHeld: Object.freeze(alreadyHeld),
  });
}

/** Service options derived from the resolved process data root. */
export function mcpOptions(
  dataRoot: string,
  induced: McpStdioServiceOptions["induced"],
  env: ProcessEnvironment = process.env,
  subject = nonempty(processEnvValue("METROPLAT_MCP_SUBJECT", env)) ?? "claude",
): McpStdioServiceOptions {
  const user = processEnvValue("USER", env);
  const caller = Object.freeze({
    transport: "mcp" as const,
    protocol: "json-rpc" as const,
    ...(user === undefined ? {} : { user }),
  });
  return Object.freeze({
    induced,
    // The process boundary supplies the actor. It is capability identity, not
    // metadata inferred from USER or from a tool payload.
    subject,
    caller,
    now: processIsoNow,
    witness: journalRpcWitness(dataRoot),
    lifecycle: filesystemServiceLifecycleSink(dataRoot, "@red-cup-engineering/metroplat"),
    ...filesystemArrivalOptions(dataRoot, "@red-cup-engineering/metroplat"),
  });
}
