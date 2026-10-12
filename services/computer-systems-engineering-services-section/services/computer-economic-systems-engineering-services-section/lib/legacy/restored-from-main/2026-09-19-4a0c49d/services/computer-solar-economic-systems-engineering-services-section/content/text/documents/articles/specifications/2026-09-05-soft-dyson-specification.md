---
title: "Soft Dyson specification"
description: "Capability specification for computer-solar-economic-systems-engineering-services-section, the engineering seat of the 561 Group's Soft Dyson solar-economics endeavor: the household energy record schemas, the price-directive, ledger-valuation, yield-projection, resource-receipt, barrier, and statement-import operations, and the priced measures listed on the x402 gateway. Written before anything is built; the fabrication lot cuts work orders from it."
date-created: 2026-09-05
type: specification
name: 2026-09-05-soft-dyson-specification
authors:
  - claude-sonnet-5
status: draft
keywords:
  - soft-dyson
  - cloche-solar-systems
  - solar-economics
  - energy-price-directives
  - farolfi
  - irradiance
  - x402
---

Soft Dyson was founder-named 2026-09-05 as the 561 Group's endeavor to be "the interface between
humans and solar energy"
([561 Group Solar Economics Services Section README](../../../../../../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-economic-operations-services-section/services/561-group-solar-economics-services-section/README.md),
hereafter "the program carrier"). This specification is the engineering build order for Cloche
Solar Systems, the program's Red Cup Engineering division, seated at
[computer-solar-economic-systems-engineering-services-section](../../../../../README.md)
under computer-economic-systems-engineering-services-section. It follows the shape of
[the Gig Assist specification](../../../../../../../../../../../../../../public-services-section/services/public-economic-services-section/services/public-worker-services-section/services/gig-assist-services-section/2026-09-05-gig-assist-specification.md),
using BCP 14 (MUST/SHOULD/MAY) as it does, and every operation below is written so a work order
in the jsnode fabrication line's own dialect
([translate-markdown-jsnode-operation-package-specification source](../../../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/src/translate-markdown-jsnode-operation-package-specification.mjs))
can be cut from it directly: a name, one-sentence effect, parameters as JSON Schema, a return
schema, refusals stated as data, the exact house imports, and what the operation MUST NOT do.

## Purpose and scope

computer-solar-economic-systems-engineering-services-section is the witness layer over energy a household already owns. It reads what
already exists — a utility statement, a meter, a panel's own telemetry summary, a tariff page, an
assistance claim, a public irradiance dataset — and derives priced, evidence-labeled readings from
it. Nothing in this specification:

- writes panel, inverter, charge-controller, or grid-control code of any kind (the program
  carrier's "how humans play and are organized": "the house builds no panel, inverter, or wire; it
  builds the witness layer over the ones people already own");
- sends a command to a utility, a grid operator, or a household's own hardware;
- decides which territory a household should monetize first ("a readout, not a decision", program
  carrier, distal-bypass bullet).

Every operation is pure compute or single-purpose I/O (one fetch, one file read), fabricated
through the jsnode line, published once, and consumed by an app that composes it — never a second
implementation of anything the tree already owns.

### Custody fences

Applied unchanged from the program carrier and from PACER's own fences
([PACER companion specification](../../../../../../../../personal-computer-systems-services-section/services/personal-intelligence-systems-services-section/services/personal-health-intelligence-systems-services-section/content/text/documents/articles/specifications/2026-09-02-pacer-companion-specification.md),
"Fences"), which the program carrier restates verbatim as its own ("Care is relation-repair,
never extraction"):

- **No data sale, no lead generation** to installers, lenders, or utilities, no dark pattern, no
  subscription trap.
- **Local-first custody.** A household's readings (statement rows, meter values, panel telemetry)
  are never required to leave the device or the band's own governed store to produce a reading;
  only a compact, evidence-labeled summary crosses a network boundary for a priced call, mirroring
  PACER's "readings never leave the device except as the compact summary inside one companion
  turn."
- **A household's refusal to be optimized is sovereignty, not error** (program carrier,
  distal-bypass bullet) — no operation here scores, ranks, or nudges a household's choices; it
  reports what the numbers say.
- **Every claim carries its evidence status in plain words** (program carrier, "every claim
  carries its evidence status"): a tariff carries its source URL and `asOf` date; a yield is
  labeled `"projection"` with its dataset named; a joule figure carries its boundary.
- **No affiliate placement** inside any ledger, reading, or companion surface.

## Theory this realizes

Each item below is realized, not restated; the theory lives in the program carrier and its cited
carriers, and this specification points to it rather than re-deriving it.

- **Energy is the substrate; the interface is the choke point held at cost-plus, never rent.**
  Program carrier, "Energy is the substrate" and "Choke points are where authority relocates"
  bullets — realized here as priced measures sold at the cost of the compute plus the cost of
  running the service around it, never a spread.
- **Cognitive EROEI becomes literal EROEI.** Program carrier, "Cognitive EROEI becomes literal
  EROEI" bullet, citing the fintech-under-energy-descent note's instrument 3.10 — realized by
  `derive-joules-per-settled-row` below.
- **Books valued twice.** Program carrier, "What the tree already holds" bullet on instrument 3.1
  — realized by `derive-set-of-household-energy-price-directives` and
  `value-ledger-in-kilowatt-hours`.
- **The distal bypass's two-witness discipline.** Program carrier, "The distal bypass" bullet
  ("discharges damage — a billing mismatch") — realized by the two-witness mismatch field on
  `household-energy-record` and by `import-utility-statement`'s refusal to drop a mismatch
  silently.
- **The survival barrier is denominated in joules.** Program carrier, "Collapse gives the ladder"
  bullet, citing the fintech note's section 2 and `position-sizing-service`'s `barrierJoules`
  field — realized by `derive-household-energy-barrier`.
- **The entropy weld is a belief, never a theorem.** Program carrier, "The entropy math, believed
  past what is proved" bullet, citing the working paper's falsifier 6
  ([Energetics of Civilizational Cognition](../../../../../../../../../../../../../../science-services-section/services/social-science-services-section/content/text/documents/articles/notes/2026/07/29/2026-07-29-working-paper-energetics-of-civilizational-cognition.md)).
  No operation in this specification claims to price a bit in joules; `derive-joules-per-settled-row`
  prices a settlement's physical energy cost only, never a wit.
- **Soft means software.** Program carrier, "Why soft" bullet — realized by the scope restriction
  above.

## The record schemas

Four record schemas are specified here; the fabrication lot creates the JSON Schema files at
`data/records/schema/<name>.schema.json` in this section from the definitions below. Each is
`"$schema": "https://json-schema.org/draft/2020-12/schema"`.

**A note on commodities:** generated and consumed energy are both quantities of the same physical
unit, and Beancount's commodity identifies the unit rather than the direction of flow, so a
household's PV generation posts in the existing `KWH` commodity to an income/production account
and no new commodity is named by this specification.

### `household-energy-record`

A period's energy state for one household, two-witness on every value that has an independent
second source.

```json
{
  "$id": "household-energy-record.schema.json",
  "title": "HouseholdEnergyRecord",
  "type": "object",
  "required": ["type", "version", "householdId", "periodStart", "periodEnd", "kwhUsed", "kwhGenerated", "tariff"],
  "properties": {
    "type": { "const": "HouseholdEnergyRecord" },
    "version": { "const": 1 },
    "householdId": { "type": "string" },
    "periodStart": { "type": "string", "format": "date" },
    "periodEnd": { "type": "string", "format": "date" },
    "kwhUsed": { "$ref": "#/$defs/witnessedValue" },
    "kwhGenerated": { "$ref": "#/$defs/witnessedValue" },
    "fuelOnHand": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["commodity", "amount", "unit", "asOf"],
        "properties": {
          "commodity": { "enum": ["PROPANE_GAL", "DIESEL_GAL", "CORD_WOOD"] },
          "amount": { "type": "string" },
          "unit": { "type": "string" },
          "daysOfHeat": { "type": ["number", "null"] },
          "asOf": { "type": "string", "format": "date" }
        }
      }
    },
    "tariff": { "$ref": "energy-tariff.schema.json" },
    "panelTelemetrySummary": {
      "type": ["object", "null"],
      "properties": {
        "kwhGeneratedReported": { "type": "string" },
        "sourceKind": { "enum": ["inverter-export", "manufacturer-portal-export"] },
        "asOf": { "type": "string", "format": "date" }
      }
    },
    "assistanceClaims": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["program", "amount", "status", "enforcementClass"],
        "properties": {
          "program": { "type": "string" },
          "amount": { "type": "string" },
          "status": { "enum": ["filed", "matched", "paid", "denied"] },
          "enforcementClass": { "enum": ["structural", "aspirational", "decorative"] },
          "citedRuleUrl": { "type": ["string", "null"] }
        }
      }
    }
  },
  "$defs": {
    "witnessedValue": {
      "type": "object",
      "required": ["statementValue", "meterOrBankValue"],
      "properties": {
        "statementValue": { "type": "string" },
        "meterOrBankValue": { "type": ["string", "null"] },
        "mismatch": { "type": ["boolean", "null"] },
        "mismatchAmount": { "type": ["string", "null"] }
      }
    }
  }
}
```

A `witnessedValue` with a non-null `meterOrBankValue` that disagrees with `statementValue` MUST
set `mismatch: true` and carry the exact `mismatchAmount`; it MUST NOT be silently resolved in
either direction (the distal bypass's two-witness discipline).

### `energy-tariff`

```json
{
  "$id": "energy-tariff.schema.json",
  "title": "EnergyTariff",
  "type": "object",
  "required": ["utility", "rateScheduleName", "usdPerKwhTiers", "sourceUrl", "asOf"],
  "properties": {
    "utility": { "type": "string" },
    "rateScheduleName": { "type": "string" },
    "usdPerKwhTiers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["usdPerKwh"],
        "properties": {
          "thresholdKwh": { "type": ["string", "null"] },
          "usdPerKwh": { "type": "string" }
        }
      },
      "minItems": 1
    },
    "netMeteringCredit": {
      "type": ["object", "null"],
      "properties": {
        "usdPerKwh": { "type": "string" },
        "rolloverPolicy": { "type": "string" }
      }
    },
    "sourceUrl": { "type": "string", "format": "uri" },
    "asOf": { "type": "string", "format": "date" }
  }
}
```

### `irradiance-observation`

```json
{
  "$id": "irradiance-observation.schema.json",
  "title": "IrradianceObservation",
  "type": "object",
  "required": ["place", "dailyGhiKwhPerM2", "date", "datasetName", "datasetUrl", "asOf"],
  "properties": {
    "place": {
      "type": "object",
      "required": ["lat", "lon"],
      "properties": { "lat": { "type": "number" }, "lon": { "type": "number" } }
    },
    "dailyGhiKwhPerM2": { "type": "string" },
    "date": { "type": "string", "format": "date" },
    "datasetName": { "type": "string" },
    "datasetUrl": { "type": "string", "format": "uri" },
    "methodology": { "enum": ["satellite-reanalysis", "ground-station", "unknown"] },
    "asOf": { "type": "string", "format": "date" }
  }
}
```

### `settled-row-energy-receipt`

Composes the systemd resource receipt shape by reference rather than redefining it
([`derive-unit-resource-receipts.mjs`](../../../../../../../../computer-operating-system-services-section/services/linux-services-section/services/systemd-services-section/services/systemd-unit-inventory-observation-service/src/derive-unit-resource-receipts.mjs),
`{type, version, host, unit, provider, actor, intervalStart, intervalEnd, derivedFrom, price:
{denomination: {kind, asset, unit}, amount: {numerator, denominator}}}`).

```json
{
  "$id": "settled-row-energy-receipt.schema.json",
  "title": "SettledRowEnergyReceipt",
  "type": "object",
  "required": ["type", "version", "rowId", "joules", "boundary", "conversionFactors", "sourceReceipts"],
  "properties": {
    "type": { "const": "SettledRowEnergyReceipt" },
    "version": { "const": 1 },
    "rowId": { "type": "string" },
    "joules": { "type": "string" },
    "boundary": {
      "type": "array",
      "items": { "enum": ["hosts", "inference", "signer"] },
      "minItems": 1
    },
    "conversionFactors": {
      "type": "object",
      "properties": {
        "cpuSecondsToJoules": { "$ref": "#/$defs/declaredFactor" },
        "byteToJoules": { "$ref": "#/$defs/declaredFactor" }
      }
    },
    "sourceReceipts": {
      "type": "array",
      "items": { "type": "object", "description": "one ResourceConsumedReceipt, unchanged, per systemd-unit-inventory-observation-service" }
    }
  },
  "$defs": {
    "declaredFactor": {
      "type": "object",
      "required": ["value", "sourceUrl", "asOf"],
      "properties": {
        "value": { "type": "string" },
        "sourceUrl": { "type": "string", "format": "uri" },
        "asOf": { "type": "string", "format": "date" }
      }
    }
  }
}
```

`barrierJoules` is not redefined here: every operation below that produces a barrier reading
returns exactly `position-sizing-service`'s `{amount, unit: "joules"|"kwh", usdPerKwh, asOf}`
shape ([position-sizing-service README](../../../../../../../../../../../../financial-engineering-services-section/services/position-sizing-service/README.md),
"Modules" — `sleeve.barrierJoules`) by reference, so a Cloche reading composes directly into a
sleeve's sizing request without translation.

## The operations

Each operation is one `scripts/<verb>-<noun>.mjs`, one export per script, JSON Schema in and out,
no logic beyond what is named. Refusals are returned as data (`{ refused: true, reason, ... }`),
never thrown, except for malformed-input `TypeError`s per house convention (mirroring
`derive-set-of-energy-price-directives`'s own refusal shape).

**Package shape.** The fabrication line births one operation per package, so each operation below
is its own child service package under
`computer-solar-economic-systems-engineering-services-section/services/<operation-name>-service/`
(`@red-cup-engineering/<operation-name>-service`), published to the registry by exact pin —
mirroring `computer-ledger-system-services-section/services/derive-set-of-energy-price-directives-service`
and the observer market's three child services
(`union-market-services-section/services/observer-market-services-section/services/{derive-observer-catalog-service,schedule-set-of-observations-service,settle-observation-purchase-service}`).
The seat's own `apps/solar-economics-cli.mjs` composes the child packages by exact pin, per the
import-stratification law (scripts import scripts and src; apps compose scripts, src, and apps);
the seat package itself holds no operation logic.

### `derive-set-of-household-energy-price-directives`

One-sentence effect: derives Beancount `KWH`/`PROPANE_GAL`/`DIESEL_GAL` price directives for one
household from its own `energy-tariff` record and weekly fuel series.

- **Parameters**: `{ date: string, household: { energyTariff: EnergyTariff }, propane: WeeklySeriesSource, diesel: WeeklySeriesSource }` (`WeeklySeriesSource` is exactly `derive-set-of-energy-price-directives`'s own `{ sourceKind, sourceUrl?, seriesText }`).
- **Returns**: `EnergyPriceDirectiveSet` (unchanged shape from the composed operation).
- **Refusals**: none of its own; a weekly series with no row at or before `date` is left unpriced by the composed operation, per its own README.
- **Imports**: `@red-cup-engineering/derive-set-of-energy-price-directives-service@0.1.0`
  ([README](../../../../../../../../computer-ledger-system-services-section/services/derive-set-of-energy-price-directives-service/README.md)),
  called with `electricity: { usdPerKwh: household.energyTariff.usdPerKwhTiers[0].usdPerKwh, sourceUrl: household.energyTariff.sourceUrl, asOf: household.energyTariff.asOf }`.
- **MUST NOT**: fabricate a tariff figure when `energyTariff` is absent (it MUST throw `TypeError`, mirroring the composed operation); re-implement price-directive rendering.

### `value-ledger-in-kilowatt-hours`

One-sentence effect: reads a Beancount ledger's `valuation` report at a cutoff date, in USD and,
where a `KWH` price directive prices the relevant commodities, in kilowatt-hours.

- **Parameters**: `{ journal: { path: string } | { text: string, format?: "beancount" | "hledger" }, asOf: string }`.
- **Returns**: `{ type: "KilowattHourValuation", version: 1, generatedAt: string, usdValuation: object, kwhValuation: object | null, unpricedCommodities: string[] }` — `usdValuation`/`kwhValuation` carry Farolfi's own `valuation` report shape (`-o json`) unchanged.
- **Refusals**: `{ refused: true, reason: "commodity-unpriced", commodity: string, asOf: string }` when a commodity the ledger holds a position in carries no price directive as of `asOf` — never a fabricated valuation.
- **Imports**: `@red-cup-engineering/read-ledger-report-service@0.1.0`, called twice with `report: "valuation"` — once against the ledger's own price directives for `usdValuation`, once against a `KWH`-priced overlay journal (the household's own directive set from the operation above, concatenated) for `kwhValuation`. `@red-cup-engineering/farolfi@0.1.13` is consumed only through `read-ledger-report-service`, never imported directly (a script imports scripts and src, never an app).
- **MUST NOT**: parse or render Beancount text itself; hand-roll a second valuation algorithm; read or write a file directly (`read-ledger-report-service` performs its own filesystem access through `@red-cup-engineering/file-services@0.2.1`/`@red-cup-engineering/remove-path-service@0.1.0`).

### `derive-yield-projection`

One-sentence effect: projects a system's kilowatt-hour yield over a period from a place's already-
observed irradiance, labeled a projection with its dataset named.

- **Parameters**: `{ place: { lat: number, lon: number }, irradianceObservations: IrradianceObservation[], systemSizeKw: string, performanceRatio?: string, periodDays: integer }`.
- **Returns**: `{ type: "YieldProjection", version: 1, label: "projection", projectedKwh: string, datasetName: string, datasetUrl: string, methodology: string, asOf: string }`.
- **Refusals**: `{ refused: true, reason: "no-observation-for-place" }` when `irradianceObservations` contains no row for the requested `place`.
- **Imports**: none beyond this section's own decimal helpers (no I/O, no clock — pure).
- **MUST NOT**: fetch irradiance data itself (that is `observe-irradiance`'s one job — the derive stays pure so it is testable and re-runnable against a fixture); claim the projection is a measurement.

### `observe-irradiance`

One-sentence effect: fetches one public irradiance dataset's daily GHI for a place and date range
and returns it as `irradiance-observation` rows.

- **Parameters**: `{ place: { lat: number, lon: number }, startDate: string, endDate: string, dataset: string, fetchImpl?: function, now?: string }` (`fetchImpl` is an injected fetch function, mirroring the moved EVE Assist tool-handler `ctx` shape's own `fetchImpl` — never the global `fetch` called directly, so the operation is testable against a fixture).
- **Returns**: `IrradianceObservation[]`.
- **Refusals**: `{ refused: true, reason: "dataset-not-admitted", dataset: string }` when `dataset` is not on the admitted list this specification names below.
- **Imports**: none beyond a house HTTP fetch wrapper if the section adopts one at fabrication time; no direct `node:http`/`node:https` where one exists.
- **MUST NOT**: derive a yield projection itself; retry silently past the dataset's own documented rate limit; accept an API key as a parameter for a dataset this specification admits as keyless (mirrors `derive-set-of-energy-price-directives`'s own `apiKey` refusal).

**Candidate datasets, not yet admitted.** This specification names the candidates; admitting one
is the measurement lot's work (solar-economics-science-services-section, rung 2 of the program carrier's bootstrap), not
a choice made here. A dataset MUST have, to be admitted:

1. a documented, reproducible export (a stable CSV/JSON API or bulk file) reachable without a paid
   key, or with a documented free-tier key whose terms this program can meet;
2. daily GHI in kWh/m²/day (or a value this section's math can losslessly convert to it) for an
   arbitrary lat/lon;
3. a stated methodology (satellite/reanalysis vs. ground station) and update/revision cadence, so
   the evidence label is honest;
4. a stated first-party owner and terms of use compatible with the no-data-sale fence.

Candidates: **NASA POWER** (satellite/reanalysis, global, documented free REST API); **NREL
PVWatts/NSRDB** (US-focused, ground-truth-anchored, documented API, free-tier key); **Open-Meteo**
(reanalysis-derived, free, keyless, documented JSON API); **PVGIS** (European Commission, global
coverage south of ~60°N historically, documented free API). None is admitted by this
specification.

### `derive-joules-per-settled-row`

One-sentence effect: prices one settled row (a fill booked, a claim matched, a pool draw
reconciled) in the joules the house spent to settle it, over a declared boundary, per the fintech
note's instrument 3.10.

- **Parameters**: `{ settledRows: { rowId: string, intervalStart: string, intervalEnd: string }[], resourceReceipts: ResourceConsumedReceipt[], conversionFactors: { cpuSecondsToJoules: DeclaredFactor, byteToJoules: DeclaredFactor }, boundary: ("hosts"|"inference"|"signer")[] }`.
- **Returns**: `SettledRowEnergyReceipt[]`, one per row that has at least one matching receipt by interval overlap; rows with no matching receipt are returned separately as `unmatchedRowIds: string[]`.
- **Refusals**: `{ refused: true, reason: "no-conversion-factor-for-asset", asset: string }` when a receipt's `price.denomination.asset` has no declared factor.
- **Imports**: `@red-cup-engineering/systemd-unit-inventory-observation-service@0.3.0`'s
  `deriveSetOfUnitResourceReceipts`
  ([source](../../../../../../../../computer-operating-system-services-section/services/linux-services-section/services/systemd-services-section/services/systemd-unit-inventory-observation-service/src/derive-unit-resource-receipts.mjs))
  is the caller's own upstream step producing `resourceReceipts`, composed by the caller, not by
  this operation (this operation takes receipts already derived, staying a pure fold).
- **MUST NOT**: invent a conversion factor (every factor is a declared parameter with its own
  source and `asOf`, never a constant baked into the script); claim a boundary the caller did not
  declare (a row lacking an `"inference"` receipt is never silently priced as if inference cost
  were zero — the row's `boundary` field states exactly which classes of cost it includes).

### `derive-household-energy-barrier`

One-sentence effect: derives a household's winter survival barrier — heating energy plus food
energy — as a `position-sizing-service`-shaped `barrierJoules` record, in joules, kilowatt-hours,
and USD at the household's own tariff.

- **Parameters**: `{ heatingEnergy: { amount: string, unit: "PROPANE_GAL"|"DIESEL_GAL"|"CORD_WOOD"|"KWH"|"JOULES" }, foodEnergy: { amount: string, unit: "JOULES"|"KCAL" }, tariff: EnergyTariff, asOf: string }`.
- **Returns**: `{ amount: string, unit: "joules", kwh: string, usdPerKwh: string, usdTotal: string, asOf: string }` — exactly `position-sizing-service`'s `sleeve.barrierJoules` shape plus the two convenience fields `kwh`/`usdTotal`.
- **Refusals**: `TypeError` on an unconvertible unit (mirrors `consumption-hedge-service`'s own strict-input posture: nothing is estimated internally).
- **Imports**: `@red-cup-engineering/consumption-hedge-service@0.1.0`'s joule-conversion constants
  (`JOULES_PER_BTU`, `JOULES_PER_GALLON_PROPANE`, `JOULES_PER_KWH`, `barrierJoulesForUnit`)
  ([README](../../../../../../../../../../../../financial-engineering-services-section/services/consumption-hedge-service/README.md))
  by exact pin — never re-derived, per the primitives-live-once rule.
- **MUST NOT**: read or estimate a household's heating or food energy itself (both are declared
  parameters); size a position (that is `position-sizing-service`'s own `sizePosition`, called by
  the consumer of this operation's output, never by this operation).

### `import-utility-statement`

One-sentence effect: imports one utility statement's rows into `household-energy-record` rows,
reconciling against a meter or bank row and holding any mismatch open.

- **Parameters**: `{ statementText: string, format: "csv" | "text", parserConfig: { utility: string, columnMap: object, dateFormat: string, sourceUrl: string }, meterReadings?: { date: string, kwh: string }[], bankRows?: { date: string, amount: string }[] }` — `parserConfig` is declared per-utility data, never per-utility code, mirroring `farolfi check --require-meta`'s policy-as-parameter shape.
- **Returns**: `HouseholdEnergyRecord[]`, each `witnessedValue` field's `mismatch` set when a `meterReadings`/`bankRows` entry disagrees with the statement.
- **Refusals**: `{ refused: true, reason: "unparseable-row", rowText: string }` for a row `parserConfig.columnMap` cannot resolve — the row is reported, never dropped silently.
- **Imports**: `@red-cup-engineering/file-services@0.2.1` only if reading `statementText` from disk is added at the CLI face; the pure parse itself takes text in.
- **MUST NOT**: hardcode a parsing rule for any named utility inside the script (every utility-specific column mapping is `parserConfig` data, admitted the same way `derive-set-of-candidate-transactions` admits its rule set); silently accept a statement total that does not foot against its own line items.

### `apps/solar-economics-cli.mjs`

Composes the seven operations above as one CLI/NDJSON face, in the shape of `consumption-hedge`'s
own `./cli` (`burn`, `position`, `book`, `mark`, `repay`, `status`): `price-directives`, `value`,
`yield-projection`, `observe-irradiance`, `joules-per-row`, `barrier`, `import-statement`. The app
holds no logic of its own — it parses arguments, calls exactly one script's export, and prints its
JSON output, per the import-stratification law (apps compose scripts and src; scripts never import
apps).

## Priced measures on the x402 gateway

Per the program carrier's "Money is the receiver" section, three of the operations above are the
first cash lane, sold by the call, mirroring the paid-ephemeris-gateway's own listing pattern
([README](../../../../../../../../../../../../../../public-services-section/services/public-computer-services-section/services/public-web-services-section/services/public-web-divination-services-section/services/astrology-services-section/services/astrology-emphemeris-services-section/README.md),
"Discovery" and "Live production configuration"):

| Route | Product | Request schema | Response schema |
|---|---|---|---|
| `POST /v1/solar/value-ledger` | Joule valuation of a submitted Beancount ledger (instrument 3.1) | `value-ledger-in-kilowatt-hours` parameters | `value-ledger-in-kilowatt-hours` returns |
| `POST /v1/solar/yield-projection` | Yield projection for a place (public irradiance data) | `derive-yield-projection` parameters | `derive-yield-projection` returns |
| `POST /v1/solar/joules-per-row` | Joules per settled row for a submitted receipt set (instrument 3.10) | `derive-joules-per-settled-row` parameters | `derive-joules-per-settled-row` returns |

Each route's request/response contract is exactly its operation's own JSON Schema — the gateway
adds no shape of its own. `X402_PAY_TO` MUST be a `wrangler secret`, resolved through the wallet
registry with custody verified, and MUST NOT appear as a source constant, config literal, or data
row — per the 2026-09-05 ruling
([payment-receivers-are-parameters-never-literals](../../../../../../../../../../../../../../561-group-services-section/data/records/2026-09-05-ruling-payment-receivers-are-parameters-never-literals.json))
and its enforcing check
([`check-set-of-hardcoded-payment-receivers.mjs`](../../../../../../../../computer-blockchain-system-services-section/services/key-management-services-section/README.md)).
`X402_NETWORK` and `X402_FACILITATOR` are deployment vars; settlement is verified by the
facilitator, never custodied by the gateway.

## Gates

Before any operation package is considered built:

- `node --test test/*.test.mjs` green in every package this specification names, exit status
  quoted verbatim.
- The import-stratification audit clean (`mcp__ops__workspace-package-conformance` or the
  equivalent workspace-import audit): no `scripts/` file imports an app; `apps/solar-economics-
  cli.mjs` is the only importer of more than one script package.
- `mcp__jsnode-server__jsnode_duplication` clean against every new function: no behavioral
  duplicate of an existing house function (the joule-conversion constants, the decimal helpers,
  and the Beancount valuation path are each consumed by exact pin, never re-authored).
- The fabrication line's own rule assay: one export per script, JSDoc/`--help` equivalence,
  admitted example/command-face equivalence, per the translate service's dialect.
- No direct `node:fs`, `node:path`, or `node:child_process` in a script where a house service
  already exists (`@red-cup-engineering/file-services@0.2.1`,
  `@red-cup-engineering/remove-path-service@0.1.0`), mirroring `read-ledger-report-service`'s own
  posture.
- Every record instance validated against its schema through
  `@red-cup-engineering/validate-json-schema-instance-service@0.1.1`
  ([README](../../../../../../../../../../computer-data-engineering-services-section/services/computer-data-serialization-services-section/services/json-services-section/services/json-schema-services-section/services/validate-json-schema-instance-service/README.md))
  before it is accepted as a test fixture or a gateway response.
- The publish gate (`publish-package` skill) run and its receipt recorded before any operation is
  listed on the x402 gateway.

## Open questions and non-goals

Each is stated so it can be closed by a named future lot, never left open by default.

- **Irradiance dataset admission** — closed by the measurement rows at
  [2026-09-05-solar-economics-incumbent-and-data-source-measurement.json](../../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-economic-operations-services-section/services/561-group-solar-economics-services-section/data/records/2026-09-05-solar-economics-incumbent-and-data-source-measurement.json):
  **NASA POWER** is admitted first (no account, key, payment, or identity requirement found on its
  first-party surface; daily `ALLSKY_SFC_SW_DWN` in kWh/m²/day from a point query against
  `https://power.larc.nasa.gov/api/temporal/daily/point`), **PVGIS** second (measured against the
  same properties). NREL PVWatts/NSRDB and Open-Meteo remain unadmitted candidates per those rows.
- **Tariff sources per utility** — `energy-tariff` records are hand-declared with a `sourceUrl` and
  `asOf` until Pyranometer supplies the band's region's utilities' rate schedules; closes per
  utility as each is researched and cited.
- **The entropy weld** — never claimed by this specification (see "Theory this realizes" above);
  remains a hypothesis with the working paper's falsifier 6 attached, not a build target.
- **Storage/battery accounting** — deferred. The program carrier's bootstrap rung 7 ("the hedge and
  the pool") is explicitly out of scope until rungs 2 through 5 hold; no schema here carries a
  state-of-charge or battery-cycle field.
- **Grid interconnection** — never in scope. No operation in this specification requests,
  negotiates, or automates a net-metering interconnection agreement or any signal to a grid
  operator; that is outward-facing regulatory and physical work no software here performs.
