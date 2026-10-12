---
title: "A Categorical Semantics for Node.js Package Layout"
description: "Draft arXiv-style paper (cs.PL/cs.SE): deriving conventional Node.js package-layout conventions (domain, schemas, services, adapters, controllers, middleware, repositories, errors, entities, route tables, workspaces) from established, citable public mathematics — strong monads, algebraic theories, effect handlers, coalgebras, automata theory — not from this repository's own vocabulary or habits."
date-created: 2026-07-05
keywords:
  - category-theory
  - monads
  - coalgebra
  - node
  - packaging
  - formal-derivation
references:
  - id: awodey2010
    type: book
    author:
      - family: Awodey
        given: Steve
    title: "Category Theory"
    edition: 2
    publisher: "Oxford University Press"
    issued:
      date-parts: [[2010]]
  - id: bulletproofreact2026
    type: webpage
    author:
      - literal: "Alan Alickovic (alan2207) and contributors"
    title: "bulletproof-react"
    URL: https://github.com/alan2207/bulletproof-react
    issued:
      date-parts: [[2026]]
    accessed:
      date-parts: [[2026, 7, 5]]
  - id: claessen1999
    type: article-journal
    author:
      - family: Claessen
        given: Koen
    title: "A Poor Man's Concurrency Monad"
    container-title: "Journal of Functional Programming"
    volume: 9
    issue: 3
    page: 313-324
    issued:
      date-parts: [[1999]]
  - id: cockburn2005
    type: webpage
    author:
      - family: Cockburn
        given: Alistair
    title: "Hexagonal Architecture"
    container-title: "alistair.cockburn.us"
    URL: http://alistair.cockburn.us/Hexagonal+architecture
    issued:
      date-parts: [[2005]]
    accessed:
      date-parts: [[2026, 7, 5]]
  - id: ershov1958
    type: article-journal
    author:
      - family: Ershov
        given: A. P.
    title: "On Programming of Arithmetic Operations"
    container-title: "Communications of the ACM"
    volume: 1
    issue: 8
    issued:
      date-parts: [[1958]]
  - id: evans2003
    type: book
    author:
      - family: Evans
        given: Eric
    title: "Domain-Driven Design: Tackling Complexity in the Heart of Software"
    publisher: "Addison-Wesley"
    issued:
      date-parts: [[2003]]
  - id: filliatreconchon2006
    type: paper-conference
    author:
      - family: Filliâtre
        given: Jean-Christophe
      - family: Conchon
        given: Sylvain
    title: "Type-Safe Modular Hash-Consing"
    container-title: "ACM Workshop on ML"
    issued:
      date-parts: [[2006]]
  - id: fowler2002
    type: book
    author:
      - family: Fowler
        given: Martin
    title: "Patterns of Enterprise Application Architecture"
    publisher: "Addison-Wesley"
    issued:
      date-parts: [[2002]]
  - id: fredkin1960
    type: article-journal
    author:
      - family: Fredkin
        given: Edward
    title: "Trie Memory"
    container-title: "Communications of the ACM"
    volume: 3
    issue: 9
    page: 490-499
    issued:
      date-parts: [[1960]]
  - id: hoare1978
    type: article-journal
    author:
      - family: Hoare
        given: C. A. R.
    title: "Communicating Sequential Processes"
    container-title: "Communications of the ACM"
    volume: 21
    issue: 8
    page: 666-677
    issued:
      date-parts: [[1978]]
  - id: jacobs1996
    type: chapter
    author:
      - family: Jacobs
        given: Bart
    title: "Objects and Classes, Co-algebraically"
    container-title: "Object-Orientation with Parallelism and Persistence"
    page: 83-103
    publisher: "Kluwer Academic"
    issued:
      date-parts: [[1996]]
  - id: king2019
    type: webpage
    author:
      - family: King
        given: Alexis
    title: "Parse, Don't Validate"
    container-title: "lexi-lambda.github.io"
    URL: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
    issued:
      date-parts: [[2019]]
    accessed:
      date-parts: [[2026, 7, 5]]
  - id: kiselyov2010
    type: chapter
    author:
      - family: Kiselyov
        given: Oleg
    title: "Typed Tagless Final Interpreters"
    container-title: "Generic and Indexed Programming"
    collection-title: "LNCS 7470"
    page: 130-174
    publisher: "Springer"
    issued:
      date-parts: [[2010]]
  - id: kiselyov2012
    type: chapter
    author:
      - family: Kiselyov
        given: Oleg
    title: "Iteratees"
    container-title: "Functional and Logic Programming (FLOPS 2012)"
    collection-title: "LNCS 7294"
    page: 166-181
    publisher: "Springer"
    issued:
      date-parts: [[2012]]
  - id: kleene1952
    type: book
    author:
      - family: Kleene
        given: S. C.
    title: "Introduction to Metamathematics"
    publisher: "Van Nostrand"
    issued:
      date-parts: [[1952]]
  - id: lianghudakjones1995
    type: paper-conference
    author:
      - family: Liang
        given: Sheng
      - family: Hudak
        given: Paul
      - family: Jones
        given: Mark
    title: "Monad Transformers and Modular Interpreters"
    container-title: "POPL '95"
    issued:
      date-parts: [[1995]]
  - id: maclane1998
    type: book
    author:
      - family: Mac Lane
        given: Saunders
    title: "Categories for the Working Mathematician"
    edition: 2
    publisher: "Springer"
    issued:
      date-parts: [[1998]]
  - id: mancinelli2006
    type: paper-conference
    author:
      - family: Mancinelli
        given: F.
    title: "Managing the Complexity of Large Free and Open Source Package-Based Software Distributions"
    container-title: "ASE 2006"
    issued:
      date-parts: [[2006]]
  - id: martin2017
    type: book
    author:
      - family: Martin
        given: Robert C.
    title: "Clean Architecture: A Craftsman's Guide to Software Structure and Design"
    publisher: "Prentice Hall"
    issued:
      date-parts: [[2017]]
  - id: moggi1991
    type: article-journal
    author:
      - family: Moggi
        given: Eugenio
    title: "Notions of Computation and Monads"
    container-title: "Information and Computation"
    volume: 93
    issue: 1
    issued:
      date-parts: [[1991]]
  - id: nodebestpractices2026
    type: webpage
    author:
      - literal: "Yoni Goldberg and contributors"
    title: "nodebestpractices"
    URL: https://github.com/goldbergyoni/nodebestpractices
    issued:
      date-parts: [[2026]]
    accessed:
      date-parts: [[2026, 7, 5]]
  - id: plotkinpower2002
    type: paper-conference
    author:
      - family: Plotkin
        given: Gordon
      - family: Power
        given: John
    title: "Notions of Computation Determine Monads"
    container-title: "FoSSaCS 2002"
    issued:
      date-parts: [[2002]]
  - id: plotkinpretnar2009
    type: paper-conference
    author:
      - family: Plotkin
        given: Gordon
      - family: Pretnar
        given: Matija
    title: "Handlers of Algebraic Effects"
    container-title: "ESOP 2009"
    issued:
      date-parts: [[2009]]
  - id: pnpm2026
    type: webpage
    author:
      - literal: "pnpm"
    title: "Settings"
    URL: https://pnpm.io/settings
    issued:
      date-parts: [[2026]]
    accessed:
      date-parts: [[2026, 7, 5]]
  - id: rabinscott1959
    type: article-journal
    author:
      - family: Rabin
        given: M. O.
      - family: Scott
        given: Dana
    title: "Finite Automata and Their Decision Problems"
    container-title: "IBM Journal of Research and Development"
    volume: 3
    issue: 2
    page: 114-125
    issued:
      date-parts: [[1959]]
  - id: reichel1995
    type: article-journal
    author:
      - family: Reichel
        given: Horst
    title: "An Approach to Object Semantics based on Terminal Co-Algebras"
    container-title: "Mathematical Structures in Computer Science"
    volume: 5
    issue: 2
    page: 129-152
    issued:
      date-parts: [[1995]]
  - id: reynolds1972
    type: paper-conference
    author:
      - family: Reynolds
        given: John C.
    title: "Definitional Interpreters for Higher-Order Programming Languages"
    container-title: "Proceedings of the ACM Annual Conference"
    page: 717-740
    issued:
      date-parts: [[1972]]
  - id: reynolds1983
    type: paper-conference
    author:
      - family: Reynolds
        given: John C.
    title: "Types, Abstraction and Parametric Polymorphism"
    container-title: "IFIP Congress"
    issued:
      date-parts: [[1983]]
  - id: rutten2000
    type: article-journal
    author:
      - family: Rutten
        given: J. J. M. M.
    title: "Universal Coalgebra: A Theory of Systems"
    container-title: "Theoretical Computer Science"
    volume: 249
    issue: 1
    page: 3-80
    issued:
      date-parts: [[2000]]
  - id: scott1970
    type: report
    author:
      - family: Scott
        given: Dana
    title: "Outline of a Mathematical Theory of Computation"
    number: "Technical Monograph PRG-2"
    publisher: "Oxford University Computing Laboratory"
    issued:
      date-parts: [[1970]]
  - id: shapiro2011
    type: paper-conference
    author:
      - family: Shapiro
        given: Marc
      - family: Preguiça
        given: Nuno
      - family: Baquero
        given: Carlos
      - family: Zawirski
        given: Marek
    title: "Conflict-free Replicated Data Types"
    container-title: "SSS 2011"
    collection-title: "LNCS 6976"
    page: 386-400
    issued:
      date-parts: [[2011]]
  - id: swierstra2008
    type: article-journal
    author:
      - family: Swierstra
        given: Wouter
    title: "Data Types à la Carte"
    container-title: "Journal of Functional Programming"
    volume: 18
    issue: 4
    issued:
      date-parts: [[2008]]
  - id: tarski1955
    type: article-journal
    author:
      - family: Tarski
        given: Alfred
    title: "A Lattice-Theoretical Fixpoint Theorem and Its Applications"
    container-title: "Pacific Journal of Mathematics"
    volume: 5
    issue: 2
    issued:
      date-parts: [[1955]]
  - id: thompson1968
    type: article-journal
    author:
      - family: Thompson
        given: Ken
    title: "Programming Techniques: Regular Expression Search Algorithm"
    container-title: "Communications of the ACM"
    volume: 11
    issue: 6
    page: 419-422
    issued:
      date-parts: [[1968]]
  - id: turing1939
    type: article-journal
    author:
      - family: Turing
        given: A. M.
    title: "Systems of Logic Based on Ordinals"
    container-title: "Proceedings of the London Mathematical Society"
    volume: "s2-45"
    issue: 1
    issued:
      date-parts: [[1939]]
  - id: turiplotkin1997
    type: paper-conference
    author:
      - family: Turi
        given: Daniele
      - family: Plotkin
        given: Gordon
    title: "Towards a Mathematical Operational Semantics"
    container-title: "LICS 1997"
    page: 280-291
    issued:
      date-parts: [[1997]]
  - id: vernon2013
    type: book
    author:
      - family: Vernon
        given: Vaughn
    title: "Implementing Domain-Driven Design"
    publisher: "Addison-Wesley Professional"
    issued:
      date-parts: [[2013]]
  - id: wadler1989
    type: paper-conference
    author:
      - family: Wadler
        given: Philip
    title: "Theorems for Free!"
    container-title: "FPCA '89"
    issued:
      date-parts: [[1989]]
  - id: wadler1992
    type: paper-conference
    author:
      - family: Wadler
        given: Philip
    title: "The Essence of Functional Programming"
    container-title: "POPL '92"
    issued:
      date-parts: [[1992]]
---


**Draft — working paper, target venue: arXiv cs.PL / cs.SE**

## Status

This note is deliberately general-purpose public mathematics, not a document about
`@emsenn/metroplat` or this checkout. It exists here because this is where the work
happened, not because its subject is this package. Every claim below traces to a
cited, independently checkable source (verified by direct web search this session,
not recalled from training data alone), and every claim that is this paper's own
extension rather than a quotation from the literature is marked as such — a
distinction this draft was corrected to hold to after an adversarial review pass
found several places an earlier version did not.

## Abstract

Conventional directory layouts for Node.js/TypeScript packages — `domain/`,
`services/`, `adapters/`, `controllers/`, `middleware/`, `repositories/`, `errors/` —
are near-universal in practice but are justified only informally, by appeal to Clean
Architecture @martin2017, Domain-Driven Design @evans2003, or hexagonal
architecture @cockburn2005, none of which state a decidable membership test for
"does this function belong here." We give such a test. Treating a package's pure
core as a category $\mathcal{C}$ and its computational effects as a strong monad $T$
on $\mathcal{C}$ @moggi1991, a morphism is either pure or lives in some Kleisli
category $\mathcal{C}_{T_i}$, and its layer is determined by the *set* of distinct
effects it touches — not, as an earlier draft of this note claimed, how many named
steps it happens to be written with, which is not a fact about which category a
morphism inhabits — and by where its computation sits in the primitive-recursive/
general-recursive hierarchy of computability theory @kleene1952 @scott1970. This
reconstructs the standard layer names as theorems rather than conventions (§3):
admission as a Kleisli arrow into the partiality monad @king2019; domain logic as
pure morphisms, with settling as a distinguished Knaster–Tarski-convergent subclass
@tarski1955; repositories as models of a free algebraic theory, distinguished from
adapters by touching more than one such theory rather than by step count @plotkinpower2002; errors as coproduct injections, not a convention bolted onto a
success type; and middleware as continuation-passing style carrying the
request/response effect specifically — one tier weaker than, and deliberately
excluded from the core table rather than conflated with, full algebraic effect
handling @plotkinpretnar2009. The dual, coalgebraic construction [Reichel
1995; Jacobs 1996; Rutten 2000] gives ORM-style entities and streams a precise home
neither the pure nor the effectful account otherwise provides; automaton theory
@fredkin1960 @thompson1968 @rabinscott1959 does the same for route tables;
and the same free-algebra apparatus, applied one level up, classifies pnpm workspace
dependency resolution as content-addressed hash-consing @ershov1958. A second,
independent axis — which business/domain concern, or, for a package whose actual
content is mathematics rather than business logic, which named external subject a
unit is about — crosses the layer axis in real documented practice, confirmed
against curated guides and independently cloned applications rather than assumed
(§3.18, §5). The full specification both axes produce is stated as one table
immediately following this abstract, each row cited to the section that derives it;
the remainder of the paper is that derivation, its extensions (concurrency, streams,
dependency injection, testing — §3.11–§3.13), and its honestly-stated limits (§7).

## Normative Specification

Stated first, as a claim, because a paper arguing for a normative form should say
what that form *is* before spending twenty sections deriving it — a reader (or an
agent applying this paper to real code) who never reaches the derivation should
still leave with the actual answer, not just evidence that an answer exists
somewhere in the document. **Everything below this section is derivation and
justification for the claim stated here; nothing here is asserted without being
argued for elsewhere in this paper**, and every row below is cross-referenced to
where.

**The claim.** A Node.js/TypeScript package's layout is normatively two independent
axes, crossed:

- **Context** (outer, in the common case; Definition 6, §3.18): which named
  business/domain noun (a `User`, an `Order`) or, for a package whose actual content
  is mathematics rather than business logic, which named external subject (§3.19,
  Definition 7) a unit of code is about. A unit with no anchor in either sense is
  cross-cutting and has no context.
- **Layer** (inner, in the common case; Theorem 1, §3): which of the rows below a
  unit's own type/effect signature places it in, decided mechanically, never by
  name or by analogy to an existing folder.

Real projects nest these two axes either way (context-outer, the majority pattern
per §5's practitioner survey; or layer-outer, the classical MVC pattern) or collapse
context to a filename suffix with layer as the sole directory (§3.18's third
confirmed pattern) — which nesting a given project uses is a stylistic fact to
detect from that project, but the two axes themselves, and the vocabulary below, are
not.

**The layer vocabulary, exhaustively, is:**

| Directory | One-line test | Derived in |
| --- | --- | --- |
| `schemas/` | Kleisli arrow into the partiality/exception monad: raw input in, admitted structure or rejection out | §3.1 |
| `domain/` | Pure morphism, no effect, no idempotence/monotonicity claim | §3.2 |
| (no separate name; a `domain/` subclass) | Pure, idempotent + monotone in a stated order (settling/normalization) | §3.2 |
| `adapters/` | $\lvert\mathrm{Kl}(f)\rvert = 1$, model fixed to one concrete external system | §3.3 |
| `repositories/` | $\lvert\mathrm{Kl}(f)\rvert = 1$, abstract signature, model deferred | §3.3 |
| `services/` | $\lvert\mathrm{Kl}(f)\rvert \ge 2$ | §3.4 |
| `controllers/` (or `commands/` for CLI) | $\lvert\mathrm{Kl}(f)\rvert = 1$, the request/response (or CLI) effect specifically, thin | §3.5 |
| `middleware/` | Receives a reified continuation, passes the same effect on (CPS), does not eliminate it | §3.6 |
| `errors/` | The coproduct's second summand — a codomain fact, co-occurs with any row above | §3.7 |
| (no separate name; §3.8 extension) | Reference cells/registries/config/store: a named binding, not a function — classified by Corollary 2, not Theorem 1 | §3.8 |
| `entities/` | A coalgebra (Definition 5): state + methods, identity persists under mutation | §3.9 |
| (route tables; often `routes/`) | An automaton over registered path patterns, not a function | §3.10 |
| `types/` | An object with no admission arrow anywhere targeting it | §3.14 |
| `utils/`, `helpers/` | Pure, parametric in *every* free type variable, names no specific domain object | §3.15 |
| `hooks/` | A coalgebra keyed by render order (a further Definition 5 instance) | §3.16 |
| `components/` | Pure morphism from props (+ hook reads) to a rendered-tree structure | §3.16 |
| `store/`, `state/` | The §3.8 reference-cell construction at application rather than module scope | §3.8, §3.16 |
| `clients/` | `adapters/`'s row, specifically targeting a third-party network service | §3.3 |
| `plugins/` | An *extension of* a signature (a new operation), not a model of a fixed one | §3.3 |
| `index.ts` | Names the public subcategory; not a layer, a fact about which morphisms are exported | §3.17 |
| `lib/` | An adapter with a third-party library's configuration (not a business binding) partially applied | §3.17 |
| `dto/` | `schemas/`/`types/` under NestJS-ecosystem naming | §3.18 |
| `mappers/` | Pure morphism reshaping an admitted entity into an outbound wire shape | §3.18 |
| `views/` | A presentational component (§3.16), rendered server-side | §3.18 |
| `validators/` | `schemas/`'s admission row, kept in its own folder rather than beside the structure | §3.18 |

**This list is exhaustive of what this paper licenses as a directory name.** A name
is not licensed merely because it already appears in some target codebase's existing
tree — that is precisely the failure Corollary 10 (§3.19) names: checking a name
against a codebase's own prior structure is not the same test as checking it against
this specification or against Definition 7's external-vocabulary test, and the two
can disagree completely (an internally 100%-consistent existing tree can use zero
names from this table). Concretely, for anyone — human or model — applying this
paper to reorganize real code: **the existing directory tree is admissible input
only for detecting which of the three nesting *patterns* above a project already
uses (§8's input (b)), and for checking whether a context anchor already has an
exported constructor. It is never admissible as a source for which *name* to output.**
A suggested path is always built from this table (or, for context, from a real
business noun or Definition 7-passing subject name) — never copied from a directory
that merely happens to already exist in the target codebase, however established it
looks there.

## 1. Introduction

Every sufficiently large Node.js package accretes the same directory names —
`services/`, `controllers/`, `middleware/`, `repositories/`, `adapters/` — yet the
justification for placing a given function in one rather than another is almost
always social convention rather than mathematical necessity. Practitioners cite
architectural patterns (Clean Architecture, hexagonal/ports-and-adapters,
Domain-Driven Design) that were themselves derived informally, by design experience
rather than proof. Two engineers can disagree in good faith about whether a given
function belongs in `services/` or `adapters/`, and no theorem settles it.

This paper's claim is that the disagreement is avoidable, because the underlying
distinctions are not informal at all — they are already theorems in the theory of
computational effects, and have been since Moggi's 1991 paper connecting monads to
the semantics of effectful programs. What the software-architecture literature
converged on by trial and error, denotational semantics and category theory already
proved. We make the connection explicit and derive a placement procedure from it.

The paper is organized as a chain of definitions and theorems, each drawn from
established, citable results (§2), applied to a formal model of a package (§3), down
to the granularity of individual variables and reference cells (§3.8), and out to
every directory a real Node/TypeScript package tree commonly contains — not only
the backend-architecture subset (`services/`, `controllers/`, `middleware/`,
`repositories/`, `adapters/`) but `types/`, `utils/`/`helpers/`, `hooks/`,
`components/`, `store/`/`state/`, `commands/`, `plugins/`, `clients/`, `index.ts`,
and `lib/` (§§3.14–3.17) — from which the placement classification follows as a
corollary (§4) rather than being asserted. §5 relates the derived layers to named
architectural patterns already in practice. §6 extends the same apparatus one level
up, from a single package to a pnpm workspace of packages linked by declared
dependency edges. §7 states the limits of the
derivation honestly, including several corrections an adversarial review of an
earlier draft forced, rather than smoothing them over.

## 2. Preliminaries

### 2.1 Categories, and the pure core of a package

We take a package's **pure core** to be a locally small category $\mathcal{C}$: its
objects are the package's admitted data types (the *structures* — validated shapes,
never raw untyped data), and its morphisms are total, deterministic functions between
them, with no observable side effect and no dependence on anything outside their
argument. This is an ordinary category in the sense of Mac Lane @maclane1998:
identities and associative composition are the only structure assumed.

### 2.2 Effects as a strong monad; the Kleisli category

Moggi @moggi1991 showed that a wide class of computational effects — partiality,
exceptions, state, input/output, non-determinism — can each be modeled uniformly as a
**strong monad** $T : \mathcal{C} \to \mathcal{C}$, with unit $\eta : \mathrm{Id}
\Rightarrow T$ and multiplication $\mu : T^2 \Rightarrow T$ satisfying the monad
laws. A computation with effect $T$ from $A$ to $B$ is not a morphism $A \to B$ in
$\mathcal{C}$ but a morphism $A \to T(B)$ — a **Kleisli arrow**. These compose via
Kleisli extension $(-)^{*}$, forming the **Kleisli category** $\mathcal{C}_T$, whose
objects are those of $\mathcal{C}$ and whose morphisms $A \to B$ are exactly
$\mathrm{Hom}_{\mathcal{C}}(A, T(B))$ [Moggi 1991, §2; Wadler 1992, §2 gives the
programming-language reading of the same construction]. The inclusion $J : \mathcal{C}
\to \mathcal{C}_T$, $J(f) = \eta_B \circ f$, embeds every pure morphism as a trivial
effectful one.

This gives an immediate, non-negotiable binary distinction for any function $f$ in a
package: **either $f$ factors through $J$ (it is pure) or it does not (it is an
authentic Kleisli arrow for some effect $T$)**. This is not a stylistic choice; it is
a fact about which category $f$'s type signature places it in.

### 2.3 Partiality, exceptions, and coproducts

The **partiality monad** $T_{\mathrm{Maybe}}(A) = A + 1$ (Moggi's "computations that
may not terminate/produce a value") and the **exception monad** $T_{E}(A) = A + E$
for a fixed object $E$ of "errors" are both instances of §2.2 [Moggi 1991, §3.1,
3.4]. Crucially, $A + E$ is the categorical **coproduct** of $A$ and $E$: a morphism
into it is, by the universal property of coproducts, exactly a case split between
"succeeded with a value of type $A$" and "failed with a value of type $E$" [Mac Lane
1971/1998, Ch. III; Awodey 2010, §2.6]. There is nothing ad hoc about a success/error
sum type — it is the coproduct object for the exception monad, forced by the same
construction that gives ordinary `Either`/`Result` types their semantics [Wadler
1992, §2.3 identifies exactly this monad as the "error" monad].

### 2.4 Fixed points: Knaster–Tarski

For a complete lattice $L$ and a monotone endofunction $f : L \to L$, the
Knaster–Tarski theorem @tarski1955 guarantees a least fixed point
$\mathrm{lfp}(f) = \bigwedge \{ x \in L : f(x) \le x \}$, obtained (in the
$\omega$-continuous case) as the colimit of the ascending chain $f^n(\bot)$. @scott1970 gives the domain-theoretic refinement used in denotational semantics: if $f$ is
**Scott-continuous** — preserves directed joins — then $\mathrm{lfp}(f) =
\bigvee_n f^n(\bot)$, reached in the limit and, whenever the lattice has finite
height, reached after finitely many iterations. This is the standard semantic
account of "a computation that converges to a normal form": it is nothing more than
computing a least fixed point of a monotone (in the well-behaved case,
Scott-continuous) operator.

### 2.5 The computability hierarchy

Kleene's classification of recursive functions @kleene1952 gives the
two tiers §3's classification actually uses:

1. **Primitive recursive**: built from zero, successor, and projection by
   composition and *primitive* (bounded) recursion — every such function is total
   and its running time is bounded by a function computable *before* running it.
2. **General recursive (Turing-computable)**: closed additionally under unbounded
   (μ-)search — total functions in this class may still not have a statically known
   running-time bound, only a guarantee (when total) that a search terminates.

Two further, well-known distinctions are real and relevant to adjacent questions but
are not needed below and are not folded into Definition 2's classification: whether
a computation requires interaction with an external oracle @turing1939, and
whether a grammar's own well-formedness is decidable at all (relevant to §3.10's
automaton-theoretic treatment of route patterns, not to Definition 2). An earlier
draft of this note carried both as tiers 3–4 of a single four-tier hierarchy
attributed wholesale to Kleene @kleene1952; that attribution was imprecise (oracle
computability is Turing's @turing1939, not Kleene's, and grammar decidability is a third,
separate axis from either), and neither tier did any classificatory work in Theorem
1 below. They are cut here rather than carried as unused apparatus.

This is entirely standard computability and denotational-semantics material; nothing
in §§2.1–2.5 is specific to software packaging, and every claim in this section is
independently checkable against the cited sources without reference to any code.

## 3. A Formal Model of a Package

**Definition 1 (Package).** A package is a pair $(\mathcal{C}, \{T_i\}_{i \in I})$:
a pure core $\mathcal{C}$ (§2.1) together with a finite family of strong monads
$T_i$ on $\mathcal{C}$, one per distinct effect the package touches (partiality,
exceptions, filesystem I/O, network I/O, mutable local state, etc.), following Moggi
@moggi1991's account that distinct effects are modeled by distinct monads, optionally
combined via monad transformers @lianghudakjones1995 when a function needs more
than one effect at once.

**Granularity, made precise.** Moggi's own taxonomy (partiality, exceptions, state,
I/O, non-determinism) is coarser than §3.4 needs: it treats all host I/O as one
repository and a Stripe client — register as "the same effect" and silently
misclassify an ordinary orchestration service as touching only one. To avoid this,
$I$ is indexed one per **named port** — one per free algebra $\Sigma$ (§3.3) or
fixed adapter binding the package depends on — not one per Moggi-taxonomy kind. Two
repositories backed by the same physical database are still two distinct $T_i$ if
they are two distinct signatures (`UserRepository`, `OrderRepository`), because
what a function depends on, and what a test must independently substitute a model
for (§3.13), is the port, not the infrastructure behind it. This is also what makes
$\lvert\mathrm{Kl}(f)\rvert$ (§3.4) mechanically checkable from source: it is the
count of distinct imported/injected port dependencies a function's body actually
calls, not an inference about underlying infrastructure a static reading of the
source cannot see.

**Definition 2 (Layer of a morphism).** For $f$ a morphism of $\mathcal{C}$ (pure) or
of some Kleisli category $\mathcal{C}_{T_i}$, or a finite Kleisli composite of such
arrows, let $\mathrm{Kl}(f)$ be $\bot$ if $f$ factors through $J$ (§2.2, pure), or
the *set* of distinct effects $\{T_i\} \subseteq \{T_j\}_{j \in I}$ (Definition 1)
actually appearing somewhere in $f$'s composite type — not the number of named steps
$f$'s source happens to be written with, which is not a fact about which category
$f$'s type places it in (composing two Kleisli arrows into the same monad $T$
yields, inside $\mathcal{C}_T$, a single arrow $A \to T(C)$ indistinguishable from
one written as one step; only the number of *distinct* $T_i$ touched is a fact about
$f$'s type). The **layer** of $f$ is the pair $(\mathrm{Kl}(f), c(f))$ where
$c(f) \in \{1, 2\}$ is $f$'s class in the computability hierarchy of §2.5, restricted
to the convergence behavior of $f$'s own defining recursion, independent of which
effect(s) it targets.

This is a formal object, not a name: two functions have the same layer iff they
touch the same *set* of distinct effects (possibly empty) and sit at the same point
in the computability hierarchy. Placement is then not a judgment call but a lookup —
within the scope Theorem 1 states below, which is narrower than "every function in a
package": it excludes coalgebra structure maps (§3.9, §3.12), automaton transition
functions (§3.10), and handler clause sets (§3.6), each of which is a genuinely
different mathematical object and receives its own classification in the section
cited, not a row in the table below.

**Theorem 1 (Layer classification for morphisms, derived).** Every morphism $f$ of
$\mathcal{C}$ or of a Kleisli category $\mathcal{C}_{T_i}$ (or a finite composite of
such) falls into exactly one of the following cells, determined by Definition 2. The
error property (last row) is a fact about $f$'s codomain and can co-occur with any
of the other rows, not an exclusive ninth case.

| $\mathrm{Kl}(f)$ | $c(f)$ | Named layer |
| --- | --- | --- |
| $\bot$ (pure) | 1 | admission / schema validation (§3.1) |
| $\bot$ (pure), no idempotence/monotonicity claimed, names a specific domain object | 1 or 2 | ordinary domain logic (§3.2) |
| $\bot$ (pure), idempotent + monotone in a stated order | 1–2 (Knaster–Tarski/Scott convergent) | settling/normalization logic (§3.2) |
| $\bot$ (pure), parametric in every free type variable of its signature (§3.15) | 1 or 2 | generic utility (§3.15) |
| $\lvert\mathrm{Kl}(f)\rvert = 1$, model fixed to a concrete monad | 1–2 | adapter (§3.3) |
| $\lvert\mathrm{Kl}(f)\rvert = 1$, abstract signature (free monad, model deferred) | 1–2 | repository port (§3.3) |
| $\lvert\mathrm{Kl}(f)\rvert \ge 2$ (necessarily a monad-transformer composite) | 1–2 | service / use case (§3.4) |
| $\lvert\mathrm{Kl}(f)\rvert = 1$ (the request/response effect), parametric in the structure where the host language enforces it (§3.5) | 1–2 | controller (thin) (§3.5) |
| codomain is $A + E$ for a finite error object $E$ (§2.3) | — | error (§3.7), co-occurring |

*Proof sketch.* A morphism in scope is pure ($\bot$) or touches a nonempty finite
set of effects (Definition 1 requires $\{T_i\}_{i \in I}$ finite). If pure, it is
idempotent-and-monotone-in-a-stated-order (settling, §3.2) or not; if not, it is
further split by whether it is parametric in every free type variable of its
signature (generic utility, §3.15) or names a specific domain object (ordinary
domain logic, §3.2) — again exhaustive and, by construction, mutually exclusive
(a morphism naming a specific domain object cannot be parametric in every type
variable of its own signature, since that name is not a variable). If effectful,
$\lvert\mathrm{Kl}(f)\rvert$ is exactly $1$ or $\ge 2$, exhaustively; the $=1$ case
splits further by whether the model is fixed (adapter) or deferred (repository port,
§3.3) or is specifically the request/response effect under the parametricity
discipline of §3.5 (controller) — these three are not claimed mutually exclusive by
type alone (a controller with a deferred model is possible) and the table's
ordering states the priority a placement measurement applies, first-match. The
$\ge 2$ case is service (§3.4) with no further split needed. The error property is
orthogonal, a fact about codomain shape, and is listed separately rather than as a
disjoint ninth branch. $\square$

The remainder of §3 justifies each row, including §3.15's generic-utility row.
§3.6 (middleware), §3.9 (entities), §3.10 (route tables), §3.12 (streams), §3.13
(testing), §3.14 (types, an object-level not morphism-level fact), §3.16 (hooks,
components — further coalgebra instances), and §3.17 (entry points, coarse naming)
extend the paper's coverage past this theorem's stated scope rather than adding
further rows to it.

### 3.1 Admission / schema validation as a Kleisli arrow into the partiality monad

A validator taking raw, untyped input (JSON, a form body, an environment variable)
and producing either an admitted structure or a rejection is, by definition, a
function $\mathrm{raw} \to T_{\mathrm{Maybe}}(\mathrm{Structure})$ or $\mathrm{raw}
\to T_E(\mathrm{Structure})$ (§2.3) — a Kleisli arrow into the partiality or exception
monad. King @king2019's widely-cited "parse, don't validate" is the informal statement
of exactly this: a validator that returns a `boolean` is a wasted opportunity to
instead return the coproduct-typed result and let the type system carry the proof of
admission forward. Because the parse itself (checking a fixed schema against a fixed
input) requires no unbounded search, it sits at computability class 1 (primitive
recursive) whenever the schema is finite — the standard case.

### 3.2 Domain logic: ordinary pure morphisms, and the distinguished settling subclass

The general case of "domain logic" is simply a pure morphism in $\mathcal{C}$
(§2.1): total, deterministic, no monad involved. Nothing beyond composition in
$\mathcal{C}$ is needed to justify this row, and most domain functions (computing a
total, formatting a name, checking an inequality) carry no further structure — it
would overclaim to assign every such function a fixed-point reading.

A genuine **subclass** does carry more structure and deserves the stronger claim:
functions whose specification is to "settle" input to a normal form —
deduplication, netting, conflict resolution, canonicalization, idempotent
normalization — are, mathematically, computations of a least fixed point of a
monotone operator over the relevant partial order (§2.4). For this subclass only,
the termination guarantee (it will not loop forever) is exactly the Knaster–Tarski
theorem, or, in the Scott-continuous case, the $\omega$-chain construction @scott1970. Such a function is pure ($\mathrm{Kl}(f) = \bot$) and sits at computability
class 2 in general (an unbounded but monotone search), or class 1 if the relevant
lattice is finite (the common case for business data). The distinguishing test is
syntactic and checkable: does the function's specification assert idempotence
($f \circ f = f$) and monotonicity with respect to a stated partial order? If not,
it is ordinary domain logic, not a settling computation, and Knaster–Tarski is not
being invoked correctly if cited for it.

A common real-world instance of this subclass deserves its own name: distributed
backends frequently need a merge function that reconciles concurrently-made,
possibly conflicting updates into one result regardless of the order they are
observed in (retried writes, offline-then-synced edits, multi-region replication).
**Conflict-free replicated data types** [Shapiro, Preguiça, Baquero, and Zawirski
2011] are, in their *state-based* (CvRDT) form specifically, join-semilattices with
a monotone, commutative, idempotent merge operation — exactly the closure-operator
structure of §2.4. (Shapiro et al.'s *operation-based*, CmRDT, form instead relies on
commutative-operation delivery under a causal broadcast channel, not a literal join
function, and is not claimed here to reduce to Knaster–Tarski directly — the two
forms are proven equivalent under further conditions in the same paper, not treated
identically by this note.) For the state-based case, a merge function's correctness
(order-independence, convergence regardless of delivery order) is, under this
reading, nothing but the Knaster–Tarski least-fixed-point guarantee applied to a
join-semilattice — a distributed-systems concern reducing to the same theorem
already used for ordinary in-process settling logic, not a separate body of theory.

### 3.3 Adapters and repository ports

A function binding to exactly one external system atomically (one HTTP call, one
SQL query) is a single Kleisli arrow for that system's effect monad — an
**adapter**. When, instead of a concrete binding, only an *abstract signature* of
operations is fixed (e.g. `get(id)`, `save(entity)`, with no commitment to a
concrete store), the correct formal object is not the adapter itself but a **free
algebraic theory** generated by that signature.

Concretely: let $\Sigma$ be a signature of operation symbols with arities (e.g.
$\mathrm{get} : \mathrm{Id} \to A$, $\mathrm{save} : A \to 1$). Following Plotkin and
Power @plotkinpower2002, $\Sigma$ generates an endofunctor $F_\Sigma(X) = \coprod_{\mathrm{op}
\in \Sigma} X^{\mathrm{arity(op)}}$, and the **free monad** on $\Sigma$ is $T_\Sigma(A)
= \mu X.\, A + F_\Sigma(X)$ — the initial algebra of $A + F_\Sigma(-)$, whose
existence for a polynomial $F_\Sigma$ is guaranteed on $\mathbf{Set}$ by the standard
initial-algebra construction [Mac Lane 1971/1998, Ch. V; realized directly in
functional code as the free-monad construction of Swierstra 2008]. A **model** of
$\Sigma$ in a concrete monad $M$ is an $F_\Sigma$-algebra $\alpha : F_\Sigma(M) \to
M$; by initiality of $T_\Sigma$, any such model induces a unique monad morphism
$T_\Sigma \to M$ — this is the concrete adapter (an in-memory store, a SQL-backed
store) recovering one specific implementation of the abstract port.

The **repository pattern** @fowler2002 is exactly this pair: the
abstract port is $T_\Sigma$ itself (the free theory — code written against it commits
only to the signature $\Sigma$, never to a model); a concrete repository
implementation is a choice of model $\alpha$. This gives repositories a citable
mathematical identity distinct from a plain adapter: an adapter targets one already-
fixed concrete monad $M$; a repository port targets the *free* monad $T_\Sigma$, with
$M$ supplied later as a model — precisely the deferred-binding property the pattern
is prized for.

An outbound API **client** is the naming practitioners use for an adapter (above)
specifically targeting a third-party network service rather than a database — the
same construction, no new math, distinguished only by which concrete monad $M$ is
supplied.

A **plugin system**, by contrast, is not a model of a fixed $\Sigma$ but an
*extension of* $\Sigma$ itself: a plugin registers a new operation (a new summand)
into what was, before it loaded, a smaller signature. This is the open, extensible
signature construction of Swierstra @swierstra2008 (already cited above for the free-monad
encoding itself) — "data types à la carte" gives exactly a coproduct-of-functors
presentation of $F_\Sigma$ that can be *extended* with a new summand without
revisiting existing code, the composable-open-union solution to the expression
problem. A repository's $\Sigma$ is fixed once and only its model varies (deferred
binding, above); a plugin system's $\Sigma$ itself grows at load time, which is why
"plugins" and "repository ports" are not interchangeable vocabulary for the same
thing despite both being free-algebra constructions.

### 3.4 Services as Kleisli composition across distinct effects

A function that calls a repository, then an external API, then persists a result is
a **composite** Kleisli arrow, built by Kleisli extension (`>=>` in Haskell notation)
of the constituent effectful steps. But Kleisli composition is closed — composing
two arrows into the *same* monad $T$ yields a single arrow $A \to T(C)$ in
$\mathcal{C}_T$, with no trace inside the category of how many named steps built it.
"Composite of $\ge 2$ steps" is therefore not, by itself, a fact about which
category a morphism lives in; it is a fact about how the source happens to be
written, and refactoring (inlining, or splitting one call into two) would silently
flip a classification built on step-count alone — exactly the judgment-call
indeterminacy this paper exists to eliminate.

What *is* a fact about $f$'s type, invariant under such refactoring, is the number
of **distinct** effects $\lvert\mathrm{Kl}(f)\rvert$ it touches (Definition 2): a
function touching only the database, however many named calls it makes to it, has
$\lvert\mathrm{Kl}(f)\rvert = 1$ and is an adapter or repository port (§3.3), not a
service, no matter how it is refactored; a function touching the database *and* an
external API *and* a log sink has $\lvert\mathrm{Kl}(f)\rvert = 3$, requiring a
monad-transformer stack @lianghudakjones1995 to combine them,
and remains so regardless of how many named intermediate steps its source is split
into. A **service**, under this classification, is any function with
$\lvert\mathrm{Kl}(f)\rvert \ge 2$ — exactly what "orchestration"/"use case" logic
is: not a new kind of mathematical object, but a morphism whose type itself, not its
written form, requires composing more than one effect.

A service typically composes several repository ports (§3.3) at once, each still
an abstract signature with its model deferred; **dependency injection** is the
practice of supplying all those models together, at one point, rather than one at a
time. This is the environment-monad reading of §3.8 generalized from a single
config value to a whole tuple of models — an object-valued reader
$T_{\mathrm{Env}}(A) = (\mathrm{Deps} \to A)$ where $\mathrm{Deps}$ is the product of
every signature's chosen model — and the discipline of writing a service against an
interface/typeclass rather than a concrete import is exactly Kiselyov's
**tagless-final** style @kiselyov2010: the service is parameterized by the *models* of its
dependencies' signatures rather than committing to one, and a "DI container" is the
runtime construction of one particular $\mathrm{Deps}$ value satisfying every
service's requirements at once. This does not, as stated, address how a container
resolves ordering when dependencies are mutually referential — real containers
handle this by lazy thunking or an explicit topological sort over the dependency
category (§6, Definition 4), a mechanism this note does not further formalize.

### 3.5 Controllers, and the parametricity criterion for "thin"

A controller (an HTTP handler, an RPC entrypoint) is, in the classification of
Definition 2, simply a Kleisli arrow (§3.3–§3.4) whose target monad is the
"live request/response" effect — nothing here forces a new kind of mathematical
object, and asserting one without proof would repeat exactly the overclaiming this
paper is trying to avoid. What *is* independently formalizable is the
architectural requirement that a controller be "thin" — that it deserialize,
delegate, and reserialize, without embedding business logic of its own.

This requirement has a precise name via **parametricity** @reynolds1983 @wadler1989, with an important direction-of-inference caveat this note states plainly
rather than glosses over. Reynolds' abstraction theorem is a *consequence* of a
function's type being genuinely, semantically parametric — provable in a calculus
(System F) where a type variable cannot be inspected at runtime by any available
operation, so *any* well-typed term at that type automatically satisfies a
naturality condition, for free. It is not, in its original form, a *diagnostic* for
whether an arbitrary, already-written function is well-behaved — using it that way
inverts the theorem's direction.

TypeScript/JavaScript sharpen the caveat further: generics are erased at runtime,
and every value remains reflectively inspectable (`typeof`, `Object.keys`,
`'field' in x`, `instanceof`) regardless of a function's declared type signature. A
controller can carry a fully generic `<A>` signature and still branch on payload
internals without ever writing a literal constructor pattern-match — the semantic
guarantee Reynolds' theorem gives System F does not transfer to an erased,
reflective host language merely because a function is written with a type variable.
**"Thin" is therefore the property Reynolds/Wadler parametricity would force in a
language with true parametric polymorphism** — a precise target to aim for, citing
why that target is the right one — **not a property TypeScript's actual type system
enforces for free**: in this host language it remains a convention the programmer
must uphold (never reflectively inspecting the structure's fields, only its effect
sequencing), checkable by an ordinary lint rule rather than derived from the type
system itself. Overstating the lint rule as "not a style preference but a
parametricity requirement, full stop" would be exactly the kind of borrowed
mathematical authority this paper is trying not to trade in.

A CLI **command** handler is the identical construction with a different concrete
effect: a Kleisli arrow into $T_{\mathrm{CLI}}(A) $ (argv/stdin in, stdout/exit code
out) rather than $T_{\mathrm{HTTP}}$, subject to the same thinness discipline and
the same TS/JS caveat about it being convention rather than enforced. `commands/`
is not a new row of Theorem 1; it is §3.5's row instantiated at a different $T_i$.

### 3.6 Middleware: continuation-passing, not quite algebraic effect handling

Plotkin and Pretnar @plotkinpretnar2009 define, for a signature $\Sigma$ of operations, a
**handler** $H$ of type $A ! \Sigma \Rightarrow B$ as a pair: a return clause
$\{\mathrm{return}\ x \mapsto e_r(x)\}$ and, for each operation $\mathrm{op} \in
\Sigma$ of arity $n$, a clause $\{\mathrm{op}(x; k) \mapsto e_{\mathrm{op}}(x, k)\}$
where $k : n \to B$ is the reified continuation, invocable zero, one, or many times,
in any order. Crucially, a handler's *domain is already the free algebra*
$T_\Sigma(A)$, and handling **interprets the effect away**: the codomain $B$ need not
have anything to do with $\Sigma$ at all (e.g. a `State` handler turns a stateful
computation into a plain function $S \to (A, S)$, no state signature left in sight).
A handler is emphatically not a Kleisli arrow: it runs the opposite direction
($T_\Sigma(A) \to B$, not $A \to T(B)$), which is why it does not — and, contra an
earlier draft of this note, should not — appear as a row of Theorem 1's
$\mathrm{Kl}(f)$-typed table (§3, table note).

Express-, Koa-style "middleware," $(\mathrm{req}, \mathrm{res}, \mathrm{next})
\Rightarrow \{\ldots\}$, shares the reified-continuation shape (`next` **is** a $k$
a middleware body may call zero, one, or many times) but is, precisely, an instance
of **continuation-passing style** [CPS; see e.g. Reynolds 1972; the transform is
folklore in the compilers literature] rather than of algebraic effect handling: the
request/response effect is never interpreted away as a handler's codomain requires
— every middleware in the chain still receives, and can still pass on, the *same*
request/response-shaped continuation, with no effect eliminated at any step. A
short-circuiting middleware (an auth check that sends a 401 without calling `next`)
discards $k$; one that acts again after `next()` resolves (response logging)
post-composes with it — both are ordinary CPS moves, needing only a reified
continuation, not the full elimination-of-effect machinery a handler provides. The
citable, correctly-scoped claim is therefore: **middleware is CPS with $k$
carrying the specific request/response effect**, a real and useful reduction, one
tier below the stronger (but here inapplicable) claim that it is algebraic effect
handling. Redux-style middleware — which wraps a `dispatch` function over actions,
with no request/response object anywhere — shares the CPS shape (a reified `next`
carrying the *dispatch* effect instead) but is a distinct instantiation, not
interchangeable with the HTTP-framework case merely because both are called
"middleware."

### 3.7 Errors as coproduct injections

Following §2.3, an error type is not a convention bolted onto a success type; it is
the second summand of the coproduct object underlying the exception monad a
function's Kleisli arrow targets. A package's finite, closed vocabulary of error
cases is exactly the coproduct's index set, and "obstruction is first-class" is the
plain statement that this index set is a real object in the category, injectable
into and case-split out of, not a side channel.

### 3.8 Reference cells and configuration: variables as global elements or state-signature models

Definition 2 classifies functions. A named variable is not a function, so extending
the classification to the granularity of individual bindings requires one further
distinction — not new machinery, since it is answered by the same free-theory
apparatus as §3.3, instantiated at its smallest possible signature.

**Definition 3 (Reference cell).** A mutable module-level variable is not a global
element of a structure $A$ but a *model of the state signature* $\Sigma_{\mathrm{ref}}$
over locations $\mathrm{Loc}$ and values $A$, presented algebraically exactly as
Plotkin and Power @plotkinpower2002 present the state monad:
$\mathrm{lookup} : \mathrm{Loc} \to (A \to X) \to X$,
$\mathrm{update} : \mathrm{Loc} \times A \to X \to X$. This is the *same*
free-theory/model construction as §3.3 — a reference cell is a repository port with
two fixed operations, not a different kind of object.

This resolves every remaining case of a named binding:

- A **constant** (`const X = …`, module scope, never reassigned) has no `update`
  operation and is therefore not a model of $\Sigma_{\mathrm{ref}}$ at all — it
  reduces to the plain global-element case, a morphism $1 \to A$ from the terminal
  object, where $A$ is the structure or finite-vocabulary object the value inhabits
  (§2.3, §3.7 for the vocabulary case).
- A **registry** (a module-scoped `Map`/`Set` populated at build time, already used
  informally as terminology above) is a model of $\Sigma_{\mathrm{ref}}$ where
  $\mathrm{Loc}$ ranges over registered names — i.e. the presheaf reading given
  informally earlier is exactly this model, restricted to the package's own
  build-time lifetime rather than a live host store (which would instead be an
  *adapter* realizing $\Sigma_{\mathrm{ref}}$ in a filesystem- or database-backed
  monad, §3.3).
- A **config/environment read** ($\mathtt{process.env.X}$, a parsed CLI flag) is a
  Kleisli arrow into Moggi's **environment (reader) monad**
  $T_{\mathrm{Env}}(A) = (\mathrm{Env} \to A)$ @moggi1991, composed with the
  admission arrow of §3.1 (the raw string is admitted into a typed config structure).
  If the result is cached after the first read, the cache is itself a
  $\Sigma_{\mathrm{ref}}$ model (Definition 3) — a memoized global element, not a
  fresh reader invocation on each access.
- An application-level **store**/**state** container (Redux, Zustand, Pinia,
  Vuex-style) is the identical $\Sigma_{\mathrm{ref}}$ model as a registry, scoped
  to the application's lifetime rather than a single module's — nothing in
  Definition 3 refers to scope, so this is not a fourth construction but the same
  one at a different scope. "Actions"/"reducers" are the model's `update` operation
  exposed as a named, finite, witnessed vocabulary (§2.3, §3.7) of cases dispatched
  to `update`; "selectors" are `lookup` projections composed with a pure morphism
  (§3.2). A store that lets any caller mutate its state directly, bypassing the
  named action vocabulary, is a $\Sigma_{\mathrm{ref}}$ model whose `update`
  operation was never actually witnessed — the same failure mode the finite-
  vocabulary witnessing of §2.3/§3.7 is built to catch, applied to state mutation
  specifically rather than to a value.

**Corollary 2.** Every named symbol introduced as a value, a mutable cell, or a
computation in $\mathcal{C}$ or any $\mathcal{C}_{T_i}$ is classified by exactly one
of three cases: (a) a global element of a structure or vocabulary object (constant),
(b) a model of $\Sigma_{\mathrm{ref}}$ (reference cell/registry/cache), or (c) a
Kleisli arrow into some $T_i$ (an ordinary function, §3.1–§3.7). A placement error
at this grain is a symbol whose case, per Corollary 2, does not match how it is
used — most commonly, a value treated in code as case (a) that is silently
reassigned somewhere (violating the "no `update`" premise that licensed treating it
as a plain global element in the first place). This is exhaustive *for symbols of
those three shapes only* — §3.9 introduces a fourth, disjoint shape (an entity-type
declaration, a coalgebraic specification, not a value/cell/computation in
$\mathcal{C}$ at all), and Corollary 2 should be read as scoped accordingly rather
than as covering literally every named symbol a package can contain.

### 3.9 Entities as coalgebras: resolving the ORM-model gap

An ORM-style "model" — a domain object with an identity that persists while its
state is mutated by a live store — does not fit Definition 2 as a Kleisli arrow or a
pure morphism, because it is not a function at all: it is a *thing with methods and
a state*, exactly the case the algebra-flavored machinery of §§3.1–3.8 (free monads,
Kleisli composition) was never meant to cover. Its categorical dual, not a further
instance of the same construction, resolves it.

**Definition 5 (Entity).** For a functor $F(X) = \mathrm{Obs} \times (\mathrm{Cmd}
\to X)$ (attributes observable at the current state, paired with a transition for
each command/method), an **entity** is a coalgebra $\langle S, \alpha : S \to
F(S)\rangle$: a state space $S$ together with a structure map giving, for each
state, its current attributes and its successor state under each method call. This
is exactly Reichel's @reichel1995 account of object types: "instances of object types may
be interpreted as abstract automata with several state transition functions
representing the methods of an object, and several output functions representing
the attributes" @reichel1995 — the paper's own words for the functor
$F$ above. Jacobs @jacobs1996 gives the companion fact needed for the type/instance
split: "classes are described as co-algebras, which may occur as models
(implementations) of co-algebraic specifications" @jacobs1996 — an
**entity type** ("a User") is a coalgebraic specification, and a **concrete
persisted row** is a specific model of it, exactly the type/instance distinction an
ORM's "model class" versus "model instance" already gestures at without a formal
account.

The identity question this construction resolves directly: two entity states are
the *same entity* iff they are **bisimilar** — indistinguishable by any sequence of
observations and method calls — the canonical notion of equality for coalgebras
@rutten2000. This is a specific, checkable answer to
"what does it mean for this to be the same domain object at two different times
even though its fields differ," not a hand-wave: identity through mutation is the
final-coalgebra semantics' notion of behavioral equivalence, dual to the
initial-algebra semantics (§3.3) that gives ordinary constructor-built data its
notion of equality (structural, not behavioral).

**Corollary 4.** An "ORM model" is placed correctly when its type is stated as a
coalgebra for $F$ (Definition 5), not forced into a structure (a pure object, §2.1) or
a repository port (a free algebra, §3.3) — it is neither, and code that tries to
make it one or the other is a plausible source of the pattern's characteristic
awkwardness. An "anemic domain model" [a conflation Evans 2003 explicitly warns
against] is, under Definition 5, a coalgebra whose structure map $\alpha$ has
degenerated to the $\mathrm{Obs}$ projection alone, with no genuine command
transitions left — a precise technical description of what has been stripped out,
not merely a style complaint.

One gap this section leaves open rather than resolves: the individual method arms
of $\alpha$ (a `withdraw()`, a `deposit()`) are themselves ordinary functions in the
package's source, and Theorem 1 (§3, table note) explicitly does not classify them
— they are components of a coalgebra structure map, not freestanding morphisms of
$\mathcal{C}$ or a Kleisli category. This paper does not attempt a placement rule
for a method arm considered in isolation from the entity it belongs to; only the
entity as a whole is given a home, by Definition 5.

### 3.10 Route tables as automata: resolving the routing-table gap

A route table is not itself a function under Definition 2, but that does not mean
nothing can be said about how it should be built or checked — it means the correct
classification is not over $\mathcal{C}$ or $\mathcal{C}_{T_i}$ at all, but over the
free monoid of path segments and its automaton theory, a body of results as citable
as anything in §§2–3.

A URL path is an element of the free monoid $\mathrm{Segment}^{*}$ (segments under
concatenation). A **static route** (no parameters) is a single word in this monoid;
matching it against a fixed set of registered routes is exactly the **trie**/
prefix-tree construction @fredkin1960, which essentially every production HTTP
router (Express's internal layer, Fastify's `find-my-way`, tree-based Koa routers)
already uses internally, whether or not it is named as such. A **parameterized
route** (`/users/:id`) denotes a regular language over $\mathrm{Segment}^{*}$ (one
segment matched by a wildcard class, the rest literal); a full route table — many
such patterns registered together — denotes the *union* of these regular languages,
and compiling it into one dispatch structure is exactly automaton construction:
Thompson's construction turns each pattern into an NFA @thompson1968, and the
subset construction determinizes their union into a single DFA, built on the
nondeterministic-to-deterministic construction of Rabin and Scott @rabinscott1959.

**Corollary 5.** A route table's correctness — every request matches at most one
route; no route is silently shadowed by an earlier, more general one — is exactly
the automaton-theoretic question of whether the union of the registered regular
languages is unambiguous, decidable by the same construction that builds the
dispatch table. This gives a genuine second axis for route tables: the *handlers* a
table dispatches to are still classified by Theorem 1, row by row; the *table
itself* is classified by whether it is built and checked as the automaton this
section describes, or as an unordered list of ad hoc regex tests tried in
registration order — the latter being the actual, checkable source of "this route
never matches, it's shadowed by one registered earlier," a bug class this framing
predicts by name rather than discovers by accident in production.

### 3.11 Concurrency and scheduling: the event loop as an effect handler

Everything in §§2–3.10 treats a single computation's effect and termination
properties. Real Node.js code is dominated by a further concern none of the above
addresses: many effectful computations are in flight *at once*, cooperatively
interleaved by a single-threaded scheduler (the event loop, its microtask queue,
`process.nextTick`, timers), and their relative ordering is a frequent, genuine
source of bugs (races, double-fires, out-of-order writes) that the placement
question alone does not touch.

This is not new machinery — it is a further instance of the handler construction
§3.6 opens with (Plotkin and Pretnar @plotkinpretnar2009), and specifically the genuine
handler case §3.6 distinguishes middleware *from*: Claessen's **concurrency monad**
@claessen1999 models exactly Node's flavor of concurrency (cooperative, single-threaded,
no true parallelism) as a free structure over a small signature — atomic actions,
`fork` (spawn a second cooperating computation), and `stop` — interpreted by a
**round-robin scheduler** that is a genuine handler for that signature in the
sense §3.6 requires: it does not merely pass the `Fork`/`Atom`/`Stop` signature down
unchanged (as middleware passes the request/response effect down), it *eliminates*
it, replacing it with a concrete interleaved trace of executed actions — nothing
`Fork`/`Atom`/`Stop`-shaped remains once the scheduler has run. Node's task queue
*is* this handler, concretely: a microtask fired by a resolved `Promise` is a
continuation queued rather than invoked inline, and "microtasks drain before the
next macrotask" is a scheduling policy on top of the same free structure, not a
different one.

Reasoning about the *interleaving* of two or more such scheduled computations —
whether two concurrently-issued writes can race, whether a cancellation and a
completion can cross — is the subject matter of **process calculi**, most directly
Hoare's **CSP** @hoare1978, whose semantics (traces, refusals) are built precisely to
answer "can these processes interleave to produce this observable sequence of
events," independent of whether the interleaving is truly parallel or merely
cooperative on one thread — the distinction Node's model sits on one side of, not
a limitation of the calculus.

No academic source was found that formalizes the Node/JavaScript event loop under
this name specifically — the claim above is this paper's own application of
general concurrency-monad and process-calculus results to it, in the same spirit as
§6's Proposition 1, not a citation to a paper that already makes this exact
connection.

### 3.12 Streams as coalgebras

A Node `Readable`/`Transform` stream — and, more generally, any incrementally
produced, potentially unbounded sequence — is a further instance of Definition 5
(§3.9), not a new construction: it is a coalgebra for $F(X) = (\mathrm{Chunk} + 1)
\times (\mathrm{Pull} \to X)$ (a possible next chunk or end-of-stream, paired with
the successor state after a pull). This is close to the *canonical* example the
coalgebra literature is built around, not an analogy invented for this paper:
Rutten @rutten2000 develops "stream calculus" — streams as the final coalgebra of
$X \mapsto A \times X$ — as the running example of the entire theory. The
correspondence is not exact: Rutten's worked functor is for *total*, non-terminating
streams, while a Node stream's $F(X) = (\mathrm{Chunk} + 1) \times (\mathrm{Pull}
\to X)$ above adds the $+1$ end-of-stream option Rutten's own running example does
not carry (a genuine finality option is a further, standard coalgebraic
construction, not absent from the broader literature, just not the specific
equation Rutten repeatedly works with) — so this is a close, motivated
specialization of that paper's central object, not its exact literal instance.

**Backpressure** — a consumer signaling readiness before a producer emits the next
chunk, rather than a producer emitting unconditionally — has its own precise,
independently citable account: Kiselyov's **iteratees** @kiselyov2012 formalize exactly
this as a dual pair, an `Enumerator` (producer, offering data on request) and an
`Iteratee` (consumer, driving demand and signaling when satisfied or when it needs
more), composed so that control of *when* the next chunk is produced sits with the
consumer — the precise technical content of "backpressure," not an approximate
description of it.

### 3.13 Testing as remodeling

A frequently-observed but never-derived practical fact — pure functions (§3.2) are
trivial to test, adapters and repositories (§3.3) need "mocks," and the two require
different testing disciplines — follows immediately from §3.3 without further
construction.

**Corollary 6.** Testing a pure morphism (§2.1, §3.2) requires no model at all: the
function is simply applied to sample inputs. Testing a repository port (§3.3)
requires supplying an alternative **model** of the same signature $\Sigma$ — an
in-memory algebra instead of the SQL-backed one — and "mocking" is precisely this
substitution, licensed by the free monad $T_\Sigma$'s universal property: any model
of $\Sigma$ is an equally legitimate interpretation, and the code under test, having
committed only to $\Sigma$ (never to a specific model, §3.3), cannot distinguish
them. A function that is hard to test with a substitute model is, under this
account, a function that was never actually written against the abstract signature
$T_\Sigma$ in the first place — it silently committed to one concrete model,
contradicting the free-theory discipline §3.3 requires of a repository port.

### 3.14 Types vs. schemas: the compile-time-only object

Sections 3.1–3.13 classify morphisms and their variants. `types/` holds neither —
it holds *objects* of $\mathcal{C}$ (§2.1) themselves, considered apart from any
morphism into or out of them, and the object/schema distinction has a decidable
test using only machinery already established.

**Corollary 7.** An object $A$ of $\mathcal{C}$ is a **schema** (belongs with its
runtime-checked predicate, §3.1) iff some admission arrow $\mathrm{raw} \to
T_{\mathrm{Maybe}}(A)$ or $\mathrm{raw} \to T_E(A)$ exists anywhere in the package —
i.e. $A$ is, at least once, the target of a boundary crossing from untyped data. If
no such arrow exists — $A$ is only ever constructed from already-admitted structures,
by composition of pure morphisms, and never itself receives raw data — $A$ is a
**type**: a compile-time-only object with no runtime witness, correctly placed in
`types/` rather than `schemas/`. This is not a different kind of object
mathematically (both are objects of $\mathcal{C}$); it is a fact about which
objects have earned an admission arrow and which have not. A `type` that a later
change causes to receive raw data directly (a new admission arrow targets it) has,
at that moment, become a schema and belongs with a runtime predicate — the
placement is not permanent, it tracks whether the boundary-crossing fact currently
holds.

### 3.15 Utils and helpers: parametricity over every free type variable

§3.5 required parametricity in *one* forwarded structure for a controller to count as
thin. `utils/`/`helpers/` is the stronger, cleaner case of the same citation
@reynolds1983 @wadler1989, applied to *every* type variable a function's
signature carries, not just one value being passed through unchanged.

**Corollary 8.** A pure morphism (§3.2, no idempotence claim required) is a
**generic utility** iff it names no specific domain object anywhere in its
signature or body — `pipe`, `compose`, `memoize`, `debounce`, `deepEqual` refer to
no `User`, no `Order`, only to type variables and the structural operations
(function application, equality, timers) available for any inhabitant of them.
Reynolds' abstraction theorem, at full strength here (every type variable
parametric, not one forwarded value among several concrete ones), licenses this as
a real distinction, not a naming convenience — with the identical TypeScript/
JavaScript caveat as §3.5: erasure and reflection mean nothing in the host language
enforces this, so it remains a convention checkable by a lint rule (does the
function reference a specific domain object's name or fields anywhere?), not a
compiler guarantee. **The placement test this licenses**: a function that
references one specific domain object by name, anywhere in its signature or body,
is domain logic (§3.2) that has been misfiled into `utils/` — under Corollary 1
(§4), this is wrong regardless of how generic the function's *name* sounds, because
genericity is a fact about the signature and body, not the identifier chosen for
the function.

### 3.16 Frontend instances: hooks, components, and the coalgebra family

The coalgebra construction of Definition 5 (§3.9) already has one further instance
worth naming, beyond entities (§3.9) and streams (§3.12): a framework **hook**
(React's `useState`, a custom hook built from it) is a coalgebra whose state slot
$S$ persists across successive renders — keyed by call order within a component
instance, rather than by externally-witnessed history (an entity, §3.9) or an
externally-pulled chunk sequence (a stream, §3.12) — with "render" as the $\mathrm{Cmd}$
driving $\alpha : S \to \mathrm{Obs} \times (\mathrm{Cmd} \to S)$, and $\mathrm{Obs}$
the value returned to the component for that render. This is a third instance of
one construction, not a fourth kind of mathematical object.

A **component**, in turn, decomposes into pieces already derived rather than
needing a construction of its own: a purely presentational component is an ordinary
pure morphism (§3.2) from props (and, if stateful, the $\mathrm{Obs}$ read from one
or more hook-coalgebras above) to a rendered-tree structure. "This component is doing
too much" — a common review complaint with no formal content as usually stated —
decomposes, under this account, into two checkable questions already licensed
above: does it embed logic that references a specific domain object where §3.15's
full-parametricity criterion would place that logic in `utils/` or `models/`
instead, and does it hold more hook-coalgebra state than the renders it drives
actually require.

### 3.17 Entry points and coarse naming: `index.ts` and `lib/`

Two further practitioner conventions name something other than a new placement
row, and are worth stating precisely rather than leaving silently unaddressed.

An **entry point** (`index.ts`, a package's root export) does not classify a new
function — it names which already-classified morphisms and objects (§§3.1–3.16)
are promoted to the public interface. Formally, the public surface is a
subcategory $\mathcal{C}_{\mathrm{pub}} \subseteq \mathcal{C}$ (and likewise for
each $\mathcal{C}_{T_i}$) @maclane1998, and
`index.ts` is the module stating the inclusion — a further fact about a morphism
beyond its layer (Definition 2), namely whether it is in $\mathcal{C}_{\mathrm{pub}}$
at all. A function correctly classified by Theorem 1 can still be *wrongly
exported* if it is re-exported from `index.ts` despite being, e.g., an internal
adapter binding with no business meaning outside the package — a distinct error
from a layer-placement error, and one this paper's classification does not by
itself catch.

**Correction.** An earlier version of this section characterized `lib/` from
recollection, as a "coarse synonym for undifferentiated domain logic." Checked
against the documented convention rather than recalled, this was wrong. Bulletproof
React's own project-structure documentation — fetched and quoted directly, not
recalled — defines `lib/` as "reusable libraries preconfigured for the
application" @bulletproofreact2026: a wrapped,
already-configured instance of a third-party dependency (a preconfigured HTTP
client, a preconfigured date library), supplied once so the rest of the package
never re-configures it. That is not domain logic (§3.2) at all — it is closest to
an **adapter with its model partially applied** (§3.3): the concrete monad $M$ is
fixed, as an adapter's is, but what is fixed is a third-party library's own
configuration rather than a business-specific binding. `lib/` in this documented
sense is a genuine, derivable placement, not a residual catch-all, and this note's
prior claim to the contrary is retracted rather than left standing.

### 3.18 The orthogonal axis: bounded contexts, and which one is primary in practice

Everything in §§3.1–3.17 answers *what kind* of morphism or object a unit is.
Checking documented practice surfaces a second, independent question this paper
had not yet asked: *which business concern is this about* — and which of the two
questions real projects treat as the outer directory level.

**The primary empirical source contradicts a layer-first assumption.**
goldbergyoni/nodebestpractices — the single most widely referenced Node.js
practices list — recommends organizing by **business component** (glossing
Evans' @evans2003 *bounded context*) first: "each component represents a product
domain (i.e., bounded context), like 'user-component', 'order-component'," with
technical layering demoted to a second, inner tier (`entry-points`/`domain`/
`data-access`). Bulletproof React's `features/` folder is the same axis under a
different name — each feature scoping its own `api`, `components`, `hooks`,
`stores`, `types`, `utils`: Theorem 1's vocabulary (§§3.1–3.17) nested *inside*
the business-component axis, not the reverse.

**Definition 6 (Bounded context, corrected).** An earlier version took the
undirected graph joining any two objects co-occurring as a morphism's domain and
codomain, and called a bounded context one connected component of it.
`placeOrder(user: User, cart: Cart): Order` breaks this: joining `User` and
`Order` symmetrically collapses most of a package with cross-entity use cases
into one giant component — the opposite of `features/`'s documented fine
per-entity split. The fix: use codomain alone, matching how DDD resolves this
(an aggregate owns what it constructs, not everything it reads).

Call an entity type or admitted structure (Definition 5, §3.1) a **context
anchor** iff it has a publicly exported constructing morphism or repository
port of its own (§3.3, §4) — reachable from the public surface without first
going through another entity's construction. A morphism's **bounded context**
is the anchor its own codomain resolves to, nesting a non-anchor codomain value
object (an `OrderLineItem` with no repository of its own) under the entity it
is constructed as part of.

"Has its own repository" is not, by itself, sufficient: the NestJS RealWorld
app's `Comment` has its own repository (`commentRepository`, injected in
`ArticleService`) — an anchor by the criterion above — yet is nested under
`article/`, with no `CommentController`; every comment endpoint runs through
`ArticleController`. Checked against real DDD literature rather than patched
with a guessed fix: Evans' own rule, confirmed across independent practitioner
sources, is that **only aggregate roots may be accessed by repositories at
all** — a repository for a non-root entity is itself the modeling defect, not
evidence the entity is a root; the traced app is a reference demo, not
rigorously orthodox DDD (the same file also holds `Article.author: UserEntity`
by full object reference rather than id, violating Vernon's @vernon2013 "reference
other aggregates by identity" rule, for the same reason). More importantly, the
literature settles the deeper question directly: **which entities are
aggregate roots is stated, independently, as a domain modeling decision** —
driven by which invariants must hold transactionally, not derivable from
repository existence, controller presence, or any code-structural fact [Evans
2003; Vernon 2013, esp. "Design Small Aggregates" and "Reference Other
Aggregates by Identity"]. No syntactic proxy resolves this, because the
literature's own position is that none is supposed to exist. The fix,
therefore, is an explicit input parallel to Definition 1's effect family:
**aggregate-root status is stated, not inferred**, with "has an independently
exported repository" retained only as a default in the absence of a stated
override, named as an assumption whenever it fires on a non-orthodox codebase.
Cross-entity parameters and injected ports (`user`, `cart` above; any
DI-supplied repository, §3.4) never change this assignment — `placeOrder`'s
context is `Order` alone, its `User`-repository dependency a recorded,
auditable cross-context edge, not a fact that merges the two contexts.

A codomain that is *not* itself anchor-typed does not automatically mean no
context: `fullName(user: User): string` has codomain `string` (not an anchor),
yet every practitioner would place it under `User`. The rule, corrected: if the
codomain is anchor-typed, that anchor is the context (unaffected by domain —
this is what stops orchestration functions from bridging contexts); if not,
look at the domain instead — exactly one anchor there gives the context
(`fullName`, or any pure predicate/query over one entity). Only when *neither*
domain nor codomain names an anchor is there genuinely **no bounded context** —
cross-cutting, matching nodebestpractices' own second bucket ("`libraries` —
generic cross-component functionality") and bulletproof-react's non-`features`
folders (`hooks/`, `lib/`, `types/`, `utils/`): exactly §3.15's generic
utilities, §3.14's context-free types, and adapters typed over primitives
rather than an entity (`sendWelcomeEmail(to: string, name: string)`) — a real
finding, not a shortcoming: if the context should be inferable, the fix is to
type the function over the entity, the same "primitive obsession" real practice
already names as a smell. A non-anchor codomain with *more than one* domain
anchor (`isEligibleForDiscount(user: User, order: Order): boolean`) is a
genuine judgment call this definition does not resolve automatically, recorded
in Corollary 1 (§4) alongside Theorem 1's own first-match ordering rather than
papered over.

This is otherwise mechanical given one check: does an anchor's own
constructor/repository exist and is it exported (decidable from the package's
export surface, §4).

**Corollary 9 (Two-axis placement).** A function's full, real-world placement is
not Theorem 1's layer alone but the *pair* (bounded context, layer). nodebestpractices
and bulletproof-react both choose bounded-context outer (`features/user/services/`,
or `apps/user/domain/`); the classical Express/MVC convention this paper's
§§3.1–3.17 implicitly assumed chooses layer outer (`services/user.ts`,
`controllers/user.ts`). Theorem 1 derives the inner axis correctly either way.

**A third nesting pattern**, confirmed by cloning and directly measuring two
independent applications rather than relying on curated guides —
`gothinkster/node-express-realworld-example-app` and
`lujakob/nestjs-realworld-example-app` — both put bounded context as the *only* directory
axis (`src/app/routes/{article,auth,profile,tag}/`; `src/{article,profile,tag,
user}/`) and encode layer **as a filename suffix, not a directory**:
`article.controller.ts`, `article.service.ts`, `article.entity.ts` sit as
sibling files in one `article/` directory. All three patterns — context-outer/
layer-inner as directories; layer-outer as classical MVC; context-as-sole-
directory with layer as filename suffix — are the same two-axis pair (context,
layer) from step 7 of §4's procedure, differing only in whether an axis becomes
a directory level or a filename convention.

The same two applications surfaced vocabulary this paper had not yet named,
each resolved by machinery already derived: a **DTO** (`create-article.dto.ts`)
is a schema/type (§3.14) under NestJS-ecosystem naming; a **pipe**
(`validation.pipe.ts`) is admission (§3.1) or CPS middleware (§3.6, when it
transforms a request before a controller runs) under a framework-specific name;
a **mapper** (`article.mapper.ts`) is a pure morphism (§3.2) — the "reserialize"
half of a controller's own thinness (§3.5), context-assigned via the
domain-fallback rule above since its codomain, a wire-shaped DTO, is not itself
an anchor. `.entity.ts` files and `.interface.ts`/`.model.ts` files (confirmed,
both apps) directly match this paper's entity (§3.9) versus type (§3.14)
distinction, under the names a real, independently-built codebase already gives
them. Three further directories from the earlier curated-guide search resolve
the same way: a **view** (server-rendered template output) is a pure morphism
(§3.2) into a rendered-document structure, the server-side twin of a
presentational component (§3.16); a **validator** is admission (§3.1) kept in
its own folder rather than beside the structure it validates; and
**build/deploy/database scripts** are, by Definition 1, not part of the
package's category $\mathcal{C}$ or any $\mathcal{C}_{T_i}$ at all — host-level
procedures between runs of the package, out of scope by construction.

**Stress test, not a hypothetical.** The NestJS app's `ArticleEntity` holds
`author: UserEntity` — a full typed class reference, not a foreign-key id —
exactly the shape that could threaten Definition 6's non-collapse property if
the rule traced arbitrary nested field types. It does not: Definition 6 traces
morphism domain/codomain (constructors, methods, repository signatures), never
a class's own field types as data, so this reference does not pull `Article`
into `User`'s context or vice versa. `ArticleService` is a real multi-effect
service: its constructor injects four distinct named ports
(`articleRepository`, `commentRepository`, `userRepository`,
`followsRepository`), $\lvert\mathrm{Kl}(f)\rvert = 4 \ge 2$, correctly a
service (§3.4) by the fixed distinct-port criterion, not the broken step-count
one. This surfaces a granularity point worth stating: Theorem 1 classifies
individual morphisms, but a NestJS-style service is a *class* whose constructor
aggregates ports for many methods at once, some touching only one. Real
practice classifies at the class grain (what the DI container wires), not the
method grain — $\lvert\mathrm{Kl}(f)\rvert$ computed once over everything the
constructor injects, never recomputed smaller per method. For the class's own
bounded context, the injected port whose entity name matches the class's own
name (`ArticleService` ↔ `articleRepository` ↔ `ArticleEntity`) is primary; the
remaining injected ports (`User`, `Comment`, `Follows`) are cross-context
dependencies (§3.4's DI account), exactly as Definition 6 treats a free
function's non-primary parameters.

### 3.19 The subject axis: bounded context generalized past business nouns, and an external test for it

Definition 6 (§3.18) instantiates the context axis with business nouns — `User`,
`Order` — because DDD, the axis's source literature, is written for line-of-business
software. Nothing in the categorical derivation actually requires a business noun;
Definition 6 only requires an anchor: a structure with its own constructing morphism or
port. For a package whose actual content is mathematics rather than business
logic — a library implementing a specific lattice theory, a specific coalgebraic
construction, a specific sheaf condition — the correct instantiation of the same axis
is not a business noun but the name of the mathematical structure itself, exactly as
an independent paper or textbook on that structure would name it. Call this the
**subject axis**; it is Definition 6's context axis, generalized past the business-noun
case its source literature happened to state first.

This matters because Theorem 1's layer axis (§3, admission/domain/adapter/service/...)
is, in the vocabulary of this section, a **process axis**: it answers *when*, in a
derivation or handling pipeline, a morphism's content applies, independent of *what*
the content is about. A directory hierarchy built only along the process axis — the
ordinary case for a package with no stated context/subject axis at all — can recurse
to arbitrary depth without ever crossing into subject territory: a second-level
grouping inside an already-process-named directory can itself be process-named (a
gerund for an internal step rather than a noun for an external field), and so on. Two
modules addressing entirely unrelated mathematical structures can end up as literal
directory siblings, unified by nothing but having been derived at the same process
stage. **A directory whose actual contents, once read, span two or more subjects with
no citable relationship beyond co-occurring at the same process stage is proof the
subject axis is absent at that location** — regardless of how correctly the process
axis was derived to reach it. Because the process axis is typically the *only* axis in
such a package, this is not a defect fixable by renaming one root directory; it
recurs at every depth a new grouping is introduced, since every new grouping is, by
construction, another process cut unless a subject cut is deliberately crossed with
it.

**Definition 7 (Subject-bearing name).** A path segment or directory name is
subject-bearing iff it passes an external test: presented with the module's actual
content (not its current name or surrounding directory), an expert in the relevant
field who has never seen this codebase — or, equivalently, a search over that field's
independent literature — would produce this specific term for this specific content.
A name is **process-coined** if it fails this test: it names an internal step of *how
this codebase happens to produce or consume the content* (a gerund turned into a
directory noun) rather than *what the content externally is*. A superficial
resemblance to real vocabulary does not pass the test; the test is whether the term
would be independently produced by someone working only from the content, outside this
codebase entirely.

**Corollary 10 (self-check is not external-check).** Verifying a module's location
against a codebase's own previously stated taxonomy — even one derived as rigorously
as §3–§4 of this paper and mechanically enforced — never performs Definition 7's test,
because the taxonomy being checked against was itself produced from inside the same
codebase. A process hierarchy can be internally consistent at 100% (every module
correctly filed under the process rules derived for it) while scoring 0% on the
external test at every subject-bearing position, because internal self-consistency
and external discoverability are logically independent properties. Only checking
against vocabulary that exists outside the codebase tests the thing that actually
determines whether a stranger — a new contributor, or a model trained on the outside
world rather than this codebase — can find content without already knowing where it
is.

**Corollary 11 (one formula, one place).** Once a module is correctly filed under its
real subject rather than only its process stage, a further defect becomes checkable
that a process-only hierarchy hides by construction: does the same real law appear,
independently restated, in more than one representation — a native statement of the
law in the pure core (§2.1) alongside a second, independently authored encoding of the
same law for a different runtime layer (a reified term, a wire form, a generated
stub)? The correct relationship is Theorem 1's own material/Kleisli split, applied to
truth rather than to effects: exactly one representation is the material statement of
the law; every other representation is a checked, delegating morphism into or out of
it (§2.2's inclusion $J$, or its dual), never an independent second derivation of the
same fact. Under a subject-first hierarchy the two representations are findable as
siblings under the same subject and the duplication is checkable directly; under a
process-only hierarchy they are typically scattered under unrelated process
directories and the duplication is invisible by construction — a second, further
reason §3.18–§3.19's context/subject axis is not optional decoration on top of
Theorem 1, but load-bearing for whether Theorem 1's own classification can be audited
at all.

## 4. The Placement Procedure

Sections 2–3 derive each piece; nothing so far states the order in which a person
actually applies them to an arbitrary, unclassified unit of code. That ordering is
itself part of the paper's claim, not an afterthought, so it is stated here as one
numbered procedure, each step citing exactly where its answer comes from,
terminating in a definite placement rather than a table of possibilities to weigh.

**Procedure (given required inputs: the effect family $\{T_i\}$, Definition 1; and,
for §6, which entities the package treats as context anchors — decidable per
Definition 6's revision, §3.18, not separately chosen by fiat).**

1. **Is the unit a type/interface declaration with no value of its own?** If yes,
   apply Corollary 7 (§3.14): does any admission arrow (§3.1) target it anywhere in
   the package? If yes → `schemas/`; if no → `types/`. Stop.
2. **Is it a named binding, not a function** (`const`, `let`, a `Map`/`Set`
   instance)? If yes, apply Corollary 2 (§3.8): no `update` → constant, a global
   element (§2.3); has `update`, scoped to a module → registry; scoped to the
   whole app → store/state (§3.8's extension). A raw `process.env` read is
   admission composed with the reader monad (§3.8), not this case. Stop.
3. **Does it bundle methods with persistent state under one name** (a class, an
   ORM-style model, a custom hook)? If yes, apply Definition 5 (§3.9): keyed by
   externally-witnessed history → entity; keyed by pulled chunks → stream (§3.12);
   keyed by render order → hook (§3.16). A component composing hook reads with a
   pure render function is handled by §3.16 directly. Stop.
4. **Is it a table dispatching many registered patterns to handlers** (a router)?
   If yes, apply Corollary 5 (§3.10): built and checked as an automaton → correct;
   an unordered list of ad hoc regex tried in order → flag per §3.10's predicted
   bug class. Classify the handlers it dispatches to separately, via step 5. Stop.
5. **Otherwise it is a morphism.** Compute $\mathrm{Kl}(f)$ and $c(f)$ (Definition
   2, §3) and look it up in Theorem 1's table (§3): pure and unnamed-to-one-entity
   and non-idempotent → domain logic; pure, idempotent+monotone → settling (check
   the CRDT specialization, §3.2, if it is a distributed merge); pure and
   parametric in *every* free type variable, naming no entity → generic utility
   (§3.15); $\lvert\mathrm{Kl}(f)\rvert=1$ with a fixed model → adapter (or
   `clients/`/`lib/`-as-preconfigured-adapter, §3.3/§3.17, if the model is a
   third-party library rather than a business system); $\lvert\mathrm{Kl}(f)\rvert=1$
   with a deferred model → repository port; the request/response or CLI effect
   specifically → controller/command (§3.5); $\lvert\mathrm{Kl}(f)\rvert \ge 2$ →
   service. If it receives a reified continuation rather than returning a value,
   it is not in this table at all — check §3.6 (CPS/middleware) or §3.11
   (scheduler/handler) instead, by whether it eliminates the effect it receives
   (handler) or passes the same one on (CPS/middleware).
6. **Determine the bounded context** (Definition 6, §3.18): if the codomain is
   anchor-typed, trace it to the anchor it constructs into (following non-anchor
   nesting upward) — that is the context, regardless of what the domain
   mentions. If the codomain is *not* anchor-typed, look at the domain instead:
   exactly one anchor there gives that anchor as the context (an ordinary
   query/formatter/predicate); no anchor anywhere (domain or codomain) means no
   context at all — cross-cutting (`lib/`, `utils/`, `types/` outside any
   feature); more than one domain anchor with a non-anchor codomain is a
   judgment call, not automatically resolved. Injected ports naming a
   *different* anchor (§3.4's DI) are recorded as cross-context dependencies,
   never folded into the assignment above.
7. **Place at the pair** (context, layer) from steps 1–6, context as the outer
   directory and layer as the inner one, per documented practice (§3.18) — or
   layer outer if the package has chosen the classical MVC-derived convention
   instead (§5); either nesting is a valid choice of which axis is the directory
   level, and step 5's classification is unaffected by which one a project picks.

**Corollary 1.** A placement is *wrong* exactly when either coordinate computed by
this procedure disagrees with where the unit is actually placed — independent of
its name, of what it is imagined to be "about," or of which existing folder looked
convenient. Steps 1–5 are decidable from the unit's own type and body alone; step
6 is decidable given which entities are context anchors (itself decidable from the
export surface, §3.18); step 7 requires only the one, stated-once, project-level
choice of which axis is outer. Two genuine judgment calls survive the procedure,
named rather than hidden: Theorem 1's stated first-match ordering among adapter/
repository/controller when a type satisfies more than one (§3), and step 6's
non-anchor-codomain case combining more than one domain anchor, with neither
clearly primary (§3.18, either as an anchor-typed codomain naming two anchors or
a non-anchor codomain whose domain names two). Both are flagged as open, not
smoothed into a false total order.

### 4.1 Checkable signals, toward a future implementation

The procedure above is decidable in principle; a script needs a concrete,
source-level proxy for each step's math-level test. Traced against roughly
fifteen representative snippets spanning every row and section of this paper —
which is also how the Definition 6 corrections above were found, not asserted —
the mapping is:

| Step | Math-level test | TypeScript-observable proxy |
| --- | --- | --- |
| 1 (type vs. schema) | admission arrow targets this object? | a `zod`/`joi`/`io-ts`/`ajv` schema literal whose inferred type matches, or a hand-written type-guard function returning this type |
| 2 (binding kind) | has `update`? | reassignment anywhere in scope; a `.set`/`.add`/`.delete` call on a `Map`/`Set` the binding holds |
| 3 (entity/hook) | coalgebra-shaped? | a `class` with instance fields and methods; a function named `use*` calling `useState`/`useReducer`/another hook internally |
| 4 (route table) | dispatches many patterns? | `.get`/`.post`/`.put`/`.delete`/`.use` calls on an Express/Koa/Fastify router; a NestJS `@Controller` class's method decorators taken together |
| 5 (layer) | $\mathrm{Kl}(f)$, $c(f)$ | `async`/`Promise`-wrapped return (effectful at all); *which* import is called distinguishes which $T_i$ (`fs` → filesystem; `fetch`/an HTTP client → network; an ORM/query-builder import → that entity's own repository, not a generic "IO") |
| 6 (context) | anchor tracing | which named type/class a function's parameter or return-type annotations resolve to, cross-referenced against which types have their own exported repository/constructor (§3.18) |
| 7 (nesting) | project convention | whether the project's existing top-level `src/` directories read as Theorem-1 vocabulary or business nouns |

Decorators deserve their own note rather than a table cell: NestJS's
`@Controller`/`@Get`/`@Post` are a compressed signal for step 5's controller row
directly; `@Injectable` marks a class as a model supplied via DI (§3.4). Neither
introduces new math, but a script that does not recognize decorators as these
signals will misclassify a large fraction of real NestJS code, which expresses
steps 5 and the DI account of §3.4 through decorators rather than through the
plain function shapes this paper's own examples use.

A second traced subtlety, not a bug: a Zustand- or Pinia-style store constructor
(`create((set) => ({...}))`, `defineStore(...)`) is consumed with hook-calling
convention inside components (`useOrderStore()`), which could be mistaken for
step 3's hook case. It is not — the store itself, constructed once at module
scope, is step 2's $\Sigma_{\mathrm{ref}}$ model at application scope (§3.8's
extension); the hook-shaped call site is a *consumption* interface bolted onto
an already-classified object, not evidence the construction itself is a step-3
coalgebra. A script should classify the `create(...)`/`defineStore(...)` call
site once, at step 2, and treat every later `useXStore()` call as an ordinary
reference to that object, not a fresh classification target.

### 4.2 Two regimes of implementability

§4.1's proxies are heuristics: an `async` keyword or an `fs` import is evidence
a function is effectful, not proof, and a script built only on such signals will
have a real, irreducible false-positive/false-negative rate against plain
TypeScript/JavaScript. There is a second regime where this is not true, worth
naming explicitly because it changes which codebase a first tool implementation
should target.

Code written against an explicit effect-tracking library — Effect-TS's
`Effect<A, E, R>`, fp-ts's `TaskEither`, neverthrow's `Result`/`ResultAsync` —
does not need heuristic inference at all, because §2's mathematics is not being
approximated by such code, it is *implemented* by it. Effect-TS's own three type
parameters are, respectively: `A`, the success value — §2's plain codomain
object; `E`, the typed error channel — exactly §2.3's coproduct object, reified
rather than inferred from a `try`/`catch`; and `R`, "what services your code
depends on" in Effect's own documentation — exactly $\mathrm{Kl}(f)$'s
distinct-port count from Definition 2 (as refined above), because `R` is a union
of service tags and its size *is* $\lvert\mathrm{Kl}(f)\rvert$. A function typed
`Effect<Order, DatabaseError, UserRepository | OrderRepository>` states Theorem
1's row directly in its signature — two distinct ports, hence service (§3.4) —
with no import-scanning or async-keyword heuristic needed, and no residual
uncertainty of the kind §4.1's proxies carry.

This means the two regimes are not equally hard to build a tool for. A first
implementation targeting Effect-TS/fp-ts-style code (where the type checker
already carries $(\mathrm{Kl}(f), c(f))$, the error channel, and the dependency
count as first-class, inspectable types) would be close to fully accurate by
reading type signatures alone. A tool targeting plain, unannotated TypeScript —
the far larger share of real code, per §6's own measurement corpus — necessarily
inherits §4.1's heuristic uncertainty and needs an explicit confidence signal
per suggestion, not a flat verdict, precisely because the underlying fact it is
estimating is not observable from syntax with certainty the way it is when the
effect system reifies it. Building toward the reified-type case first, then
widening to heuristic inference for the common case, is the lower-risk order —
noted here as a design decision for the eventual tool, not yet made.

## 5. Relation to Practitioner Convention

Each named architectural pattern in current practice turns out to be an informal,
partial rediscovery of one or more rows of Theorem 1:

- **Clean Architecture**'s dependency rule @martin2017 — inner layers may not
  depend on outer ones — is exactly the statement that $\mathcal{C}$ (§2.1) must not
  import from any $\mathcal{C}_{T_i}$: a pure morphism cannot be defined in terms of
  an effectful one without ceasing to be pure.
- **Domain-Driven Design**'s separation of "domain model" from "application
  services" from "infrastructure" @evans2003 is exactly the pure-core /
  composite-Kleisli / atomic-Kleisli split of §3.2–§3.4.
- **Hexagonal architecture**'s ports and adapters @cockburn2005 is exactly the
  free-theory / model-of-a-theory split of §3.3, independently arrived at by
  Plotkin and Power @plotkinpower2002 eight years earlier in a different literature.
- **Parse, don't validate** @king2019 is the direct, if informal, statement of
  §3.1's Kleisli-into-partiality-monad characterization of admission.
- Redux/Express-style **middleware** as a named pattern postdates Plotkin and
  Pretnar's @plotkinpretnar2009 formal handler construction; the correspondence in §3.6 appears
  not to have been previously stated in the software-engineering literature under
  this name.
- **Domain-Driven Design**'s **Entity** @evans2003 — an object defined by
  continuity of identity rather than by its attributes — is the direct informal
  statement of §3.9's coalgebraic account, which independently predates DDD's 2003
  formulation by the better part of a decade @reichel1995 @jacobs1996.
- **Domain-Driven Design**'s **bounded context** @evans2003 is the direct
  statement of Definition 6's connected-component partition (§3.18) — and
  documented, widely-used practitioner guidance built on it
  @nodebestpractices2026 @bulletproofreact2026 treats this axis as
  the *primary* directory-level decision, layering (Theorem 1) as secondary, the
  reverse priority an earlier version of this paper had assumed without checking.

The convergence of at least four independent design traditions on the same cuts,
without access to one another's formal vocabulary, is evidence the cuts are real
structural facts about computation with effects, not an artifact of any one
tradition's taste.

## 6. Workspaces: Packages as Objects in a Dependency Category

Everything in §§2–5 classifies code *within* one package. A pnpm workspace — a
monorepo of packages linked via the `workspace:*` protocol — is a further,
higher-level structure not yet addressed, and pnpm specifically realizes it in a
way precise enough to state formally rather than treat as implementation detail.

**Definition 4 (Workspace).** A workspace is a small category $\mathcal{W}$ whose
objects are packages $(\mathcal{C}_i, \{T_{i,j}\})$ (Definition 1) and whose
morphisms $P \to Q$ are declared dependency edges (an entry in $P$'s
`package.json` naming $Q$). For a build order to exist at all, $\mathcal{W}$ must be
acyclic — the standard requirement, treated generally for package-based software
distributions by Mancinelli et al. @mancinelli2006, that a topological sort of the
dependency graph exist. pnpm further distinguishes a subcategory
$\mathcal{W}_{\mathrm{local}} \subseteq \mathcal{W}$: edges resolved via the
`workspace:*` protocol specifically to a sibling package in the same repository,
rather than fetched from a registry — a distinguished class of morphisms whose
codomain is guaranteed to already be an object of $\mathcal{W}$, not an external one.

**Content addressing as hash-consing.** pnpm's store is content-addressable: each
resolved package version is stored once, keyed by a hash of its contents, and every
consumer links to that single copy rather than duplicating it. This is a direct
instance of **hash-consing** [Ershov 1958; formalized in a modern type-safe setting
by Filliâtre and Conchon 2006]: the store is the quotient of "all resolved package
instances" by structural equality, realized as a lookup table keyed by hash rather
than by identity. The mathematical content — two dependency edges resolving to
structurally identical contents are, after this quotient, the *same* object in
$\mathcal{W}$, not two — is what makes disk usage sublinear in the number of
packages sharing a dependency, and gives a checkable invariant for a workspace
audit distinct from Theorem 1: two on-disk copies of content that hash identically
violate the store's own quotient law, a tooling-level defect rather than a
package-layout one.

**Proposition 1 (Strict resolution is a full and faithful inclusion).** Let
$\iota : \mathcal{W}_{\mathrm{decl}} \hookrightarrow \mathcal{W}_{\mathrm{res}}$ be
the inclusion of the declared-edges category into the category of actually
resolvable imports (an edge $P \to Q$ exists in $\mathcal{W}_{\mathrm{res}}$ iff
code in $P$ can, in practice, resolve a module from $Q$). Under pnpm's default,
non-hoisted resolution, this inclusion is full and faithful — there is no import
that resolves without a corresponding declared edge — which is precisely what
pnpm's own documentation and ecosystem discussion describe without this vocabulary:
by default pnpm builds a nested/symlinked (**semistrict**) `node_modules` where "pnpm
only exposes the packages you explicitly list in your `package.json`... If you try
to import a package that isn't declared, it throws" @pnpm2026,
in explicit contrast to classical npm/Yarn flat hoisting, where "apps import
packages they don't declare, [which] works because npm hoists everything into a flat
top-level `node_modules` and lets anyone reach anything" — the informally-named
**phantom dependency** problem this strictness is built to prevent. pnpm's
`hoistPattern`/`publicHoistPattern` settings are the explicit, opt-in mechanism that
relaxes $\iota$ to a non-full inclusion: an import can then resolve via a hoisted
path with no corresponding entry in $\mathcal{W}_{\mathrm{decl}}$ at all.

The factual claims above (semistrict-by-default resolution, the throw-on-undeclared
behavior, the phantom-dependency terminology, hoisting as the opt-in relaxation) are
well documented by the tool itself and independent practitioner write-ups; the
category-theoretic framing (full/faithful inclusion) is this paper's own — a search
turned up no prior literature stating package-manager dependency resolution this
way, category-theoretically or otherwise. It is offered as a proposition, not a
citation, and should be read as such. It is also, honestly, a modest one: because
$\mathcal{W}_{\mathrm{decl}}$ and $\mathcal{W}_{\mathrm{res}}$ each have at most one
edge between any two given packages (a package either depends on another or does
not; there is no multiplicity to preserve), "faithful" holds automatically for any
inclusion of edge sets, and "full" reduces to plain subset-inclusion of edges — the
same fact stated two sentences above without the vocabulary. Both categories here
are, in effect, preorders, and the proposition should be read as dressing a
straightforward inclusion-of-edge-sets fact in categorical language for uniformity
with the rest of this paper, not as invoking structure a preorder does not have.

**Version ranges as an interval in a poset.** Semantic versioning orders releases by
a total precedence relation (semver.org's own specification); a declared range
(`^1.2.3`, `~1.2.3`) denotes an up-set of that order bounded above by the next
breaking change. Resolving a whole workspace's version constraints simultaneously —
choosing one version per package satisfying every dependent's range at once — is a
constraint-satisfaction problem over this poset, the same class of problem
Mancinelli et al. @mancinelli2006 already establish (§ above) is NP-hard for package-based
distributions in general; nothing about semver's specific total order changes that
worst-case complexity, only the shape of the constraints being solved.

**Corollary 3 (Workspace-level placement measurement).** A symbol's full placement measurement
has two passes. First, at the $\mathcal{W}$ level: does the *package* $P$ a symbol
lives in correctly own the invariant it states — checkable directly via Proposition
1 as: is every import in $P$'s source in the image of $\iota$ (a declared edge), or
does it rely on $\iota$'s relaxation via hoisting (a phantom dependency, flagged as
such regardless of whether it currently resolves)? Second, once $P$ is confirmed the
right package, Theorem 1 (extended to variables by Corollary 2) audits placement
*within* $P$. A workspace-wide sweep is the composite of a graph-consistency check
on $\mathcal{W}$ and a per-package application of Theorem 1 — the same apparatus
applied one level up, not a new kind of check.

## 7. Limitations

The three gaps an earlier version of this note left as unresolved flags — ORM
models, route tables, and pnpm hoisting — are addressed directly: §3.9 (Definition
5, Corollary 4), §3.10 (Corollary 5), and §6 (Proposition 1, Corollary 3)
respectively. A further pass (§3.11–§3.13, and the DI/semver additions to §3.4 and
§6) addressed what was, on reflection, the single largest remaining gap — every
prior section treated one computation in isolation, never many scheduled at once —
plus the practical concerns of dependency injection, backpressure, and testing. An
independent adversarial review of the resulting draft then found, and this version
corrects, three further problems serious enough to change core claims rather than
merely qualify them: Theorem 1's classification is now explicitly scoped to
morphisms of $\mathcal{C}$/$\mathcal{C}_{T_i}$ rather than claimed exhaustive over
"every function," after §§3.9–3.12 were shown to introduce functions (entity
methods, stream callbacks, route-dispatch code) the original statement wrongly
implied it covered; the adapter/service split (§3.4) is redefined by the *number of
distinct effects touched*, since the original "atomic vs. composite steps" criterion
was not actually a fact about a morphism's type and would flip under harmless
refactoring; and middleware (§3.6) is now stated as continuation-passing style
carrying the request/response effect, not algebraic effect handling proper, since a
handler is required to eliminate the effect it handles and Express/Koa-style
chaining never does. A further check then found the paper's target vocabulary
itself — the list of directories it set out to derive — had never been verified
against a real source, only recalled; §§3.14–3.18 both fill the resulting
coverage gaps (`types/`, `utils/`, `hooks/`, `components/`, `store/`, `commands/`,
`plugins/`, `clients/`, `index.ts`, `lib/`) and correct one claim (`lib/`, §3.17)
that recollection had gotten wrong, plus add the bounded-context axis (§3.18)
that checking real sources surfaced and an earlier draft had not asked about at
all. A working implementation of §4's procedure (§8) was then built and run
against two independently-built, cloned real applications (not single
functions), which found and fixed several further bugs (context resolution
silently never running for controllers; a router-detection false positive
colliding with same-named ORM methods; a third real nesting pattern — bounded
context as the only directory axis, layer as filename suffix — Corollary 9
did not have room for) and settled, by checking real DDD literature rather
than guessing a fix, the question of whether aggregate-root status is
derivable from code structure at all: it is not @evans2003 @vernon2013, and
Definition 6 (§3.18) now states this as a required explicit input with a
stated default, not a fact the tool infers. An early version of the
implementation split into single-purpose scripts with every §4.1 signal
hardcoded to whichever framework it happened to be traced against — itself a
drift from this paper's own generality claim, since a tool recognizing only
one framework's decorator/import names is not the general procedure of §4.
These were unified into one configurable tool, `dev/scripts/node-placement-
audit.js` (subcommands `measure`, `classify`, `workspace`), with every §4.1
signal moved into overridable configuration rather than a fixed constant; the
unification pass itself surfaced two further bugs — a false positive flagging
contextless layers (reference cells, stores, constants, route tables) as
under-resolved, and route registrations made as separate top-level statements
against a module-scope router binding going undetected by a scanner that only
looked inside one function body at a time — both now covered by an automated
regression suite built from self-authored fixtures, re-run against the two
cloned corpora after each change.

What remains genuinely open, stated rather than smoothed over:

- The tool's convention detection is binary (suffix vs. directory) and does not
  yet handle a *hybrid* convention within one project — the traced NestJS app
  encodes services/controllers/entities by suffix but nests DTOs in their own
  `dto/` subdirectory, which the current detector cannot represent at once.
- `views/`'s treatment (§3.18) as a server-side instance of §3.16's component
  construction is asserted by analogy, not independently derived or checked
  against a template-engine-specific source.
- Real corpora checked to date: two curated best-practices guides
  (nodebestpractices, bulletproof-react) and two independently cloned backend
  applications (RealWorld's Express and NestJS implementations). That is real
  evidence, not a systematic survey — no frontend application has yet been
  traced the way these two backend ones were, and the tool has not been run
  against a broad, unselected sample of real npm packages at scale.

- Proposition 1's category-theoretic framing of dependency resolution, and §3.11's
  application of the concurrency monad and CSP to Node's event loop specifically,
  are this paper's own extensions of well-documented behavior and general theory
  respectively — no citation was found formalizing either target under this
  framing. Proposition 1, on inspection, is also honestly modest: the categories
  involved have at most one edge between any two objects, so "full and faithful"
  reduces to plain edge-set inclusion, a fact statable without category theory at
  all (§6 says so directly rather than trading on the vocabulary).
- The algebra (§3.3, free monads) and coalgebra (§3.9, entities; §3.12, streams)
  constructions are never shown to compose on one structure — a repository port
  naturally returns entities, so the obvious case (an algebra and a coalgebra
  structure on the same structure, e.g. $A = S$) is exactly the subject of
  bialgebraic/distributive-law semantics @turiplotkin1997, not attempted
  here. This is left open rather than assumed trivial.
- §3.4's DI account does not formalize resolution order for mutually-referential
  dependencies. §3.9's account does not evaluate whether the anemic-model pattern
  it now names precisely is, on balance, harmful — only what it technically is.
  The individual method arms of an entity's structure map (§3.9) are not
  classified by Theorem 1 or given a placement rule of their own. This paper does
  not address type-level polymorphism/generics as their own axis distinct from the
  parametricity criterion used, with its own caveats, for controllers (§3.5).

## 8. Toward an Implementation: Input/Output Contract

Originally written as a specification preceding any code, so that building the
tool would be transcribing a decided contract rather than making design
decisions ad hoc while implementing. Every point below still names what a real
Infography [renamed later to MetroPlat] measurement integration must consume and produce, and remains the
normative statement to check that integration against, not a description
retrofitted to match
whatever the tool happens to do.

**Input.** One TypeScript source file (or a single named exported symbol within
one), plus two pieces of project context without which several steps are
undecidable: (a) type-checking context — a `tsconfig.json`/the TypeScript
compiler API's program, needed wherever a step requires resolving a codomain or
parameter to a named type (Definition 6) rather than reading it textually; (b)
the project's *existing* directory tree, needed for step 7 (which of the three
nesting patterns in Corollary 9 — context/layer as directories, layer/context as
directories, or context as the only directory with layer as filename suffix —
this project already uses) and for deciding which entity types already count as
context anchors (§3.18: does an exported constructor/repository already exist
for this entity, elsewhere in the tree). Input (b) licenses exactly those two
facts and no others — see the Normative Specification's closing paragraph:
an existing directory's own name is never itself an admissible output, however
established it looks in the target project.

**Output**, per classified symbol:

1. **Layer** — the Theorem 1 row, or the §3.9/§3.10/§3.14/§3.16 classification
   if the symbol falls outside Theorem 1's morphism-only scope (§3, table note).
2. **Bounded context** — the anchor from Definition 6 (§3.18, as corrected), or
   `none` (cross-cutting) with the specific reason (no anchor in domain or
   codomain — a real, meaningful result, not a null answer, per §3.18's
   `sendWelcomeEmail` case).
3. **Suggested path** — constructed from 1 and 2 *in whichever nesting pattern
   the project already uses* (detected from input (b) above), not a fixed
   convention imposed on every project alike.
4. **Justification** — which specific Definition/Theorem/Corollary number
   produced the answer, and which §4.1 signal(s) fired (which import, which
   decorator, which return-type shape) — so a human can verify or override a
   suggestion against the paper's own stated reasoning, not trust a bare
   verdict.
5. **Confidence regime** — §4.2's fork, stated explicitly per suggestion:
   `reified` (the codebase already types this in Effect-TS/fp-ts/neverthrow-style
   terms, and the answer is read off the type signature, not inferred) or
   `heuristic` (inferred from §4.1's proxies, with the specific proxies used
   named per point 4, since different proxies carry different reliability —
   an `async` keyword is stronger evidence than a suggestive but unverified
   function name).
6. **Ambiguity flag** — set, with the specific cause named, exactly when
   Corollary 1's two named judgment calls apply (Theorem 1's first-match
   ordering triggered on more than one row; Definition 6's domain naming more
   than one anchor with a non-anchor codomain) — surfaced for a human decision,
   never silently resolved one way.

This contract is deliberately conservative about points 5–6: a tool that cannot
tell a stranger *why* it suggested a path, or that it is guessing rather than
reading a reified type, would be exactly the kind of unearned authority this
paper's own derivation was written to replace, applied to itself.

## 9. Conclusion

Node.js package layout conventions are not arbitrary, and their justification does
not need to rest on analogy to category theory recited informally. Treating a
package's effects as a family of strong monads and applying results already
established in the theory of computational effects — Moggi's monadic semantics,
Plotkin and Power's algebraic theories, and the Knaster–Tarski/Scott/Kleene hierarchy
of convergence — yields a placement test whose rows are theorems, not conventions.
Where a claimed correspondence turned out to overreach on inspection — treating
middleware as full algebraic effect handling rather than the weaker,
still-precise claim of continuation-passing style; treating "composite of $\ge 2$
steps" as a categorical fact rather than a fact about source layout; claiming
Theorem 1 exhaustive over sections that had already been shown to fall outside it —
this version corrects the claim rather than defending the stronger one, on the view
that a smaller true theorem outlasts a larger overclaimed one. The informal
counterparts of each derived layer in the software-architecture literature can, with
that discipline, each be traced to a specific, independently citable result rather
than to this paper's own authority.
