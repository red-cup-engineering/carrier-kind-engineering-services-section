# @red-cup-engineering/settle-energy-exchange-record-service

Computes settlement and content identity for one energy-exchange record without settlement, composing

## Operation

~~~js
export function settleEnergyExchangeRecord(request)
~~~

### Parameters

- request (object): A record with `record` (an EnergyExchangeRecord carrying no `id` and no `settlement`, with a `witnesses` array of at least two entries) and an optional `tolerance` (a decimal string, default `"0"`, the maximum absolute difference between two witnesses of different kinds that still counts as agreement).

### Returns

object: The same record fields with `settlement` computed from `witnesses` (two witnesses of the first two distinct kinds, by first appearance, agreeing within `tolerance` settle it at the later of their two `asOf` timestamps; disagreeing beyond `tolerance` is a declared `mismatch` naming the exact decimal difference; fewer than two distinct witness kinds leaves it `posted`) and `id` set to the RFC 6920 sha-256 `ni:` URI of the RFC 8785 canonical JSON of those same fields plus the computed `settlement`, with `id` itself excluded from what is hashed.

### Refusals

- TypeError: When `record` is not an object, already carries `id` or `settlement`, carries fewer than two witnesses, or `tolerance` is not a decimal string.

## Command

settle-energy-exchange-record reads one JSON value per input line and writes one JSON value per output line.

## Examples

### two witnesses of different kinds agreeing exactly settle at the later asOf

Input:

~~~json
{
  "record": {
    "kind": "energy-exchange",
    "period": {
      "start": "2026-08-01T00:00:00Z",
      "end": "2026-08-31T23:59:59Z"
    },
    "commodity": "KWH",
    "quantity": "412.5",
    "from": {
      "id": "urn:example:household-a",
      "role": "producer"
    },
    "to": {
      "id": "urn:example:utility-co",
      "role": "grid"
    },
    "place": {
      "lat": 44.9778,
      "lon": -93.265,
      "utilityId": "urn:example:utility-co"
    },
    "witnesses": [
      {
        "kind": "meter",
        "value": "412.5",
        "source": "urn:example:household-a-inverter-export-2026-08",
        "asOf": "2026-09-01T00:00:00Z"
      },
      {
        "kind": "utility-statement",
        "value": "412.5",
        "source": "https://utility-co.example/statements/2026-08",
        "asOf": "2026-09-03T00:00:00Z"
      }
    ],
    "price": {
      "amount": "0.11",
      "commodity": "USD",
      "perUnit": true
    }
  }
}
~~~

Output:

~~~json
{
  "id": "ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA",
  "kind": "energy-exchange",
  "period": {
    "start": "2026-08-01T00:00:00Z",
    "end": "2026-08-31T23:59:59Z"
  },
  "commodity": "KWH",
  "quantity": "412.5",
  "from": {
    "id": "urn:example:household-a",
    "role": "producer"
  },
  "to": {
    "id": "urn:example:utility-co",
    "role": "grid"
  },
  "place": {
    "lat": 44.9778,
    "lon": -93.265,
    "utilityId": "urn:example:utility-co"
  },
  "witnesses": [
    {
      "kind": "meter",
      "value": "412.5",
      "source": "urn:example:household-a-inverter-export-2026-08",
      "asOf": "2026-09-01T00:00:00Z"
    },
    {
      "kind": "utility-statement",
      "value": "412.5",
      "source": "https://utility-co.example/statements/2026-08",
      "asOf": "2026-09-03T00:00:00Z"
    }
  ],
  "price": {
    "amount": "0.11",
    "commodity": "USD",
    "perUnit": true
  },
  "settlement": {
    "status": "settled",
    "mismatch": null,
    "settledAt": "2026-09-03T00:00:00Z"
  }
}
~~~

### two witnesses of different kinds disagreeing beyond tolerance is a declared mismatch

Input:

~~~json
{
  "record": {
    "kind": "energy-exchange",
    "period": {
      "start": "2026-08-01T00:00:00Z",
      "end": "2026-08-31T23:59:59Z"
    },
    "commodity": "KWH",
    "quantity": "398.0",
    "from": {
      "id": "urn:example:household-b",
      "role": "producer"
    },
    "to": {
      "id": "urn:example:utility-co",
      "role": "grid"
    },
    "place": {
      "lat": 46.7296,
      "lon": -94.6859,
      "utilityId": "urn:example:utility-co"
    },
    "witnesses": [
      {
        "kind": "meter",
        "value": "398.0",
        "source": "urn:example:household-b-inverter-export-2026-08",
        "asOf": "2026-09-01T00:00:00Z"
      },
      {
        "kind": "utility-statement",
        "value": "371.2",
        "source": "https://utility-co.example/statements/2026-08-household-b",
        "asOf": "2026-09-03T00:00:00Z"
      }
    ]
  }
}
~~~

Output:

~~~json
{
  "id": "ni:///sha-256;gz8u7e88tr7_hNiadFM0bw6aRlyH4DFIoMxHF_UQ8uQ",
  "kind": "energy-exchange",
  "period": {
    "start": "2026-08-01T00:00:00Z",
    "end": "2026-08-31T23:59:59Z"
  },
  "commodity": "KWH",
  "quantity": "398.0",
  "from": {
    "id": "urn:example:household-b",
    "role": "producer"
  },
  "to": {
    "id": "urn:example:utility-co",
    "role": "grid"
  },
  "place": {
    "lat": 46.7296,
    "lon": -94.6859,
    "utilityId": "urn:example:utility-co"
  },
  "witnesses": [
    {
      "kind": "meter",
      "value": "398.0",
      "source": "urn:example:household-b-inverter-export-2026-08",
      "asOf": "2026-09-01T00:00:00Z"
    },
    {
      "kind": "utility-statement",
      "value": "371.2",
      "source": "https://utility-co.example/statements/2026-08-household-b",
      "asOf": "2026-09-03T00:00:00Z"
    }
  ],
  "settlement": {
    "status": "mismatch",
    "mismatch": "26.8",
    "settledAt": null
  }
}
~~~

### two witnesses of the same kind leave the record posted

Input:

~~~json
{
  "record": {
    "kind": "energy-exchange",
    "period": {
      "start": "2026-08-01T00:00:00Z",
      "end": "2026-08-31T23:59:59Z"
    },
    "commodity": "PROPANE_GAL",
    "quantity": "150",
    "from": {
      "id": "did:example:propane-co",
      "role": "producer"
    },
    "to": {
      "id": "urn:example:household-c",
      "role": "consumer"
    },
    "place": {
      "lat": 47.455,
      "lon": -95.5822
    },
    "witnesses": [
      {
        "kind": "bank-row",
        "value": "150",
        "source": "urn:example:household-c-bank-statement-2026-08",
        "asOf": "2026-08-15T00:00:00Z"
      },
      {
        "kind": "bank-row",
        "value": "150",
        "source": "urn:example:household-c-bank-statement-2026-08-corrected",
        "asOf": "2026-08-20T00:00:00Z"
      }
    ],
    "price": {
      "amount": "2.79",
      "commodity": "USD",
      "perUnit": true
    }
  }
}
~~~

Output:

~~~json
{
  "id": "ni:///sha-256;D-eG2-lgLhOhlncUb8vOXNtsPf0aLH6A-Qws8CTLdcE",
  "kind": "energy-exchange",
  "period": {
    "start": "2026-08-01T00:00:00Z",
    "end": "2026-08-31T23:59:59Z"
  },
  "commodity": "PROPANE_GAL",
  "quantity": "150",
  "from": {
    "id": "did:example:propane-co",
    "role": "producer"
  },
  "to": {
    "id": "urn:example:household-c",
    "role": "consumer"
  },
  "place": {
    "lat": 47.455,
    "lon": -95.5822
  },
  "witnesses": [
    {
      "kind": "bank-row",
      "value": "150",
      "source": "urn:example:household-c-bank-statement-2026-08",
      "asOf": "2026-08-15T00:00:00Z"
    },
    {
      "kind": "bank-row",
      "value": "150",
      "source": "urn:example:household-c-bank-statement-2026-08-corrected",
      "asOf": "2026-08-20T00:00:00Z"
    }
  ],
  "price": {
    "amount": "2.79",
    "commodity": "USD",
    "perUnit": true
  },
  "settlement": {
    "status": "posted",
    "mismatch": null,
    "settledAt": null
  }
}
~~~
