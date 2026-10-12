import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { formHbdPaymentRequirement } from "../../src/hbd/form-hbd-payment-requirement.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "forms a payment requirement for a 0.100 HBD report",
    "input": {
      "resource": {
        "id": "hive-engine-exit-tightness-report",
        "price": "0.100"
      },
      "sellerAccount": "emsenn0",
      "memoPrefix": "x402",
      "nonce": "n-1",
      "expirySeconds": 900,
      "requestedAt": "2026-09-05T00:00:00.000Z"
    },
    "output": {
      "type": "X402PaymentRequired",
      "version": 1,
      "x402Version": 1,
      "resourceId": "hive-engine-exit-tightness-report",
      "accepts": [
        {
          "scheme": "hbd-transfer",
          "network": "hive:mainnet",
          "maxAmountRequired": "0.100",
          "resource": "hive-engine-exit-tightness-report",
          "description": "x402 hbd-transfer purchase of hive-engine-exit-tightness-report",
          "mimeType": "application/json",
          "payTo": "emsenn0",
          "asset": "HBD",
          "maxTimeoutSeconds": 900,
          "extra": {
            "memo": "x402:ni:///sha-256;LpCgyBcpZ7vCzsq-SdvVTiCXskr17aW-wUw2l7exPjE",
            "memoPrefix": "x402",
            "expiresAt": "2026-09-05T00:15:00.000Z",
            "verificationRule": {
              "kind": "hive-transfer-with-memo",
              "operation": "transfer",
              "nodesRequired": 2,
              "instructions": "Broadcast one Hive transfer operation to emsenn0 for exactly 0.100 HBD, with memo copied exactly as extra.memo, before 2026-09-05T00:15:00.000Z. Settlement reads two independent public Hive nodes and requires both to report one identical transfer (from, to, amount, memo, block, transaction id) before it is accepted."
            }
          }
        }
      ]
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await formHbdPaymentRequirement(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/form-hbd-payment-requirement.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
