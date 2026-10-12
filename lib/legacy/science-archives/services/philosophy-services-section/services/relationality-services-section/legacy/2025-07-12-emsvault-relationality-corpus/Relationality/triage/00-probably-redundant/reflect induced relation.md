---
type: "[[act]]"
domain: "[[triage/00-probably-redundant/20250502-relational-notes/fffstem/relating/derivations/Deriving the Domain of Relating]]"
derivative-introduced-on: "[[2025-04-27]]"
derives-from:
  - "[[reflex-induced-relation]]"
aliases:
  - reflect-induced-relation
---

- Definition:: ***reflecting an induced relation*** is the [[act]] of inducing a [[relational structure]] formed from multiple [[reflex induced relation|reflexed induced relations]] at a shared reflexive iteration.

## Derivation
- [[postulate]]:: If [[reflex induced relation|reflexing an induced relation]](n) derives from an act that includes itself, it cannot not [[induce]] a [[relation]] between multiple such reflexed induced relations, forming a relational structure across reflexive acts.
- [[derivation]]:: Reflecting p reflex-induced relations at reflexive iteration n induces a relational composition that cannot not be ordered. As each reflex relates recursively to itself, their composition reflects the order of their generation, inducing structured depth.
- example:
	- reflect(0, n) = reflex(reflex(n−1))
	- reflect(1, n) = reflex(reflect(0, n−1))
	- reflect(p, n) = reflex(reflect(p−1, n)) for p ≥ 2
- [[relational expression]]:: [[reflect induced relation|reflect-induced-relation]](p, n) is [[reflex induced relation|reflex-induced-relation]](reflect-induced-relation(p-1, n)) where p and n are any independent non-negative integers
## Formalism
- As [[reflex induced relation|reflex-induced-relation]] is derived:
	- reflex-induced-relation(0) = induce(relationlessness, relation)
	- reflex-induced-relation(n) = reflex-induced-relation(reflex-induced-relation(n-1))
- Define reflect-induced-relation as the form of p reflex-induced relations at reflexive iteration n, where p and n are independent non-negative integers.
- Then:
	- reflect-induced-relation(0, n) = reflex-induced-relation(reflex-induced-relation(n-1))
	- reflect-induced-relation(1, n) = reflex-induced-relation(reflect-induced-relation(0, n-1))
	- reflect-induced-relation(p, n) = reflex-induced-relation(reflect-induced-relation(p-1, n)) for p
- Thus:
	- reflect-induced-relation(p, n) = reflex-induced-relation(reflect-induced-relation(p, 1, n)) for p  ≥ 2