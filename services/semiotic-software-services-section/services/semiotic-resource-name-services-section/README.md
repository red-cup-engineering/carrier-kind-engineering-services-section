# Semiotic Resource Name services

This section owns Semiotic Resource Names (SRNs): readable surfaces for typed
semiotic path and probe material.

SRN does not replace RMN and is not another content-identity scheme. The
current Three Dots and a Dash codec reads a conformant SRN path into a closed
RMN term:

| Surface | RMN relation mark | Role |
| --- | --- | --- |
| `A.B` | `generation` | the right leg is generated from the left path |
| `A:B` | `witness` | the right leg witnesses the left path |
| `A-B` | `obstruction` | the right leg restricts the left path |
| `_` present | no claim | explicit escape from categorical reading |

The three path generators come from *Research on Three Dots and a Dash:
Categorical Kind Namespacing*. Their RMN realization is checked by the live
Relation Model Notation grammar and type checker, with no local AST copy.

## The `?` boundary

The three generators construct a proof path. A question with caller-supplied
parameters belongs on the other side of the existing Chu interface: it selects
a probe, demand, test, or readout state to evaluate against addressed claim
material. Consequently `?` is reserved for a parameterized SRN probe boundary;
it is not silently treated as a fourth proof-path generator.

The exact parameter term, escaping, ordering, and URI/URN binding are not yet
implemented here. They must be derived against the RMN type system and the
point/state adjointness law in
`Obsmetrologia/Calculus/Logic/LinearLogicChu.lean` before a parser mints them.

## Separation of roles

- RMN is the canonical typed term calculus used by transformers.
- SRN is a readable path/probe surface that compiles to and can be rendered
  from the appropriate RMN sublanguage.
- URI and URN are standardized reference carriers and boundary views.
- deterministic CBOR serializes an admitted typed RMN envelope.
- an RFC 6920 `ni` URI is the opaque token committing to those canonical
  bytes.

Thus the operational pair is `(token, claim)`: a transformer reads the typed
claim, can verify its commitment against the opaque token, and does not decode
the token to discover meaning.

## Services

- `punctuated-name-derivation-service` reads the current Three Dots and a Dash
  path surface into RMN and renders that RMN sublanguage back to its unique SRN
  surface.
- `name-relation-admissibility-service` checks each derived path generator
  against caller-supplied admissibility data.
- `semiotic-resource-name-addressing-service` admits a canonical closed SRN
  path as the immutable `{surface, token, claim}` coordinate. Its token is the
  canonical-content commitment to the visible typed RMN claim; it is not a
  second spelling of the surface and is never decoded for meaning.
