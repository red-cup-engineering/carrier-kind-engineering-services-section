import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { ACTOR, CONTRACT } from "./service.mjs";
import { operationBytes, operationFromBytes } from "./a2a-executor.mjs";
import { OPERATION_KIND, identify } from "./semantic-content.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
function rmnId(value) { return identify(value, OPERATION_KIND).id; }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
function exact(value) { return value?.id === rmnId(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id"))); }
function typedTransitionRefusal(value, source, customer, providerActor) {
  const object = value?.object;
  return value?.type === "Reject" && value.actor === providerActor && value.target === customer && value.inReplyTo === source?.id
    && object?.type === "Refusal" && object.contract === CONTRACT && typeof object.code === "string" && typeof object.reason === "string"
    && object.customerTerritoryMutation === false
    && value.id === rmnId({ actor: providerActor, type: "Reject", inReplyTo: source.id, object });
}
export async function invokeClockkeeperOperation(activity, operation, { agentCardUrl = process.env.CLOCKKEEPER_AGENT_CARD_URL, bearerTokenFile = process.env.CLOCKKEEPER_BEARER_TOKEN_FILE, providerActor = process.env.CLOCKKEEPER_PROVIDER_ACTOR ?? ACTOR, send = sendRmnTask, at = new Date().toISOString(), signal } = {}) {
  if (typeof agentCardUrl !== "string" || !agentCardUrl) throw new Error("CLOCKKEEPER_AGENT_CARD_URL is required");
  if (typeof bearerTokenFile !== "string" || !bearerTokenFile) throw new Error("CLOCKKEEPER_BEARER_TOKEN_FILE is required");
  if (typeof providerActor !== "string" || !providerActor) throw new Error("CLOCKKEEPER_PROVIDER_ACTOR is required");
  const request = record({ type: "ClockkeeperOperationRequest", provider: providerActor, operation, at, activity });
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const transport = await send({ agentUrl: agentCardUrl, message, requireSignature: true, bearerTokenFile, signal });
  const response = operationFromBytes(extractRmnPart(a2aResultParts(transport.result)).bytes);
  if (response?.type !== "ClockkeeperOperationResult" || response.provider !== providerActor || response.request !== request.id || response.operation !== operation) throw new Error("Clockkeeper returned a foreign operation result");
  return Object.freeze({ response: response.result, transport: { inputNi: transport.inputNi, outputNi: transport.outputNi, agentCard: transport.agentCard } });
}

function transitionRequestProblem(activity, { customer, predecessorSchedule, request, providerActor }) {
  const transition = activity?.object, offer = transition?.offer, offered = offer?.object, capability = transition?.capability;
  if (!exact(activity) || activity?.["@context"] !== CONTEXT || activity.type !== "Update" || activity.actor !== customer || activity.target !== providerActor) return "prepared Clockkeeper transition activity is inexact";
  if (transition?.type !== "ScheduleTransitionRequest" || transition.contract !== CONTRACT || transition.predecessorSchedule !== predecessorSchedule) return "prepared Clockkeeper transition names the wrong predecessor or law";
  if (!exact(offer) || offer.type !== "Offer" || offer.actor !== providerActor || offered?.requestDigest !== rmnId(request) || offered?.requestDigest !== rmnId(offered.request)) return "prepared Clockkeeper transition offer does not bind the exact request";
  if (capability?.type !== "Capability" || capability.issuer !== customer || capability.holder !== providerActor || capability.invocationTarget !== providerActor || capability.parentOffer !== offer.id || capability.attenuation?.predecessorSchedule !== predecessorSchedule || capability.attenuation?.successorSchedule !== offered.scheduleId || capability.attenuation?.requestDigest !== offered.requestDigest) return "prepared Clockkeeper transition capability is inexact";
  return null;
}

export async function renewClockkeeperSchedule(request, { customer, predecessorSchedule = null, providerActor = process.env.CLOCKKEEPER_PROVIDER_ACTOR ?? ACTOR, invoke = invokeClockkeeperOperation, now = () => new Date(), recoveryTransitionRequest = null, onTransitionIntent = null, ...transport } = {}) {
  if (typeof customer !== "string" || !customer || request?.type !== "ScheduledActivityDeliveryRequest") throw new Error("schedule renewal requires exact customer and request");
  if (recoveryTransitionRequest) {
    if (!predecessorSchedule) throw new Error("a prepared transition can recover only an exact predecessor renewal");
    const problem = transitionRequestProblem(recoveryTransitionRequest, { customer, predecessorSchedule, request, providerActor }); if (problem) throw new Error(problem);
    try {
      const transitioned = (await invoke(recoveryTransitionRequest, "renew-schedule", { ...transport, providerActor, at: now().toISOString() })).response;
      const offered = recoveryTransitionRequest.object.offer.object;
      if (typedTransitionRefusal(transitioned, recoveryTransitionRequest, customer, providerActor)) { const refusal = new Error(`Clockkeeper refused the prepared schedule transition: ${transitioned.object.reason}`); refusal.clockkeeperRefusal = transitioned; throw refusal; }
      if (transitioned?.type !== "Accept" || transitioned.object?.type !== "ScheduleTransition" || transitioned.object.predecessorSchedule !== predecessorSchedule || transitioned.object.successorSchedule !== offered.scheduleId) throw new Error("Clockkeeper did not recover the exact prepared schedule transition");
      return Object.freeze({ registration: transitioned.object.successorRegistration, retirement: transitioned.object.predecessorRetirement, retirementResidue: null, transition: transitioned.object, transitionRequest: recoveryTransitionRequest, offer: recoveryTransitionRequest.object.offer, transport: "authenticated-signed-a2a" });
    } catch (error) { error.scheduleTransitionRequest = recoveryTransitionRequest; if (!error.clockkeeperRefusal) error.recoveryRequired = true; throw error; }
  }
  const started = now(), at = started.toISOString(), expiresAt = new Date(started.getTime() + 600_000).toISOString();
  const source = record({ "@context": CONTEXT, type: "Create", actor: customer, target: providerActor, object: { type: "Note", attachment: [request] } });
  const solicitation = record({ "@context": CONTEXT, type: "Offer", actor: customer, target: providerActor, object: { type: "ServiceSolicitation", sourceActivity: source } });
  const offered = (await invoke(solicitation, "solicit-service", { ...transport, providerActor, at })).response;
  if (offered?.type !== "Offer" || offered.actor !== providerActor || offered.object?.requestDigest !== rmnId(request)) throw new Error("Clockkeeper did not return the exact schedule offer");
  if (predecessorSchedule && offered.object.scheduleId === predecessorSchedule) throw new Error("Clockkeeper renewal requires a successor identity distinct from its predecessor");
  const capability = { type: "Capability", issuer: customer, holder: providerActor, invocationTarget: providerActor, parentOffer: offered.id, allowedActions: ["invoke-service", ...offered.object.effects], attenuation: { requestDigest: offered.object.requestDigest, scheduleId: offered.object.scheduleId }, singleUse: true, expiresAt };
  if (predecessorSchedule) {
    const transitionCapability = { type: "Capability", issuer: customer, holder: providerActor, invocationTarget: providerActor, parentOffer: offered.id, allowedActions: ["renew-schedule", ...offered.object.effects], attenuation: { predecessorSchedule, successorSchedule: offered.object.scheduleId, requestDigest: offered.object.requestDigest }, singleUse: true, expiresAt };
    const transitionRequest = record({ "@context": CONTEXT, type: "Update", actor: customer, target: providerActor, object: { type: "ScheduleTransitionRequest", contract: CONTRACT, predecessorSchedule, offer: offered, capability: transitionCapability } });
    if (typeof onTransitionIntent === "function") await onTransitionIntent(transitionRequest);
    try {
      const transitioned = (await invoke(transitionRequest, "renew-schedule", { ...transport, providerActor, at: new Date(started.getTime() + 1).toISOString() })).response;
      if (typedTransitionRefusal(transitioned, transitionRequest, customer, providerActor)) { const refusal = new Error(`Clockkeeper refused the schedule transition: ${transitioned.object.reason}`); refusal.clockkeeperRefusal = transitioned; throw refusal; }
      if (transitioned?.type !== "Accept" || transitioned.object?.type !== "ScheduleTransition" || transitioned.object.predecessorSchedule !== predecessorSchedule || transitioned.object.successorSchedule !== offered.object.scheduleId) throw new Error("Clockkeeper did not settle the exact schedule transition");
      return Object.freeze({ registration: transitioned.object.successorRegistration, retirement: transitioned.object.predecessorRetirement, retirementResidue: null, transition: transitioned.object, transitionRequest, offer: offered, transport: "authenticated-signed-a2a" });
    } catch (error) { error.scheduleTransitionRequest = transitionRequest; if (!error.clockkeeperRefusal) error.recoveryRequired = true; throw error; }
  }
  const acceptance = record({ "@context": CONTEXT, type: "Accept", actor: customer, target: providerActor, object: { type: "ServiceContract", contract: CONTRACT, offer: offered, capability } });
  const registered = (await invoke(acceptance, "invoke-service", { ...transport, providerActor, at: new Date(started.getTime() + 1).toISOString() })).response;
  if (registered?.type !== "Accept" || registered.object?.scheduleId !== offered.object.scheduleId) throw new Error("Clockkeeper did not register the schedule");
  return Object.freeze({ registration: registered.object, retirement: null, retirementResidue: null, transition: null, offer: offered, transport: "authenticated-signed-a2a" });
}
