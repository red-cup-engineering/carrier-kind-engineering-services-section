---
title: "Specification of the 561 Group x402 market"
date-created: 2026-09-11
status: realized-and-published
part-of: x402-services-section
version: 0.3.0
stability: candidate
---

# Specification of the 561 Group x402 market

The 561 Group sells typed computations to agents over x402. The complete payment capability is one package, `@red-cup-engineering/x402-services-section`: offer declarations, request binding, payment negotiation, facilitator selection, settlement evidence, the market engine, scheme adapters, and the market deployment composition live in this collection. It has no separately installable x402 market, observation, settlement-derivation, HBD, Hive, or value-settlement service.

## One declared market

Every priced operation is one entry of `data/market-561-group/records/catalog.json`, served by the market engine from `src/market/market.mjs`. The declaration names the operation's package export and its request projection; it may also name a validation export. A seller owns only that operation and validation. It does not own an HTTP payment boundary, facilitator, settlement witness, public hostname, or runner.

The declaration is the authoritative carrier for the market-facing effect. The market derives its route, payment requirement, Bazaar data, catalog readout, agent card, seller rows, registration body, and settlement witness from it. Duplicate routes or gateway/operation pairs are refused. Settlement rails and payout address are deployment bindings, never catalog fields.

## Market faces

`apps/market-561-group/src/market.mjs` composes the one market. Its Node face serves the whole catalog; its Worker face serves the entries not marked `runtime: "node"`. Both derive identities and readouts from the same declaration. The only generated deployment artifact is `apps/market-561-group/src/edge-bindings.mjs`: a static module map required because a Worker bundle cannot import a compute or validation binding by name at request time. `scripts/compile-catalog.mjs` refreshes that map after an edge offer changes.

The market returns malformed requests before asking for payment, issues x402 payment challenges for priced routes, settles through the selected facilitator, and serves its status, catalog, agent card, and public page unpriced from the same process.

## Settlement and schemes

The market attributes a successful settlement to its catalog entry and may append that witness through `market-561-group/settlement-journal`. Market-observation, settlement derivation, HBD verification and settlement, Hive exit-tightness sale, and value-settlement codecs are modules of the same package. They are available by subpath exports; none creates a second x402 package or payment boundary.

The current production market uses the exact EVM scheme. The HBD and Hive modules remain available as scheme-specific capabilities; they do not create a separate market until the market explicitly supports that scheme.

## Public surface

Consumers import the one package by capability, for example:

```js
import { createMarket } from "@red-cup-engineering/x402-services-section/market";
import { createMarket561Group } from "@red-cup-engineering/x402-services-section/market-561-group";
import { verifyHbdPayment } from "@red-cup-engineering/x402-services-section/hbd/verify-payment";
import { x402Challenge } from "@red-cup-engineering/x402-services-section/value-settlement";
```

The package manifest is the complete supported surface. Historical receipts may retain former package names as evidence, but no active consumer or catalog binding uses them.
