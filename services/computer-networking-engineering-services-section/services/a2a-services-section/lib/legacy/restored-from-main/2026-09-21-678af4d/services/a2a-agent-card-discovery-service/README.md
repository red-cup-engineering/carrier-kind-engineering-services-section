# A2A Agent Card discovery

Discovers the exact standard Agent Card resource and optionally verifies its
single same-origin JWS/JWKS boundary. `./carriers` exposes Draft 2020-12 JSON
request, result, and refusal carriers and a derived schema-to-EAVT projection.
Private signing keys are neither consumed nor packed.

`discoverAgentCard()` also accepts `declaredAgentUrl` when a deployment is read
through a revision-specific transport route. The card bytes are fetched from
`agentUrl`, while the protected same-origin JKU law is checked against
`declaredAgentUrl`; the caller remains responsible for routing that declared
JWKS path through the same observed revision. When omitted, both URLs are
identical as before.
