# Coinbase Services Section

Red Cup Engineering's section for the Coinbase platform surfaces the Group actually transacts
through: the CDP facilitator that settles x402 payments, and the x402 Bazaar catalog that
determines whether anyone can find a priced endpoint in the first place.

## Seating derivation

Coinbase is a supplier, and a supplier's integration seats with the engineering that talks to
it. This sits under `computer-blockchain-system-services-section` because everything here is
chain-settled: the facilitator submits EIP-3009 authorizations against USDC on Base, and the
Bazaar catalogs resources off observed settlement rather than off any submission.

It is a section rather than a single service because these are two distinct capabilities with
different failure modes. A broken facilitator means payments do not settle. A missing Bazaar
listing means payments are never attempted, which is far harder to notice — and did in fact go
unnoticed here for over a month.

Until now, CDP integration lived inside the one service that happened to need it first, the
paid ephemeris gateway. That is why nothing was watching the catalog: the code that talks to
Coinbase had no home of its own, so no one owned the question "are we discoverable".

## Services

- `coinbase-bazaar-service` — read-only client for the x402 Bazaar catalog. Answers whether a
  given host is listed, three-valued so an unread catalog never reads as an absent listing, and
  reduces the catalog's published per-resource demand data into evidence about what agent
  buyers actually pay for.

## Why the catalog is worth reading beyond our own row

Each of the roughly fifteen thousand entries publishes a `quality` block — thirty-day call
count, thirty-day unique payers, and last-called timestamp — alongside its price. That is a
public record of demand across the entire agent-payments market, and it makes "what should we
sell next" a measurement rather than an argument.

The distinction that matters when reading it is calls against payers. A resource with thousands
of calls from one payer is a single integration; a resource with a few hundred calls from a few
hundred distinct payers is a market. `market.mjs` ranks on payers for that reason and flags
concentration explicitly, so a busy cron job cannot be mistaken for demand.

## What this section will not do

Nothing here signs, spends, lists, or delists. It reads. Payment belongs to the service being
paid for; this section only tells you whether that service can be found and what the market
around it looks like.
