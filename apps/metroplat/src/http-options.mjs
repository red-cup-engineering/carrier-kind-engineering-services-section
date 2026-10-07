/** Process-root identity and least-privilege capability activation for HTTP. */

import { can, grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { timingSafeStringEqual } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import {
  admitCapabilityAssertions,
  readCapabilityAssertions,
} from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processEnvValue } from "@red-cup-engineering/node-process-services-section/environment";

const HTTP_CAPABILITY_RESOURCE = "infograph";
const HTTP_CAPABILITY_ISSUER = "infograph:http-service-activation";
const CAPABILITY_VERB = /^[A-Za-z0-9][A-Za-z0-9_-]*$/u;

function nonempty(value) {
  const normalized = value?.trim();
  return normalized === undefined || normalized === "" ? undefined : normalized;
}

function flagValue(args, flag) {
  let value;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg !== flag && !arg.startsWith(`${flag}=`)) continue;
    if (value !== undefined) throw new TypeError(`metroplat-serve: ${flag} must be supplied once`);
    const next = arg === flag ? nonempty(args[index + 1]) : nonempty(arg.slice(flag.length + 1));
    if (next === undefined || (arg === flag && next.startsWith("--"))) {
      throw new TypeError(`metroplat-serve: ${flag} requires a non-empty value`);
    }
    value = next;
    if (arg === flag) index += 1;
  }
  return value;
}

function capabilityVerbs(value) {
  if (value === undefined) return Object.freeze([]);
  const verbs = value.split(",").map((item) => item.trim());
  if (verbs.length === 0 || verbs.some((verb) => !CAPABILITY_VERB.test(verb))) {
    throw new TypeError("metroplat-serve: requested capabilities must be a comma-separated list of operation verbs");
  }
  if (new Set(verbs).size !== verbs.length) {
    throw new TypeError("metroplat-serve: requested capabilities must not repeat operation verbs");
  }
  return Object.freeze(verbs);
}

/** Resolve one fixed HTTP service actor. Anonymous receives no implicit standing. */
export function httpProcessConfig(
  args,
  env,
) {
  const configuredSubject = flagValue(args, "--subject") ?? nonempty(processEnvValue("METROPLAT_HTTP_SUBJECT", env));
  const requestedCapabilityVerbs = capabilityVerbs(
    flagValue(args, "--capabilities") ?? nonempty(processEnvValue("METROPLAT_HTTP_CAPABILITIES", env)),
  );
  const assertedCapabilityVerbs = capabilityVerbs(
    flagValue(args, "--asserted-capabilities") ?? nonempty(processEnvValue("METROPLAT_HTTP_ASSERTED_CAPABILITIES", env)),
  );
  if (configuredSubject === undefined && requestedCapabilityVerbs.length > 0) {
    throw new TypeError("metroplat-serve: requested capabilities require an explicit HTTP subject");
  }
  const overlap = assertedCapabilityVerbs.filter((verb) => requestedCapabilityVerbs.includes(verb));
  if (overlap.length > 0) {
    throw new TypeError(`metroplat-serve: asserted capabilities must not overlap requested capabilities: ${overlap.join(", ")}`);
  }
  // Never read from argv: a gateway token belongs to process environment, not a command line.
  const gatewayToken = nonempty(processEnvValue("METROPLAT_HTTP_GATEWAY_TOKEN", env));
  if (assertedCapabilityVerbs.length > 0 && gatewayToken === undefined) {
    throw new TypeError("metroplat-serve: asserted capabilities require METROPLAT_HTTP_GATEWAY_TOKEN");
  }
  return Object.freeze({
    subject: configuredSubject ?? "anonymous",
    requestedCapabilityVerbs,
    assertedCapabilityVerbs,
    ...(gatewayToken === undefined ? {} : { gatewayToken }),
  });
}

/** Admit only explicitly requested, catalog-backed, non-mutating HTTP standing. */
export function activateHttpRequestedCapabilities(
  dataRoot,
  operations,
  config,
  now = processIsoNow,
) {
  const available = new Map(operations.map((operation) => [operation.verb, operation]));
  const unknown = config.requestedCapabilityVerbs.filter((verb) => !available.has(verb));
  if (unknown.length > 0) {
    throw new TypeError(`metroplat-serve: requested capabilities are not catalog operations: ${unknown.join(", ")}`);
  }
  // Asserted verbs are never granted here (see assertedHttpSubject), but they
  // must still name real catalog operations, mutating or not.
  const unknownAsserted = (config.assertedCapabilityVerbs ?? []).filter((verb) => !available.has(verb));
  if (unknownAsserted.length > 0) {
    throw new TypeError(`metroplat-serve: asserted capabilities are not catalog operations: ${unknownAsserted.join(", ")}`);
  }
  const mutating = config.requestedCapabilityVerbs.filter((verb) => {
    const effectClass = available.get(verb).effects.class;
    return effectClass === "journal-write" || effectClass === "external";
  });
  if (mutating.length > 0) {
    throw new TypeError(`metroplat-serve: requested HTTP capabilities must be non-mutating operations: ${mutating.join(", ")}`);
  }

  const assertions = readCapabilityAssertions(dataRoot);
  const requested = config.requestedCapabilityVerbs.map((verb) => `${HTTP_CAPABILITY_RESOURCE}#${verb}`);
  const alreadyHeld = [];
  const toGrant = [];
  for (const grants of requested) {
    const standing = can(assertions, config.subject, grants);
    if (standing.value === "held") alreadyHeld.push(grants);
    else if (standing.value === "unknown") toGrant.push(grants);
    else throw new TypeError(`metroplat-serve: ${config.subject} has ${standing.value} standing for ${grants}`);
  }

  if (toGrant.length > 0) {
    const at = now();
    admitCapabilityAssertions({
      dataRoot,
      rootName: HTTP_CAPABILITY_RESOURCE,
      date: at.slice(0, 10),
      assertions: toGrant.map((grants) => grantAssertion(HTTP_CAPABILITY_ISSUER, config.subject, grants, at)),
    });
  }
  return Object.freeze({
    subject: config.subject,
    requested: Object.freeze(requested),
    granted: Object.freeze(toGrant),
    alreadyHeld: Object.freeze(alreadyHeld),
  });
}

const ASSERTED_SUBJECT_HEADER = "x-metroplat-subject";
const ASSERTED_GATEWAY_TOKEN_HEADER = "x-metroplat-gateway-token";
const ASSERTED_SUBJECT_PATTERN = /^[A-Za-z][A-Za-z0-9_.:+-]*$/u;
const ASSERTED_SUBJECT_MAX_LENGTH = 512;

function singleHeaderValue(headers, name) {
  const value = headers[name];
  return typeof value === "string" ? value : undefined;
}

/**
 * Recognize a gateway-asserted per-request subject.
 *
 * Returns the `x-metroplat-subject` header value only when `config.gatewayToken`
 * is configured, the request presents it exactly (constant-time, length-guarded)
 * in `x-metroplat-gateway-token`, and the subject is a non-empty, bounded,
 * grammatically admitted principal name. Never throws: any malformed input
 * yields `undefined`, i.e. no assertion, i.e. the process subject applies.
 *
 * @param headers - Inbound request headers.
 * @param config - The process's own HTTP configuration, carrying `gatewayToken`.
 * @returns The asserted subject, or `undefined` when no valid assertion is present.
 */
export function assertedHttpSubject(headers, config) {
  try {
    if (config.gatewayToken === undefined) return undefined;
    const token = singleHeaderValue(headers, ASSERTED_GATEWAY_TOKEN_HEADER);
    if (token === undefined || !timingSafeStringEqual(token, config.gatewayToken)) return undefined;
    const subject = singleHeaderValue(headers, ASSERTED_SUBJECT_HEADER);
    if (subject === undefined || subject.length === 0 || subject.length > ASSERTED_SUBJECT_MAX_LENGTH) return undefined;
    return ASSERTED_SUBJECT_PATTERN.test(subject) ? subject : undefined;
  } catch {
    return undefined;
  }
}
