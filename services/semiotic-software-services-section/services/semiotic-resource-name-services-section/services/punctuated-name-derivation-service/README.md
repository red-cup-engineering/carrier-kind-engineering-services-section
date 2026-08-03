# punctuated-name-derivation-service

Transforms a Three Dots and a Dash Semiotic Resource Name (SRN) surface into
the RMN (Relation Model Notation) path term it denotes.

## Why a term, not a step list

SRN is readable path syntax, not a content-identity scheme. This codec compiles
its generation, witness, and obstruction relations into closed, typed RMN claim
material. A token for that claim can be minted later by the canonical semantic
identity boundary; it is not embedded in or recovered from the SRN string.

## The encoding

Given the split grammar admitted by
`@red-cup-engineering/relation-model-notation`:

```
Tm includes ["pair",Tm,Tm] | ["mark",string]
```

a punctuated name is read left to right using only two of these constructors
— `mark` and `pair` — so that the mark alphabet stays the sole carrier of
meaning (no meaning is encoded in *which* constructor is chosen, only in
*what string a mark carries*):

- A bare atom `A` denotes `["mark", A]`.
- Each step `E <mark> B` (dot/colon/dash) denotes
  `["pair", termOf(E), ["pair", ["mark", relation], ["mark", B]]]`, where
  `relation` is `"generation"`, `"witness"`, or `"obstruction"` for `.`, `:`,
  `-` respectively.

So `order.payment:receipt-delay` denotes:

```
["pair",
  ["pair",
    ["pair", ["mark","order"], ["pair", ["mark","generation"], ["mark","payment"]]],
    ["pair", ["mark","witness"], ["mark","receipt"]]],
  ["pair", ["mark","obstruction"], ["mark","delay"]]]
```

The relation mark and the atom mark always sit at a fixed tree position (the
inner pair's left and right children respectively), so an atom that happens
to be spelled `"generation"` can never be confused with the relation tag:
tree position disambiguates them, not string content.

## Totality and confluence

Every conformant name yields exactly one term — this function is total on
its conformant domain, and deterministic (no choice points). The term it
builds uses only `mark` and `pair`. Checking `eval/index.mts`'s `step`
function in the same AST: `step(mark) = []` unconditionally, and
`step(pair)` produces a reduct only when one of its two children does. A term
built purely from `mark`/`pair` therefore contains no redex anywhere: it is
already its own normal form. Since the underlying calculus is proven
Church–Rosser confluent, and a redex-free term trivially reduces to itself
under any strategy, this term's normal form is unique and byte-identical on
every call — guaranteed by construction, not merely expected, and reachable
with zero evaluator steps.

## Escape and refusal

A name containing `_` anywhere returns `{claim: "none"}` — the paper's
explicit escape hatch (§8), not a refusal, and not a term. A name that
breaks the `Expr`/`Atom` grammar returns a typed refusal naming the broken
rule.

## Current RMN admission and typing

The implementation emits only split RMN `mark` and `pair` terms. The shared
typing service validates every result and syntax-directly infers its exact
type: a mark has type `["base"]`, and a pair has the nested
`["prod", left, right]` type.
`inferSemioticResourceNameType` checks the term against that inferred type;
it does not translate between competing RMN grammars. The canonical semantic
identity boundary commits that visible typed claim using deterministic CBOR
and treats its RFC 6920 NI URI only as an opaque commitment to those bytes.

`readSemioticResourceName(surface)` is the SRN-named reader (with
`derivePunctuatedName` retained for compatibility).
`renderSemioticResourceName(term)` accepts only the corresponding RMN path
sublanguage and is its checked inverse: every accepted term renders to a
surface which reads back to the same term.
