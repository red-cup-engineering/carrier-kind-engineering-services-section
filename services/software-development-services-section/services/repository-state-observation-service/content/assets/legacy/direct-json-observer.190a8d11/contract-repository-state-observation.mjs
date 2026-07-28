#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activityObject, contentRecord, digest, invokeProvider, nowFromArgs, operationFromArgv,
  readJsonInput, recordOutcome, refusal, resourceObservations, writeJsonOutput } from "../../../lib/canonical.mjs";
import { REPOSITORY_STATE_OBSERVATION_LAW } from "./law.mjs";

export const ACTOR = "urn:ame:repository-state-observation-service";
const NODE_ID = "repository-state-observation-service";
export const FIXED_GIT_OPERATION = Object.freeze(["status", "--porcelain=v1", "--ignore-submodules=all"]);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CONTRACT = REPOSITORY_STATE_OBSERVATION_LAW.id;

export function validateRequest(request) {
  if (request?.type !== "RepositoryStateObservationRequest") throw new Error("request type must be RepositoryStateObservationRequest");
  if (request.purpose !== undefined && request.purpose !== "observe repository state") throw new Error("unsupported purpose");
  if (typeof request.repositoryRoot !== "string" || !request.repositoryRoot.startsWith("/")) throw new Error("repositoryRoot must be absolute");
  if (!["dry-run", "live"].includes(request.executionMode)) throw new Error("executionMode must be dry-run or live");
  if (!Number.isInteger(request.waitMilliseconds) || request.waitMilliseconds < 1 || request.waitMilliseconds > 300000) throw new Error("waitMilliseconds must be 1..300000");
  for (const forbidden of ["argv", "executable", "environment", "command", "effects"]) {
    if (Object.hasOwn(request, forbidden)) throw new Error(`caller-selected ${forbidden} is forbidden`);
  }
}

function requestFrom(activity) {
  const solicitation = activityObject(activity, "ServiceSolicitation");
  const sourceObject = solicitation?.sourceActivity?.object;
  const attachments = Array.isArray(sourceObject?.attachment) ? sourceObject.attachment : sourceObject?.attachment ? [sourceObject.attachment] : [];
  const request = sourceObject?.type === "RepositoryStateObservationRequest"
    ? sourceObject
    : attachments.find((value) => value?.type === "RepositoryStateObservationRequest") ?? solicitation?.request;
  validateRequest(request);
  return request;
}

function validateCapability(capability, offer, customer, now) {
  if (capability?.type === "PurposeBoundCapability") {
    if (capability.issuer !== customer || capability.holder !== ACTOR || capability.invocationTarget !== ACTOR) throw new Error("capability parties mismatch");
    if (capability.requestDigest !== offer.object.requestDigest || capability.providerOfferDigest !== digest(offer)) throw new Error("capability binding mismatch");
    if (capability.singleUse !== true || !capability.expiresAt || Date.parse(capability.expiresAt) < Date.parse(now)) throw new Error("capability is expired or reusable");
    if (digest(capability.effects) !== digest(offer.object.effects)) throw new Error("capability effects mismatch");
    return;
  }
  if (capability?.type !== "InvocationCapability") throw new Error("InvocationCapability is required");
  if (capability.issuer !== customer || capability.holder !== ACTOR || capability.invocationTarget !== ACTOR) throw new Error("capability parties mismatch");
  if (capability.parentOffer !== offer.id || capability.attenuation?.requestDigest !== offer.object.requestDigest) throw new Error("capability binding mismatch");
  if (capability.singleUse !== true || !capability.expires || Date.parse(capability.expires) <= Date.parse(now)) throw new Error("capability is expired or reusable");
  if (!Array.isArray(capability.allowedActions) || !["invoke", ...offer.object.effects].every((effect) => capability.allowedActions.includes(effect))) throw new Error("capability effects mismatch");
}

function solicit(activity, now) {
  if (activity?.type !== "Offer" || activity.target !== ACTOR) throw new Error("Offer targeted to this child is required");
  const request = requestFrom(activity);
  const object = contentRecord({ type: "RepositoryStateObservationOffer", contract: CONTRACT,
    request, requestDigest: digest(request), fixedGitOperation: [...FIXED_GIT_OPERATION],
    effects: ["read-repository-state", "contract-git-ant", "provider-local-evidence"],
    customerMutation: false, recordedAt: now });
  return contentRecord({ type: "Offer", actor: ACTOR, target: activity.actor, object, inReplyTo: activity.id, recordedAt: now });
}

function gitSolicitation(request, now) {
  const gitRequest = contentRecord({ type: "GitOperationRequest", repositoryRoot: request.repositoryRoot,
    argv: [...FIXED_GIT_OPERATION], waitMilliseconds: request.waitMilliseconds, recordedAt: now });
  const sourceActivity = contentRecord({ type: "Create", actor: ACTOR, object: { type: "Note", attachment: [gitRequest] }, recordedAt: now });
  return contentRecord({ type: "Offer", actor: ACTOR, target: "urn:ame:git-ant-colony",
    object: contentRecord({ type: "ServiceSolicitation", contract: "git-operation-via-device-io-admission", sourceActivity, recordedAt: now }),
    attachment: [gitRequest], recordedAt: now });
}

async function contractGit(request, now) {
  const providerRoot = process.env.GIT_ANT_ROOT;
  if (!providerRoot) throw new Error("GIT_ANT_ROOT provider configuration is required for live execution");
  const offered = await invokeProvider({ providerRoot, operation: "solicit-service", input: gitSolicitation(request, now), args: ["--now", now], timeoutMs: request.waitMilliseconds + 10000 });
  if (offered.exitCode !== 0 || offered.output?.type !== "Offer") throw new Error(`Git ANT solicitation refused: ${offered.output?.object?.reason ?? offered.output?.object?.code ?? offered.stderr}`);
  const acceptance = contentRecord({ type: "Accept", actor: ACTOR, target: "urn:ame:git-ant-colony",
    object: { type: "ServiceContract", contract: "git-operation-via-device-io-admission", offer: offered.output }, recordedAt: now });
  const delivered = await invokeProvider({ providerRoot, operation: "invoke-service", input: acceptance, args: ["--now", now], timeoutMs: request.waitMilliseconds + 10000 });
  if (delivered.exitCode !== 0 || delivered.output?.type !== "Accept") throw new Error(`Git ANT invocation refused: ${delivered.output?.object?.reason ?? delivered.output?.object?.code ?? delivered.stderr}`);
  return { offered, delivered };
}

async function invoke(activity, now) {
  if (activity?.type !== "Accept" || activity.target !== ACTOR) throw new Error("Accept targeted to this child is required");
  const offer = activity.object?.offer ?? activity.object;
  if (offer?.type !== "Offer" || offer.actor !== ACTOR || offer.target !== activity.actor || offer.object?.contract !== CONTRACT) throw new Error("exact child offer is required");
  const request = offer.object?.request;
  validateRequest(request);
  if (offer.object.requestDigest !== digest(request)) throw new Error("request digest mismatch");
  validateCapability(activity.capability ?? activity.object?.capability, offer, activity.actor, now);
  const started = process.hrtime.bigint();
  if (request.executionMode === "dry-run") {
    const product = contentRecord({ type: "RepositoryStateObservationProduct", contract: CONTRACT, disposition: "ready", requestDigest: offer.object.requestDigest,
      executionMode: "dry-run", repositoryRoot: request.repositoryRoot,
      supplierRequest: { type: "GitOperationRequest", repositoryRoot: request.repositoryRoot, argv: [...FIXED_GIT_OPERATION], waitMilliseconds: request.waitMilliseconds },
      fixedGitOperation: [...FIXED_GIT_OPERATION], observed: false, customerMutation: false,
      resourceObservations: resourceObservations({ elapsedMilliseconds: Number(process.hrtime.bigint() - started) / 1e6 }), recordedAt: now });
    return contentRecord({ type: "Accept", actor: ACTOR, target: activity.actor, object: product, inReplyTo: activity.id, recordedAt: now });
  }
  const git = await contractGit(request, now);
  const outerReceipt = git.delivered.output.object;
  const receipt = outerReceipt?.admissionReceipt ?? outerReceipt;
  if (typeof receipt?.stdout !== "string" || !Number.isInteger(receipt?.exitCode)) throw new Error("Git ANT result lacks stdout or exitCode");
  const lines = receipt.stdout.split(/\r?\n/u).filter(Boolean);
  const product = contentRecord({ type: "RepositoryStateObservationProduct", contract: CONTRACT, disposition: receipt.exitCode === 0 ? "observed" : "supplier-command-failed",
    executionMode: "live", requestDigest: offer.object.requestDigest, repositoryRoot: request.repositoryRoot,
    supplierRequest: { type: "GitOperationRequest", repositoryRoot: request.repositoryRoot, argv: [...FIXED_GIT_OPERATION], waitMilliseconds: request.waitMilliseconds },
    fixedGitOperation: [...FIXED_GIT_OPERATION], observed: true,
    dirty: lines.length > 0, statusLines: lines, rawStatusDigest: digest(receipt.stdout), supplierExitCode: receipt.exitCode,
    supplierActor: "urn:ame:git-ant-colony", supplierOfferDigest: digest(git.offered.output), supplierResult: git.delivered.output,
    supplierEvidence: { offer: git.offered.output, receipt: git.delivered.output },
    customerMutation: false, resourceObservations: resourceObservations({ elapsedMilliseconds: Number(process.hrtime.bigint() - started) / 1e6,
      providerElapsedMilliseconds: receipt.elapsedMilliseconds ?? git.delivered.elapsedMilliseconds }), recordedAt: now });
  return contentRecord({ type: "Accept", actor: ACTOR, target: activity.actor, object: product, inReplyTo: activity.id, recordedAt: now });
}

export async function handleRepositoryStateOperation(operation, input, now) {
  if (operation === "solicit-service") return solicit(input, now);
  if (operation === "invoke-service") return invoke(input, now);
  throw new Error(`unsupported operation ${operation}`);
}

async function main() {
  const args = process.argv.slice(2), operation = operationFromArgv(args), now = nowFromArgs(args), input = await readJsonInput(args);
  const dataRoot = process.env.REPOSITORY_OBSERVATION_DATA_ROOT ?? process.env.REPOSITORY_OBSERVER_DATA_ROOT ?? resolve(ROOT, "data");
  try {
    const result = await handleRepositoryStateOperation(operation, input, now);
    await recordOutcome({ dataRoot, nodeId: NODE_ID, aggregateType: "service-outcomes",
      record: contentRecord({ type: "RepositoryObservationServiceOutcome", operation, requestActivity: input.id, result, recordedAt: now }) });
    await writeJsonOutput(result, args);
  } catch (error) {
    const result = refusal({ actor: ACTOR, target: input?.actor, code: "repository-observation-refused", detail: error.message, inReplyTo: input?.id, recordedAt: now });
    await recordOutcome({ dataRoot, nodeId: NODE_ID, aggregateType: "refusals",
      record: contentRecord({ type: "RepositoryObservationRefusal", operation, requestActivity: input?.id, result, recordedAt: now }) });
    await writeJsonOutput(result, args); process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
