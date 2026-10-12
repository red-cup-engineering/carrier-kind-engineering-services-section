# @red-cup-engineering/derive-joules-per-settled-row-service

Prices each settled row in the joules the house spent to settle it, over a declared
boundary, folding already-derived resource receipts by interval overlap.

## Operation

~~~js
export function deriveJoulesPerSettledRow(request)
~~~

### Parameters

- request (object): A record with settledRows ({rowId, intervalStart, intervalEnd}[]), resourceReceipts (ResourceConsumedReceipt[]), conversionFactors ({cpuSecondsToJoules?, byteToJoules?}, each a DeclaredFactor {value, sourceUrl, asOf}), and boundary (("hosts"|"inference"|"signer")[]).

### Returns

object: {receipts: SettledRowEnergyReceipt[], unmatchedRowIds: string[]}, or a no-conversion-factor-for-asset refusal datum.

### Refusals

- TypeError: When settledRows, resourceReceipts, conversionFactors, or boundary is malformed.

## Command

derive-joules-per-settled-row reads one JSON value per input line and writes one JSON value per output line.

## Examples

### prices a matched row from a declared cpu-seconds factor

Input:

~~~json
{
  "settledRows": [
    {
      "rowId": "row-1",
      "intervalStart": "2026-09-05T00:00:00.000Z",
      "intervalEnd": "2026-09-05T00:05:00.000Z"
    }
  ],
  "resourceReceipts": [
    {
      "type": "bare-cedar-fog.resource-metering/unit-resource-consumed",
      "version": 1,
      "host": "bare-cedar-fog",
      "unit": "example.service",
      "provider": "bare-cedar-fog",
      "actor": "example.service",
      "intervalStart": "2026-09-05T00:00:00.000Z",
      "intervalEnd": "2026-09-05T00:05:00.000Z",
      "derivedFrom": {},
      "price": {
        "denomination": {
          "kind": "resource",
          "asset": "cpu-seconds",
          "unit": "second"
        },
        "amount": {
          "numerator": "2000000000",
          "denominator": "1000000000"
        }
      }
    }
  ],
  "conversionFactors": {
    "cpuSecondsToJoules": {
      "value": "65",
      "sourceUrl": "https://example.org/tdp-note",
      "asOf": "2026-09-01"
    },
    "byteToJoules": {
      "value": "0.0000001",
      "sourceUrl": "https://example.org/network-energy-note",
      "asOf": "2026-09-01"
    }
  },
  "boundary": [
    "hosts"
  ]
}
~~~

Output:

~~~json
{
  "receipts": [
    {
      "type": "SettledRowEnergyReceipt",
      "version": 1,
      "rowId": "row-1",
      "joules": "130",
      "boundary": [
        "hosts"
      ],
      "conversionFactors": {
        "cpuSecondsToJoules": {
          "value": "65",
          "sourceUrl": "https://example.org/tdp-note",
          "asOf": "2026-09-01"
        },
        "byteToJoules": {
          "value": "0.0000001",
          "sourceUrl": "https://example.org/network-energy-note",
          "asOf": "2026-09-01"
        }
      },
      "sourceReceipts": [
        {
          "type": "bare-cedar-fog.resource-metering/unit-resource-consumed",
          "version": 1,
          "host": "bare-cedar-fog",
          "unit": "example.service",
          "provider": "bare-cedar-fog",
          "actor": "example.service",
          "intervalStart": "2026-09-05T00:00:00.000Z",
          "intervalEnd": "2026-09-05T00:05:00.000Z",
          "derivedFrom": {},
          "price": {
            "denomination": {
              "kind": "resource",
              "asset": "cpu-seconds",
              "unit": "second"
            },
            "amount": {
              "numerator": "2000000000",
              "denominator": "1000000000"
            }
          }
        }
      ]
    }
  ],
  "unmatchedRowIds": []
}
~~~

### refuses as data on an asset with no declared conversion factor

Input:

~~~json
{
  "settledRows": [
    {
      "rowId": "row-3",
      "intervalStart": "2026-09-05T00:00:00.000Z",
      "intervalEnd": "2026-09-05T00:05:00.000Z"
    }
  ],
  "resourceReceipts": [
    {
      "type": "bare-cedar-fog.resource-metering/unit-resource-consumed",
      "version": 1,
      "host": "bare-cedar-fog",
      "unit": "example.service",
      "provider": "bare-cedar-fog",
      "actor": "example.service",
      "intervalStart": "2026-09-05T00:00:00.000Z",
      "intervalEnd": "2026-09-05T00:05:00.000Z",
      "derivedFrom": {},
      "price": {
        "denomination": {
          "kind": "resource",
          "asset": "memory-peak-bytes",
          "unit": "byte"
        },
        "amount": {
          "numerator": "500",
          "denominator": "1"
        }
      }
    }
  ],
  "conversionFactors": {
    "cpuSecondsToJoules": {
      "value": "65",
      "sourceUrl": "https://example.org/tdp-note",
      "asOf": "2026-09-01"
    },
    "byteToJoules": {
      "value": "0.0000001",
      "sourceUrl": "https://example.org/network-energy-note",
      "asOf": "2026-09-01"
    }
  },
  "boundary": [
    "hosts"
  ]
}
~~~

Output:

~~~json
{
  "refused": true,
  "reason": "no-conversion-factor-for-asset",
  "asset": "memory-peak-bytes"
}
~~~
