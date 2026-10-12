---
type: [[act]]
domain: [[relationality]]
derivative-introduced-on: [[2025-04-27]]
derives-from:
  - [[relationality]]
aliases:
  - "reflex-induced-relation"
---

- Definition:: ***reflexing an induced relation*** is the [[act]] of [[induce|inducing]] a [[relation]] between a relation and [[relation]].

## Derivation
- [[postulate]]:: As [[relationlessness]] and [[relation]] together induce [[triage/00-probably-redundant/20250502-relational-notes/fffstem/relating/derivations/Deriving the Domain of Relating]], the act that relates them must itself be included within that induction — reflexively relating to its own inducing.
- [[derivation]]:: The act of inducing relationality cannot not include itself in the domain it induces. This reflexive inclusion forms a fixed point where each act of relational induction affirms its own induction.
- example:
	- reflex-induced-relation(0) = induce [[triage/00-probably-redundant/20250502-relational-notes/fffstem/relating/derivations/Deriving the Domain of Relating]]
	- reflex-induced-relation(1) = reflex-induced-relation(reflex-induced-relation(0))
	- reflex-induced-relation(n) = reflex-induced-relation(reflex-induced-relation(n−1))
- [[relational expression]]:: [[reflex induced relation|reflex-induced-relation]](n) = reflex-induced-relation(reflex-induced-relation(n-1)) where n is any non-negative integer

## Formalism

- Let Relationality denote the [[induce|induced]] domain of [[triage/00-probably-redundant/20250502-relational-notes/fffstem/relating/derivations/Deriving the Domain of Relating]]
- Let reflex-induced-relation denote the act of derivation induced by Relationality's self-relation, thus Reflex(0) is Relationality.
- Then as the reflex-induced-relation at iteration n is defined as:
	- reflex-induced-relation(1) = reflex-induced-relation(0)
	- reflex-induced-relation(2) = reflex-induced-relation(1)
	- reflex-induced-relation(n) = reflex-induced-relation(n-1)
	- reflex-induced-relation(n+1) = reflex-induced(relation(n))
- Thus:
	- reflex-induced-relation(n) = reflex-induced(relation(n-1))
	- where n is any non-negative integer