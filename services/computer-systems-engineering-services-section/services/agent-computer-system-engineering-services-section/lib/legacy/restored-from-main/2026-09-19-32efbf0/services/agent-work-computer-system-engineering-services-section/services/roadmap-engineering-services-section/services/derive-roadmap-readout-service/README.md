# @red-cup-engineering/derive-roadmap-readout-service

Derives one RoadmapReadout from the work rail's agent-work-dispatch
settlement: frontier items grouped by their declared `parent` cell, each
carrying a horizon and modality read by composing classify-work-demand's
skillful-work quartet over the item's own scope and text (the founder's
corner rule: Process/both-closed -> Determined/Now, Derivation/Delta-only
-> Necessary/Soon, Procedure/sigma-only -> Possible/Later, Inquiry/neither
-> Impossible-now/Eventually) rather than guessed from prose, with ready
and blocked read from the item's own structural and coordination state,
done taken as the dispatch's own derived count since a discharged item
never appears in `frontier`, and money rows taken only from `ledger`
since this operation writes and stores nothing.

## Operation

~~~js
export function deriveRoadmapReadout(request)
~~~

### Parameters

- request (@param {object} request.dispatch An agent-work-dispatch settlement: `{agents,
 *   blocked, coordination, date, done, evidence, feed, frontier[{agent,
 *   conflicts, coordination, intent, level, office, parent, passive, reasons,
 *   scope, standing, state, status, structural, text, via}], kind, malformed,
 *   policy, queue, ready, sourceRows, subject}`.
 * @param {object} [request.ledger] A read-ledger-report-service register result.
 * @param {object[]} [request.registry] Optional registry rows, passed through.
 * ): 

### Returns

object: `{kind: "RoadmapReadout", date, cells:[{cell, items:[{scope, parent, text, state, workType, modality, horizon}], ready, blocked, done}], totals: {ready, blocked, done}, money, registry}`.

### Refusals

- TypeError: When `dispatch.frontier` is not an array.

## Command

derive-roadmap-readout reads one JSON value per input line and writes one JSON value per output line.

## Examples

### frontier items group by parent, each with a derived horizon and modality

Input:

~~~json
{
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
}
~~~

Output:

~~~json
{
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
          "workType": "Process",
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
          "workType": "Inquiry",
          "modality": "impossible-now",
          "horizon": "eventually"
        },
        {
          "scope": "task:2026-09-06-0335-shipped-x",
          "parent": "project:the-roadmap-engine-test-thread",
          "text": "the unit shipped",
          "state": "blocked",
          "workType": "Inquiry",
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
~~~

### money comes only from ledger; an empty dispatch still reports the dispatch's own done count

Input:

~~~json
{
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
}
~~~

Output:

~~~json
{
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
~~~
