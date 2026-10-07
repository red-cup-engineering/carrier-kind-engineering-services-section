/**
 * Process-root wiring for the MCP stdio service.
 */

import { filesystemArrivalOptions } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { processLeaseCoordinator } from "@red-cup-engineering/computer-system-engine/rpc/coordination";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { filesystemServiceLifecycleSink } from "@red-cup-engineering/computer-system-engine/journal/service-lifecycle";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processEnvValue } from "@red-cup-engineering/node-process-services-section/environment";

import { can, grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import {
  admitCapabilityAssertions,
  readCapabilityAssertions,
} from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { nonempty, resolveInfographProcessOptions } from "@red-cup-engineering/metroplat/process-options";

const MCP_CAPABILITY_RESOURCE = "infograph";
const MCP_CAPABILITY_ISSUER = "infograph:mcp-session-activation";

/** Resolve the actor and optional host stores for one MCP process boundary. */
export function mcpProcessConfig(
  args,
  env,
  cwd = process.cwd(),
) {
  return resolveInfographProcessOptions(args, "claude", env, cwd);
}

/** Admit only catalog-backed capabilities requested at this MCP process boundary. */
export function activateMcpRequestedCapabilities(
  dataRoot,
  induced,
  config,
  now = processIsoNow,
) {
  const available = new Set(induced.operations.map((operation) => operation.verb));
  const unknown = config.requestedCapabilityVerbs.filter((verb) => !available.has(verb));
  if (unknown.length > 0) {
    throw new TypeError(`metroplat-mcp: requested capabilities are not catalog operations: ${unknown.join(", ")}`);
  }

  const assertions = readCapabilityAssertions(dataRoot);
  const requested = config.requestedCapabilityVerbs.map((verb) => `${MCP_CAPABILITY_RESOURCE}#${verb}`);
  const alreadyHeld = [];
  const toGrant = [];
  for (const grants of requested) {
    const standing = can(assertions, config.subject, grants);
    if (standing.value === "held") alreadyHeld.push(grants);
    else if (standing.value === "unknown") toGrant.push(grants);
    else throw new TypeError(`metroplat-mcp: ${config.subject} has ${standing.value} standing for ${grants}`);
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
  dataRoot,
  induced,
  env,
  subject = nonempty(processEnvValue("METROPLAT_MCP_SUBJECT", env)) ?? "claude",
  rootName = "@red-cup-engineering/metroplat",
) {
  const user = processEnvValue("USER", env);
  const caller = Object.freeze({
    transport: "mcp",
    protocol: "json-rpc",
    ...(user === undefined ? {} : { user }),
  });
  return Object.freeze({
    induced,
    // The process boundary supplies the actor. It is capability identity, not
    // metadata inferred from USER or from a tool payload.
    subject,
    // Behind a gateway (bare-cedar-fog.561.group's MCP front door), each call names the signed-in account.
    gatewaySubjects: processEnvValue("METROPLAT_MCP_GATEWAY_SUBJECTS", env) === "1",
    caller,
    now: processIsoNow,
    coordinate: processLeaseCoordinator(dataRoot),
    witness: journalRpcWitness(dataRoot, { namespace: rootName }),
    lifecycle: filesystemServiceLifecycleSink(dataRoot, rootName),
    ...filesystemArrivalOptions(dataRoot, rootName),
  });
}
