# Paid value-chain gateway

An x402 v2 seller for two priced measures, deployed as one Cloudflare
Worker:

- `POST /value-chain/shares` -- each position's exact share of a
  farm-to-retail price ladder's retail price (producer's share first), the
  exact multiplier between adjacent positions, and the evidence label of
  every priced input row. Body: the `PriceLadder` request; response: the
  `ValueChainShareSet` result.
- `POST /territory/readout` -- every catalogued material whose row belongs
  to a requested place in the Turtle Island taxonomy or one of its
  ancestors, each with its known products and markets (citations intact),
  its currently held chain position, a holder rendered as the literal "not
  named" whenever the row carries no benefit-sharing record, and a
  notFound listing of every field the row itself marks unknown. Body: the
  `TerritoryReadoutRequest` request; response: the `TerritoryReadout`
  result.
- `GET /` -- unpriced: this gateway's own index listing (`402index-listing.json`).

The compute steps import `@red-cup-engineering/derive-value-chain-shares-service@0.1.0`
and `@red-cup-engineering/derive-territory-readout-service@0.1.0` by exact
pin -- pure, no I/O, no clock; this package never copies their source. The
HTTP payment boundary is the official `@x402/*` SDK reached
through `@red-cup-engineering/x402-services-section`'s `./fetch` export
(`createExactEvmFetchPaymentBoundary`), the same transport
`base-chain-data-gateway` uses for a stateless fetch-handler host such as
Cloudflare Workers, with no Express dependency.

## Configuration

Every settlement-affecting value is deployment-supplied (`wrangler.toml`
`[vars]` for public values, `wrangler secret put` for anything sensitive),
never hardcoded in `src/`, matching the env-var convention already live in
`base-chain-data-gateway`, `metered-inference-tollbooth`, and
`paid-ephemeris-gateway`:

- `X402_NETWORK`: explicit EVM CAIP-2 chain. Default `eip155:84532` (Base
  Sepolia testnet). The live deployment sets `eip155:8453` for Base
  mainnet production.
- `X402_PAY_TO`: this deployment's receiving EVM address. **Required, no
  default** -- deciding which wallet receives real settlement is an owner
  custody decision, never inferred or invented by this package. The live
  deployment uses the same Base USDC address the other x402 sellers use
  (`x402-services-section` `data/logs/2026/09/01/` `x402.payto-decision`
  record), resolved through
  `key-management-services-section/scripts/resolve-payment-receiver.mjs`
  at deploy time rather than typed as a literal.
- `X402_ASSET`: the settlement asset's EVM address. Defaults to Circle's
  official USDC contract for the selected network (Base mainnet
  `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, Base Sepolia
  `0x036CbD53842c5426634e7929541eC2318f3dCF7e`).
- `X402_FACILITATOR`: contracted x402 facilitator URL. Defaults to
  Coinbase's free, keyless public facilitator
  (`https://x402.org/facilitator`) **only** on `eip155:84532`. The live
  mainnet deployment sets this explicitly to
  `https://facilitator.payai.network` -- a free, keyless third-party
  facilitator, protocol-assayed by `base-chain-data-gateway`. No Coinbase
  CDP account or credentials are required.
- `X402_PRICE_VALUE_CHAIN_SHARES`: the value-chain-shares route's price, in
  the asset's atomic units (USDC has 6 decimals). Default `40000` ($0.04)
  -- the paid-measure essentials tier the ephemeris gateway uses,
  provisional pending the hopeium business plan's re-pricing (2026-09-05
  hopeium capability specification, section (vi)).
- `X402_PRICE_TERRITORY_READOUT`: the territory-readout route's price, in
  the asset's atomic units. Default `80000` ($0.08) -- twice the
  value-chain reading, per the 2026-09-05 hopeium business plan, section 6,
  provisional pending the pricing ledger.

## Tests

`npm test` runs `node --test` over the handler logic for both routes (the
index listing now naming two priced measures, the 402 challenge shape on
an unpaid call, the paid path with the facilitator stubbed, and a schema
check of a real request) -- no network access required. The
value-chain-shares route's schema check reuses the science seat's
cocaine-ladder fixture; the territory-readout route's reuses the North
Shore fixture (manoomin, rivercane, Lake Superior lake trout, Lake
Superior agate) from `derive-territory-readout-service`'s own work order.

## Thread

Five-custody thread (org-layering.md, 2026-09-01):
- science: the science seat's narcotics-economy price-ladder rows (the
  `derive-value-chain-shares-service` test fixtures) and the band's own
  region's real catalog rows (the `derive-territory-readout-service` North
  Shore fixture) ground the fixtures this package's own tests reuse.
- engineering: **this section itself** --
  `computer-territorial-economic-systems-engineering-services-section`,
  entangled via `@red-cup-engineering/derive-value-chain-shares-service@0.1.0`,
  `@red-cup-engineering/derive-territory-readout-service@0.1.0` (the pure
  compute steps) and `@red-cup-engineering/x402-services-section@2.0.1`
  (`./fetch`'s `createExactEvmFetchPaymentBoundary`), all exact-pinned.
- operations: the x402 clearing leg of the Union's capability-market
  pipeline (named in `base-chain-data-gateway`'s own thread), unchanged
  here.
- 561-group: the same Cloudflare account custody `base-chain-data-gateway`
  deploys under; this Worker deploys to its own `workers.dev` subdomain,
  no custom domain (the site's name is not yet decided).
- public: the hopeium program's priced-measures list (2026-09-05 hopeium
  capability specification, section (v)), not yet wired -- a debt for the
  public seat, not this package.
