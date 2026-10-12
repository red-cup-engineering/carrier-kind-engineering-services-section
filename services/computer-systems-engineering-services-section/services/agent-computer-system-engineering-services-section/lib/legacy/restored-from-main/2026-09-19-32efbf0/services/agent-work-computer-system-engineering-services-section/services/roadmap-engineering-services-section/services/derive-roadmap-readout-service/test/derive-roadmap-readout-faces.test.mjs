import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveRoadmapReadout } from "../scripts/derive-roadmap-readout.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "frontier items group by parent, each with a derived horizon and modality",
    "input": {
      "dispatch": {
        "kind": "metroplat.agent-work.dispatch-settlement",
        "subject": "agent-work-dispatch",
        "date": "2026-09-06",
        "policy": "declared-duty-with-structural-and-coordination-readiness",
        "agents": [],
        "coordination": "clear",
        "coordinationCost": 0,
        "evidence": [],
        "feed": "daily-claim-sessions",
        "malformed": 0,
        "queue": [],
        "ready": 2,
        "blocked": 1,
        "done": 0,
        "sourceRows": 10,
        "frontier": [
          {
            "agent": "a1",
            "office": "eo",
            "status": "open",
            "state": "ready",
            "standing": "held",
            "structural": {
              "blockers": [],
              "state": "ready"
            },
            "coordination": {
              "state": "clear"
            },
            "reasons": [],
            "conflicts": [],
            "intent": "i",
            "level": "task",
            "passive": "a1",
            "via": "office",
            "scope": "task:exact-deps-lib-x",
            "parent": "plan:2026-09-03-core-stability",
            "text": "pin exact"
          },
          {
            "agent": "a1",
            "office": "eo",
            "status": "open",
            "state": "ready",
            "standing": "held",
            "structural": {
              "blockers": [],
              "state": "ready"
            },
            "coordination": {
              "state": "clear"
            },
            "reasons": [],
            "conflicts": [],
            "intent": "i",
            "level": "task",
            "passive": "a1",
            "via": "office",
            "scope": "task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93",
            "parent": "project:the-roadmap-engine-test-thread",
            "text": "the first counterparty test edge"
          },
          {
            "agent": "a1",
            "office": "eo",
            "status": "open",
            "state": "blocked",
            "standing": "held",
            "structural": {
              "blockers": [
                "dep:x"
              ],
              "state": "blocked"
            },
            "coordination": {
              "state": "clear"
            },
            "reasons": [],
            "conflicts": [],
            "intent": "i",
            "level": "task",
            "passive": "a1",
            "via": "office",
            "scope": "task:2026-09-06-0335-shipped-x",
            "parent": "project:the-roadmap-engine-test-thread",
            "text": "the unit shipped"
          }
        ]
      }
    },
    "output": {
      "kind": "RoadmapReadout",
      "date": "2026-09-06",
      "cells": [
        {
          "cell": "plan:2026-09-03-core-stability",
          "items": [
            {
              "scope": "task:exact-deps-lib-x",
              "parent": "plan:2026-09-03-core-stability",
              "text": "pin exact",
              "state": "ready",
              "workType": "process",
              "modality": "determined",
              "horizon": "now"
            }
          ],
          "ready": 1,
          "blocked": 0,
          "done": 0
        },
        {
          "cell": "project:the-roadmap-engine-test-thread",
          "items": [
            {
              "scope": "task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93",
              "parent": "project:the-roadmap-engine-test-thread",
              "text": "the first counterparty test edge",
              "state": "ready",
              "workType": "inquiry",
              "modality": "impossible-now",
              "horizon": "eventually"
            },
            {
              "scope": "task:2026-09-06-0335-shipped-x",
              "parent": "project:the-roadmap-engine-test-thread",
              "text": "the unit shipped",
              "state": "blocked",
              "workType": "inquiry",
              "modality": "impossible-now",
              "horizon": "eventually"
            }
          ],
          "ready": 1,
          "blocked": 1,
          "done": 0
        }
      ],
      "totals": {
        "ready": 2,
        "blocked": 1,
        "done": 0
      },
      "money": {
        "source": "none",
        "rows": []
      },
      "registry": []
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "money comes only from ledger; an empty dispatch still reports the dispatch's own done count",
    "input": {
      "dispatch": {
        "frontier": [],
        "ready": 0,
        "blocked": 0,
        "done": 3,
        "date": "2026-09-06"
      },
      "ledger": {
        "rows": [
          {
            "account": "cash",
            "amount": 100
          }
        ]
      }
    },
    "output": {
      "kind": "RoadmapReadout",
      "date": "2026-09-06",
      "cells": [],
      "totals": {
        "ready": 0,
        "blocked": 0,
        "done": 3
      },
      "money": {
        "source": "ledger",
        "rows": [
          {
            "account": "cash",
            "amount": 100
          }
        ]
      },
      "registry": []
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveRoadmapReadout(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-roadmap-readout.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
