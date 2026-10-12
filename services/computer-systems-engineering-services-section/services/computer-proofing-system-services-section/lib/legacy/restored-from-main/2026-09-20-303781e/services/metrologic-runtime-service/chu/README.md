# @lenticule-science/metrologic/chu/four

**Belnap's names for the charge bilattice — a vocabulary view, nothing more.**

FOUR is the Belnap–Ginsberg four-valued bilattice. This module presents its four
points under Belnap's classical names (`t` / `f` / `⊥` / `⊤`) for a
mathematics-facing audience, and nothing else:

| Belnap name | charge value | coordinates `[truth, falsity]` |
| --- | --- | --- |
| `t` | `potential` | `[present, absent]` |
| `f` | `active` | `[absent, present]` |
| `bot` (⊥) | `absurd` | `[absent, absent]` |
| `top` (⊤) | `stable` | `[present, present]` |

**No re-derived logic.** A FOUR value *is*
[`@lenticule-science/articulating`](https://registry.561.group/-/web/detail/@lenticule-science/articulating)'s
`ChargeValue`. Every operation here lifts that charge's own morphism —
`negateValue`, `conflateValue`, `joinKnowledgeValue`, `meetKnowledgeValue`,
`joinTruthValue`, `meetTruthValue` — through the name table above. The only
thing local to this module is the naming.

## Usage

```js
import { FOUR, knowledgeJoin, negate, toCharge, fromCharge }
  from "@lenticule-science/metrologic/chu/four";

knowledgeJoin(FOUR.T, FOUR.F); // → "top"  (told both)
negate(FOUR.T);                // → "f"
toCharge(FOUR.BOT).name;       // → "absurd"
```

## API

- `FOUR`, `GLYPH`, `isFour`, `asFour`
- `toCharge`, `fromCharge` — the name ⇄ `ChargeValue` codec
- `negate`, `conflate` — the two involutions (the Klein gauge)
- `knowledgeJoin` ⊕, `knowledgeMeet` ⊗ — the knowledge order (identity ⊥ / ⊤)
- `truthJoin` ∨, `truthMeet` ∧ — the truth order (identity f / t)

## Chu spaces

Chu spaces over FOUR are **not** here. They belong to
`@lenticule-science/articulating/predicating/positing/logic/linear-logic-chu`,
the executable form of `Obsmetrologia/Calculus/Logic/LinearLogicChu.lean` —
the Chu carrier, its `*`-autonomous dual, Chu transforms, `row` / `col` /
`extension` / `settleRow` / `settleColumn`, and an exhaustive law receipt. Its
matrix entries are charge carriers, so a space carries its evidence and its
`dual ∘ dual = id` law holds as a structural equality.

```js
import { chuSpaceOfMatrix, row, extension, dual }
  from "@lenticule-science/articulating/predicating/positing/logic/linear-logic-chu";
```

## License

Follows the repository.
