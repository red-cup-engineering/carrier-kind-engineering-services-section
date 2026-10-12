# Computer Solar Economic Systems Engineering Services Section

Red Cup Engineering's section for the compute that reads a household's, a band's, or an enterprise's solar energy as an economy, and the seat of its division.
A cloche is the plain glass vessel that captures sunlight for what grows under it.
Founded 2026-09-05 beneath [computer-economic-systems-engineering-services-section](../../README.md) (computer-economic-systems-engineering-services-section) from the program carrier, [561 Group Solar Economics Services Section](../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-economic-operations-services-section/services/561-group-solar-economics-services-section/README.md), which names the divisions and keeps their custody thread whole.

computer-solar-economic-systems-engineering-services-section holds the pure compute, each operation fabricated through the jsnode line with JSON Schema in and out and published once on the registry: the kilowatt-hour and fuel price directives over the house reader (`@red-cup-engineering/derive-set-of-energy-price-directives-service` 0.1.0 already derives KWH, PROPANE_GAL, and DIESEL_GAL directives and is composed, never copied); yield readouts for a place over public irradiance data; the joule valuation of a Beancount ledger; joules per settled row over the house's own resource receipts (`systemd-unit-inventory-observation-service` 0.3.0); tariff and statement importers; and the household energy record schemas under `data/records/schema/`.
It writes no panel, inverter, or grid code; it is the witness layer over energy people already own.
The capability specification, in the shape the gig-assist specification holds, is written by the system architect's office and cited here when it lands.

## Command

`npm install @red-cup-engineering/computer-solar-economic-systems-engineering-services-section` installs `apps/solar-economics-cli.mjs` (bin `solar-economics`), the seat's one composed CLI/NDJSON face over its eight published operations, one subcommand per operation:

- `observe-irradiance`
- `derive-yield-projection`
- `value-ledger-in-kilowatt-hours`
- `derive-joules-per-settled-row`
- `derive-set-of-household-energy-price-directives`
- `derive-household-energy-barrier`
- `import-utility-statement`
- `settle-energy-exchange` — the clearing: settles an EnergyExchangeRecord's two witnesses and names the exact `WitnessedKilowattHour.mint` call the settled record licenses, composing `@red-cup-engineering/settle-energy-exchange-service` 0.1.1.

Each subcommand reads one JSON value per stdin line and writes one JSON value per stdout line by calling its named child package's own export; `--help` lists the subcommands.

public-energy-services-section (Causeway Services) · solar-operations-services-section (Coesite Operations) · computer-solar-economic-systems-engineering-services-section (Red Cup Engineering) · solar-economics-science-services-section (Lenticule Science) · 561-group-solar-economics-services-section (561 Group)
