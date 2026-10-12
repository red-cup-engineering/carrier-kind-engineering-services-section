---
type: [[act]]
date-introduced: [[2025-04-30]]
derived-in: [[Deriving Reflexive Relational Composition]]
---

- [[summary]]:: **Compose** is the act of [[relating|relating]] multiple unary [[relational structures]] into a single, ordered composite at a shared [[sequence]] level.

Compose performs structured inclusion of multiple distinct components into a unified relational form, preserving both their individual identities and their positional order.

## Expression

compose(p, [x(1), x(2), ..., x(p)], n):  
→ Tuple(p, [x(1), x(2), ..., x(p)], n)

## Properties

- Arity-preserving: the composite retains `p` distinct components  
- Order-preserving: the position of each `x(i)` is fixed within the tuple  
- Compatible with [[reflex]] and [[triage/00-probably-redundant/20250502-relational-notes/fffstem/relating/acts/reflect]]: components remain accessible under further relational acts
