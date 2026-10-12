---
type: "[[act]]"
domain: "[[triage/00-probably-redundant/20250502-relational-notes/fffstem/relating/derivations/Deriving the Domain of Relating]]"
derivative-introduced-on: "[[2025-04-28]]"
derives-from:
  - "[[bind-induced-relation]]"
aliases:
  - enact-induced-relation
---

- Definition:: ***enacting a bound induced relation*** is the **act** of realizing the expressive output of a binding, by inducing the relational result emergent from its structured pair.

## Derivation

- [[postulate]]:: If two [[reflex-induced-relation]]s are [[bind-induced-relation|bound]] into a structured pair, it cannot not be derived that the structure expresses a new, enacted relational output. This output emerges not from either constituent alone, but from their **ordered** and **differentiated** relation.
- [[derivation]]:: A [[bind-induced-relation]] is itself a reflected structure — which means it is a coherent act that can be further reflexed. By reflexing the bound pair, their relational interplay becomes a new act: an **enacted induced relation**. This enaction is not just a computation; it is the realization of a new relation as a consequence of the existing structure.

- example:
	- Let a = select-induced-relation(i, reflect(p, n))  
	- Let b = select-induced-relation(j, reflect(p, n))
	- Let pair = bind-induced-relation(a, b, n)
	- Then:
		- enact-induced-relation(pair, n) = reflex-induced-relation(pair)

- [[relational expression]]:: enact-bound-induced-relations(a, b, n) = reflex-induced-relation(bind-induced-relations(a, b, n))

## Formalism

- Let:
	- a, b be reflex-induced-relation values selected from reflect(p, n)
	- pair := bind-induced-relation(a, b, n)
- Then:
	- enact-bound-induced-relation(a, b, n) := reflex-induced-relation(pair)
- Or, more explicitly:
	- enact-bound-induced-relation(a, b, n) := reflex-induced-relation(bind-induced-relation(a, b, n))  
	  where:
	    - select-induced-relation(1, result) = a  
	    - select-induced-relation(2, result) = b

- Therefore:
	- The **enactment** of a bound pair is the **reflexive realization** of that pair's structured relationality — yielding a new induced relation derived from their ordering and inclusion.
