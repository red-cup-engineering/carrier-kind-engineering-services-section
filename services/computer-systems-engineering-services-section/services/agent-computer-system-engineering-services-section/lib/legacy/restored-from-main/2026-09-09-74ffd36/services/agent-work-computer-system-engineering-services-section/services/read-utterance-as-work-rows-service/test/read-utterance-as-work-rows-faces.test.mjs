import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readUtteranceAsWorkRows } from "../scripts/read-utterance-as-work-rows.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a MUST requirement is necessary, horizon soon",
    "input": {
      "utterance": {
        "text": "Clients MUST retry with backoff.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "priorRows": [],
      "t": "t:example-1"
    },
    "output": {
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
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a MUST NOT requirement is determined, horizon now",
    "input": {
      "utterance": {
        "text": "A password MUST NOT be logged in plaintext.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "priorRows": [],
      "t": "t:example-2"
    },
    "output": {
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
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "two prior matching rows raise the third occurrence's count to 3",
    "input": {
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
    },
    "output": {
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
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "an OPTIONAL requirement is impossible-now, horizon eventually",
    "input": {
      "utterance": {
        "text": "Caching is OPTIONAL for read replicas.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "priorRows": [],
      "t": "t:example-4"
    },
    "output": {
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
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a multi-keyword sentence yields no requirement row but surfaces its refusal",
    "input": {
      "utterance": {
        "text": "Clients MUST validate input and SHOULD log errors.",
        "source": "spec-example",
        "ts": "2026-01-01T00:00:00Z"
      },
      "priorRows": [],
      "t": "t:example-5"
    },
    "output": {
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
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await readUtteranceAsWorkRows(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/read-utterance-as-work-rows.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
