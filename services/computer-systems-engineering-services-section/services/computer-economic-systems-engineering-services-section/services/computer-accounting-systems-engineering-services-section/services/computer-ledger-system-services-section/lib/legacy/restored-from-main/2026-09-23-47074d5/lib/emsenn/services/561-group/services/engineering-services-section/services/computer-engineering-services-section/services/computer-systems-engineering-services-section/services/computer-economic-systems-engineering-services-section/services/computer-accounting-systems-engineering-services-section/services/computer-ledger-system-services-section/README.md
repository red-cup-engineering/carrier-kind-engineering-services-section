# Computer Ledger System Services Section

This section holds computer systems that read, reconcile, and report ledger
state. The accounting model and report readings are maintained by
`@red-cup-engineering/agentic-organization-engine`; applications here consume that model rather
than defining a second one.

## Applications

- [`./apps/farolfi`](apps/farolfi) — a command-line application that reads
  Beancount and hledger journals and exposes the maintained accounting reports.

## Scripts

- `scripts/derive-set-of-chain-balance-assertions.mjs` — observes Hive,
  Hive-Engine, and Base-native chain state and writes Beancount `balance`
  directives.
- `scripts/derive-set-of-price-directives.mjs` — writes Beancount `price`
  directives from CoinGecko and Hive-Engine market data.
- `scripts/derive-set-of-candidate-transactions.mjs` — derives one candidate
  Beancount transaction per chain-vs-book reconciliation mismatch, dated the
  day before the assertion, posting the exact delta to a rule-chosen
  `Income:Investment:Unrealized-Gains` or `Expenses:Investment:Unrealized-Losses`
  counter-account and carrying the chain source id as `source_id` metadata.
  Specification admitted through the jsnode fabrication line
  (`content/text/documents/specifications/derive-set-of-candidate-transactions.md`);
  the line's own package-creation phase refused on an unrelated defect
  (admitted as a friction), so the admitted operation and test source were
  landed directly rather than re-authored.
- `scripts/derive-set-of-card-purchase-transactions.mjs` — applies the
  two-book law to a `CardPurchaseSet` record, deriving one Beancount
  transaction per in-boundary, priced purchase for a given reporting entity
  (capitalizing to the fixed-asset register, expensing, or booking a
  related-party receivable/payable as the two-book law dictates), and
  listing unpriced or out-of-boundary rows separately. Specification
  admitted through the jsnode fabrication line
  (`content/text/documents/specifications/derive-set-of-card-purchase-transactions.md`).
- `scripts/derive-set-of-fixed-asset-registrations.mjs` — derives one
  fixed-asset register entry (an `open` plus a register `note` when
  capitalized, a register `note` alone when expensed) per `CardPurchaseSet`
  row owned by a given reporting entity and carrying an `assetId`, mirroring
  the ledger's own `BCF-LAPTOP-001` register-note convention. Specification
  admitted through the jsnode fabrication line
  (`content/text/documents/specifications/derive-set-of-fixed-asset-registrations.md`).
The two reading operations formerly hand-written here
(`scripts/read-ledger-report.mjs`, `scripts/read-set-of-ledger-readings.mjs`)
are retired; their behavior is now carried by
`services/read-ledger-report-service` and
`services/read-set-of-ledger-readings-service` below, fabricated through the
jsnode fabrication line and admitted to this section's FERN
(`data/state/world.eavt`) via `frog admit`.

## Services

- [`./services/read-ledger-report-service`](services/read-ledger-report-service) —
  reads one Farolfi accounting report (`balance`, `balance-sheet`,
  `income-statement`, `cashflow`, `register`, `accounts`, `stats`, `lots`,
  `valuation`, `reconcile`, `check`) from a journal named by `{ path }` or
  inline `{ text, format? }`, composing `@red-cup-engineering/farolfi`'s
  `dispatch` and `detectJournalFormat` by exact pin, with
  `@red-cup-engineering/file-services` and
  `node:fs/promises` for every filesystem access the
  operation itself performs. Returns Farolfi's own `-o json` report shape
  merged with `{ kind: "ledger-report", report, journal, generatedAt }`
  (`generatedAt` is `input.now` when given, for reproducible fabrication
  examples and tests); no balance, settlement, or rendering logic of its
  own. Fabricated through the jsnode fabrication line from
  `content/text/documents/specifications/read-ledger-report.md` and
  published as `@red-cup-engineering/read-ledger-report-service`.
  `561-group-main-ledger.beancount`'s `reconcile` report now reads
  `malformed: 0` — Farolfi 0.1.13's `parseJournalFile` expands the book of
  record's glob `include` directives (fixed after the 0.1.12 friction this
  README used to carry).
- [`./services/read-set-of-ledger-readings-service`](services/read-set-of-ledger-readings-service) —
  the collection lift a books page needs in one call: balance sheet, income
  statement, the reconcile worklist, journal statistics, and the account
  list, each read via `@red-cup-engineering/read-ledger-report-service`
  against the same journal by exact pin. Fabricated through the jsnode
  fabrication line from
  `content/text/documents/specifications/read-set-of-ledger-readings.md`
  and published as `@red-cup-engineering/read-set-of-ledger-readings-service`.
- [`./services/derive-set-of-energy-price-directives-service`](services/derive-set-of-energy-price-directives-service) —
  derives Beancount `price` directives, forward and inverse, for `KWH` (from a
  declared electricity tariff), `PROPANE_GAL`, and `DIESEL_GAL` (each from the
  latest row of a weekly price series at or before the reporting date — the
  EIA's keyless per-series CSV/XLS export, or a recorded-response fixture),
  so a ledger can be valued in energy as well as USD (the joule ledger of
  `561-group-finance-operations-services-section`'s 2026-09-05 note on
  fintech under energy descent, section 3.1). Fabricated through the jsnode
  fabrication line from
  `content/text/documents/specifications/derive-set-of-energy-price-directives.md`
  and published as `@red-cup-engineering/derive-set-of-energy-price-directives-service`,
  depending on this section's own `src/decimal.mjs` (`divideDecimalStrings`)
  and `src/beancount-render.mjs` (`renderPriceDirective`'s `quoteCommodity`)
  by exact pin.

Historical Farolfi and journal-codec captures remain under `lib/legacy/` as
recovery evidence. They are not runtime dependencies.
