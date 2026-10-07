/**
 * running/settlement-signature — derive an action's settlement phase and transport
 * from its codomain settlement-filtration read.
 *
 * The signature is not an authored action field. `induceSurface` asks the codomain
 * schema for the finite witness needed to present a settlement filtration, reads
 * it with SignCraft's `classify`, takes the classification's closure data as a
 * SignChain phase, and reads the transport off that phase's finality: a normal
 * form answers once; an approximation or a limit stage streams approximants with
 * a resumable cursor; an unattained settling is a session that never closes.
 */
import { cell } from "@red-cup-engineering/signcell/cell";
import { classify, filtration } from "@red-cup-engineering/signcraft/settle";
import { phaseSignature } from "@red-cup-engineering/signchain/contracts/phase";
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

/** The transport a settlement phase's finality admits. */
const transports = Object.freeze({
  "normal-form": Object.freeze({ transport: "request-response", continuation: "none" }),
  approximation: Object.freeze({ transport: "event-stream", continuation: "last-event-id" }),
  stage: Object.freeze({ transport: "event-stream", continuation: "last-event-id" }),
  unattained: Object.freeze({ transport: "websocket-session", continuation: "websocket" }),
});

/** The settlement signature a codomain witness reads: the settlement phase of its classification's
 *  closure data and the transport that phase admits. */
export function settlementSignature(witness, label, kind) {
  const classification = classificationOfWitness(witness, label);
  const phase = phaseSignature({ id: `settlement:${label}`, closure: classification.closure });
  return Object.freeze({
    kind,
    regime: phase.regime,
    finality: phase.finality,
    coordinationCost: phase.coordinationCost,
    ...transports[phase.finality],
    phase,
    classification: Object.freeze({
      kind: classification.kind,
      cofinality: classification.cofinality,
      limitStages: classification.limitStages,
      nonScottFirings: classification.nonScottFirings,
    }),
  });
}

/** An action's settlement signature, read off its codomain schema's witness. */
export const actionSettlementSignature = (action) =>
  settlementSignature(codomainSettlementWitness(action.codomain?.schema), action.verb, "relating.action.settlement-signature");

export const codomainSettlementWitnessKey = WITNESS_KEY;
