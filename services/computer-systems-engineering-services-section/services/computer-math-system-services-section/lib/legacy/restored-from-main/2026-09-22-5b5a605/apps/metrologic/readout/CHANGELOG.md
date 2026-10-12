# Changelog

All notable changes to `@lenticule-science/metrologic/readout` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — unreleased

### Added

- `place`, `knowledgeWeight`, `salience`, `readout` — the FOUR-place classification and its order-derived numbers, delegating to `@lenticule-science/metrologic/bilattice/charge`.
- `styleFor`, `assertStyleTable` — a validated charge → style-table lookup, replacing a hand-rolled per-place switch statement.
- Property tests confirming the classification is total and exclusive, `salience` reproduces the `absurd < active < potential < stable` ordering two legacy consumers each hand-rolled, and `styleFor`/`assertStyleTable` validate correctly.

Absorbs the FOUR→style table pattern duplicated in the legacy `abrash` and `tsander` packages (`src/world.mjs`'s local `FOUR = {T,F,BOT,TOP}`, `abrash`'s `WALL_COLOR`, `tsander`'s `CHARGE_GLYPH`/`SALIENCE`) into one theory-derived module — the classification and ordering are computed from the bilattice's value bits, not re-declared per consumer. Ships no colors or glyphs of its own; those remain each consumer's rendering choice.
