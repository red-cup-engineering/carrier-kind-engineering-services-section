# span contract — one type, positional roles

Resolves the "span data shape" open decision from `architecture.md` and
`delimiter-ladder.md`. **Design**, not derived fact; kernel facts are cited and live
in `voidmath-notes.md`.

## There is one type: span
A span is the only entity. There is no separate `Token` type and no separate `Claim`
type. "Token" and "claim" are **positions in a pairing**, not kinds of thing.

```
Span = {
  start, end,   // [start, end) offsets into the original document — never drift
  text,         // the exact substring
  tier,         // document | block | sentence | clause | word
  parent,       // the `inside` edge (containment)
  prev,         // the `after` edge (previous sibling within parent)
}
```

That is the whole type. No `kind` field — role is not intrinsic.

## Token and claim are left and right
An utterance is a pairing of two spans:

```
Utterance = [left, right]   // left = token, right = claim
```

This is the kernel's own reading: `articulate` treats `left = token (the saturated
object)` and `right = claim (the unsaturated Fregean concept)`, and it never
type-checks either side — it just destructures `[object, concept] = potential`.
Saturation is positional. Drop a span on the left and it is a thing; drop the same
span on the right and it is a measure (an unsaturated concept with a hole the left
span fills).

## The same span flips roles
- The word `utilize` is a **token** (left) when measured against the rule
  `uses-common-words`: `[utilize, uses-common-words]`.
- The phrase `file-tree` is a **token** when checked for banned vocab, and
  **claim-material** when a later phrase is measured against it for "same phrase for
  the same thing" — now it rides on the right as the yardstick.

Nothing about the span changes; only its side does.

## Rules and text share the space
A style rule is a span too. A "detector" is therefore not a separate ontology — it is
just pairing a text-span (left) with a rule-span (right) and running the descent to
settle the charge. This collapses layer 2 (`architecture.md`): rules, text, and the
relations between them are all spans paired into utterances.

## Binary utterance, ternary cell (keep this straight)
`predicate` expands the binary utterance `[token, claim]` into the ternary cell
`(token, claim, token)`: the token fills both `E` slots (subject and object), the
claim is the predicate `Π`. For a relation between two *different* spans (`after`,
`inside`), the second span rides **inside the claim** — the right side is the
unsaturated concept "after spanB," with spanB as claim-material. So:

- `[wordA, (after wordB)]` — wordA is the token; the relation-to-wordB is the claim.
- The converse utterance pairs them the other way; `before` is `after`'s converse arc.

`[my read]` This suggests the predicate name itself (`after`, `inside`,
`uses-common-words`) may also just be a span — a symbolic or zero-width one — keeping
the "everything is a span" uniformity total. Not yet decided; flagged for when we wire
the first relation.

## Mapping to the kernel
```
const utterance = [left, right];           // two spans
const sheaf = settle(posit(predicate(articulate(utterance)))).sheaf;
// sheaf.section assigns the cell (left, right, left) its settled charge;
// the charge's thick witnesses can point at BOTH spans by offset.
```
Both sides are spans with offsets, so a diagnostic can cite the offending text **and**
the yardstick it failed against — both with source provenance.
