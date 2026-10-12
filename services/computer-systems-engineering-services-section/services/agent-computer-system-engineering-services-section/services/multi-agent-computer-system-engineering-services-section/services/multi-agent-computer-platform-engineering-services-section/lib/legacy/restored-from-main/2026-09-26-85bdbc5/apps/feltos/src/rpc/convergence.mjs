/**
 * running/settlement-signature — derive an action's transport regime from its
 * codomain settlement-filtration read.
 *
 * The signature is not an authored action field. `projectSurface` asks the codomain
 * schema for the finite witness needed to materialize a settlement filtration,
 * runs the shipped `readClassificationOfSettlementFiltration`, and only then
 * projects the small serializable transport signature.
 */
import { classificationOfWitness, signatureRegime } from "@red-cup-engineering/relating/running/settlement-signature";

import { codomainConvergenceDescriptorKey as DESCRIPTOR_KEY } from "./convergence-key.mjs";
export { codomainConvergenceDescriptorKey } from "./convergence-key.mjs";

const SETTLEMENT_FILTRATION_ID = "metroplat/closure/filtration";

function schemaRef(schema) {
  const ref = schema?.["$ref"];
  return typeof ref === "string" ? ref : undefined;
}

function isCodomainConvergenceDescriptor(value) {
  if (typeof value !== "object" || value === null) return false;
  const record = value;
  return record["kind"] === "metroplat.codomain.settlement-filtration";
}

export function codomainConvergenceDescriptor(
  schema,
) {
  const authored = schema?.[DESCRIPTOR_KEY];
  if (isCodomainConvergenceDescriptor(authored)) return authored;
  if (schemaRef(schema) === SETTLEMENT_FILTRATION_ID || schema?.["$id"] === SETTLEMENT_FILTRATION_ID) {
    return { kind: "metroplat.codomain.settlement-filtration", limitStage: true, nonScottLimitFiring: false, cofinality: "countable" };
  }
  return { kind: "metroplat.codomain.settlement-filtration", limitStage: false, nonScottLimitFiring: false, cofinality: "countable" };
}

function transportOf(regime) {
  switch (regime) {
    case "strict-finite":
      return { transport: "request-response", finality: "normal-form", continuation: "none" };
    case "scott":
    case "transfinite-bounded":
      return { transport: "event-stream", finality: "bounded-partial", continuation: "last-event-id" };
    case "aperiodic":
      return { transport: "websocket-session", finality: "subscription", continuation: "websocket" };
  }
}

export function operationConvergenceSignature(action) {
  const descriptor = codomainConvergenceDescriptor(action.codomain?.schema);
  const classification = classificationOfWitness(descriptor, action.verb);
  const regime = signatureRegime(classification.regime);
  return Object.freeze({
    kind: "metroplat.action.settlement-signature",
    regime,
    closureRegime: classification.regime,
    ...transportOf(regime),
    classification: Object.freeze({
      kind: classification.kind,
      cofinality: classification.cofinality,
      limitStages: classification.limitStages,
      nonScottFirings: classification.nonScottFirings,
    }),
  });
}
