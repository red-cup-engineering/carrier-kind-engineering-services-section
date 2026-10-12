import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfRewardsPostings } from "../scripts/derive-set-of-rewards-postings.mjs";

function baseEvent(overrides) {
  return {
    eventId: "EVT",
    kind: "earned",
    date: "2026-09-05",
    issuer: "chase",
    program: "ultimate-rewards",
    narration: "Reward event",
    commodity: "CHASEUR",
    amount: "1000",
    redemptionValueUsd: null,
    destinationProgram: null,
    cardLabel: null,
    statementCreditUsd: null,
    ...overrides,
  };
}

test("an earned event posts the commodity into the program's Rewards asset account from Income:Rewards", () => {
  const result = deriveSetOfRewardsPostings({
    principalId: "emsenn",
    events: [baseEvent({ eventId: "EVT-1", narration: "Earned rewards on dining" })],
    priceDirectives: [],
  });
  assert.equal(result.transactionCount, 1);
  const [transaction] = result.transactions;
  assert.match(transaction.directive, /Assets:Rewards:Chase:Ultimate-Rewards {2}1000 CHASEUR/u);
  assert.match(transaction.directive, /Income:Rewards {2}-1000 CHASEUR/u);
  assert.deepEqual(result.accountsToOpen.map((entry) => entry.account), ["Assets:Rewards:Chase:Ultimate-Rewards", "Income:Rewards"]);
});

test("an expired event posts the commodity out of the Rewards asset account into Expenses:Rewards:Expired", () => {
  const result = deriveSetOfRewardsPostings({
    principalId: "emsenn",
    events: [baseEvent({ eventId: "EVT-2", kind: "expired", narration: "Points expired" })],
    priceDirectives: [],
  });
  const [transaction] = result.transactions;
  assert.match(transaction.directive, /Expenses:Rewards:Expired {2}1000 CHASEUR/u);
  assert.match(transaction.directive, /Assets:Rewards:Chase:Ultimate-Rewards {2}-1000 CHASEUR/u);
});

test("a transferred event moves the commodity between two program accounts", () => {
  const result = deriveSetOfRewardsPostings({
    principalId: "emsenn",
    events: [baseEvent({ eventId: "EVT-3", kind: "transferred", narration: "Moved to Sapphire", destinationProgram: "sapphire", amount: "500" })],
    priceDirectives: [],
  });
  const [transaction] = result.transactions;
  assert.match(transaction.directive, /Assets:Rewards:Chase:Sapphire {2}500 CHASEUR/u);
  assert.match(transaction.directive, /Assets:Rewards:Chase:Ultimate-Rewards {2}-500 CHASEUR/u);
});

test("a statement-credit event posts USD against the card's Liabilities account from Income:Rewards:Statement-Credits", () => {
  const result = deriveSetOfRewardsPostings({
    principalId: "emsenn",
    events: [baseEvent({ eventId: "EVT-4", kind: "statement-credit", narration: "Amex Platinum travel credit", commodity: null, amount: null, cardLabel: "amex platinum", statementCreditUsd: "100" })],
    priceDirectives: [],
  });
  const [transaction] = result.transactions;
  assert.match(transaction.directive, /Liabilities:Credit-Cards:Amex-Platinum {2}100 USD/u);
  assert.match(transaction.directive, /Income:Rewards:Statement-Credits {2}-100 USD/u);
});

test("a redemption realizing more than its cost basis books the difference to Income:Rewards:Redemption-Gain", () => {
  const result = deriveSetOfRewardsPostings({
    principalId: "emsenn",
    events: [baseEvent({ eventId: "EVT-5", kind: "redeemed", narration: "Redeemed for cash back", amount: "10000", redemptionValueUsd: "130" })],
    priceDirectives: [{ symbol: "CHASEUR", date: "2026-09-01", price: "0.0125" }],
  });
  assert.equal(result.skipped.length, 0);
  const [transaction] = result.transactions;
  assert.match(transaction.directive, /Assets:Rewards:Chase:Ultimate-Rewards {2}-10000 CHASEUR @ 0\.0125 USD/u);
  assert.match(transaction.directive, /Assets:Cash:Operating {2}130 USD/u);
  assert.match(transaction.directive, /Income:Rewards:Redemption-Gain {2}-5 USD/u);
});

test("a redemption realizing less than its cost basis books the difference to Expenses:Rewards:Redemption-Loss", () => {
  const result = deriveSetOfRewardsPostings({
    principalId: "emsenn",
    events: [baseEvent({ eventId: "EVT-6", kind: "redeemed", narration: "Redeemed for gift card", amount: "10000", redemptionValueUsd: "120" })],
    priceDirectives: [{ symbol: "CHASEUR", date: "2026-09-01", price: "0.0125" }],
  });
  const [transaction] = result.transactions;
  assert.match(transaction.directive, /Expenses:Rewards:Redemption-Loss {2}5 USD/u);
});

test("a redemption with no covering price directive is skipped rather than posted", () => {
  const result = deriveSetOfRewardsPostings({
    principalId: "emsenn",
    events: [baseEvent({ eventId: "EVT-7", kind: "redeemed", narration: "Redeemed for travel", amount: "10000", redemptionValueUsd: "130" })],
    priceDirectives: [],
  });
  assert.equal(result.transactionCount, 0);
  assert.deepEqual(result.skipped, [{ eventId: "EVT-7", reason: "no price directive on or before 2026-09-05 for commodity CHASEUR" }]);
});
