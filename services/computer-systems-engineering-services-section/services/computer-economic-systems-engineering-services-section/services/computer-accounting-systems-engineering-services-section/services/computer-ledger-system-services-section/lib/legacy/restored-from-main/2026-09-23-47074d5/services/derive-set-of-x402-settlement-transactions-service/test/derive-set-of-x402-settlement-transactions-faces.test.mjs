import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveSetOfX402SettlementTransactions } from "../scripts/derive-set-of-x402-settlement-transactions.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a two-witness $0.51 USDC settlement books against the gateway's income account",
    "input": {
      "receiver": "0x1111111111111111111111111111111111111111",
      "gateway": "public-solar",
      "openAccounts": [
        "Assets:Digital-Assets:EVM:Base:Tokens"
      ],
      "settlements": [
        {
          "transactionHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "payer": "0xpayer000000000000000000000000000000000",
          "amount": "510000",
          "blockTime": "2026-09-05T14:00:00Z",
          "witnessGraphId": "ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI",
          "asset": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "receiver": "0x1111111111111111111111111111111111111111", "logIndex": 0, "evidenceId": "ni:///sha-256;receipt", "recognition": { "kind": "advance", "account": "Liabilities:Contract", "contractId": "contract:1" }
        }
      ]
    },
    "output": {
      "type": "X402SettlementTransactionSet",
      "version": 1,
      "gateway": "public-solar",
      "receiver": "base:0x0000000000000000000000000000000000EXA1",
      "assetAccount": "Assets:Digital-Assets:EVM:Base:Tokens",
      "incomeAccount": "Income:Sales:X402:Salt-pan-solar",
      "transactionCount": 1,
      "transactions": [
        {
          "date": "2026-09-05",
          "narration": "x402 sale via public-solar",
          "transactionHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "network": "eip155:8453",
          "payer": "0xpayer000000000000000000000000000000000",
          "amount": "0.51",
          "amountUsd": null,
          "witnessGraphId": "ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI",
          "directive": "2026-09-05 * \"x402 sale via public-solar\"\n  source_id: \"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"\n  payer: \"0xpayer000000000000000000000000000000000\"\n  network: \"eip155:8453\"\n  witness_graph_id: \"ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI\"\n  gateway: \"public-solar\"\n  receiver: \"base:0x0000000000000000000000000000000000EXA1\"\n  Assets:Digital-Assets:EVM:Base:Tokens  0.51 USDC\n  Income:Sales:X402:Salt-pan-solar  -0.51 USDC"
        }
      ],
      "accountsToOpen": [
        {
          "account": "Income:Sales:X402:Salt-pan-solar",
          "date": "2026-09-05",
          "directive": "2026-09-05 open Income:Sales:X402:Salt-pan-solar"
        }
      ],
      "refusals": []
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveSetOfX402SettlementTransactions(example.input);
    assert.equal(importedOutput.transactionCount, 1);
    assert.equal(importedOutput.refusals.length, 0);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-set-of-x402-settlement-transactions.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.equal(commandOutput.transactionCount, 1);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
