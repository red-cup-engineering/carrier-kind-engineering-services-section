# HTTP services section

This package owns HTTP transports, request-body handling, response representations,
negotiation, and events. Its public entry points are declared in `package.json`.

## Protocol capabilities

`content-digest` generates and checks RFC 9530 Content-Digest over exact message-content bytes. `makeContentDigest({carrier,algorithms?})` accepts a strict media-typed Base64 carrier and SHA-256/SHA-512 selections; `verifyContentDigest({carrier,contentDigest})` reports supported matches and unsupported algorithms separately. A valid mismatch is an outcome; malformed fields are refused. This is not Repr-Digest, a signature, or authentication. The paid carrier admits 65536 decoded bytes and 16384 field bytes.

Existing node message signatures retain their Ed25519/covered-component/peer-key profile while reading and writing native structured dictionaries and inner lists through the serialization supplier. The configured peer public key still decides signer authority.

`json-api-query` reads a JSON HTTP API from a query that is data (`src/json-api-query.schema.json`): an RFC 6570 URI template expanded by `uri-services-section`, the variables every call shares, and RFC 6901 pointers to the response's result array and total count. `queryJsonApi(query, variables)` fetches through `fetch-json` and returns `{uri, count, results}`; an API is added by writing its query, not a client.


## Source receiving

The 42 `src` modules, three exported scripts, 25 original tests, and manifest were
restored from `emsenn/bare-cedar-fog` commit
`aeedb1e9e671c24986c1b4f5e1ddbe4e4f8fb6f6`, under
`lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section/services/http-services-section`.
The receiving repository is `red-cup-engineering/computer-engineering-services-section`, at
`services/computer-networking-engineering-services-section/services/http-services-section`.
This README is new receiving documentation; no donor README was present.

The package allowlist now includes `scripts`, so the declared URL canonicalization,
JSON-fetch, and text-fetch exports are included in packed source. The restored
source version remains `0.6.1`; this change does not publish or replace a registry
artifact with that version.

## JSON-RPC composition

`./json-rpc` retains its bounded Fetch transport and request-envelope wrapper.
Response validation delegates to the existing
`@red-cup-engineering/json-rpc-transport-service` workspace package (`0.1.0`).
The reviewed supplier source is Computer commit
`681933326fc8f9b6d6250978a838c696d5ad8245`, path
`services/networking-services-section/services/http-engineering-services-section/services/json-rpc-transport-service`,
with `src/json-rpc.mjs` blob `2d7545c4a1649c6394081dfaec4d407715aa5ece`.
These two HTTP owner paths remain distinct.

The local transport keeps the public HTTP `BodyReadError` constructor used by
`./body/web` and the application error handler. It reads each response body once,
preserving the existing byte bound, timeout, URL, headers, and injected Fetch
contract. Shared response admission enforces JSON-RPC 2.0 version, request ID,
exclusive result/error members, and structured error shape. Null-ID parse and
invalid-request errors remain observable; uncorrelated successes are refused.

## Verification boundary

Tests use injected responses for the transport contract. The package-export test
runs `npm pack --dry-run --offline --ignore-scripts` and checks every declared
export target. Workspace dependencies must resolve to their actual owning
packages. Source restoration and these checks do not establish the complete
HTTP dependency graph, a published artifact, or a running host.
