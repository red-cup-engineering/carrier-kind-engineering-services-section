# Modal lab

A finite-poset Heyting-algebra modal lab. `ritm_core` builds the
Heyting algebra and KZ-comonad / closure tower over a finite universe
with no external dependencies; `lab.py` adds a modal-formula engine
with named modalities and axiom packs, parsing user-supplied formulas
against the core. Originally ported from a Scheme/Agda prototype.

## Toys

- [`lab.py`](lab.py) — Modal-formula engine. Defines named modalities,
  axiom packs (S4, S5, KZ-comonad invariants), and a parser/checker
  that tests formulas against a `ritm_core` Heyting-algebra instance.
- [`demo.py`](demo.py) — Small driver that builds Heyting implication
  and negation over a tiny universe, then verifies the adjunction
  laws.
- [`matrix.py`](matrix.py) — Typed-set / morphism core dataclasses.
  Used by some lab axioms; runnable on its own as a sanity check.

## Library file

- [`ritm_core.py`](ritm_core.py) — The Heyting-algebra + KZ-comonad
  + closure-tower implementation. No external deps. `lab.py` loads
  this via `importlib.util.spec_from_file_location` so the file must
  sit alongside.
