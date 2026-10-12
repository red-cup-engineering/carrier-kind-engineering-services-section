# @red-cup-engineering/read-utterance-as-work-rows-service

Reads one founder utterance into EAVT work rows: a genesis row and one row per BCP 14 requirement, each valued with force, subject, predicate, object, modality, horizon, line, and repetition count.

## Operation

~~~js
export function readUtteranceAsWorkRows(request)
~~~

### Parameters

- request (object): A record with utterance ({text, source, ts}), optional
priorRows (previously produced rows, used to count repeated requirements), and t
(the witness/provenance value stamped on every row).

### Returns

object: An UtteranceWorkRows record: type, version, entity ({kind,
address}), rows (the genesis row followed by one row per requirement),
requirements (the requirement-row count), and refusals (from the BCP 14 read).

### Refusals

- TypeError: When utterance.text is not a string.

## Command

read-utterance-as-work-rows reads one JSON value per input line and writes one JSON value per output line.

## Examples

### a MUST requirement is necessary, horizon soon

Input:

~~~json
{
  "utterance": {
    "text": "Clients MUST retry with backoff.",
    "source": "spec-example",
    "ts": "2026-01-01T00:00:00Z"
  },
  "priorRows": [],
  "t": "t:example-1"
}
~~~

Output:

~~~json
{
  "type": "UtteranceWorkRows",
  "version": 1,
  "entity": {
    "kind": "utterance",
    "address": "utterance:BQT0W86EGYk9bPaV1hFI8mfwQRTUE_lHfbJHS7cqZgs"
  },
  "rows": [
    {
      "e": "utterance:BQT0W86EGYk9bPaV1hFI8mfwQRTUE_lHfbJHS7cqZgs",
      "a": "constituted",
      "v": {
        "text": "Clients MUST retry with backoff.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "t": "t:example-1"
    },
    {
      "e": "utterance:BQT0W86EGYk9bPaV1hFI8mfwQRTUE_lHfbJHS7cqZgs",
      "a": "requiring",
      "v": {
        "force": "MUST",
        "subject": "Clients",
        "predicate": "retry",
        "object": "with backoff",
        "modality": "necessary",
        "horizon": "soon",
        "line": 1,
        "count": 1
      },
      "t": "t:example-1"
    }
  ],
  "requirements": 1,
  "refusals": []
}
~~~

### a MUST NOT requirement is determined, horizon now

Input:

~~~json
{
  "utterance": {
    "text": "A password MUST NOT be logged in plaintext.",
    "source": "spec-example",
    "ts": "2026-01-01T00:00:00Z"
  },
  "priorRows": [],
  "t": "t:example-2"
}
~~~

Output:

~~~json
{
  "type": "UtteranceWorkRows",
  "version": 1,
  "entity": {
    "kind": "utterance",
    "address": "utterance:kw-KJXZT17POrJCcpRRWxxhcqIjR8mqmz4OUKE6KBJ0"
  },
  "rows": [
    {
      "e": "utterance:kw-KJXZT17POrJCcpRRWxxhcqIjR8mqmz4OUKE6KBJ0",
      "a": "constituted",
      "v": {
        "text": "A password MUST NOT be logged in plaintext.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "t": "t:example-2"
    },
    {
      "e": "utterance:kw-KJXZT17POrJCcpRRWxxhcqIjR8mqmz4OUKE6KBJ0",
      "a": "requiring",
      "v": {
        "force": "MUST NOT",
        "subject": "A password",
        "predicate": "be",
        "object": "logged in plaintext",
        "modality": "determined",
        "horizon": "now",
        "line": 1,
        "count": 1
      },
      "t": "t:example-2"
    }
  ],
  "requirements": 1,
  "refusals": []
}
~~~

### two prior matching rows raise the third occurrence's count to 3

Input:

~~~json
{
  "utterance": {
    "text": "Clients MUST retry with backoff.",
    "source": "spec-example",
    "ts": "2026-01-01T00:00:00Z"
  },
  "priorRows": [
    {
      "e": "utterance:priorplaceholder",
      "a": "requiring",
      "v": {
        "force": "MUST",
        "subject": "Clients",
        "predicate": "retry",
        "object": "with backoff",
        "modality": "necessary",
        "horizon": "soon",
        "line": 1,
        "count": 1
      },
      "t": "t:prior-1"
    },
    {
      "e": "utterance:priorplaceholder",
      "a": "requiring",
      "v": {
        "force": "MUST",
        "subject": "Clients",
        "predicate": "retry",
        "object": "with backoff",
        "modality": "necessary",
        "horizon": "soon",
        "line": 1,
        "count": 2
      },
      "t": "t:prior-2"
    }
  ],
  "t": "t:example-3"
}
~~~

Output:

~~~json
{
  "type": "UtteranceWorkRows",
  "version": 1,
  "entity": {
    "kind": "utterance",
    "address": "utterance:XBllao_EC0YA2klOqtzivl07NkZrJrxigvNen3I7FwA"
  },
  "rows": [
    {
      "e": "utterance:XBllao_EC0YA2klOqtzivl07NkZrJrxigvNen3I7FwA",
      "a": "constituted",
      "v": {
        "text": "Clients MUST retry with backoff.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "t": "t:example-3"
    },
    {
      "e": "utterance:XBllao_EC0YA2klOqtzivl07NkZrJrxigvNen3I7FwA",
      "a": "requiring",
      "v": {
        "force": "MUST",
        "subject": "Clients",
        "predicate": "retry",
        "object": "with backoff",
        "modality": "necessary",
        "horizon": "soon",
        "line": 1,
        "count": 3
      },
      "t": "t:example-3"
    }
  ],
  "requirements": 1,
  "refusals": []
}
~~~

### an OPTIONAL requirement is impossible-now, horizon eventually

Input:

~~~json
{
  "utterance": {
    "text": "Caching is OPTIONAL for read replicas.",
    "source": "spec-example",
    "ts": "2026-01-01T00:00:00Z"
  },
  "priorRows": [],
  "t": "t:example-4"
}
~~~

Output:

~~~json
{
  "type": "UtteranceWorkRows",
  "version": 1,
  "entity": {
    "kind": "utterance",
    "address": "utterance:vV-9-q8CKxi6E3kficuebhh4lxhm4myWq8729uPNbXg"
  },
  "rows": [
    {
      "e": "utterance:vV-9-q8CKxi6E3kficuebhh4lxhm4myWq8729uPNbXg",
      "a": "constituted",
      "v": {
        "text": "Caching is OPTIONAL for read replicas.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "t": "t:example-4"
    },
    {
      "e": "utterance:vV-9-q8CKxi6E3kficuebhh4lxhm4myWq8729uPNbXg",
      "a": "requiring",
      "v": {
        "force": "OPTIONAL",
        "subject": "Caching is",
        "predicate": "for",
        "object": "read replicas",
        "modality": "impossible-now",
        "horizon": "eventually",
        "line": 1,
        "count": 1
      },
      "t": "t:example-4"
    }
  ],
  "requirements": 1,
  "refusals": []
}
~~~

### a multi-keyword sentence yields no requirement row but surfaces its refusal

Input:

~~~json
{
  "utterance": {
    "text": "Clients MUST validate input and SHOULD log errors.",
    "source": "spec-example",
    "ts": "2026-01-01T00:00:00Z"
  },
  "priorRows": [],
  "t": "t:example-5"
}
~~~

Output:

~~~json
{
  "type": "UtteranceWorkRows",
  "version": 1,
  "entity": {
    "kind": "utterance",
    "address": "utterance:H5viTu4ZriBmxJhDwWxWv4kgVCrsG_gfqilnIZjedt0"
  },
  "rows": [
    {
      "e": "utterance:H5viTu4ZriBmxJhDwWxWv4kgVCrsG_gfqilnIZjedt0",
      "a": "constituted",
      "v": {
        "text": "Clients MUST validate input and SHOULD log errors.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "t": "t:example-5"
    }
  ],
  "requirements": 0,
  "refusals": [
    {
      "line": 1,
      "text": "Clients MUST validate input and SHOULD log errors",
      "reason": "more-than-one-key-word"
    }
  ]
}
~~~
