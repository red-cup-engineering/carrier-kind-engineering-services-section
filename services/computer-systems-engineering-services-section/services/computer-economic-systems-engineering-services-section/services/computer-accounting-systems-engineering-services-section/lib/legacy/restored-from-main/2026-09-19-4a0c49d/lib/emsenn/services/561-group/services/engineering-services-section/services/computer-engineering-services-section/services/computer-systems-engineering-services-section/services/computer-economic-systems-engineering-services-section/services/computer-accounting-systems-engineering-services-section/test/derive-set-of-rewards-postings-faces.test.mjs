import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveSetOfRewardsPostings } from "../scripts/derive-set-of-rewards-postings.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "derives an earned-points transaction and its account-open directives",
    "input": {
      "principalId": "emsenn",
      "events": [
        {
          "eventId": "EVT-1",
          "kind": "earned",
          "date": "2026-09-05",
          "issuer": "chase",
          "program": "ultimate-rewards",
          "narration": "Earned rewards on dining",
          "commodity": "CHASEUR",
          "amount": "1000",
          "redemptionValueUsd": null,
          "destinationProgram": null,
          "cardLabel": null,
          "statementCreditUsd": null
        }
      ],
      "priceDirectives": []
    },
    "output": {
      "type": "RewardsPostingSet",
      "version": 1,
      "principalId": "emsenn",
      "transactionCount": 1,
      "transactions": [
        {
          "eventId": "EVT-1",
          "kind": "earned",
          "date": "2026-09-05",
          "narration": "Earned rewards on dining",
          "directive": "2026-09-05 * \"Earned rewards on dining\"\n  event_id: \"EVT-1\"\n  principal_id: \"emsenn\"\n  issuer: \"chase\"\n  program: \"ultimate-rewards\"\n  Assets:Rewards:Chase:Ultimate-Rewards  1000 CHASEUR\n  Income:Rewards  -1000 CHASEUR"
        }
      ],
      "priceDirectiveCount": 0,
      "priceDirectives": [],
      "accountsToOpen": [
        {
          "account": "Assets:Rewards:Chase:Ultimate-Rewards",
          "date": "2026-09-05",
          "directive": "2026-09-05 open Assets:Rewards:Chase:Ultimate-Rewards"
        },
        {
          "account": "Income:Rewards",
          "date": "2026-09-05",
          "directive": "2026-09-05 open Income:Rewards"
        }
      ],
      "skipped": []
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveSetOfRewardsPostings(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-set-of-rewards-postings.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
