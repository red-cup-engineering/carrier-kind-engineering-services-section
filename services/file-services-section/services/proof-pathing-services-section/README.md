# Proof-pathing services section

This section owns the file-boundary leg of Proof-Path Addressing (PPA). It
admits a host filepath only through a declared codec, recovers the corresponding
typed address term, validates that every segment is earned by a generating or
restriction morphism, and renders the term's canonical filesystem proof path.
Root-to-leaf traversal is therefore an operational derivation, not a lookup in
an external path registry.

The section may expose bounded diagnostics such as the recovered term and type,
normal form, typing verdict, canonical path, and a typed reason for refusal. It
does not own the CHL or Yoneda mathematics, invent a second semantic authority,
replace the import or derivation graph, route arbitrary protocols, or claim that
HTTP, MCP, ActivityPub, and other reading legs already commute. Those
cross-reading results remain explicit PPA formal-frontier obligations.

The `proof-path-structuration-service` is the section's first actuator. It is a
pure fold from a JSON-addressable semiotic atom, a foundational root, and
explicit generator witnesses to a relative POSIX filepath AST. It preserves
the atom, deterministically chooses a shortest witnessed route, and returns a
typed `unearned-path` refusal when no route exists. An atom alone is not a
proof and therefore cannot earn a path.

The section-level identity adapter translates an earned coordinate into a closed
RMN term and submits it to the sole normalized semantic-content v2 envelope. The
envelope explicitly commits the `proof-path-addressing.settled-coordinate`
object kind, the RMN 0.0.1 normalization profile, identity settlement, and the
shared empty-witness root before deterministic CBOR and NI naming. The returned
opaque `token` commits to that envelope; the settled body remains the visible
coordinate material. No raw-term identity is an alternate identity law. The
dependency-free structuration leaf therefore remains a pure projection, while
the parent section supplies content identity without maintaining a second
canonicalizer. Source-package analysis remains a possible future diagnostic
client, not this section's assignment.

## Grounding and maturity

- The filepath-as-proof and earned-segment laws are governing source doctrine.
- CHL typing, Church-Rosser confluence, and the general Yoneda ingredients have
  Lean proofs in Obsmetrologia; they do not by themselves prove PPA leg
  agreement.
- The existing RMN evaluator, type checker, and witness path-term code are
  built exemplars, not proofs of the complete PPA contract.
- `AddressTerm`, canonical-address specialization, reading legs,
  `ConeOfReadings`, and cross-leg agreement remain named roadmap obligations
  until their corresponding declarations and proofs exist.

The principal source carriers are the settled proof-pathing explanations dated
2026-06-19, the PPA campaign plan dated 2026-07-09, and the proof-pathing asset
inventory dated 2026-07-26. Provider-generated NotebookLM synthesis is an
advisory reading of those sources and does not override them.
