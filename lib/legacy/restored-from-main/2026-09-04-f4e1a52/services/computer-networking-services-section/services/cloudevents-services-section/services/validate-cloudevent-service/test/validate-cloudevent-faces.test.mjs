import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateCloudEvent } from "../scripts/validate-cloudevent.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a conformant event validates",
    "input": {
      "event": {
        "specversion": "1.0",
        "id": "a-1",
        "source": "urn:example:src",
        "type": "com.example.made"
      }
    },
    "output": {
      "type": "CloudEventValidation",
      "ok": true,
      "violations": [],
      "event": {
        "specversion": "1.0",
        "id": "a-1",
        "source": "urn:example:src",
        "type": "com.example.made"
      }
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a missing id is named",
    "input": {
      "event": {
        "specversion": "1.0",
        "source": "urn:example:src",
        "type": "com.example.made"
      }
    },
    "output": {
      "type": "CloudEventValidation",
      "ok": false,
      "violations": [
        {
          "attribute": "id",
          "rule": "must be a non-empty string"
        }
      ],
      "event": {
        "specversion": "1.0",
        "source": "urn:example:src",
        "type": "com.example.made"
      }
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await validateCloudEvent(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/validate-cloudevent.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
