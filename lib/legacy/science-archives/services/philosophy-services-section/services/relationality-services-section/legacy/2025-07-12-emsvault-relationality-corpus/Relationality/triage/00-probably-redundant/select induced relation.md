---
type: "[[act]]"
domain: "[[triage/00-probably-redundant/20250502-relational-notes/fffstem/relating/derivations/Deriving the Domain of Relating]]"
derivative-introduced-on: "[[2025-04-28]]"
derives-from:
  - "[[reflect-induced-relation]]"
aliases:
  - select-induced-relation
---

- Definition:: ***selecting an induced relation*** is the **act** of isolating a specific reflex-induced relation from within a reflect-induced relational structure, based on the position it was included in the composition.

## Derivation

- [[postulate]]:: As [[reflect-induced-relation]] composes p [[reflex-induced-relation]]s at shared reflexive depth n, this ordered composition necessarily includes the positional differentiation of each included reflex. Thus, it cannot not derive that one such reflex can be **selected** based on its index of induction.
- [[derivation]]:: Reflecting p [[reflex-induced-relation]]s induces a structured, ordered composite at depth n. Because the structure is relationally composed through iteration, each reflex in the structure has a determinable position. This determinability induces the act of selecting: isolating a constituent reflex by its position in the composition.
- example:
	- Given r = reflect-induced-relation(p, n), then:
		- select(1, r) is r(0, n))
		- select(2, r) is ...(1, n)
		- select(3, r) is ...(2, n)
		- select(i, r) is... (i-1, n) where i < p
- [[relational expression]]::  select-induced-relation(i, r) = r(i-1, n) where r is reflect-induced-relation(p, n) and i, p, n, and r are non-negative integers, and i is less than or equal to p
## Formalism
- Let reflect-induced-relation(p, n) be defined as a relational structure of p reflective breadth and n reflexive depth.
- Then:
	- The first element in this sequence is derived as:
		- select-induced-relation(1, reflect(p, n)) = reflex-induced-relation(reflex-induced-relation(n−1))
	- Each subsequent selection recursively follows:
		- select-induced-relation(i, reflect(p, n)) = reflex-induced-relation(select(i−1, reflect(p, n−1)))
- Therefore, define select-induced-relation as:
	- select-induced-relation(i, reflect(p, n)) := reflex-induced-relation(select(i−1, reflect(p, n−1)))
	- for all i, p, and n that are non-negative integers and 1 ≤ i ≤ p