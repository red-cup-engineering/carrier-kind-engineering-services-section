import assert from "node:assert/strict";
import test from "node:test";
import { expandRecurrenceRule, operation } from "../scripts/expand-recurrence-rule.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "daily for 10 occurrences",
    "input": {
      "dtstart": "19970902T090000Z",
      "rrule": "FREQ=DAILY;COUNT=10",
      "window": {
        "start": "1997-09-01T00:00:00Z",
        "end": "1997-12-31T00:00:00Z"
      }
    },
    "output": {
      "occurrences": [
        "1997-09-02T09:00:00.000Z",
        "1997-09-03T09:00:00.000Z",
        "1997-09-04T09:00:00.000Z",
        "1997-09-05T09:00:00.000Z",
        "1997-09-06T09:00:00.000Z",
        "1997-09-07T09:00:00.000Z",
        "1997-09-08T09:00:00.000Z",
        "1997-09-09T09:00:00.000Z",
        "1997-09-10T09:00:00.000Z",
        "1997-09-11T09:00:00.000Z"
      ]
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a VEVENT without RRULE occurs once, at DTSTART",
    "input": {
      "dtstart": "19970902T090000Z",
      "window": {
        "start": "1997-01-01T00:00:00Z",
        "end": "1998-01-01T00:00:00Z"
      }
    },
    "output": {
      "occurrences": [
        "1997-09-02T09:00:00.000Z"
      ]
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await expandRecurrenceRule(example.input);
    assert.deepEqual(importedOutput, example.output);
    const declaredOutput = await operation.operation(example.input);
    assert.deepEqual(declaredOutput, example.output);
    assert.deepEqual(declaredOutput, importedOutput);
  });
}
