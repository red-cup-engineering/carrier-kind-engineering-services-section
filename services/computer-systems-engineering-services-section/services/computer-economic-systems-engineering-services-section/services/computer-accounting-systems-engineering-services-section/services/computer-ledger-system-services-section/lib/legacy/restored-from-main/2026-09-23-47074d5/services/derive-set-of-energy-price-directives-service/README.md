# @red-cup-engineering/derive-set-of-energy-price-directives-service

Derives Beancount `price` directives, forward and inverse, for `KWH` (from a declared electricity tariff), `PROPANE_GAL`, and `DIESEL_GAL` (each from a weekly price series' latest row at or before `input.date`), so the main ledger can be valued in USD or in the named energy commodity; a weekly series with no row at or before `input.date` leaves that commodity unpriced rather than fabricating a price.

## Operation

~~~js
export function deriveSetOfEnergyPriceDirectives(input)
~~~

### Parameters

- input ({ date: string, electricity: { usdPerKwh: string, sourceUrl: string, asOf: string }, propane: { sourceKind: "fetched-csv"|"fixture", sourceUrl?: string, seriesText: string }, diesel: { sourceKind: "fetched-csv"|"fixture", sourceUrl?: string, seriesText: string } }): A record with the reporting date, the declared electricity tariff, and each weekly series' already-obtained CSV text.

### Returns

EnergyPriceDirectiveSet: The priced and unpriced commodities, each with its rendered forward and inverse Beancount price directive.

### Refusals

- TypeError: When `input` or one of its declared sources is malformed.

## Command

derive-set-of-energy-price-directives reads one JSON value per input line and writes one JSON value per output line.

## Examples

### derive-set-of-energy-price-directives example

Input:

~~~json
{
  "date": "2026-09-05",
  "electricity": {
    "usdPerKwh": "0.1423",
    "sourceUrl": "https://www.example-coop.coop/rates",
    "asOf": "2026-07-01"
  },
  "propane": {
    "sourceKind": "fixture",
    "seriesText": "Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,1.234\n09/01/2026,1.245\n"
  },
  "diesel": {
    "sourceKind": "fetched-csv",
    "sourceUrl": "https://www.eia.gov/petroleum/gasdiesel/",
    "seriesText": "Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-31,3.512\n"
  }
}
~~~

Output:

~~~json
{
  "type": "EnergyPriceDirectiveSet",
  "version": 1,
  "date": "2026-09-05",
  "directiveCount": 6,
  "priced": [
    {
      "commodity": "KWH",
      "usdPrice": "0.1423",
      "inversePrice": "7.0274068868",
      "sourceKind": "declared",
      "sourceUrl": "https://www.example-coop.coop/rates",
      "observedDate": "2026-07-01",
      "directive": "2026-09-05 price KWH 0.1423 USD\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"",
      "inverseDirective": "2026-09-05 price USD 7.0274068868 KWH\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"\n  inverse_of: \"KWH\""
    },
    {
      "commodity": "PROPANE_GAL",
      "usdPrice": "1.245",
      "inversePrice": "0.8032128514",
      "sourceKind": "fixture",
      "sourceUrl": null,
      "observedDate": "2026-09-01",
      "directive": "2026-09-05 price PROPANE_GAL 1.245 USD\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"",
      "inverseDirective": "2026-09-05 price USD 0.8032128514 PROPANE_GAL\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"\n  inverse_of: \"PROPANE_GAL\""
    },
    {
      "commodity": "DIESEL_GAL",
      "usdPrice": "3.512",
      "inversePrice": "0.284738041",
      "sourceKind": "fetched-csv",
      "sourceUrl": "https://www.eia.gov/petroleum/gasdiesel/",
      "observedDate": "2026-08-31",
      "directive": "2026-09-05 price DIESEL_GAL 3.512 USD\n  source_kind: \"fetched-csv\"\n  source_url: \"https://www.eia.gov/petroleum/gasdiesel/\"\n  observed_date: \"2026-08-31\"",
      "inverseDirective": "2026-09-05 price USD 0.284738041 DIESEL_GAL\n  source_kind: \"fetched-csv\"\n  source_url: \"https://www.eia.gov/petroleum/gasdiesel/\"\n  observed_date: \"2026-08-31\"\n  inverse_of: \"DIESEL_GAL\""
    }
  ],
  "unpriced": []
}
~~~
