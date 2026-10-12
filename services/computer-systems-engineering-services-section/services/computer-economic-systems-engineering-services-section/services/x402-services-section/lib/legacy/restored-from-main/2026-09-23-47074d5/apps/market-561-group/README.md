# market.561.group

The one x402 market of the 561 Group.
This app composes the market engine (`@red-cup-engineering/x402-market-service`) over the catalog in `data/records/catalog.json`.
It carries no compute of its own: every offer names the typed operation it sells by package, export, and argument projection (its `compute` binding) and, where a request must be admitted before it is priced, the admission function the same way (its `validate` binding).
The engine resolves each binding by import from this app's own dependency graph.

Founder, 2026-09-11: "accepting payment for a compute" is one upstream capability over typed operations; there is one shared platform, market.
561.group, and no per-compute gateway, domain, or cloud runner.
This app is that platform's deployment.
The ephemeris, pacing, value-chain, and orphan-patch gateways that each carried their own transport, witness, and facilitator selection were deleted on that ruling; their offers are rows of this catalog and their evidence records live under `data/records/legacy/`.

## What is for sale

Every row of the catalog is one priced route on this origin: 27 offers over 11 gateways, 20 of them live on the edge face today and the seven `runtime: "node"` offers awaiting the Node runner.
The catalog is served unpriced at `GET /v1/catalog` with each offer's contract, price, evidence, and compute owner; the A2A agent card at `/.well-known/agent-card.json` carries one skill per offer; `/v1/status` and `/healthz` are the probes; `/` is the public page.

| Gateway | Operation | Route | Price |
| --- | --- | --- | ---: |
| ephemeris | moment | `GET /v1/ephemeris/moment/{date}` | $0.04 |
| ephemeris | precision-moment | `GET /v1/ephemeris/precision-moment/{date}` | $0.32 (Node runner only) |
| astronomy | astronomy-positions | `GET /v1/astronomy/positions/{date}` | $0.04 |
| astronomy | astronomy-precision-positions | `GET /v1/astronomy/precision-positions/{date}` | $0.32 (Node runner only) |
| x402-market-observation | market-observation | `GET /v1/x402-market/observation` | $0.10 |
| pacing-intelligence | analyze-pacing | `POST /v1/pacing/analysis` | $0.05 |
| pacing-intelligence | estimate-heart-rate-threshold | `POST /v1/pacing/heart-rate-threshold` | $0.01 |
| jsnode-package-vulnerability-triage | score-orphan-patch-candidates | `POST /v1/orphan-patch/score` | $0.02 |
| base-chain | address-balance | `GET /v1/base-chain/balance` | $0.001 |
| base-chain | gas-oracle | `GET /v1/base-chain/gas-oracle` | $0.001 |
| base-chain | transaction-lookup | `GET /v1/base-chain/transaction` | $0.002 |
| trashpanda | pre-sign-conformance | `POST /v1/pre-sign/conformance` | $0.03 |
| trashpanda | market-action-admission | `POST /v1/market-action/admission` | $0.04 |
| inference | meter-inference | `POST /v1/inference` | $0.001 |
| brokerage-control | issuer-evidence | `POST /v1/issuer-evidence` | $0.25 |
| brokerage-control | aggressive-alpha | `POST /v1/aggressive-alpha` | $1.00 |
| brokerage-control | paper-intent | `POST /v1/paper-intent` | $2.00 |
| brokerage-control | account-reconciliation | `POST /v1/reconcile` | $0.50 |
| brokerage-control | daily-divination-reading | `POST /v1/divination/daily-reading` | $0.08 |
| brokerage-control | report-graphic-render | `POST /v1/report-graphics/render` | $0.12 |
| brokerage-control | occupation-entropy | `POST /v1/occupation-entropy` | $0.01 |
| brokerage-control | strategy-synthesis | `POST /v1/strategies/synthesize` | $15.00 |
| medical-glossary | term | `GET /v1/medical-glossary/term/{identity}` | $0.01 |
| medical-glossary | neighborhood | `GET /v1/medical-glossary/neighborhood/{identity}` | $0.03 |
| medical-glossary | search | `GET /v1/medical-glossary/search` | $0.02 |

The gateway column is a catalog grouping and the income-account key (`Income:Sales:X402:<Gateway>`), not a process: one process serves them all.
Prices carry up to six decimals (USDC's precision) and convert to atomic units exactly.
An offer is `runtime: "node"` when its compute needs a Node host: the two DE440 precision computes (a pinned binary) and the five A2A-dispatching operations whose packages read schema files at load.
The retired per-compute sellers whose offers these rows now carry: paid-ephemeris-gateway, paid-pacing-intelligence-gateway, paid-value-chain-gateway, paid-orphan-patch-triage-gateway, base-chain-data-gateway's Worker, blockchain-trashpanda's x402 service, metered-inference-tollbooth's transport, and coinbase-x402-bazaar-border's server; each package keeps only its operations.
## Adding an offer

An offer MUST be added as one catalog entry and one exact dependency pin, and MUST NOT be added as a new package, transport, domain, or runner.
The entry is an offer declaration (`x402-services-section/data/records/schema/offer.schema.json`) whose `compute` binding names a function of a published package; the function MUST be pure over its arguments, or take its effects only through the `env` argument path.
A `validate` binding SHOULD throw `TypeError` or `RangeError` on a malformed request so the market refuses it (422) before any payment challenge; a body schema on the declaration is refused earlier still (400).
Routes and gateway/operation pairs MUST be unique across the catalog; `declareCatalog` refuses a collision at load.

## Running

The market has two faces over the same catalog and engine.

The **Node runner**, `scripts/serve-market.mjs`, serves the whole catalog: it starts the filesystem witness-journal provider beside the market, listens on the Node transport behind one trusted proxy hop, and journals ready and stopping events.
`data/records/systemd/market-561-group.service` runs it on a Node host. `lib/container/` retains the portable container build and pinned ephemeris binary; Google Cloud deployment scripts have been removed.
The DE440 precision offers need `OXIEPH_BIN` and `OXIEPH_DE`, which the container image supplies; they are declared `runtime: "node"` in the catalog.

The **edge face**, `src/worker.mjs` with `wrangler.jsonc`, serves every offer not declared `runtime: "node"` from Cloudflare Workers on the same origin, market.
561.group, with PayAI's keyless facilitator.
It is what serves the domain while the Node runner has no public host (the Google Cloud project's billing was disabled on 2026-09-11; see `data/records/2026-09-11-executive-decision-edge-face-first.json`).

Either face takes every settlement-affecting value from the deployment (`X402_NETWORK`, `X402_FACILITATOR`, `X402_PAY_TO`, optionally `X402_ASSET`); the source carries none, and `X402_PAY_TO` is the ruled payout address supplied as a secret.
`MARKET_RUNTIME=edge` selects the edge catalog; the Node runner serves all.
## Settlement and the books

Every settlement is attributed by the kernel's `settlementWitness` to the catalog entry that earned it (gateway, operation, sku) and, when a witness journal is bound, appended by `src/settlement-journal.mjs` as one `X402SettlementWitness` document under the shared graph identity.
The comptroller's paid-sellers catalog is derived from this catalog by `scripts/derive-paid-sellers.mjs` and MUST NOT be hand-edited.

## The compiled catalog

A fetch-handler host allows a few milliseconds of CPU per request and resolves no module specifier at runtime, so the edge face serves a compiled catalog and derives nothing on a request.
`scripts/compile-catalog.mjs` writes three records from `data/records/catalog.json`, and the app test refuses a stale one:

- `data/records/catalog-identities.json`: every offer's content identities (sku, cell, law), which the edge loads with `admit: false` instead of hashing each declaration (about 28 ms an offer on a warm host).
- `data/records/catalog-readouts.json`: the catalog readout and the agent card of each face on the production rails, served as given.
- `src/edge-bindings.mjs`: the static module map of every compute and validate binding the edge serves, generated, because a bundle cannot import by name at runtime.

Admission on the edge is the offer's `validate` binding plus content-type and size; the Ajv body-schema stage is a Node-face check, since a Workers isolate refuses code generation.
Run the compiler after every catalog change.

## Listings

`scripts/derive-402index-registrations.mjs --runtime edge --contact-email <address>` derives the 402index registration body of every offer a face serves, in the field names 402index's OpenAPI document declares, from the same catalog; the receipts of the registrations made are `data/records/2026-09-12-402index-registration-receipt.json`.
A node-only offer is registered only once the Node runner answers for it.
Listings the retired per-compute runners made under their own hostnames cannot be deleted without re-serving those hostnames for a domain claim, so they are left to the index's health probes.
