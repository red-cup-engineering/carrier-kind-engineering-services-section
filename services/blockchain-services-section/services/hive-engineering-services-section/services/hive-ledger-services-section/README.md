# Hive Ledger Services Section

Hive Ledger Services realizes the Wallet Analyzer, Wallet Engine Analyzer, and
Synthesized Wallet Analyzer lines of the 2025-12-15 Hive Auto Ledger (HAL)
roadmap (`hive-services-section/content/text/documents/notes/hal/hive-auto-ledger-hal.md`):
`read-hive-account-history-service` reads a Hive account's mainnet operation
history from two independent public nodes, witnessed against each other, with
VESTS carried alongside HP at the chain's vests-to-HP ratio; `read-hive-engine-account-history-service`
does the same over Hive-Engine, composing `@red-cup-engineering/read-hive-engine-fill-service`
for market and pool fills rather than re-deriving them; `derive-hive-account-ledger-service`
is the pure transformation turning both histories plus price directives into a
costed Beancount ledger for the supported account operations, composing
`@red-cup-engineering/derive-set-of-fill-transactions-service` for venue fills;
`apps/hive-auto-ledger-cli.mjs` composes all three for one account and range,
writing the ledger and running `farolfi`'s balance and valuation reports over
it. Every read is read-only; no key is ever required or accepted.

The export retains observed histories, source refusals, derivation refusals and
balance disagreements in a `; hive-ledger-evidence` JSON comment in the same
Beancount file. Accounting validity does not prove complete history or resource
coverage. CLI output reports coverage separately; unresolved evidence or failed
accounting checks produce exit status 1 while retaining the export for recovery.
A refusal-free export still reports coverage as `not-established`, rather than
claiming that all personal commodities and resources have been accounted for.

## Source recovery and delivery boundary

This family is recovered into Red Cup's computer blockchain engineering source from Bare Cedar Fog commit `67f5f22c0c2f6c62de54aac403454e2328014a25`. It preserves Hive and Hive-Engine histories, fill derivation, account ledger derivation, schemas, historical financial knowledge and the CLI. Repository metadata identifies this source rather than treating the laptop snapshot as its owner. The fill reader uses the declared JavaScript operation export rather than traversing the snapshot directory tree.

This is staged source recovery. Existing snapshot consumers remain in place pending migration. The six external workspace dependencies (computer data engineering, Farolfi, file services, Hive blockchain client, JavaScript Node services and Metrologic) still require their actual upstream distribution bindings. Their declared names returned 404 from the public npm registry during recovery; that observation does not establish absence from other distribution carriers. Verification used the installed snapshot dependency closure with recovered accounting modules, without publishing packages or activating a node release.

Accounting validity and history coverage are separate. Delivered ledger evidence retains unknown operations, source refusals and exact observations. A balanced ledger with unresolved coverage must not be represented as a complete account. This recovery does not yet establish Actor hiring, Board admission, unified personal accounting, Sign primitive composition or production completeness.
