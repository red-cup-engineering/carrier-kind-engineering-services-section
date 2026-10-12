import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveSetOfWorkIntentsFromRoadmapCut } from "../scripts/derive-set-of-work-intents-from-roadmap-cut.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "thread, nextEdges, and shipped derive a project item and two task items, both unsaturated",
    "input": {
      "recordedAt": "2026-09-06T03:35:00Z",
      "thread": "the roadmap engine test thread",
      "brokenEdge": "nothing has shipped yet",
      "nextEdges": [
        "the first counterparty test edge"
      ],
      "findings": [
        "a finding about the test thread"
      ],
      "state": {
        "shipped": [
          "the unit shipped as record and settlement"
        ]
      },
      "source": "561-group-enterprise-project-management-services-section/data/records/2026-09-06-0335-goal-stack-roadmap.json",
      "sourceText": "{\n  \"thread\": \"the roadmap engine test thread\",\n  \"nextEdges\": [\n    \"the first counterparty test edge\"\n  ],\n  \"state\": {\"shipped\": [\"the unit shipped as record and settlement\"]}\n}"
    },
    "output": {
      "kind": "agent-work.structured-intent",
      "id": "roadmap-cut-2026-09-06-0335",
      "producer": {
        "id": "roadmap-engineering-services-section:derive-set-of-work-intents-from-roadmap-cut",
        "revision": "0.1.0"
      },
      "sources": [
        {
          "id": "roadmap-cut",
          "kind": "roadmap-cut",
          "locator": "561-group-enterprise-project-management-services-section/data/records/2026-09-06-0335-goal-stack-roadmap.json"
        }
      ],
      "items": [
        {
          "cell": "project:the-roadmap-engine-test-thread",
          "parent": "endeavor:ops-561-group",
          "text": "the roadmap engine test thread",
          "evidence": [
            "brokenEdge: nothing has shipped yet",
            "finding: a finding about the test thread"
          ],
          "provenance": [
            {
              "source": "roadmap-cut",
              "start": 2,
              "end": 2,
              "unit": "line"
            }
          ]
        },
        {
          "cell": "plan:2026-09-06-0335-the-roadmap-engine-test-thread",
          "parent": "project:the-roadmap-engine-test-thread",
          "text": "Roadmap cut 2026-09-06-0335 for the roadmap engine test thread",
          "evidence": [
            "cut: 561-group-enterprise-project-management-services-section/data/records/2026-09-06-0335-goal-stack-roadmap.json"
          ],
          "provenance": [
            {
              "source": "roadmap-cut",
              "start": 2,
              "end": 2,
              "unit": "line"
            }
          ]
        },
        {
          "cell": "task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93",
          "parent": "plan:2026-09-06-0335-the-roadmap-engine-test-thread",
          "text": "the first counterparty test edge",
          "evidence": [
            "nextEdge: 561-group-enterprise-project-management-services-section/data/records/2026-09-06-0335-goal-stack-roadmap.json"
          ],
          "provenance": [
            {
              "source": "roadmap-cut",
              "start": 4,
              "end": 4,
              "unit": "line"
            }
          ]
        },
        {
          "cell": "task:2026-09-06-0335-shipped-the-unit-shipped-as-record-and-settlement-90f9f768",
          "parent": "plan:2026-09-06-0335-the-roadmap-engine-test-thread",
          "text": "the unit shipped as record and settlement",
          "evidence": [
            "shipped:2026-09-06T03:35:00Z"
          ],
          "provenance": [
            {
              "source": "roadmap-cut",
              "start": 6,
              "end": 6,
              "unit": "line"
            }
          ]
        }
      ],
      "refusals": [
        {
          "cell": "task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93",
          "text": "the first counterparty test edge",
          "reason": "no-bcp-14-force"
        },
        {
          "cell": "task:2026-09-06-0335-shipped-the-unit-shipped-as-record-and-settlement-90f9f768",
          "text": "the unit shipped as record and settlement",
          "reason": "no-bcp-14-force"
        }
      ]
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a task text repeated verbatim across cuts folds onto its prior cell",
    "input": {
      "recordedAt": "2026-09-06T05:00:00Z",
      "thread": "an earlier thread",
      "nextEdges": [
        "Clients MUST retry with backoff."
      ],
      "source": "561-group-enterprise-project-management-services-section/data/records/2026-09-06-0500-goal-stack-roadmap.json",
      "priorItems": [
        {
          "cell": "project:earlier-thread",
          "parent": "endeavor:ops-561-group",
          "text": "an earlier thread",
          "evidence": [
            "cut: earlier-source.json"
          ],
          "provenance": [
            {
              "source": "roadmap-cut",
              "start": 2,
              "end": 2,
              "unit": "line"
            }
          ]
        },
        {
          "cell": "task:2026-09-05-0000-clients-must-retry-with-backoff-11111111",
          "parent": "project:earlier-thread",
          "text": "Clients MUST retry with backoff.",
          "evidence": [
            "nextEdge: earlier-source.json",
            "force:MUST modality:necessary horizon:soon (read-bcp-14-requirements)"
          ],
          "provenance": [
            {
              "source": "roadmap-cut",
              "start": 4,
              "end": 4,
              "unit": "line"
            }
          ]
        }
      ]
    },
    "output": {
      "kind": "agent-work.structured-intent",
      "id": "roadmap-cut-2026-09-06-0500",
      "producer": {
        "id": "roadmap-engineering-services-section:derive-set-of-work-intents-from-roadmap-cut",
        "revision": "0.1.0"
      },
      "sources": [
        {
          "id": "roadmap-cut",
          "kind": "roadmap-cut",
          "locator": "561-group-enterprise-project-management-services-section/data/records/2026-09-06-0500-goal-stack-roadmap.json"
        }
      ],
      "items": [
        {
          "cell": "project:earlier-thread",
          "parent": "endeavor:ops-561-group",
          "text": "an earlier thread",
          "evidence": [
            "cut: earlier-source.json",
            "cut: 561-group-enterprise-project-management-services-section/data/records/2026-09-06-0500-goal-stack-roadmap.json",
            "repeated:2"
          ],
          "provenance": [
            {
              "source": "roadmap-cut",
              "start": 2,
              "end": 2,
              "unit": "line"
            },
            {
              "source": "roadmap-cut"
            }
          ]
        },
        {
          "cell": "plan:2026-09-06-0500-an-earlier-thread",
          "parent": "project:earlier-thread",
          "text": "Roadmap cut 2026-09-06-0500 for an earlier thread",
          "evidence": [
            "cut: 561-group-enterprise-project-management-services-section/data/records/2026-09-06-0500-goal-stack-roadmap.json"
          ],
          "provenance": [
            {
              "source": "roadmap-cut"
            }
          ]
        },
        {
          "cell": "task:2026-09-05-0000-clients-must-retry-with-backoff-11111111",
          "parent": "plan:2026-09-06-0500-an-earlier-thread",
          "text": "Clients MUST retry with backoff.",
          "evidence": [
            "nextEdge: earlier-source.json",
            "force:MUST modality:necessary horizon:soon (read-bcp-14-requirements)",
            "nextEdge: 561-group-enterprise-project-management-services-section/data/records/2026-09-06-0500-goal-stack-roadmap.json",
            "repeated:2"
          ],
          "provenance": [
            {
              "source": "roadmap-cut",
              "start": 4,
              "end": 4,
              "unit": "line"
            },
            {
              "source": "roadmap-cut"
            }
          ]
        }
      ],
      "refusals": []
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveSetOfWorkIntentsFromRoadmapCut(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-set-of-work-intents-from-roadmap-cut.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
