---
title: "Reference on Relation Model Notation"
description: "This is a reference on Relation Model Notation (RMN), the package's portable notation for pure structure-to-structure morphism bodies, written for users of @emsenn/metroplat."
date-created: 2026-06-18
date-modified: 2026-07-06
tags:
  - RMN
  - term-ir
  - structure
  - action
  - morphism
  - settling
  - CHL
  - Lean
---

# Reference on Relation Model Notation

Relation Model Notation (RMN) is the package's JSON s-expression language for pure morphism bodies: a portable, inspectable term that carries what a structure-to-structure action *does*, instead of hiding it inside a TypeScript closure.

It is the code-level surface of the Curry-Howard-Lambek term calculus proven in `lean/RelMath/CurryHowardLambekQuartet.lean`: types, terms, de-Bruijn substitution, beta/projection reduction, complete development, and the decidable `HasTy` typing relation. The Lean proof certifies Church-Rosser, so the TypeScript reduction engine is a transcription of a mechanically verified rewriting system, not a speculative one.

A term is intentionally plain data — a frozen array such as `["lam", ["var", 0]]`, never a JavaScript closure. That means an action body can be serialized, witnessed, transported, inspected, and replayed.

## What RMN is

Obsmetrologia (“Infomaterial” at time of writing)'s potential spine runs `Mark -> Utterance -> Articulating -> Predicating -> Positing -> Settling -> ...`, and its governing law is stronger than "use a typed IR": **past Mark and Articulating, nothing is free**. Only marks and the articulating recursion admit primitive material; everything else must be derived. RMN is the notation that makes that law hold at runtime: only admission introduces opaque `mark` data, and everything downstream is a typed structure-to-structure morphism.

That gives RMN several simultaneous roles, in order:

1. **A structure presentation of terms** — frozen-array JSON s-expressions for a small typed calculus plus bounded domain operations.
2. **A settlement gate** — closed, well-typed executable material admitted into a decidable completion regime, never arbitrary host execution.
3. **A morphism-body discipline** — the portable `runTerm` a true structure-to-structure arrow should carry once host boundary material has already been admitted.
4. **A no-free-data witness** — evidence that a downstream action is derived behavior, not a hidden new primitive.
5. **A packet format for behavior-as-data** — a tool body can be carried, hashed, inspected, replayed, conformance-tagged, and projected to transports (`src/registries/morphism-packets.mts`, `src/registries/evaluator-term-packets.mts`).
6. **A proof-adjacent floor** — CHL-core terms sit against the Infomaterial Curry-Howard-Lambek calculus; non-core domain extensions (charge, settle, field, fold, ...) remain explicit executable relation material, justified by conformance vectors and Lean golden vectors, not silently upgraded to proof.

The shortest definition: RMN is the portable normal-form language for derived relational morphisms. It carries what an admitted structure-to-structure arrow does as inspectable term material, so execution can be read as settlement instead of trusted host closure.

For the unbuilt product-vision case — RMN as portable agent-tool bytecode, morphism-packet discovery, composition, and a multi-language interpreter roadmap — see [Research on RMN as agent tool bytecode](../06/23/2026-06-23-research-on-relation-model-notation-as-agent-tool-bytecode.md). That memo is speculative and largely unbuilt (the packet registries in `src/registries/` are the one piece that has since landed); it is not a description of current behavior.

## What RMN is not

- It is not the place opaque host data first enters — that is admission (`mark`).
- It is not a general programming language competing with JavaScript. It is the restriction that keeps executable material out of the aperiodic host-execution regime when a derived morphism can be carried instead.
- It is not merely a codec. The RMN codec is one projection of the notation; the notation also lives in action bodies, evaluator catalogs, morphism packets, witness material, and HTML admission gates (see [RMN-in-HTML decidable documents](../06/25/2026-06-25-research-on-rmn-in-html-decidable-documents.md) for that specific application).
- It is not automatically a proof of every claim it computes. The proof-core fragment has a specific type-theoretic reading; other evaluator terms are executable relational witnesses whose authority depends on their declared conformance and evidence.
- It is not *only* a directory — action `runTerm`s and the packet registries carry RMN material outside it too, and RMN remains a named system, not a synonym for one folder — but as of 2026-07-06 its own home is no longer scattered across differently-named top-level directories. After repeated sessions kept rediscovering the same RMN pieces broken in unrelated places (a stubbed structure here, an invented `append` there, `field` doing string-keyed lookup where the real math projects), the operator ruled directly: congregate it. `lib/language` renamed to `lib/notation` (the pure grammar) and `src/evaluators` moved wholesale into `src/notation/evaluating` (evaluation, type-checking, and the pre-built term catalogs this section describes below), joining the JSON codec and named surface syntax already at `src/notation/index.mts`. One name, `notation`, mirrored across the package's enforced pure/effectful split — see [the relating family of named systems](../06/25/2026-06-25-survey-of-the-relating-family-of-named-systems.md) for how RMN, RWIL, and WMAP relate as named products.

## Shape

The CHL core has four types and the standard STLC/product/unit term forms:

```
Ty = base | arrow Ty Ty | prod Ty Ty | unit

Tm =
  var n              de-Bruijn variable
  lam body           lambda abstraction
  app fn arg         function application
  pair left right    product introduction
  fst t | snd t      product projection
  star               unit / terminal
```

The package adds domain extensions outside the CHL core:

```
mark s                    opaque atomic string (field labels, data atoms)
charge name               a FOUR bilattice value (absurd/potential/active/stable)
bool b                    boolean (output of order/coincidence tests)
generator name            one of the four relational generators
negate | conflate | negConf t          unary charge ops
joinK | meetK | joinT | meetT l r      binary charge lattice ops
leK | leT l r              order comparisons -> bool
settle target seed         domain fixed-point over a charge closure
field key obj              named-field projection from an object-encoded term
append l r                 array-encoded list concatenation
coincide l r                structural equality test -> bool
cond test then else         boolean conditional
fold f init list             structural recursion (left fold over arrays) — the one recursion primitive
```

Everything is `Object.freeze`d. A `Tm` is immutable data, never a closure.

## Public surface

```ts
import { tm, ty, TySchema, TmSchema, rename, subst, inst } from "@emsenn/metroplat/notation/grammar";
import {
  step, dev, evaluate, evaluateRunTerm,
  hasTy, inferTy, checkTy, termSize, termUses, isClosed,
} from "@emsenn/metroplat/notation/evaluating";
import { jsonToTerm, termToJson, objectTerm, arrayTerm, stringTerm } from "@emsenn/metroplat/notation/evaluating/projecting";
```

The root export re-exports the common pieces for normal action authoring. `@emsenn/metroplat/notation/grammar` is the authored syntax layer (term/type constructors as frozen JSON, plus the `TySchema`/`TmSchema` structures that admit them); `@emsenn/metroplat/notation/evaluating` owns reduction and type checking; `@emsenn/metroplat/notation/evaluating/projecting` owns the structure bridge.

```ts
const identity = tm.lam(tm.var(0));
const proofType = ty.arrow(ty.base(), ty.base());
```

The structural operations are de-Bruijn operations, not evaluator shortcuts: `rename` changes free-variable indices under binders, `subst` replaces variables with terms while respecting binders, and `inst` applies a lambda body to one argument term.

## The reduction engine

- **`step(term)`** — returns all one-step reducts (non-deterministic; for exploration and property testing). Mirrors `RelMath.CHL.step`.
- **`dev(term)`** — Takahashi complete development: contracts every redex in one structural pass (beta-reduction on `app`/`lam`, epsilon-reduction on `fst`/`snd` of `pair`, immediate charge evaluation, `field` projection on concrete object terms, `fold` unrolling on concrete array terms, `cond` branch selection on `bool` tests). Mirrors `RelMath.CHL.dev`.
- **`evaluate(term)`** — iterates `dev` until fixed point, or throws past a fuel guard.
- **`evaluateRunTerm(runTerm, jsonInput)`** — the single entry point for running an action body: calls `jsonToTerm(jsonInput)`, applies the term, evaluates to normal form, and bridges back with `termToJson`.

```ts
const status = evaluateRunTerm(
  tm.lam(tm.field("status", tm.var(0))),
  { status: "potential" },
);
status; // "potential"
```

## The JSON structure bridge

`jsonToTerm(jsonValue)` / `termToJson(term)` are a round-tripping bijection on admitted JSON:

| JSON | Term |
|------|------|
| `null` | `["star"]` |
| `boolean` | `["bool", b]` |
| charge name string | `["charge", name]` |
| other string or number | `["mark", canonical(value)]` |
| `[x, y, ...]` | tagged-pair spine over `listTerm([...items])` |
| `{k: v, ...}` | tagged-pair spine over sorted entries |

Object keys are sorted lexicographically, so the bridge is canonical: the same JSON value always produces the same term.

```
JSON structure input -> jsonToTerm -> apply RMN body -> evaluate/settle -> termToJson -> JSON structure output
```

## Running terms in an action

Use `runTerm` when an action is a true structure-to-structure morphism; use a plain TypeScript `run` body when the action is a boundary (it admits external data, encodes/decodes a representation, touches I/O, or talks to a host process/transport).

```ts
import { action, tm } from "@emsenn/metroplat";

export const identity = action({
  verb: "identity",
  domain: someStructure,
  codomain: someStructure,
  runTerm: tm.lam(tm.var(0)),
});
```

The typing kernel (`src/typing/kernel.mts`) puts an optional `runTerm?: Tm` slot on the `Action` interface; the running layer (`src/running/action.mts`) synthesizes `run` from it when present. This means a term-bodied action is pure data: the `morphismStructure(action)` serialization written by the invocation-witnessing path includes `runTerm` verbatim, so the action's body travels in the same EAVT log as its verb and domain/codomain ids and can be replayed from storage without rehydrating a JS closure.

`actionIrAudit` and `freeTsActions` classify every registered action into **morphism** (domain and codomain both set — the arrows of the category, which should carry `runTerm`) and **boundary** (one or both ends absent — admissions, transports, codecs, observability hooks, which stay as free TS `run` closures). `freeTsActions(actions)` is a migration gauge, not an error signal: it should trend toward true boundaries only.

## Pre-built term catalogs

The package ships closed term catalogs built from these primitives, each differential-checked against its TypeScript counterpart (the test suite asserts byte-identical output between the IR term evaluated over a structure and the function called directly):

- **descent** — the `articulate -> predicate -> posit -> settle` relating chain as one composed lambda, plus `relateRelations` (monoid union of two filtrations) and `coincide` (the token-coincidence judgment).
- **readers** — the settlement-filtration measurement readers as `read . free` terms; the nine measurement reads (`readClassification`, `readDepth`, `readFirstCohomology`, `readGradedGap`, ...) are golden-vectored against Lean.
- **nat** — von Neumann naturals built over `fold`.
- **measurement** — closure-regime classifiers (`classifyRegime`, `cohomologyVanishesInRegime`) as IR cond-chains, golden-vectored against Lean.
- **fca** / **chu** — Formal Concept Analysis and finite Chu-space duality terms over FOUR.

## Boundary

This is not a general JavaScript replacement language. The shipped evaluator is the current RMN reducer for closed structure morphism bodies, with a fixed-point fuel guard and Lean-backed conformance vectors for the surfaces the package claims. Boundary effects, transports, codecs, and host-process calls remain in TypeScript and are projected through the action/running layer. RMN is proof-adjacent, not proof-identical: a well-typed CHL-core term can be read as a proof of its type under Curry-Howard, but domain extensions (charge, settle, field, fold, ...) are executable relation operations, not automatically proof-core inhabitants.

## Why it matters

`runTerm` makes a morphism body part of the category rather than a hidden closure behind one transport. The same body can be inspected, serialized as a morphism structure, served through CLI/HTTP/MCP, compared with Lean-emitted vectors, and witnessed in durable logs. That is also the substrate that makes tool bodies portable across a wire: an action can publish its domain, codomain, executable body, and conformance profile instead of only a schema and a server address, and `morphismPacketFromAction` / `registeredEvaluatorTerms` operationalize that as addressable, digestable, replayable morphism packets.
