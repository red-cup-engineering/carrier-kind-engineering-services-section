import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { findHardcodedPaymentReceivers } from "../scripts/check-set-of-hardcoded-payment-receivers.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "clean allowlisted file",
    "input": {
      "files": [
        {
          "path": "test/fixtures/worker.test.mjs",
          "content": "const to = '0x1111111111111111111111111111111111111111';"
        }
      ]
    },
    "output": {
      "status": "clean",
      "violations": [],
      "allowlistPaths": [
        "data/records/",
        "test/fixtures/"
      ]
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "violation found outside allowlist",
    "input": {
      "files": [
        {
          "path": "src/route-catalog.mjs",
          "content": "const to = '0x2222222222222222222222222222222222222222';"
        }
      ]
    },
    "output": {
      "status": "violations-found",
      "violations": [
        {
          "path": "src/route-catalog.mjs",
          "field": "to",
          "address": "0x2222222222222222222222222222222222222222"
        }
      ],
      "allowlistPaths": [
        "data/records/",
        "test/fixtures/"
      ]
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await findHardcodedPaymentReceivers(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/check-set-of-hardcoded-payment-receivers.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
