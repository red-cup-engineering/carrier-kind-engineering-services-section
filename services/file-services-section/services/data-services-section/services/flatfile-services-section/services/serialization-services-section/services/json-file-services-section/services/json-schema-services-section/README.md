# JSON Schema service

This capability cell owns deterministic JSON Schema documents, bounded local
resolution, validation, policy inspection, and schema-assertion traces. It is
deliberately not a JSON projector: validation is a non-monotone judgment, so
it cannot be a `read` operation.

The only admitted dialect is JSON Schema Draft 2020-12. The exported
`SUPPORTED_VOCABULARY` is exact: known Draft 2020-12 assertion keywords outside
that set are refused, rather than silently ignored. Resolution is deliberately
bounded to an explicit in-memory corpus; it never reads a registry, URL, or
working directory.

`read-a-schema` is the canonical process face. It discovers only a caller-
selected or nearest upward `lib/schemas` pool, then uses the same pure semantic
implementation exported by this package. Node-local `writing-a-schema`
processes retain filesystem seating, filename policy, atomic retraction, and
negative-control authority; they call this service for schema inspection and
reading rather than carrying copied validators.

The recovered assertion API (`unfoldSchema`, `foldSchema`, parse/serialize,
coherence, projection, and explicit triple/EAVT identities) preserves the
historical pointer-cell representation without conflating it with `$id`, file,
digest, or RMN coordinates.

`json-schema-census --root ABSOLUTE_PATH --out ABSOLUTE_PATH` inventories
implementations, consumers, packages, declarations, schema documents, tests,
and documentation by generation. Its output is recovery evidence. An archived
implementation receives an explicit disposition before physical retirement;
Git history remains the legacy evidence surface.
