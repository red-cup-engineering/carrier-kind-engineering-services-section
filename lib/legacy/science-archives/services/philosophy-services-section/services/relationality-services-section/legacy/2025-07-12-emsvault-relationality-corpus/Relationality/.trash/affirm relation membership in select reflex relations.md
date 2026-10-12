---
type: "[[act]]"
domain: "[[relational access]]"
derivative-introduced-on: "[[2025-04-27]]"
derives-from:
  - "[[select reflex relation from reflected relation]]"
---

- [[definition]]:: To ***affirm relation membership in selected reflex relations*** is the [[act]] of affirming whether a given [[reflex relation]] matches one selected from a [[reflected relation]].

## Derivation
- [[postulate]]:: As [[selecting]] a [[reflex relation]] retrieves a constituent of a [[reflected relation]], it must be derivable whether a given [[reflex relation]] matches a selected one.
- [[derivation]]:: Affirming [[relation membership]] checks whether the given [[reflex relation]] matches a [[select]]ed [[reflex relation]].
- [[relational expression]]::
  - affirm(x, r) is:
    - True if there exists an i such that select(i, r) is x
    - Otherwise False
    - where r is a [[reflected relation]](p, n)
