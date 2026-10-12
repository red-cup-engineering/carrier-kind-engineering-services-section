# Watershed simulation engine

This application runs a discrete flow simulation over a supplied watershed network.
At every step, each watershed retains `1 - releaseFraction` of its available water and
routes the rest one downstream edge. Water reaching `ocean` or `endorheic` leaves the
model. The returned mass balance makes the modeled input, retained water, and outflow
visible.

It is an engine, not a watershed dataset or a GIS codec. It does not calculate a
drainage network from terrain, download hydrological data, or claim that uncalibrated
model units describe a real watershed. Callers must supply the watershed topology,
release fractions, initial water, and per-step inflow.

The same module exports `deriveWatershedCausalOrder(request)` for a simulation that
needs the upstream catchment, downstream path, terminal sink, or peer basins of one
declared watershed. It reads only the supplied `id` and `drainsTo` values.

```sh
printf '%s' '{"steps":2,"watersheds":[{"id":"headwater","drainsTo":"river","releaseFraction":1},{"id":"river","drainsTo":"ocean","releaseFraction":1}],"initialWaterByWatershed":{"headwater":10},"inflowByStep":[{"headwater":2},{"headwater":3}]}' | node scripts/simulate-watershed-flow.mjs
```
