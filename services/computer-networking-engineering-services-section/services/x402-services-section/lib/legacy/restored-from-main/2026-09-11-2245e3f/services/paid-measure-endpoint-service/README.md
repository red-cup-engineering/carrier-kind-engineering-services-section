# paid-measure-endpoint-service

Sell a pure function by the call: x402 v2 paid-measure catalog validation,
discovery, route-table, and settlement-witness projection shared by the
fetch/Workers and Express transports. Sibling of
`@red-cup-engineering/paid-data-endpoint-service` ("sell data by the call")
in this same `x402-services-section/services/` seat.

Existing seats checked before minting this directory: the sibling
`paid-data-endpoint-service` (durable read/write/rights-trade actor over
`x402-services-section/priced-capability-boundary.mjs`, a different,
async intent/receipt shape this package does not reuse because paid
measures are synchronous validate -> compute -> JSON, not durable
poll-for-result), `x402-boundary-reference`, `x402-exact-purchase-service`,
`x402-market-observation-service`, and `x402-settlement-witness-identity`
(none price a measure catalog); `paid-pacing-intelligence-gateway`
(`public-web-health-services-section/pacing-services-section`), the
~90%-measure-agnostic reference this package generalizes out of --
`route-catalog.mjs`, `worker.mjs`, `server.mjs`, `pacing-request.mjs`,
`settlement-witness.mjs` -- left unmodified per this package's own scope
(a finding recommending it migrate to consume this package is recorded
separately, not applied here).

Full API documentation projects from the JSDoc on
`src/paid-measure-endpoint.mjs`'s exports.
