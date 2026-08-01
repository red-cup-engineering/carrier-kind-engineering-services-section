# punctuated-name-derivation-service

Transforms a Three Dots and a Dash punctuated name into the RMN (Relation
Model Notation) term it denotes.

## Why a term, not a step list

The firm's naming law is: an address IS a typed RMN term; a URI/URN or
punctuated-name string is only a boundary codec for it. This package's job is
therefore not "parse a string into a convenient JS object" but "read a string
as the one RMN `Tm` value it names."

## The encoding

Given the AST at
`lib/emsenn/services/561-group/services/red-cup-engineering/services/software-services-section/services/software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/src/lib/language/ast/types.mts`:

```
Tm = ["var",n] | ["lam",Tm] | ["app",Tm,Tm] | ["pair",Tm,Tm] | ["fst",Tm]
   | ["snd",Tm] | ["star"] | ["mark",string] | ["coincide",Tm,Tm]
   | ["cond",Tm,Tm,Tm] | ["fold",Tm,Tm,Tm]
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

## The checkTy import obstruction

The `Tm` shape above is exactly what
`.../ast/types.mts` and `.../check/index.mts`'s `checkTy`/`inferTy` expect
(`mark` infers `base`; `pair` infers `prod(leftTy, rightTy)`), so a term this
service returns is checkTy-able in principle: its type would be a
right-nested `prod` of `base`s, one level per step, with a lone `base` for a
bare atom.

This package does not import `checkTy` itself. `check/index.mts` lives
inside `javascript-services-section/lib/legacy/metroplat`, a legacy
TypeScript (`.mts`) tree with no live consumers and no built/published
package boundary that a plain `.mjs` package in this section can import
across without a TypeScript build step. Per instruction, this package does
not copy `checkTy`'s logic either. Instead, its test suite carries its own
minimal structural recognizer — a duplicate of `ast/validator.mts`'s
`isTerm`, which is pure shape-checking, not the type checker — and asserts
every term this function produces satisfies it.

If `checkTy` should be run against these terms for real (rather than merely
shape-checked), that requires relocating or otherwise exposing that reader
out of legacy — flagged here for the Leader to rule on, not decided
unilaterally by this package.
