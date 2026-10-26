# predicate-algebra-parser

> A predicate algebra over EAVT predication cells, depending only on
> [voidmath-kernel](../../active/voidmath-kernel). It interprets a memory by aliasing kernel
> morphisms into English predication.

`predicate-algebra-parser` (`@561/development.experimental.predicate-algebra-parser`) takes a
**memory** — a settled section of `(subject, predicate, object)` cells from any source — and
interprets it through a **predicate algebra**: rules that alias kernel morphisms into English
predication and project the four-valued belief. Pure functions on cells; no disk, no store.

- **`negates`** (kernel `negate`, lifted to memories) — a `{not: X}` claim is counter-evidence
  on cell `(s, p, X)`; affirm-p and affirm-¬p climb to a **contained ⊤**.
- **`functional`** — a single-valued predicate's competing objects exclude each other (→ ⊤).
- **`believe`** — projects a memory to `{ affirmed, denied, contradicted }` via the kernel's
  consistent ⊕ paraconsistent split (`compare`).

**The algebra is itself memory.** `recall` reads *which predicates are functional* from a
predicate-knowledge memory — its `(p, is, functional)` cells — not from config. Teaching a rule
is writing a fact.

## Quick start

```sh
pnpm test    # 9 checks (pure, in-memory), no network
```

A memory is a settled section of cells; `recall(memory, predicateKnowledge)` is pure — both
arguments are cell sections, supplied by the caller:

```js
import recall from "@561/development.experimental.predicate-algebra-parser/recalling";

// a cell is (subject, predicate, object) with an affirmation charge:
const C = (s, p, o) => ({ cell: { subject: { const: s }, predicate: { const: p }, object: { const: o } }, charge: [[{ const: "t" }], []] });

const memory    = { assignments: [C("ada", "color", "blue"), C("ada", "color", "red")] };
const knowledge = { assignments: [C("color", "is", "functional")] };

recall(memory, knowledge).contradicted; // → { color: … }   (blue vs red, functional → ⊤)
```

Without the `(color, is, functional)` fact, the two colors are just a graph fork — `recall(memory)`
leaves them affirmed. The rule changes the belief because the rule is data.

## Layout

```
library/memory/
  negating/   → negate  = the `negates` rule (resolve {not:X} to ⊤/f)   [→ kernel negate]
  excluding/  → exclude = the `functional` rule (alternatives → ⊤)      [→ kernel negate]
  believing/  → believe = the four-valued belief                       [→ kernel compare]
  recalling/  → recall  = apply the predicate algebra (from memory) + believe
```

| morphism | does |
| --- | --- |
| `negating` (`negate`) | resolve `{not: X}` claims into negative evidence on cell `(s,p,X)` |
| `excluding` (`exclude`) | a functional predicate's competing objects exclude each other → ⊤ |
| `believing` (`believe`) | resolve negations, then project `{ affirmed, denied, contradicted }` |
| `recalling` (`recall`) | apply the algebra (functionality read from a predicate-knowledge memory), then `believe` |

## Where it sits

- [`voidmath-kernel`](../../active/voidmath-kernel) — the only dependency: the morphisms the
  algebra aliases (`negate`, `compare`, `joining-knowledge`). The package consumes a memory
  (cell section) from any source and never touches disk.

## Status

- **Working (`pnpm test`, 9/9):** `negates` revives live, contained contradiction; `functional`
  (read from a predicate-knowledge memory) makes a graph fork contested; `believe` reports the
  four-valued belief. Proofs: *paraconsistency is contained* and *functional excludes alternatives*.
- **Next:** `specializes` (`is-a` propagates) and `converse`/`inverse-of` — more kernel morphisms
  aliased and composed the same way. See [`TODO.md`](TODO.md).
