import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DERIVATION_CONSIDERATION_ALTERNATIVES,
  derivationDemandFromSuppliedContext,
  answerBoundedDerivationDemand,
} from "../../scripts/inference/serve-derivation-offer.mjs";

// Same house-domain rules as test/inference.test.mjs, carried as a market
// demand's context.suppliedContext JSON string -- this is the market
// boundary the provider actually receives, not a direct engine call.
const HOUSE_SUPPLIED_CONTEXT = JSON.stringify({
  attributes: [
    "is-script", "is-app", "imports-app", "imports-script",
    "stratification-violation", "needs-finding",
  ],
  rules: [
    { name: "law:script-no-app", if: ["is-script", "imports-app"], then: ["stratification-violation"] },
    { name: "law:violation-filed", if: ["stratification-violation"], then: ["needs-finding"] },
  ],
});

function demandWith(suppliedContext, extra = {}) {
  return { type: "TypedSenInferenceDemand", context: { suppliedContext }, ...extra };
}

test("derivationDemandFromSuppliedContext decodes the market's JSON envelope", () => {
  const request = derivationDemandFromSuppliedContext(JSON.stringify({ ...JSON.parse(HOUSE_SUPPLIED_CONTEXT), query: "needs-finding" }));
  assert.deepEqual(request.attributes.includes("stratification-violation"), true);
  assert.deepEqual(request.rules.length, 2);
  assert.equal(request.query, "needs-finding");
});

test("derivationDemandFromSuppliedContext refuses a demand with no query", () => {
  assert.throws(() => derivationDemandFromSuppliedContext(JSON.stringify({ attributes: [], rules: [] })), /requires a query/);
});

test("answerBoundedDerivationDemand returns a held verdict with its full witness chain", () => {
  const demand = demandWith(JSON.stringify({
    attributes: JSON.parse(HOUSE_SUPPLIED_CONTEXT).attributes,
    rules: JSON.parse(HOUSE_SUPPLIED_CONTEXT).rules,
    facts: ["is-script", "imports-app"],
    query: "needs-finding",
  }));
  const answer = answerBoundedDerivationDemand(demand);
  assert.equal(answer.disposition, "completion");
  assert.equal(answer.verdict, "potential");
  const steps = answer.witness.map((w) => w.by);
  assert.ok(steps.includes("law:script-no-app"));
  assert.ok(steps.includes("law:violation-filed"));
  assert.match(answer.text, /needs-finding: potential/);
});

test("answerBoundedDerivationDemand returns typed would-settle questions when underdetermined", () => {
  const demand = demandWith(JSON.stringify({
    attributes: JSON.parse(HOUSE_SUPPLIED_CONTEXT).attributes,
    rules: JSON.parse(HOUSE_SUPPLIED_CONTEXT).rules,
    facts: ["is-script"],
    query: "needs-finding",
  }));
  const answer = answerBoundedDerivationDemand(demand);
  assert.equal(answer.verdict, "absurd");
  assert.equal(answer.witness, null);
  assert.equal(answer.questions.length, 1);
  assert.deepEqual(answer.questions[0].missing, ["stratification-violation"]);
  assert.match(answer.text, /would settle on/);
});

test("answerBoundedDerivationDemand returns a contested verdict with a refusal number", () => {
  const demand = demandWith(JSON.stringify({
    attributes: ["is-script", "is-app", "imports-script", "lawful-import"],
    rules: [
      { name: "law:script-script-ok", if: ["is-script", "imports-script"], then: ["lawful-import"] },
      { name: "law:app-imports-ok", if: ["is-app", "imports-script"], then: ["lawful-import"] },
    ],
    facts: ["is-script", "imports-script"],
    denials: ["is-app", "imports-script"],
    query: "lawful-import",
    conductances: [
      ["is-script", "imports-script", 1],
      ["is-app", "imports-script", 1],
      ["imports-script", "lawful-import", 1],
    ],
  }));
  const answer = answerBoundedDerivationDemand(demand);
  assert.equal(answer.verdict, "stable");
  assert.ok(answer.witness && answer.counterWitness);
  assert.ok(answer.refusal > 0 && Number.isFinite(answer.refusal));
});

test("answerBoundedDerivationDemand refuses a malformed demand rather than throwing", () => {
  const answer = answerBoundedDerivationDemand({ context: { suppliedContext: "{}" } });
  assert.equal(answer.disposition, "refused");
  assert.match(answer.reason, /requires attributes and rules/);
});

test("the nominal consideration alternative is the market's cheapest lawful (nonzero) bundle", () => {
  assert.equal(DERIVATION_CONSIDERATION_ALTERNATIVES.length, 1);
  const [alternative] = DERIVATION_CONSIDERATION_ALTERNATIVES;
  assert.equal(alternative.obligations.length, 1);
  assert.equal(alternative.obligations[0].amount, 1);
  assert.equal(alternative.obligations[0].kind, "service");
});
