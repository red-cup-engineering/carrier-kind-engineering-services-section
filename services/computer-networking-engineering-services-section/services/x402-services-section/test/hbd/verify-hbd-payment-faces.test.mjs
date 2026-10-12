import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { verifyHbdPayment } from "../../src/hbd/verify-hbd-payment.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "verifies the real 2021-03-29 actifit.pay to emsenn0 HBD transfer against two matching fixture rows",
    "input": {
      "requirement": {
        "scheme": "hbd-transfer",
        "network": "hive:mainnet",
        "maxAmountRequired": "0.002",
        "resource": "hive-engine-exit-tightness-report",
        "payTo": "emsenn0",
        "asset": "HBD",
        "maxTimeoutSeconds": 900,
        "extra": {
          "memo": "Weekly delegator share payment. Thank you for supporting @actifit :)",
          "expiresAt": "2021-03-30T00:00:00.000Z"
        }
      },
      "claim": {
        "block": 52555235,
        "transactionId": "3138e2ef6b5881d0752c9512047ab7360a9b9127"
      },
      "nodes": [
        "https://api.hive.blog",
        "https://api.openhive.network"
      ],
      "observedAt": "2021-03-29T10:00:00.000Z",
      "fixtureResponses": [
        [
          {
            "op": [
              "transfer",
              {
                "to": "emsenn0",
                "from": "actifit.pay",
                "memo": "Weekly delegator share payment. Thank you for supporting @actifit :)",
                "amount": "0.002 HBD"
              }
            ],
            "block": 52555235,
            "trx_id": "3138e2ef6b5881d0752c9512047ab7360a9b9127",
            "timestamp": "2021-03-29T09:07:45"
          }
        ],
        [
          {
            "op": [
              "transfer",
              {
                "to": "emsenn0",
                "from": "actifit.pay",
                "memo": "Weekly delegator share payment. Thank you for supporting @actifit :)",
                "amount": "0.002 HBD"
              }
            ],
            "block": 52555235,
            "trx_id": "3138e2ef6b5881d0752c9512047ab7360a9b9127",
            "timestamp": "2021-03-29T09:07:45"
          }
        ]
      ]
    },
    "output": {
      "type": "HbdPaymentVerification",
      "version": 1,
      "status": "verified",
      "transfer": {
        "from": "actifit.pay",
        "to": "emsenn0",
        "amount": "0.002",
        "asset": "HBD",
        "memo": "Weekly delegator share payment. Thank you for supporting @actifit :)",
        "block": 52555235,
        "transactionId": "3138e2ef6b5881d0752c9512047ab7360a9b9127",
        "timestamp": "2021-03-29T09:07:45"
      },
      "nodesAgreeing": [
        "https://api.hive.blog",
        "https://api.openhive.network"
      ]
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await verifyHbdPayment(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/verify-hbd-payment.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
