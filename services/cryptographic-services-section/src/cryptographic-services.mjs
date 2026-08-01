#!/usr/bin/env node
// Pure cryptographic derivation behind an ActivityStreams contract face.
// Solicitations name an operation but never carry its inputs; any secret enters
// only inside the accepted invocation and is neither offered nor retained.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateAccount, addressFromPrivateKey, signDigest, signMessage, recoverAddress,
} from "./evm.mjs";
import { sha256 } from "./hash.mjs";
import { keccak256 } from "./keccak256.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const ACTOR = "urn:ame:cryptographic-services-section";

const OPERATIONS = Object.freeze({
  "generate-account": { input: "{}", returns: "{ address, privateKey }", note: "caller takes custody; not recorded" },
  "derive-address": { input: "{ privateKey }", returns: "{ address }" },
  "sign-digest": { input: "{ digest, privateKey }", returns: "{ r, s, v, signature }" },
  "sign-message": { input: "{ message, privateKey }", returns: "{ r, s, v, signature }", note: "EIP-191 personal_sign" },
  "recover-address": { input: "{ digest, signature }", returns: "{ address }" },
  "keccak256": { input: "{ hex } | { message }", returns: "{ digest }" },
});

const canonical = (value) => Array.isArray(value)
  ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const digest = (value) => `sha256:${sha256(Buffer.from(typeof value === "string" ? value : canonical(value))).toString("hex")}`;
const activityId = (value) => `urn:${digest(value)}`;

const OFFER = Object.freeze({
  "@context": CONTEXT,
  type: "Offer",
  actor: ACTOR,
  object: {
    type: "ExecutableServiceOffer",
    consideration: { amount: 1, unit: "cryptographic-operation-credit" },
    operations: OPERATIONS,
    settles: ["evm", "x402"],
    effects: [],
  },
});

function invoke(op, req) {
  switch (op) {
    case "generate-account": return generateAccount();
    case "derive-address": return { address: addressFromPrivateKey(req.privateKey) };
    case "sign-digest": return signDigest(req.digest, req.privateKey);
    case "sign-message": return signMessage(req.message, req.privateKey);
    case "recover-address": return { address: recoverAddress(req.digest, req.signature) };
    case "keccak256": {
      const buf = req.hex ? Buffer.from(req.hex.replace(/^0x/u, ""), "hex") : Buffer.from(req.message ?? "", "utf8");
      return { digest: `0x${keccak256(buf).toString("hex")}` };
    }
    default: return { type: "Refusal", reason: `unknown operation: ${op}` };
  }
}

function reject(source, reason) {
  const response = { "@context": CONTEXT, type: "Reject", actor: ACTOR, target: source?.actor ?? null, inReplyTo: source?.id ?? null, object: { type: "Refusal", reason } };
  return { ...response, id: activityId(response) };
}

function solicitationProblem(activity) {
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Offer" || activity.target !== ACTOR || activity.object?.type !== "ServiceSolicitation") return "solicitation-must-be-addressed-activitystreams-offer";
  if (typeof activity.actor !== "string" || !activity.actor || typeof activity.id !== "string" || !activity.id) return "solicitation-must-name-actor-and-id";
  if (!Object.hasOwn(OPERATIONS, activity.object.operation)) return "unknown-operation";
  if (Object.hasOwn(activity.object, "request") || Object.hasOwn(activity.object, "privateKey")) return "operation-inputs-are-forbidden-in-solicitation";
  return null;
}

function offerFor(activity) {
  const object = { ...OFFER.object, operation: activity.object.operation, sourceActivity: activity.id };
  const offer = { "@context": CONTEXT, type: "Offer", actor: ACTOR, target: activity.actor, inReplyTo: activity.id, object };
  return { ...offer, id: activityId(offer) };
}

function invocationProblem(activity) {
  const object = activity?.object, offer = object?.offer, capability = object?.capability;
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Accept" || activity.target !== ACTOR || object?.type !== "ServiceContract") return "invocation-must-be-addressed-activitystreams-accept";
  if (offer?.type !== "Offer" || offer.actor !== ACTOR || offer.target !== activity.actor || offer.object?.operation !== object.request?.operation) return "invocation-offer-does-not-bind-requested-operation";
  if (capability?.type !== "Capability" || capability.holder !== ACTOR || capability.invocationTarget !== ACTOR || capability.parentOffer !== offer.id || capability.capTP?.target !== ACTOR || capability.capTP?.method !== "invoke-service") return "capability-is-not-attenuated-to-provider-offer";
  if (!Array.isArray(capability.allowedActions) || canonical(capability.allowedActions) !== canonical(["invoke-service"])) return "capability-allows-more-than-pure-invocation";
  if (!Object.hasOwn(OPERATIONS, object.request?.operation)) return "unknown-operation";
  return null;
}

export function run(activity, operation = "invoke-service") {
  if (operation === "solicit-service") {
    const problem = solicitationProblem(activity);
    return problem ? reject(activity, problem) : offerFor(activity);
  }
  if (operation !== "invoke-service") return reject(activity, "unknown-contract-operation");
  const problem = invocationProblem(activity);
  if (problem) return reject(activity, problem);
  const result = invoke(activity.object.request.operation, activity.object.request);
  if (result?.type === "Refusal") return reject(activity, result.reason);
  const response = { "@context": CONTEXT, type: "Accept", actor: ACTOR, target: activity.actor, inReplyTo: activity.id, object: { type: "CryptographicResult", operation: activity.object.request.operation, result } };
  return { ...response, id: activityId(response) };
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const activity = JSON.parse(readFileSync(0, "utf8"));
  const result = run(activity, argument("--operation") ?? "invoke-service");
  console.log(JSON.stringify(result, null, 2));
  if (result.type === "Reject") process.exitCode = 2;
}

export { ACTOR, OPERATIONS, digest };
