# Semiotic Voxel arena

This is SXC-M4's first executable boundary.  A semiotic atom is admitted only
as the next event of a potential arena: its immediate causes must already be in
the current causally closed position, and a `(2,3)` pebble-game judgment must
accept every proposed contact in that atom's causal cone.

The normative network atom record is
[`content/schemas/semiotic-atom.schema.json`](content/schemas/semiotic-atom.schema.json):
exactly `{ id, polarity, parentIds }`.  `id` and every entry of `parentIds` are
exact RFC 6920 `ni:///sha-256;<43 base64url>` identities.  An atom ID names the
canonical typed RMN commitment bytes supplied by the caller; this service
checks the identity's exact syntax but does not invent or resolve the
unratified Utterance-plus-locus carrier body.

A network semiotic atom is not an Obsmetrologia `Mark`, `Utterance`, or `Cell`.
“Voxel” names only the active reconstruction made while applying this law.  A
voxel is never persisted and never crosses the boundary.  Likewise,
`x-semiotic-voxel` is package/deployment projection metadata only, not the atom,
an ontology, or a boundary carrier.

The result is a pure transition and an EAVT-shaped boundary transaction
payload.  It is deliberately neither a stored voxel, a deployment operation,
nor a settlement receipt.  A caller must submit the payload through SXC-M1/M2;
this module has no filesystem, network, key, wallet, or chain authority.

Fabricators may make candidate material, packages, and provider bindings, but
they may not themselves pronounce that material a new semiotic atom.  They
cross this boundary with the atom candidate and a judgment from the rigidity
oracle.  This pure law validates the judgment's scope and refusal status; its
issuer and receipt have not yet been verified through an A2A/chain boundary.
