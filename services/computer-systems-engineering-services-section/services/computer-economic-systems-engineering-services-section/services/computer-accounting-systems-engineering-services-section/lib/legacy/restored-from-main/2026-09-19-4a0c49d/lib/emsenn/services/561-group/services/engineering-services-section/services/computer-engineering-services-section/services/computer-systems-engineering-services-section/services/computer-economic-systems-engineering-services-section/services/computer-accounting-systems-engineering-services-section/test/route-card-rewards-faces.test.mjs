import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { routeCardRewards } from "../scripts/route-card-rewards.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "routes to the card whose in-cap category multiplier beats the competitor's base rate",
    "input": {
      "mandate": {
        "cards": [
          {
            "cardId": "cardA",
            "commodity": "pointsA",
            "baseRate": 1,
            "foreignTransactionFeeRate": 0,
            "annualFee": "0",
            "categories": [
              {
                "category": "groceries",
                "multiplier": 3,
                "cap": "1500",
                "capPeriod": "quarterly",
                "capUsage": "500",
                "channel": "any"
              }
            ],
            "signUpBonus": null,
            "expiringCredits": []
          },
          {
            "cardId": "cardB",
            "commodity": "pointsB",
            "baseRate": 2,
            "foreignTransactionFeeRate": 0,
            "annualFee": "0",
            "categories": [],
            "signUpBonus": null,
            "expiringCredits": []
          }
        ]
      },
      "purchase": {
        "amount": "100",
        "merchantCategory": "groceries",
        "currency": "USD",
        "date": "2026-09-05",
        "channel": "in-store"
      }
    },
    "output": {
      "type": "CardRewardsRoutingDecision",
      "version": 1,
      "purchase": {
        "amount": "100",
        "merchantCategory": "groceries",
        "currency": "USD",
        "date": "2026-09-05",
        "channel": "in-store"
      },
      "chosen": {
        "cardId": "cardA",
        "commodity": "pointsA",
        "expectedReward": "300",
        "bonusApplies": false,
        "categoryApplied": "groceries",
        "rewardRate": 3,
        "foreignTransactionFee": "0",
        "capRemaining": "1000",
        "reasonChain": [
          "category-multiplier-under-cap"
        ]
      },
      "alternatives": [
        {
          "cardId": "cardA",
          "commodity": "pointsA",
          "expectedReward": "300",
          "bonusApplies": false,
          "categoryApplied": "groceries",
          "rewardRate": 3,
          "foreignTransactionFee": "0",
          "capRemaining": "1000",
          "reasonChain": [
            "category-multiplier-under-cap"
          ]
        },
        {
          "cardId": "cardB",
          "commodity": "pointsB",
          "expectedReward": "200",
          "bonusApplies": false,
          "categoryApplied": null,
          "rewardRate": 2,
          "foreignTransactionFee": "0",
          "capRemaining": "unlimited",
          "reasonChain": [
            "base-rate"
          ]
        }
      ],
      "refusal": null
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await routeCardRewards(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/route-card-rewards.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
