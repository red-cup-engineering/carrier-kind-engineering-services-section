# @red-cup-engineering/import-utility-statement-service

Imports one utility statement's rows into `HouseholdEnergyRecord` rows, reconciling `kwhUsed`
against a meter or bank row and holding any mismatch open, and refusing rather than dropping a
row this section's declared `parserConfig` cannot resolve or foot.

## Operation

~~~js
export function importUtilityStatement(request)
~~~

### Parameters

- request ({ statementText: string, format: "csv"|"text", parserConfig: { utility: string, columnMap: { householdId: string|number, periodStart: string|number, periodEnd: string|number, kwhUsed: string|number, kwhGenerated?: string|number, lineItems?: readonly (string|number)[], totalCharge?: string|number }, dateFormat: "YYYY-MM-DD"|"MM/DD/YYYY", sourceUrl: string }, tariff: object, meterReadings?: readonly { date: string, kwh: string }[], bankRows?: readonly { date: string, amount: string }[] }): 

### Returns

readonly (object|{refused: true, reason: "unparseable-row"|"statement-does-not-foot", rowText: string})[]: One `HouseholdEnergyRecord` or refusal datum per data row, in row order.

### Refusals

- TypeError: When `request` is malformed, or `parserConfig.columnMap` names a header column the statement does not have (`format:"csv"` only).

## Command

import-utility-statement reads one JSON value per input line and writes one JSON value per output line.

## Examples

### imports a CSV row with a held-open meter mismatch

Input:

~~~json
{
  "statementText": "Account,From,To,kWh Used,kWh Generated\n12345,2026-08-01,2026-08-31,450.00,120.00\n",
  "format": "csv",
  "parserConfig": {
    "utility": "Example Coop",
    "columnMap": {
      "householdId": "Account",
      "periodStart": "From",
      "periodEnd": "To",
      "kwhUsed": "kWh Used",
      "kwhGenerated": "kWh Generated"
    },
    "dateFormat": "YYYY-MM-DD",
    "sourceUrl": "https://www.example-coop.coop/statement"
  },
  "tariff": {
    "utility": "Example Coop",
    "rateScheduleName": "Residential",
    "usdPerKwhTiers": [
      {
        "usdPerKwh": "0.1423"
      }
    ],
    "sourceUrl": "https://www.example-coop.coop/rates",
    "asOf": "2026-07-01"
  },
  "meterReadings": [
    {
      "date": "2026-08-31",
      "kwh": "448.50"
    }
  ]
}
~~~

Output:

~~~json
[
  {
    "type": "HouseholdEnergyRecord",
    "version": 1,
    "householdId": "12345",
    "periodStart": "2026-08-01",
    "periodEnd": "2026-08-31",
    "kwhUsed": {
      "statementValue": "450.00",
      "meterOrBankValue": "448.50",
      "mismatch": true,
      "mismatchAmount": "1.5"
    },
    "kwhGenerated": {
      "statementValue": "120.00",
      "meterOrBankValue": null,
      "mismatch": null,
      "mismatchAmount": null
    },
    "tariff": {
      "utility": "Example Coop",
      "rateScheduleName": "Residential",
      "usdPerKwhTiers": [
        {
          "usdPerKwh": "0.1423"
        }
      ],
      "sourceUrl": "https://www.example-coop.coop/rates",
      "asOf": "2026-07-01"
    }
  }
]
~~~
