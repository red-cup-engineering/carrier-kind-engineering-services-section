# Farolfi

Farolfi is Red Cup Engineering's command-line application for reading and
reporting accounting journals. It accepts Beancount and hledger/ledger text,
then delegates ledger settlement and every report to
`@red-cup-engineering/agentic-organization-engine`.

Farolfi owns only representation and process boundaries: journal decoding,
include resolution, command-line arguments, stdin/file input, and rendered
output. It does not implement balances, double-entry conservation, account
trees, financial statements, or contradiction handling.

```sh
farolfi balance main.beancount
farolfi bs main.beancount
farolfi is main.beancount --begin 2026-01-01 --end 2027-01-01
farolfi check main.beancount
farolfi check main.beancount --require-meta source_id
farolfi convert main.beancount --to hledger
farolfi valuation main.beancount --reporting-commodity KWH
farolfi intake main.beancount received.beancount > accepted.beancount
```

`intake` reads an existing book and one or more proposed receipt journals. It
prints only newly accepted transactions, so its output can be reviewed as an
include before changing a book. Re-running the same candidate against the
accepted include reports a duplicate and prints no transaction. Each candidate
uses scalar Beancount metadata: `source_id: "provider:event"` and
`evidence_ids: "[\"ni:///sha-256;receipt\"]"`. The latter is one JSON-encoded
string so it round-trips through ordinary journal metadata. The postings carry
recognition explicitly: advance cash credits a contract liability, while a
receivable collection reduces receivables; neither becomes revenue merely from
receipt intake.

`--begin` is inclusive and `--end` is exclusive for every dated report. Thus
`--begin 2026-01-01 --end 2027-01-01` selects the 2026 reporting period without
admitting a transaction or price dated 2027-01-01. Historical `lots` and
`valuation` reports re-settle the original journal at that cutoff; they do not
apply an old quote to the current position. `valuation` reports in USD by
default; `--reporting-commodity <COMMODITY>` selects a different target
commodity, using the journal's own price directives (forward and inverse) to
convert each position.

The `cashflow` command reports movement in `Assets:Cash` by default. It is not,
by itself, a classified statement of cash flows: operating, investing, and
financing presentation requires an account selection or journal structure that
actually carries those classifications.

`check --require-meta <key>` adds an explicit journal-policy check without
changing ledger settlement. It exits nonzero and identifies every transaction
missing that metadata key, while the ordinary accounting worklist remains
renderable. This lets an operating book require evidence locators such as
`source_id` without hard-coding one institution's policy into the ledger engine.

The name refers to the Giovanni Farolfi & Company ledger from Salon,
1299–1300, among the oldest surviving double-entry books.
