# CapCell PDK

A CapCell is one sovereign market actor offering exactly one effectful
capability. Its executable kernel, RMN law and schemas, package, repository,
wallet, web identity, public offer, and receipts are facets of that one cell.
They are not a bag of capabilities.

Every other effectful power is another CapCell. A cell that needs A2A,
ActivityPub, OCapN, CapTP, x402, RWIL, Git hosting, package publication,
deployment, or witnessing binds an independently advertised provider from the
same market. It does not import that provider implementation into its own
process and call the resulting composite a cell.

In-process dependencies are admissible only as content-addressed inert
material: no authority, effects, transport, custody, settlement, publication,
or observation. The normative profile is
[`content/contracts/capcell-profile-v1.rml`](content/contracts/capcell-profile-v1.rml).

`@red-cup-engineering/capability-cell-fabrication-services-section` fabricates and assays candidate bundles. It
returns a typed `CapCellUnrealizedError` until the cell's body and recursive
market bindings have been independently evidenced.

```bash
capcell fabricate ./capcell-spec.json \
  --package-manifest ./package.json \
  --output ./build/capcell
```

Observed external projections can be supplied without turning provider claims
into self-attestation:

```bash
capcell fabricate ./capcell-spec.json \
  --package-manifest ./package.json \
  --evidence ./capcell-evidence.json \
  --output ./build/capcell
```

The evidence file carries observations of the cell's own body plus exact
provider-cell bindings for every declared required capability. Supplying every
claim still stops at the independent-conformance gate.

The local operation never claims that a locally generated bundle is a complete
deployed cell.
