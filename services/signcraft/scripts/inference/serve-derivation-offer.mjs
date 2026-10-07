// Provider boundary for the market's "bounded-derivation" demand class
// (inference-dispatch-service/src/inference-demand-classification.mjs).
// A declaration (command); imports only SignCraft's own inference modules, never an app.

import { makeInference, infer } from "@red-cup-engineering/signcraft/inference/infer";

/**
 * Nominal consideration for this provider: one reciprocal bounded
 * lot, the same nominal-cost shape already admitted for the sibling
 * bare-cedar-fog-npu-inference-team local provider (its content/agent-cards
 * card's "reciprocal-short-inference" alternative). The market's own
 * obligation validator (inference-dispatch-service/src/exact-amount.mjs)
 * rejects a literal zero amount, so this is the market's cheapest lawful
 * obligation, not a zero price.
 * @type {ReadonlyArray<{id: string, obligations: Array<{id: string, kind: string, asset: string, amount: number, unit: string, settlementAdapter: string}>}>}
 */
export const DERIVATION_CONSIDERATION_ALTERNATIVES = Object.freeze([
  Object.freeze({
    id: "reciprocal-short-derivation",
    obligations: Object.freeze([
      Object.freeze({
        id: "return-one-bounded-lot",
        kind: "service",
        asset: "urn:union:service:bounded-inference-reciprocity",
        amount: 1,
        unit: "bounded-lot",
        settlementAdapter: "urn:union:settlement-adapter:direct-witness-v1",
      }),
    ]),
  }),
]);

/**
 * Decode this provider's own inference request from a market demand's
 * `context.suppliedContext` field (a JSON string, per the shape
 * typedInferenceDemand() builds in inference-dispatch-service's
 * src/typed-inference-procurement.mjs -- the same envelope field the
 * sibling gemini-inference-team provider reads its chat messages from).
 * @param {string|object} suppliedContext
 * @returns {{ attributes: string[], rules: Array<{name?: string, if: string[], then: string[]}>, facts: string[], denials: string[], query: string, conductances: Array<[string,string,number]> }}
 * @throws {Error} when suppliedContext carries no attributes/rules or no query
 */
export function derivationDemandFromSuppliedContext(suppliedContext) {
  const parsed = typeof suppliedContext === "string" ? JSON.parse(suppliedContext) : suppliedContext;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bounded-derivation suppliedContext must be one object");
  const { attributes, rules, facts = [], denials = [], query, conductances = [] } = parsed;
  if (!Array.isArray(attributes) || !Array.isArray(rules)) throw new Error("bounded-derivation suppliedContext requires attributes and rules");
  if (typeof query !== "string" || query.trim() === "") throw new Error("bounded-derivation suppliedContext requires a query attribute");
  return { attributes, rules, facts, denials, query, conductances };
}

/**
 * Answer one TypedSenInferenceDemand-shaped market demand for the
 * "bounded-derivation" class: build this kernel's engine from the decoded
 * request, run the real (non-sampling, receipted) derivation, and return a
 * witnessed completion carrying the full witness chain -- never just the
 * verdict.
 * @param {{ context?: { suppliedContext?: string|object } }} demand a TypedSenInferenceDemand (or any object exposing context.suppliedContext)
 * @returns {{ disposition: "completion"|"refused", verdict?: string, witness?: object[]|null, counterWitness?: object[]|null, refusal?: number|null, questions?: object[], text: string, reason?: string }}
 */
export function answerBoundedDerivationDemand(demand) {
  let request;
  try {
    request = derivationDemandFromSuppliedContext(demand?.context?.suppliedContext);
  } catch (error) {
    return Object.freeze({ disposition: "refused", text: error.message, reason: error.message });
  }
  const engine = makeInference({ attributes: request.attributes, rules: request.rules });
  const out = infer(engine, {
    facts: request.facts,
    denials: request.denials,
    query: request.query,
    conductances: request.conductances,
  });
  const text = out.verdict === "absurd"
    ? `${request.query}: unknown -- would settle on: ${out.questions.map((q) => `${q.rule} needs [${q.missing.join(", ")}]`).join("; ") || "no applicable rule"}`
    : `${request.query}: ${out.verdict}`;
  return Object.freeze({
    disposition: "completion",
    verdict: out.verdict,
    witness: out.witness,
    counterWitness: out.counterWitness,
    refusal: out.refusal,
    questions: out.questions,
    text,
  });
}

async function readAll(stdin) {
  let raw = "";
  for await (const chunk of stdin) raw += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
  return raw;
}

/** The runnable declaration: one demand JSON on standard input, one answer line on standard output. */
export const command = Object.freeze({
  async run({ stdin }) {
    return `${JSON.stringify(answerBoundedDerivationDemand(JSON.parse(await readAll(stdin))))}\n`;
  },
  formatResult: (text) => text,
  formatError: (error) => `${error.stack ?? error.message}\n`,
  exitCode: 1,
});
