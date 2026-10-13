> **Source authority correction · 2026-10-13**
>
> The public **market.561.group site, published catalog, Worker, UI and shop/discovery presentation**
> are now owned by **[causeway-services/market.561.group](https://github.com/causeway-services/market.561.group)**.
> The copy in this engineering monorepo is retained temporarily as a **legacy Node
> deployment/state-carrier and migration reference**, not another independent merchant,
> catalog authority, or site source to enhance. Do not fix site/UI/catalog defects here.
>
> Red Cup continues to own the independent `@red-cup-engineering/x402-services-section`
> payment protocol, SDK/Bazaar, facilitator and settlement evidence implementation.
> Do not remove the old Node process until the new site's compiled compute imports,
> live `/v1/catalog`, all listed 402 challenges, paid byte delivery, append-only
> settlement journal, R2/credential custody, and independent receiving are preserved.
> A source-copy audit or successful unsigned GET is **not** sufficient for cutover.
> The standalone buyer `red-cup-engineering/x402-exact-purchase-service` and
> the embedded buyer source also remain divergent; unify package identity only
> after cross-workspace dependency and witness-history qualification.
> Preserve historical content-addressed references while decommissioning replicas.

> **Public-site ownership:** As of 2026-10-13, Causeway Public Services
> / Public Agent Services owns the market.561.group public site, targeted at
> `causeway-services/market.561.group`. This Red Cup directory remains the
> **operational transition adapter** and reusable x402 seller/compiled catalog
> source until an independently received Causeway deployment replaces it.
> Do not create new site features or a second authoritative catalog here.
> Do not delete the running edge/Node entrypoints or settled records before
> the public cutover is independently received.

# market.561.group

The one x402 market of the 561 Group.
This deployment composes the sibling `./market` module over `data/market-561-group/records/catalog.json` in the one `@red-cup-engineering/x402-services-section` package.
It carries no compute of its own: every offer names the typed operation it sells by package, export, and argument projection (its `compute` binding) and, where a request must be admitted before it is priced, the admission function the same way (its `validate` binding).
The engine resolves each binding by import from the x402 package's dependency graph.

Founder, 2026-09-11: "accepting payment for a compute" is one upstream capability over typed operations; there is one shared platform, market.
561.group, and no per-compute gateway, domain, or cloud runner.
This app is that platform's deployment.
The ephemeris, pacing, value-chain, and orphan-patch gateways that each carried their own transport, witness, and facilitator selection were deleted on that ruling; their offers are rows of this catalog and their evidence records live under `data/market-561-group/records/legacy/`.

## What is for sale

Every row of the catalog is one priced route. The public `/v1/catalog` is the authoritative list of offers served by the deployed runtime; `runtime: "node"` offers are computed by the Node runner, to which the edge face proxies them.
The catalog is served unpriced at `GET /v1/catalog` with each offer's contract, price, evidence, and compute owner; the A2A agent card at `/.well-known/agent-card.json` carries one skill per offer; `/v1/status` and `/healthz` are the probes; `/` is the public page.

Buyers can start at `/`: each offer shows an unsigned curl request, input
contract, response format and example, and any declared evidence limitations.
`GET /v1/catalog` exposes the same inputs as `request` (schemas and an HTTP
example) and the response `mimeType`. The request URL combines the declared
probe URL with its query example; an unresolved path template is reported as
`null` instead of presented as runnable. These examples come directly from
the offer declarations and can include placeholders that buyers must replace.
The purchase guide links the standard x402 JavaScript client. No new checkout
service or separately maintained request catalog is involved. Configured
settlement network and asset are visible before the first paid request.

The catalog’s gateway is a grouping and the income-account key (`Income:Sales:X402:<Gateway>`), not a process: one process serves them all.
Prices carry up to six decimals (USDC's precision) and convert to atomic units exactly.
The `/v1/data/` offers sell bounded CSV/JSON and JSON Lines conversion, RFC 8785
canonical JSON, RFC 6901 selection, RFC 7396 merge patch and strict RFC 4648
Base64/byte-array conversion, TOML/YAML validation and JSON conversion, URL/form conversion, and content naming/verification for
$0.0012 per call.
They execute on the existing edge Worker with no model or upstream API.
The commodity price covers CDP's published $0.001 onchain settlement fee beyond
its monthly free tier; it does not assume that free settlement scales forever. Their
codec packages own the computation; the catalog supplies runnable examples,
input and output contracts, and the official Bazaar extension. Bad input is
refused before payment, with the same interpreted body schemas on Node and edge.
Byte conversion supports 65536 decoded bytes; its encoding offer allows 300000
request bytes for the JSON array overhead, and a host may apply a smaller ceiling.
Directory registration and first settled purchases
are distinct: a service being listed does not prove anyone has bought it.
Each listed offer serves its derived descriptor at
its route followed by /.well-known/x402-service.json. This gives directories
the public origin proof they require for updates; prices and names come from
the same declaration that executes the request.
The origin discovery document carries each offer's name and input schema;
true402's twenty-capability origin summary retains every offer's capabilities
in its service rows.
An offer is `runtime: "node"` when its compute needs a Node host: the two DE440 precision computes (a pinned binary) and the five A2A-dispatching operations whose packages read schema files at load.
The retired per-compute sellers whose offers these rows now carry: paid-ephemeris-gateway, paid-pacing-intelligence-gateway, paid-value-chain-gateway, paid-orphan-patch-triage-gateway, base-chain-data-gateway's Worker, blockchain-trashpanda's x402 service, metered-inference-tollbooth's transport, and coinbase-x402-bazaar-border's server; each package keeps only its operations.
## Adding an offer

An offer MUST be added as one catalog entry and one exact dependency pin, and MUST NOT be added as a new package, transport, domain, or runner.
The entry is an offer declaration (`x402-services-section/schemas/offer.schema.json`) whose `compute` binding names a function of a published package; the function MUST be pure over its arguments, or take its effects only through the `env` argument path.
A `validate` binding SHOULD throw `TypeError` or `RangeError` on a malformed request so the market refuses it (422) before any payment challenge; a body schema on the declaration is refused earlier still (400).
Routes and gateway/operation pairs MUST be unique across the catalog; `declareCatalog` refuses a collision at load.

## Running

`scripts/configure-cloudflare.mjs` keeps Browser Integrity Check disabled only
for `market.561.group`, so ordinary Python and other HTTP clients can reach the
catalog and x402 payment challenges. It requires a token with **Zone Read** and
**Config Settings Write** on the `561.group` zone, supplied through
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID`. Run it under the Cloudflare
section's `scripts/with-cloudflare-token.mjs` to obtain and revoke a temporary
credential automatically. It creates or updates only the rule with reference
`market_561_machine_buyers`, verifies the saved rule, and makes no change when
that rule already matches. Other rules and the zone-wide setting are preserved.

The market has two faces over the same catalog and engine.

The **Node runner**, `scripts/serve-market.mjs`, serves the whole catalog: it starts the filesystem witness-journal provider beside the market, listens on the Node transport behind one trusted proxy hop, and journals ready and stopping events. It runs on Cold Red Gate at `node-market.561.group:8087` (the Worker's `NODE_MARKET_ORIGIN`) and answers each node offer's payment challenge itself, so the edge face only forwards those requests. `lib/container/` retains the portable container build and pinned ephemeris binary, while the previous Google Cloud deployment machinery is gone.
The DE440 precision offers need `OXIEPH_BIN` and `OXIEPH_DE`, which the container image supplies; they are declared `runtime: "node"` in the catalog.

The **edge face**, `src/worker.mjs` with `wrangler.jsonc`, serves every offer not declared `runtime: "node"` from Cloudflare Workers on the same origin, market.
561.group, with PayAI's keyless facilitator.
It is what serves the domain, and proxies `runtime: "node"` offers to the Node runner on Cold Red Gate (the Google Cloud host ended when its billing was disabled on 2026-09-11; see `data/records/2026-09-11-executive-decision-edge-face-first.json`).

Either face takes every settlement-affecting value from the deployment (`X402_NETWORK`, `X402_FACILITATOR`, `X402_PAY_TO`, optionally `X402_ASSET`); the source carries none, and `X402_PAY_TO` is the ruled payout address supplied as a secret.
The offer's explicit atomic price includes the token's signing domain from the
official x402 asset registry. Base USDC uses `USD Coin`, version `2`; Base Sepolia
uses `USDC`, version `2`. Without these fields, a standard x402 client cannot sign
the payment. A custom six-decimal EIP-3009 token must also supply
`X402_ASSET_NAME` and `X402_ASSET_VERSION`; another token never inherits USDC's domain.
`MARKET_RUNTIME=edge` selects the edge catalog; the Node runner serves all.
## Wallets that use offers without paying

`data/market-561-group/records/access-grants.json` names the wallets that
may use offers for free:

```json
{ "type": "MarketAccessGrants", "version": 1, "grants": [
  { "account": "eip155:8453:0x…", "operations": ["the-x402-economy"],
    "note": "why", "grantedBy": "who", "grantedAt": "2026-09-27", "until": "2026-12-31" } ] }
```

Each grant names:

- an account: CAIP-10 for one chain, or a bare `0x…` address for every EVM
  chain;
- `operations`: the catalog's operation ids, or `"*"` for all;
- `until`: an optional end date.

A wallet proves it holds the account with x402's sign-in-with-x. Every 402
this market answers offers the challenge under
`extensions["sign-in-with-x"]`. A wallet that signs it (an EOA, or an
ERC-1271 contract wallet on Base) and holds a grant for the offer is served
without paying, with `x402-access: grant`.

Sign-in is on when the deployment binds `X402_SIGN_IN_SECRET` (`wrangler
secret put`). A changed grants record takes effect on the next deploy.

## Recovering a paid publication

The Handbook and Koios briefing declare `recoverable: true` in the same offer
catalog. Their exact response bytes are stored privately before settlement in
`MARKET_SETTLEMENTS`, keyed by the EIP-3009 network, asset, payer, and nonce.
An atomic conditional write reserves that authorization for one exact request.
Only its original signature, private recovery token, accepted payment terms,
and request digest can retrieve the result. Raw
payment signatures and submitted request bodies are not retained by the seller.

Before submitting payment, generate a random 32-byte hexadecimal token and
send it as `X-Payment-Recovery`. Save it privately alongside the signed request;
the buyer CLI does this automatically. A payment signature becomes public on
the chain, so it is not sufficient as a recovery credential. Signed publication
requests without this private token are refused before payment.

Use the official-client-backed buyer command for a new purchase; set
`X402_BUYER_PRIVATE_KEY` in the environment first. The Koios briefing is capped
at 250,000 USDC atomic units ($0.25):

```sh
purchase-market-publication \
  --url https://market.561.group/v1/koios/briefing/current \
  --max-amount-atomic 250000 \
  --output ./koios-briefing.json \
  --recovery-file ./koios-briefing.purchase.json
```

The buyer writes the exact signed request and its random recovery token to the
mode-0600 recovery file before sending payment. On interruption, resume that
same request without the private key:

```sh
purchase-market-publication --resume ./koios-briefing.purchase.json
```

Success writes the publication bytes to the selected output and the decoded
`PAYMENT-RESPONSE` receipt beside it. The command only accepts the Handbook and
Koios publication URLs, and refuses a challenge above the supplied cap.

Repeat the identical URL, method, body, `X-Payment-Recovery`, and `PAYMENT-SIGNATURE` after an
interrupted delivery. A completed purchase returns its original bytes and
`PAYMENT-RESPONSE`, even if the current publication has changed or disappeared.
Do not create another signature to recover a purchase: that is a new payment.
A conflicting request returns 409; an unresolved settlement returns 503 with
`Retry-After`. If two independent Base providers establish that the authorization
expired without settlement, recovery returns 410. The buyer can then authorize
a new purchase. Keep the saved request private: its recovery token is the retrieval credential.

If the worker stops after the payment is mined but before saving the receipt,
recovery corroborates the authorization nonce and exact USDC transfer in the
successful receipt through two Base RPC providers. It then completes the same
purchase and seller witness. An unavailable or conflicting chain observation
never grants access. Recovery covers Base EIP-3009 authorizations valid for at
most one hour and publication responses up to 16 MiB. Existing stateless API
computations do not opt in and retain no customer responses.

The private purchase record replaces the transient-only publication response;
there is no additional checkout service, public bucket, or per-product worker.

## Settlement and the books

The edge market writes each completed settlement witness to its private
`market-561-group-settlements` R2 bucket under a transaction-derived key. The
record names the settled offer, gateway, SKU, amount, network, transaction,
and payer. Repeated settlement callbacks cannot overwrite the first record.
The bucket is not served to buyers. A storage failure is logged and does not
withhold a paid result; such a failure still needs operator reconciliation
against the chain and Worker logs.

The existing OPS financial-readout producer consumes only the bucket's
`settlements/` records. It checks offer attribution and price against this
catalog, payout rails against the live payment challenge, and the exact USDC
transfer and containing block against two independent Base providers before
appending to the Group ledger. The transfer-derived `source_id` prevents a
repeat booking. The readout distinguishes an empty bucket from unavailable
evidence and refused records. Private publication bodies and recovery
credentials are not inputs to accounting.

Every settlement is attributed by the kernel's `settlementWitness` to the catalog entry that earned it (gateway, operation, sku). Its deterministic `witnessId` is also sent to a bound `WITNESS_SINK_URL`, so a durable receiver can de-duplicate retries; a non-success response is logged without withholding the paid response. The Node face appends the same evidence through `src/settlement-journal.mjs` as one `X402SettlementWitness` document under that shared graph identity. A receiver-level chain scan can establish only market-level revenue, never the catalog entry.
The comptroller's paid-sellers catalog is derived from this catalog by `scripts/derive-paid-sellers.mjs` and MUST NOT be hand-edited.

## The edge binding map

The catalog is the sole declaration: both faces derive its identities, catalog readout, and agent card directly from it. A fetch-handler bundle still cannot import a binding by name at runtime, so `scripts/compile-catalog.mjs` generates one artifact, `src/edge-bindings.mjs`, the static module map of every compute and validate binding the edge serves. Run it after changing an edge offer.

Admission on the edge is the offer's `validate` binding plus content-type and size; the Ajv body-schema stage is a Node-face check, since a Workers isolate refuses code generation.
Run the compiler after every catalog change.

## Listings

`scripts/derive-402index-registrations.mjs --runtime edge --contact-email <address>` derives the 402index registration body of every offer a face serves, in the field names 402index's OpenAPI document declares, from the same catalog; the receipts of the registrations made are `data/records/2026-09-12-402index-registration-receipt.json`.
A node-only offer is registered only once the Node runner answers for it.
Listings the retired per-compute runners made under their own hostnames cannot be deleted without re-serving those hostnames for a domain claim, so they are left to the index's health probes.

HTTP structured-field conversion/validation follows RFC 9651 with tagged JSON values and ordered maps; Content-Digest generation/verification supports RFC 9530 SHA-256/SHA-512 over exact message-content bytes. These five offers use the same Worker and native payment rail at $0.0012 per call. Their descriptions distinguish syntax validation, conversion, digest matching and authentication.

Two binary offers, /v1/data/compress and /v1/data/decompress, cover native gzip, zlib and raw DEFLATE at $0.0012 per call. Their public contracts include executable media-typed Base64 examples, explicit format selection, byte counts and 65536-byte input/output bounds. Malformed streams and excessive expansion are refused before payment.

Native JSON Schema meta-validation/reference checking and instance validation are purchasable at /v1/data/json-schema-check and /v1/data/json-schema-validate for $0.0012 per call. The published contracts distinguish evaluated=false compilation/graph diagnostics from valid=false instance judgments, preserve native BASIC locations, require an explicit reference corpus, and make format assertion an opt-in. No ambient HTTP or filesystem retrieval is available.
