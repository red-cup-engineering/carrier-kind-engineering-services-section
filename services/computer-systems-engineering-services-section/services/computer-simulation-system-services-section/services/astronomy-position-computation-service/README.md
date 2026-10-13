# Astronomy position computation service

**Source-owned mathematics.** This package computes bounded sky measurements
from one pinned, embedded approximate ephemeris. It has no network calls,
merchant domain, secret, x402 middleware, horoscope, customer record, or
publication authority. Consumers can use the same calculations in astronomical
products, Divination, scientific comparisons, and machine-purchasable operations.

## Compute surface and laws

| Export | Admitted inputs | Output |
| --- | --- | --- |
| `computeAstronomyPositions(date)` | UTC date/instant in **1800–2050** | Ten bodies' geocentric ecliptic-of-date approximate longitude, latitude, apparent angular speed and lunar illumination |
| `computePrecisionAstronomyPositions(date, options)` from `/node` | **1972–2050**, Earth latitude/longitude, OxiEphemeris binary plus exact DE440 kernel at runtime | Original DE440-backed supplier coordinates and cross-model divergence; unavailable binary is a refusal, not an approximate fallback |
| `computeAstronomyEventWindow(request)` | Kind, strict start/end interval **over zero through 35 days**, plus necessary body/angle | Numerical lunar-quarter, planetary-station or relative-ecliptic-longitude crossing events |
| `computeAngularGeometry(request)` | UTC instant, optional **2–10 distinct bodies** | All unordered pairwise spherical great-circle separations (at most **45**) |
| `computeAstronomyPositionSeries(request)` | UTC start/end, integer cadence 1–10080 minutes, **at most 35 days and 256 instants**, 1–10 selected bodies | Reproducible batched positions, optional lunar phase, and explicit sampled endpoint and unsampled remainder |
| `computeEquatorialPositions(date)` | UTC date/instant in **1800–2050** | Approximate geocentric right ascension/declination of the same ten source bodies, with obliquity, frame and provenance |

The scientific source is the **ephemeris computation**, not astrology. Zodiacal
signs, houses, rulership and the meanings of aspects belong downstream in
Divination, not here. An x402 offer must bind to a named compute and validate
function in the existing `market.561.group` catalog: adding a domain or payment
gateway is not part of this package.

### Exact input meanings

- Bare `YYYY-MM-DD` is **00:00 UTC** on that calendar date.
- Full datetimes are parsed as UTC instants and canonically returned with
  `.000Z` precision where appropriate. Validate the published date range
  *before* making a payment challenge.
- A Julian day used internally for the underlying series is in **TT**
  (Terrestrial Time), translated from UTC using the package's stated
  approximate `Delta T` law. Event roots are inverted from TT to UT
  before being reported as UTC. Solver tolerance is **not** guaranteed
  physical event-time accuracy.
- Geographic latitude is degrees north and longitude degrees east.
  Input celestial longitude, latitude, separations, right ascension and
  declination use degrees. Right ascension is also reported in hours
  (`degrees / 15`) in the interval 0–24 hours.

## Coordinate geometry

The approximate geocentric ecliptic source point is first represented by the
unit vector

```text
x = cos(beta) cos(lambda)
y = cos(beta) sin(lambda)
z = sin(beta)
```

where `lambda` is ecliptic longitude and `beta` is ecliptic latitude.

Great-circle angular separation uses
`atan2(norm(cross(u, v)), dot(u, v))`, which remains numerically stable
for nearly coincident directions and for antipodes. This is a **three-dimensional
spherical separation**, not the **difference of ecliptic longitudes** used for
the crossing-event product. Consumers must not conflate them.

To derive equatorial-of-date coordinates, rotate that same vector about the
ecliptic X axis by the **mean obliquity of date**, from the Meeus J2000
TT-centuries polynomial:

```text
epsilon0 = 23°26'21.448"
           - 46.8150" T - 0.00059" T² + 0.001813" T³
y_eq = y cos(epsilon0) - z sin(epsilon0)
z_eq = y sin(epsilon0) + z cos(epsilon0)
RA = atan2(y_eq, x) modulo 360°
Dec = atan2(z_eq, hypot(x, y_eq))
```

The forward rotation has an independently tested inverse, and source
measurements remain **unrounded until after** the transformation. The Meeus
polynomial and reference-frame distinction are documented in
[Max Planck's precession-and-nutation reference](https://www2.mps.mpg.de/homes/fraenz/systems/systems3art/node3.html).

**Limitation:** the embedded source's longitude is an approximate
"apparent ecliptic-of-date" quantity. Rotating it through the *mean*
obliquity is a disclosed mixed approximation, **not a full
true/apparent equatorial reference frame**. Outputs are not ICRS/CIRS
coordinates or topocentric telescope-pointing instructions; this
transformation does not add full nutation, parallax, refraction, rigorous
light-time treatment or accuracy the ephemeris does not have.

### Bounded position-series products

One request can calculate a series of positions without buying a separate
single-instant operation for each sample. An example:

```js
import { computeAstronomyPositionSeries } from "@lenticule-science/astronomy-position-computation-service";
const week = computeAstronomyPositionSeries({
  start: "2026-10-12T00:00:00Z",
  end: "2026-10-19T00:00:00Z",
  stepMinutes: 120,
  bodies: ["sun", "moon", "mars"],
  includeLunarPhase: true,
});
```

This produces 85 UTC instants, inclusive of both endpoints at a two-hour
cadence, using precisely the same computation as the single-instant source.
Neither the model nor the service interpolates between instants. When the
end is off the requested cadence, `sampledEnd` and
`unsampledRemainderMinutes` expose that gap instead of claiming it was
measured. Input admission bounds both time span and number of samples
before computation. The provider returns its original method and angular
error provenance without promoting decimal formatting to physical accuracy.

## Provenance, accuracy and authority

The embedded source algorithm is a truncated Meeus lunar/solar series with
JPL approximate planetary elements. Its published tested interval is
1800–2050. The existing golden tests and per-body longitude error bounds
describe the published numerical law; extra decimal places in a vector
transformation or printed coordinate **do not make the underlying positions
more accurate**. The separate DE440 provider carries the pin of the actual
precision binary and rejects unavailable suppliers.

The `computeAstronomyEventWindow` products make observational promises only
to the limit of the underlying ephemeris and Earth-rotation model. Do not
represent a one-second bisection/root tolerance as a one-second ephemeris
prediction guarantee.

Source data, external catalogs and HTTP API rights must be reviewed separately
for commercial use, derived outputs, caching and redistribution. Computing
and selling a transformation does not override upstream licenses or terms.

## Verify as an independent producer

```sh
npm run check
npm test
npm pack
```

The engineering repository's [Astronomy package distributability GitHub
Actions workflow](https://github.com/red-cup-engineering/computer-engineering-services-section/actions/workflows/astronomy-package.yml)
runs these scientific tests and verifies that a packed tarball can be
installed and imported by a separate clean consumer without registry access.
An accepted tarball is **not** a published `registry.561.group` release,
and a published library is not a live x402 paid-delivery witness.
