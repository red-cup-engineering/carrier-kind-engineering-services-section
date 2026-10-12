import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveHouseholdEnergyBarrier } from "../scripts/derive-household-energy-barrier.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "sums propane heating and kcal food energy into one joule barrier",
    "input": {
      "heatingEnergy": {
        "amount": "0",
        "unit": "JOULES"
      },
      "foodEnergy": {
        "amount": "3600000",
        "unit": "JOULES"
      },
      "tariff": {
        "usdPerKwhTiers": [
          {
            "usdPerKwh": "0.1423"
          }
        ]
      },
      "asOf": "2026-09-05"
    },
    "output": {
      "amount": "3600000.000",
      "unit": "joules",
      "kwh": "1.000000",
      "usdPerKwh": "0.1423",
      "usdTotal": "0.1423",
      "asOf": "2026-09-05"
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveHouseholdEnergyBarrier(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-household-energy-barrier.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
