# @red-cup-engineering/observe-set-of-energy-prices-service

Observes one dated, place-by-place series of the price of delivered energy: a `KWH` row per
place from its own declared `energy-tariff` record (or an explicit unpriced reason when none
is declared), and a `PROPANE_GAL` and `DIESEL_GAL` row per place from the EIA's own keyless
weekly retail-price workbooks, fetched once and shared across every place, composing
`@red-cup-engineering/derive-set-of-energy-price-directives-service`'s own
latest-row-at-or-before selection rather than re-deriving it. A commodity with no qualifying
source (no declared tariff, a fetch failure, or a weekly series with no row at or before
`asOf`) is a row with `usdPerUnit: null` and a `reason`, never a fabricated price.

## Operation

~~~js
export async function observeSetOfEnergyPrices(request)
~~~

### Parameters

- request ({places: readonly {place: string, energyTariff?: {utility?: string, rateScheduleName?: string, usdPerKwhTiers: readonly {usdPerKwh: string}[], sourceUrl: string, asOf: string}, kwhMethod?: string, kwhUnpriced?: {reason: string, source?: string, asOf?: string}}[], asOf: string, eia?: {propaneUrl?: string, dieselUrl?: string, propaneFixtureSeriesText?: string, dieselFixtureSeriesText?: string}, fetchImpl?: typeof fetch}): A record naming each place's own tariff or unpriced reason, the reporting date, and optionally the two EIA workbook URLs, already-obtained fixture CSV text standing in for either live read, and an injectable fetch implementation.

### Returns

Promise<EnergyPriceSeries>: The dated place-by-place `KWH`/`PROPANE_GAL`/`DIESEL_GAL` price series.

### Refusals

- TypeError: when `request.places` is not a non-empty array, `request.asOf` is not a `YYYY-MM-DD` date, or one place's `energyTariff`/`kwhUnpriced` declaration is malformed

## Command

observe-set-of-energy-prices reads one JSON value per input line and writes one JSON value per output line.

## Examples

### observe-set-of-energy-prices example (fixture CSV text, no network)

Input:

~~~json
{
  "asOf": "2026-09-05",
  "places": [
    {
      "place": "Minnesota Power",
      "energyTariff": {
        "utility": "Minnesota Power",
        "rateScheduleName": "Residential",
        "usdPerKwhTiers": [
          {
            "usdPerKwh": "0.10772"
          }
        ],
        "sourceUrl": "https://www.mnpower.com/ResidentialRates",
        "asOf": "2026-01-01"
      }
    },
    {
      "place": "LaCreek Electric Association",
      "kwhUnpriced": {
        "reason": "no residential $/kWh rate found on the fetched billing page",
        "source": "https://www.lacreek.com/billing",
        "asOf": "2026-09-05"
      }
    }
  ],
  "eia": {
    "propaneFixtureSeriesText": "Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,2.100\n09/01/2026,2.150\n",
    "dieselFixtureSeriesText": "Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-24,5.454\n2026-08-31,5.599\n"
  }
}
~~~

Output:

~~~json
{
  "type": "EnergyPriceSeries",
  "version": 1,
  "asOf": "2026-09-05",
  "rows": [
    {
      "place": "Minnesota Power",
      "commodity": "KWH",
      "usdPerUnit": "0.10772",
      "unit": "USD/kWh",
      "source": "https://www.mnpower.com/ResidentialRates",
      "asOf": "2026-01-01",
      "method": "declared tariff (Residential)"
    },
    {
      "place": "Minnesota Power",
      "commodity": "PROPANE_GAL",
      "usdPerUnit": "2.150",
      "unit": "USD/gal",
      "source": "https://www.eia.gov/dnav/pet/hist_xls/W_EPLLPA_PRS_R20_DPGw.xls",
      "asOf": "2026-09-01",
      "method": "eia-weekly-series-latest-at-or-before"
    },
    {
      "place": "Minnesota Power",
      "commodity": "DIESEL_GAL",
      "usdPerUnit": "5.599",
      "unit": "USD/gal",
      "source": "https://www.eia.gov/dnav/pet/hist_xls/EMD_EPD2D_PTE_NUS_DPGw.xls",
      "asOf": "2026-08-31",
      "method": "eia-weekly-series-latest-at-or-before"
    },
    {
      "place": "LaCreek Electric Association",
      "commodity": "KWH",
      "usdPerUnit": null,
      "unit": "USD/kWh",
      "source": "https://www.lacreek.com/billing",
      "asOf": "2026-09-05",
      "method": "no-declared-tariff",
      "reason": "no residential $/kWh rate found on the fetched billing page"
    },
    {
      "place": "LaCreek Electric Association",
      "commodity": "PROPANE_GAL",
      "usdPerUnit": "2.150",
      "unit": "USD/gal",
      "source": "https://www.eia.gov/dnav/pet/hist_xls/W_EPLLPA_PRS_R20_DPGw.xls",
      "asOf": "2026-09-01",
      "method": "eia-weekly-series-latest-at-or-before"
    },
    {
      "place": "LaCreek Electric Association",
      "commodity": "DIESEL_GAL",
      "usdPerUnit": "5.599",
      "unit": "USD/gal",
      "source": "https://www.eia.gov/dnav/pet/hist_xls/EMD_EPD2D_PTE_NUS_DPGw.xls",
      "asOf": "2026-08-31",
      "method": "eia-weekly-series-latest-at-or-before"
    }
  ]
}
~~~
