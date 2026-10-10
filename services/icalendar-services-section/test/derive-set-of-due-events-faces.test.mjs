import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfDueEvents, operation } from "../scripts/derive-set-of-due-events.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "one event never done is due",
    "input": {
      "events": [
        {
          "id": "daily-standup",
          "dtstart": "19970902T090000Z",
          "rrule": "FREQ=DAILY;COUNT=10"
        }
      ],
      "now": "1997-09-05T00:00:00Z"
    },
    "output": {
      "due": [
        {
          "id": "daily-standup",
          "occurrence": "1997-09-04T09:00:00.000Z",
          "reason": "never-done"
        }
      ]
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "an event done since its last occurrence is not due",
    "input": {
      "events": [
        {
          "id": "daily-standup",
          "dtstart": "19970902T090000Z",
          "rrule": "FREQ=DAILY;COUNT=10"
        }
      ],
      "now": "1997-09-05T00:00:00Z",
      "lastDone": {
        "daily-standup": "1997-09-04T10:00:00Z"
      }
    },
    "output": {
      "due": []
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveSetOfDueEvents(example.input);
    assert.deepEqual(importedOutput, example.output);
    const declaredOutput = await operation.operation(example.input);
    assert.deepEqual(declaredOutput, example.output);
    assert.deepEqual(declaredOutput, importedOutput);
  });
}
