# @red-cup-engineering/observe-irradiance-service

Fetches one public irradiance dataset's daily GHI for a place and date range and returns it
as irradiance-observation rows, or a refusal datum.

## Operation

~~~js
export async function observeIrradiance(request)
~~~

### Parameters

- request (object): A record with place ({lat, lon}), startDate, endDate, dataset, and optional fetchImpl (injected fetch function, defaults to global fetch) and now (ISO date, defaults to today).

### Returns

Promise<object[]|object>: An array of IrradianceObservation rows, or {refused: true, reason, ...}.

### Refusals

- TypeError: When place, startDate, endDate, or dataset is malformed.

## Command

observe-irradiance reads one JSON value per input line and writes one JSON value per output line.

## Examples

### pvgis is declared but refused until implemented

Input:

~~~json
{
  "place": {
    "lat": 43.02,
    "lon": -102.55
  },
  "startDate": "2026-01-01",
  "endDate": "2026-01-01",
  "dataset": "pvgis"
}
~~~

Output:

~~~json
{
  "refused": true,
  "reason": "dataset-not-implemented",
  "dataset": "pvgis"
}
~~~

### an unadmitted dataset refuses as data

Input:

~~~json
{
  "place": {
    "lat": 43.02,
    "lon": -102.55
  },
  "startDate": "2026-01-01",
  "endDate": "2026-01-01",
  "dataset": "open-meteo"
}
~~~

Output:

~~~json
{
  "refused": true,
  "reason": "dataset-not-admitted",
  "dataset": "open-meteo"
}
~~~
