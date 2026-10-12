# @red-cup-engineering/derive-set-of-work-intents-from-roadmap-cut-service

Derives one `metroplat.work.structured-intent` record from a hand-written
goal-stack roadmap cut: the cut's thread becomes one project item under
`endeavor:ops-561-group`, each nextEdge and shipped entry becomes a task
item under that project (folding a text repeated verbatim across cuts
onto its first cell via `priorItems`, with the repetition count carried
as evidence), brokenEdge and findings become project evidence, and
force/modality/horizon are read per task text by composing
read-bcp-14-requirements rather than guessed.

## Operation

~~~js
export function deriveSetOfWorkIntentsFromRoadmapCut(request)
~~~

### Parameters

- request (object): The cut's own fields (recordedAt, thread?, goal?, brokenEdge?, nextEdges?, findings?, state?) plus `source` (the cut's repo path), `sourceText` (the cut file's raw text, for line provenance), optional `priorItems` (previously emitted items, for cross-cut dedupe), `id`, `producerId`, and `producerRevision`.

### Returns

object: `{kind: "metroplat.work.structured-intent", id, producer, sources, items, refusals}`. `refusals` is caller metadata, not part of the schema `structured-work-intent-admit` admits; strip it before admitting.

### Refusals

- TypeError: When `source` or `recordedAt` is missing.

## Command

derive-set-of-work-intents-from-roadmap-cut reads one JSON value per input line and writes one JSON value per output line.

## Examples

### thread, nextEdges, and shipped derive a project item and two task items, both unsaturated

Input:

~~~json
{
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
}
~~~

Output:

~~~json
{
  "kind": "metroplat.work.structured-intent",
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
      "cell": "task:2026-09-06-0335-the-first-counterparty-test-edge-dfb9ee93",
      "parent": "project:the-roadmap-engine-test-thread",
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
      "parent": "project:the-roadmap-engine-test-thread",
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
~~~

### a task text repeated verbatim across cuts folds onto its prior cell

Input:

~~~json
{
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
}
~~~

Output:

~~~json
{
  "kind": "metroplat.work.structured-intent",
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
      "cell": "task:2026-09-05-0000-clients-must-retry-with-backoff-11111111",
      "parent": "project:earlier-thread",
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
~~~
