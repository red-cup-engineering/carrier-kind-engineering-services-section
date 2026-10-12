# @red-cup-engineering/project-set-of-resource-rows-from-measurement-service

Projects one resource row per catalog-named resource (currency, credit,
commodity, or scarce input) from the two measurement records, per the
resource-row schema. The request's catalog names which resources exist
for the economy under study, their static kind/rail/unit facts, the
declarative rule that finds each resource's evidence inside a
measurement row, and which measurement-row field names carry the
product/text/source/observed/disclosure/identity/arena facts -- so the
same operation reads any economy's differently shaped measurement rows,
instead of one economy's resource list being hardwired into the
operation. Every field the measurement does not evidence is written
"unknown" rather than guessed; a resource earns "measured" only when
two distinct products witness it, per Cistern's two-witness discipline.

## Operation

~~~js
export function projectSetOfResourceRowsFromMeasurement(request)
~~~

### Parameters

- request ({broadSurfaceMeasurement: object, providerAndIncumbentMeasurement: object, catalog: {economy: string, fieldMapping: object, resources: object[]}}): The two measurement records and the resource catalog naming this economy's resources and field mapping, per resource-catalog.schema.json.

### Returns

{type: "ResourceRowProjection", rows: object[]}: One row per catalog resource, in catalog order.

### Refusals

- TypeError: When either measurement record is missing a rows array, or request.catalog is missing its resources array or fieldMapping object.

## Command

project-set-of-resource-rows-from-measurement reads one JSON value per input line and writes one JSON value per output line.

## Examples

### project-set-of-resource-rows-from-measurement example

Input:

~~~json
{
  "broadSurfaceMeasurement": {
    "rows": []
  },
  "providerAndIncumbentMeasurement": {
    "rows": []
  },
  "catalog": {
    "economy": "test-economy",
    "fieldMapping": {
      "product": "product",
      "text": [
        "product",
        "capability",
        "normalized_value",
        "exact_source_language",
        "result"
      ],
      "sourceUrl": "source_url",
      "observedAt": "observed_at",
      "disclosureClass": "disclosure_class",
      "requiresIdentity": "requiresIdentity",
      "arena": "arena"
    },
    "resources": [
      {
        "name": "HIVE",
        "kind": "currency",
        "rail": "Hive blockchain",
        "unit": "HIVE",
        "match": {
          "type": "regex",
          "pattern": "\\bHIVE\\b"
        }
      }
    ]
  }
}
~~~

Output:

~~~json
{
  "type": "ResourceRowProjection",
  "rows": [
    {
      "identity": {
        "name": "HIVE",
        "kind": "currency",
        "issuer": "unknown",
        "rail": "Hive blockchain"
      },
      "denomination": {
        "unit": "HIVE",
        "witReading": null,
        "emergyReading": null
      },
      "custody": "unknown",
      "yieldForm": "unknown",
      "laborForm": "unknown",
      "liquidity": {
        "exitPath": "unknown",
        "exitsToRow": null
      },
      "extractionCeiling": {
        "cap": "unknown",
        "resetPeriod": "unknown",
        "antiBotRule": "unknown"
      },
      "identityCost": {
        "kycRequired": "unknown",
        "perHumanSlot": "unknown",
        "detail": "unknown"
      },
      "witnesses": [],
      "provenance": {
        "sourceUrl": "unknown",
        "observedOn": "unknown",
        "evidenceStatus": "unknown"
      }
    }
  ]
}
~~~
