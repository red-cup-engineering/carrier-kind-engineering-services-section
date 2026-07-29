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

No actuator is assigned here yet. The current node is the circuit-board
boundary under which file-facing path-term codecs, canonicalization, admission,
and readout services can be placed once their individual operations are
implemented and verified.

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
