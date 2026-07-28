#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  activityObject,
  assertContentRecord,
  contentRecord,
  digest,
  nowFromArgs,
  operationFromArgv,
  readJsonInput,
  refusal,
  resourceObservations,
  writeJsonOutput,
} from "../../../lib/canonical.mjs";
import { createSettlementStore, readSettlementRecords } from "@emsenn/rwil-rdf-services/client";

export const ACTOR = "urn:ame:state-report-infographic-service";
const CONTRACT = "state-report-infographic";
const EFFECTS = [
  "provider-local-render",
  "provider-local-rwil-rdf-evidence",
  "proposal-only-artifact-bytes",
];
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ADMISSION_PATH = resolve(
  ROOT,
  "content/admissions/deterministic-state-report-infographic-v2.json",
);
const IMPLEMENTATION_PATH = resolve(
  ROOT,
  "lib/admitted/state-report-infographic-v2.mjs",
);

function finite(value, maximum = 4096) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximum &&
    !value.includes("\0")
  );
}

export function validateRequest(request) {
  if (request?.type !== "StateReportInfographicRequest") {
    throw new Error("request type must be StateReportInfographicRequest");
  }
  if (request.deliveryMode !== "proposal-pending-customer-decision") {
    throw new Error("proposal-pending-customer-decision delivery is required");
  }
  if (request.customerMutationAuthorized !== false) {
    throw new Error("customerMutationAuthorized must be false");
  }
  if (
    !Array.isArray(request.acceptanceChecks) ||
    request.acceptanceChecks.length === 0 ||
    !request.acceptanceChecks.every(
      (check) =>
        check?.type === "StateReportInfographicCheck" &&
        finite(check.assertion),
    )
  ) {
    throw new Error("typed acceptanceChecks are required");
  }
  if (
    !Number.isInteger(request.ceilings?.maximumOutputBytes) ||
    request.ceilings.maximumOutputBytes < 1 ||
    request.ceilings.maximumOutputBytes > 16 * 1024 * 1024
  ) {
    throw new Error("maximumOutputBytes must be 1..16777216");
  }
  for (const forbidden of [
    "argv",
    "command",
    "executable",
    "environment",
    "implementation",
    "implementationPath",
    "outputPath",
    "deployment",
    "publication",
  ]) {
    if (Object.hasOwn(request, forbidden)) {
      throw new Error("caller-selected " + forbidden + " is forbidden");
    }
  }
  const packet = request.packet;
  if (
    packet?.type !== "HarmoniousUnionDeltaPacket" ||
    !finite(packet.period) ||
    !Array.isArray(packet.claims) ||
    packet.claims.length === 0
  ) {
    throw new Error("typed nonempty HarmoniousUnionDeltaPacket is required");
  }
  for (const claim of packet.claims) {
    if (
      !finite(claim?.settlement) ||
      !finite(claim?.label) ||
      !["held", "denied", "unknown", "both"].includes(claim?.state)
    ) {
      throw new Error(
        "each packet claim requires settlement, label, and a FOUR state",
      );
    }
  }
}

function requestFrom(activity) {
  const solicitation = activityObject(activity, "ServiceSolicitation");
  const source = solicitation?.sourceActivity?.object;
  const attachments = Array.isArray(source?.attachment)
    ? source.attachment
    : source?.attachment
      ? [source.attachment]
      : [];
  const request =
    source?.type === "StateReportInfographicRequest"
      ? source
      : (attachments.find(
          (value) => value?.type === "StateReportInfographicRequest",
        ) ?? solicitation?.request);
  validateRequest(request);
  return request;
}

function admission() {
  const value = JSON.parse(readFileSync(ADMISSION_PATH, "utf8"));
  assertContentRecord(value, "implementation admission");
  const observed = digest(readFileSync(IMPLEMENTATION_PATH).toString("base64"));
  if (observed !== value.sourceArtifactDigest) {
    throw new Error("admitted implementation source digest drifted");
  }
  return value;
}

function validateCapability(capability, offer, customer, now) {
  if (capability?.type !== "PurposeBoundCapability") {
    throw new Error("PurposeBoundCapability is required");
  }
  if (
    capability.issuer !== customer ||
    capability.holder !== ACTOR ||
    capability.invocationTarget !== ACTOR
  ) {
    throw new Error("capability parties mismatch");
  }
  if (
    capability.requestDigest !== offer.object.requestDigest ||
    capability.providerOfferDigest !== digest(offer)
  ) {
    throw new Error("capability binding mismatch");
  }
  if (
    capability.singleUse !== true ||
    !finite(capability.expiresAt) ||
    Date.parse(capability.expiresAt) < Date.parse(now)
  ) {
    throw new Error("capability is expired or reusable");
  }
  if (digest(capability.effects) !== digest(EFFECTS)) {
    throw new Error("capability effects mismatch");
  }
}

function capabilityConsumed(dataRoot, capabilityDigest) {
  return readSettlementRecords(dataRoot, "service-outcomes")
    .some((record) => record.capabilityDigest === capabilityDigest);
}

function solicit(activity, now) {
  if (activity?.type !== "Offer" || activity.target !== ACTOR) {
    throw new Error("Offer targeted to this service is required");
  }
  const request = requestFrom(activity);
  const admitted = admission();
  const object = contentRecord({
    type: "StateReportInfographicOffer",
    contract: CONTRACT,
    request,
    requestDigest: digest(request),
    effects: EFFECTS,
    implementationAdmission: admitted.id,
    sourceProduct: admitted.sourceProduct,
    customerMutation: false,
    foreignMutation: false,
    recordedAt: now,
  });
  return contentRecord({
    type: "Offer",
    actor: ACTOR,
    target: activity.actor,
    object,
    inReplyTo: activity.id,
    recordedAt: now,
  });
}

async function invoke(activity, now, dataRoot) {
  if (activity?.type !== "Accept" || activity.target !== ACTOR) {
    throw new Error("Accept targeted to this service is required");
  }
  const offer = activity.object?.offer ?? activity.object;
  if (
    offer?.type !== "Offer" ||
    offer.actor !== ACTOR ||
    offer.target !== activity.actor ||
    offer.object?.contract !== CONTRACT
  ) {
    throw new Error("exact provider offer is required");
  }
  validateRequest(offer.object.request);
  if (offer.object.requestDigest !== digest(offer.object.request)) {
    throw new Error("request digest mismatch");
  }
  const capability = activity.object?.capability ?? activity.capability;
  validateCapability(capability, offer, activity.actor, now);
  const capabilityDigest = digest(capability);
  if (capabilityConsumed(dataRoot, capabilityDigest)) {
    throw new Error("single-use capability already consumed");
  }
  const admitted = admission();
  if (offer.object.implementationAdmission !== admitted.id) {
    throw new Error("offer implementation admission drifted");
  }
  const started = process.hrtime.bigint();
  const { render } = await import(pathToFileURL(IMPLEMENTATION_PATH).href);
  const rendered = render(offer.object.request.packet);
  const outputBytes =
    Buffer.byteLength(rendered.svg) +
    Buffer.from(rendered.pngBase64, "base64").length;
  if (outputBytes > offer.object.request.ceilings.maximumOutputBytes) {
    throw new Error("rendered output exceeds maximumOutputBytes");
  }
  const product = contentRecord({
    ...rendered,
    type: "ProposedStateReportInfographicProduct",
    renderedArtifactType: rendered.type,
    contract: CONTRACT,
    requestDigest: offer.object.requestDigest,
    implementationAdmission: admitted.id,
    sourceProduct: admitted.sourceProduct,
    outputBytes,
    customerMutation: false,
    foreignMutation: false,
    pendingCustomerDecision: true,
    customerAcceptanceChecks: offer.object.request.acceptanceChecks,
    resourceObservations: resourceObservations({
      elapsedMilliseconds:
        Number(process.hrtime.bigint() - started) / 1e6,
    }),
    nonclaims: [
      "global Union truth",
      "customer usefulness",
      "installation",
      "deployment",
      "schedule",
      "publication",
    ],
    recordedAt: now,
  });
  return {
    result: contentRecord({
      type: "Accept",
      actor: ACTOR,
      target: activity.actor,
      object: product,
      inReplyTo: activity.id,
      recordedAt: now,
    }),
    capabilityDigest,
  };
}

function acceptResult(activity, now) {
  const decision = activity?.object;
  const product = decision?.proposedProduct;
  if (
    !["Accept", "Reject"].includes(activity?.type) ||
    activity.target !== ACTOR ||
    activity.actor !== product?.target ||
    decision?.type !== "StateReportInfographicCustomerDecision" ||
    decision.proposedProductDigest !== digest(product) ||
    product?.object?.type !== "ProposedStateReportInfographicProduct" ||
    product.object.contract !== CONTRACT
  ) {
    throw new Error(
      "exact customer decision for a proposed product is required",
    );
  }
  const object = contentRecord({
    type: "CustomerDecisionReceipt",
    contract: CONTRACT,
    proposedProduct: product.id,
    decision: activity.type,
    checks: decision.checks ?? [],
    customer: activity.actor,
    providerDoesNotOverrideDecision: true,
    recordedAt: now,
  });
  return contentRecord({
    type: "Accept",
    actor: ACTOR,
    target: activity.actor,
    object,
    inReplyTo: activity.id,
    recordedAt: now,
  });
}

export async function handleStateReportInfographicOperation(
  operation,
  input,
  now,
  dataRoot,
) {
  if (operation === "solicit-service") {
    return { result: solicit(input, now) };
  }
  if (operation === "invoke-service") {
    return invoke(input, now, dataRoot);
  }
  if (operation === "accept-result") {
    return { result: acceptResult(input, now) };
  }
  throw new Error("unsupported operation " + operation);
}

async function main() {
  const args = process.argv.slice(2);
  const operation = operationFromArgv(args);
  const now = nowFromArgs(args);
  const input = await readJsonInput(args);
  const dataRoot = resolve(
    process.env.STATE_REPORT_INFOGRAPHIC_DATA_ROOT ??
      join(ROOT, "data"),
  );
  const evidence = createSettlementStore({ settlementRoot: ROOT, dataRoot, agentUrl: process.env.RWIL_RDF_AGENT });
  try {
    const handled = await handleStateReportInfographicOperation(
      operation,
      input,
      now,
      dataRoot,
    );
    const record = contentRecord({
      type: "StateReportInfographicServiceOutcome",
      operation,
      requestActivity: input.id,
      result: handled.result,
      ...(handled.capabilityDigest === undefined ? {} : { capabilityDigest: handled.capabilityDigest }),
      recordedAt: now,
    });
    await evidence.record({
      category: "service-outcomes",
      recordedAt: now,
      record,
    });
    await writeJsonOutput(handled.result, args);
  } catch (error) {
    const result = refusal({
      actor: ACTOR,
      target: input?.actor,
      code: "state-report-infographic-refused",
      detail: error.message,
      inReplyTo: input?.id,
      recordedAt: now,
    });
    await evidence.record({
      category: "refusals",
      recordedAt: now,
      record: contentRecord({
        type: "StateReportInfographicRefusal",
        operation,
        requestActivity: input?.id,
        result,
        recordedAt: now,
      }),
    });
    await writeJsonOutput(result, args);
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
