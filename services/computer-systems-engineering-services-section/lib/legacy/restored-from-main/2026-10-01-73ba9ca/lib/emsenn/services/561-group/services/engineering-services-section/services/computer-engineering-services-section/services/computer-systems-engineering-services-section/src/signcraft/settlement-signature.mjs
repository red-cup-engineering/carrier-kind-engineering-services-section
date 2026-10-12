/**
 * running/settlement-signature — derive an action's transport regime from its
 * codomain settlement-filtration read.
 *
 * The signature is not an authored action field. `induceSurface` asks the codomain
 * schema for the finite witness needed to present a settlement filtration,
 * reads it with SignCraft's `classify`, and only then
 * projects the small serializable transport signature.
 */
import { cell } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell";
import { classify, filtration } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/settle";
const WITNESS_KEY = "x-settlement-filtration";
const SETTLEMENT_FILTRATION_ID = "relating/articulating/predicating/positing/settling/filtration";


function schemaRef(schema) {
  const ref = schema?.["$ref"];
  return typeof ref === "string" ? ref : undefined;
}

function isCodomainSettlementWitness(value) {
  if (typeof value !== "object" || value === null) return false;
  const record = value;
  return record["kind"] === "relating.codomain.settlement-filtration";
}

export function codomainSettlementWitness(
  schema,
) {
  const authored = schema?.[WITNESS_KEY];
  if (isCodomainSettlementWitness(authored)) return authored;
  if (schemaRef(schema) === SETTLEMENT_FILTRATION_ID || schema?.["$id"] === SETTLEMENT_FILTRATION_ID) {
    return { kind: "relating.codomain.settlement-filtration", limitStage: true, nonScottLimitFiring: false, cofinality: "countable" };
  }
  return { kind: "relating.codomain.settlement-filtration", limitStage: false, nonScottLimitFiring: false, cofinality: "countable" };
}

/** The cell a codomain witness's non-Scott firing designates. */
const witnessCell = (label) => cell(["codomain", label], "settles-as", ["codomain", label]);

/** The classification of a codomain witness: a presented filtration — an initial stage, then a limit stage
 *  (at ω) when the witness has one, designating the witness cell when that firing is non-Scott — read by
 *  SignCraft's classify. */
export function classificationOfWitness(witness, label) {
  const stages = [{ ordinal: 0, shape: "initial", designated: [] }];
  if (witness.limitStage === true) {
    stages.push({ ordinal: "ω", shape: "limit", designated: witness.nonScottLimitFiring === true ? [witnessCell(label)] : [] });
  }
  return classify(filtration(stages, witness.cofinality === "uncountable" ? "uncountable" : "countable"));
}

/** The transport regime a classification's regime settles into. */
export function signatureRegime(regime) {
  switch (regime) {
    case "finite": return "strict-finite";
    case "scott": return "scott";
    case "transfinite": return "transfinite-bounded";
    case "aperiodic": return "aperiodic";
  }
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

export function actionSettlementSignature(action) {
  const witness = codomainSettlementWitness(action.codomain?.schema);
  const classification = classificationOfWitness(witness, action.verb);
  const regime = signatureRegime(classification.regime);
  return Object.freeze({
    kind: "relating.action.settlement-signature",
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

export const codomainSettlementWitnessKey = WITNESS_KEY;
