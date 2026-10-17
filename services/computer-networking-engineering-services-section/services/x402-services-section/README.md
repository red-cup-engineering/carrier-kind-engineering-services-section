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
