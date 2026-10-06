/**
 * rpc/convergence — an operation's settlement signature, read off its codomain.
 *
 * The signature is not an authored operation field. `projectSurface` asks the
 * codomain schema for the finite descriptor that presents its settlement
 * filtration, and SignCraft reads the settlement phase and its transport off it.
 */
import { settlementSignature } from "@red-cup-engineering/signcraft/settlement-signature";

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

export const operationConvergenceSignature = (action) =>
  settlementSignature(codomainConvergenceDescriptor(action.codomain?.schema), action.verb, "metroplat.action.settlement-signature");
