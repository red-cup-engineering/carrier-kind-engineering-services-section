# Typed Computer System Engine

This package admits immutable system compositions, resolves registered typed
operations by id, and passes wire requests to the typed networking engine.
Operation semantics stay in `@red-cup-engineering/typed-computer-code-engine`;
wire codecs and dispatch stay in `@red-cup-engineering/typed-code-networking-engine`.

## System derivation

This is the one execution architecture: typed data defines the terms, typed
code admits their operations, typed networking carries their requests, and the
typed computer-system engine composes and dispatches them. A product, provider,
runtime, host, or machine specialization supplies typed parameter data to an
already-admitted upstream operation. It does not introduce a second operation
implementation, dispatch path, policy engine, source-resolution path, or local
orchestration model.

Derivation proceeds from this system boundary downward. A provider layer
parameterizes its shared upstream integration; a product layer parameterizes
that provider layer; a machine layer parameterizes the product; and a harness
or application supplies only the paths, credentials, and other runtime
configuration it owns. A lower layer that needs new behavior changes the
upstream system owner first, migrates its consumers to that behavior, and
removes the superseded path.

It does not claim retry, persistence, distributed lifecycle, or idempotency
semantics. Those have not been established by the runtime contract it replaces.
