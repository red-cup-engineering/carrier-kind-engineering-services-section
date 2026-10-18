# x402 Services Section

This sovereign protocol provider supplies the Union's x402 v2 HTTP payment boundary using the official `@x402/*` implementation.
Customers supply one explicit route set, CAIP-2 EVM network, price/payee terms, and contracted facilitator.
The provider returns the standard middleware and settlement hook; it neither owns the customer's operation nor keeps an ambient payment ledger.

`exact` is the minimal default through the official x402 EVM implementation.
`batch-settlement` is opt-in and requires its separate receiver and channel state.
Facilitators accept the official `FacilitatorEvmSigner` shape without inventing a mandatory account-abstraction or semantic-database dependency.

The `./resource-observation` export assays one public x402 v2 challenge without paying.
The `./public-service-market-listing` export additionally verifies one signed A2A 1.0 Agent Card and admits a listing only when exactly one skill, sovereign circuit-law identity, Bazaar declaration, and EVM payment alternative match the customer's declared seller policy.
The returned listing and nested evidence are deterministically identified and immutable.

This section does not host a marketplace.
A customer such as `market.561.group` settlement may hire the admission circuit after that settlement has production authority and supplies its public endpoints and exact seller policy.
Payout addresses are never inferred from environment files; using the Ephemeris payee means supplying the same public `payTo`, network, and asset policy to both boundaries.
The Union Alpha deployment uses its own facilitator and EIP-3009 asset; no hosted facilitator owns settlement.

## One reusable payment and offer supplier

This package supplies the x402 v2 payment server, Fetch boundary, unpaid
resource observation, typed offer and catalogue, recovery and corroborated
settlement readouts. It does not ship the 561 Group merchant application,
compiled seller inventory, Cloudflare deployments or marketplace CLIs.

The canonical seller, its 131 authored offer declarations, current compiled
identities, MCP, Node/Worker entries, tests and live release configuration
belong to [Causeway's market.561.group](https://github.com/causeway-services/market.561.group).
Historical Engineering seller records and Git source revisions remain
recoverable without packaging a second marketplace. This source retirement
does not claim the remote Node host was activated or any payment received.

Customer product implementations and runtime packages belong to the customer.
The shared signed-quote tariff test uses its own merchant fixture rather
than requiring the 561 Group's historical 600 KB catalogue.

## One x402 collection

There is one package, `@red-cup-engineering/x402-services-section`, and one payment-boundary implementation. Its distinct operations are modules, not separately published services:

- `./market` is the reusable seller boundary, not a merchant deployment. The
  canonical 561 Group merchant and its `data/catalog.json` belong to
  `causeway-services/market.561.group`.
- `./market-observation/*` reads settlement facts; `./settlement-derivation/*` corroborates seller settlements.
- `./hbd/*` realizes the HBD scheme; `./hive/exit-tightness` exposes the one Hive product adapter.
- `./x402-settlement-evidence` retains facilitator observations bound to the signed payment; `./resource-observation` is the single canonical, unpaid public x402 observer.

Product implementations that merely happen to be sold through x402 stay with their own product domain; they are consumers of this boundary, not a second x402 implementation.

## Priced capability result privacy

A priced capability must now explicitly supply `createPublicReference`, `recoverPublicReference`, and `projectPublicResult`.
The boundary persists the reference in the invocation intent before payment middleware runs, rebuilds its lookup from recovered intents, and exposes only the caller's projected status at the result route.
Raw intents, settlement evidence, and terminals remain private to the injected durable lifecycle unless a consumer deliberately projects particular fields.

A reference factory and recovery policy are consumer policy.
A publishing job uses an independently generated opaque reference and a minimal status projection.
The paid-data endpoint deliberately retains its documented payment-hash result route and terminal-visible public-data policy, including recovery of records created before this version.

Reference reservation deduplicates concurrent retention calls within one boundary process and does not publish a lookup until the caller's `append` has completed.
The caller still owns cross-process exclusion, durable append atomicity, recovery, and idempotence of the effect after settlement.
This boundary does not claim crash-exactly-once production.

## The merchant is a consumer, not part of Networking

`./offer`, `./market`, `./resource-observation`, `./cdp-facilitator`
and the named reusable submodules are the shared payment and discovery
membrane. Each customer owns its actual compute, license, terms, wallet
authority and production receiving. No seller product belongs in the
Networking package's runtime dependency closure.
[Causeway market](https://github.com/causeway-services/market.561.group)
is the sole active source for the 561 Group merchant.

## Merchant-scoped x402 discovery observation

The original Coinbase x402 v2 merchant API lives at
`https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant`, not
the separate global `/discovery/resources` listing. For this provider,
Networking authenticates each read with the EXISTING CDP facilitator JWT
signer (`createCdpJwt`) and the already recognized operator-held
`CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`. No wallet-signing grant is
needed for discovery. Missing API credentials refuse before the HTTP read;
a non-Coinbase HTTPS discovery source receives no CDP credentials and
redirects are refused.

The existing `observe-x402-market` executable now uses **Data's** original
`x402-discovery-snapshot` source and preserves Networking's EIP-3009
chain observer as independent evidence. With no explicit merchant, it does not
fetch an unscoped Bazaar listing or relabel its `pagination.total` as paid
calls. An owner of a merchant may supply `--merchant-pay-to 0x…` and optionally
`--discovery-endpoint HTTPS_URL` for a bounded, dated vendor snapshot. It
reports listed resources, vendor-reported calls only when the pages support
those numbers, and source coverage. Unique payers across SKUs cannot be summed
from per-SKU distinct counts. The chain-wide AuthorizationUsed sample may
include non-x402 activity and is **not** a merchant revenue denominator.

The real Causeway merchant consumes this executable as `npm run
observe:merchant -- --merchant-pay-to "$X402_MERCHANT_PAY_TO"`. Its incumbent
operator must supply their actual original payee identity; neither the parser
nor a seller's unsigned 402 challenge authorizes a buyer wallet. Missing
merchant identity, bad vendor counts, unreceived native packages and unobserved
external payments remain distinct unknown/refusal conditions. No scheduled
job, extra market ledger or price table is installed here.

## One source-qualified public SKU per buyer operation

The existing `./market/catalog` selector now refuses missing or repeated
**sale-enabled** SKUs in all three original buyer projections: list, search
and get. A buyer cannot receive a paginated offer whose exact address has
competing public meanings. Held/unlisted historical testimony remains
internal. Causeway's MCP and human TUFTE interfaces reuse this single native
Networking selector, not different locally implemented catalog policies.
The source version 0.13.3 does not itself claim release, installation,
external purchases, or independent seller authentication.

## Source-carrier coordinate-fiber capacity selection

The original `./market/catalog` finite coordinate-fiber source no longer
hard-caps every host to the first Causeway merchant's 20-item page, 100000
offset or 12-facet preview. That profile remains the default, and Causeway
continues to pass its exact HTTP resource bounds. A trusted different
computer/market host can now select larger safe-integer budgets without
copying a new search index or a second seller inventory. Explicit invalid
capacity policies refuse; the result is still a source-bound, unsigned
discovery reading and does not certify provider interchangeability,
settlement or external purchases. Source edition 0.13.4 awaits registry
and qualified consuming installation.
