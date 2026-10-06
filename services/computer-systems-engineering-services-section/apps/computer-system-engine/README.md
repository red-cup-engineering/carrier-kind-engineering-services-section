# computer-system-engine

The normal-computing base of the 561 Group computer stack: content identity
(`ni:` URIs, canonical CBOR, canonical JSON), a JSON Schema type system with
admission and validation, `Result`/refusal contracts, typed statements,
things, resources, relations, and the typed operation wire messages.

It carries no math (that is `@lenticule-science/metrologic`) and no agent,
actor, or game content (that is `@red-cup-engineering/feltos`). Both of those
packages import from here; this package imports from neither of them.

Split out of `@red-cup-engineering/computer-data-engine` on 2026-09-22, along
with the same package's math into metrologic and its agent declarations into
feltos, so that each of the three rules -- math, agent, normal computing --
has exactly one home.
