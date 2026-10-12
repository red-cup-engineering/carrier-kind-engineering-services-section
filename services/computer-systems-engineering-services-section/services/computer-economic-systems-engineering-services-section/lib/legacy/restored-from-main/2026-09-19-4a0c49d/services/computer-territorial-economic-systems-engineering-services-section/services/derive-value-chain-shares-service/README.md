# @red-cup-engineering/derive-value-chain-shares-service

Derives each position's exact share of the retail price and the exact multiplier between
adjacent positions along a farm-to-retail price ladder, carrying the evidence label of every
priced input row; when a position carries two contested unit prices, both are computed and
both are returned under that position. Pure, no I/O, no clock; every ratio is an exact
reduced BigInt fraction, never a floating-point approximation.

## Operation

~~~js
export function deriveValueChainShares(input)
~~~

### Parameters

- input ({ type: "PriceLadder", version: 1, positions: readonly { name: string, prices: readonly
 *   { unitPrice: string, unit: string, source: { sourceUrl: string, sourceTitle: string,
 *   rangeNote?: string } }[] }[] }): The named positions from producer to retail, each carrying one or two (contested) unit prices with their unit and citing source row; the final position is the retail anchor and must carry exactly one unit price.

### Returns

{ type: "ValueChainShareSet", version: 1, positionCount: number,
 *   retailPositionName: string, retailUnitPrice: string, retailUnit: string, positions:
 *   readonly { name: string, contested: boolean, prices: readonly { unitPrice: string,
 *   unit: string, share: { numerator: string, denominator: string }, multiplierFromPrevious:
 *   ({ numerator: string, denominator: string } | null), evidenceLabel: string }[] }[] }: The producer's position first, the retail position last; each priced entry's exact share of the retail unit price, its exact multiplier against the previous position's primary (first-listed) unit price (null for the first position), and its evidence label.

### Refusals

- TypeError: When `input` is not a `PriceLadder`, a position or price entry is malformed, or a unit price is not a decimal string.
- RangeError: When fewer than two positions are given, any position carries more than two unit prices, the retail (final) position carries more than one unit price, or a unit price is zero or negative.

## Command

derive-value-chain-shares reads one JSON value per input line and writes one JSON value per output line.

## Examples

### five-position cocaine farm-to-street ladder, Medellín and Cali case, low ends of every stated range

Input:

~~~json
{
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
}
~~~

Output:

~~~json
{
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
~~~

### three-position ladder with the Colombian export position contested between the Statista and Yahoo Finance figures

Input:

~~~json
{
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
}
~~~

Output:

~~~json
{
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
~~~
