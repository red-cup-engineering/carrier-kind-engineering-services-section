# @red-cup-engineering/derive-household-energy-barrier-service

Derives a household's winter survival barrier -- heating energy plus food energy -- as a `position-sizing-service`-shaped `barrierJoules` record, in joules, kilowatt-hours, and USD at the household's own tariff.

## Operation

~~~js
export function deriveHouseholdEnergyBarrier(request)
~~~

### Parameters

- request ({ heatingEnergy: { amount: string, unit: "PROPANE_GAL"|"DIESEL_GAL"|"CORD_WOOD"|"KWH"|"JOULES" }, foodEnergy: { amount: string, unit: "JOULES"|"KCAL" }, tariff: { usdPerKwhTiers: readonly { usdPerKwh: string }[] }, asOf: string }): 

### Returns

{ amount: string, unit: "joules", kwh: string, usdPerKwh: string, usdTotal: string, asOf: string }: Exactly `position-sizing-service`'s `sleeve.barrierJoules` shape plus the two convenience fields `kwh`/`usdTotal`.

### Refusals

- TypeError: On an unconvertible unit or a missing declared field, mirroring `consumption-hedge-service`'s own strict-input posture: nothing is estimated internally.

## Command

derive-household-energy-barrier reads one JSON value per input line and writes one JSON value per output line.

## Examples

### sums propane heating and kcal food energy into one joule barrier

Input:

~~~json
{
  "heatingEnergy": {
    "amount": "0",
    "unit": "JOULES"
  },
  "foodEnergy": {
    "amount": "3600000",
    "unit": "JOULES"
  },
  "tariff": {
    "usdPerKwhTiers": [
      {
        "usdPerKwh": "0.1423"
      }
    ]
  },
  "asOf": "2026-09-05"
}
~~~

Output:

~~~json
{
  "amount": "3600000.000",
  "unit": "joules",
  "kwh": "1.000000",
  "usdPerKwh": "0.1423",
  "usdTotal": "0.1423",
  "asOf": "2026-09-05"
}
~~~
