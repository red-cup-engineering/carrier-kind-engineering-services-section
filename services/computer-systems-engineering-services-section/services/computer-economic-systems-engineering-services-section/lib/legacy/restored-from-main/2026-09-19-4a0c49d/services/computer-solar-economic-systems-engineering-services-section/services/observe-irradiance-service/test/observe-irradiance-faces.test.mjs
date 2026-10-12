import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { observeIrradiance } from "../scripts/observe-irradiance.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "pvgis is declared but refused until implemented",
    "input": {
      "place": {
        "lat": 43.02,
        "lon": -102.55
      },
      "startDate": "2026-01-01",
      "endDate": "2026-01-01",
      "dataset": "pvgis"
    },
    "output": {
      "refused": true,
      "reason": "dataset-not-implemented",
      "dataset": "pvgis"
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "an unadmitted dataset refuses as data",
    "input": {
      "place": {
        "lat": 43.02,
        "lon": -102.55
      },
      "startDate": "2026-01-01",
      "endDate": "2026-01-01",
      "dataset": "open-meteo"
    },
    "output": {
      "refused": true,
      "reason": "dataset-not-admitted",
      "dataset": "open-meteo"
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await observeIrradiance(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/observe-irradiance.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
