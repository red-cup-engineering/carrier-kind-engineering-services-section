import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveValueChainShares } from "../scripts/derive-value-chain-shares.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "five-position cocaine farm-to-street ladder, Medellín and Cali case, low ends of every stated range",
    "input": {
      "type": "PriceLadder",
      "version": 1,
      "positions": [
        {
          "name": "coca paste",
          "prices": [
            {
              "unitPrice": "900",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
                "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"
              }
            }
          ]
        },
        {
          "name": "Colombian export",
          "prices": [
            {
              "unitPrice": "1654",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/",
                "sourceTitle": "Colombia: average price of cocaine 2021, Statista",
                "rangeNote": "range $1,654-2,000 per kilogram; low end used"
              }
            }
          ]
        },
        {
          "name": "transit",
          "prices": [
            {
              "unitPrice": "10000",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
                "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance",
                "rangeNote": "range $10,000-20,000 per kilogram; low end used"
              }
            }
          ]
        },
        {
          "name": "United States wholesale",
          "prices": [
            {
              "unitPrice": "70000",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
                "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance",
                "rangeNote": "range $70,000-80,000 per kilogram; low end used"
              }
            }
          ]
        },
        {
          "name": "street-cut equivalent",
          "prices": [
            {
              "unitPrice": "150000",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
                "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"
              }
            }
          ]
        }
      ]
    },
    "output": {
      "type": "ValueChainShareSet",
      "version": 1,
      "positionCount": 5,
      "retailPositionName": "street-cut equivalent",
      "retailUnitPrice": "150000",
      "retailUnit": "USD per kilogram",
      "positions": [
        {
          "name": "coca paste",
          "contested": false,
          "prices": [
            {
              "unitPrice": "900",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "3",
                "denominator": "500"
              },
              "multiplierFromPrevious": null,
              "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"
            }
          ]
        },
        {
          "name": "Colombian export",
          "contested": false,
          "prices": [
            {
              "unitPrice": "1654",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "827",
                "denominator": "75000"
              },
              "multiplierFromPrevious": {
                "numerator": "827",
                "denominator": "450"
              },
              "evidenceLabel": "Colombia: average price of cocaine 2021, Statista (https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/); range $1,654-2,000 per kilogram; low end used"
            }
          ]
        },
        {
          "name": "transit",
          "contested": false,
          "prices": [
            {
              "unitPrice": "10000",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "1",
                "denominator": "15"
              },
              "multiplierFromPrevious": {
                "numerator": "5000",
                "denominator": "827"
              },
              "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); range $10,000-20,000 per kilogram; low end used"
            }
          ]
        },
        {
          "name": "United States wholesale",
          "contested": false,
          "prices": [
            {
              "unitPrice": "70000",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "7",
                "denominator": "15"
              },
              "multiplierFromPrevious": {
                "numerator": "7",
                "denominator": "1"
              },
              "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); range $70,000-80,000 per kilogram; low end used"
            }
          ]
        },
        {
          "name": "street-cut equivalent",
          "contested": false,
          "prices": [
            {
              "unitPrice": "150000",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "1",
                "denominator": "1"
              },
              "multiplierFromPrevious": {
                "numerator": "15",
                "denominator": "7"
              },
              "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"
            }
          ]
        }
      ]
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "three-position ladder with the Colombian export position contested between the Statista and Yahoo Finance figures",
    "input": {
      "type": "PriceLadder",
      "version": 1,
      "positions": [
        {
          "name": "coca paste",
          "prices": [
            {
              "unitPrice": "900",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
                "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"
              }
            }
          ]
        },
        {
          "name": "Colombian export",
          "prices": [
            {
              "unitPrice": "1654",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/",
                "sourceTitle": "Colombia: average price of cocaine 2021, Statista",
                "rangeNote": "range $1,654-2,000 per kilogram; low end used"
              }
            },
            {
              "unitPrice": "10000",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
                "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance",
                "rangeNote": "range $10,000-20,000 per kilogram; low end used; contested against the Statista export figure for the same chain position"
              }
            }
          ]
        },
        {
          "name": "United States wholesale",
          "prices": [
            {
              "unitPrice": "70000",
              "unit": "USD per kilogram",
              "source": {
                "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
                "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance",
                "rangeNote": "range $70,000-80,000 per kilogram; low end used"
              }
            }
          ]
        }
      ]
    },
    "output": {
      "type": "ValueChainShareSet",
      "version": 1,
      "positionCount": 3,
      "retailPositionName": "United States wholesale",
      "retailUnitPrice": "70000",
      "retailUnit": "USD per kilogram",
      "positions": [
        {
          "name": "coca paste",
          "contested": false,
          "prices": [
            {
              "unitPrice": "900",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "9",
                "denominator": "700"
              },
              "multiplierFromPrevious": null,
              "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"
            }
          ]
        },
        {
          "name": "Colombian export",
          "contested": true,
          "prices": [
            {
              "unitPrice": "1654",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "827",
                "denominator": "35000"
              },
              "multiplierFromPrevious": {
                "numerator": "827",
                "denominator": "450"
              },
              "evidenceLabel": "Colombia: average price of cocaine 2021, Statista (https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/); range $1,654-2,000 per kilogram; low end used"
            },
            {
              "unitPrice": "10000",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "1",
                "denominator": "7"
              },
              "multiplierFromPrevious": {
                "numerator": "100",
                "denominator": "9"
              },
              "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); range $10,000-20,000 per kilogram; low end used; contested against the Statista export figure for the same chain position"
            }
          ]
        },
        {
          "name": "United States wholesale",
          "contested": false,
          "prices": [
            {
              "unitPrice": "70000",
              "unit": "USD per kilogram",
              "share": {
                "numerator": "1",
                "denominator": "1"
              },
              "multiplierFromPrevious": {
                "numerator": "35000",
                "denominator": "827"
              },
              "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); range $70,000-80,000 per kilogram; low end used"
            }
          ]
        }
      ]
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveValueChainShares(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-value-chain-shares.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
