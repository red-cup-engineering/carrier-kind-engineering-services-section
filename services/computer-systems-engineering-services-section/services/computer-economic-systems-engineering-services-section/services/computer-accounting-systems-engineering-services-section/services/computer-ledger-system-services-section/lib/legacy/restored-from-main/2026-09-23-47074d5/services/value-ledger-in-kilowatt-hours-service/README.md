# @red-cup-engineering/value-ledger-in-kilowatt-hours-service

Reads a Beancount or hledger journal's valuation report at a cutoff date, in USD and, where
the composed service reports in kilowatt-hours, in kilowatt-hours.

## Operation

~~~js
export async function valueLedgerInKilowattHours(request)
~~~

### Parameters

- request (object): A record with journal ({path} or {text, format?}), asOf, and optional now (ISO timestamp, for reproducible fabrication examples and tests).

### Returns

Promise<object>: A KilowattHourValuation record, or a commodity-unpriced refusal datum.

### Refusals

- TypeError: When journal or asOf is malformed.

## Command

value-ledger-in-kilowatt-hours reads one JSON value per input line and writes one JSON value per output line.

## Examples

### fully priced journal values in USD with no unpriced commodities

Input:

~~~json
{
  "journal": {
    "text": "option \"title\" \"Test\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Equity:Opening-Balances\n\n2026-01-01 * \"Opening\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n"
  },
  "asOf": "2026-09-05",
  "now": "2026-09-05T00:00:00.000Z"
}
~~~

Output:

~~~json
{
  "type": "KilowattHourValuation",
  "version": 1,
  "generatedAt": "2026-09-05T00:00:00.000Z",
  "usdValuation": {
    "rows": [
      {
        "account": "Assets:Cash:Operating",
        "units": {
          "kind": "exactNumber.gradedRational",
          "value": {
            "kind": "exactNumber.rational",
            "num": "1000",
            "den": "1"
          },
          "grade": "USD"
        },
        "lot": null,
        "bookValue": null,
        "marketPrice": {
          "kind": "exactNumber.gradedRational",
          "value": {
            "kind": "exactNumber.rational",
            "num": "1",
            "den": "1"
          },
          "grade": "USD"
        },
        "marketValue": {
          "kind": "exactNumber.gradedRational",
          "value": {
            "kind": "exactNumber.rational",
            "num": "1000",
            "den": "1"
          },
          "grade": "USD"
        },
        "unrealized": null,
        "priceDate": null
      }
    ],
    "end": "2026-09-05",
    "reportingCommodity": "USD",
    "kind": "ledger-report",
    "report": "valuation",
    "journal": {
      "text": true,
      "format": "beancount"
    },
    "generatedAt": "2026-09-05T00:00:00.000Z"
  },
  "kwhValuation": null,
  "unpricedCommodities": []
}
~~~
