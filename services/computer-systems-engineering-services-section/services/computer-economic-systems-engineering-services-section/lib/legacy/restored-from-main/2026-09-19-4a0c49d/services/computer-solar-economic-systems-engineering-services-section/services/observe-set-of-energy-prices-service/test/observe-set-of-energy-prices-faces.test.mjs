import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { observeSetOfEnergyPrices } from "../scripts/observe-set-of-energy-prices.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "observe-set-of-energy-prices example (fixture CSV text, no network)",
    "input": {
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
    },
    "output": {
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
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await observeSetOfEnergyPrices(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/observe-set-of-energy-prices.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
