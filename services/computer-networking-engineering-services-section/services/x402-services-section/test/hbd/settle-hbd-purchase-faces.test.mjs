import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { settleHbdPurchase } from "../../src/hbd/settle-hbd-purchase.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "settles the real 2021-03-29 actifit.pay to emsenn0 verified transfer",
    "input": {
      "verification": {
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
      },
      "resource": {
        "id": "hive-engine-exit-tightness-report",
        "price": "0.002"
      },
      "sellerAccount": "emsenn0",
      "date": "2021-03-29"
    },
    "output": {
      "type": "HbdPurchaseSettlement",
      "version": 1,
      "witnessRecord": {
        "type": "HbdPurchaseSettlementWitness",
        "version": 1,
        "graphId": "ni:///sha-256;PoVMRp8VDUEPKQG6nwMJUO9YUU-Gqy_HxO3ZVFVO6zg",
        "network": "hive:mainnet",
        "transaction": "3138e2ef6b5881d0752c9512047ab7360a9b9127",
        "resourceId": "hive-engine-exit-tightness-report",
        "sellerAccount": "emsenn0",
        "buyerAccount": "actifit.pay",
        "amount": "0.002",
        "asset": "HBD",
        "memo": "Weekly delegator share payment. Thank you for supporting @actifit :)",
        "block": 52555235,
        "settledAt": "2021-03-29"
      },
      "beancount": {
        "date": "2021-03-29",
        "narration": "x402 hbd-transfer sale: hive-engine-exit-tightness-report to actifit.pay",
        "postings": [
          {
            "account": "Assets:Hive:HBD:Emsenn0",
            "amount": "0.002",
            "commodity": "HBD"
          },
          {
            "account": "Income:Sales:X402:Hive-engine-exit-tightness-report",
            "amount": "-0.002",
            "commodity": "HBD"
          }
        ],
        "text": "2021-03-29 * \"x402 hbd-transfer sale: hive-engine-exit-tightness-report to actifit.pay\"\n  Assets:Hive:HBD:Emsenn0  0.002 HBD\n  Income:Sales:X402:Hive-engine-exit-tightness-report  -0.002 HBD\n"
      }
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await settleHbdPurchase(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/settle-hbd-purchase.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
