# JSON Schema service

This capability cell owns deterministic JSON Schema documents, bounded local
resolution, validation, and schema-assertion traces. It is deliberately not a
JSON projector: validation is a non-monotone judgment, so it cannot be a
`read` operation.

The only admitted dialect is JSON Schema Draft 2020-12. The exported
`SUPPORTED_VOCABULARY` is exact: known Draft 2020-12 assertion keywords outside
that set are refused, rather than silently ignored. Resolution is deliberately
bounded to an explicit in-memory corpus; it never reads a registry, URL, or
working directory.

`json-schema-census --root ABSOLUTE_PATH --out ABSOLUTE_PATH` is a read-only
inventory command. Its output is an evidence artifact, not a promotion or
deletion plan.
