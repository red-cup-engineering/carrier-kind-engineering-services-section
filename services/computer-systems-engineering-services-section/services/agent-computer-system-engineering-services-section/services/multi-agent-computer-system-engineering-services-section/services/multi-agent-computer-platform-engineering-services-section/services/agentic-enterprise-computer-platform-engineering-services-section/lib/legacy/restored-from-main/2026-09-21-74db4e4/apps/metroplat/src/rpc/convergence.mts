/**
 * running/settlement-signature — derive an action's transport regime from its
 * codomain settlement-filtration read.
 *
 * The signature is not an authored action field. `projectSurface` asks the codomain
 * schema for the finite witness needed to materialize a settlement filtration,
 * runs the shipped `readClassificationOfSettlementFiltration`, and only then
 * projects the small serializable transport signature.
 */
import {
  articulate,
  mark,
  utterance,
} from "../lib/records/utterance/index.mts";
import { predicate } from "../lib/logic/predicating/index.mts";
import {
  countableSettlingCofinality,
  initialSettlingStageInput,
  limitSettlingStageInput,
  omegaOrdinal,
  readClassificationOfSettlementFiltration,
  settlingStageOrdinal,
  uncountableSettlingCofinality,
} from "../lib/fixpoint/index.mts";
import { settlementFiltration, type SettlingClassification } from "@lenticule-science/metrologic/settling/settlement";
import type { JsonRecord } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { Operation } from "./operation.mts";
import { codomainConvergenceDescriptorKey as DESCRIPTOR_KEY } from "./convergence-key.mts";
export { codomainConvergenceDescriptorKey } from "./convergence-key.mts";

export type OperationConvergenceRegime = "strict-finite" | "scott" | "transfinite-bounded" | "aperiodic";
export type OperationTransport = "request-response" | "event-stream" | "websocket-session";

export interface CodomainConvergenceDescriptor {
  readonly kind: "metroplat.codomain.settlement-filtration";
  readonly limitStage?: boolean;
  readonly nonScottLimitFiring?: boolean;
  readonly cofinality?: "countable" | "uncountable";
}

export interface OperationConvergenceSignature {
  readonly kind: "metroplat.action.settlement-signature";
  readonly regime: OperationConvergenceRegime;
  readonly closureRegime: SettlingClassification["regime"]["kind"];
  readonly transport: OperationTransport;
  readonly finality: "normal-form" | "bounded-partial" | "subscription";
  readonly continuation: "none" | "last-event-id" | "websocket";
  readonly classification: {
    readonly kind: SettlingClassification["kind"];
    readonly cofinality: SettlingClassification["cofinality"]["kind"];
    readonly limitStages: number;
    readonly nonScottFirings: number;
  };
}

const SETTLEMENT_FILTRATION_ID = "metroplat/closure/filtration";

function naturalSize(value: { readonly members: readonly unknown[] }): number {
  return value.members.length;
}

function schemaRef(schema: JsonRecord | undefined): string | undefined {
  const ref = schema?.["$ref"];
  return typeof ref === "string" ? ref : undefined;
}

function isCodomainConvergenceDescriptor(value: unknown): value is CodomainConvergenceDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record["kind"] === "metroplat.codomain.settlement-filtration";
}

export function codomainConvergenceDescriptor(
  schema: JsonRecord | undefined,
): CodomainConvergenceDescriptor {
  const authored = schema?.[DESCRIPTOR_KEY];
  if (isCodomainConvergenceDescriptor(authored)) return authored;
  if (schemaRef(schema) === SETTLEMENT_FILTRATION_ID || schema?.["$id"] === SETTLEMENT_FILTRATION_ID) {
    return { kind: "metroplat.codomain.settlement-filtration", limitStage: true, nonScottLimitFiring: false, cofinality: "countable" };
  }
  return { kind: "metroplat.codomain.settlement-filtration", limitStage: false, nonScottLimitFiring: false, cofinality: "countable" };
}

function statementCell(label: string) {
  return predicate(articulate(utterance(mark(["codomain", label]), mark("settles-as")))).cells.cells[0]!;
}

function classificationOfDescriptor(
  descriptor: CodomainConvergenceDescriptor,
  label: string,
): SettlingClassification {
  const stages = [initialSettlingStageInput([])];
  if (descriptor.limitStage === true) {
    stages.push(limitSettlingStageInput(
      settlingStageOrdinal(omegaOrdinal()),
      descriptor.nonScottLimitFiring === true ? [statementCell(label)] : [],
    ));
  }
  return readClassificationOfSettlementFiltration(settlementFiltration(
    stages,
    descriptor.cofinality === "uncountable" ? uncountableSettlingCofinality : countableSettlingCofinality,
  ));
}

function signatureRegime(kind: SettlingClassification["regime"]["kind"]): OperationConvergenceRegime {
  switch (kind) {
    case "ordinal.closure.regime.finite":
      return "strict-finite";
    case "ordinal.closure.regime.scott":
      return "scott";
    case "ordinal.closure.regime.transfinite":
      return "transfinite-bounded";
    case "ordinal.closure.regime.aperiodic":
      return "aperiodic";
  }
}

function transportOf(regime: OperationConvergenceRegime): Pick<OperationConvergenceSignature, "transport" | "finality" | "continuation"> {
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

export function operationConvergenceSignature(action: Operation): OperationConvergenceSignature {
  const descriptor = codomainConvergenceDescriptor(action.codomain?.schema);
  const classification = classificationOfDescriptor(descriptor, action.verb);
  const regime = signatureRegime(classification.regime.kind);
  return Object.freeze({
    kind: "metroplat.action.settlement-signature" as const,
    regime,
    closureRegime: classification.regime.kind,
    ...transportOf(regime),
    classification: Object.freeze({
      kind: classification.kind,
      cofinality: classification.cofinality.kind,
      limitStages: naturalSize(classification.limitStages.rank),
      nonScottFirings: naturalSize(classification.nonScottFirings.rank),
    }),
  });
}
