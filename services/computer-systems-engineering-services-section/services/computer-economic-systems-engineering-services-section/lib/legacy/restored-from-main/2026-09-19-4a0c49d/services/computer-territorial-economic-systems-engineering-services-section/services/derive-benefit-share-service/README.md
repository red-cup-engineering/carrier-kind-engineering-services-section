# @red-cup-engineering/derive-benefit-share-service

Derives what a benefit-sharing agreement returns to the territory per unit and for the
request's unitsSold, computed by the record's share.kind: royalty and net-sales as the exact
percent of a named base (the request's retailUnitPrice for net-sales; for royalty, the
request's royaltyBase, or "unknown" when the request does not name one), milestone as the
record's stated percent passed through with perUnit null (a milestone payment is not priced
per unit sold), multiple-of-market as the record's multiple applied to the producer's
position's primary unit price from shares, and none as the exact fraction zero with the
reason. Also computes whether the record's floor (if any) is met against the producer's
position price, an overall meetsAgreement boolean, the evidence label of every figure used,
and a notFound list naming every figure the reading could not resolve or represent. Pure, no
I/O, no clock; every amount is an exact reduced BigInt fraction, never a floating-point
approximation.

## Operation

~~~js
export function deriveBenefitShare(input)
~~~

### Parameters

- input ({ type: "DeriveBenefitShareRequest", version: 1,
 *   shares: { type: "ValueChainShareSet", version: 1, positions: readonly { prices: readonly
 *     { unitPrice: string, unit: string, evidenceLabel: string }[] }[] },
 *   record: { type: "561GroupBenefitSharingRecord", share: { kind: "royalty"|"net-sales"|
 *     "milestone"|"multiple-of-market"|"none", value: (string|null) }, floor: ({ amount: string,
 *     unit: string, per: string }|null) },
 *   unitsSold: string,
 *   retailUnitPrice: { unitPrice: string, unit: string, source: { sourceUrl: string,
 *     sourceTitle: string, rangeNote?: string } },
 *   royaltyBase?: { unitPrice: string, unit: string, source: { sourceUrl: string,
 *     sourceTitle: string, rangeNote?: string } },
 *   notFoundInputs?: readonly string[] }): The value-chain reading, the benefit-sharing record, the units sold, the retail unit price (the net-sales base), a royalty record's licensee-named royalty base, and any caller-named figures that do not fit this schema at all (e.g. a flat per-unit premium the record's share.kind cannot represent), passed straight through into the result's notFound.

### Returns

{ type: "BenefitShareReading", version: 1, shareKind: string, shareValue:
 *   (string|null), perUnit: ({ numerator: string, denominator: string }|null), total:
 *   ({ numerator: string, denominator: string }|null), basis: string, floor: ({ amount: string,
 *   unit: string, per: string, producerPositionUnitPrice: string, producerPositionUnit: string,
 *   met: boolean }|null), meetsAgreement: boolean, evidenceLabels: readonly string[], notFound:
 *   readonly string[] }: What the agreement returns per unit and in total, whether its floor is met, whether the reading as a whole meets the agreement, and the evidence trail.

### Refusals

- TypeError: When `input` is not a `DeriveBenefitShareRequest`, `shares` is not a `ValueChainShareSet`, `record` is not a `561GroupBenefitSharingRecord`, or a required decimal string is malformed.
- RangeError: When `shares.positions` carries fewer than two positions, `record.share.kind` is outside its enumeration, or a unit price, share value, floor amount, or unitsSold is zero or negative.

## Command

derive-benefit-share reads one JSON value per input line and writes one JSON value per output line.

## Examples

### the CSIR/South African San Council Hoodia benefit-sharing agreement's 6 percent royalty, read over the value-chain lot's cocaine farm-to-street price ladder (the royalty base named as the licensee's United States wholesale position price)

Input:

~~~json
{
  "type": "DeriveBenefitShareRequest",
  "version": 1,
  "shares": {
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
            "evidenceLabel": "Colombia: average price of cocaine 2021, Statista (https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/)"
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
            "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"
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
            "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"
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
  },
  "record": {
    "type": "561GroupBenefitSharingRecord",
    "holder": {
      "kind": "nation",
      "name": "South African San Council"
    },
    "material": {
      "commonName": "Hoodia gordonii",
      "scientificName": "Hoodia gordonii",
      "materialKind": "species"
    },
    "territory": "lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section",
    "consentScope": {
      "catalogue": true,
      "sell": true,
      "name": true,
      "neverLeaves": []
    },
    "share": {
      "kind": "royalty",
      "value": "6"
    },
    "floor": null,
    "effectiveFrom": "2003-01-01",
    "expiresOn": null,
    "references": [],
    "charge": {
      "support": true,
      "refutation": false
    }
  },
  "unitsSold": "1000",
  "retailUnitPrice": {
    "unitPrice": "150000",
    "unit": "USD per kilogram",
    "source": {
      "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
      "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"
    }
  },
  "royaltyBase": {
    "unitPrice": "70000",
    "unit": "USD per kilogram",
    "source": {
      "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
      "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance",
      "rangeNote": "the licensee's (United States wholesale) position price named as the royalty base"
    }
  }
}
~~~

Output:

~~~json
{
  "type": "BenefitShareReading",
  "version": 1,
  "shareKind": "royalty",
  "shareValue": "6",
  "perUnit": {
    "numerator": "4200",
    "denominator": "1"
  },
  "total": {
    "numerator": "4200000",
    "denominator": "1"
  },
  "basis": "6 percent of the licensee's named royalty base (70000 USD per kilogram)",
  "floor": null,
  "meetsAgreement": true,
  "evidenceLabels": [
    "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html); the licensee's (United States wholesale) position price named as the royalty base"
  ],
  "notFound": []
}
~~~

### Fairtrade International's Ghana cocoa Minimum Price floor of $3,500 per tonne, share.kind none, floor met; the $275 per tonne Premium is outside this schema and named in notFoundInputs

Input:

~~~json
{
  "type": "DeriveBenefitShareRequest",
  "version": 1,
  "shares": {
    "type": "ValueChainShareSet",
    "version": 1,
    "positionCount": 2,
    "retailPositionName": "Ghana Fairtrade cooperative, Minimum Price plus Premium",
    "retailUnitPrice": "3775",
    "retailUnit": "USD per tonne",
    "positions": [
      {
        "name": "Ghana Fairtrade cooperative, Minimum Price",
        "contested": false,
        "prices": [
          {
            "unitPrice": "3500",
            "unit": "USD per tonne",
            "share": {
              "numerator": "140",
              "denominator": "151"
            },
            "multiplierFromPrevious": null,
            "evidenceLabel": "Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe (https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/); The Fairtrade Minimum Price for conventional cocoa increases by 45% to US$3,500 per tonne in Ghana, effective 1 October 2026"
          }
        ]
      },
      {
        "name": "Ghana Fairtrade cooperative, Minimum Price plus Premium",
        "contested": false,
        "prices": [
          {
            "unitPrice": "3775",
            "unit": "USD per tonne",
            "share": {
              "numerator": "1",
              "denominator": "1"
            },
            "multiplierFromPrevious": {
              "numerator": "151",
              "denominator": "140"
            },
            "evidenceLabel": "Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe (https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/); Minimum Price $3,500 per tonne plus the Fairtrade Premium of $275 per tonne, both effective 1 October 2026 (Ghana/Côte d'Ivoire)"
          }
        ]
      }
    ]
  },
  "record": {
    "type": "561GroupBenefitSharingRecord",
    "holder": {
      "kind": "household",
      "name": "withheld"
    },
    "material": {
      "commonName": "cocoa",
      "scientificName": "Theobroma cacao",
      "materialKind": "species"
    },
    "territory": "lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section",
    "consentScope": {
      "catalogue": true,
      "sell": true,
      "name": false,
      "neverLeaves": []
    },
    "share": {
      "kind": "none",
      "value": null
    },
    "floor": {
      "amount": "3500",
      "unit": "USD",
      "per": "tonne"
    },
    "effectiveFrom": "2026-10-01",
    "expiresOn": null,
    "references": [],
    "charge": {
      "support": true,
      "refutation": false
    }
  },
  "unitsSold": "10",
  "retailUnitPrice": {
    "unitPrice": "3775",
    "unit": "USD per tonne",
    "source": {
      "sourceUrl": "https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/",
      "sourceTitle": "Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe"
    }
  },
  "notFoundInputs": [
    "record.share: a $275 per tonne Fairtrade Premium is cited in the source incumbent row (2026-09-05-hopeium-incumbent-measurement.json) but is outside this schema's share.kind representation (net-sales.value is a percent, not a flat currency amount, and floor is a single guaranteed amount, not a top-up); not computed by this reading"
  ]
}
~~~

Output:

~~~json
{
  "type": "BenefitShareReading",
  "version": 1,
  "shareKind": "none",
  "shareValue": null,
  "perUnit": {
    "numerator": "0",
    "denominator": "1"
  },
  "total": {
    "numerator": "0",
    "denominator": "1"
  },
  "basis": "the agreement carries no share term (share.kind is \"none\")",
  "floor": {
    "amount": "3500",
    "unit": "USD",
    "per": "tonne",
    "producerPositionUnitPrice": "3500",
    "producerPositionUnit": "USD per tonne",
    "met": true
  },
  "meetsAgreement": true,
  "evidenceLabels": [
    "Fairtrade sets new Minimum Price and Premium for cocoa farmers, Comunicaffe (https://www.comunicaffe.com/fairtrade-boosts-support-for-cocoa-farmers-and-sets-new-minimum-price/); The Fairtrade Minimum Price for conventional cocoa increases by 45% to US$3,500 per tonne in Ghana, effective 1 October 2026"
  ],
  "notFound": [
    "record.share: a $275 per tonne Fairtrade Premium is cited in the source incumbent row (2026-09-05-hopeium-incumbent-measurement.json) but is outside this schema's share.kind representation (net-sales.value is a percent, not a flat currency amount, and floor is a single guaranteed amount, not a top-up); not computed by this reading"
  ]
}
~~~

### Equal Exchange's more-than-twice-the-going-rate benefit (2x), applied to the value-chain lot's cocaine ladder's producer position purely as a numeric fixture

Input:

~~~json
{
  "type": "DeriveBenefitShareRequest",
  "version": 1,
  "shares": {
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
            "evidenceLabel": "Colombia: average price of cocaine 2021, Statista (https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/)"
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
            "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"
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
            "evidenceLabel": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"
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
  },
  "record": {
    "type": "561GroupBenefitSharingRecord",
    "holder": {
      "kind": "household",
      "name": "withheld"
    },
    "material": {
      "commonName": "coffee",
      "scientificName": "Coffea arabica",
      "materialKind": "species"
    },
    "territory": "lib/emsenn/services/561-group/services/science-services-section/services/natural-science-services-section",
    "consentScope": {
      "catalogue": true,
      "sell": true,
      "name": false,
      "neverLeaves": []
    },
    "share": {
      "kind": "multiple-of-market",
      "value": "2"
    },
    "floor": null,
    "effectiveFrom": "1986-01-01",
    "expiresOn": null,
    "references": [],
    "charge": {
      "support": true,
      "refutation": false
    }
  },
  "unitsSold": "500",
  "retailUnitPrice": {
    "unitPrice": "150000",
    "unit": "USD per kilogram",
    "source": {
      "sourceUrl": "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html",
      "sourceTitle": "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"
    }
  }
}
~~~

Output:

~~~json
{
  "type": "BenefitShareReading",
  "version": 1,
  "shareKind": "multiple-of-market",
  "shareValue": "2",
  "perUnit": {
    "numerator": "1800",
    "denominator": "1"
  },
  "total": {
    "numerator": "900000",
    "denominator": "1"
  },
  "basis": "2x the producer's position price (900 USD per kilogram)",
  "floor": null,
  "meetsAgreement": true,
  "evidenceLabels": [
    "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance (https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html)"
  ],
  "notFound": []
}
~~~
