# @561-group/astrology-topology

The astrology domain as mathematics. Zero runtime dependencies.

The carrier is the circle: ecliptic longitude on R/360°, tropical (equinox
of date). Everything astrological is a structure on it:

- **zodiac** — the twelve signs as the literal quotient of the circle by 30°
  arcs; elements and modalities as the further quotients Z12 → Z4 and
  Z12 → Z3. `signPlacement` is the quotient map.
- **chart** — a finite map from bodies (Sun through Pluto) to geocentric
  ecliptic states (longitude, latitude, speed), stamped with the provenance
  of the computation that witnessed it. Motion is a three-valued reading of
  the derivative (direct / stationary / retrograde), not a boolean.
- **aspects** — angular relations witnessed within an orb. An `AspectHit`
  records the separation, the signed offset from exact, and whether the pair
  is applying or separating — read off the relative speed.
- **lunation** — the Sun–Moon elongation circle and its eightfold quotient
  into the named phases; illuminated fraction as (1 − cos e)/2.
- **events** — ingresses, stations, exact aspects, and lunation quarters as
  zero crossings of continuous functions of time, found by scan + bisection.
- **ephemeris** — time → chart. Sun: Meeus low-precision solar theory.
  Moon: truncated ELP-2000 periodic series (Meeus ch. 47). Planets: JPL
  approximate Keplerian elements (Standish, 1800–2050), carried to of-date
  by general precession and nutation. Accuracy claims live in
  `EPHEMERIS_PROVENANCE` and are verified against JPL Horizons fixtures in
  the tests; charts carry them as provenance.

The ephemeris is deliberately our own: a position claim ("Moon enters Virgo
at 14:32 UTC") is provenanced by the algorithm and its stated precision,
which makes chart claims first-class citizens of the workspace's
claim-capital pattern.

```ts
import { computeChart, aspectsInChart, lunationOf, signPlacement } from "@561-group/astrology-topology";

const chart = computeChart("2026-06-11T16:00:00Z");
const placement = signPlacement(chart.bodies.moon.longitude);
const lunation = lunationOf(chart.bodies);
const hits = aspectsInChart(chart.bodies);
```
