# RMN Semantic Conformance Logic Die

This package is the placement-independent logic die for normalized Relation
Model Notation. It provides deterministic RML parsing, typing, normalization,
RFC 8949 core-deterministic CBOR, RFC 6920 `ni` identity, FOUR/WIT algebra,
typed relational values, and finite circuit residues.

It has no network face, account, enterprise identity, persistent state, or
ambient filesystem/model access. The separately owned
`rmn-semantic-conformance` enterprise mounts this die behind its signed A2A
face.

`npm run verify` checks syntax, executable bounded assays, language-neutral
vectors, and the exact contents of the releasable package. Those checks are not
a Lean theorem or evidence of a mounted node.
