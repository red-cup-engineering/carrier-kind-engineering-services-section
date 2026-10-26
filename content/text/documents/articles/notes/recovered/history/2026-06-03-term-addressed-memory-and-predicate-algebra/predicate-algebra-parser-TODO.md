# TODO — predicate-algebra-parser

The predicate algebra over a memory (a section of EAVT cells, from any source): alias kernel
morphisms into English predication, read the rules from memory, project belief.

## Done

- **`negates`** (kernel `negate`, lifted to memories) — `{not:X}` → counter-evidence on cell
  `(s,p,X)`; affirm-p ⊔ affirm-¬p = contained ⊤. Proof: `believing/tests/proof-paraconsistency-is-contained`.
- **`functional`** (`excluding`) — a single-valued predicate's competing objects exclude each
  other → ⊤. Proof: `excluding/tests/proof-functional-excludes-alternatives`.
- **The algebra is memory** (`recalling`) — `recall(memory, predicateKnowledge)` reads which
  predicates are functional off `(p, is, functional)` cells; pure, no store (kernel-only).

## Next — more aliased morphisms

- **`specializes`** (kernel `specialize`). `(cat, is-a, animal)` lifts `cat`'s facts to
  `animal`: affirming `(felix, is-a, cat)` propagates animal-facts to felix. Inference.
- **`converse` / `inverse-of`.** `(parent, inverse-of, child)`: affirming `(a, parent, b)`
  co-affirms `(b, child, a)`. Composed in `recalling` like the others.

## Later

- **Compose the rules generally.** `recalling` currently wires `negate`/`exclude` by hand;
  as the rule set grows, read *all* predicate-knowledge facts and fold the applicable
  morphisms — believe composes the sheaf of predicate-knowledge.
- **Sheafing / consensus.** Multi-source belief as H⁰ (consensus) ⊕ H¹ (dissent), beyond the
  pairwise knowledge-join — the swarm / multi-agent reading.
- **English parsing proper.** The "parser" in the name: parse natural predication
  ("a cat is an animal", "Ada's color is not blue") into the EAVT facts the algebra consumes.

## Boundary

- Paths, EAVT logging, the fold — **not** here. This package only interprets cells it is
  handed; producing and storing them is a separate, upstream concern.
