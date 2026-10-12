# @red-cup-engineering/read-ledger-report-service

Reads one Farolfi accounting report from a Beancount or hledger journal, given either an
on-disk journal path or inline journal text. Composes `@red-cup-engineering/farolfi`'s
`dispatch` (for every report) and `detectJournalFormat` (for inline text), and
`@red-cup-engineering/file-services`/`node:fs/promises` for every
filesystem access this operation itself performs; it contains no balance, settlement, or
report-rendering logic of its own.

## Operation

~~~js
export async function readLedgerReport(input)
~~~

### Parameters

- input ({ journal: ({ path: string } | { text: string, format?: ("beancount"|"hledger") }), report: ("balance"|"balance-sheet"|"income-statement"|"cashflow"|"register"|"accounts"|"stats"|"lots"|"valuation"|"reconcile"|"check"), begin?: string, end?: string, account?: string, depth?: number, status?: string, payee?: string, requireMeta?: string, reportingCommodity?: string, now?: string }): `reportingCommodity` selects the "valuation" report's target commodity (default "USD"), using the journal's own price directives to convert each position; every other report ignores it.

### Returns

Promise<object>: Farolfi's `-o json` report shape for `input.report`, merged with `{ kind: "ledger-report", report, journal, generatedAt }`; `generatedAt` is `input.now` when given (for reproducible fabrication examples and tests), else the real current time.

### Refusals

- TypeError: When `input.report` is not one of the eleven supported reports, or `input.journal` names neither `path` nor `text`.

## Command

read-ledger-report reads one JSON value per input line and writes one JSON value per output line.

## Examples

### reads a stats report from inline text with a pinned generatedAt

Input:

~~~json
{
  "journal": {
    "text": "option \"title\" \"Test Ledger\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Assets:Cash:Reserve USD\n2026-01-01 open Equity:Opening-Balances\n2026-01-01 open Income:Consulting\n2026-01-01 open Expenses:Software\n\n2026-01-01 * \"Opening balance\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n\n2026-01-05 * \"Client payment\" \"Acme Corp\"\n  Assets:Cash:Operating  500.00 USD\n  Income:Consulting  -500.00 USD\n\n2026-01-10 * \"Software subscription\"\n  Assets:Cash:Operating  -20.00 USD\n  Expenses:Software  20.00 USD\n\n2026-01-15 balance Assets:Cash:Operating  1480.00 USD\n\n2026-01-20 balance Assets:Cash:Reserve  50.00 USD\n"
  },
  "report": "stats",
  "now": "2026-09-05T00:00:00.000Z"
}
~~~

Output:

~~~json
{
  "transactions": 3,
  "postings": 6,
  "accounts": 5,
  "commodities": 1,
  "directives": 9,
  "span": "2026-01-01 … 2026-01-10",
  "malformed": 0,
  "held": 1,
  "synthesized": 0,
  "kind": "ledger-report",
  "report": "stats",
  "journal": {
    "text": true,
    "format": "beancount"
  },
  "generatedAt": "2026-09-05T00:00:00.000Z"
}
~~~

### values a mixed KWH/USD journal in KWH using reportingCommodity

Input:

~~~json
{
  "journal": {
    "text": "2026-01-01 open Assets:Solar:PVBank KWH\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Equity:Opening-Balances\n\n2026-01-01 * \"Opening PV bank\"\n  Assets:Solar:PVBank  100 KWH\n  Equity:Opening-Balances  -100 KWH\n\n2026-01-01 * \"Opening cash\"\n  Assets:Cash:Operating  20 USD\n  Equity:Opening-Balances  -20 USD\n\n2026-01-15 price KWH 0.20 USD\n2026-01-15 price USD 5 KWH\n"
  },
  "report": "valuation",
  "reportingCommodity": "KWH",
  "now": "2026-09-06T00:00:00.000Z"
}
~~~

Output:

~~~json
{
  "rows": [
    {
      "account": "Assets:Cash:Operating",
      "units": {
        "kind": "exactNumber.gradedRational",
        "value": { "kind": "exactNumber.rational", "num": "20", "den": "1" },
        "grade": "USD"
      },
      "lot": null,
      "bookValue": null,
      "marketPrice": {
        "kind": "exactNumber.gradedRational",
        "value": { "kind": "exactNumber.rational", "num": "5", "den": "1" },
        "grade": "KWH"
      },
      "marketValue": {
        "kind": "exactNumber.gradedRational",
        "value": { "kind": "exactNumber.rational", "num": "100", "den": "1" },
        "grade": "KWH"
      },
      "unrealized": null,
      "priceDate": "2026-01-15"
    },
    {
      "account": "Assets:Solar:PVBank",
      "units": {
        "kind": "exactNumber.gradedRational",
        "value": { "kind": "exactNumber.rational", "num": "100", "den": "1" },
        "grade": "KWH"
      },
      "lot": null,
      "bookValue": null,
      "marketPrice": {
        "kind": "exactNumber.gradedRational",
        "value": { "kind": "exactNumber.rational", "num": "1", "den": "1" },
        "grade": "KWH"
      },
      "marketValue": {
        "kind": "exactNumber.gradedRational",
        "value": { "kind": "exactNumber.rational", "num": "100", "den": "1" },
        "grade": "KWH"
      },
      "unrealized": null,
      "priceDate": null
    }
  ],
  "end": null,
  "reportingCommodity": "KWH",
  "kind": "ledger-report",
  "report": "valuation",
  "journal": {
    "text": true,
    "format": "beancount"
  },
  "generatedAt": "2026-09-06T00:00:00.000Z"
}
~~~
