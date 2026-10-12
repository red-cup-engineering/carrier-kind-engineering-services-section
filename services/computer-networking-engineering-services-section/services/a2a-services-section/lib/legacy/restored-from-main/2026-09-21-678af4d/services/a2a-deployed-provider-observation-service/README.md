# A2A deployed-provider observation service

This service observes whether one exact deployed machine exposes the signed A2A
provider promised by a customer/provider contract. It joins two kinds of
evidence without confusing them:

- a machine-owner observation fixes the resource, revision, generation, and
  HTTPS origin;
- signed Agent Card discovery and provider-owned operation probes establish the
  application identity and health at that origin.

`observeDeployedA2aProvider({ machine, expected }, effects)` returns a
content-addressed `DeployedProviderObservation` or a content-addressed typed
refusal. The observation is only healthy when the standard signed Agent Card,
its signature authority, its complete skill set, and the explicitly selected
read-only health operation agree with the expected contract.

For a no-traffic staged revision, `machine.url` and
`expected.machine.transportOrigin` name the tagged HTTPS route used for every
network request, while `expected.declaredOrigin` names the origin
advertised by the signed Agent Card. Both origins are retained in the result.
Agent Card and JWKS paths declared at that origin are routed through
the tagged transport origin without rewriting the signed bytes; the injected
provider health operation receives the same tagged transport URL.
Legacy callers may keep `expected.machine.origin` only when transport and
declared origin are genuinely the same.

The service reuses
`@red-cup-engineering/a2a-agent-card-discovery-service` for JWS/JWKS verification
and `@red-cup-engineering/a2a-rmn-task-client-service` for the validated A2A
client discovery boundary. It does not implement HTTP signatures, JWS, A2A
transport, or a provider's private operation grammar.

The caller names one `healthOperation` from the complete expected operation set
and injects `observeOperation(context)` because only the operation owner can
form a harmless observation request and admit its result. A successful result
must be a content-addressed `A2AProviderOperationObservation` naming the same
provider, customer, notebook, and operation. Other advertised operations are
never executed merely to prove endpoint health. This prevents a generic
deployment observer from inventing a provider-specific health call or causing
an expensive or mutating operation during observation.

This package owns no Cloud Run actuation, credentials, traffic, scheduler,
customer activation, or deployment configuration.
