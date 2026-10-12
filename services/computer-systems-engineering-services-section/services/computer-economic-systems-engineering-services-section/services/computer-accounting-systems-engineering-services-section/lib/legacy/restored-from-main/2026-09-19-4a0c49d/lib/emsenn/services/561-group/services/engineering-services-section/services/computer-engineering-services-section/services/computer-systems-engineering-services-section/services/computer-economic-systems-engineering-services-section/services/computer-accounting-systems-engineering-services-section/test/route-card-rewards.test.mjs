import assert from "node:assert/strict";
import test from "node:test";
import { routeCardRewards } from "../scripts/route-card-rewards.mjs";

function card(overrides) {
  return {
    cardId: "card",
    commodity: "points",
    baseRate: 1,
    foreignTransactionFeeRate: 0,
    annualFee: "0",
    categories: [],
    signUpBonus: null,
    expiringCredits: [],
    ...overrides,
  };
}

test("an in-cap category multiplier beats a competitor's base rate", () => {
  const result = routeCardRewards({
    mandate: {
      cards: [
        card({ cardId: "cardA", commodity: "pointsA", categories: [{ category: "groceries", multiplier: 3, cap: "1500", capPeriod: "quarterly", capUsage: "500", channel: "any" }] }),
        card({ cardId: "cardB", commodity: "pointsB", baseRate: 2 }),
      ],
    },
    purchase: { amount: "100", merchantCategory: "groceries", currency: "USD", date: "2026-09-05", channel: "in-store" },
  });
  assert.equal(result.refusal, null);
  assert.equal(result.chosen.cardId, "cardA");
  assert.equal(result.chosen.expectedReward, "300");
  assert.deepEqual(result.chosen.reasonChain, ["category-multiplier-under-cap"]);
  assert.equal(result.alternatives.length, 2);
  assert.equal(result.alternatives[1].cardId, "cardB");
  assert.equal(result.alternatives[1].expectedReward, "200");
  assert.equal(result.alternatives[0].capRemaining, "1000");
});

test("an open sign-up-bonus deadline outranks a higher category multiplier elsewhere", () => {
  const result = routeCardRewards({
    mandate: {
      cards: [
        card({ cardId: "cardBonus", commodity: "bonusPoints", signUpBonus: { commodity: "bonusPoints", remainingSpend: "500", deadline: "2026-09-10" } }),
        card({ cardId: "cardHighRate", commodity: "highPoints", categories: [{ category: "dining", multiplier: 5, cap: null, capPeriod: null, capUsage: "0", channel: "any" }] }),
      ],
    },
    purchase: { amount: "100", merchantCategory: "dining", currency: "USD", date: "2026-09-05", channel: "in-store" },
  });
  assert.equal(result.chosen.cardId, "cardBonus");
  assert.equal(result.chosen.bonusApplies, true);
  assert.deepEqual(result.chosen.reasonChain, ["bonus-progress"]);
});

test("a sign-up bonus past its deadline no longer outranks category math", () => {
  const result = routeCardRewards({
    mandate: {
      cards: [
        card({ cardId: "cardBonus", commodity: "bonusPoints", signUpBonus: { commodity: "bonusPoints", remainingSpend: "500", deadline: "2026-09-10" } }),
        card({ cardId: "cardHighRate", commodity: "highPoints", categories: [{ category: "dining", multiplier: 5, cap: null, capPeriod: null, capUsage: "0", channel: "any" }] }),
      ],
    },
    purchase: { amount: "100", merchantCategory: "dining", currency: "USD", date: "2026-09-15", channel: "in-store" },
  });
  assert.equal(result.chosen.cardId, "cardHighRate");
  assert.equal(result.chosen.bonusApplies, false);
  const bonusCardAlternative = result.alternatives.find((alternative) => alternative.cardId === "cardBonus");
  assert.equal(bonusCardAlternative.bonusApplies, false);
});

test("a category whose projected spend would exceed its cap falls back to the base rate", () => {
  const result = routeCardRewards({
    mandate: {
      cards: [
        card({ cardId: "cardCapped", commodity: "cappedPoints", categories: [{ category: "dining", multiplier: 4, cap: "500", capPeriod: "monthly", capUsage: "490", channel: "any" }] }),
        card({ cardId: "cardUncapped", commodity: "uncappedPoints", categories: [{ category: "dining", multiplier: 2, cap: null, capPeriod: null, capUsage: "0", channel: "any" }] }),
      ],
    },
    purchase: { amount: "50", merchantCategory: "dining", currency: "USD", date: "2026-09-05", channel: "in-store" },
  });
  const cappedAlternative = result.alternatives.find((alternative) => alternative.cardId === "cardCapped");
  assert.equal(cappedAlternative.categoryApplied, null);
  assert.equal(cappedAlternative.rewardRate, 1);
  assert.deepEqual(cappedAlternative.reasonChain, ["base-rate"]);
  assert.equal(result.chosen.cardId, "cardUncapped");
});

test("a foreign purchase breaks a category-rate tie by the lower foreign-transaction fee", () => {
  const result = routeCardRewards({
    mandate: {
      cards: [
        card({ cardId: "cardFeeHigh", commodity: "travelPointsA", foreignTransactionFeeRate: 0.03, categories: [{ category: "travel", multiplier: 2, cap: null, capPeriod: null, capUsage: "0", channel: "any" }] }),
        card({ cardId: "cardFeeZero", commodity: "travelPointsB", foreignTransactionFeeRate: 0, categories: [{ category: "travel", multiplier: 2, cap: null, capPeriod: null, capUsage: "0", channel: "any" }] }),
      ],
    },
    purchase: { amount: "200", merchantCategory: "travel", currency: "EUR", date: "2026-09-05", channel: "online" },
  });
  assert.equal(result.chosen.cardId, "cardFeeZero");
  const feeHigh = result.alternatives.find((alternative) => alternative.cardId === "cardFeeHigh");
  assert.equal(feeHigh.foreignTransactionFee, "6");
  assert.deepEqual(feeHigh.reasonChain, ["category-multiplier-under-cap", "foreign-transaction-fee-applies"]);
  assert.equal(result.chosen.foreignTransactionFee, "0");
  assert.deepEqual(result.chosen.reasonChain, ["category-multiplier-under-cap", "no-foreign-transaction-fee"]);
});

test("a mandate naming no cards refuses instead of choosing one", () => {
  const result = routeCardRewards({
    mandate: { cards: [] },
    purchase: { amount: "10", merchantCategory: "groceries", currency: "USD", date: "2026-09-05", channel: "in-store" },
  });
  assert.equal(result.chosen, null);
  assert.deepEqual(result.alternatives, []);
  assert.equal(result.refusal.code, "NO_CARD_AVAILABLE");
});
