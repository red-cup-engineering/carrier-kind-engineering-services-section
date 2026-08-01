# Absorbed from RelationalContract

`RelationalContract` (formerly `lib/legacy/metroplat/src/lib/contracts/contract.mts`) was deleted
along with the RML "law" subsystem. Most of it was prose-hashing with no decision content. Four
ideas in it were genuinely novel and are worth seating later as their own transformations.

This file is a record of what was absorbed and why it mattered. It is deliberately not a
specification, and should not be grown into one. When one of these is actually built, it gets its
own design; this note only preserves the idea so it is not lost with the code.

## The observation lens

A contract carried a lens with a domain, a boundary, and explicit `preserves` / `hides` lists — a
Chu structure. Forward operations and backward observations were two directions over the same
material, and the lens was the requirement that they preserve their evaluation relation: what you
can do to a thing and what you can see of it had to agree. Two contracts were only composable when
their lenses were compatible, and composing them intersected what was preserved and unioned what
was hidden.

This mattered because it makes hiding a first-class, checkable claim rather than an accident of
what an API happens not to return. Most systems let the observable surface drift away from the
operational surface silently. RMN already has Chu spaces over FOUR in the language stdlib; the
unbuilt piece is binding a lens to an operation so the two directions are checked against each
other.

## The evidence policy

Separate from the lens, each contract named what evidence an invocation had to produce: which
records, at what time granularity (`none`/`instant`/`stage`/`interval`), whether the caller had to
be identified, and whether the boundary object was recorded not at all, as a fingerprint, or in
full. Exposures were then checked against the policy, reporting exactly which required records were
present and which were missing.

This mattered because it separated "what the operation does" from "what must be true afterward for
anyone to be accountable for it" — and made the second one a small, decidable, per-operation
declaration rather than an ambient logging convention. The fingerprint-vs-full distinction in
particular is a real privacy/auditability dial that most receipt designs collapse.

## The energetic obligations

Each contract declared how a move behaves over repeated application: whether it descends toward a
fixed point (`well-founded-descent`), accumulates monotonically, jams in a metastable basin,
relaxes, or pays an explicit boundary or coordination cost. An obligation named a source, a target,
an invariant, and optionally a measure witnessing the behavior.

This mattered because it is a termination-and-cost story attached to the operation itself rather
than inferred by a reader. It distinguishes "this retries safely because it descends" from "this
retries safely because it is idempotent" from "this cannot be retried freely because each attempt
pays coordination cost" — distinctions that otherwise live only in someone's head, and that a
scheduler or a settlement layer genuinely needs.

## The refinement obligations

A contract could list refinements: a named implementation claiming to refine the contract in a
specific register (`function`, `schema`, `route`, `tool`, `document`, `evidence`, `codec`,
`resource`), together with the list of properties that refinement must preserve. Composition
carried both sides' refinements forward and added one for the composite.

This mattered because it made "this concrete thing implements that abstract thing" an explicit,
typed, accumulating claim with a stated preservation list — and it recognized that refinement is
not one relation but several, since a route refining a contract and a codec refining a contract owe
different things. That per-register split is the part worth keeping.
