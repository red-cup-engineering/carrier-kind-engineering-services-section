import { isCanonicalSha256NiUri } from "@red-cup-engineering/semantic-content-identify-service";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const SHA = /^sha256:[a-f0-9]{64}$/u;
const PROVIDER = "urn:ame:codex-session-activity-provider:tool-observation";

function freeze(value) { if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value; for (const child of Object.values(value)) freeze(child); return Object.freeze(value); }
function identify(value, objectKind = `modeled-union-dimension.${value?.type ?? "material"}`) { return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token; }
function exactNi(value, label) { if (!isCanonicalSha256NiUri(value)) throw new TypeError(`${label} must be a canonical SHA-256 ni identifier`); return value; }
function timestamp(value, label) { if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${label} must be an exact timestamp`); return value; }

function admit(admission, index) {
  if (admission?.carrier?.type !== "CodexToolInvocationObservationReceipt") return null;
  const receipt = admission.carrier.value;
  if (receipt?.type !== "CodexToolInvocationObservationReceipt" || receipt.version !== 1 || receipt.disposition !== "observed" || receipt.providerCell !== PROVIDER || receipt.operation !== "observe-codex-tool-invocations") throw new TypeError(`Codex tool observation admission ${index} is malformed`);
  if (identify({ type: admission.carrier.type, value: receipt }, `semiotic-exchange.${admission.carrier.type}`) !== admission.contentNi) throw new Error(`Codex tool observation admission ${index} differs from its canonical carrier identity`);
  if (receipt.authority?.observation !== true || receipt.authority?.execution !== false || receipt.authority?.restrictedMove !== false || receipt.authority?.actuatorBinding !== false || receipt.authority?.outcomeAssertion !== false) throw new Error(`Codex tool observation admission ${index} crosses its observation boundary`);
  timestamp(receipt.recordedAt, `Codex tool observation admission ${index}.recordedAt`);
  if (!Array.isArray(receipt.observations) || !Array.isArray(receipt.evidence)) throw new TypeError(`Codex tool observation admission ${index} must carry arrays`);
  const observations = receipt.observations.map((value, ordinal) => {
    if (value?.type !== "CodexToolInvocationObservation" || value.version !== 1 || value.providerCell !== PROVIDER || value.inferenceProcess?.kind !== "codex-inference-process" || value.inferenceProcess?.authority !== "inference-only" || !value.inferenceProcess.address?.startsWith("urn:sha256:")) throw new TypeError(`Codex tool observation ${ordinal} has no inferred-process boundary`);
    timestamp(value.occurredAt, `Codex tool observation ${ordinal}.occurredAt`);
    if (!SHA.test(value.sessionDigest ?? "") || typeof value.requestedTool?.name !== "string" || !["custom_tool_call", "function_call"].includes(value.requestedTool?.transport)) throw new TypeError(`Codex tool observation ${ordinal} lacks a safe tool coordinate`);
    if (value.actuator?.status !== "not-bound-by-transcript-observation" || value.actuator?.reason?.length === 0) throw new Error(`Codex tool observation ${ordinal} falsely binds an actuator`);
    if (value.disclosure?.transcriptText !== false || value.disclosure?.reasoning !== false || value.disclosure?.toolArguments !== false || value.disclosure?.toolOutput !== false || value.disclosure?.fileContents !== false) throw new Error(`Codex tool observation ${ordinal} discloses protected transcript matter`);
    return freeze({ type: "InferenceToolRequestLocus", id: identify(value), occurredAt: value.occurredAt, inferenceProcess: value.inferenceProcess, providerCell: value.providerCell, requestedTool: value.requestedTool, invocation: value.invocation, actuator: value.actuator, observationReceiptNi: admission.contentNi, carrierAdmissionReceiptNi: admission.id });
  });
  return freeze(observations);
}

/** Project observed inference requests without upgrading them into network moves. */
export function projectCodexToolObservations({ admissions }) {
  const loci = [];
  for (const [index, admission] of [...admissions.values()].entries()) {
    const observed = admit(admission, index); if (observed !== null) loci.push(...observed);
  }
  const unique = new Map();
  for (const locus of loci) { if (unique.has(locus.id)) throw new Error("Codex tool observation locus was admitted twice"); unique.set(locus.id, locus); }
  return freeze([...unique.values()].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)));
}

function operationName(toolName) {
  const value = toolName.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-").replaceAll(/^-+|-+$/gu, "");
  if (!/^[a-z][a-z0-9-]{2,127}$/u.test(value)) throw new TypeError("observed tool name cannot be represented as one capability operation");
  return `bind-codex-tool-${value}`;
}

/**
 * Turn an observed-but-unbound inference tool request into the existing SXC
 * capability market form.  This does not bind an actuator: it preserves the
 * exact gap until a provider offers, receives authority, executes a restricted
 * move, and returns an independently admissible outcome receipt.
 */
export function induceUnboundCodexToolBindingDemands({ raiser, observationLoci, induceDemand } = {}) {
  if (!Array.isArray(observationLoci)) throw new TypeError("observationLoci must be an array of admitted inference tool request loci");
  if (typeof induceDemand !== "function") throw new TypeError("induceDemand must be the canonical SXC capability-repair demand fabricator");
  const groups = new Map();
  for (const [index, locus] of observationLoci.entries()) {
    if (locus?.type !== "InferenceToolRequestLocus" || locus.actuator?.status !== "not-bound-by-transcript-observation") throw new TypeError(`observationLoci[${index}] is not an unbound admitted inference tool request`);
    exactNi(locus.id, `observationLoci[${index}].id`); exactNi(locus.observationReceiptNi, `observationLoci[${index}].observationReceiptNi`);
    const tool = locus.requestedTool?.name;
    const operation = operationName(tool);
    const key = `${locus.observationReceiptNi}\0${operation}`;
    const group = groups.get(key) ?? { tool, operation, observationReceiptNi: locus.observationReceiptNi, loci: [] };
    group.loci.push(locus.id); groups.set(key, group);
  }
  const demands = [...groups.values()].sort((left, right) => left.operation.localeCompare(right.operation) || left.observationReceiptNi.localeCompare(right.observationReceiptNi)).map(({ tool, operation, observationReceiptNi, loci }) => {
    return induceDemand({
      raiser,
      locus: `inference-tool-request:${observationReceiptNi}:${operation}`,
      operation,
      objective: `bind an admitted capability cell for the observed ${tool} request, with authority, a restricted move, and a receipted outcome`,
      refusalCode: "observed-tool-request-has-no-bound-actuator",
      refusalWitnessNis: [observationReceiptNi],
      requiredStandard: "admitted capability cell plus authority receipt plus restricted MUD/SXC move plus outcome receipt",
      inputNi: observationReceiptNi,
    });
  });
  return freeze({ type: "UnboundCodexToolBindingDemandMoveSet", version: 1, providerCell: PROVIDER, groups: freeze([...groups.values()].map(({ tool, operation, observationReceiptNi, loci }) => freeze({ tool, operation, observationReceiptNi, observedRequestLocusNis: freeze([...loci].sort()) }))), demands: freeze(demands) });
}
