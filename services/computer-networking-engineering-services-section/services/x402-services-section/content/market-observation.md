# x402 Market Observation Service

Measures sampled Base-USDC EIP-3009 `AuthorizationUsed` activity with the shared public EVM reader. It emits dated observations whose measured block range, endpoint provenance, and arithmetic extrapolation remain separate.

## What it measures

x402 `exact` can settle through EIP-3009 `transferWithAuthorization`, which emits `AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)`. That event is neither an x402 marker nor an agent identity: this service reports sampled authorization activity and distinct event-authorizer addresses only.

A sampled range is not a chain snapshot. A daily or monthly value is arithmetic extrapolation from that range, not an established bound for another period. Catalog calls and sampled authorization activity are different units; any comparison reports that fact and never calls the ratio protocol share, visibility, or an understatement factor.

## Failure is never zero

A malformed, rate-limited, or unreachable provider produces a stated refusal. It is never reported as zero activity.

## Use

```sh
npm run check && npm test
node apps/observe-market.mjs --window 900 > observation.json
```

The library reads no clock; the script stamps the observation time. The canonical provider pool owns endpoint selection, attempts, and failure evidence.
