---
type: "[[structure]]"
structure-type: "[[sequence]]"
date-introduced: "[[2025-04-30]]"
derived-in: "[[Deriving Reflexive Relational Sequencing]]"
---

- [[summary]]:: **Reflexive relational depth** is the structure formed by applying [[reflex]] repeatedly to a [[relational structure]], producing a layered sequence of self-relations.

This structure arises from the act of a structure [[relating|relating]] to itself, once, then again, and again — each time generating a deeper layer of internal inclusion.

## Members

R(0): domain of relating  
R(1): reflex(R(0))  
R(2): reflex(R(1))  
...  
R(n): reflex(R(n–1))

## Properties

- Ordered by depth: each R(n) contains all previous layers.
- Induced, not assumed: arises from repeated application of [[reflex]].
- Enables structural position: depth becomes a relational coordinate.

## Expression

reflexive relational depth := { R(0), R(1), R(2), … }  
where R(n+1) := reflex(R(n))
