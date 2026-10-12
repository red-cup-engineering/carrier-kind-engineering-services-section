import { createHash } from "node:crypto";
import {
  agentCardSignatureEvidence,
  discoverSignedAgentCard,
} from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { discoverValidatedAgentCard } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { canonicalDeploymentRecord, identifyDeploymentRecord } from "@red-cup-engineering/deployment-formation-contracts/canonical-record";

const NI_CONTENT_ID = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const CONTENT_ID = /^(?:ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}|urn:sha256:[a-f0-9]{64})$/u;
const REVISION = /^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$/u;

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return plain(value) && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function exactHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value && url.pathname === "/"
      && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

function exactAgentUrl(origin, value) {
  try {
    const url = new URL(value);
    return url.origin === origin && url.pathname === "/.well-known/agent-card.json"
      && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

function exactStringSet(value) {
  return Array.isArray(value) && value.length > 0
    && value.every((entry) => typeof entry === "string" && entry.length > 0)
    && new Set(value).size === value.length;
}

function sameSet(left, right) {
  return left.length === right.length && left.every((entry) => right.includes(entry));
}

function identified(body) {
  return Object.freeze({ id: identifyDeploymentRecord(body), ...body });
}

function validContentAddress(value) {
  if (!CONTENT_ID.test(value?.id ?? "")) return false;
  const { id, ...body } = value;
  try {
    if (id.startsWith("ni:")) return identifyDeploymentRecord(body) === id;
    return `urn:sha256:${createHash("sha256").update(canonicalDeploymentRecord(body)).digest("hex")}` === id;
  } catch { return false; }
}

function stringOrNull(value) { return typeof value === "string" ? value : null; }
function integerOrNull(value) { return Number.isInteger(value) ? value : null; }

function refusal(code, machine, expected, detail) {
  const transportOrigin = stringOrNull(machine?.url) ?? stringOrNull(expected?.machine?.transportOrigin) ?? stringOrNull(expected?.machine?.origin);
  const declaredOrigin = stringOrNull(expected?.declaredOrigin) ?? stringOrNull(expected?.machine?.origin) ?? transportOrigin;
  return identified({
    type: "DeployedProviderObservationRefusal",
    disposition: "refused",
    code,
    resource: stringOrNull(machine?.resource) ?? stringOrNull(expected?.machine?.resource),
    revision: stringOrNull(machine?.revision) ?? stringOrNull(expected?.machine?.revision),
    generation: integerOrNull(machine?.generation) ?? integerOrNull(expected?.machine?.generation),
    origin: declaredOrigin,
    transportOrigin,
    declaredOrigin,
    provider: stringOrNull(expected?.provider),
    detail: String(detail),
  });
}

function validMachine(machine) {
  return machine?.type === "GoogleCloudRunServiceObservation"
    && typeof machine.resource === "string" && machine.resource.length > 0
    && exactKeys(machine.target, ["project", "region", "service"])
    && Object.values(machine.target).every((entry) => typeof entry === "string" && entry.length > 0)
    && Number.isInteger(machine.generation) && machine.generation >= 1
    && REVISION.test(machine.revision ?? "") && exactHttpsOrigin(machine.url)
    && typeof machine.observedAt === "string" && Number.isFinite(Date.parse(machine.observedAt));
}

function validExpected(expected) {
  const legacyMachine = exactKeys(expected?.machine, ["resource", "revision", "generation", "origin"]);
  const stagedMachine = exactKeys(expected?.machine, ["resource", "revision", "generation", "transportOrigin"]);
  const transportOrigin = expected?.machine?.transportOrigin ?? expected?.machine?.origin;
  const declaredOrigin = expected?.declaredOrigin ?? expected?.machine?.origin;
  return plain(expected)
    && (legacyMachine || stagedMachine)
    && typeof expected.machine.resource === "string" && expected.machine.resource.length > 0
    && REVISION.test(expected.machine.revision ?? "")
    && Number.isInteger(expected.machine.generation) && expected.machine.generation >= 1
    && exactHttpsOrigin(transportOrigin) && exactHttpsOrigin(declaredOrigin)
    && (!stagedMachine || Object.hasOwn(expected, "declaredOrigin"))
    && typeof expected.provider === "string" && expected.provider.length > 0
    && typeof expected.customer === "string" && expected.customer.length > 0
    && typeof expected.notebookId === "string" && expected.notebookId.length > 0
    && exactKeys(expected.agentCard, ["identity", "signatureIdentity", "signingKid", "algorithm"])
    && NI_CONTENT_ID.test(expected.agentCard.identity ?? "")
    && NI_CONTENT_ID.test(expected.agentCard.signatureIdentity ?? "")
    && typeof expected.agentCard.signingKid === "string" && expected.agentCard.signingKid.length > 0
    && typeof expected.agentCard.algorithm === "string" && expected.agentCard.algorithm.length > 0
    && exactStringSet(expected.operations)
    && typeof expected.healthOperation === "string" && expected.operations.includes(expected.healthOperation);
}

function deploymentDrift(machine, expected) {
  if (machine.resource !== expected.machine.resource) return "deployment-resource-drift";
  if (machine.revision !== expected.machine.revision) return "deployment-revision-drift";
  if (machine.generation !== expected.machine.generation) return "deployment-generation-drift";
  if (machine.url !== (expected.machine.transportOrigin ?? expected.machine.origin)) return "deployment-origin-drift";
  return null;
}

function cardOperations(card) {
  const operations = (card?.skills ?? []).map((skill) => skill?.id);
  return exactStringSet(operations) ? operations : null;
}

function interfacesAtOrigin(card, origin) {
  const faces = card?.supportedInterfaces;
  if (!Array.isArray(faces) || faces.length === 0) return false;
  return faces.every((face) => {
    try {
      const url = new URL(face?.url);
      return url.protocol === "https:" && url.origin === origin && !url.username && !url.password;
    } catch { return false; }
  });
}

function routePreservingFetch(fetchEffect, transportOrigin, declaredOrigin) {
  return async (input, init) => {
    const source = input instanceof Request ? new URL(input.url) : new URL(String(input));
    if (source.origin !== declaredOrigin && source.origin !== transportOrigin) throw new Error("provider evidence URL escapes the declared and transport origins");
    const routed = new URL(`${source.pathname}${source.search}${source.hash}`, transportOrigin);
    if (input instanceof Request) return fetchEffect(new Request(routed, input), init);
    return fetchEffect(routed, init);
  };
}

function validOperationObservation(value, operation, expected) {
  if (value?.type !== "A2AProviderOperationObservation"
    || !validContentAddress(value) || value.status !== "passed"
    || value.operation !== operation || value.provider !== expected.provider
    || value.customer !== expected.customer || value.notebookId !== expected.notebookId) return false;
  return true;
}

/**
 * Observe one signed A2A application at one exact machine revision.
 *
 * `observeOperation` is deliberately injected: a generic observer may schedule
 * no provider-specific work and may not invent that operation's result law.
 */
export async function observeDeployedA2aProvider({ machine, expected } = {}, {
  fetch: fetchCard = globalThis.fetch,
  observeOperation,
  now = () => new Date().toISOString(),
  signal,
} = {}) {
  if (!validMachine(machine)) return refusal("deployment-observation-invalid", machine, expected, "The machine observation is incomplete or malformed.");
  if (!validExpected(expected)) return refusal("provider-expectation-invalid", machine, expected, "The expected deployment and provider contract are incomplete or malformed.");
  const drift = deploymentDrift(machine, expected);
  if (drift) return refusal(drift, machine, expected, "The observed machine does not equal the exact expected deployment.");
  if (typeof observeOperation !== "function") return refusal("operation-observer-missing", machine, expected, "A provider-owned A2A operation observer is required.");

  const transportOrigin = expected.machine.transportOrigin ?? expected.machine.origin;
  const declaredOrigin = expected.declaredOrigin ?? expected.machine.origin;
  const agentUrl = `${transportOrigin}/.well-known/agent-card.json`;
  const declaredAgentUrl = `${declaredOrigin}/.well-known/agent-card.json`;
  const fetchThroughTransport = routePreservingFetch(fetchCard, transportOrigin, declaredOrigin);
  let card;
  try {
    card = await discoverValidatedAgentCard(agentUrl, {
      requireSignature: true,
      signal,
      discover: (request) => discoverSignedAgentCard({ ...request, agentUrl, declaredAgentUrl, fetch: fetchThroughTransport }),
    });
  } catch (error) {
    return refusal("agent-card-observation-failed", machine, expected, error instanceof Error ? error.message : String(error));
  }
  if (!exactAgentUrl(transportOrigin, agentUrl) || !exactAgentUrl(declaredOrigin, declaredAgentUrl) || !interfacesAtOrigin(card, declaredOrigin)) {
    return refusal("agent-card-origin-drift", machine, expected, "The signed Agent Card does not expose every A2A interface at the declared provider origin.");
  }

  let signature;
  try { signature = agentCardSignatureEvidence(card); }
  catch (error) { return refusal("agent-card-observation-failed", machine, expected, error instanceof Error ? error.message : String(error)); }
  if (signature.card !== expected.agentCard.identity) return refusal("agent-card-identity-drift", machine, expected, "The observed Agent Card content identity differs from policy.");
  if (signature.signature !== expected.agentCard.signatureIdentity) return refusal("agent-card-signature-drift", machine, expected, "The observed Agent Card signature identity differs from policy.");
  if (signature.kid !== expected.agentCard.signingKid || signature.algorithm !== expected.agentCard.algorithm) {
    return refusal("agent-card-signing-drift", machine, expected, "The observed Agent Card signing authority differs from policy.");
  }

  const operations = cardOperations(card);
  if (!operations || !sameSet(operations, expected.operations)) {
    return refusal("provider-operation-drift", machine, expected, "The complete signed Agent Card skill set differs from the expected operation set.");
  }

  const operation = expected.healthOperation;
  let operationObservation;
  try {
    operationObservation = await observeOperation(Object.freeze({
      agentUrl,
      card,
      operation,
      provider: expected.provider,
      customer: expected.customer,
      notebookId: expected.notebookId,
      machine: Object.freeze({ resource: machine.resource, revision: machine.revision, generation: machine.generation, origin: machine.url }),
      declaredOrigin,
      signal,
    }));
  } catch (error) {
    return refusal("operation-health-failed", machine, expected, error instanceof Error ? error.message : String(error));
  }
  if (!validOperationObservation(operationObservation, operation, expected)) {
    return refusal("operation-health-failed", machine, expected, `The ${operation} observation was not an exact passed provider operation observation.`);
  }

  const observedAt = now();
  if (typeof observedAt !== "string" || !Number.isFinite(Date.parse(observedAt))) {
    return refusal("observation-time-invalid", machine, expected, "The application observation time is invalid.");
  }
  return identified({
    type: "DeployedProviderObservation",
    status: "healthy",
    observedAt,
    machine: Object.freeze({
      resource: machine.resource,
      target: Object.freeze(structuredClone(machine.target)),
      revision: machine.revision,
      generation: machine.generation,
      origin: machine.url,
      observedAt: machine.observedAt,
    }),
    provider: expected.provider,
    customer: expected.customer,
    notebookId: expected.notebookId,
    origin: declaredOrigin,
    transportOrigin,
    declaredOrigin,
    agentCard: Object.freeze({
      url: declaredAgentUrl,
      transportUrl: agentUrl,
      provider: expected.provider,
      identity: signature.card,
      signatureIdentity: signature.signature,
      signingKid: signature.kid,
      algorithm: signature.algorithm,
    }),
    operations: Object.freeze([...expected.operations]),
    health: Object.freeze([
      Object.freeze({ name: "agent-card", status: "passed", identity: signature.card, signatureIdentity: signature.signature }),
      Object.freeze({ name: "a2a-operation", status: "passed", operation, observation: operationObservation.id }),
    ]),
  });
}

export default observeDeployedA2aProvider;
