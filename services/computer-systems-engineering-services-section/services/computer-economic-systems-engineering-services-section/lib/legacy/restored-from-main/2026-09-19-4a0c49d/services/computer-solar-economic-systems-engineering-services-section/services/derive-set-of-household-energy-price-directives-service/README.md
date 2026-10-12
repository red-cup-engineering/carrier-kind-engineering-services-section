# @red-cup-engineering/derive-set-of-household-energy-price-directives-service

Derives Beancount `KWH`/`PROPANE_GAL`/`DIESEL_GAL` price directives for one household from its own `energy-tariff` record and weekly fuel series, composing `@red-cup-engineering/derive-set-of-energy-price-directives-service` for all pricing and rendering.

## Operation

~~~js
export function deriveSetOfHouseholdEnergyPriceDirectives(request)
~~~

### Parameters

- request ({ date: string, household: { energyTariff: { usdPerKwhTiers: readonly { usdPerKwh: string }[], sourceUrl: string, asOf: string } }, propane: { sourceKind: "fetched-csv"|"fixture", sourceUrl?: string, seriesText: string }, diesel: { sourceKind: "fetched-csv"|"fixture", sourceUrl?: string, seriesText: string } }): A record with the reporting date, the household's own `energy-tariff` record, and each weekly series' already-obtained CSV text.

### Returns

object: The composed operation's own `EnergyPriceDirectiveSet`, unchanged.

### Refusals

- TypeError: When `request.household.energyTariff` is absent, or lacks a `usdPerKwhTiers[0].usdPerKwh`, `sourceUrl`, or `asOf`.

## Command

derive-set-of-household-energy-price-directives reads one JSON value per input line and writes one JSON value per output line.

## Examples

### derives KWH from the household's tariff and PROPANE_GAL/DIESEL_GAL from the weekly series

Input:

~~~json
{
  "date": "2026-09-05",
  "household": {
    "energyTariff": {
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
