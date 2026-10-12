---
type: "[[act]]"
domain: "[[relationality]]"
derivative-introduced-on: "[[2025-04-28]]"
derives-from:
  - "[[select-induced-relation]]"
aliases:
  - compare-induced-relation
---

- [[definition]]:: ***comparing induced relations*** is the [[relational act]] of [[relating|relating]] two selected [[reflex induced relation|reflexed induced relations]] to derive their difference.

## Derivation

- [[postulate]]:: As [[select induced relation|selecting a reflexed induced relation]] allows the [[isolation]] of specific [[reflex induced relation|reflexed induced relations]] within a [[reflected induced relational form]], it must be derived that these selected relations, once isolated, may themselves be **related** — to determine their positional or structural equivalence.
- [[derivation]]:: Any act of **selection** implies the availability of two or more distinguishable reflex-induced relations. To relate any two such selections is to compare them — determining whether their reflexive structure is the same (structural identity), or different (structural variance). The act of comparing is thus a derivative of both the compositional ordering of reflect-induced structures and the isolating act of selection.
- example:
	- compare(select(1, reflect(p, n)), select(2, reflect(p, n)))
	- compare(select(i, r), select(j, r)) where r is reflect(p, n)
	- compare(x, x) = true  
	- compare(x, y) = false when x ≠ y
- [[relational expression]]:: compare-induced-relation(i, j, r) = (select(i, r) == select(j, r)) where ​r is reflect-induced-relation(p, n), and i and j are valid positional integers such that 1 ≤ i, j ≤ p
## Formalism
- Let r = reflect-induced-relation(p, n), where p is the number of reflex-induced components and n is reflexive depth
- Let select(i, r) return the i-th reflex-induced relation from the structure
- Then the comparison between two selections is defined as:
	- compare-induced-relation(i, j, r) :=  
		- true, if select(i, r) ≡ select(j, r)  
		- false, otherwise
- Thus:
	- compare-induced-relation(i, j, r) =  
		- select-induced-relation(i, r) == select-induced-relation(j, reflect-induced-relation(p, n))  
	- where i and j are any independent non-neutral integer and 1 ≤ i, j ≤ p
