---
date-created: 2026-07-11
date-modified: 2026-07-12
description: MetroPlat arc42 architecture document: building blocks, runtime, deployment, and cross-cutting concepts.
keywords:
  - structure
  - organizing
  - closure
  - witness
  - settlement
  - capability
  - predication
title: Note on MetroPlat system architecture design
status: historical-design
---

# MetroPlat Architecture

> **Historical design, not the current platform specification.** This July
> document treats MetroPlat itself as the operation host in §3 and places
> substrate, runtime, protocol, and application concerns inside it. The
> [current MetroPlat definition](../../../../../../../../../../../../../../../../../../content/text/glossary/terms/metroplat.md)
> distinguishes the reusable platform from OPS and other MetroPlat instances,
> and puts MetroPlat downstream of FeltOS. Keep the detailed mechanisms below
> as design and migration evidence; do not infer present ownership or live
> deployment from this document.

## 1. Introduction and goals

MetroPlat holds claims about the world, including claims about itself, at an evidence-graded truth rather than a boolean one; derives new claims from settled ones by proof, rather than by rule-of-thumb generation; executes proofs directly as a mechanism that produces new state, rather than merely checking them after the fact; plans which derivations to run rather than running all of them; and revises its own governing rules by the identical mechanism it uses to revise any other claim it holds.

### 1.1 Requirements overview

- A claim's evidential status is a graded value — evidence for, evidence
against, both, or neither — never a boolean, and settling that status is a process with a measured depth, not an instantaneous read.
- A value's identity is the content it contains, never its name, location,
or arrival order.
- A claim is admitted to the durable record only once it is checked against
a typed grammar of well-formed claims; the checker is the same one every admission uses, with no second path.
- External carriers, software dialects, documents, diagrams, protocol messages, diagnostics, and debug views are translated or projected through the same RMN language substrate; no carrier becomes its own truth, authorization, or persistence path.
- Derivation of new claims from settled ones proceeds by proof: a search
procedure finds a derivation, and the derivation itself is checked by the identical typed grammar that governs admission.
- A proof, once found, is executable directly: admitting its conclusion is
not a separate step from admitting the proof that produced it.
- Which questions to derive answers for, and in what order, is itself a
planned decision, measured against the same coordination cost that governs concurrent settlement.
- The rules governing admission, settlement, and derivation are themselves
claims, stored and revised by the same mechanism that governs any other claim.
- Two parts of the system settle overlapping claims without communicating,
except where a measured, exact quantity says they must.
- A component observing settled state across several running instances of
the system adjusts their behavior, including triggering self-revision, without a human deciding each adjustment.

### 1.2 Quality goals

| Priority | Quality goal | Scenario |
|---|---|---|
| 1 | Evidential integrity | Two sources assert conflicting facts about the same entity; both are retained at a contested evidential value, and neither is silently discarded. |
| 2 | Identity stability | The same content, submitted by different sources at different times, resolves to the same address. |
| 3 | Admission integrity | A claim that fails the typed grammar, or that would make an event depend on its own effect, is never admitted, regardless of its source. |
| 4 | Derivational soundness | Any claim produced by proof execution corresponds to a derivation that is itself checked by the same grammar that governs ordinary admission. |
| 5 | Coordination economy | Two settlement processes over non-overlapping evidence proceed without communicating; a measured, nonzero overlap is the only condition that requires them to. |
| 6 | Planning economy | A question answerable from already-settled evidence never triggers a derivation; derivation is invoked only where planning finds settlement insufficient. |
| 7 | Self-revision safety | A claim that revises the system's own governing rules settles to a determinate evidential value, never an unbounded loop or an inconsistent halt. |
| 8 | Presentation fidelity | A boundary artifact translated or projected into another language retains source identity and declared semantic assertions; a lossy projection names its validation scope and loss profile before any face serves it. |
| 9 | Accounting auditability | Every settlement, derivation, coordination, or proof-execution run reports cost-to-complete, receipts, and residue in the evidence unit of account; partial work remains auditable instead of disappearing into an unpriced branch choice. |
### 1.3 Stakeholders

| Role | Concern |
|---|---|
| Architect | One coherent, dependency-ordered decomposition, with no responsibility duplicated across two systems. |
| Implementer | An unambiguous place, forced by dependency order, for any new capability, and a complete-enough definition of each system to build it without consulting a second document. |
| Formal methods contributor | An exact, checkable citation from each cross-cutting concept to the proof that confirms it. |
| Operator | A system that keeps producing determinate answers, and keeps recording the derivation of each one, under partial failure and open disagreement. |
## 2. Constraints

### 2.1 Organizational constraints

| Constraint | Consequence |
|---|---|
| One responsibility has one owner. | A duplicate journal, evidence type, authorization path, catalog, or work-record system is merged into its §5 owner or recorded as debt, never as a variant. |
| Decomposition follows dependency order. | A §5 building block appears only after its dependencies; placement records what must exist first, not discovery chronology. |
| Mathematics governs computation, not JavaScript placement. | Integrations use conventional `src/integrations/<domain>/` locations; §5.1 defines local terms before use; archived code is quarry, not a dependency. |

### 2.2 Technical constraints

| Constraint | Consequence |
|---|---|
| The package is Node.js `>=22.18` ESM. | Executables, host closures, filesystem behavior, and verification target that runtime. |
| A stateful process binds one POSIX settlement root. | `processDataRootConfig` rejects a populated data tier. Ordinary paths and the plate remain visible; no sidecar database defines a site. |
| Exact source artifacts are create-only; higher tiers are rebuildable. | Different bytes never replace one address; state, record, and content may be recomputed from the journal (§5.5, §7.1). |
| Canonical execution is witnessed and fail-closed. | The §6.2 handler is unreachable until attempt and authorization evidence are durable and standing is `held`; no face or host effect has a bypass. |
| One operation family induces public faces. | CLI, HTTP, MCP, OpenAPI, forms, and LSP project one catalog; boundary resources remain projections, not operations. |
| Obsmetrologia (“Infomaterial”) is evidence, not a runtime dependency. | Lean/corpus sources ground claims without runtime loading. Portable behavior uses RMN; TypeScript closures serve host boundaries. |

### 2.3 Evidence and description constraints

| Constraint | Consequence |
|---|---|
| Assurance is explicit; Lean proof is not an admission gate. | Checked declarations, corpus readings, correspondences, design programs, and runtime conformance may enter the SAD but are never conflated. |
| Checked-proof claims preserve the proposition. | Identity, quantifiers, hypotheses, conclusion, and implication direction are retained; a suggestive name is not a citation. |
| Realized-system claims require implementation evidence. | Mathematics and prose do not establish TypeScript conformance; source, tests, receipts, or model checking must. |
| Gaps and contracts are explicit. | Missing proof, composition, deployment, or reconciliation appears in §11; §5 states operations, obstructions, conditions, and laws. |

## 3. Context and scope

The entity of interest is the `@emsenn/metroplat` Node/TypeScript package realized as an induced operation host over a bound settlement root (§7).
The package supplies the operation catalog, journal and settlement machinery, protocol projections, and host integrations; the bound root supplies the plate whose claims, artifacts, and derived tiers the host governs.
A downstream application and its domain content remain outside MetroPlat even when they embed the package or designate their own directory as its root.

### 3.1 Business context

MetroPlat receives claims, observations, questions, work material, and requests for effects.
It returns settled readouts, explicit obstructions, and witnessed receipts, including operational accounting ledgers that report cost-to-complete, receipts, and residue for evidence-flow work.
Derivation, reconciliation, proof execution, and rule revision are ordinary governed capabilities, not exceptional administrative paths (§§5.13c, 5.18–5.21).

| Context actor | Exchange with MetroPlat | Boundary responsibility |
|---|---|---|
| Human operator or software agent | Submits claims, observations, operation inputs, and work material; receives readouts, obstructions, receipts, and projected resources through a face. | The actor selects intent but never writes the journal or invokes an effect directly; every request enters the governed pipeline (§§5.17, 6.1–6.2). |
| Downstream package or site | Embeds MetroPlat, runs an MetroPlat process over its own settlement root, or supplies domain-specific languages and content. | The consumer owns domain behavior, domain content, and domain-language meaning; MetroPlat owns only the identity, admission, settlement, capability, language-presentation, translation/projection, and operation substrate it exposes. |
| External provider or host tool | Receives a bounded effect request and returns inference, process, repository, notebook, payment, editor, or filesystem material. | The provider receives no ambient authority. Capability and instrument preconditions gate the request, and returned material becomes evidence only through admission (§§5.12, 5.23, 5.29). MetroPlat's operational accounting ledger is an internal evidence-flow receipt, distinct from any provider payment record, blockchain, financial ledger, or external event log (§§8.8, 12). |
| Infomaterial and the research corpus | Supplies mathematical vocabulary, declarations, formulas, and architectural correspondences. | It remains outside the runtime boundary: formal or corpus material warrants architecture choices but neither owns a journal nor executes an MetroPlat operation (§§2.3, 3.3). |
| Another settlement root or managed element | Supplies witnessed state for observation, reconciliation, replica union, or an autonomic loop. | Roots retain distinct journals and capability boundaries. Exchange occurs through federation or declared touchpoints; the orchestrating manager observes, diagnoses, plans, and adjusts without merging roots (§§5.22, 7.3–7.4). |

### 3.2 Technical context

| Exchange | Partner | Boundary contract |
|---|---|---|
| Governed operation invocation | CLI caller, HTTP action client, MCP `tools/call`, or embedding package | The face decodes transport material into one content-addressed `RpcInvocation`; §6.2 admits attempt, authorization decision, optional coordination, and outcome through the root-bound journal. |
| Boundary projection | HTTP discovery/health/OpenAPI/forms/feed clients; MCP initialize/list/resource/prompt clients | These are read or protocol projections of the induced apex, not fictitious operation executions. Arrival material may be witnessed, but no `metroplat.rpc.attempt` is created unless an operation is invoked (§6.1). |
| Language artifact or carrier | Boundary document, protocol payload, diagram, form, notebook, editor diagnostic, debug view, or domain-language artifact | The carrier is translated or projected through §5.3/§6.5 as a language presentation over an addressed artifact. MetroPlat may own the resulting admission, translation judgment, obstruction, or rendered readout; it does not own the external language community or make the carrier authoritative outside its declared validation scope. |
| Language-server projection | Editor or LSP client | `infograph-lsp` is a stateless stdin/stdout request-response artifact. It binds no settlement root and admits no journal event (§7.2). |
| Library embedding | Node.js package consumer | Published `dist` exports operations, schemas, journal APIs, projected surfaces, and domain integrations. The consumer supplies the process composition and settlement root; importing the library does not create a managed element. |
| Host integration | Provider API, filesystem, subprocess, Git repository, Lean toolchain, notebook, or editor | An integration is a host boundary closure behind an operation declaration. Effect, replay, coordination, determinism, and totality metadata are part of that declaration's content identity (§6.3). |
| Formal correspondence | Infomaterial Lean source or corpus note | The SAD may use a checked declaration, corpus-backed correspondence, or explicit design program. None by itself demonstrates that a TypeScript runtime satisfies the corresponding property. |
| Persistence | POSIX settlement root | Exact source artifacts and RPC evidence enter the create-only journal; state, record, and content tiers are rebuildable projections over that source (§5.5, §7.1). |
| Federation or replica exchange | Remote peer | Peers discover one another, authenticate the root boundary, transfer exact source artifacts with retry and quarantine, and converge by dependency-closed source-set union without merging journals (§7.4). |

### 3.3 Scope exclusions

MetroPlat is not the Infomaterial proof package, an inference provider, a downstream website or community application, or a general database hidden behind a bespoke storage format.
It governs ordinary paths and standard protocol faces over a plate.

Peer replication, federation transport, RPC coordination, the derivation-and-revision driver, and the outer autonomic manager are inside the MetroPlat target architecture.
Remote peers, provider services, host tools, and independently owned applications remain context actors; they do not acquire ownership of MetroPlat's journal, knowledge base, or governance decisions.
## 4. Solution strategy

MetroPlat is one dependency-ordered epistemic substrate whose richer behavior is composed from the same identity, admission, evidence, and settlement operations.
No later concern introduces a parallel truth model, address space, authorization path, or durable-state funnel.

| Strategy | Architectural consequence |
|---|---|
| Stable content identity precedes names, locations, and arrival order. | Canonical bytes and their digest define one address (§5.2); journals, operations, terms, proofs, and work reuse it rather than creating local identity schemes. |
| Typed, causal admission is the only durable-state funnel. | Claims are checked terms (§§5.3–5.4), admitted events are immutable and causally witnessed (§§5.5–5.7), and every face, tool, proof, or revision enters through that same funnel. |
| Language families are translated through RMN rather than granted separate authority. | External carriers, software dialects, development artifacts, documents, diagrams, protocol messages, editor diagnostics, and debug sessions are language presentations over addressed artifacts; translations and projections preserve declared judgments, source identity, validation scope, and loss profile without creating truth, authorization, persistence, or operation-identity side paths (§§5.3, 6.5, 7.2, 8.7, AD-39). |
| Evidence accumulates without forcing consistency. | Every claim reads in FOUR (§5.8); presheaf combination retains opposing contributions as `contested` (§5.9), and settlement closes the resulting valuation to a fixed point (§5.10). |
| Every callable effect passes one governed operation boundary. | CLI, HTTP, MCP, and future faces project into the same attempt → authorization → coordination when required → outcome sequence; tools cannot bypass capability standing or journal witnessing (§§5.12, 5.17, 5.23, 6.1–6.2). |
| Coordination and arbitration are demanded by exact obstructions, never by default. | Degree-1 cover obstruction selects `requestConsensus`; the resulting reconciliations are final at `zeroH2`, while a nonzero degree-2 class selects `requestArbitration` (§5.13, §8.6). |
| Questions, derivations, execution, and rule changes form one planned, priced cycle. | `plan` chooses direct answer, derivation, or graded reconciliation and forecasts cost-to-complete, receipts, and residue; `derive` returns a checked proof with bounded trace, search cost, and operational accounting ledger; `execute` admits its `Derivation`, proof, conclusion, and ledger causally; rule claims revise through the identical cycle (§§5.18–5.21, 6.4, 8.8, AD-40). |
| Cross-element adaptation is an auditable outer MAPE-K loop. | Observation, diagnosis, planning, and adjustment are discrete stages; each `Diagnosis` and resulting plan is admitted to the shared knowledge base, and execution routes only through existing governed interfaces (§§5.15, 5.22, 5.32). |
| Work and governance are readings over the same evidential substrate. | Work scopes narrow claim addresses (§5.24); office/incumbency, governance operativity, and endeavor composition reuse `Charge`, settlement, and the canonical journal (§§5.25–5.27), introducing neither a second evidence type nor a second address space. |

§5 defines these building blocks in dependency order; §6 shows their interactions; §7 allocates them to deployment nodes; §8 states their cross-cutting mathematical structure; §9 records the governing decisions; §10 gives measurable acceptance scenarios; and §11 records risks, unrealized capabilities, and evidence debt without weakening the target architecture.
## 5. Building block view

### 5.1 Vocabulary

The terms below are ordinary software-architecture vocabulary, each defined by what distinguishes it from the others, before any of them is used to name a specific part of MetroPlat.

- **Value.** Data with no obligations attached to it: a value does not
act, does not persist itself, and does not answer to a caller.
- **Operation.** A rule that produces a value from values, with no memory
of having been invoked before.
- **State.** A value that persists across invocations of an operation,
changing what that operation produces the next time it runs.
- **Routine.** An operation together with the state it consults and
updates — the smallest unit that has a "before" and an "after.
"
- **Engine.** A routine whose operation is fixed and general-purpose — it
encodes no particular caller's meaning — applied repeatedly to a stream of inputs it does not itself originate.
- **Store.** A routine whose only operation is retention and retrieval of
values by an address; a store asserts nothing about what the values it holds mean.
- **Service.** A routine reachable by other routines only through a
declared interface; a caller of a service knows the interface and never the service's internal state or its choice of engines and stores.
- **Platform.** The complete graph of services, engines, and stores that
are reachable from one another without crossing an external protocol boundary — everything sharing one administrative identity.
- **Tool.** A routine invoked from outside a platform's ordinary call
graph, on demand, whose effect is bounded and which must be authorized by the platform before it runs.
- **System.** Any named grouping of routines that together discharge one
stated responsibility and no other; "platform," "service," "engine," "store," and "tool" are systems distinguished by how they are reached and what they hold, not by size or importance.
- **Translator.** A routine that turns something from outside a platform
into that platform's own native representation, so that every routine past the translator is indifferent to where its input originated.
- **Face.** A structure-preserving presentation of one platform capability
to one external protocol; a face holds no state or authority of its own.
- **Judgment.** The result type of an operation that can fail in a named
way rather than by exception: `Judgment⟨A, B⟩` is exactly one of a successful value of type `A` or an obstruction of type `B`, and nothing else — `∀ j : Judgment⟨A,B⟩. (∃ a. j = ok(a)) ⊕ (∃ b. j = obstructed(b))` (exclusive disjunction: never both, never neither).
An operation returning a `Judgment` is total on its stated obstruction type: every input either succeeds or names which obstruction it hit, never neither.
- **Obstruction.** A value naming a specific, checkable reason an
operation did not produce its ordinary result.
An obstruction is data, not control flow — it is admissible wherever any other value is, in particular as a claim (§5.3) a caller may itself assert and settle.
- **Law.** A statement about a system's operations quantified over every
input the operation accepts — `∀ x. P(x)` — as distinct from a description of one behavior on one input.
Every system defined below states its laws as such quantified statements; a sentence with no quantifier and no equation is not a law, whatever adjective it uses.
- **Search.** An operation that, given a description of a goal rather than
a direct description of an input, returns a value satisfying the goal by exploring more than one candidate — distinguished from an ordinary operation by not being a fixed computation from input to output, and from a store's retrieval by not requiring the goal to name an address that already holds the answer.
- **Plan.** A value naming which operations to invoke, in which order, to
discharge a goal at a bounded cost — the output of planning, consumed by ordinary invocation of the operations it names; a plan holds no authority beyond what those operations already have.
- **Origin.** The declared source of an assertion — who or what is
asserting a claim, carried as data on the event that admits it (§5.5).
An origin is itself a value (§5.1); this architecture does not yet cite a proof-governed construction for it the way it does for a claim's content (§5.3) — §11 states this as an open gap, not a settled design.
- **Point.** A single location in a covering space (§8.2's site); the
domain evidence presheaves (§5.9) assign a reading to.
Used generically here, before §8.2 gives it a specific closed shape.
- **Scope.** A narrowing of a claim's address (§5.5) to a specific level
of the work spine — endeavor, campaign, project, plan, task, or work-item (§5.24).
A scope is a value, not a claim; it names what a claim may be about, at a stated granularity, never an authority or a status in itself.
- **Duty.** One reading of a jural relation (§5.25): a scoped
relation in which the potential holder owes the passive party the performance the relation's scope names.
A duty's correlative is a claim held by the passive party; the two are one relation read from its two ends, never two independently admitted records.
- **Storage site.** A location together with the rule that would let a
journal exist there, whether or not anything has yet been admitted (§5.28).
Distinguished by this qualifier from §8.2's "site" (a covering-space genus), an unrelated structure sharing the same unqualified word in this architecture's source material.
- **Settlement.** A storage site inhabited: paired with an
actually-admitted interior (§5.28).
Every settlement is a storage site; not every storage site is a settlement.
- **Instrument.** A named, boundary-crossing unit of work stated as a
precondition/move/postcondition triple: a lawful field of prepared obstructions a caller's move is checked against, rather than an operation with a body (§5.29).

### 5.2 Identity (content addressing)

**Depends on:** nothing.

A value has a canonical byte representation: a deterministic serialization such that equal values, produced by any routine at any time, produce identical bytes.
A value's address is the cryptographic digest of these canonical bytes.
Two productions of equal content resolve to the same address; an existing address presented with different bytes is a detected error, never an overwrite.
Nothing above this point may use a value's name, its location, or its arrival order as its identity.

**Interface.
**

```text
canonicalize : Value → CanonicalBytes
digest       : CanonicalBytes → Address
```

**Obstruction variants.
** Neither operation returns a `Judgment` — both are total functions on their stated domain (see Postconditions); there is no obstruction variant because there is no input on which either operation is partial.

**Preconditions.
** `canonicalize` accepts any value of a type this system defines; it is total on that domain.
`digest` accepts any `CanonicalBytes` value, i.
e.
any output `canonicalize` can produce.

**Postconditions.
** `∀ v₁ v₂. v₁ = v₂ ⟹ canonicalize(v₁) = canonicalize(v₂)` (determinism) and `∀ v₁ v₂. canonicalize(v₁) = canonicalize(v₂) ⟹ v₁ = v₂` (injectivity up to canonical form).
`∀ b₁ b₂. digest(b₁) = digest(b₂) ⟹` `b₁` and `b₂` are treated as naming the same value by every system past this point — a collision is a detected error (a second production at an existing address with different bytes), never silently accepted.
`digest` is a one-way function: `∄` a routine defined by this architecture computing `CanonicalBytes` from `Address` alone.

### 5.3 RMN and the language substrate

**Depends on:** identity (§5.2), for language-artifact identity.

MetroPlat is an **autonomic language-systems multiplexer**: it receives artifacts in different languages, translates their pure mathematical and informational content into one addressable term substrate, checks and evaluates that content there, and projects results into another language without giving any presentation its own truth, authorization, or persistence path.
Relation Model Notation (**RMN**) is that substrate language.
Its terms are canonical JSON data, not host closures, so a relation can be typed, normalized, addressed, transported, inspected, admitted, replayed, and executed as the same value.

```text
LanguagePresentation := ⟨grammar, judgments, reduction, semantics, canonicalEncoding⟩
LanguageArtifact     := ⟨presentation, language, expression, type?, assertions⟩
Translation          := ⟨source, target, sourcePresentation, targetPresentation, translate, project?, laws⟩
LanguageFamily       := ⟨presentations, sharedSemantics, translations⟩
Dialect              := ⟨family, admittedForms, progression⟩
```

A language family groups presentations that share a semantic carrier and lawful translations; it does not require surface syntaxes to coincide.
A dialect is a constrained family whose forms and progression are fixed.
A projection between presentations declares its target language, validation scope, and loss profile; a human-readable carrier may omit machine-checkable fields only when the omission is named, and a machine-readable carrier is authoritative only for the judgments and laws it actually validates.
Translation is a typed `Judgment`, not string rewriting: an unrepresentable source artifact remains an obstruction, while a successful translation retains its source address, target address, source presentation contract, target presentation contract, and semantic assertions.
Lossless translations round-trip on their declared image; lossy projections name what they may forget (§5.5's plate discipline).

For architecture-description material, arc42 is MetroPlat's ISO/IEC/IEEE 42010-style architecture-description language profile.
The entity of interest is the `@emsenn/metroplat` system named in §3; the architecture description is the content-addressed information expressing that architecture; arc42 sections are views constructed by declared viewpoints; each viewpoint frames stakeholder concerns and model kinds; and EAVT statement rows carry correspondences between views, projections, evidence, and selected review units.
Markdown, XML, HTML, and RMN are carriers or presentations of that architecture-description information, never competing canonical forms.

Below every RMN term sits the only free substrate.
A **mark** is an atomic finite surface string.
An **utterance** is the ordered pair `⟨token: Mark, claim: Mark⟩`, identity-bearing side first.
It deterministically seeds the oriented claim point `⟨subject, predicate, object⟩ := ⟨token, claim, token⟩`.
Past marks and articulation, new behavior is derived by typed relations; opaque host material enters only at a boundary and cannot masquerade as a pure morphism.

RMN's proof core is the simply typed Curry–Howard–Lambek calculus.
`Type` (`Ty`) is generated by `base`, `arrow(A,B)`, `prod(A,B)`, and `unit`.
`Term` (`Tm`) has de Bruijn variables, `lam`, `app`, `pair`, `fst`, `snd`, and `star`.
`HasTy Γ t A` gives the natural-deduction typing rules.
Its semantic projection reads `base` from the positive bit of a claim point's evidence, `propOfTy(v, φ, base) := (Charge.pos(v(φ)) = true)`, with arrow/product/unit interpreted as implication/conjunction/true.
RMN language families may add bounded domain forms, but each extension declares its typing, reduction, and conformance laws rather than silently joining the proof core.

Software is one RMN language family.
JSON Schemas are types and boundary contracts; RMN terms are pure operation bodies; JSON, JSON-RPC, CloudEvents, HTTP, MCP, and LSP are wire or interaction dialects; TypeScript is the host-realization dialect for effects RMN cannot perform.
A structure-to-structure operation carries RMN whenever representable.
A host closure owns only an actual boundary—admission, codec, transport, filesystem, process, or provider effect—and never becomes a second semantic definition of a pure relation.

Software development is a dialect with the fixed progression

```text
dream → plan → architect → spec → tests → docs → code
```

Dreaming opens a candidate possibility; planning selects a bounded course; architecting allocates responsibilities and governing decisions; specification fixes testable obligations; tests make those obligations executable observations; documentation makes their meaning and use communicable; code realizes the documented behavior.
The arrows are causal refinement relations, not filename order or wall-clock order.
Every artifact is content-addressed, names its predecessor, and carries `Charge`-valued assertions.
Every later stage preserves all still-governing claims from the preceding stage; contrary evidence joins to `contested` and is retained rather than overwritten.
Charge-Settled Development supplies the evidence protocol beneath this stage order: verification is monotone evidence accumulation, completion is closure quiescence, and parallel contributions merge by knowledge join.
Research and learning are neighboring dialects over the same substrate—research translates questions and observations into warranted theory, while learning reads the resulting closure orbit—so their artifacts can feed dreaming or specification without an ad hoc conversion path.

```text
CheckedTerm    := ⟨term, context, type, typing: HasTy(context, term, type)⟩
NormalFormTerm := ⟨term, type, typing: HasTy([], term, type), normal: ¬∃ u. step(term,u)⟩

check     : Term × Context × Type → Judgment⟨CheckedTerm, TypeObstruction⟩
infer     : Term × Context → Judgment⟨CheckedTerm, TypeObstruction⟩
eval      : CheckedTerm(context = []) → NormalFormTerm
translate : LanguageArtifact × LanguagePresentation
            → Judgment⟨LanguageArtifact, TranslationObstruction⟩
progress  : List⟨DevelopmentArtifact⟩ → DevelopmentProgression
```

Typing is bidirectional.
`check(t, Γ, A)` succeeds exactly when `HasTy Γ t A`.
`infer` synthesizes a type only for forms whose type is determined by their subterms and context; an unannotated `lam` checks against an expected arrow type but does not synthesize one.
`TypeObstruction` is `UnboundVariable`, `TypeMismatch`, `NeedsExpectedType`, `NotAFunction`, or `NotAProduct`.
`TranslationObstruction` is `UnrecognizedLanguage`, `Unrepresentable`, `IllTypedTranslation`, `SemanticDrift`, or `ResourceLimit`.
`DevelopmentProgression` names missing stages, unknown or retrograde causal edges, missing immediate predecessors, and claims not preserved into the next stage.

The operations obey these laws:

```text
check(t, Γ, A) = ok(c)  ⟺  HasTy Γ t A
infer(t, Γ) = ok(c)     ⟹  check(t, Γ, c.type) = ok(c)

eval(c) = n  ⟹  Red(c.term, n.term)
                 ∧ ¬∃ u. step(n.term,u)
                 ∧ HasTy([], n.term, c.type)

Red(c.term,n₁) ∧ Normal(n₁) ∧ Red(c.term,n₂) ∧ Normal(n₂)  ⟹  n₁ = n₂
```

The last uniqueness law follows from `Predicating.CurryHowardLambek.church_rosser`, whose exact proposition is confluence: `Red(t,u) ∧ Red(t,v) ⟹ ∃w. Red(u,w) ∧ Red(v,w)`.
Existence of `eval`'s result additionally requires strong normalization and preservation for checked closed terms; those are target language-kernel laws, not consequences smuggled out of confluence.
Term identity is the digest of canonical bytes of this unique normal form, so surface-equivalent checked programs share identity.

Translation preserves the structure it declares:

```text
translate(x,L) = ok(y)  ⟹  type(y) = mapType(type(x))
                           ∧ semantics(y) = mapSemantics(semantics(x))
                           ∧ sourceAddress(y) = address(x)

lossless(T) ∧ T.translate(x) = ok(y)  ⟹  T.project(y) = ok(x)
T₂(T₁(x)) = (T₂ ∘ T₁)(x)
```

Development progression is the specialization whose stage order is the seven-element chain above.
Every non-dream artifact causally names an artifact at the immediately preceding stage, and the set of claim addresses asserted at one stage is a subset of the next stage's set.
Readings of the same claim across stages combine by `joinKnowledge`, making test/documentation/code disagreement visible as `contested` rather than choosing the last artifact.

At the semantic level, `propOfTy` makes `unit` terminal, `prod` a product, and `arrow` an exponential; `ccc_terminal`, `ccc_prod_eta`, and `ccc_exponential_adjunction` give the corresponding universal properties.
`curry_howard` states `Charge.pos(v(φ)) = true ⟹ ∀A. propOfTy(v,φ,A)`.
These declarations ground the proof-core correspondence.
The language-family, translation, host-boundary, and seven-stage development laws are architectural commitments built over that core and the corpus's RMN, research-cycle, observed-learning, and Charge-Settled Development constructions.
### 5.4 The type checker

**Depends on:** the term calculus (§5.3).

The type checker is the engine that implements `check`/`infer` as a standalone, callable service: given a term and a context, it runs the typing judgment to a result.

**Interface.
**

```text
typeCheck : Term × Context → Judgment⟨Type, TypeObstruction⟩
```

`typeCheck` is `infer` (§5.3) exposed as a callable service — the operation used wherever a term's type must be recovered rather than confirmed against an already-known expectation (§5.5's admission is the primary caller); it introduces no operation §5.3 does not already define.

**Obstruction variants.
** Identical to `TypeObstruction` (§5.3) — the type checker introduces no obstruction of its own.

**Preconditions.
** Identical to `infer`'s preconditions (§5.3).

**Postconditions.
** `∀ t c. typeCheck(t, c) = infer(t, c)` — the engine computes exactly the judgment §5.3 defines, and every other system past this point that needs to know whether a term is well-typed calls this one engine rather than re-implementing typing rules locally: `∀ system s past §5.4. s` decides well-typedness only by invoking `typeCheck`, never by a second typing procedure — this is what keeps "checking" one non-drifting notion across the whole system.

### 5.5 The journal

**Depends on:** identity (§5.2), the term calculus (§5.3), the type checker (§5.4).

A journal is an append-only store of durable records.
MetroPlat's journal holds exactly one kind of record, an **event**: an origin (§5.1; who or what is asserting), a claim (a term, §5.3), an address (a term naming what the claim is about), a time, and a set of causes (the addresses of events this event depends on).
Nothing enters the journal except through one funnel: a public entry accepts candidate rows, an internal step commits them, and an admission step decides, for each candidate, whether it is accepted.
Admission runs `infer` (§5.3/§5.4) on the claim term under the empty context and rejects any candidate whose claim does not infer some type — admission does not require a candidate to declare a type in advance; it requires the term to be well-typed at all.
Only after typing succeeds does admission perform the acyclicity check of §5.6.

**Interface.
**

```text
admit  : List⟨CandidateEvent⟩ → Judgment⟨List⟨AdmittedEvent⟩, List⟨AdmissionObstruction⟩⟩
read   : Frontier × Selector → AsyncIterable⟨AdmittedEvent⟩
follow : Cursor × Selector → AsyncIterable⟨Delta⟩
```

`CandidateEvent = ⟨origin: Origin, claim: Term, address: Term, causes: Set⟨Address⟩⟩`.
`AdmittedEvent = CandidateEvent ∪ ⟨address: Address, time: Time⟩` — a candidate plus the address the journal assigned it and the time it was admitted.
`Selector` is a predicate over `AdmittedEvent`; `Delta` is `AdmittedEvent ⊕ Retraction` (§5.5 admits only, so `follow` in this architecture never yields a `Retraction` — the variant exists in `Delta`'s type only for uniformity with any future append-only log this shape is reused for).

**Obstruction variants.
** `AdmissionObstruction` is one of: `TypeObstruction` (§5.3, the claim term does not check), `CausalCycle` (admitting this event would make some event a cause of itself, §5.6), `UnknownCause` (a declared cause names an address with no admitted event), `DuplicateCandidate` (the same candidate, by content address, was already admitted — not an error, resolved to the existing event).
`CausalCycle` is exactly the failure of the two properties §5.6's causal order proves from one acyclicity witness: the reachability relation `before` (built from each event's declared `causes`) is proved **irreflexive** (`∀ e. ¬ before(e, e)` — no event causally precedes itself) and **asymmetric** (`∀ e₁ e₂. before(e₁, e₂) ⟹ ¬ before(e₂, e₁)`); a candidate is rejected with `CausalCycle` if and only if admitting it would violate one of these two properties of `before`, and there is no third way a cycle could enter past that check.

**Preconditions.
** `admit` accepts any non-empty list of `CandidateEvent` values; the batch may name causes both inside and outside itself.
`read` requires `Frontier` to be a value `frontierOf` (§5.7) could have produced from some set of admitted events.
`follow` requires `Cursor` to name an address already returned by a prior `read` or `follow` call, or the distinguished empty cursor naming the start of the journal.

**Postconditions.
** Determinism: `∀ batch h₁ h₂. h₁ = h₂ ⟹ admit(batch, h₁) = admit(batch, h₂)` — the same candidate batch, against the same prior journal history `h`, always produces the same verdict for every candidate in it.
Crash atomicity: a crash at any point during a batch's admission leaves the journal in a state where every candidate in the batch is either fully admitted or not admitted at all — never a state where a candidate's event exists without its full record, or where causes were checked but typing was not.
Because typing runs before an event is ever durable, admission is a proof-governed gate on every fact this system will ever hold, not validation layered on top of storage.
Read completeness: `∀ f sel. read(f, sel)` yields exactly the admitted events at or causally before `f` (§5.6) matching `sel`, once, each — no admitted event matching `sel` is omitted, and no event is yielded twice within one `read` call.

**Contains.
** A store for committed rows, layered in tiers — log, state, record, content — each tier a deterministic, idempotent projection of the tier below it: `∀ tier t above the lowest. rebuild(t) = t` (rebuilding from the tier below reproduces the same content), so any tier above the lowest may be deleted and recomputed without loss.
This is the one repository for events; no other store duplicates it.

Each tier is additionally a named **plate**: a rate-distortion role stating what that tier preserves exactly and what it is permitted to forget, ranked coarsest (the log, rank 3, role `source`) to finest (content, rank 0, role `lossy-cut`).
`plate:log` preserves the full event tuple, contract exposure, append order, and content identity, and forgets nothing — it is `source`, the one tier every other tier is a lossy function of.
`plate:state` is a `sufficient-statistic`: it preserves current functional facts and accumulated non-functional evidence, and may forget superseded statement history and duplicate append attempts.
`plate:record` is a `rate-distortion-code`: it preserves settled invariants and the source rows a settled reading still needs, and may forget rows a settled reading has made redundant.
`plate:content` is a `lossy-cut`: it preserves an entity's address and its selected presentation fields, and may forget every cell not selected for presentation, including the statement coordinate that would let it be checked against the log.
Naming a tier's plate role is not a second classification of the tier — `rebuild(t) = t` (above) already states each tier is a deterministic projection of the one below it; the plate role states, for that same projection, exactly which information the projection is a *lossless* function of and which it is free to discard, so that "the record tier forgot X" is a checkable claim against a named `preserves`/`mayForget` set, not an unstated implementation detail.

### 5.6 Causal order

**Depends on:** the journal (§5.5).

An event records its causes as a direct, one-step dependency on other events' addresses.
Admission (§5.5) rejects a candidate whose causes would close a cycle before committing it — a "closed timelike curve" obstruction.
Because every admitted event's causes are acyclic by construction, their transitive closure is a genuine strict causal order.

**Interface.
**

```text
before   : Address × Address → Boolean
causesOf : Address → Set⟨Address⟩
```

`before(a, b)` holds exactly when `a` is reachable from `b` by one or more steps of `causesOf` (the transitive closure of direct causation).
`causesOf(a)` is the `causes` set recorded on the admitted event at `a`.

**Obstruction variants.
** Neither operation returns a `Judgment`: `before` and `causesOf` are total on `Address` values naming an admitted event.

**Preconditions.
** `before`/`causesOf` require both arguments (`before`) or the one argument (`causesOf`) to name an admitted event (§5.5); this architecture defines no meaning for either operation applied to an address with no admitted event, so a caller must confirm admission at that address first.

**Postconditions.
** `∀ e. ¬before(e, e)` (irreflexive), `∀ e₁ e₂ e₃. before(e₁, e₂) ∧ before(e₂, e₃) ⟹ before(e₁, e₃)` (transitive), `∀ e₁ e₂. before(e₁, e₂) ⟹ ¬before(e₂, e₁)` (antisymmetric) — derived from the one acyclicity witness at admission, not three separately asserted properties: `causal order = transitiveClosure(causesOf)`, and `transitiveClosure` of an acyclic relation is proved irreflexive, transitive, and antisymmetric by that construction alone.

**The order generates a topology, and continuity in it is exactly monotonicity.
** `before` generates the Alexandrov topology whose open sets are exactly the future-closed sets: every event's reflexive future cone is itself open (`∀ e. Open(FutureCone(e))`), and this topology's own specialization order — the order a topology always carries, `x` specializes `y` iff every open set containing `x` also contains `y` — is proved to coincide exactly with reflexive `before`: `∀ e₁ e₂. specializes(e₁, e₂) ⟺ before(e₁, e₂) ∨ e₁ = e₂`, and strict reachability is specialization plus distinctness: `∀ e₁ e₂. before(e₁, e₂) ⟺ (specializes(e₁, e₂) ∧ e₁ ≠ e₂)`.
Continuity in this topology is proved to coincide exactly with monotonicity in the causal order, stated as a genuine iff rather than one direction only: for any map `f` between two causal orders' event sets, `Continuous(f) ⟺ ∀ e₁ e₂. before(e₁, e₂) ⟹ before(f(e₁), f(e₂))` (`causalContinuous_iff_monotone`) — a map preserves the topology's open sets if and only if it preserves causal precedence, with no third, independently-behaving notion of continuity for this order.
§8.3 states the settlement-depth grading built on top of this topology.

### 5.7 Frontier computation

**Depends on:** causal order (§5.6), identity (§5.2).

A **frontier** is the content-addressed manifest of one finite, causally closed observation.
It contains the observation's maximal admitted events (**tips**) and commits to the exact validated history those tips summarize.
A tip list alone is not a frontier: the closure root and its validation witness are part of the identity, so two partial observers may name identical tips without pretending to have observed identical histories.

```text
Frontier := ⟨causalProfile, tips: SortedUniqueList⟨EventRef⟩,
              closureRoot: Address, closureWitnessRoot: Address⟩
```

**Interface.
**

```text
frontierOf     : List⟨AdmittedEvent⟩ × CausalResourceEnvelope
                 → Judgment⟨Frontier, FrontierObstruction⟩
historyOf      : Frontier → Set⟨AdmittedEvent⟩
mergeFrontiers : Frontier × Frontier × CausalResourceEnvelope
                 → Judgment⟨Frontier, FrontierObstruction⟩
```

`frontierOf` sorts and deduplicates event addresses, validates that every event is admitted at one site and that every named causal predecessor is present, content-addresses the observed closure and its validation receipt, then selects exactly the undominated events as tips.
`historyOf` resolves the committed closure.
`mergeFrontiers` unions the two committed histories and derives the frontier of that union; it never orders spacelike tips merely to make one winner.

**Obstruction variants.
** `FrontierObstruction` is `UnadmittedEvent`, `MissingCause`, `DuplicateReference`, `ClosureLimit`, `SiteMismatch`, `UnknownClosureRoot`, or `InvalidClosureWitness`.
A malformed or incomplete observation is obstructed rather than silently expanded from ambient journal state.

**Preconditions.
** `frontierOf` accepts a finite event list and a finite resource envelope.
`historyOf` accepts a content-addressed frontier whose closure and validation artifacts verify.
`mergeFrontiers` accepts two frontiers for the same site and causal profile.

**Postconditions.
** Exact history and maximality: if `frontierOf(S, b) = ok(f)`, then

```text
historyOf(f) = setOf(S)

e ∈ f.tips
  ⟺ e ∈ setOf(S) ∧ ¬ ∃ e' ∈ setOf(S). before(e, e')
```

Antichain:

```text
∀ e₁ e₂ ∈ f.tips. e₁ ≠ e₂
  ⟹ ¬ before(e₁, e₂) ∧ ¬ before(e₂, e₁)
```

Downward closure:

```text
∀ e ∈ historyOf(f). ∀ e'. before(e', e)
  ⟹ e' ∈ historyOf(f)
```

The construction uses §5.6's transitive, asymmetric reachability (`CausalSet.reaches_trans`, `CausalSet.reaches_asymm`).
Each tip's past cone is downward closed by `Causal.Cone.past_is_downward_closed`; §5.7 adopts the finite-union/maximal-tip construction over those cones as its frontier model.

Round trip and canonicity, whenever the envelope admits the history size:

```text
frontierOf(sorted(historyOf(f)), b) = ok(f)

historyOf(f₁) = historyOf(f₂) ⟹ f₁ = f₂
```

Frontier merge is a bounded join-semilattice over observed histories.
Write `f ⊔ g` for the successful result of `mergeFrontiers(f, g, b)` under one sufficient shared envelope:

```text
historyOf(f ⊔ g) = historyOf(f) ∪ historyOf(g)
f ⊔ g = g ⊔ f
f ⊔ f = f
(f ⊔ g) ⊔ h = f ⊔ (g ⊔ h)
```

These equalities range over successful calls under one sufficient envelope.
The empty validated history has the unique empty frontier.
Adding admitted events monotonically enlarges history, while tips may be replaced when a later event dominates them; frontier identity follows the committed history, not tip-count monotonicity.

### 5.8 Evidence values

**Depends on:** nothing beyond ordinary values; used from here on by everything downstream.

A claim's evidential status is not a boolean.
It is a pair of two independent bits — evidence *for* and evidence *against* — giving four distinct values: **unknown** (neither bit set), **held** (for only), **denied** (against only), and **contested** (both).
This is the value type of every claim's status downstream: settlement (§5.10) produces these values, capability standing (§5.12) is read as one, and coordination cost (§8.4) is measured over collections of them.
§8.1 states this type's full algebra.

**Interface.
**

```text
join  : Charge × Charge → Charge   -- knowledge-order join
meet  : Charge × Charge → Charge   -- knowledge-order meet
negate : Charge → Charge
```

**Obstruction variants.
** None — all three operations are total on `Charge`, which has exactly four values (§8.1); there is no input on which any of them is undefined.

**Preconditions.
** `join`/`meet` accept any two of the four `Charge` values; `negate` accepts any one.

**Postconditions.
** `join` and `meet` are each commutative, associative, and idempotent (§8.1); `negate` is an involution: `∀ c. negate(negate(c)) = c`, and reverses the truth order while preserving the knowledge order (§8.1's stated orders).

### 5.9 Evidence presheaves

**Depends on:** evidence values (§5.8), the covering-space structure of §8.2 (a site).

Settlement (§5.10) does not operate on one evidence value at a time; it operates on a structure assigning an evidence value to every point of a covering space at once — an **evidence presheaf**, a total function from point to `Charge`.
Building one from a predicated claim, and combining two presheaves, are the operations this system provides; settlement (§5.10) is the operation that closes an already-built presheaf to a fixed point, defined separately in §5.10 because closure, unlike construction and combination, is not merely a presheaf-algebra operation — it is graded by the ordinal machinery of §8.3.

**Interface.
**

```text
presheafOf : PredicatedClaim → EvidencePresheaf
combine    : EvidencePresheaf × EvidencePresheaf → EvidencePresheaf
readingAt  : EvidencePresheaf × Point → Charge
agreesOn   : Cover × EvidencePresheaf × EvidencePresheaf → Boolean
```

`EvidencePresheaf` is a total function from `Point` (§5.1's generic term, here a site point of §8.2) to `Charge` (§5.8) — every point has a reading, `unknown` where no evidence has yet been positted, never an absent entry; this is a stronger commitment than a partial map, and it is what makes `combine` below total rather than partial.
`Cover` is a finite list of predicates over `Point` whose union covers every point: `∀ point. ∃ patch ∈ Cover. patch(point) = true`.

**Obstruction variants.
** None.
`combine` is a total operation — there is no input on which combining two presheaves fails; see Postconditions for why disagreement at an overlap is resolved, not rejected.

**Preconditions.
** `combine`/`agreesOn` accept any two `EvidencePresheaf` values over the same site (§8.2); because `EvidencePresheaf` is total, there is no domain restriction to state.
`readingAt` accepts any `Point` of the site.

**Postconditions.
** `combine` is `readingAt(combine(p₁, p₂), point) =` `join(readingAt(p₁, point), readingAt(p₂, point))` at every point — the pointwise knowledge-join of the two presheaves, total because `join` (§5.8) is total.
This join is proved the least upper bound of the two presheaves under the pointwise knowledge order: `∀ p₁ p₂ u.` `leK(p₁, u) ∧ leK(p₂, u) ⟹ leK(combine(p₁, p₂), u)` — no third presheaf sits strictly between the two inputs and their combination; there is no disagreement `combine` refuses to resolve, because knowledge-join of two `Charge` values is itself total and always produces a value (in particular `contested`, when the two disagree) rather than failing.
**Separation:** `∀ cover p₁ p₂. agreesOn(cover, p₁, p₂) = true ⟹ p₁ = p₂` — a presheaf is determined by its readings on any covering family of patches; two presheaves agreeing on every patch of a cover are the same presheaf, so no hidden reading exists outside what a cover can witness.

**N-source accumulation at one point.
** Repeated `combine` at a single point, rather than one join of two sources, is proved as its own function of the contribution count: `AperiodicOrder.Tiling.condensate : Nat → Charge` maps zero contributions to `unknown`, exactly one to a definite pole (`held` or `denied`, whichever the one contribution asserts), and two or more to `contested` — `condensate_zero`, `condensate_one`, `condensate_over` (`condensate(n+2) = kTop`).
Because a definite single reading is never itself contradictory (`empty_consistent`/`single_consistent`: `isInconsistency = false` at zero and one contribution) while every reading past the first collision is (`over_occupation_inconsistency`), a point's evidential status is determined entirely by whether it has zero, exactly one, or more than one contributing source — never by which particular sources they were.
This threshold is proved gauge-invariant: negating every contribution's polarity leaves the inconsistency verdict unchanged (`mirror_fixes_condensate`/`mirror_fixes_condensate_pole`) — a point's contested status does not depend on which side of a symmetric relation each contribution took.

**`H1rank` is exactly the excess over accumulated evidence's own threshold.
** `percolationThreshold(N) := N.entities − N.components` — the same two of the three counts §8.4's `H1rank := (cells + components) − entities` is built from — and `h1rank_eq_excess` proves the identity `N.H1rank = N.cells − percolationThreshold(N)` exactly: `H1rank` is not merely analogous to a threshold excess, it is defined by one, in terms of the identical `entities`/`components` pair.
`loadBearing_iff_critical` states the resulting law as a genuine `iff`: `loadBearing(N) ⟺ percolationThreshold(N) + 1 ≤ N.cells` — a cover's cell count crossing the threshold by exactly one is necessary and sufficient for the named structural property, not merely sufficient.
Applied to a presheaf whose points carry accumulated evidence (`Beads.loadBearing_of_condensed_crosses_threshold`): once the number of points whose accumulated evidence has crossed the single-contribution threshold (`condensate`'s `n ≥ 2`, above) itself crosses `percolationThreshold`, the whole cover is `loadBearing`.
This is the same `H1rank` §5.13b's `coordinationCost` computes, applied to a cover of evidence-accumulation points rather than to a cover of settlement regions — one arithmetic identity governing both, not two independently invented thresholds that happen to look alike.

### 5.10 Settlement

**Depends on:** the journal (§5.5), causal order (§5.6), frontier computation (§5.7), evidence values (§5.8), evidence presheaves (§5.9).

Settlement is the process that turns admitted events, at a named frontier, into a determinate evidential answer to a question.
It proceeds in stages: an **utterance** (a raw claim enters as an ordered pair of marks, §5.3's `⟨token: Mark, claim: Mark⟩`); **articulation** (the utterance generates a claim point — `PredicationCell.seed(u) := ⟨u.token, u.claim, u.token⟩`, the reflexive oriented triple with subject and object both the utterance's token, predicate its claim); **predication** (the claim point is reindexed by four generators, each with its own proved law rather than an unstated categorical structure: `converse(φ) :=` `⟨φ.object, φ.predicate, φ.subject⟩`, an involution (`converse(converse(φ)) = φ`); `subjProj(φ) := ⟨φ.subject, φ.predicate,` `φ.subject⟩` and `objProj(φ) := ⟨φ.object, φ.predicate, φ.object⟩`, each idempotent (`subjProj(subjProj(φ)) = subjProj(φ)`, likewise for `objProj`); and `specialize(f, φ) := ⟨φ.subject, f(φ.predicate), φ.object⟩`, functorial in `f` (`specialize(id, φ) = φ`, `specialize(g ∘ f, φ) = specialize(g, specialize(f, φ))`) — four independently-lawed reindexings, not four morphisms of one proved category: no composition operator or associativity law relates all four together as objects of a single category, so "the predication category" names a shared *carrier* (`PredicationCell`) these four operations act on, not a checked categorical structure); **positing** (the predicated claim point becomes one value of an evidence presheaf, §5.9 — `readingAt(presheafOf(φ), φ) = v(φ)` for the valuation `v` §5.3's `propOfTy` already reads a base type against); and **settling** (the presheaf's readings are closed to a fixed point).

The closing step is the pointwise lift, to every point of the presheaf, of a single-`Charge` closure: an inflationary (`∀ a. a ≤ₖ op(a)`), monotone, idempotent endomap on the evidence type (§8.1's `Charge`, §8.4's `Closure`) — for a claim not entangled with any rule (§5.20's `Derive` plan is not in play), this is the join-to-a-target closure `op(a) := k ∨ₖ a` for the incoming evidence `k` (§8.4's `joinClosure`); for a claim that IS a rule firing against other settled claims, it is instead the immediate-consequence closure `Tstep` of §8.4's `RuleSystem` — the same lift, over the same presheaf type, driven by a different, still inflationary and monotone, endomap.
Either way, settling a whole presheaf is this single-point closure applied at every point independently, then read back as one structure — settling never couples one point's closure to another point's evidence except through what the presheaf itself already represents at that point.

A settlement, in general, is a base carrying an admission law, paired with content proved to satisfy it: `Infomaterial.Settlement` states this as one two-field shape (`content`, and a proof `admits` that the base's own law holds of it), of which claim settlement is one instance among four proved — the others being material tiling admissibility, lenticular thread legality, and a causal boundary's shroud-supported effect relation.
The instance nearest claim settlement's own shape is `Settlement.ofCech1`: a cover with local sections, admitted exactly when the glued section is a `Coboundary` of an agreeing family, with `content := glue D` admitted by `glue_coboundary` — the same gluing construction `Site/Sheaf.lean` uses for `combine` (§5.9).
A new kind of settled content is introduced by exhibiting its own base, content type, and admission law against `Settlement`'s two-field definition — but this two-field shape itself carries no closure law: `content`/`admits` state only that some content satisfies some base's law, not that the content was *reached* by an inflationary/monotone/idempotent process.
The closure dynamics this document's own "closing step" paragraph describes is a separate, richer structure: a **settling coalgebra**, a state valuation `E` together with a map witnessing `E ≤ₖ F_U(E)` for the settling endofunctor `F_U(v) := Cl(v) ∨ₖ u` (the ordinary closure `Cl` joined with one increment `u` of newly-admitted evidence) — every valuation carries one canonically, because `F_U` is proved inflationary (`v ≤ₖ Cl(v) ≤ₖ Cl(v) ∨ₖ u`) and monotone unconditionally, so the coalgebra map always exists rather than being a property to establish per instance.
Its orbit is proved `≤ₖ`-monotone at every stage (`m ≤ n ⟹ orbit(m) ≤ₖ orbit(n)`), with successor steps iterating `Cl` and limit stages taking the knowledge-join of every earlier stage, proved to be both an upper bound of every earlier stage and the *least* such bound — settling continuity adds nothing beyond what the prior stages already warrant.
This settling coalgebra is proved **dual** to a settling *algebra* (a map consuming `Cl(E) ≤ₖ E`, forced to the fixed point `Cl(E) = E`): the algebra consumes the closure's output to produce a fixed state, the coalgebra produces the closure's output from a state, and at quiescence — exactly the fixed point `Cl(E) = E` a completed settlement reaches — the two coincide and the coalgebra map becomes an **isomorphism**, `F_U(E) = E`: settlement's closing step is this coalgebra reaching the point where unfolding one more increment changes nothing, not merely "some further application is a no-op" stated loosely.

**Interface.
**

```text
utter      : RawClaim → Utterance
articulate : Utterance → Judgment⟨ArticulatedClaim, MalformedUtterance⟩
predicate  : ArticulatedClaim → Judgment⟨PredicatedClaim, UnpredicableClaim⟩
posit      : PredicatedClaim → EvidencePresheaf   -- = presheafOf (§5.9)
settle     : EvidencePresheaf × Frontier → Judgment⟨SettledValuation × OperationalAccountingLedger, StabilizationObstruction⟩
```

**Obstruction variants.
** `MalformedUtterance` (the raw claim's shape does not match any known articulation).
`UnpredicableClaim` (the articulated claim names a predicate space with no defined evaluation).
`StabilizationObstruction` (no fixed point was reached within the configured search horizon — a statement that none was *found* within that horizon, never a claim that none exists — carrying the horizon's operational accounting ledger with explicit receipts and remaining residue).

**Preconditions.
** `settle` requires its `EvidencePresheaf` argument to be well-founded over the frontier's causal history (§5.6/§5.7) — every point it assigns a reading to must be reachable from an admitted event at or before the frontier.

**Postconditions.
** Purity and determinism, as a law rather than an adjective: `∀ p f. settle(p, f) = settle(p, f)` for any two evaluations — `settle` reads nothing but its arguments, never wall-clock time or process state.
Termination toward a fixed point: at any single point, the closure `op` settling iterates reaches its fixed point by the third application — `∀ op x. (∀ a. a ≤ₖ op(a)) ⟹ op³(x) = op⁴(x)`, proved for every inflationary endomap on `Charge` by pigeonhole over its four-element knowledge order, not assumed per closure (`Closure.Ordinal.Finite.settles_by_three`).
Because settling a presheaf is this closure applied pointwise, the whole presheaf reaches its fixed point within the same bound; §8.3 grades the general case (where the index set need not be finite) into the four regimes — strict (finite), scott, transfinite-bounded, aperiodic — of which the three-step bound above is the strict-finite regime's exact witness, not an approximation of it.
Terminality: `∀ p f v. settle(p, f) = ok(v) ⟹ settle(presentAsPresheaf(v), f) = ok(v)` — settling an already-settled valuation again, at the same frontier, reproduces it; there is no operation that un-settles a fixed point (`Closure.op_fixed`, restated for the pointwise lift).
Operational accounting: every settling run reports the §8.8 ledger for the observed horizon.
The ledger's cost-to-complete is nonincreasing across stages, strictly decreases when a supported cell fires, and balances initial cost as accumulated evidence-flow receipts plus remaining residue; a successful settled valuation reports zero residue, while `StabilizationObstruction` reports the bounded horizon's nonzero residue instead of hiding unfinished work.
Evidence retention: a `contested` evidential value is a legitimate fixed point — the closure's codomain includes it structurally, not as a tolerated exception.

**Worked trace.
** Two sources assert conflicting claims about one entity `e`: source A utters "e has property P" and source B utters "e does not have property P," both admitted to the journal with no causal relation between them (§5.6).
`utter` produces two `Utterance` values, one per raw claim.
`articulate` normalizes each into an `ArticulatedClaim` naming the same address (`e`) and the same predicate (`P`), one asserting it and one denying it.
`predicate` evaluates both against the shared predicate space for `P`, producing two `PredicatedClaim` values that agree on which point of the covering space they concern.
`posit` (`presheafOf`, §5.9) places each into its own single-point `EvidencePresheaf` at that point, one contributing the *for* bit and one the *against* bit; `combine` (§5.9) joins them into one presheaf reading `for = true, against = true` at that point.
`settle`, applying the closure operator once, finds this is already a fixed point (a further application changes nothing), so it stabilizes at the finite (strict) regime in one step.
The `SettledValuation` reads `e.P = contested`, both contributing events retained and queryable (§5.11), matching the evidential-integrity quality goal of §1.2.
### 5.11 The knowledge base

**Depends on:** settlement (§5.10).

The knowledge base gives settlement a durable home and a query surface: it holds the claim store (a content-addressed partition of admitted events, §5.5/§5.2), runs settlement over a named frontier, and answers questions by returning the resulting evidence value.
A distinguished partition of the claim store, the rule store, holds claims about the knowledge base's own interpretation — asserted and settled through the identical path as any other claim (§8.5 states why this does not collapse into paradox).
Because a rule is data at the same type as anything else the knowledge base holds, revising a rule requires no mechanism beyond `assert` and `settle`.

**Interface.
**

```text
assert     : Claim × Evidence → Judgment⟨Accepted, RejectionObstruction⟩
query      : Question × Frontier → Charge
reviseRule : RuleClaim → Judgment⟨Accepted, RejectionObstruction⟩
```

`Question` is a `Term` (§5.3) naming a point of the covering space §8.2's site provides.
`query`'s result is `readingAt` (§5.9) of the settled presheaf at that point — `query` introduces no evidence-reading mechanism `readingAt` does not already define.

**Obstruction variants.
** `RejectionObstruction` is one of: `AdmissionObstruction` (§5.5, the underlying event failed admission), `MalformedUtterance`, `UnpredicableClaim`, `StabilizationObstruction` (§5.10, the claim's presheaf failed to settle).
Combining the claim's presheaf with existing evidence (§5.9's `combine`) is never itself an obstruction — it always succeeds, at the knowledge-join of the two, which may read `contested`; disagreement is a reachable evidential value, not a rejected assertion.

**Preconditions.
** `assert` accepts any `Claim` (a `Term`, §5.3) and `Evidence` (a `Charge`, §5.8) pair.
`query` accepts any `Question` and any `Frontier` `frontierOf` (§5.7) could have produced.
`reviseRule` accepts any `RuleClaim` — a `Claim` whose address falls within the rule-store partition.

**Postconditions.
** `∀ q f₁ f₂. f₁ = f₂ ⟹ query(q, f₁) = query(q, f₂)` — a query is a pure function of the question and the frontier.
`reviseRule` succeeding is exactly `assert` succeeding on a claim whose address falls within the rule-store partition: `∀ c. reviseRule(c) = assert(c, held)` restricted to the rule-store partition of the address space — there is no second acceptance procedure for rules.

### 5.12 Capability and authorization

**Depends on:** the knowledge base (§5.11).

A capability is not a grant recorded separately from the knowledge base; it is a claim, of the same shape as any other, that some origin may perform some action — subject to the identical admission (§5.5), settlement (§5.10), and evidence-valuation (§5.8) as any other claim.
Whether a specific request may proceed is read directly from the settled evidential value at the request's frontier.

A `Subject` that must cross a boundary this architecture does not itself journal — carried by an external caller, attenuated by an intermediary, or discharged against a third party's own standing — is a **caveat chain**: an initial grant together with an ordered, possibly-empty sequence of caveats, each a `Charge`-valued predicate (§5.5) a holder adds to the chain.
A caveat only *narrows* what the chain authorizes; it never widens it.
This is not a second `Subject` representation alongside an ordinary one — every `Subject` this architecture defines is a caveat chain, and the single-grant case is simply the chain with an empty caveat sequence.

**Interface.
**

```text
appraise    : Request × Subject × Frontier → AuthorizationJudgment
enforce     : CommittedDecision → Judgment⟨ExecutionCapability, EnforcementObstruction⟩
chainStanding : Subject → Charge
discharge   : Caveat × SupportingClaim → Judgment⟨DischargedCaveat, DischargeObstruction⟩
```

`AuthorizationJudgment` is `Charge` (§5.8) — `appraise` is `query` (§5.11) specialized to a request/subject-shaped question; it introduces no second evidence-reading mechanism.
`chainStanding` reduces a caveat chain to the one `Charge` `appraise` reads: the knowledge-meet, in chain order, of the grant's own standing with every caveat's settled standing (§5.9's `meet`) — a chain is denied by its weakest caveat, never merely narrowed by it.
A caveat whose predicate this journal cannot itself settle is a **third-party caveat**; its standing is `unknown` until a **discharge** — an ordinary claim admitted through §5.5, correlated to the caveat by content address, supplying the attesting evidence — resolves it exactly as any other claim resolves from supporting evidence (§5.9's `combine`).

**Obstruction variants.
** `EnforcementObstruction` is one of: `Unheld` (the authorization judgment is `unknown`), `Denied` (the judgment is `denied`), `Contested` (the judgment is `contested`).
`DischargeObstruction` is one of: `CaveatUnknown` (no admitted caveat matches the content address the discharge names), `AlreadyDischarged` (a discharge is already admitted for this caveat — a caveat is discharged at most once, §5.2's identity-collision discipline), `TypeMismatch` (the supporting claim's type does not satisfy the caveat's predicate, per `typeCheck`, §5.4).

**Preconditions.
** `appraise` accepts any `Request`, `Subject`, and `Frontier` `frontierOf` (§5.7) could have produced.
`enforce` requires `CommittedDecision` to name an `appraise` result already admitted to the journal (§5.5) as a `DECISION_COMMITTED` event (§6.1).
`chainStanding` accepts any `Subject` — because a `Subject` is always a caveat chain, possibly of length zero, there is no `Subject` value outside this operation's domain.
`discharge` requires `Caveat` to name an already-admitted third-party caveat and `SupportingClaim` to be a term this architecture's calculus (§5.3) can check.

**Postconditions.
** `∀ r s f. appraise(r, s, f) = charge ⟹ enforce` produces an `ExecutionCapability` if and only if `charge = held`: `enforce(d) ↦ ExecutionCapability ⟺ appraisalOf(d) = held`.
No catalog membership, process configuration, or caller-supplied identity is sufficient on its own to satisfy this postcondition — the only path is a `held` evidential value read from settlement, and for a caveat chain that value is exactly `chainStanding`'s output: `∀ r s f. appraise(r, s, f) = chainStanding(s)`.
Attenuation is monotone: appending a caveat can only narrow what a chain authorizes, never enlarge it — `∀ chain caveat. leqKnowledge(chainStanding(append(chain, caveat)), chainStanding(chain))` (§5.8's knowledge order) — because `meet` is a lower bound of its arguments (§5.8's postcondition), so folding one further caveat's standing into the chain's knowledge-meet can only lower or hold the result, never raise it.
Discharge is the only path from `unknown` to a determinate standing for a third-party caveat: `∀ caveat. chainStanding` reads `caveat` as anything other than `unknown` only after `discharge(caveat, _) = ok(_)` has admitted a correlated claim — a caveat's standing never moves except through this one operation.

### 5.13 Conflict, coordination, reconciliation, and arbitration

Four distinct building blocks follow the dependency order their definitions force: a **conflict** is a condition at one point; **coordination cost** measures degree-1 obstruction over a cover; **reconciliation** resolves that obstruction between readings; **higher arbitration** measures and resolves degree-2 obstruction between reconciliation results.
Each is its own sub-entry: 5.13a depends on evidence values, 5.13b on conflict and settlement, 5.13c on both, and 5.13d on reconciliation and §8.6's degree-2 fabric.

#### 5.13a Conflict

**Depends on:** evidence values (§5.8).

A conflict is a property of one point, not of a cover: a point is in conflict exactly when two or more independent sources have contributed evidence to it.
This is a threshold on a source count, not a comparison of what the sources said — a single source is never in conflict with itself, and a second source is a conflict whether it agrees or disagrees with the first, because agreement and disagreement are both evidence *for* and evidence *against* accumulating independently (§5.8's `pos`/`neg` bits), and two contributions to the same bit already cross the threshold.

**Interface.
**

```text
contributionCount : Point × EvidencePresheaf → NonNegativeInteger
inConflict        : Point × EvidencePresheaf → Boolean
```

**Obstruction variants.
** None.
Both operations are total reads of an already-built presheaf (§5.9); a conflict is a value to observe, not a condition either operation can fail to determine.

**Preconditions.
** Both operations accept any `Point` of the presheaf's site and any `EvidencePresheaf` (§5.9) already built over it.

**Postconditions.
** `inConflict(point, presheaf) = true ⟺` `readingAt(presheaf, point) = contested` — a point is in conflict exactly when its accumulated reading is `contested` (§5.8's `kTop`), never at `unknown` or a single definite pole.
This is a threshold law, not an approximation, stated exactly by the accumulation function `condensate : NonNegativeInteger → Charge`: `condensate(0) = unknown`, `condensate(1) = held ∨ denied` (whichever that one contribution asserts), and `condensate(n) = contested` for every `n ≥ 2` — a point's conflict status is determined entirely by whether it has zero, one, or more than one contributing source, never by which particular sources they were, and never by whether those sources agreed: `∀ point presheaf n. contributionCount(point, presheaf) = n ∧ n ≥ 2 ⟹` `inConflict(point, presheaf) = true`, and the converse: `inConflict(...) =` `true ⟹ contributionCount(...) ≥ 2`.
The threshold is gauge-invariant: negating every contribution's polarity at a point (swapping which side of a disagreement each source took) leaves `condensate`'s output on that point's contribution count unchanged — conflict depends on how many sources contributed, not on which side of a disagreement each one took.

**Rigidity — conflict counted across many points at once.
** Applied to every point of a presheaf rather than one point in isolation, the same accumulation gives a second operation, `rigidity : EvidencePresheaf → NonNegativeInteger`, the count of points currently in conflict: `rigidity(presheaf) := |{point : inConflict(point, presheaf)}|`.
Three laws govern how `rigidity` changes as a presheaf gains points: a point crossing into conflict (its contribution count reaching 2) raises `rigidity` by exactly 1 (`rigidity(presheaf ∪ {point↦conflict}) =` `rigidity(presheaf) + 1`); a point that stays out of conflict (0 or 1 contributions) leaves `rigidity` unchanged; and `rigidity` is monotone under adding points — `∀ presheaf₁ presheaf₂.` `presheaf₁ ⊆ presheaf₂ ⟹ rigidity(presheaf₁) ≤ rigidity(presheaf₂)` — a presheaf never sheds conflicts by gaining more evidence, only accumulates them.
`rigidity` is the exact quantity §5.13b's coordination cost is built from, applied there to a cover's overlap count rather than to a presheaf's point count directly — one arithmetic identity, not two independently invented thresholds.

#### 5.13b Coordination

**Depends on:** conflict (§5.13a), settlement (§5.10).

Coordination cost is the cycle-rank measurement over a whole cover: a collection of overlapping settlement regions, not one point.
In industry terms, it is the conflict budget that decides whether a local merge remains coordination-free or must enter an explicit consensus path.
A cover is modeled by three counts: its points (`entities`), its overlaps among any number of settlement processes' regions (`cells`), and its connected components.
The construction is arity-free: nothing in `entities`, `cells`, or `components` is special to a pair of regions, so the same metric applies to the multi-managed-element covers §5.22's orchestrator observes.

**Interface.
**

```text
coordinationCost : Cover → NonNegativeInteger
```

`Cover = ⟨entities: NonNegativeInteger, cells: NonNegativeInteger, components: NonNegativeInteger⟩`, subject to two structural facts true of any cover built by union of overlapping regions: every component contains at least one entity (`components ≤ entities`), and every cell merges at most one pair of components (`entities ≤ cells + components`).
`coordinationCost(cover) := (cells + components) − entities` under these two facts, so the subtraction never underflows.
Equivalently, `coordinationCost(cover) = cells − (entities − components)`: the number of overlaps in excess of a spanning forest.

**Obstruction variants.
** None.
`coordinationCost` is a total arithmetic function of a well-formed `Cover`.

**Preconditions.
** `coordinationCost` accepts any `Cover` satisfying the two structural facts above — any cover actually built by taking the union of two or more settlement processes' regions (§5.10) satisfies them by construction.

**Postconditions.
** Infomaterial's `CoverNerve.H1rank` is this cost: `h1rank_is_coordination_cost` states `H1rank = cells − (entities − components)` and `H1rank = 0 ↔ entities = cells + components`.
`h1_vanishes_iff_forest` and `coordinationFree_iff_forest` state the same zero-cost boundary as the forest condition, while `tree_coordination_free` states that an actual finite tree cover has `H1rank = 0`.
Thus:

```text
coordinationCost(cover) = 0
  ⟺ cover.entities = cover.cells + cover.components
  ⟺ cover is already at its spanning-forest boundary
```

Positive cost counts only cycle-closing overlaps: an overlap that merely connects two previously separate components keeps the cover at the forest boundary, while an overlap between already-connected regions raises the cost by one.
This is the exact trigger AD-7 uses: consensus is wasteful at cost zero and mandatory once the cost is positive.

**The Laplacian dual.
** The same quantity has an independent incidence-rank reading.
Let `ρ(cover) := entities − components`.
`laplacian_kernel_cokernel` states `H0rank = entities − ρ` and `H1rank = cells − ρ`; the kernel is the component count and the cokernel is the excess-over-forest cost.
The forest-excess reading and the Laplacian kernel/cokernel reading therefore compute the identical number.

**Threshold behavior.
** Define `percolationThreshold(cover) := entities − components`, the spanning-forest overlap count.
Coordination is positive exactly when the overlap count passes that threshold: `coordinationCost(cover) > 0 ⟺ percolationThreshold(cover) + 1 ≤ cells`, and the zero case is exactly `cells = percolationThreshold(cover)`.
There is no fractional coordination state in this metric: a cover is at the forest boundary or strictly past it.

**Conflict count bounds coordination cost but does not determine it.
** Because every overlap counted by `cells` is itself a point in conflict (§5.13a) between the regions it joins, a cover's overlap count is bounded by the presheaf's overall conflict count: `cover.cells ≤ rigidity(presheaf)` for the presheaf the cover is built over.
Coordination requiring (`coordinationCost(cover) > 0`) therefore forces the conflict count strictly past the threshold: `coordinationCost(cover) > 0 ⟹ percolationThreshold(cover) < rigidity(presheaf)`.
This condition is necessary, not sufficient: two covers with the same conflict count can differ in whether the conflicts close a cycle or merely connect disjoint regions.
Placement, not only quantity, decides coordination cost.

#### 5.13c Reconciliation

**Depends on:** conflict (§5.13a), coordination (§5.13b), evidence presheaves (§5.9).

Reconciliation is the operation that produces one evidential reading from several independently computed ones, at every coordination cost.
Where the coordination cost is zero, reconciliation is exactly the pointwise knowledge-join of §5.9's `combine` — an operation already total, already proved order-independent, requiring no further step.
Where the coordination cost is positive, reconciliation additionally requires resolving the specific cycle-closing overlaps `coordinationCost` counted, and it is this remaining step, not the join itself, that a caller requests explicitly.

**Interface.
**

```text
merge            : EvidencePresheaf × EvidencePresheaf → EvidencePresheaf
requestConsensus : List⟨ConflictingReading⟩ → Judgment⟨ResolvedReading, ConsensusObstruction⟩
```

`merge` is `combine` (§5.9) named at this building block's level of description — it introduces no second join operation.
`ConflictingReading` is a pair of `Charge` values read at the same `Point` by two independent settlement processes over a cover whose coordination cost (§5.13b) is nonzero.

**Obstruction variants.
** `ConsensusObstruction` is one of: `NoQuorum` (too few participants responded to resolve the conflict), `StaleProposal` (a resolution was reached for a frontier that has since advanced).
`merge` has none — it is total, at every coordination cost, over every pair of `EvidencePresheaf` values (§5.9).

**Preconditions.
** `merge` accepts any two `EvidencePresheaf` values over the same site.
`requestConsensus` requires its argument list to be non-empty and every `ConflictingReading` in it to name the same `Point`.

**Postconditions.
** `merge` is a bounded join-semilattice operation, proved by three laws holding pointwise at every point of the two presheaves: commutative (`merge(p, q) = merge(q, p)`), idempotent (`merge(p, p) = p`), associative (`merge(merge(p, q), r) = merge(p, merge(q, r))`).
It is furthermore proved to compute the *least* upper bound, not merely *an* upper bound: `merge(p, q)` dominates both inputs (`p ≤ₖ merge(p, q)`, `q ≤ₖ merge(p, q)`, the knowledge order of §5.8), and any third presheaf `u` dominating both `p` and `q` also dominates `merge(p, q)` — `∀ p q u. p ≤ₖ u ∧ q ≤ₖ u ⟹ merge(p, q) ≤ₖ u`.
This least-upper-bound property, not a separate check, is why gluing has no obstruction to fail: there is no disagreement `merge` refuses, because the join of any two evidence readings is total and always a genuine least upper bound (in particular `contested` when the two disagree, per §5.13a).

**Reconciling several independently computed local readings glues to a unique whole (the Čech form).
** Where several presheaves are each a *local* reading over one patch of a cover, and the local readings *agree* on every overlap (a **1-cocycle**, the Čech agreeing-family condition: wherever two patches both hold at a point, their local readings coincide there), the point-wise read-off of the first covering patch's local value at each point (**glue**) is proved to be a genuine global reading whose restriction to every patch recovers exactly that patch's local reading (a **coboundary** witness) — existence — and that global reading is the *only* one with this property — uniqueness, reusing separation (§5.9's `agreesOn`: a presheaf is determined by its readings on a covering family).
Reconciliation over a cover is this existence-and- uniqueness pair, `H1Vanishes`: every agreeing family of local readings glues to a unique global one, unconditionally, for any cover and any agreeing family — the cover's coordination cost (§5.13b) governs whether a *given* family of independently computed local readings is guaranteed to agree on overlaps in the first place, not whether an agreeing family, once it exists, glues.

**The convergence bundle — the CALM equivalence.
** For a reconciliation program over a well-formed cover, the following are equivalent: (1) `coordinationCost(cover) = 0`; (2) the program is monotone in the knowledge order; (3) contributed readings may be reordered or repeated without changing `joinList`; (4) reconciliation is confluent; and (5) the admitted family reaches one closure-stable fixed point.
In particular:

```text
coordinationCost(cover) = 0
  ⟺ reconciliation is knowledge-monotone
  ⟺ (same contributed set ⇒ same joined reading)
  ⟺ reconciliation is confluent
  ⟺ the reachable fixed point is unique
```

An agreeing Čech family therefore glues uniquely, order-independent replicas converge, and no consensus operation is needed.
A non-monotone reconciliation exposes a nonzero obstruction and cannot be classified as coordination-free.

**Overlap gluing (the Mayer–Vietoris projection).
** Where two reconciliations of overlapping local data both settle toward the same closure-stable target `w` (each is a **cosettling** pre-image of `w`: closing either one reaches `w`), their overlap — the join of the two pre-images — is *itself* a cosettling pre-image of the same `w`: `∀ v v' w. close(v) = w ∧ close(v') = w ∧ close(w) = w ⟹` `close(merge(v, v')) = w`.
Every pre-image of a closure-stable target sits at or below that target in the knowledge order, and the target itself is the greatest such pre-image — so the pre-images of one target form a closed, bounded join-subsemilattice, the algebraic form of "local reconciliation data glue along their overlaps to the same whole," reused here rather than re-derived.

**`merge` is a state-based CRDT join, named exactly rather than by analogy.
** A replicated `EvidencePresheaf`, at one point, is a **multi-value register**: concurrent writes are retained as distinct witnesses rather than clock-resolved, and the register's `Charge` is their knowledge-join.
`merge`'s already-proved commutative/associative/idempotent join-semilattice laws (above) are exactly the antecedent the CRDT convergence theorem requires of a state-based replicated type (Shapiro, Preguiça, Baquero & Zawirski, INRIA RR-7506, 2011: a join-semilattice payload with monotone merge achieves strong eventual consistency), so replicas converge by the identical proof `merge` already has — no further assumption imported, no writer election or clock beyond §5.5's existing `origin`/`time`/`causes`, and disagreement is `contested` (§5.13a), never a discarded write.

`requestConsensus` is invoked if and only if `coordinationCost(cover) > 0` for the cover the conflicting readings were computed over.
At degree one, `merge` and `requestConsensus` are jointly exhaustive: every local-reading conflict completes by `merge` alone or by `merge` followed by consensus over the excess overlaps.
The resulting pairwise reconciliations are then final exactly when §5.13d's `arbitrationClass` is `zeroH2`; a nonzero class is a distinct degree-2 obstruction between reconciliations, not an unresolved degree-1 conflict.

**Degree-one worked trace.
** Two settlement processes each hold a cover of the same covering space: process X's cover has entities `{a, b}`, cells `{a-b}` (one overlap joining them), and one connected component; process Y's cover, evaluated over a disjoint region, has entities `{c, d}`, cells `{c-d}`, one component.
Computed independently: X's coordination cost is `(1 + 1) − 2 = 0`; Y's is `(1 + 1) − 2 = 0`.
Both covers are already forests, so X and Y `merge` and settle without invoking `requestConsensus`.
Now suppose a third process Z's evaluation adds an overlap `a-c` connecting the two regions, producing a combined cover with entities `{a, b, c, d}`, cells `{a-b, c-d, a-c}`, and now one connected component (the overlap merged the two): coordination cost is `(3 + 1) − 4 = 0` still — the added overlap closed the graph into a tree, not a cycle, so reconciliation remains a plain `merge`.
Only an overlap that closes a *cycle* (e.
g.
a second, independent `a-d` overlap added on top, giving cells `{a-b, c-d, a-c, a-d}`, still one component: coordination cost `(4 + 1) − 4 = 1`) raises the cost above zero and requires `requestConsensus` to resolve the one redundant overlap — the one point now in conflict (§5.13a) between the two independent readings — before either process's reading may be treated as final.

#### 5.13d Higher arbitration

**Depends on:** reconciliation (§5.13c), the degree-2 optimization fabric (§8.6).

Consensus resolves disagreement between local readings.
**Higher arbitration** resolves disagreement between those consensus results.
Three or more pairwise reconciliations over a triple overlap may each be locally valid while failing to form one globally compatible result; that failure is retained as a degree-2 class rather than flattened into another pairwise vote.
In industry terms, higher arbitration is a second-stage conflict-resolution gate for incompatible resolution outcomes, not another quorum pass over the same readings.

**Interface.
**

```text
arbitrationClass  : ReconciliationCover × List⟨ResolvedReading⟩ → H2Class
requestArbitration : H2Class × List⟨ResolvedReading⟩ → Judgment⟨ArbitratedReading, ArbitrationObstruction⟩
```

`ReconciliationCover` contains the participating patches, their pairwise overlaps, triple overlaps, common point, and causal frontier.
`H2Class` is the architecture's admitted artifact for a degree-2 obstruction: a reconciliation 2-cocycle modulo degree-1 coboundary, read against the carrier `H² = ker δ² / im δ¹`.
Infomaterial grounds the carrier, not the complete arbitration procedure: `delta2_delta1` states degree-1 coboundaries map to zero under `δ²`; `coboundary2_cocycle2` states every degree-2 coboundary is a degree-2 cocycle; and `symplectic_form_class_in_h2` states that every closed 2-form is a degree-2 cocycle.
`zeroH2` is the architecture's name for the trivial admitted class used by the arbitration contract.

**Obstruction variants.
** `ArbitrationObstruction` is `IncompleteTriple` (a required pairwise reconciliation is absent), `StaleReconciliation` (inputs do not share one frontier), `NoAuthorizedArbitrator` (no capability-held policy may select among the incompatible results), or `UnresolvedClass` (the chosen arbitration leaves the same nonzero class).

**Preconditions.
** `arbitrationClass` accepts pairwise resolved readings over one well-formed reconciliation cover.
Every input names the same point and frontier and retains the local readings from which it was derived.
`requestArbitration` requires a nonzero `H2Class` and the exact resolved readings that generated it.

**Postconditions.
** The intended arbitration contract is: `arbitrationClass(cover, readings) = zeroH2` if and only if the pairwise reconciliations agree on every triple overlap and therefore glue to one global reconciled reading.
A zero class returns that glued reading without invoking `requestArbitration`.
A nonzero class invokes `requestArbitration` exactly once for that class and frontier; no pairwise consensus result is final before the class is discharged.
This zero-class/gluing equivalence is a target architecture commitment; §11 records that Infomaterial presently grounds the degree-2 carrier but not this full arbitration theorem or runtime conformance.

An `ArbitratedReading` names the input `H2Class`, every pairwise resolution, the policy and capability decision authorizing the arbitration, and the resulting reading.
Successful arbitration yields a new reconciliation family whose class is `zeroH2`; otherwise it returns `UnresolvedClass` and preserves the nonzero class as evidence.
Thus every reconciliation follows one exhaustive graded path:

```text
H¹ = 0                         → merge
H¹ ≠ 0 and resulting H² = 0   → merge → requestConsensus
resulting H² ≠ 0              → merge → requestConsensus → requestArbitration
```

The higher path is still ordinary evidence processing.
Its class, request, authorization, and outcome enter the journal; planning prices the class in the `⟨h1, h2⟩` ledger (§8.6); and no arbitrator receives an effect or admission path outside §§5.5, 5.12, and 6.2.

### 5.14 The projector kernel

**Depends on:** the term calculus (§5.3), evidence values (§5.8), the knowledge base (§5.11).

Reading or writing a resource across the platform's boundary is itself typed: a type, at this boundary, is its recognize/read/write morphisms over the resource in question — knowing everything a value can be recognized as, read as, and written as is knowing the value's type.
This is a genuine Yoneda embedding, not an allusion to one: in any small category, an isomorphism of objects `X ≅ Y` is exactly the same data as an isomorphism of their presheaves of incoming arrows `y(X) ≅ y(Y)` — the two constructions are proved mutually inverse (`object_is_its_morphisms`), so an object IS its system of incoming arrows, never a separate thing the arrows merely describe; on a thin category (a poset, where at most one arrow exists between any two objects) this sharpens further to `y(a) ≅ y(b) ⟹ a = b` outright — the object is recovered exactly from its down-set of arrows, with no residual identity beyond what the arrows already witness (`kp_object_is_its_arrows`, proved for the knowledge order over `Charge`, §8.1, the identical four-value carrier this document's evidence values are built from).
Applied at this boundary: a resource's recognize/read/write morphisms are its incoming-arrow bundle, and the type they determine is a derived projection of that bundle, exactly as the general theorem states, not a separate notion this architecture additionally asserts.
Restrictions between resources form a lattice: `∀ r₁ r₂. r₁ ⊑ r₂ ⟹` a read at `r₁` is a valid specialization of a read at `r₂` — the reindexing this restriction performs is functorial (identity restriction changes nothing; restricting twice equals restricting once by the composite restriction), not merely asserted to compose sensibly.
Two coordinates classify every boundary crossing: a **corner** (the Belnap bilattice of addressability × assertivity — is this resource nameable, and is this crossing an assertion or a query) and a **rung** (a decidability ladder — identity, Scott, non-monotone, or Turing-complete) governing whether a read can complete at all.

**Interface.
**

```text
recognize : Resource → Boolean
read      : Resource → Judgment⟨List⟨Value⟩, ReadObstruction⟩
write     : List⟨Value⟩ → Judgment⟨Address, WriteObstruction⟩
cornerOf  : Resource → Corner
rungOf    : Resource → Rung
```

`Corner ∈ {addressable, assertable, both, neither}` (the Belnap bilattice of two independent bits, structurally the same construction as `Charge`, §8.1, applied to addressability/assertivity rather than for/against).
`Rung ∈ {identity, scott, non-monotone, turing}` is ordered by decidability in that listed order, but this order is not monotone in `Corner`'s own knowledge order: `Computing/FormatsFour.lean` proves, for the concrete case of serialization-format classification (the same corner/decidability-rung shape applied to `bytes`/`json`/`rdf`/`html`/…), that ascending in the corner order can raise the rung's completion cost or lower it (`Format.cost_nonmonotone_in_kle`) — a more addressable-and-assertable resource is not guaranteed a more decidable rung.
`cornerOf`/`rungOf` are therefore two genuinely independent readings of a resource, not one derived from the other by any fixed formula.

**Obstruction variants.
** `ReadObstruction` is one of: `Unrecognized` (`recognize(resource) = false`), `UndecidableRung` (the resource's rung is `non-monotone` or `turing`).
`WriteObstruction` is `RestrictionViolation` (the write targets a resource more general than the projector's declared restriction).

**Preconditions.
** `read` requires `recognize(resource) = true`.
`cornerOf`/`rungOf` accept any `Resource` for which `recognize` is defined, regardless of its value.

**Postconditions.
** `∀ resource. read(resource)` completes with a value (never `UndecidableRung`) `⟺ rungOf(resource) ∈ {identity, scott}` — only the two decidable rungs may complete a read; a `non-monotone` or `turing` rung means the crossing is, in general, undecidable, and is handled as a partial observation rather than a completed read: `∀ resource.` `rungOf(resource) ∈ {non-monotone, turing} ⟹` `read(resource) = obstructed(UndecidableRung)` unconditionally — this architecture defines no operation that forces such a read to completion.
Restriction soundness: `∀ r₁ r₂. r₁ ⊑ r₂ ∧ recognize(r₂, v) ⟹ recognize(r₁, v)` — a value recognized at a more general resource is recognized at every more restricted specialization of it.

### 5.15 The touchpoint surface

**Depends on:** the projector kernel (§5.14), the knowledge base (§5.11).

Multiple running instances of this architecture are observed and managed together (§5.22) through the identical projector kernel (§5.14) any other boundary crossing uses — there is no second, privileged observation channel for cross-instance state.
This system names the one operation that specializes the projector kernel to that purpose — ACRA's sensor *touchpoint*, the one reachable interface a managed element (§5.22) exposes to the manager observing it: reading settled state (§5.11) as a `Resource` (§5.14).

**Interface.
**

```text
settledResourceOf : ManagedElement × Question → Resource
```

`ManagedElement` is defined in §5.22; forward reference is unavoidable here because observation of a managed element is defined at the boundary layer while the managed element itself is defined at the outermost layer, and this system's whole function is to be the one point where those two layers meet.

**Obstruction variants.
** None — `settledResourceOf` is a total construction of a `Resource` value; whether that `Resource` can actually be read is decided by `read` (§5.14) applied to it, not by this operation.

**Preconditions.
** `settledResourceOf` accepts any `ManagedElement` and any `Question` `query` (§5.11) accepts for that managed element's knowledge base.

**Postconditions.
** `∀ element question. cornerOf(settledResourceOf(element, question)) = assertable` (a settled reading is always assertable — it is evidence, per §8.1, never merely nameable-but-opaque) and `rungOf(settledResourceOf(element, question)) ∈ {identity, scott}` — settled state is always at a decidable rung, because `query` (§5.11) is total and pure (§5.11's postcondition); observing another instance's settled state never requires the partial-observation path of §5.14.

### 5.16 Translators


**Depends on:** the journal (§5.5), for the events they produce.

A translator turns an outside source into candidate rows for the journal's admission funnel (§5.5).
A translator has exactly one job: produce well-formed candidates.

**Interface.
**

```text
translate : ExternalInput → Judgment⟨List⟨CandidateEvent⟩, TranslationObstruction⟩
```

**Obstruction variants.
** `TranslationObstruction` is `Unrepresentable` (the external input names no `CandidateEvent` this architecture's term calculus, §5.3, can express).

**Preconditions.
** `translate` accepts any value the outside source produces, in that source's own native representation — this architecture places no constraint on `ExternalInput`'s shape.

**Postconditions.
** `∀ input. translate(input) = ok(candidates) ⟹` every element of `candidates` is well-formed input to `admit` (§5.5)'s precondition — `translate` never produces a candidate `admit` is not defined to accept.
No-authority: `∀ translator t.` the only durable effect `t` can produce is by passing its output to `admit` (§5.5); a translator has no store, no capability, and no path to durable state other than that one funnel every other source also uses.

**A natural-language translator reads grammaticality as proof search in a fragment of the same typed calculus §5.3 already grounds, not as a second grammar formalism.
** Where `ExternalInput` is unstructured text, `translate` assigns each token a lexical type — a Lambek-calculus category built from the primitive types `NP`, `N`, and `S` and the two residuated slashes `\`/`/` — and admits a sentence reading only where the sequence of types composes to `S` by residuation.
This is proof search in the non-commutative, non-weakening, non-contracting (substructural) fragment of the calculus §5.3 already defines `check`/`infer` over, exposed here as its own named operation because a natural-language reading, unlike an ordinarily-typed artifact, is not received already annotated with the type search must confirm:

```text
parseNaturalLanguage : List⟨Token⟩ → Judgment⟨List⟨LambekReading⟩, UngrammaticalInput⟩
```

`LambekReading := ⟨types: List⟨LambekCategory⟩, derivation: LambekProof, structure: ParsedSentence⟩`, one per distinct way the token sequence composes to `S`.
`UngrammaticalInput` names the token position past which no lexical-type assignment composes to `S` under any reading — the same "no proof found within the stated fragment" shape §5.18's `ExhaustedBound` states for the general calculus, specialized to this one fragment rather than reusing `DerivationObstruction` itself, since a Lambek reading is not bounded by `SearchBound`'s four dimensions.
The FCA–Lambek correspondence is the architectural reason this reading and §5.20's formal-concept reading of the knowledge base are one closure/proof-search structure read two ways, not two independently chosen mechanisms — natural-language grammaticality and knowledge-base concept formation are both language-substrate operations with named obstructions and postconditions.

`translate`, for natural-language `ExternalInput`, is `parseNaturalLanguage` composed with candidate construction: it calls `parseNaturalLanguage`, and for `ok(readings)` produces one `CandidateEvent` per element of `readings` rather than collapsing to a single guessed reading.
Each candidate's claim carries the reading's own `Charge`: a reading whose derivation depends on an unresolved anaphor or an unsatisfied presupposition trigger is `unknown` at that dependency; where more than one reading survives with no way to prefer one, every surviving candidate's claim is `contested` at the point their readings disagree.
`translate` never itself resolves the ambiguity — admission (§5.5) settles which, if any, of the several candidates becomes durable, exactly as it would for any other concurrently asserted claims about the same address.
This keeps natural-language translation inside `translate`'s existing total interface: `parseNaturalLanguage`'s `UngrammaticalInput` becomes `TranslationObstruction`'s `Unrepresentable` case, while a grammatical-but-ambiguous or referentially-unresolved reading is not an obstruction at all — it is ordinary evidence on an admitted candidate, per the postconditions above.

### 5.17 Faces

**Depends on:** the request pipeline (§6.1), which depends on causal order (§5.6), settlement (§5.10), capability (§5.12).

A face presents one governed request pipeline to one external protocol.

**Interface.
**

```text
present : ProtocolRequest → Judgment⟨PipelineRequest, PresentationObstruction⟩
render  : PipelineResponse → ProtocolResponse
```

**Obstruction variants.
** `PresentationObstruction` is `Unrepresentable` (the protocol request names no `PipelineRequest` (§6.1) this architecture's request pipeline can express — the face-level analogue of §5.16's `TranslationObstruction`, at the egress side rather than ingress).

**Preconditions.
** `present` accepts any value the external protocol can send, in that protocol's own wire format.
`render` accepts any `PipelineResponse` the request pipeline (§6.1) can produce.

**Postconditions.
** Structure preservation: `∀ req. present(req) = ok(p) ⟹` the request pipeline's decision on `p` (identity, authorization, effect, §6.1) is identical to the decision it would reach for the semantically equivalent request presented through any other face — no face independently decides identity, authorization, or effect: `∀ face f₁ f₂.` `f₁` and `f₂` both presenting equivalent requests reach the same `APPRAISED` and `DECISION_COMMITTED` events (§6.1).
This is the face-level reading of a proved structural fact one level below faces themselves: reindexing a valuation along any map between predication cells is proved a **bilattice-residuated homomorphism** — it preserves, pointwise, both bounded lattices' meets and joins (`∧ₖ, ∨ₖ, ∧ₜ, ∨ₜ`), negation, fusion, and the residual (`reindex_is_bilattice_homomorphism`) — and reindexing is itself functorial, the identity map's reindexing changing nothing and composing two reindexings equaling the reindexing of their composite (`reindex_id`/`reindex_comp`).
A face's `present`/`render` pair is exactly this reindexing functor along a map from one protocol's request shape to the pipeline's native shape: because every reindexing preserves the decision-relevant bilattice operations and composes functorially, two faces presenting semantically equivalent requests reindex to the same pipeline-native value and therefore reach the same decision — not as an additionally-asserted invariant, but as this homomorphism property applied to two different reindexing maps with the same codomain.
Addition without modification: a new face is added by implementing `present`/ `render` for its protocol over the existing pipeline; adding one never requires a change to §6.1, §5.10, or §5.12.

### 5.18 Deduction

**Depends on:** the knowledge base (§5.11), the term calculus (§5.3).

Settlement (§5.10) answers what evidential value a question has under admitted claims.
Deduction answers which not-yet-asserted claim follows from that settled context.
A proof is a term whose type is the proposition it proves; `check` (§5.3) remains the sole proof verifier.
Deduction may construct candidates, but it cannot enlarge the trusted computing base.

Search is deterministic **bounded forward saturation**.
At one named frontier, `derive` freezes the settled valuation and rule-store cut, enumerates rules and finite existential witness fibers in canonical address order, applies each enabled rule, and knowledge-joins every resulting term into the next round.
It stops when the goal type appears, the reachable set reaches a fixed point, or one dimension of the caller's resource envelope is exhausted.
Alongside ordinary proof-search resource counters, the run emits §8.8's operational accounting ledger for the evidence flow it performed, so bounded success and bounded exhaustion both expose receipts and residue.

**Interface.
**

```text
derive : Context × Goal × SearchBound → Judgment⟨Derivation, DerivationObstruction⟩
```

```text
SearchBound := ⟨rounds: Nat, maxTerms: Nat, maxRuleFirings: Nat, maxProofSize: Nat⟩
SearchCost  := ⟨rounds: Nat, termsExamined: Nat, ruleFirings: Nat, maximumProofSize: Nat⟩
Derivation  := ⟨proof: Proof, trace: DerivationTrace, cost: SearchCost, accounting: OperationalAccountingLedger, frontier: Frontier⟩
```

`DerivationTrace` is a content-addressed sequence of rule, antecedent, witness, and produced-term addresses.
`reachableWithin(ctx, goal, bound, proof)` means that the frozen rule system can construct `proof` within all four bound dimensions and `check(proof, ctx, goal) = ok(unit)`.
Search bounds resource use; they do not weaken the typing judgment.

**Obstruction variants.
** `DerivationObstruction` is one of: `IllTypedGoal`; `IllTypedContext`; or `ExhaustedBound(certificate)`.
An `ExhaustionCertificate` names the context/rule/frontier cut, every saturated-round set by content address, the actual `SearchCost`, the operational accounting ledger at the bounded horizon, its remaining residue, and the first exhausted dimension (`rounds`, `terms`, `ruleFirings`, or `proofSize`).
It certifies absence of a proof inside the stated finite search space, never global underivability; the residue states unfinished evidence-flow work, not a stronger impossibility claim.

**Preconditions.
** `Context` is the settled valuation at the named frontier.
The rule-store cut and every finite witness fiber are admitted at or before that frontier.
Each `SearchBound` component is finite.
`Goal` checks as a proposition under the calculus.

**Postconditions.
** Soundness:

```text
derive(ctx, goal, bound) = ok(d)
  ⟹ check(d.proof, ctx, goal) = ok(unit)
```

Bound-relative completeness and honest exhaustion:

```text
(∃ proof. reachableWithin(ctx, goal, bound, proof))
  ⟺ ∃ d. derive(ctx, goal, bound) = ok(d)

derive(ctx, goal, bound) = obstructed(ExhaustedBound(c))
  ⟺ ¬ ∃ proof. reachableWithin(ctx, goal, bound, proof)
```

Determinism: if several proofs are reachable within the bound, `derive` returns the proof with the least content address under canonical byte ordering.
Repeating the same context, rule cut, frontier, goal, and bound therefore returns the same derivation address and trace.

Resource honesty: `d.cost ≤ bound` componentwise for success, and an exhaustion certificate's cost reaches exactly its named exhausted dimension without exceeding the others.
Accounting honesty: `SearchCost` reports proof-search resource consumption, while `OperationalAccountingLedger` reports the evidence-flow current over the finite support selected by the plan (§5.20, §8.8).
Success records the receipts that produced the proof-bearing valuation; exhaustion records receipts plus nonzero residue at the bounded horizon, so a later larger bound can continue from explicit unfinished work rather than from an opaque failure.
Monotone reachability: `bound₁ ≤ bound₂` componentwise implies every proof reachable within `bound₁` remains reachable within `bound₂`.
A larger bound may turn certified exhaustion into success, but never invalidates the earlier certificate's claim about its own finite search space.
### 5.19 Proof execution

**Depends on:** deduction (§5.18), the journal (§5.5).

A derivation is executable evidence.
`execute` admits its checked proof and conclusion through one journal operation while retaining the derivation trace, search cost, operational accounting ledger, context, rule cut, and frontier as causal provenance.
It never accepts a detached proof term whose derivation artifact is absent.

**Interface.
**

```text
execute : Derivation → Judgment⟨AdmittedEvent, AdmissionObstruction⟩
```

The admitted event's claim is `derivation.proof`; its address is `conclusionAddress(derivation.proof)`; its causes include the derivation address, the derivation's operational accounting ledger address, and the free-variable claim addresses used by the proof.
The `Derivation` itself remains an ordinary content-addressed artifact rather than being copied into a second provenance store; its ledger is admitted as the §8.8 accounting receipt for the evidence-flow work the proof execution makes durable.

**Obstruction variants.
** Identical to `AdmissionObstruction` (§5.5).
`execute` adds no proof-checking obstruction because a valid `Derivation` already carries a checked proof.
`UnknownCause`, `CausalCycle`, or `DuplicateCandidate` remain possible journal outcomes.

**Preconditions.
** The derivation is admitted, its frontier and rule/context cut remain available, its trace hashes verify, its recorded cost stays within its `SearchBound`, its operational accounting ledger reconciles with the derivation's recorded evidence-flow receipts and residue, and `check(derivation.proof, context, goal) = ok(unit)`.

**Postconditions.
**

```text
execute(d) = ok(event)
  ⟹ event.claim = d.proof
  ∧ event.address = conclusionAddress(d.proof)
  ∧ address(d) ∈ event.causes
  ∧ address(d.accounting) ∈ event.causes
  ∧ infer(d.proof, ∅) = ok(type(event.address))
```

Execution is exactly a single-element call to §5.5 admission.
The proof and conclusion become durable atomically with their derivation cause and operational accounting ledger; determinism, crash atomicity, causal closure, and duplicate handling are inherited unchanged.
Replaying the same derivation therefore resolves to the same candidate and never admits a conclusion with different search provenance or different evidence-flow accounting.
### 5.20 Query planning

**Depends on:** deduction (§5.18), coordination (§5.13b), the knowledge base (§5.11), evidence flow and operational accounting (§8.8).

A question posed to the knowledge base (`query`, §5.11) is answerable directly from already-settled evidence, requires deduction (§5.18) to entail an answer not yet asserted, or requires coordinating with another concurrently settling process (§5.13b) before either local result is safe to treat as final.
Query planning is the optimizer for that choice: it produces an execution plan before spending derivation or consensus work, and it prices the selected branch with §8.8's evidence-flow cost model.
In industry terms, `plan` is a total query planner with a cost forecast, not a caller convention or an ad hoc strategy hook.

**Interface.
**

```text
plan : Question × Frontier → Plan
```

`Plan` (§5.1) is one of: `AnswerDirectly` (query, §5.11, already resolves the question to a value other than `unknown`, with zero planned residue), `Derive(goal, bound, forecast)` (§5.18's `derive` should be invoked with the stated goal and bound, and `forecast` names the finite support, horizon, expected receipts, and remaining residue in §8.8's operational accounting ledger), or `Coordinate(cover, forecast)` (§5.13c/d's graded reconciliation path must resolve the named cover, including higher arbitration for any nonzero resulting H² class, before either direct answer or derivation is safe to treat as final; `forecast` prices that coordination as evidence-flow work rather than as an informal priority).

**Obstruction variants.
** None — `plan` is total: every question, at every frontier, resolves to exactly one of the three `Plan` variants; a question `plan` cannot classify is not a defined input.

**Preconditions.
** `plan` accepts any `Question` and `Frontier` `query` (§5.11) accepts.

**Postconditions.
** Direct-answer soundness: `∀ q f. plan(q, f) = AnswerDirectly ⟹ query(q, f) ≠ unknown` — planning never claims a direct answer exists when settlement has nothing to say.
Coordination precedence: `∀ q f cover forecast.` `plan(q, f) = Coordinate(cover, forecast) ⟹ coordinationCost(cover) > 0` (§5.13b) — planning enters graded reconciliation only where the measured H¹ cost, not a guess, requires it; §5.13c resolves that cost and §5.13d checks whether the reconciliation results introduce a nonzero H² class before returning a final reading.
Economy (the Planning economy quality goal, §1.2): `∀ q f. query(q, f) ≠ unknown ⟹ plan(q, f) = AnswerDirectly` — whenever settlement already has a non-`unknown` answer, planning never selects `Derive`, regardless of whether a derivation might also succeed; derivation is invoked only where settlement alone is insufficient.
Accounting honesty: a `Derive` or `Coordinate` plan carries a finite accounting forecast whose cost-to-complete is nonincreasing under the planned evidence flow, whose supported firings strictly decrease that cost, and whose horizon balances initial cost as expected receipts plus residue (§8.8).
A plan may choose a bounded search or coordination horizon with nonzero residue, but it must name that residue instead of presenting the plan as fully settled work.

**Direct-answer query model.
** At or before one frontier, admitted events form one extensional relation — the tuples of origin, address, claim, time, and causes §5.5 already defines.
A `Question` classified as `AnswerDirectly` is answered by a range-restricted, fixed-point relational query over that relation:

```text
evaluateQuery : DatalogProgram × Frontier → Judgment⟨Relation, QueryObstruction⟩
```

`DatalogProgram` is a finite set of Horn rules, each rule's head variables required to appear in its body.
That range restriction is the safety condition that keeps `evaluateQuery` on the finite journal relation at the frontier rather than requiring enumeration of an open domain.
Evaluation is semi-naive bottom-up fixed-point evaluation: each round matches only facts newly derived in the previous round against rule bodies, adds resulting head facts, and stops when a round derives nothing new.
`QueryObstruction` is `UnsafeRule` (some rule violates range restriction) or `IllTypedAtom` (an atom's terms do not check against the address they name, per `typeCheck`, §5.4).
This is not a second proof mechanism beside §5.18's `derive`: both are monotone forward-saturation processes, but `evaluateQuery` computes the least fixed point of a finite relational program over admitted journal facts, while `derive` searches the `Ty`/`Tm` proof calculus toward a goal type.
`plan` selects `AnswerDirectly` exactly where the fixed-point relation at the question's frontier already contains the answer, and `Derive` exactly where it does not.

**Concept-closure query model.
** Where the question is about the settled evidence's own structure — which admitted objects and predicates form closed groupings, not which one fact follows from another — the same frontier relation is read as a formal context:

```text
conceptsOf : FormalContext → List⟨Concept⟩
```

`FormalContext := ⟨objects, attributes, incidence⟩`, read off the journal at a frontier: admitted entities are `objects`, settled predicates are `attributes`, and `incidence` holds where a settled claim relates the two.
A `Concept` is a closed `(extent, intent)` pair — a fixed point of the Galois connection `A ↦ A''`.
Infomaterial's FCA declarations ground the model kind: `subA_closeA` gives extensivity for object closure, `closeA_mono` gives monotonicity, `closeA_idem` gives idempotence, and `conceptCompleteLattice` gives the complete concept-lattice structure.
Architecturally, concept formation is therefore another closure-shaped read model over the same settled journal relation, not a competing storage system, proof engine, or application-specific query path.

### 5.21 Self-revision

**Depends on:** the knowledge base's rule store (§5.11), query planning (§5.20), proof execution (§5.19).

A claim about the knowledge base's own governing rules is admitted, settled, and — where planning (§5.20) selects derivation and a derivation licenses it — executed by exactly the mechanism of §5.11/§5.18/§5.19/§5.20 applied to the rule-store partition; no separate self-revision mechanism exists.

**Interface.
**

```text
proposeRuleRevision : RuleClaim → Judgment⟨Accepted, RejectionObstruction⟩
```

`proposeRuleRevision` is `reviseRule` (§5.11) composed with `plan` (§5.20): the proposal is asserted (`reviseRule`), then `plan` decides whether the rule store's own consistency, under the revision, is directly readable or requires derivation or coordination before the revision may be treated as settled.

**Obstruction variants.
** Identical to `reviseRule`'s `RejectionObstruction` (§5.11) — self-revision introduces no obstruction of its own.

**Preconditions.
** Identical to `reviseRule`'s precondition (§5.11): `RuleClaim` must be a `Claim` whose address falls within the rule-store partition.

**Postconditions.
** §8.5 proves this composition terminates at a determinate evidential value rather than looping or producing an inconsistent halt: a genuinely self-referential rule claim settles under `liarClosure.op(a) := a ∨ₖ ¬a` (§8.5, `Language/Settling.lean`), which is proved **idempotent by construction** (`∀ a. liarClosure.op(liarClosure.op(a)) = liarClosure.op(a)`, checked directly over `Charge`'s four cases) — so a genuinely self-referential claim settles in exactly **one** application of the closure, not merely within the general three-step bound §8.3 proves for an arbitrary inflationary endomap (`Closure.Ordinal.Finite.settles_by_three`); the three-step bound is a safety margin this specific closure clears in its first step, not the operative fact driving this section's termination claim.
The one-step settlement lands at exactly `kBot` (nothing asserted, `silent_liar_settles_kBot`) or `kTop` — contested, `asserted_liar_settles_kTop` — and no third value (`liar_step_fixed_iff`): `∀ ruleClaim v. settle(presheafOf(ruleClaim), f) = ok(v) ⟹` `v ∈ {unknown, contested}` for a genuinely self-referential `ruleClaim` — never an undefined state, because `liarClosure`'s fixed-point set is proved to contain no third element to land on.

**The result holds at every depth of self-quotation, not only once.
** A reflexive tower of approximations to a fully self-quoting carrier — rung zero the evidence type itself, each further rung the knowledge-monotone `Charge`-valued maps of the rung below, consecutive rungs related by an embedding-projection pair — carries two named threads through every rung: a **silent** thread and an **asserted** thread.
At every rung `n` of this tower, without exception, the silent thread's self-application reads `kBot` and the asserted thread's self-application reads `kTop` and is its own negation's fixed point: `∀ n. selfApp(silentThread, n) = kBot`, `∀ n. selfApp(assertedThread, n) = kTop`, `∀ n. selfApp(assertedThread, n) = negate(selfApp(assertedThread, n))` (`liar_threads_diagonal`).
This is the one-round result above, proved stable under arbitrarily repeated, arbitrarily nested self-quotation — revising a rule about revising rules about revising rules, to any depth, settles at the identical two outcomes every single round, never accumulating a third or drifting to a different value as nesting deepens.

**Worked trace.
** A `RuleClaim` proposes that the rule store's admission rule for rule-store claims should itself require a prior rule-store claim licensing it — a rule about rule-admission that names its own admission as a precondition.
`proposeRuleRevision` calls `reviseRule` (§5.11), which is `assert` (§5.11) restricted to the rule-store partition: the claim is admitted through the ordinary funnel (§5.5), no different from any other candidate.
`plan` (§5.20), evaluated against the rule store's current settled state, finds the question "does this revision's own precondition already hold" unanswerable directly — no prior claim licenses it, and none denies it — so it selects `Derive`.
Derivation search (§5.18) runs forward saturation from the settled rule store; because the claim's precondition is exactly its own conclusion, no chain of firings reaches a term at the goal type without presupposing the goal itself, so the claim is not one `derive` can produce a proof for or against.
Settlement therefore proceeds on the claim's own positing (§5.10) using `liarClosure.op(a) := a ∨ₖ ¬a` (§8.5) rather than the ordinary join-to-target closure, because the claim entangles with its own settlement rule.
Since the claim was asserted at all — the seed is some `a ≠ kBot` — `asserted_liar_settles_kTop` fixes the outcome at `kTop`: the revision settles `contested` in exactly one closure step (`liarClosure`'s own idempotence — well within the general three-step bound of `Closure.Ordinal.Finite.settles_by_three`, §8.3, which this specific closure does not need), retained and queryable rather than looping or halting inconsistently.
Had no origin ever asserted the claim (`a = kBot`), `silent_liar_settles_kBot` gives the other reachable outcome, `kBot` — a self-referential rule that no one proposes stays unknown, never contested by default.

### 5.22 The orchestrating autonomic manager

**Depends on:** settlement (§5.10), coordination (§5.13b), self-revision (§5.21), the touchpoint surface (§5.15).

A **managed element** is one running instance of §§5.2–5.21 with its own journal.
The **orchestrating autonomic manager** operates one level above a finite set of managed elements.
It reads their settled state through touchpoints, diagnoses cross-element conditions, plans an adjustment, and executes that plan through the same governed interfaces available to every other caller.
It may route requests, redistribute load, request consensus, or propose a rule revision; it has no privileged mutation path.

The manager may run several asynchronous policy loops over the same managed elements.
Each loop has a stable `LoopId`, policy, cadence, and causal frontier.
Loops share the knowledge base but retain separate observations, diagnoses, plans, and decisions, so a fast operational loop and a slower policy loop can compose without one silently overwriting the other's reasoning.

**Interface.
**

```text
observe        : LoopId × Set⟨ManagedElement⟩ × Question → Judgment⟨Observation, List⟨ReadObstruction⟩⟩
analyze        : Observation → Judgment⟨Diagnosis, DiagnosisObstruction⟩
planAdjustment : Diagnosis → Judgment⟨AdjustmentPlan, PlanningObstruction⟩
adjust         : AdjustmentPlan → List⟨RoutingDecision ∪ ConsensusRequest ∪ ArbitrationRequest ∪ RuleClaim⟩
```

`Observation` contains the loop identity, question, frontier, per-element `Charge` readings, and every read obstruction.
`observe` applies `read` (§5.14) to `settledResourceOf(element, question)` (§5.15) for every managed element; an obstructed read remains in the observation rather than disappearing.

`analyze` is the independently auditable diagnostic stage.
It derives a `Diagnosis` from one admitted observation, classifying agreement, disagreement, missing evidence, and coordination cost without selecting an action.
A diagnosis names the observation and the rules used to derive it.
`planAdjustment` consumes one admitted diagnosis and chooses a typed `AdjustmentPlan`; it cannot revise the diagnosis or suppress its obstructions.
`adjust` executes only that plan and emits governed decisions whose causal evidence includes both the plan and its diagnosis.

**Network-sheaf reading.
** Read managed elements as graph vertices and declared observation channels as edges.
Per-element readings are local sections: their knowledge meet is global consensus (`H⁰`), their knowledge join retains disagreement as `contested`, `H¹` measures obstruction between readings, and `H²` measures obstruction between their reconciliations.
`analyze` computes the bigraded `⟨h1, h2⟩` reading; `planAdjustment` selects local merge, `requestConsensus`, or `requestArbitration` according to §5.13's exhaustive graded path.
The graph specialization introduces no second evidence algebra.

**Identity and coordinated misreporting.
** An identity permutation that leaves every reading unchanged expresses anonymity; one that changes readings expresses disagreement.
Several identities controlled by one source do not count as independent contributors.
The manager therefore evaluates source independence before treating multiplicity as corroboration, using the same evidence-retention rule as §5.13a rather than silently collapsing suspected identities.

**Obstruction variants.
** `observe` retains `ReadObstruction` values from §5.14. `DiagnosisObstruction` is `InsufficientEvidence`, `UnresolvedIdentity`, or `IllTypedPolicy`.
`PlanningObstruction` is `NoAdmissibleAdjustment` or `CoordinationRequired`; the latter carries the nonzero obstruction and the readings that produced it.
`adjust` is total on a well-typed `AdjustmentPlan`; an empty plan produces an empty decision list.

**Preconditions.
** `observe` accepts a declared loop, any finite set of managed elements, and any question accepted by `settledResourceOf`.
`analyze` accepts an admitted observation.
`planAdjustment` accepts an admitted diagnosis.
`adjust` accepts an admitted, well-typed plan whose diagnosis remains present in the knowledge base.

**Postconditions.
** Stage separation and provenance are invariant:

```text
analyze(o) = ok(d)              ⟹ d.observation = address(o)
planAdjustment(d) = ok(p)       ⟹ p.diagnosis = address(d)
decision ∈ adjust(p)            ⟹ address(p) ∈ decision.causes
```

Every successful stage admits its artifact through the ordinary journal funnel before the next stage begins.
Diagnosis can therefore be inspected or replayed independently of planning, and plans can be compared without re-running observation.
Every emitted `RoutingDecision`, `ConsensusRequest`, `ArbitrationRequest`, or `RuleClaim` is discharged through the request pipeline (§6.1), reconciliation or higher arbitration (§5.13c/d), or `proposeRuleRevision` (§5.21); the manager is the outermost consumer of those systems, never a second privileged actor.

### 5.23 Tools

**Depends on:** the journal (§5.5), capability and authorization (§5.12).

A tool is a routine invoked from outside the platform's ordinary call graph — reached not by another routine's ordinary call, and not by a request presented at a face (§5.17), but by the governed request pipeline's own `EXECUTING` stage (§6.1) when a committed intent's effect is bounded and crosses the platform boundary rather than resolving entirely by settlement (§5.10), derivation (§5.18), or proof execution (§5.19) alone.
Where a face is a structure-preserving presentation of the pipeline inward, a tool is the pipeline's own bounded reach outward: the two are distinguished by direction, not by which is more general — a tool holds no protocol adapter and presents nothing, and a face never itself crosses the platform boundary.
Every tool invocation is authorized before it runs, by the same evidentiary mechanism (§5.12) that authorizes any other pipeline effect: a tool has no capability of its own to appeal to, and none beyond what a `held` evidential value at the invoking request's frontier already grants.

**Interface.
**

```text
invoke : IntentCommitted × ToolDescriptor → Judgment⟨ToolOutcome, ToolObstruction⟩
```

`IntentCommitted` names the `INTENT_COMMITTED` event (§6.1, §5.5) whose effect this invocation discharges.
`ToolDescriptor` names which bounded external capability is being reached — this architecture places no constraint on a descriptor's shape beyond what `invoke`'s postconditions require of it.
`ToolOutcome` is the value `invoke` produces on success; it becomes the claim of the `OUTCOME_COMMITTED` event (§6.1) the pipeline admits next.

**Obstruction variants.
** `ToolObstruction` is one of: `Unauthorized` (appraisal, §5.12, of the invoking request's frontier is not `held`), `Unbounded` (the descriptor names an effect this architecture cannot state a bound for — no tool invocation this architecture defines may run without a stated bound), `ExternalFailure` (the external capability itself did not produce an outcome — a detected failure external to the platform, not an obstruction this architecture's own machinery raised).

**Preconditions.
** `invoke` requires its `IntentCommitted` argument to name an event already admitted (§5.5) as `INTENT_COMMITTED` on the governed request pipeline (§6.1), and requires the invoking request's frontier to have already reached `APPRAISED` (§5.12) at a `held` value — `invoke` never runs ahead of authorization to discover afterward whether it was allowed.

**Postconditions.
** No second admission path: `∀ ic td outcome.` `invoke(ic, td) = ok(outcome) ⟹` the event admitting `outcome` as `OUTCOME_COMMITTED` (§6.1) is admitted through the identical funnel (§5.5) every other event uses — a tool's outcome is durable claim data like any other, never a side channel exempt from typing or causal order.
Authorization precedence: `∀ ic td.` `invoke(ic, td)` obstructs with `Unauthorized` whenever the invoking request's appraisal (§5.12) is not `held`, regardless of what the tool's descriptor names — `invoke` never substitutes its own authority check for capability's.
Boundedness: `∀ ic td outcome. invoke(ic, td) = ok(outcome) ⟹` `outcome`'s production completes within a bound this architecture can state in advance of running it — an invocation this architecture cannot bound is not one `invoke` accepts, per its `Unbounded` obstruction, never one it runs and hopes completes.

### 5.24 Work scopes

**Depends on:** identity (§5.2), the term calculus (§5.3), the knowledge base (§5.11).

A claim is always about something; §5.5's `address` names that something as an arbitrary term.
Work claims narrow this: an `address` that names work names it at one of six graduated levels — endeavor, campaign, project, plan, task, work-item — each level a coarser or finer grain of the same underlying commitment, never a different kind of thing.
A `Scope` is this narrowing made a first-class, parseable value: `level:id`, with `level` one of the six named levels and `id` a stable string.
`endeavor` is the coarsest scope a caller may declare and `work-item` the finest; nothing below `work-item` is representable, and nothing coarser than `endeavor` is — a sustained commitment without a further enclosing scope is the top of the address space, not an omission from it.
A scope's parent, if any, is carried as ordinary claim evidence (§5.10's `WorkEvidenceCarrier`-shaped material), never encoded in the scope string itself: `workScope` produces `level:id` with no parent segment, so two scopes are structurally comparable by level and id alone, and an enclosing relationship is a claim like any other, subject to the same admission and settlement as the work it encloses.

**Enclosure cannot be a causal order, and this is a proved fact, not a convenience.
** A scope's enclosure is naturally read as an interval — a work item opens at some event and closes at another — and one scope enclosing another is the outer interval's opening at or before the inner's and the outer's closing at or after the inner's.
Read this way, every scope trivially encloses itself, and a relation with a self-edge at every point is proved incapable of carrying a strict causal order (§5.6): `∀ p. nesting(p, p)`, and any relation satisfying this at even one point cannot also satisfy irreflexivity, the defining property a strict order requires (`nesting_no_strictOrderClosure_of_point`).
This is the precise reason enclosure is kept out of causal order (§5.6) entirely and carried as separate claim evidence instead — not a design convenience, a proved structural incompatibility between containment and the one order this document already has.

**Sibling scopes at one enclosure sequence by a genuine causal order, distinct from enclosure itself.
** Where two scopes share an enclosing parent, "the first must close before the second opens" is a different relation from enclosure — one interval's closing event causally precedes the other's opening event — and this relation, unlike enclosure, is proved transitive and irreflexive (`sequencing_lt_trans`, `sequencing_lt_irrefl`), so it carries a genuine strict causal order on the space of scopes themselves (`sequencingCausalSet`, §5.6's own order-closure requirement, instantiated here rather than assumed to hold).
Declared dependency between sibling scopes — one work-item blocking another at the same enclosure — is this sequencing relation read as ordinary claim evidence, the identical construction enclosure itself uses, at one level below it: enclosure relates a scope to its parent; sequencing relates sibling scopes to each other, and the two are proved to be different relations requiring different closure properties, not one relation read two ways.

**Resource conflict among sibling scopes is proper graph coloring, and its palette is the identical `Charge` this document already uses for everything else.
** Where two sibling scopes cannot proceed on the same resource at once — the same agent, the same exclusive lock, the same touchpoint — that is a conflict edge in a graph over the sibling set, and assigning each scope a resource slot such that no conflicting pair shares one is a proper coloring of that graph: a coloring is proved to be exactly a graph homomorphism into the complete graph on the palette of slots (`properColoring_iff_hom`), and a `Charge`-valued coloring — four resource slots — is proved to require all four exactly when the conflict graph contains a fully-mutual four-way conflict (`K4_requires_FOUR`): no fewer than four slots suffice for four scopes that all conflict with each other, and no more are ever needed for that case.
This is the identical four-value alphabet §5.13a's conflict threshold already grades evidence in, applied here to scheduling rather than evidential disagreement — one palette, two readings, not two independently invented four-valued systems.
The **coloring entropy** of a conflict graph — `log₂` of how many valid slot-assignments exist — is proved, for the smallest cases, to be the identical bit-count §8.4's Landauer entropy already measures for a coordination cover: a single conflicting pair has exactly two valid two-slot colorings, one bit (`edge_colouring_entropy`), the same one-bit quantum a single coordination-requiring cycle costs.
Scheduling conflict and coordination cost are not two separately-measured costs this document happens to both call "entropy" — they are read off the same construction, general graph coloring specialized two different ways.

**A dependency between sibling scopes is a facilitation constraint, and "ready to dispatch" is its proved closure.
** Where one scope must complete before another may begin — the sequencing relation above, declared as evidence — reading that declared dependency as a *facilitation* relation (a completed scope facilitates the readiness of the scopes it was declared to block) gives dispatch-readiness the exact shape of a proved deterministic closure: a scope becomes, and stays, ready once some already-ready scope facilitates it (`activateStep`, proved inflationary and monotone — `activateStep_infl`, `activateStep_mono` — a genuine closure step, not merely inflationary-in-spirit), and the set of scopes reachable this way from an initially-ready seed is proved to be exactly the *least* facilitation-closed set extending that seed (`activation_is_facilitation_closure`) — dispatch-readiness is not a status a caller computes ad hoc per scope, it is this closure's fixed point, the identical shape §5.6's causal order and §5.10's settlement already use a closure for, applied here to readiness rather than to causal reachability or evidential settlement.

**Interface.
**

```text
scopeOf   : WorkLevel × Id → Scope
levelOf   : Scope → WorkLevel
parentOf  : Scope → Judgment⟨Scope, NoParent⟩   -- reads declared parent evidence, not the scope string
```

`WorkLevel` is one of `endeavor`, `campaign`, `project`, `plan`, `task`, `work-item`, totally ordered coarsest-to-finest in that listed order.

**Obstruction variants.
** `NoParent` (`parentOf` finds no admitted evidence naming an enclosing scope for the argument — not an error, the ordinary state of an `endeavor`-level scope or of any scope no caller has yet related to an enclosure).

**Preconditions.
** `scopeOf` accepts any `WorkLevel` and any non-empty `Id`.
`levelOf`/`parentOf` accept any `Scope` `scopeOf` could have produced.

**Postconditions.
** Injectivity: `∀ l₁ i₁ l₂ i₂. scopeOf(l₁,i₁) = scopeOf(l₂,i₂) ⟹ l₁ = l₂ ∧ i₁ = i₂` — two scopes are equal only when level and id both agree.
`∀ l i. levelOf(scopeOf(l,i)) = l`.
No privileged level: every operation defined on `Scope` (declaration, event admission, evidence, capability gating) accepts a scope at any of the six levels uniformly — a `WorkLevel` distinguishes granularity, never authority or admissibility.
A scope is not itself a claim; it is the address a claim (§5.3's term, §5.5's `address` field) may name.
Declaring, progressing, or discharging work at a scope is ordinary admission (§5.5) of a claim whose address is that scope — this system introduces no second admission path and no operation `admit` does not already define; it only fixes the grammar of one region of the address space `admit` already accepts arbitrary terms into.

### 5.25 Jural relations, office, and incumbency

**Depends on:** the knowledge base (§5.11), capability and authorization (§5.12), work scopes (§5.24).

A duty, a power, a privilege, and an immunity are not four different kinds of record; they are four readings of one claim shape — a directed relation between an active holder and a passive party, scoped to a work scope (§5.24), evidentially valued at the same `Charge` (§5.8) any other claim is.
`JuralRelation := ⟨kind, active, passive, scope, standing⟩` where `kind` is one of `claim/duty`, `privilege/no-right`, `power/liability`, `immunity/disability` (Hohfeld's eightfold, four advantage positions and their four correlatives) and `standing` is a `Charge`.
The **correlative** of a relation swaps `active`/`passive` and renames `kind` to its Hohfeldian pair — `duty`'s correlative is `claim`, `power`'s is `liability`, and so on — an involution: `correlate(correlate(r)) = r`.
A correlative is not a second relation requiring its own admission; it is a derived reading of the one relation already admitted, exactly as a claim's negation is a derived reading of the claim (§5.8's `negate`), not a second claim.

**The eightfold is one group orbit of one generator, not eight independently posited kinds.
** `privilege` is the negation-conjugate of `power` under §8.1's Klein-four symmetry `K₄ = ⟨~, −⟩` (the identical group `Charge`'s own gauge symmetry already proves closed and generated by two involutions); `duty` is `power`'s image under the composite `~∘−`; and correlativity itself is the further involution swapping `active`/`passive`.
Composing `K₄`'s four elements with this potential/passive swap gives a group of order eight, and Hohfeld's full eightfold is exactly this group's orbit of a single starting relation: `power ↦ {power, no-power, privilege, duty}` under `K₄` alone, and each of those four's correlative (`liability, immunity, no-claim, claim`) under the further swap — eight named positions, one underlying generator, one group action, not eight separately chosen definitions.
This composite construction is proved in the corpus's predication- categories material (not yet an Infomaterial declaration, distinct from this document's other citations, which is why AD-12 discipline applies here as a design decision reusing §8.1's already-cited `K₄` for a new purpose) — it is the reason `privilege/no-right`, `power/liability`, and `immunity/disability` need no separate formula beyond the one already stated for `duty/claim`: every kind is the identical construction at a different orbit point.

An **office** is a bearer-independent named holder of a family of jural relations — its deontic profile — each relation scoped to a work item the office governs, with the office itself, not any incumbent, in the potential position.
Because the office's profile is ordinary claim content (§5.3/§5.5), it persists across incumbents exactly as any settled claim persists: a vacancy changes which agent is invested, never the profile's own admitted standing.

**Incumbency** is a double settlement, not a single boolean grant: a candidate reaches full incumbency (dignitas) only when *two* independent predicates on that candidate both settle to `held` — **recognition** (the office's community acknowledges this candidate as its legitimate occupant; backward-looking, history-sensitive) and **induction** (the candidate has taken on the office's forward obligation).
Because each predicate is an ordinary `Charge`-valued claim (§5.8), their joint state is read by the same knowledge-order the SAD already defines for every other pair of independent evidence bits (§5.9's pointwise `combine`, §8.1's interlaced bilattice) — incumbency introduces no second grading: vacant (`unknown`/`unknown`), munus-only (`unknown`/`held`, forward-obligated with no accumulated recognition), recognition-only (`held`/`unknown`), dignitas (`held`/`held`, full incumbency), and the two failure/repair readings any `Charge`-typed pair already has (`denied` on either predicate is failed; `contested` on either is a repair condition) — six named readings of the sixteen pairs `Charge × Charge` admits, the same construction as any other two-bit evidence reading in this architecture, not a bespoke state machine.

At dignitas, the office's profile **devolves**: every relation in the profile is re-read with `active` rewritten from the office to the incumbent — the capability-propagation this architecture's `enforce` (§5.12) reads is exactly a devolved `power`-kind relation reaching `held`.
Devolution is a read, not a write: the office's own profile, still active-holder-typed to the office, is untouched — `relieve`ing an incumbent (returning the incumbency state to vacant) devolves nothing, because there is nothing stored at the incumbent to undo; only the double-settlement reading changes.

**Assignment** binds a work scope (§5.24) to an agent as a `duty`-kind jural relation: the agent now owes the work named by that scope, and the assigner (or the assigning office) holds the correlative `claim`.
This is the one construction by which a work scope becomes a specific agent's accountable labor, rather than an unassigned address in the work-scope grammar.

**Assignment presupposes a capability, evidentially valued the same way.
** Naming an agent as a duty's active holder is not itself a guarantee the agent can discharge it: whether an agent provides a capability a scope of work requires is its own `Charge`-valued reading — `held` where an enrollment or certification witness is recorded, `denied` where a revocation witness is recorded, `contested` where both exist — read the same four-value way as any other evidence this document grades (§5.8), not a separate boolean eligibility check.
This is the same underlying notion this architecture's own corpus material has named twice at two different depths — colloquially "skill" (the capability an assignee's role must advertise) in an earlier, more mechanical work-dispatch presentation, and formally `capability` in the deontic presentation §5.25 draws on — one concept reached by two passes, not two competing ones: an office's own capability propagates to its incumbent at dignitas exactly when the office's authority does, and the two propagations are independent — an incumbent may hold an office's authority without (yet) holding its capability, or the reverse, distinguishable as two separately-read `Charge` values on the same agent.
Assignment is licensed by, but does not itself constitute, this capability reading: `assign` produces the duty relation regardless, and whether that duty is dischargeable is a further, separately-checked fact.

**Interface.
**

```text
correlate : JuralRelation → JuralRelation
office    : OfficeName × List⟨DeonticEntry⟩ → Office
invest    : Office × Agent × Charge × Charge → Investiture   -- (recognition, induction)
relieve   : Office × Agent → Investiture
assign    : Agent × Scope × Agent → JuralRelation             -- (assignee, scope, assigner) → duty
```

`DeonticEntry := ⟨kind, over: Scope, party?⟩`.
`Investiture := ⟨office, incumbent, state: IncumbencyState, devolved: List⟨JuralRelation⟩⟩`, `devolved` non-empty only at dignitas.

**Obstruction variants.
** None named beyond the ordinary admission and settlement obstructions (§5.5, §5.10) any underlying claim can raise; `invest`/`relieve`/`assign` each produce ordinary jural-relation or investiture *values* — whether the relations they produce are ever admitted to the journal, and whether admission succeeds, is the ordinary path every other claim already takes.

**Preconditions.
** `correlate` accepts any `JuralRelation`.
`office` accepts any name and any list of deontic entries.
`invest`/`relieve` accept an `Office` and an `Agent`; `invest` additionally accepts the two predicates' settled `Charge` values.
`assign` accepts any two agents and a `Scope`.

**Postconditions.
** Correlative involution: `∀ r. correlate(correlate(r)) = r`.
Standing preservation: `∀ r. standing(correlate(r)) = standing(r)` — swapping active/passive and renaming the kind changes no evidential fact, only which party the relation is read from.
Incumbency totality: `∀ office agent rec ind. ∃! state. invest(office, agent, rec, ind).state = state` — the double-settlement reading is total on every `Charge × Charge` pair, per §8.1's totality of `join`/`meet`; there is no pair of predicate values incumbency leaves unclassified.
Devolution exactness: `∀ i. i.state = dignitas ⟺ i.devolved ≠ ∅`, and `∀ i r ∈ i.devolved. ∃ r' ∈ office(i.office).profile. r = {...r', active := i.incumbent}` — every devolved relation is some profile relation with its active holder rewritten to the incumbent, and conversely.
Office persistence: `∀ office agent. relieve(office, agent).devolved = ∅` and the office's own profile (as read from its admitted claims) is unchanged by `relieve` — *dignitas non moritur*, formalized as devolution's absence rather than as profile deletion.

### 5.26 Governance operativity

**Depends on:** jural relations, office, and incumbency (§5.25), coordination (§5.13b).

A process is a governance act exactly when it jointly satisfies three independent conditions, each itself a `Charge`-valued settlement over the same evidence this architecture already grades every claim by: **attribution** (the process is done by a collective, not by a lone member — `held` iff at least two distinct observers are named as an active holder or passive party of some jural relation in the process's membrane), **binding** (the process produces or modifies a normative constraint on some member — the knowledge-join, §8.1's `join`, of the standings of every jural relation the process asserts), and **becoming** (the process transitions the collective's state — `held` iff the asserted relations are internally coherent: no relation settled `contested`, and the relations glue coordination-free, i.
e.
their cross-observer coordination cost, §5.13b, is zero).
**Operativity** is the knowledge-meet `⊗_k` (§8.1) of these three settlements — not a Boolean conjunction, so a governance act with one condition still unsettled reads `unknown` (a gap), distinguishable from one where two conditions actively conflict (`contested`), which the SAD's evidence type already makes exactly this distinction for by construction (§5.8).

Because attribution, binding, and becoming are each already-defined readings over already-defined structure — a count of distinct observers, a knowledge-join over jural-relation standings (§5.25), and a coordination-cost read (§5.13b) — governance operativity adds no new evidence type and no new closure; it is a *derived reading*, exactly as §5.9's `readingAt` is a derived reading of an evidence presheaf, not a new kind of value.

**Interface.
**

```text
attributionOf : Membrane → Charge
bindingOf     : Membrane → Charge
becomingOf    : Membrane → Charge
operativityOf : Membrane → Charge
```

`Membrane` is a finite set of admitted jural-relation claims (§5.25) sharing a common frontier (§5.7) — the observers and relations one governance act's settlement ranges over.

**Obstruction variants.
** None — each operation is a total function of its membrane, per the totality of `join`/`meet` (§8.1) it composes.

**Preconditions.
** All four operations accept any finite `Membrane` of admitted jural-relation claims, including the empty membrane (read as `absurd`/unknown on every axis: no observers, no relations, nothing to become).

**Postconditions.
** `∀ m. operativityOf(m) = meet(meet(attributionOf(m), bindingOf(m)), becomingOf(m))` — operativity is defined by, not merely correlated with, the three-way knowledge-meet.
`∀ m. operativityOf(m) = held ⟹ attributionOf(m) = held ∧ bindingOf(m) = held ∧ becomingOf(m) = held` — a held governance act requires all three primitives held, by the meet's own definition (§8.1's postconditions), not by a separate conjunction rule this system introduces.
Gap/contradiction distinction: `∀ m. operativityOf(m) = unknown` is reachable only when no axis is `contested` and at least one is `unknown` (a genuine gap), while `operativityOf(m) = contested` is reachable only when some axis is `contested` (a genuine conflict) — the two are never conflated, because `meet` on `Charge` already keeps them apart (§8.1).

### 5.27 Endeavor

**Depends on:** work scopes (§5.24), the knowledge base (§5.11), query planning (§5.20).

The finest-to-coarsest levels of §5.24's work spine are not peers of uniform character: a `task` or `work-item` is a single attempt with a determinate goal, but an `endeavor` is a *sustained commitment* — a caller may fail at it repeatedly and still be advancing it, because what persists across the failures is not the goal's satisfaction but an accumulated capability (skill, context, ruled-out approaches) the failures themselves produced.
Collapsing an endeavor's status to the same status vocabulary a `task` uses — done or not-done — discards exactly the information that distinguishes an endeavor from a task: that a failed attempt can still be a step, evidenced by the capability it left behind.

An **attempt** at scope `endeavor:<id>` is a pair of an intended target state and a realized outcome — which may coincide (success), may differ (failure, itself further classified by which of two independent axes diverges: whether the realized outcome required *some* work-act at all, and whether an alternative act reaching the intended target was available within the attempter's admitted capability at the time).
An **endeavor context** accumulates attempts at one `endeavor:<id>` scope together with the capability each attempt's realized outcome updated, and names the next admissible action given everything accumulated so far — it is not a task list with a parent pointer; a task list answers "what remains," an endeavor context additionally answers "what has been learned from what did not work.
"

Composition of attempts is **failure-open**: attempting `g` after attempting `f` composes even when `f`'s realized outcome differed from its intended target, because what composes is not "`f`'s success composed with `g`'s success" but "the capability `f`'s realized outcome left, available to `g`.
" This is why an endeavor's continuation survives a failed attempt without a separate repair mechanism: continuation is ordinary composition of attempts, and a failed attempt is still an attempt with a realized outcome, hence still composable.

**An endeavor's `children` compose by the identical construction one level up, not a second one.
** §5.24's sequencing relation on scopes is built so that the space of scopes it orders is itself, structurally, the same kind of object §5.6's causal order is built over — a `CausalSet`, in the strict technical sense §5.6 already defines.
Because that identification is exact, not merely analogous, every general fact this document already has about causal order — the frontier construction (§5.7), the settlement-depth grading (§8.3), the coordination-cohomology machinery (§5.13b) — applies to a space of `children` scopes without a second proof obligation: an endeavor's children are not sequenced by a bespoke, endeavor-specific ordering, they inherit the general `CausalSet` machinery by the same instantiation `sequencingCausalSet` already performs for sibling scopes at any single enclosure.
This is what lets `contextOf`'s `children: List⟨Scope⟩` compose recursively — a campaign's projects, a project's plans — without this document defining a new kind of composition at each coarser level: composing endeavors-of-endeavors is the identical sequencing construction, applied to a space of scopes one level further removed from a single work-item, not a distinct mechanism this document has yet to specify.

**Interface.
**

```text
attempt   : Scope × Goal → Judgment⟨Attempt, Attempt⟩   -- ok(a): realized = intended; obstructed(a): realized ≠ intended, a still returned
continue  : Attempt × (Scope × Goal) → Attempt          -- compose a further attempt after a prior one, success or not
contextOf : Scope × Frontier → EndeavorContext
```

`Attempt := ⟨scope, intended: Goal, realized: Outcome, capability: CapabilityDelta⟩`.
`EndeavorContext := ⟨scope, aim, orientation, attempts: List⟨Attempt⟩, children: List⟨Scope⟩, continuation: List⟨Goal⟩⟩`.

**Obstruction variants.
** `attempt` returns its own `Attempt` value on both branches of its `Judgment` — a divergent realized outcome is not a failure of `attempt` itself (which always produces a value), only of the attempt it describes; there is no `AttemptObstruction` type distinct from the ordinary `obstructed` branch already carrying the attempt.

**Preconditions.
** `attempt` accepts any `Scope` at the `endeavor` level (§5.24) or any level it encloses, and any `Goal` a settled context (§5.11) can pose as a question.
`continue` accepts a prior `Attempt` and a further `(Scope, Goal)` pair naming what is attempted next; the prior attempt's realized outcome need not equal its intended target.
`contextOf` accepts any `endeavor:<id>` scope and any `Frontier` `frontierOf` (§5.7) could have produced.

**Postconditions.
** Failure-open composition: `∀ a g. continue(a, g)` is defined whether or not `a.realized = a.intended` — `continue`'s domain does not exclude a failed prior attempt.
Capability monotonicity: `∀ a₁ a₂. a₂ = continue(a₁, _) ⟹ a₂.capability ⊒ a₁.capability` under whatever capability-preorder the capability delta is read against — an endeavor's accumulated capability never regresses across composed attempts, success or failure, mirroring this architecture's evidence-retention discipline (§5.8: nothing settled is discarded) applied to capability rather than to charge.
Non-flattening: `∀ scope frontier. contextOf(scope, frontier)`'s `attempts` list retains every admitted attempt at that scope, including every one whose `realized ≠ intended` — an endeavor context is never reduced to a single boolean "done"/"not done" read, per this architecture's Evidential integrity quality goal (§1.2) applied to endeavors specifically.

**Design status.
** The composition law above — that attempts compose associatively and that composing preserves accumulated capability regardless of individual success — is stated here as an architectural commitment on engineering grounds (an endeavor context must not discard failed-attempt evidence, per §1.2), not yet as a citation.
The supporting mathematics (the endeavor as a Kleisli morphism for a strong monad on world-states, with capability accumulation following from a distributive law over a capability-tagged-state functor) is developed in the theory-of-work corpus this architecture draws its work vocabulary from, but no Infomaterial declaration yet formalizes it — §11 states this gap plainly, per AD-12.

### 5.28 Site and settlement

**Depends on:** the journal (§5.5), settlement (§5.10).

Two distinct facts about one location get conflated if left unnamed: a directory can exist, be readable, and support a journal's path grammar before any event has ever been admitted there, and a directory accumulates a settled, ever-only-growing interior once events have been.
A **site** — this section's sense, disambiguated from §8.2's — is the bare fact — a location together with the rule (§5.5's path grammar) that would let a journal exist there, with no requirement that anything has been admitted; a site with nothing yet deposited on it holds no claim to be one system's territory rather than another's, and reading it changes nothing (bare and dead, in §5.28's own occupation reading below).
This is a genuine word collision, not one word specialized two ways from a common root: §8.2 already uses "site" for the Grothendieck covering-space genus (points, a covering relation, self-cover/pullback/ composition) that evidence presheaves (§5.9) range over, and this section's "site" (a storage location, bare or settled) names an unrelated structure that happens to share source material's word choice — see §11. A **settlement** is a site *inhabited*: paired with an actually-admitted, rule-satisfying interior — the tiered store (§5.5's `Contains`, this architecture's plate) an admitted history has deposited there.
Every settlement is a site; not every site is a settlement — this is why the two need distinct names rather than one, and why "site" was this architecture's working name (§8.2) for the covering-space genus before this section narrows it to name the storage location specifically.

A settlement's own occupation is classified along two independent axes, neither collapsing into the other: **bare/inhabited** (has any event ever been admitted at this site) and **dead/live** (is a running process — a managed element, §5.22 — currently serving reads and admissions over it).
The four corners: bare-and-dead is an ordinary, unclaimed location — any directory a caller has not yet pointed a managed element at; bare-and-live is observation without occupation — a read dispatched over a location nothing has settled, which touches nothing because there is nothing yet to touch; inhabited-and-dead is an abandoned settlement — a settled interior with no managed element currently serving it, the one condition under which reading the plate directly, rather than through a managed element's `read`/`query` interface, is lawful, because there is no live recognizer of current truth to bypass; inhabited-and-live is the ordinary running case this architecture's §5.2–§5.23 describe throughout — the settlement a managed element (§5.22) is one running instance of.
A managed element is, precisely, the live surface of an inhabited-and-live settlement: §5.22's "one running instance of §5.2–§5.21, with its own journal" is one running instance over one settlement's plate, and the settlement — not the managed element — is what persists when the managed element's process exits; a managed element killed and restarted over the same settlement resumes the identical settled interior, because nothing about the settlement depended on the managed element's continued existence.

**Interface.
**

```text
siteOf       : Location → Site
settlementOf : Site → Judgment⟨Settlement, Uninhabited⟩
occupationOf : Site → Occupation
excavate     : Settlement → Judgment⟨PlateContent, Unlawful⟩   -- direct plate read, bypassing a live managed element
```

`Occupation ∈ {bare-dead, bare-live, inhabited-dead, inhabited-live}`.

**Obstruction variants.
** `Uninhabited` (`settlementOf` applied to a site with no admitted event — a bare site is not a settlement, by definition, and this operation does not manufacture one).
`Unlawful` (`excavate` applied to a settlement whose occupation is `inhabited-live` — a running managed element is the most specific recognizer of its own plate, and a direct read that bypasses it would return a stale or incoherent cut of state a live managed element's own derivers have already superseded).

**Preconditions.
** `siteOf` accepts any `Location` a journal's path grammar (§5.5) could root at.
`settlementOf`/`occupationOf` accept any `Site`.
`excavate` accepts any `Settlement`.

**Postconditions.
** Site-settlement inclusion: `∀ s. settlementOf(s) = ok(_) ⟹` `s` has at least one admitted event (§5.5) — a settlement is never manufactured from an empty site.
Occupation totality: `∀ s. ∃! occ. occupationOf(s) = occ` — every site reads exactly one of the four corners, per the two independent boolean axes it is built from.
Excavation lawfulness: `∀ settlement. excavate(settlement) = ok(_) ⟺ occupationOf(siteOf-of(settlement)) ≠ inhabited-live` — a direct plate read succeeds exactly at the two corners (bare-dead, inhabited-dead) where no live managed element's derived view could be made stale by it; at inhabited-live, `excavate` obstructs unconditionally, so a caller wanting current truth over a live settlement is always routed to that settlement's own managed element (§5.22's `read`/`query`), never to a bypass.
Plate persistence: `∀ settlement e₁ e₂.` two managed elements running, at different times, over the identical settlement observe the identical plate content up to whatever each has itself admitted meanwhile — a managed element's death and restart changes nothing about the settlement's accreted interior, per the inhabited-dead corner's own admissibility of excavation (there is something stable to excavate exactly because the plate outlived the managed element).

**Naming note.
** This document's earlier vocabulary (§5.1, §5.22) named one running instance of the journal-through-self-revision systems a "dish, with its own journal" — an internal coinage this document has since retired in favor of "managed element" (§5.22), the standard ACRA term for the same referent (§5.32).
Separately, some of this architecture's own source material called the persistent thing a managed element runs over a "territory.
" §5.28 states, as a design decision rather than a silent pick, that "settlement" (with "site" as its bare genus) is the name this document adopts for that: "territory" and "settlement" name the same referent in that source material, and no file reconciling the two under one name existed before this document did so here — see §11.

### 5.29 The relational instrument

**Depends on:** the journal (§5.5), capability and authorization (§5.12).

An obstruction (§5.1) is already admissible wherever any other value is — in particular as a claim a caller may assert and settle.
A **relational instrument** is this admissibility made systematic: a named, boundary-crossing unit of work stated as a Hoare-shaped triple — a precondition, a move, and a postcondition — under a declared phase, observational lens, and evidence policy, together with the energetic obligations and implementation projections that state what the instrument costs to run and what concrete artifacts realize it.
An instrument does not perform work directly; it is the *lawful obstruction field* a move is checked against — a caller's attempted move either satisfies the instrument's precondition, in which case the move is admissible and its postcondition becomes the obligation the move's result is checked against, or it does not, in which case the instrument's own obstruction vocabulary names why, exactly as any other `Judgment`-returning operation in this architecture does.
This is why an instrument is read as a *field* of prepared obstructions rather than as an operation with a body: the instrument states, in advance of any particular caller, every way a move against it can fail to be admissible, so that admission (§5.5) checking a candidate against an instrument's precondition is the identical discipline as checking a candidate claim's typing before it is durable — a proof-governed gate, never validation layered on afterward.

A protocol (§3.2, §5.17's face) is realized as an instrument whose material context names the protocol's boundary and whose relation to other instruments — `conforms-with`, `uses`, `bridges`, `bricks` — is itself ordinary claim evidence: an instrument's obligations to a named standard, schema, codec, ledger, runtime, law, or proof are derived, checkable relations, not asserted compliance.

**Interface.
**

```text
checkMove   : RelationalInstrument × Move → Judgment⟨Unit, PreconditionObstruction⟩
obligationOf: RelationalInstrument × Move → Judgment⟨Postcondition, PostconditionObstruction⟩
relationOf  : RelationalInstrument × RelationalInstrument → Judgment⟨InstrumentRelation, Unrelated⟩
```

`RelationalInstrument := ⟨material, precondition, move, postcondition, phase, lens, evidencePolicy, energetics, projections⟩`.
`InstrumentRelation ∈ {conforms-with, uses, bridges, bricks}` scoped to a named target of kind standard/protocol/schema/codec/ledger/ runtime/law/proof.

**Obstruction variants.
** `PreconditionObstruction` (the attempted move does not satisfy the instrument's stated precondition against the material context supplied).
`PostconditionObstruction` (a move checked as admissible nonetheless produced a result the postcondition does not accept — a distinct failure from precondition obstruction, occurring after the move rather than before it).
`Unrelated` (no evidence supports any of the four relation kinds between the two instruments named).

**Preconditions.
** `checkMove` accepts any `RelationalInstrument` and any candidate `Move` a caller proposes against it.
`obligationOf` requires the move to have already checked (`checkMove` returned `ok(unit)`).
`relationOf` accepts any two `RelationalInstrument` values.

**Postconditions.
** Obstruction admissibility: `∀ i m.` `checkMove(i, m) = obstructed(o) ⟹ o` is itself admissible as a claim (§5.3) a caller may assert and settle — per §5.1's own definition of `Obstruction`, an instrument introduces no second notion of failure outside that one.
Gate-before-obligation: `∀ i m.` `obligationOf(i, m) = ok(_) ⟹ checkMove(i, m) = ok(unit)` — a postcondition is never checked against a move that never cleared the precondition; this is the instrument-level restatement of admission's own discipline (§5.5: typing runs before an event is ever durable), and of a genuine Hoare triple's own preservation law: a bare precondition/ move/postcondition bundle `⟨pre, move, post⟩` is proved, in general, to satisfy exactly this gate — `∀ input. pre(input) ⟹ post(move(input))` (`HoareProgram.preserves`) — whenever a precondition holds of an input, the postcondition holds of that move's output, unconditionally; an instrument's `checkMove`/`obligationOf` pair is this law read as two separate `Judgment`-returning checks (one before the move, one after) rather than one bundled implication, but the implication itself is the same fact the general triple already proves.
Relation derivedness: `∀ i₁ i₂ r.` `relationOf(i₁, i₂) = ok(r) ⟹ r` names, and is accompanied by, the specific evidence (§5.10's evidence, never a bare assertion) that licenses the relation kind claimed — an instrument's `conforms-with` a standard is a checkable fact, not a declared label.

### 5.30 Field and common ground

**Depends on:** evidence values (§5.8), evidence presheaves (§5.9), governance operativity (§5.26).

§5.9's evidence presheaf assigns a `Charge` to every point of one covering space, read by one settlement process.
Where more than one named observer each maintains its own such reading, and those readings are related by declared perspective maps between observers rather than merely pooled anonymously, a further structure is needed: a **field** is a finite set of named observers, each carrying its own local evidence presheaf (§5.9) over a shared predicate space, together with a set of declared **translations** — directed morphisms between two observers' readings, carrying one observer's local evidence into another's terms.
A field's **common ground** is the section this structure glues to: the knowledge-meet, over every observer, of each observer's own local reading, together with the same H¹ obstruction §8.2/§8.4 already grade a single presheaf's gluing by, now computed over the observer-indexed cover rather than over a single covering space's points.
A discrete field — no non-identity translations declared between any two observers — degenerates to §5.9's ordinary presheaf reading applied independently per observer: the richer content a field adds over §5.9 lives entirely in the translations, never in the observers' local readings taken alone.

Common ground is graded on two independent axes, neither collapsing into the other.
The **static** axis reads whether the field's observers glue coordination-free at the frontier already admitted: `glued` (the cross-observer obstruction, §8.4's `H1rank` applied to this field's translation graph, is zero), `obstruction` (its exact value when nonzero), and `coordinationFree` (`obstruction = 0`, restated as a boolean per §5.13b's own reading of the identical quantity).
The **dynamic** axis reads the regime (§8.3's ordinal grading — strict/scott/transfinite-bounded/aperiodic) the field's merge is settling under, distinct from whether it has, at the current frontier, already glued: a field can be coordination-free right now and still be settling under a regime that does not guarantee it stays so as further evidence arrives, exactly as §8.3 already distinguishes a presheaf's current fixed point from the ordinal depth its closure is graded at.

**Interface.
**

```text
fieldOf      : Set⟨Observer⟩ × Set⟨Translation⟩ → Field
localReadingOf: Field × Observer → EvidencePresheaf
groundOf     : Field × Frontier → Judgment⟨CommonGround, StabilizationObstruction⟩
```

`Translation := ⟨source: Observer, target: Observer, carries: EvidencePresheaf → EvidencePresheaf⟩`.
`CommonGround := ⟨glued, obstruction, coordinationFree, regime, regimeCoordinationFree⟩`.

**Obstruction variants.
** `StabilizationObstruction` is identical to §5.10's `settle`'s obstruction — `groundOf` closes the field's pooled readings to a fixed point by the identical pointwise closure §5.10 already defines, applied across observers rather than across one presheaf's points, and inherits that operation's one obstruction variant rather than defining a second.

**Preconditions.
** `fieldOf` accepts any finite set of named observers and any set of translations between pairs drawn from that set.
`localReadingOf` requires its `Observer` argument to be a member of the field.
`groundOf` accepts any `Field` and any `Frontier` `frontierOf` (§5.7) could have produced.

**Postconditions.
** Discreteness reduction: `∀ field. field`'s translations `= ∅ ⟹ groundOf(field, f)`'s `glued` and `obstruction` match exactly what independently settling (§5.10) each observer's own `localReadingOf` and knowledge-joining (§5.8's `join`) the results would produce — a field with no declared translations adds nothing `combine` (§5.9) did not already give.
Axis independence: `∀ ground. ground.coordinationFree` is determined entirely by `ground.obstruction = 0` and is silent about `ground.regime`; `∀ ground. ground.regimeCoordinationFree` (the cohomological-CALM reading of the regime axis) does not determine, nor is determined by, `ground.coordinationFree` — the two axes are read off independent structure (a static obstruction count, a dynamic ordinal grade) and this architecture states no law collapsing one into the other, per §8.3's own separation of a presheaf's current fixed point from its closure's ordinal depth.

### 5.31 Kinematic ground

**Depends on:** causal order (§5.6), frontier computation (§5.7).

A frontier (§5.7) names one causally closed history as a set; it does not, by itself, name a *bounded region* of the causal order distinct from every other region — two disjoint sets of events can each admit a frontier without this architecture yet having a way to say that they occupy different parts of one shared causal order rather than two unrelated orders.
A **ground** is this missing region-identity: a bounded, addressable subset of the causal order (§5.6) — the events reachable from a chosen frontier by causal order alone, together with the causal links among them — closed under causal predecessor exactly as a frontier's own history is (§5.7's downward closure), so that a ground is always a legitimate history in the §5.7 sense, never an arbitrary event subset.
What a ground adds over a bare frontier's history is comparability: two grounds computed from two different frontiers can be asked whether they overlap, are disjoint, or one encloses the other, entirely in terms of `before` (§5.6) — this is the operation coordination (§5.13b) already needs to tell whether two concurrent settlement processes' covers are the same region of the causal order or genuinely separate ones, restated here as a standalone reading rather than folded silently into §5.13b's own cover construction.

**Interface.
**

```text
groundOf   : Frontier → Ground
overlapOf  : Ground × Ground → Set⟨Address⟩
enclosesOf : Ground × Ground → Boolean
```

`Ground := ⟨frontier: Frontier, events: Set⟨Address⟩⟩`, with `events = historyOf(frontier)` (§5.7) exactly.

**Obstruction variants.
** None — all three operations are total on their stated domains, per §5.7's own totality of `historyOf` and the decidability of `before` (§5.6) over admitted addresses.

**Preconditions.
** `groundOf` accepts any `Frontier` `frontierOf` (§5.7) could have produced.
`overlapOf`/`enclosesOf` accept any two `Ground` values.

**Postconditions.
** Ground is history, restated: `∀ f. groundOf(f).events = historyOf(f)` — a ground introduces no events, causal facts, or closure beyond what §5.7 already computes; it is a name for a frontier's history read as a comparable region, not a new construction over the causal order.
Overlap symmetry: `∀ g₁ g₂. overlapOf(g₁, g₂) = overlapOf(g₂, g₁)`.
Enclosure via overlap: `∀ g₁ g₂. enclosesOf(g₁, g₂) ⟺ overlapOf(g₁, g₂) = g₂.events` — one ground encloses another exactly when their overlap is the enclosed ground's entire event set, so `enclosesOf` adds no reading `overlapOf` does not already supply.
Disjointness is the zero case: `∀ g₁ g₂. overlapOf(g₁, g₂) = ∅ ⟺` the two grounds share no causal history — the two regions §5.13c's worked trace (process X, process Y) already describes as evaluating "a disjoint region" from one another are, in this section's vocabulary, two grounds with empty overlap.

**Design status.
** This section names, as its own standalone reading, a distinction (region-vs-region comparability over the causal order) that source material in this architecture's history names "ground" — a region of kinematic causal space, distinguished from other regions — and that Infomaterial's causal-set material (`HoleDiamondCausalSet` and the kinematic-space construction it instantiates) formalizes at proof level for the general case.
No Infomaterial declaration is cited by exact name here because this section's three operations are stated directly in terms of already-cited SAD machinery (§5.6's `before`, §5.7's `historyOf`) rather than as a citation of that further construction — see §11. This is a third, narrower sense of "ground," distinct from both senses recorded in §11's earlier risk entry (a causal-event-carrier sense and an occupation-axis sense); this section adopts the region-of-causal-space sense as this document's own §5 building block, leaving the other two unadopted as before.

### 5.32 The MAPE-K reading

**Depends on:** the touchpoint surface (§5.15), the orchestrating autonomic manager (§5.22).

MetroPlat instantiates the Autonomic Computing Reference Architecture (ACRA; Kephart & Chess 2003) at two nested scales.
ACRA supplies the managed-element, touchpoint, and MAPE-K vocabulary; MetroPlat supplies the evidence-graded knowledge model, causal admission, coordination measure, and governed effect path.

At the **inner scale**, one managed element regulates its own settlement root.
At the **outer scale**, the orchestrating autonomic manager regulates a finite set of managed elements, reaching each only through its declared touchpoint.
Neither scale receives a privileged channel into a journal or actuator.

**Outer MAPE-K mapping.
**

- **Monitor** is `observe` (§5.22). It reads each managed element through `settledResourceOf`/`read` and admits one `Observation` containing readings, obstructions, loop identity, and frontier.
- **Analyze** is `analyze`. It derives and admits a `Diagnosis` that classifies agreement, disagreement, missing evidence, source-identity uncertainty, and coordination cost. It selects no action.
- **Plan** is `planAdjustment`. It consumes one admitted diagnosis and admits a typed `AdjustmentPlan`, preserving the diagnosis address and every unresolved obstruction.
- **Execute** is `adjust`. It discharges the plan as routing decisions, consensus requests, higher-arbitration requests, or rule claims through the request pipeline (§6.1), graded reconciliation (§5.13c/d), or self-revision (§5.21).
- **Knowledge** is the shared knowledge base (§5.11). Observation, diagnosis, plan, and decision are ordinary content-addressed, causally admitted artifacts—not private stage-local state.

The explicit `Observation → Diagnosis → AdjustmentPlan → Decision` chain is load-bearing.
Analyze can be inspected, replayed, or challenged independently of Plan; two plans can be compared by the diagnoses that warranted them; and Execute cannot erase or replace its diagnostic provenance.

**Inner MAPE-K mapping.
** A managed element uses the same separation without introducing another manager boundary: Monitor is `query` (§5.11); Analyze is deduction over the observed settlement (§5.18), producing an admitted diagnosis; Plan is `plan` (§5.20), choosing `AnswerDirectly`, `Derive`, or `Coordinate`; Execute is the governed request pipeline and self-revision (§§6.1, 5.21); Knowledge is the same §5.11 knowledge base shared with the outer loops.

**Actuators.
** Execute reaches the world through an actuator: a named, addressable specialization of §5.29's relational instrument whose precondition, move, and postcondition govern one physical or external effect.
Capability standing and the instrument precondition are checked before the effect; its response is admitted afterward.
An actuator never creates a second authorization or evidence path.

**Multi-loop composition.
** Several loops may operate asynchronously at different cadences over the same knowledge base.
Every loop carries a stable `LoopId`, policy, cadence, and causal frontier.
A fast routing loop and a slow rule-revision loop retain distinct stage artifacts; when their proposed plans overlap, §5.13's coordination cost determines whether they merge independently or require consensus.
Shared K is a convergent evidential substrate, not a last-writer-wins scratchpad, so no loop silently overwrites another loop's diagnosis or policy evidence.

**Interface.
** This section introduces no second interface.
The outer mapping uses §5.22's `observe`/`analyze`/`planAdjustment`/`adjust`; the inner mapping composes §§5.11, 5.18, 5.20, and 5.21. Their obstruction variants, preconditions, causal-admission requirements, and no-privileged-effect postconditions apply unchanged.

### 5.33 Arena, strategy, and play

**Depends on:** the term calculus (§5.3), evidence values (§5.8), §8.2's covering-space site.

Derivation search (§5.18) settles a question by forward saturation from one context; it does not, on its own, name what it means for two distinct parties to each hold moves in the same shared structure, where one party's move both depends on and constrains the other's next admissible move.
An **arena** is this shared structure: a set of moves, each polarized (§8.1's `Corner` construction, here read as Opponent/Player rather than addressability/assertivity — the identical two-independent-bits shape §8.1 already proves is reused, not a third bespoke bilattice), together with an enabling relation stating which moves may follow which.
A **position** is a finite, causally-closed (§5.6) set of moves already played, each carrying its own evidential reading (§5.8); a **play** is an extension of one position to another that adds moves respecting the enabling relation and leaves every prior move's evidential reading unchanged.
**Player** names the party whose moves carry positive polarity; **Opponent** names the party whose moves carry negative polarity — the same for/against distinction §5.8's `Charge` already carries, read here as two named parties rather than as accumulated evidence for one claim.

A **strategy** is a nonempty, prefix-closed set of positions a Player commits to, satisfying: *receptivity* (every enabling-relation-legal Opponent move after an admitted position is itself admitted — Player never refuses an Opponent move the arena permits); *determinism* (at most one Player-polarity continuation is admitted after any position); and *settlement compatibility* (every admitted position's evidential reading is settled, §5.10, and a Player extension never regresses that reading in the knowledge order).
These three conditions are stated as laws (§5.1) a strategy must satisfy, not as a fourth `Law`/`Rule` primitive distinct from what this document already defines: the enabling relation a strategy's moves must respect is read by the same mechanism §5.11/§5.18 already use for a rule-store claim (§5.11's rule partition, §5.18's forward-saturation firing), and this section introduces no second notion of "rule" alongside it.

**Interface.
**

```text
arenaOf     : Set⟨Move⟩ × EnablingRelation → Arena
positionOf  : Arena × List⟨Move⟩ → Judgment⟨Position, IllegalMove⟩
playFrom    : Position × Move → Judgment⟨Position, PlayObstruction⟩
strategyOf  : Arena × Set⟨Position⟩ → Judgment⟨Strategy, StrategyObstruction⟩
```

`Move := ⟨id, polarity: {opponent, player}⟩`.
`EnablingRelation ⊆ (Move ∪ {⋆}) × Move` (`⋆` enabling an opening move with no prior cause).
`Position := ⟨moves: List⟨Move⟩, reading: Charge⟩`.

**Obstruction variants.
** `IllegalMove` (the named move sequence violates the enabling relation, or repeats a move already in the position).
`PlayObstruction` is one of: `NotEnabled` (the extending move is not enabled by the position's current moves per the arena's enabling relation), `ReadingRegressed` (the extension's evidential reading is not `≥ₖ` the position's own, §8.1's knowledge order).
`StrategyObstruction` is one of: `NotReceptive` (some legal Opponent extension of an admitted position is not itself admitted), `NotDeterministic` (more than one Player-polarity extension of some admitted position is admitted), `NotSettled` (some admitted position's reading is not a fixed point of settlement's closure, §5.10).

**Preconditions.
** `arenaOf` accepts any finite set of moves and any relation over them.
`positionOf` accepts any `Arena` and any list of moves, legal or not — legality is exactly what it decides.
`playFrom`/`strategyOf` accept, respectively, an admitted `Position` and a further `Move`, or an `Arena` and any set of positions over it.

**Postconditions.
** Prefix closure is checked, not assumed: `∀ arena positions. strategyOf(arena, positions) = ok(s) ⟹` every proper prefix of every position in `s` is itself in `s` — a strategy that admits a position without admitting its own prefixes obstructs with `StrategyObstruction` (folded into the receptivity/determinism/ settlement checks above, since a missing prefix is unreachable by `playFrom` from any admitted position, hence never legally arrived at).
Polarity conservation: `∀ m ∈ Move. m.polarity` is fixed at `arenaOf`'s construction and never read or rewritten by `positionOf`/ `playFrom`/`strategyOf` — a move's Player/Opponent role is a property of the arena, not of any one strategy over it, exactly as §8.1's `Corner` bits are fixed properties of a boundary crossing, not recomputed per reader.

**Design status.
** This section states a design decision, per AD-12, reusing already-defined SAD machinery (§8.1's polarity-shaped two-bit construction, §5.6's causal closure, §5.10's settlement, §5.11/§5.18's rule-firing) for a new purpose, grounded in prior art this architecture's own history contains at two independent sites: a mature, tested TypeScript implementation of Castellan–Clairambault– Winskel concurrent game systems (polarized prime event structures, symmetry-groupoid-closed strategies checked for receptivity, innocence, and symmetry-invariance) in this architecture's archived material, and a separate Infomaterial-adjacent paper constructing a "finite settled polarized site-arena" from already-proved causal-order, four-valued- evidence, and site-covering constituents.
Neither source is cited here as an Infomaterial declaration: the paper's own conclusion states plainly that "the formal packaging theorem that bundles these constituents into one named arena record.
.
.
remains an open formalization obligation," and separately states that a runtime verification-tournament certificate — this architecture's own `GameTheory.VerificationTournament` citation elsewhere (§11) — is evidence for an arena, not an arena itself.
This section's own `arenaOf`/`positionOf`/`playFrom`/`strategyOf` postconditions are therefore this document's own statement, not a transcription of either source's — see §11.

## 6. Runtime view

Every runtime path preserves one causal chain from boundary observation through governed dispatch to admitted outcome.
Direct answers, derivation, reconciliation, proof execution, and self-revision are compositions of that same chain; none is an implicit side channel or an unwitnessed state transition.

### 6.1 Boundary observation and routing

```text
WIRE_RECEIVED
  → ARRIVAL_ADMITTED | ARRIVAL_OBSTRUCTION
  → ROUTED_AND_DECODED | BOUNDARY_ERROR
  → INVOCATION_ADDRESSED
  → one governed dispatch (§6.2)
  → RESPONSE_RENDERED
```

CLI, HTTP, and MCP bindings first present transport material as a CloudEvent and admit its causality packet through the arrival boundary.
The resulting arrival statements become causes of the canonical invocation.
An arrival obstruction stops execution; routing, JSON-RPC validation, operation lookup by public verb, and wire decoding occur at the boundary and may return a protocol error while leaving the admitted arrival visible.

`INVOCATION_ADDRESSED` constructs one content-addressed `RpcInvocation` from the active request key, subject, operation reference, verb, resource, decoded input, and arguments.
Caller metadata, observation time, and causal predecessors remain recorded on the invocation but are excluded from its identity, so transport retries can coincide without erasing their distinct arrival evidence.

Not every face observation is an operation invocation.
HTTP discovery, health, OpenAPI, forms, feeds, and MCP initialize/list/resource/prompt moves are projections of the service apex.
HTTP action routes and MCP `tools/call` enter §6.2; the boundary projections do not acquire a fictitious operation attempt merely because they share the same listener.

### 6.2 Canonical governed operation dispatch

```text
ATTEMPT_ADMITTED
  → OPERATION_RESOLVED | RESOLUTION_OBSTRUCTION
  → AUTHORIZATION_DECIDED
  → DECISION_ADMITTED
  → AUTHORIZATION_REFUSED
    or [ if the operation declares coordination-required: ]
       COORDINATION_ADMITTED | COORDINATION_OBSTRUCTION
  → HANDLER_EXECUTING
  → OUTCOME_ADMITTED | WITNESSING_OBSTRUCTION
  → RESPONSE_RENDERED
```

`dispatch` admits `metroplat.rpc.attempt` before resolving or executing the operation.
Resolution checks both the content-addressed operation reference and its public verb.
Authorization succeeds exactly when the decision's charge is `held`; the decision must name the same invocation, operation, and subject, and must itself be admitted before the handler is reachable.
A missing attempt witness, invalid decision, refused decision witness, or coordination obstruction is fail-closed.

An operation whose effect declaration is `coordination-required` reaches its handler only after the root's `RpcCoordinate` returns a witnessed positive decision.
Every composition root exposing such an operation installs that coordinator; catalog construction obstructs a coordination-required declaration when no coordinator is bound.
A coordination obstruction is admitted and the handler remains unreachable.

On handler success, `metroplat.rpc.outcome` admits the typed execution receipt and any artifacts returned by the handler.
When the operation's contract carries §8.8 operational accounting, that same outcome admits the observed ledger as provenance: the receipt names the cost-to-complete, evidence-flow receipts, and bounded residue before any face renders a response.
Operational accounting is therefore part of outcome admission, not a separate dispatch phase, external payment record, or application-local side ledger.
On handler failure, the outcome records an execution obstruction where admission remains available.
If the external effect completes but outcome admission fails, dispatch returns a `witnessing` obstruction: the earlier attempt and authorization remain durable, but the system does not claim a witnessed outcome.

### 6.3 Retry and replay

Repeating the same semantic request key, subject, operation, resource, input, and arguments produces the same invocation address even when transport, arrival time, or causal predecessors differ.
An operation declaring `idempotency-key` replay receives that invocation address as its idempotency key.
A `safe` operation may be replayed without that key; a `coordinated` operation requires the coordinator branch above.
These effect declarations are part of the content-addressed operation identity, so changing replay or coordination semantics produces a different operation reference.

Replay correlates receipts; it does not mint fresh provenance by itself.
When a repeated invocation resolves to an already-admitted outcome, the response projects the prior `metroplat.rpc.outcome`, including any §8.8 operational accounting ledger, evidence-flow receipts, and residue already admitted with that outcome.
If the handler executes again, the run must either reuse the same invocation address and reconcile to the same outcome provenance or present a distinct invocation identity before any new evidence-flow work can be accounted.
Thus retry safety is an audit property as well as an effect-control property: duplicate delivery cannot make partial work appear complete, cannot change the ledger attached to a witnessed outcome, and cannot create an unpriced current outside §6.2 admission.

### 6.4 Derivation-and-revision scenario

```text
query settled state (§5.11)
  → plan(question, frontier) (§5.20)
  → AnswerDirectly
      → admit answer receipt with zero planned residue
    or Derive(goal, bound, forecast)
      → derive(context, goal, bound) (§5.18)
      → compare derivation cost and evidence-flow ledger with forecast (§8.8)
      → execute(derivation) (§5.19)
      → admit proof, conclusion, and operational accounting ledger
    or Coordinate(cover, forecast)
      → requestConsensus(readings) (§5.13c)
      → arbitrationClass(reconciliationCover, resolvedReadings) (§5.13d)
      → admit H2Class and compare reconciliation ledger with forecast (§§5.13d, 8.8)
      → zeroH2
          → admit resolved reading and ledger
        or nonzero H2Class
          → requestArbitration(class, resolvedReadings)
          → admit arbitrated reading or UnresolvedClass with ledger
  → if the admitted result concerns the rule store, read it as self-revision (§5.21)
```

Each arrow is a governed invocation whose admitted outcome is causal evidence for the next.
The driver can stop, replay, or resume at any stage without hidden state.
`AnswerDirectly` returns settled evidence without derivation and closes with zero planned residue.
`Derive` returns a bounded, checked `Derivation`; Execute admits that derivation's proof and conclusion with the derivation address, search cost, forecast, and observed operational accounting ledger as causal provenance.
`Coordinate` first resolves degree-1 disagreement, then admits the resulting degree-2 class before treating any consensus result as final.
A `zeroH2` class admits the resolved reading and ledger directly; a nonzero `H2Class` selects higher arbitration, whose success admits an `ArbitratedReading` and whose failure preserves `UnresolvedClass` with the same class provenance.
The coordination ledger records whether the forecasted residue closed or remains bounded unfinished work.
The forecast is not authority to spend hidden effort: it is a plan artifact that the observed settlement, rule-firing, consensus, or arbitration ledger must reconcile against at the next admission boundary.

The scenario applies uniformly to ordinary claims, diagnoses, adjustment plans, and claims about the rule store.
A rule conclusion becomes self-revision only after the identical planning, derivation or graded reconciliation, authorization, execution, and admission sequence.
Neither consensus nor higher arbitration grants an administrative shortcut around §6.2.

### 6.5 Language admission and projection scenario

~~~text
BOUNDARY_ARTIFACT
  → WIRE_DECODED | PRESENTATION_OBSTRUCTION
  → LANGUAGE_ARTIFACT_ADDRESSED
  → TERM_ADMITTED | TYPE_OBSTRUCTION
    or TRANSLATION_JUDGED | TRANSLATION_OBSTRUCTION
  → TARGET_PROJECTION_RENDERED | PROJECTION_OBSTRUCTION
  → one governed dispatch (§6.2) or RESPONSE_RENDERED
~~~

A boundary carrier is first read by its declared wire or projector.
That read produces a language artifact with a presentation, canonical expression bytes, optional type, and evidential assertions; it does not yet grant the carrier truth, authority, or persistence.
A wire inherits its projector's corner and rung, so a presentation whose read is not decidable cannot become an ordinary boundary wire.

When the artifact is RMN, MetroPlat admits the term by checking syntax, type, closedness where required, and normal form identity.
When the artifact is another presentation, MetroPlat judges a typed translation into the target presentation.
An unrecognized language, unrepresentable form, ill-typed translation, semantic drift, or exhausted resource is a translation obstruction retained as the scenario outcome, not an exception that falls into host behavior.

If the translated artifact is an operation input, its canonical value becomes the semantic input, and any declared input-identity projection becomes the identity material used by §6.1's RpcInvocation.
If the translated artifact is a readout, response, diagram, form, or document, the target projection names its validation scope and loss profile before rendering.
Lossy projections may serve a face only for the judgments they preserve; lossless translations round-trip on their declared image.
Every rendered response remains causally downstream of the admitted source artifact, translation judgment, and any governed invocation it triggered.
## 7. Deployment view

The stable deployment allocation of a managed element (§5.22) is one settlement root and its plate.
A long-lived operation host bound to that root is the running instance of §§5.2–5.21; transient faces may address the same root without becoming replicas.
Different roots own different journals and remain different managed elements even when one process projects or orchestrates several.

### 7.1 Settlement-root allocation

Every stateful process resolves exactly one settlement root through `processDataRootConfig`.
Resolution proceeds from the package-root default, then an optional configuration file, then `METROPLAT_DATA_ROOT`, then `--data-root`; each later source overrides the earlier one.
The selected path is the settlement root above `data/logs`, `data/state`, `data/records`, and `content`, never one of those tiers itself.
Passing a populated `data` directory is rejected rather than silently shifting the plate boundary.

`defaultFilesystemBinding` closes reads, writes, journal witnesses, capability assertions, and derived cuts over that root.
Two transports bound to one root are faces of one managed element.
Two roots never share a journal merely because one OS process hosts both.

Exact journal source artifacts are create-only.
Dependency-closed `WitnessCore` values are admitted; state, record, and content tiers are rebuildable projections.
No mutable projection is authoritative over its exact source artifacts.
Operational accounting ledgers, evidence-flow receipts, and bounded residues are allocated as root-bound source/provenance artifacts when they witness settlement, derivation, coordination, proof execution, or an accounting-bearing operation outcome; replay projects those same root-bound artifacts rather than allocating a fresh ledger.
Dashboards, health readouts, and rendered summaries over those ledgers are rebuildable projections, not sidecar ledgers or external stores.

### 7.2 Deployment artifacts and execution nodes

| Artifact | Execution node and lifetime | Allocation |
|---|---|---|
| `@emsenn/metroplat` source and package projections | The authoritative software-language presentation has no process boundary; its emitted JavaScript projection is a loadable Node library within an embedding process. | The `.mts` source presentation owns program meaning. Build translates it into `.mjs` runtime and `.d.mts` type presentations, and the package manifest exposes the installable projections without making them semantic authorities. |
| `infograph-serve` | Long-running `node:http` process exposing web, HTTP operation, OpenAPI, and MCP-over-HTTP faces; it may co-locate an agent worker. | Binds one settlement root. The worker uses the same binding and journal, never a side store. |
| `infograph` | Transient CLI process: one argv/stdin request, one governed dispatch, then exit. | Binds one settlement root and witnesses arrival, authorization, coordination when required, and outcome in that root. |
| `infograph-mcp` | Long-running stdio MCP process. | Binds one service apex or multiplexes several qualified root-bound apices through `conurbationMcpApex`; every operation retains its root-local closure and journal. |
| `infograph-lsp` | Transient stdin/stdout JSON request-response process. | Stateless: binds no settlement root, admits no event, and is not a managed element. Projects `check`/`infer` (§5.3–§5.4) as hover/diagnostics/references (§7.5's LSP row); a diagnostic reports a `TypeObstruction` verbatim. |
| `infograph-dap` | Transient stdin/stdout JSON request-response process, the time-shaped sibling of `infograph-lsp`. | Stateless: binds no settlement root, admits no event, and is not a managed element. Projects `step`/`eval` (§5.3) as a debug session over the focused reduction context (§7.5's DAP row). |
| `infograph-federation` | Long-running authenticated peer-exchange process. | Binds one settlement root, discovers peers, exchanges exact source artifacts with retry, and quarantines material until identity and dependencies verify. |
| `infograph-orchestrate` | Long-running MAPE-K process operating asynchronous policy loops over several managed elements. | Binds one orchestration root for observations, diagnoses, plans, and decisions; reaches managed roots only through declared touchpoints and governed faces. |

Software-language deployment follows §5.3's presentation discipline.
The `.mts` source, emitted `.mjs` runtime, emitted `.d.mts` type declarations, and packed package are distinct presentations in one language family.
The source-to-emit-to-pack translation composes and preserves declared export identity, type judgments, and operation semantics; the packed manifest names only targets that the installed Node runtime can load and that the package actually contains.
A directory name such as `dist` is one replaceable allocation of the emitted presentation, not the identity or authority of the software.

Language-presentation allocation follows the same split.
Projectors and wire codecs are loadable library artifacts supplied by `@emsenn/metroplat` and selected by a face at the process boundary; they do not bind a settlement root and do not create a managed element.
A root owns only the admitted source artifacts, translation judgments, invocations, and rendered outcomes that pass through its governed pipeline.
RMN, JSON, form, diagram, and document carriers therefore differ by presentation and loss profile, not by deployment authority: a stateless projector may render or read a carrier, while only a root-bound host may admit the resulting language artifact or operation evidence.
### 7.3 Multi-root orchestration

A conurbation MCP process is transport aggregation, not a merged managed element.
Qualifying `root-a:write` and `root-b:write` prevents verb collision while preserving independent bindings; it creates neither a shared journal nor implicit causal edges between roots.

`infograph-orchestrate` owns a separate orchestration root.
Touchpoint readouts and their witnesses are transferred into that root as exact artifacts before `analyze` begins.
`Observation`, `Diagnosis`, `AdjustmentPlan`, and decision artifacts are admitted there under their `LoopId` and frontier.
When `adjust` addresses a managed element, the governed invocation carries the plan and diagnosis addresses; their exact source artifacts accompany or precede the invocation so the target root can verify and admit its local causal receipt without merging journals.

Several orchestration processes may address the same managed element only through its faces.
Their plans are therefore ordinary concurrent evidence: disjoint plans proceed independently, while overlapping plans enter §5.13 coordination.
Process co-location grants no stronger authority than remote touchpoint access.

### 7.4 Replica boundary

Each federation node binds one settlement root and exchanges only exact source artifacts.
Peer discovery establishes an authenticated root identity; transfer verifies content address before storage; missing causal or articulation dependencies quarantine the artifact; retry is idempotent because an exact artifact address is create-only.

Rebuilding from the dependency-closed union of two source sets is independent of reception order.
Federation therefore converges by source-set union without writer election or journal merging.
Network input never enters the admitted frontier merely because transport succeeded: identity, dependency closure, causal admission, and local capability policy remain root-local gates.

**Peer discovery and liveness are a membership problem this document does not need a bespoke solution for.
** Which peers exist, whether each is currently reachable, and how a newly admitted exact artifact's availability reaches the rest of the peer set are three instances of one well-studied distributed-systems problem — group membership and epidemic dissemination — answered here by naming the standard protocol family, not by inventing one.
Each peer's own view of another peer's liveness is an ordinary claim (§5.5), addressed at that peer's identity and valued `alive`, `suspect`, or `dead`; a **SWIM-style** failure detector (Das, Gupta & Motivala, *SWIM: Scalable Weakly-consistent Infection-style Process Group Membership Protocol*, DSN 2002) is the target mechanism producing that claim — periodic direct and indirect pings, timeout escalating `alive` to `suspect`, and a further timeout or a refuting ping escalating or reverting the reading.
A peer's own liveness readings, taken across its local roster, are themselves an `EvidencePresheaf` over the peer-identity site (§5.9): two peers' disagreement about a third's liveness is `contested` by the identical `combine` this document already defines, not a special-cased network-status merge.
Once a new exact artifact is locally admitted, notice of its availability propagates by **epidemic (gossip) broadcast** over the same membership view SWIM maintains — each peer, on receiving notice, forwards it to a bounded random subset of its own roster — so dissemination reaches every reachable peer in a number of rounds logarithmic in roster size, without a central broadcaster.
This governs liveness and discovery only; §7.4's convergence law (source-set union by content address) is independent of which gossip round or SWIM incarnation carried an artifact — a peer that never receives one gossip notice still converges once it later receives the artifact by any other exchange, because convergence is a property of the received source set, not of how or when each element arrived.

### 7.5 Protocol allocation

Every §5 building block that crosses a process, transport, or peer boundary does so through one governed shape — a face (§5.17), a translator (§5.16), a tool (§5.23), or a deployment artifact (§7.2) — while this section allocates that shape to the industry wire contract a conforming integration uses.
The allocation names the protocol vocabulary and MetroPlat artifact a boundary projects; it is not, by itself, an implementation-conformance claim.
§11 records which allocations have deployed handlers, generated schemas, structural codecs, or only target-architecture commitments.

| Building block | Boundary crossing | Standard protocol | Correspondence |
|---|---|---|---|
| Governed operation invocation (§6.1–§6.2, §5.17) | CLI, HTTP action, MCP `tools/call` | **JSON-RPC 2.0**, carried over stdio (CLI, MCP) or HTTP | `RpcInvocation` is one JSON-RPC request; `Judgment⟨A,B⟩` (§5.1) is exactly its `result`/`error` pair, so a face's `present`/`render` (§5.17) is a JSON-RPC codec and nothing more — no second success/failure envelope is introduced at the wire layer. |
| Boundary projection (§3.2, §5.17) | HTTP discovery/health endpoints, OpenAPI clients | **OpenAPI 3.x** | The operation catalog's carriers (§5.2's schema-literal declarations) project directly to an OpenAPI document's request/response schemas; the interface description is generated from the one schema source, never authored a second time by hand. |
| Event notification (§5.15, §5.22) | Cross-instance and cross-platform event delivery, e.g. touchpoint readouts (§5.15) | **CloudEvents 1.0** | An admitted event's `origin`/`address`/`time`/`causes` (§5.5) map onto CloudEvents' `source`/`subject`/`time` and a causal-lineage extension attribute — CloudEvents is a wire encoding of one admitted event, never a parallel notification schema a receiver must reconcile against the journal separately. |
| Language-server projection (§7.2) | Editor/LSP client | **Language Server Protocol (LSP) 3.17** | `infograph-lsp` (§7.2) projects `check`/`infer` (§5.3–§5.4) as `textDocument/hover`, `textDocument/publishDiagnostics`, and `textDocument/references`; a `TypeObstruction` (§5.3) is reported as one LSP diagnostic, not translated into a second error vocabulary. |
| Debug-session projection (§7.2) | Editor/DAP client | **Debug Adapter Protocol (DAP)** | `infograph-dap` (§7.2) projects `step`/`eval` (§5.3) as `next`/`stepIn`/`stepOut`/`continue`; a breakpoint names a term address, and a DAP `variables` request reads the focused reduction's de Bruijn environment — the client single-steps the identical reduction §5.3 defines, never a second evaluator instrumented for observability. |
| Natural-language translator (§5.16) | Unstructured text input | None — an in-process translation, admitted through §5.5 like any other candidate | §5.16's `parseNaturalLanguage` has no external transport of its own; it is one `translate` implementation among possibly several, not a boundary a peer or client connects to. |
| Portable capability token (§5.12) | A capability carried by an external caller, or attenuated by an intermediary before reaching this journal | **Macaroons / Biscuit-style caveat tokens** (Birgisson, Hagblad, Wernerson, Vahidi, Skarin & Landin, *Macaroons: Cookies with Contextual Caveats for Decentralized Authorization in the Cloud*, NDSS 2014; the Biscuit specification for a signed, offline-attenuable variant) | §5.12's caveat chain (`chainStanding`, `discharge`) is this token shape exactly: an ordered, monotone-narrowing sequence of caveat predicates, with a third-party caveat resolved by a discharge correlated by content address — the wire format `Subject` conforms to whenever it must leave this journal's own trust boundary, not a second authorization scheme layered atop it. |
| WebAuthn ceremony evidence (§5.12) | Passkey/FIDO2 credential registration and assertion | **WebAuthn (W3C) / FIDO2** | A registration or assertion ceremony's outcome is admitted as ordinary claim evidence (§5.5) supporting a caveat's `discharge` (§5.12) — this architecture states the ceremony's precondition/postcondition shape (§5.29's relational instrument) as the contract a WebAuthn integration must satisfy, not a cryptographic implementation of the ceremony itself. |
| Federation transfer (§7.4) | Exact source-artifact exchange between peers | Deliberately unnamed — any authenticated bulk-transport binding satisfying content-address verification before storage | §7.4's convergence law (rebuilding from the dependency-closed union of source sets, independent of reception order) depends only on content-addressed, retryable, idempotent transfer, a property several standard transports already satisfy; naming one specific transport here would assert a choice the proved law does not require. |
| Peer discovery and liveness (§7.4) | Which peers exist, and whether each is reachable | **SWIM**-style failure detection (Das, Gupta & Motivala, DSN 2002), dissemination by **epidemic (gossip) broadcast** over the resulting membership view | Detailed in §7.4 above: each peer's liveness reading of another is an ordinary `Charge`-valued claim, disagreement is `contested` by the identical `combine` (§5.9) any other evidence conflict uses, and gossip propagates artifact *availability*, not artifact *content* — the artifact itself still transfers by the content-addressed path this table's Federation-transfer row leaves unnamed. |
| Peer or service discovery at internet scale (§7.4) | Locating a peer or provider by identifier rather than by a preconfigured address | **Kademlia-style distributed hash table (DHT)**, the discovery layer standard peer-to-peer stacks (e.g. libp2p) build the same membership/routing structure from | Named as the shape §7.4's authenticated peer roster generalizes to once a flat, fully-connected peer list no longer suffices at scale; §7.4's own convergence law is unaffected by which discovery layer locates a peer, only by what is exchanged once located, so this row extends §7.4 without amending it. |
| Wire encoding for a replicated CRDT read (§5.13c) | A replica's `EvidencePresheaf` register state, transmitted rather than recomputed from the journal | State-based CRDT synchronization: a full or delta state transfer, deduplicated and merged by `merge` (§5.13c) on arrival | Distinguished from journal replication (Federation-transfer row, above): this is a *derived*-tier (§5.5's `plate:state`) transfer optimization, never a second durable authority path — exact journal artifacts remain the material §7.4's convergence law governs, and a CRDT-state transfer that disagreed with a from-journal rebuild would be the detected error §5.2 already defines, not a reconciliation case. |

## 8. Cross-cutting concepts

Each concept below is used by name from one or more systems in §5. A system's guarantees are only as strong as the concept it cites.
When a concept states a mathematical claim, this section states the mathematics in full and cites the specific Infomaterial declarations that confirm it; when a concept is an architectural commitment over those structures, it is named as such.

### 8.1 Evidence-valued data

**Used by:** §5.8, §5.9, §5.10, §5.11, §5.12, §5.13a/b/c, §5.14 (structurally, for `Corner`).

An evidence value is a pair of two independent bits: `pos` (evidence *for*) and `neg` (evidence *against*).
The four combinations:

| `pos` | `neg` | name | reading |
|---|---|---|---|
| false | false | `kBot` | unknown |
| true | false | `tTop` | held |
| false | true | `tBot` | denied |
| true | true | `kTop` | contested |

Two orders.
The **truth order** (denied < {unknown, contested} < held) answers how much a value supports a claim.
The **knowledge order** (unknown < {held, denied} < contested) answers how much evidence exists — contested knows the most, unknown the least.
Both orders are proved to have commutative, associative, idempotent joins and meets, connected by a proved distributivity law: `∀ a b c. join(a, meet(b, c)) = meet(join(a, b), join(a, c))` and its dual.
`negate` swaps `pos`/`neg`: it reverses the truth order while preserving the knowledge order.

An **interlaced bilattice** is any carrier with two bounded-lattice structures over the same elements — a knowledge lattice (`meetK`, `joinK`, `kBot`, `kTop`) and a truth lattice (`meetT`, `joinT`, `tBot`, `tTop`) — in which every operation of one lattice is monotone with respect to the other lattice's order.
`Charge` is proved exactly this structure (`chargeInterlaced`, `Language/Positing/Four.lean`), and is proved **initial** among all such carriers: `four_initial` states, in one conjunction, that the one map sending `Charge`'s four bounds to a target carrier's four bounds (`boundsMap`) preserves `joinK`, `meetK`, `joinT`, and `meetT` into that carrier, and that any other map agreeing with `boundsMap` on all four bounds is `boundsMap`, pointwise (`boundsMap_unique`) — existence and uniqueness together, the exact content of "initial object" for this category of structures.
`four_rigid` adds the converse direction: when a target carrier's four bounds are pairwise distinct and the carrier holds no element besides those four bounds, `boundsMap` is additionally injective (`boundsMap_injective`) and surjective (`boundsMap_surjective`) — the target carrier is `Charge`, up to this one forced map, not merely receives a map from it.
`negate`, its dual `conflate` (swapping `kBot`/`kTop`, fixing `tTop`/`tBot`), and their composite are proved to form a Klein four-group.
Infomaterial defines this type definitionally as `Articulating.Corner` (`Language/Positing/Four.lean`): the absurd/potential/potential/stable naming and the unknown/held/denied/contested naming are one four-object type at two depths — and §5.14's `Corner` (addressability × assertivity) is the identical bilattice shape applied to a different pair of bits, not a second, independently designed four-value type.

**Where initiality's precondition can fail.
** Initiality is proved for *bounded* interlaced bilattices specifically — boundedness is a hypothesis of `four_initial`, not a fact every carrier with two interacting orders automatically has.
`Record` (`Language/Positing/Record.lean`, the unbounded tally carrier ℕ×ℕ under min/max) is proved to satisfy every interlaced-bilattice law except boundedness: `record_interlaced` holds, while `no_kTop`, `no_tTop`, and `no_tBot` each prove no element of `Record` is an upper (or, for `tBot`, lower) bound of every other element under the relevant order — three of the four bounds `four_initial`'s hypothesis requires simply do not exist on this carrier.
`Record` receives no map from `Charge` by initiality, because it is not initiality's domain of application; `Charge`'s fourth value is therefore a property of carriers that commit to boundedness, not a property every four-valued reading of evidence is forced to have.

**Stone/Priestley duality — proved, not merely a correctness check.
** The four values, under the truth order, correspond exactly to the four clopen up-sets of a two-point topological space: this is a proved bijection, `ClopenUp ≃ Charge` (`four_priestley_dual`), with the explicit table `⟨kBot, tTop, tBot, kTop⟩` matching the four clopen up-sets in order (`four_priestley_dual_table`) — not a correctness heuristic an implementation is merely checked against, but a finite instance of Stone/ Priestley duality with both directions constructed.
Negation corresponds exactly to swapping the two points under this bijection: the swap map on the two-point space induces `negate` transported across the duality (`swap_induces_negate`), and this swap is proved to realize the ℤ/2 gauge generator of the Klein four-group already cited above (`swap_is_z2_negation`) — negation is not merely analogous to a point-swap, it is the transport of the identical group element already named as `K₄`'s generator.

### 8.2 Content addressing vs. concept closure

**Used by:** §5.2, §5.9 (evidence presheaf points and the sheaf-gluing condition `combine` enforces), §5.14.

Two different mechanisms, both real, that must not be conflated.

**Content addressing** (§5.2): a value's identity is the digest of its canonical byte representation.
This answers whether two values are exactly the same bytes.

**Concept closure** (Formal Concept Analysis): given objects, attributes, and a relation between them, `A'` (for a set of objects `A`) is the attributes shared by every object in `A`; `B'` (for a set of attributes `B`) is the objects having every attribute in `B`.
The composite `A''` is proved a closure operator: idempotent and monotone (`∀ A. A'' '' = A''` and `∀ A₁ A₂. A₁ ⊆ A₂ ⟹ A₁'' ⊆ A₂''`).
A **concept** is an (extent, intent) pair where the extent is exactly the objects sharing the intent's attributes — a fixed point of this closure.
This answers whether two descriptions converge to the same thing, a different question from exact byte identity.

**The fundamental theorem of FCA — concepts form a complete lattice, not merely a closure's fixed points.
** The set of all concepts of a context, ordered by extent-inclusion, is proved a genuine `CompleteLattice`: every family of concepts has both a join and a meet, constructed directly (`conceptCompleteLattice`) rather than merely asserted to exist because the ambient powerset is complete.
The underlying Galois connection (object-side and attribute-side derivation, `A ↦ A'`/`B ↦ B'`) is proved antitone and extensive with the double-derivation cancellation `A''' = A'`, one level below and prior to the closure-operator statement above.
**Attribute implications are characterized exactly by the closure**: `B₁ ⟹ B₂` (every object having every attribute in `B₁` also has every attribute in `B₂`) holds if and only if `B₂ ⊆ B₁''` (`implies_iff_closeM`) — an implication between attribute sets is not a separate notion requiring its own proof machinery, it is this one closure read as a subset test.

Concepts are organized by a **site**: points with a covering relation satisfying three proved axioms — self-cover, pullback, composition (`Site/Basic.lean`'s `bitopological_site_grothendieck`): `∀ p. p ⊳ p` (self-cover, `covers_self`); pullback-stability along a sub-clopen (`covers_pullback`); transitivity/local character (`covers_trans`), where `⊳` is `Covers`, the join-cover relation on clopens at fixed `(q, τ)`.
A site point (`Point`, §5.1/§5.9) is closed as `SiteObj Q := ⟨q: Q, tau: Nat, U: Clopen⟩` — a structural coordinate `q` (here `Q := Claim`, §5.3's `PredicationCell`, per `Claim.SitePoint := Site.SiteObj Claim`, `Site/Claim.lean`), a temporal coordinate `tau: Nat` (the settling stratum), and a third field this document had not previously named: `U: Clopen`, a pairwise-Stone clopen (`Clopen := Stone.ClopenUp`, structurally `Bool × Bool` — the identical two-independent-bits shape as §8.1's `Charge`, applied to a different pair of bits).
Covering never constrains the temporal coordinate: the `Covers` relation is proved fiber-local (`covers_is_fiber_local`) — it reads only the `U` leg at a fixed `(q, τ)`, and a family that only advances `τ` while leaving `U` fixed carries no covering content (`no_temporal_covers`) — causal relationships live only in the morphisms between site points (the `τ`-leg, `Advances := Nat.le`), never in the covering structure itself.
This is exactly why §5.9's `EvidencePresheaf` and §5.6/§5.7's causal order/frontier are two independent structures over the same points, never one collapsed into the other.

`Site/Sheaf.lean` packages a settled presheaf as a `Sheaf` — a `Valuation` (the same total `Point → Charge` function §5.9's `EvidencePresheaf` is) together with its **H⁰**, the extent of designated (`tTop`-valued) points.
`combine` (§5.9) is exactly this file's proved section merge: `joinK` on two valuations, proved commutative, associative, idempotent (`joinK_comm'`, `joinK_idem'`, `joinK_assoc'`), and proved to be the pointwise **least upper bound** of its two arguments (`section_lub`) — the sheaf-gluing condition is this least-upper-bound fact, not a check that can fail.
**Separation** (`Sheaf.separated`) is the converse-direction fact §5.9's `agreesOn` states: a `Cover` is a finite list of patches whose union is every point (`Cover.covers`), and two valuations agreeing on every patch of one cover are proved equal — a presheaf carries no reading a cover cannot witness.
`H1rank`'s vanishing (§8.4) is stated over this same merge: `Charge.joinList_congr` proves the knowledge-join of a list of readings depends only on the *set* of readings, never their order or duplication — "H¹ = 0" is this order-independence fact, named cohomologically.

### 8.3 Causal ordering and settlement depth

**Used by:** §5.6, §5.7, §5.10, §5.21.

A finite set of events with a direct, acyclic precedence relation gives, by proved transitive closure, a genuine strict causal order — derived from one acyclicity witness, not three separately posited axioms.
This order generates, by proof, the Alexandrov topology (open sets are exactly the future-closed sets), and continuity in that topology is proved to coincide exactly with monotonicity in the causal order.

Settlement depth is graded by an ordinal type: `zero`; `succ κ` (counting past any finite stage); `limit f` (the least upper bound of a countable sequence, proved to be the actual least upper bound — `Closure/ClosureOrdinal`).
Four regimes are distinguished by the shape of this ordinal: `strict` (finite), `scott` (reachable at ω with no discontinuous jump — proved equivalent to a syntactic finite-antecedent-rules check, `Closure/Regime.lean`), `transfiniteBounded` (a countable limit beyond ω), `aperiodic` (an uncountable limit, κ ≥ ω₁).
Every ordinal constructible from `zero`/`succ`/`limit` using only countable sequences is proved to have a countable cofinal witness — `∀ κ : Ord. ∃ g : Nat → Ord. IsCofinalWitness(g, κ)` (`exists_countable_cofinal_witness`) — so an honest ordinal-based regime reader, built from this construction, is proved to never classify a regime as `aperiodic` (`regimeOfOrdHonest_ne_aperiodic`): detecting a genuinely aperiodic regime requires a different construction than bounded iteration, not merely a claim that bounded iteration happens not to reach it.
Each of the four regimes is realized by an explicit, constructed carrier, not merely classified abstractly: `strict` by the four-element evidence type itself; `scott` and `transfiniteBounded` by an ω-completed tally carrier; `aperiodic` by a germ-preorder carrier exhibiting the lax-slack the strict regimes lack (`regime_tower`) — one derived instance per regime, confirming the four-way classification is inhabited on both sides rather than a partition with untested cells.

At a limit stage, the settled value is proved to be exactly the least upper bound of every prior value.
Separately: `Closure.Ordinal.Finite.settles_by_three` proves every inflationary endomap on the evidence type of §8.1 — not a specific closure, any function satisfying only `∀ a. a ≤ₖ op(a)` — reaches `op³(x) = op⁴(x)`, because the knowledge order has exactly four values and no chain of five distinct elements can exist under it (`Charge.kchain_height`, a finite case check).
This bound is what §5.10's pointwise settling and §5.21's self-revision both cite, and it is proved once, for the general shape, not separately per closure; the ordinal machinery above is the apparatus for settlement processes whose state space is not four elements — the finite-`Charge` case is always the strict-finite regime, never a case the ordinal grading needs to classify further.

### 8.4 Coordination-free merge, confluent checking, and derivation

**Used by:** §5.3, §5.4, §5.9, §5.13b/c, §5.18, §5.20.

**Coordination cost, as an exact arithmetic quantity.
** Model a cover (a set of overlapping regions, §8.2) as three counts: `entities`, `cells`, `components`.
Define `H1rank := (cells + components) − entities`.
This is proved to equal the cycle rank `|E| − |V| + |C|` of the source–stance nerve, and to equal the number of covering pieces that would need removing to reduce the cover to a spanning forest.
It is proved, as a genuine iff, that `H1rank = 0` exactly when the cover is already a forest; "coordination-free" is defined as `H1rank = 0`.
The target coordination law is `H1rank = 0` iff order-independent merge iff confluence iff unique fixed point.
**Entropy, as an exact bit count, not a metaphor for disorder.
** Ȟ¹ is proved exactly Landauer entropy — the physical quantity information theory names for one irreversibly erased bit — by direct definition, not by analogy: `landauerBits(cover) := H1rank(cover)`, and the same excess-over-a-spanning-forest identity §5.13b already states for coordination cost (`landauerBits(cover) = cells − percolationThreshold(cover)`, `landauer_eq_excess`) is this entropy count.
A cover bears load (requires coordination) if and only if it holds positive Landauer entropy (`loadBearing_iff_landauer`): reconciling one more independent cycle a cover fails to glue coordination-free is one more erased bit, never a looser or merely suggestive sense of "information lost.
"

**Confluent merge.
** Any two evidence-valuations' knowledge-join always exists and is a genuine upper bound of both.
Merging lists of updates is proved to depend only on the set of updates received, never order or duplication.
Iterative closure is proved to only ever increase under the knowledge order.

**Confluent term reduction.
** The typed calculus of §5.3 (`Predicating.CurryHowardLambek`) has a reduction relation (`step`, its reflexive-transitive closure `Red`) proved confluent (`church_rosser`) by the standard parallel-reduction (Tait–Martin-Löf) method: a parallel-reduction relation `Par` is proved to satisfy the diamond property via a complete-development function (`dev`, the Takahashi triangle `par_triangle`), and `step ⊆ Par ⊆ Red` transports that diamond to confluence of `Red` itself.
A term of a given type is proved to correspond to a proof of the corresponding proposition (`curry_howard`: when a valuation charges a claim point's *for* bit, every `→`/`×`/`unit` type built over it is inhabited, the term structure tracking the proof) — this correspondence is exactly what makes `derive` (§5.18) a search over the same objects `check` (§5.3) verifies, rather than two different notions of proof.
The cartesian-closed-category laws hold for this concrete model (`ccc_terminal`, `ccc_prod_eta`, `ccc_exponential_adjunction` — terminal object, product universal property, and the currying adjunction `Hom(C×A,D) ≅ Hom(C,A→D)`, bundled as `curry_howard_lambek`), including a proved Beck–Chevalley condition connecting substitution order-independence to evidence-meet associativity/commutativity (§8.1).

**Constructive existentials and forward saturation — the two facts §5.18's search shape is built from.
** `Language/Predicating/Quantifying.lean` defines a `FiniteFibration` — a base map and a finite `fiber` list per point, with `fiber` documented as exactly the data that makes `∃`/`∀` constructive — and defines existential introduction as `existsF(F, v) := λφ. joinList((F.fiber φ).map(v))`: a knowledge-join over the images of an explicitly enumerated, finite fiber, proved to be left adjoint to reindexing along the base map (`existsF_adjunction : leK(existsF(F, v), w) ⟺ leK(v, reindex(F.base, w))`).
`Closure/RuleSystem.lean` defines a rule-firing operator directly over `Valuation` (`PredicationCell → Charge`, `Positing/Valuation.lean`) — the same type §5.9's `EvidencePresheaf` is, not a structurally similar but separate carrier: `Tstep(S, v) := v ∨ₖ fire(S, v)`, where `fire` folds `joinK` over every rule in `S` whose antecedent — itself required monotone in the knowledge order (`ClosureRule.antMono`) — holds at `v`.
`Tstep` is proved inflationary and monotone directly from `joinK`'s own algebra (`Tstep_infl`, `Tstep_mono`), so `Closure.Ordinal.Finite.settles_by_three` applies to it pointwise exactly as it applies to the plain join-closure §5.10 uses for a non-rule-driven claim; `clS`, three `Tstep` applications composed, is proved the least `S`-closed valuation above the seed (`clS_infl`, and its least-fixed-point character in the file's later lemmas) — a proved van Emden–Kowalski forward-chaining construction, over the identical `Valuation` type settlement already closes.
`Predicating/Hyperdoctrine.lean` proves the quantifier adjunction `∃ ⊣ f* ⊣ ∀` together with Frobenius and Beck–Chevalley for the converse generator used in predication (§5.10); fiber completeness for projection generators is an open proof.
No Infomaterial declaration states that a `RuleSystem` used for goal-directed search is complete for an arbitrary derivable goal, or that iterating it to look for a specific goal term, rather than to close a fixed presheaf, terminates at the same three-step bound when the rule set itself is being searched over rather than held fixed — `Tstep`/`clS`'s existing proofs characterize them as a closure operator reaching a fixed point for a given rule system, not as a search procedure complete for a given goal.
§11 states this as a risk.

**What checking, alone, does not provide.
** The calculus of §5.3 proves typing and confluent reduction — checking a term once it exists.
It proves nothing, by itself, about how a term inhabiting a given type is found; that is exactly the role `derive` (§5.18) is introduced to discharge, and `derive`'s own soundness (§5.18's postcondition) is stated entirely in terms of `check`, never assumed independently of it.

### 8.5 Recursive self-revision without collapse

**Used by:** §5.11 (rule store), §5.21, §6.2.

**The impossibility, for two-valued systems.
** A quoting map `q : A → A →` `Y` is **point-surjective** when every function from `A` to `Y` is recoverable as `q` with its first argument fixed: `∀ h : A → Y. ∃ a. ∀ x. q(a, x) = h(x)` (`PointSurjective`).
Given a point-surjective `q`, every function from `Y` to `Y` has a fixed point — `∀ f : Y → Y. ∃ y. f(y) = y` (`lawvere_fixed_point`, the standard diagonal argument: applying `q` to the composite `x ↦ f(q(x, x))` produces a point `a` whose self-application `q(a, a)` is exactly the sought fixed point).
Taking `Y = Bool` and `f = ¬`, which has no fixed point (`∀ b. ¬b ≠ b`, `bool_not_ne`) proves, by contradiction, that no carrier can point-surjectively quote all its own boolean-valued properties — `∀ q : A → A → Bool. ¬ PointSurjective(q)` (`no_boolean_self_quotation`): a system cannot fully represent and revise its own two-valued rules from within.

**How the evidence type of §8.1 escapes this.
** `Language/Settling.lean` names this closure directly: `liarClosure.op(a) := a ∨ₖ ¬a`, proved inflationary, monotone, and idempotent (a genuine `Closure`, the same structure §5.10's ordinary settling closures are).
Its fixed points are proved to be exactly `kBot` and `kTop` (`liar_step_fixed_iff : liarClosure.op(a) = a ⟺ a = kBot ∨ a = kTop`).
An asserted self-referential seed — any `a ≠ kBot` — is proved to always settle at `kTop`, contested (`asserted_liar_settles_kTop`); the silent seed `kBot` stays at `kBot` (`silent_liar_settles_kBot`).
This is the mechanism §5.21 relies on: a rule store built on this four-valued type, rather than `Bool`, holds a claim about its own rules, applies `liarClosure`, and settles at a well-defined value — contested, if the revision conflicts with the prior rule — rather than hitting the impossibility proved above.
Because `liarClosure` is an ordinary inflationary endomap on `Charge`, `Closure.Ordinal.Finite.settles_by_three` (§8.3) applies to it without a separate proof: the three-step bound is not re-derived for the liar case, it is the general bound instantiated at this one closure.

**Termination.
** The closure operators used throughout (settlement's join-to-target and rule-firing closures, §5.10; FCA closure, §8.2; `liarClosure` here) are each proved inflationary and idempotent individually, and the general apparatus they instantiate — `Closure` in `Language/Settling.lean`, and the KZ-monad packaging over it — is proved to have no periodic orbits: a closure cannot cycle back to an earlier, non-fixed value; returning to a prior state after any number of steps means that state was already fixed (`Closure.op_fixed`, `Closure.op_least` establish the fixed point is reached and is least, per closure instance; no closure cited in this document is exempted from these two proofs).
Together these guarantee that rule revision, as specified in §5.11/§5.21/§6.2, converges rather than oscillating.

### 8.6 Optimization fabric and cohomological degree


**Used by:** §5.13b/c, §5.20–§5.22, §5.25–§5.27, §5.32.

MetroPlat does not treat settled claims as weightless symbols.
The same evidence fabric on which work scopes, jural relations, incumbency, and governance operativity are read also carries objective functions for planning, dispatch, reconciliation, and autonomic adjustment.
In industry terms, §8.6 is the cross-cutting cost model for MetroPlat's planners and control loops: a conforming optimizer minimizes unresolved evidence cost subject to typing, causal admission, capability, coordination, and governance constraints already present in the knowledge base.
It does not introduce a second scheduler, physics engine, or scoring store outside §5.11.

Shared frustration lowers record mass.
`theta_record_mass_below_rank` states three facts for the theta parity model: every realizing family has record mass at least one; some realizing family has record mass exactly one; and the theta nerve has `H1rank = 2`.
The architecture reads this as a reusable optimization law: a shared evidence item can discharge more than one coordination debt, so pricing each obligation independently can overestimate the true cost of a composed plan.
This is theoretical grounding for subadditive dispatch cost, not implementation conformance evidence for any present scheduler.

Cancellation in one grade need not eliminate another price.
For a 5–7 dislocation dipole at separation `sep`, `dipole_burgers_linear` states that developing its circuit returns Burgers displacement exactly `(0, −sep)`, while `dipole_frame_neutral` proves the rotational charge cancels at every separation.
The architecture reads this as a multi-grade accounting rule: a plan may neutralize one obstruction dimension and still carry a remaining linear cost in another.
Neutral evidence is therefore not automatically free evidence; every optimizer states which grade it minimized and which residue remains.

Contested truth is the bounded ledger's settlement value.
§8.1's unbounded `Record = ℕ×ℕ` carrier satisfies the interlaced laws but has no knowledge top, while bounded FOUR has `kTop`, the determinate `contested` value.
This architecture adopts the compactification reading as a design correspondence: requiring an otherwise topless evidence ledger to settle inside a bounded carrier gives conflict a stable accounting value instead of Boolean explosion or nontermination.
That reading is consistent with §8.5's formal self-reference result: `asserted_liar_settles_kTop` sends every asserted liar seed to the stable contested value.
Proof-assumption profiles such as `propext` and `Quot.sound` remain attached as priced evidence debt; they do not collapse a declaration to an unqualified pass/fail bit.

Degree one and degree two form one operational ledger.
`H1rank` prices cycles and failed gluing on double overlaps: disagreement between views.
The degree-2 carrier `H² = ker δ² / im δ¹` prices failed gluing on triple overlaps: disagreement between reconciliations, or arbitration about arbitration; `symplectic_form_class_in_h2` supplies theoretical grounding for closed 2-forms living in that carrier.
Every optimization plan therefore carries a bigraded cost `⟨h1, h2⟩`: nonzero `h1` selects consensus, while nonzero `h2` prevents pairwise consensus from pretending to be final and selects higher arbitration.
The resulting class is admitted with the plan and retained through execution.

The degree-2 extension is the architecture's way to preserve phase-like state across adjustments without leaving the evidence ledger.
Where a model supplies an H² phase, curvature, or inertia component, the autonomic manager minimizes unresolved evidence cost subject to that component rather than erasing it as noise.
Thus an adjustment may descend in evidential cost while preserving conserved phase information needed by later planning.

Gauge extensions reuse the evidence ledger.
The gauge program is an explicit design program over the same ledger, not a realized subsystem asserted by this section.
Hypergraph `𝔽₂` contexts, GHZ/Massey arbitration classes, Tate-module circle fibers, graded cup products `H¹ ∪ H¹ → H²`, Wilson plaquette evaluation, and mass–curvature exchange are named target model kinds for extending the ledger.
Until those model kinds are formalized and wired into arbitration/runtime artifacts, §11 carries the evidence and realization gap; the architectural constraint here is only that such extensions reuse the evidence fabric rather than introducing a parallel physics or arbitration engine.

### 8.7 Presentation and projection discipline

**Used by:** §5.3, §5.16, §5.17, §6.1, §6.5, §7.2, §10.

Every externally visible carrier is a presentation of an underlying addressed artifact, never an authority path of its own.
A carrier coordinate, such as a filesystem path spelling, is normalized to the logical presentation it denotes before identity, admission, translation, or projection is read.
That normalization is idempotent: applying it again returns the same logical presentation.
When two carrier spellings denote one logical presentation, a single present carrier may serve the read; simultaneous distinct carriers are a contested presentation obstruction, not a search-order choice.
The cross-cutting rule is:

~~~text
normalize(carrier) = p
normalize(p) = p

read(carrier, presentation) = ok(x)
  ⟹ address(x) = digest(canonicalEncoding(presentation, x.expression))

translate(x, target) = ok(y)
  ⟹ sourceAddress(y) = address(x)
     ∧ semantics(y) = mapSemantics(semantics(x))
     ∧ assertions(y) preserve every declared still-governing assertion of x

project(y, face) = ok(carrier)
  ⟹ face.validationScope and face.lossProfile are declared
~~~

A language presentation contributes grammar, judgments, reduction, semantics, canonical encoding, and carrier-normalization laws.
It does not contribute a second truth value, authorization relation, event store, or operation identity.
A translation is therefore a typed `Judgment`: success carries the source address and declared semantic assertions forward; failure is one of the named obstructions, retained as evidence rather than thrown into host behavior.

Lossless translations round-trip on their declared image.
Lossy projections may cross a face only for the judgments listed in their validation scope, and their loss profile names the information they may omit.
A human-readable document, diagram, form, protocol message, editor diagnostic, debug projection, or path spelling is authoritative only for the judgments it validates; all durable authority still flows through identity (§5.2), admission (§5.5), capability (§5.12), and governed dispatch (§6.2).

This discipline is an architectural commitment over §8.1's evidence values, §8.2's content addressing, and §8.4's checked term reduction.
Its normalization side is grounded by `Infomaterial.Charge.Closure.op_fixed`, which states `c.op (c.op a) = c.op a`; its presentation-translation side is grounded by `Infomaterial.Valuation.reindex_comp` and `Infomaterial.Fibration.reindex_is_bilattice_homomorphism`, which keep composed reindexing and bilattice structure preservation explicit.

### 8.8 Evidence flow and operational accounting

**Used by:** §5.10, §5.18, §5.20, §5.22, §5.27, §6.2, §6.3, §6.4, §10.

MetroPlat treats settlement and rule firing as ordinary operational flow over evidential state.
In industry architecture terms, the same observation stream supports a monotone state-transition system, a work-in-progress/cost-to-complete metric, an auditable accounting ledger, and an internal metering unit for evidence movement.
That internal evidence-flow currency is knowledge-height gained on a finite support of predication cells; it is a unit of account for settlement work, not a financial token, payment rail, blockchain ledger, or second persistence system.

In `Infomaterial/Dynamics/Flow/FreeEnergyLyapunov.lean`, the Lean orbit theorems `Infomaterial.Valuation.fenOrbit_le_succ` and `Infomaterial.Valuation.fenOrbit_monotone` state that the driven closure trajectory is monotone under the knowledge order, one step at a time and across later horizons.
Architecturally, this is the flow-control invariant: a scheduler, planner, or autonomic loop may append observations and rule consequences, but it may not make settled evidence move backward or hide a firing step inside a side channel.

`Infomaterial.Valuation.free_energy_is_lyapunov` supplies the cost-to-complete reading.
For a closure `c`, seed valuation, and finite support `cells`, `freeEnergy(c, seed, cells, n+1) ≤ freeEnergy(c, seed, cells, n)`; if any supported cell changes at step `n`, the next free energy is strictly smaller; and the orbit reaches the settled fixed point in finitely many steps bounded by the initial free energy plus one.
Planning therefore treats unresolved evidence as a decreasing backlog metric rather than as an informal priority score.

`Infomaterial.Valuation.stage_ledger` supplies the audit ledger.
At every horizon `N`, initial free energy equals accumulated orbit flux plus remaining free energy; at quiescence the book closes; each step flux itemizes as `commits + mints + 2*jumps`; and truth-register losses are exactly counted as inconsistency-register gains.
A partial run therefore has a normal accounting shape: receipts plus residue, with no missing balance hidden in the runtime.

`Infomaterial.Valuation.ledger_noether` supplies the conservation check for the evidence-flow currency.
Negation preserves step flux and every itemized register, while conflation reverses the step and exchanges commitments with mints, leaving jumps fixed.
A flow integration that changes the evidential unit of account must therefore name whether it preserves the order-respecting current or deliberately reverses the ledger view.

## 9. Architecture decisions


| ID | Decision | Rationale |
|---|---|---|
| AD-1 | Every claim's evidential status is graded (§8.1), never boolean. | Contested evidence must be representable and retained, not collapsed. |
| AD-2 | Every value's identity is content-addressed (§5.2/§8.2). | Identity must not depend on source, arrival time, or process state. |
| AD-3 | Claims are terms in a typed calculus (§5.3), checked at admission (§5.5) before being stored. | Admission must be a proof-governed gate, not validation layered on top of storage. |
| AD-4 | Derivation (§5.18) is a search over the same terms admission checks (§5.3), never a separate rule-generation mechanism. | A derived claim's soundness must reduce entirely to the one checker every other claim is already subject to. |
| AD-5 | A found proof is executed directly (§5.19): admitting the proof and admitting its conclusion are one operation. | Separating proof from execution would create a second path from derivation to durable state. |
| AD-6 | Authorization is derived from settled evidence (§5.12), never from a separate access-control list. | Authority must be traceable to the same evidentiary record as everything else the system holds. |
| AD-7 | Consensus (§5.13c) is invoked only where a computed coordination cost (§5.13b) is nonzero. | Coordination has a real cost; paying it unconditionally is waste, and avoiding it unconditionally is unsound. |
| AD-8 | Derivation search (§5.18) is forward saturation over the identical `Valuation` type settlement closes, reusing `RuleSystem.lean`'s `Tstep`/`clS` and `Quantifying.lean`'s `existsF`, not backward unification over a separately invented representation. | These two constructions are already proved to act on settlement's own presheaf type, not merely on a structurally similar one; treating derivation as a distinct representation from settlement would discard that shared type for no reason. |
| AD-9 | A question is answered by planning (§5.20) which of direct answer, derivation, or coordination applies, before either derivation or coordination runs. | Running derivation or consensus unconditionally wastes exactly the cost §5.13b/§8.4 already measure a way to avoid. |
| AD-10 | The knowledge base's own rules are claims at the same type as any other claim (§5.11, §5.21, §8.5). | Self-revision requires the rules to be first-class, revisable data, discharged by the same mechanism as any other revision. |
| AD-11 | Cross-instance observation (§5.15, §5.22) reads settled state through the same projector kernel (§5.14) any other boundary crossing uses. | A second, privileged observation channel for cross-instance state would duplicate the one responsibility §2 assigns to the projector kernel. |
| AD-12 | Architecture planning reads local Infomaterial Lean and corpus evidence before introducing new architecture claims, then states the target architecture in ordinary industry terms with evidence labels: checked Lean, corpus theory/reading, architecture correspondence or program, design commitment, or implementation conformance. Lean proof is not required for an architecture claim. | The SAD uses the strongest available evidence without turning missing formalization into missing architecture, turning a useful correspondence into an unearned proof or conformance claim, or hiding a standard state-machine, ledger, backlog, control-loop, or protocol concern behind project-private vocabulary. |
| AD-13 | A tool (§5.23) is authorized by the identical capability mechanism (§5.12) that authorizes any other pipeline effect, and its outcome is admitted through the identical journal funnel (§5.5); it introduces no second authorization check and no second admission path. | A bounded external effect is still a platform effect; exempting it from the ordinary authorization and admission machinery would create exactly the second privileged path §2 forbids. |
| AD-14 | Work scopes (§5.24) are a grammar over the existing `address` field (§5.5), never a second address space; the six work levels are one totally ordered granularity, never six different record kinds. | A separate work-record system would duplicate the one responsibility §2 assigns to the journal and knowledge base. |
| AD-15 | Office incumbency (§5.25) is read as the double settlement of two ordinary `Charge`-valued predicates (recognition, induction), closed by the same knowledge-order construction §5.9/§8.1 already define for any two independent evidence bits — never a bespoke state machine. | A second grading of two-bit evidence would duplicate the interlaced-bilattice construction §8.1 already proves initial for this purpose. |
| AD-16 | Governance operativity (§5.26) is the three-way knowledge-meet of attribution, binding, and becoming, each itself a reading over already-defined structure (observer count, jural-relation join, coordination cost); it introduces no new evidence type. | Treating governance as a Boolean conjunction of three externally-imported modalities would collapse exactly the gap/contradiction distinction §5.8's `Charge` exists to preserve. |
| AD-17 | An endeavor's accumulated capability (§5.27) never regresses across a composed attempt, whether or not that attempt's realized outcome matched its intended target; a failed attempt is retained as evidence, never flattened to "not done." | Collapsing failure to non-completion would violate the Evidential integrity quality goal (§1.2) applied to endeavors specifically, discarding exactly the capability a failed attempt accumulated. |
| AD-18 | A settlement's plate (§5.5's tiers, §5.28) is read only through a live managed element's own interface when one is running (`inhabited-live`); direct excavation is lawful only when no managed element is running (`bare-dead`, `inhabited-dead`). | A live managed element is the most specific recognizer of its own settled state; a direct read that bypassed it could return a cut already superseded by the managed element's own derived views. |
| AD-19 | "Settlement" (§5.28), not "territory," is this document's name for a storage site's inhabited state, reconciling a naming split in this architecture's own source material rather than silently picking one term without recording the other. | Two names for one referent, left unreconciled, would eventually be read as two different systems, violating §2's one-owner-per-responsibility rule at the level of vocabulary rather than code. |
| AD-20 | A relational instrument (§5.29) is read as a field of prepared obstructions a move is checked against, never as an operation with a body; its precondition/postcondition gate is the instrument-level restatement of admission's typing-before-durability discipline (§5.5). | Reading an instrument as an operation rather than a checked field would reintroduce exactly the validation-layered-on-storage pattern AD-3 already forecloses, one level up. |
| AD-21 | A field's common ground (§5.30) is graded on two independent axes — static gluing (obstruction = 0) and dynamic regime (§8.3's ordinal grading) — and this document states no law collapsing one into the other. | A field can be coordination-free at the current frontier while still settling under a regime that does not guarantee it stays so; conflating the two axes would silently overclaim a stability property this architecture has not proved. |
| AD-22 | Kinematic ground (§5.31) is a name for a frontier's history (§5.7) read as a comparable region, not a new construction over the causal order; `groundOf(f).events = historyOf(f)` exactly. | A second, independent way to compute "the events reachable from a frontier" would risk the two falling out of sync; naming §5.7's own output is strictly cheaper and cannot drift. |
| AD-23 | ACRA/MAPE-K (§5.32) is external terminology for the architecture owned by §5.22; `observe`/`analyze`/`planAdjustment`/`adjust` are the outer Monitor/Analyze/Plan/Execute stages, not a parallel subsystem. | One owner preserves the causal chain from observation through diagnosis and plan to execution while allowing ACRA readers to recognize the standard structure. |
| AD-24 | Analyze and Plan are discrete stages at both MAPE-K scales; every loop admits `Observation`, `Diagnosis`, `AdjustmentPlan`, and decision artifacts under a stable `LoopId`, cadence, and causal frontier. | Independent diagnosis audit and asynchronous policy-loop composition require stage artifacts that cannot be overwritten or inferred after execution; overlapping plans use §5.13 coordination rather than last-writer-wins policy state. |
| AD-25 | Arena, strategy, and play (§5.33) reuse §8.1's polarity-shaped bilattice construction for Player/Opponent rather than introducing a third two-valued carrier, and read a strategy's enabling relation through the existing rule-store/derivation mechanism (§5.11, §5.18) rather than a new `Rule`/`Law` primitive. | A second bespoke two-bit polarity type, or a second rule-firing mechanism parallel to §5.11/§5.18's, would duplicate exactly the structure §2 requires this architecture to own once. |
| AD-26 | Planning, work dispatch, jural/governance readings, and autonomic adjustment are optimizations over the one evidence fabric (§8.6); higher cohomological degree extends that ledger rather than introducing a parallel physics or arbitration subsystem. | The same priced contradiction must remain traceable from claim through obligation, reconciliation, and physical correspondence; a second optimizer would sever that evidence path and duplicate §5.11's knowledge substrate. |
| AD-27 | A settlement root, not an OS process or transport connection, is the stable persistence allocation of a managed element (§7); every stateful face closes over one root, and conurbation multiplexing preserves root-local journals. | Treating two faces over one root as replicas would duplicate one journal, while treating several roots in one MCP process as one element would erase the causal and capability boundary each binding preserves. |
| AD-28 | The canonical runtime unit is one witnessed operation invocation (§6.2); planning, derivation, consensus, proof execution, and rule revision compose as causally linked invocations rather than hidden phases inside every request. | Keeping each decision and effect as its own invocation preserves content identity, authorization, replay semantics, and journal evidence; an implicit super-pipeline would create an unauditable execution path beside `dispatch`. |
| AD-29 | The MetroPlat system boundary is the induced operation host together with its bound settlement root (§3, §7); Infomaterial, downstream applications, external providers, and other settlement roots remain context actors even when their material is read or embedded. | Keeping mathematical evidence, domain ownership, host effects, and independently settled plates outside the entity prevents a package import or protocol connection from silently acquiring journal ownership or implementation-conformance status. |
| AD-30 | Reconciliation is cohomologically graded: H¹ governs disagreement between readings and selects consensus; H² governs disagreement between reconciliation results and selects higher arbitration (§§5.13, 8.6). | Pairwise consensus is not globally final when triple-overlap results fail to glue. Retaining the nonzero class prevents an arbitrator from erasing evidence or disguising arbitration as another vote. |
| AD-31 | Deduction is complete relative to an explicit finite `SearchBound`, chooses the least-address reachable proof, and returns either an admitted `Derivation` with trace/cost or a bounded exhaustion certificate; proof execution accepts that derivation rather than a detached proof (§§5.18–5.19). | This gives planning a deterministic, replayable resource contract without claiming global decidability, and prevents execution from discarding how a proof was found. |
| AD-32 | Frontier identity commits one exact validated causal closure together with its maximal tips; frontier merge is the bounded union of those histories (§5.7). | Tip-only identity would conflate partial observers that happen to share maxima and erase the observation boundary; history-union preserves spacelike tips and gives frontier merge a canonical join. |
| AD-33 | `Subject` (§5.12) is always a caveat chain — an initial grant plus an ordered, possibly-empty sequence of `Charge`-valued caveat predicates — reduced to one `Charge` by `chainStanding`'s knowledge-meet before `enforce` applies; a single-grant subject is simply the empty-sequence case, not a second `Subject` representation. | Every capability that might ever need to cross a boundary this architecture does not journal must already be shaped as a chain; retrofitting chains onto a bare-grant `Subject` later would be a breaking change to every existing caller of `appraise`. |
| AD-34 | A third-party caveat's standing moves from `unknown` only through `discharge` (§5.12), an ordinary claim admission correlated to the caveat by content address; no other operation may set a third-party caveat's standing. | A capability that could be authorized by any path other than an admitted, content-addressed discharge would reintroduce exactly the second, ungoverned trust path §5.12's opening paragraph already forecloses for ordinary capabilities. |
| AD-35 | `merge` (§5.13c) is named exactly as a state-based CRDT join (§7.5): its proved join-semilattice laws are the antecedent the CRDT strong-eventual-consistency theorem requires, so replica convergence follows from that existing proof rather than a separately asserted convergence property. | Citing the CRDT correspondence by name lets a future replication implementation reuse a settled distributed-systems result instead of re-deriving convergence from first principles. |
| AD-36 | Natural-language grammaticality is `parseNaturalLanguage` (§5.16), Lambek-calculus proof search in a substructural fragment of §5.3's typed calculus; knowledge-base concept formation is `conceptsOf` (§5.20), a Formal Concept Analysis closure satisfying the same extensive/monotone/idempotent closure shape §5.10 uses. The target architecture assigns both operations to one FCA–Lambek correspondence — one language-substrate structure read through grammar and concept formation — rather than two independently invented mechanisms. | Introducing either as unstructured prose rather than a named operation with its own obstruction and postcondition would violate §2.3's constraint that §5 states operations, obstructions, conditions, and laws. Treating the Wurm/model-theoretic completeness edge as design correspondence rather than runtime conformance keeps the decision usable while §11 tracks the missing admitted theorem and composed implementation. |
| AD-37 | §7.5 names one standard protocol per boundary-crossing building block (JSON-RPC, OpenAPI, CloudEvents, LSP, DAP, macaroon/biscuit-style caveat tokens, WebAuthn, SWIM, Kademlia-style DHT, state-based CRDT sync) rather than leaving protocol choice open per integration. | An ad hoc per-integration protocol choice would violate §2's one-owner-per-responsibility rule at the wire level exactly as a duplicated journal would at the storage level; naming the standard once gives every future integration for that boundary one answer. |
| AD-38 | §7.4's federation transfer names no specific bulk-transport protocol, only the content-address-verification property its own convergence law requires (§7.5); peer liveness and discovery are named separately (SWIM, gossip, Kademlia-style DHT) because they govern a different concern — reachability and routing, not artifact convergence. | The convergence law holds for any transport satisfying content-addressed, retryable, idempotent delivery, so naming a specific transport would assert a choice the law does not require; naming liveness/discovery protocols separately keeps that distinction visible rather than bundling two different properties under one allocation. |
| AD-39 | Every carrier is a language presentation over an addressed artifact, never its own truth, authorization, persistence, operation-identity, or program-authority path (§§5.3, 6.5, 7.2, 8.7, 10). For software, authoritative source, emitted runtime and type artifacts, and the packed package are presentations in one language family: source-to-emit-to-pack must compose, preserve declared export identity, type judgments, and operation semantics, and expose only installable targets. | Infomaterial's `reindex_comp` supplies the correspondence for composed presentation changes and `reindex_is_bilattice_homomorphism` supplies the preservation model for evidential operations; these ground the required witness shape without claiming compiler conformance. Generated artifacts remain replaceable projections, so Markdown, JSON, software builds, diagrams, protocol messages, editor diagnostics, and debug sessions gain no bypass around admission or a second semantic authority. |
| AD-40 | Settlement, derivation, coordination, proof execution, and accounting-bearing operation outcomes use §8.8's operational accounting ledger as the evidence unit of account: plans forecast cost-to-complete, receipts, and residue; runs reconcile the observed ledger at admission boundaries; replay projects the already-admitted outcome ledger rather than minting fresh provenance; and no runtime may treat an unpriced branch choice as completed evidential work (§§5.10, 5.18–5.20, 6.2–6.4, 10). | `free_energy_is_lyapunov` gives a decreasing backlog metric, `stage_ledger` gives receipts plus residue, and `ledger_noether` fixes conservation under negation/conflation. Making that ledger causal outcome provenance keeps proof-search resource cost separate from evidence-flow currency and prevents hidden derivation, coordination, or retry work from bypassing audit. |
## 10. Quality requirements

See §1.2 for the quality-goal tree.
Each row is a target acceptance scenario for a conforming MetroPlat system.

| Scenario | Governing system | Measure |
|---|---|---|
| Two sources assert conflicting claims about the same entity. | Conflict (§5.13a), knowledge base (§5.11), settlement (§5.10), evidence presheaves (§5.9) | The reading is `contested`; both evidential contributions remain retained and queryable. |
| The same content is submitted twice, from different translators. | Identity (§5.2) | Both submissions resolve to one address. |
| The same admitted, downward-closed history is presented in different event orders. | Frontier computation (§5.7) | Both presentations produce identical closure and frontier addresses and the same sorted maximal tips. |
| Two partial frontiers have spacelike maximal tips. | Frontier merge (§5.7) | Their merge commits the union of both histories, retains both tips, and is commutative. |
| A candidate event fails typing, or would close a causal cycle. | Journal admission (§§5.4–5.6) | Admission returns an explicit obstruction and records no partial event. |
| Two settlement processes derive claims over overlapping covers. | Coordination (§5.13b), reconciliation (§5.13c), §8.4 | `coordinationCost` is computed; zero permits `merge`, while nonzero requires `requestConsensus` before either process proceeds. |
| Three pairwise consensus results are locally valid but disagree on a triple overlap. | Higher arbitration (§5.13d), optimization fabric (§8.6) | `arbitrationClass` is nonzero and `requestArbitration` is mandatory; success admits an `ArbitratedReading` whose derived family has `zeroH2`, while failure preserves `UnresolvedClass`. |
| A question is answerable directly from settled state. | Query planning (§5.20) | `plan` returns `AnswerDirectly`; `derive` is never invoked. |
| A needed claim has a proof reachable inside the declared finite search bound. | Deduction (§5.18) | `derive` returns the canonical `Derivation` iff such a proof exists; otherwise `ExhaustedBound` carries a verifiable certificate covering that bounded space, never a global underivability claim. |
| A derivation's conclusion must become durable without losing search provenance. | Proof execution (§5.19) | `execute` accepts the admitted `Derivation`; the resulting event contains its proof and conclusion and names the derivation address among its causes. |
| An evidence-flow run is observed before or at quiescence. | Evidence flow and operational accounting (§8.8), settlement (§5.10), query planning (§5.20), proof execution (§5.19) | Its cost-to-complete never increases; any supported firing strictly decreases it; every reported horizon balances initial cost as evidence-flow receipts plus residue, and at quiescence the residue is zero. The internal unit of account is knowledge-height over the declared support; receipts itemize commitments, mints, and jumps according to §8.8. |
| A claim about the knowledge base's own settlement rule is asserted and settled. | Self-revision (§5.21, §8.5) | Its evidential value stabilizes within three revision steps; revision neither loops unboundedly nor bypasses ordinary admission. |
| A request arrives at a new face. | Faces (§5.17, §6.1) | The face projects into the one governed request pipeline and introduces no protocol-specific authorization or admission path. |
| A boundary artifact must move between language presentations before use or rendering. | RMN and the language substrate (§5.3), language admission and projection (§6.5), faces (§5.17) | A successful translation retains the source address and declared semantic assertions; a lossless translation round-trips on its declared image, while a lossy projection names its validation scope and loss profile before it can serve a face. |
| A committed intent's effect crosses the platform boundary. | Tools (§5.23), capability (§5.12) | `invoke` obstructs unless standing is `held`; attempt, decision, and outcome remain journal-witnessed, never a side channel. |
| A retry repeats an invocation whose accounting-bearing outcome is already witnessed. | Retry and replay (§6.3), governed dispatch (§6.2), evidence flow and operational accounting (§8.8) | The repeated request resolves to the same invocation address and projects the prior `metroplat.rpc.outcome`; any attached operational accounting ledger, receipts, and residue are unchanged. No new evidence-flow receipt is counted unless a distinct invocation identity is admitted first. |
| Settled state across managed elements must inform routing without case-by-case operator decisions. | Orchestrating autonomic manager (§5.22), touchpoints (§5.15) | `observe`, `analyze`, `planAdjustment`, and `adjust` produce causally linked observation, `Diagnosis`, adjustment-plan, and decision artifacts; execution uses only capability, knowledge-base, or rule-revision interfaces. |
| A candidate reaches full incumbency only when recognition and induction independently settle. | Jural relations, office, and incumbency (§5.25) | `invest` reads `dignitas` iff both predicates are `held`; one held predicate yields `munus` or `recognition`, never full incumbency. |
| Attribution, binding, and becoming are independently settleable but jointly required for a governance act. | Governance operativity (§5.26) | `operativityOf` is `held` iff all three axes are `held`; an `unknown` gap remains distinct from a `contested` axis. |
| An agent fails an attempt within a sustained endeavor and continues. | Endeavor (§5.27) | `continue` retains the failed attempt and composes the next; accumulated capability does not regress. |
| A caller reads a settlement plate while a managed element is running over it. | Site and settlement (§5.28) | `excavate` always obstructs at `inhabited-live` and routes the caller to the managed element's `read`/`query` interface. |
| A caller proposes a move whose precondition a relational instrument does not satisfy. | Relational instrument (§5.29) | `checkMove` returns a `PreconditionObstruction` naming the failed predicate; postcondition evaluation is unreachable. |
| Two named observers disagree and a third needs their merged reading. | Field and common ground (§5.30) | `groundOf` computes the knowledge meet through declared translations and reports any nonzero obstruction without silent resolution. |
| Concurrent settlement processes must determine whether their covers occupy the same causal region. | Kinematic ground (§5.31) | `overlapOf` uses `before` alone; empty overlap is the region-level form of §5.13c's disjoint-region case. |
| Two asynchronous autonomic loops share knowledge while operating at different cadences. | MAPE-K reading (§5.32), orchestrating autonomic manager (§5.22) | Each loop retains its own admitted `Observation`, `Diagnosis`, `AdjustmentPlan`, and Execute decision under its `LoopId`, cadence, and causal frontier; Analyze selects no action, Plan cannot rewrite the diagnosis, and neither loop overwrites or silently subsumes the other's policy evidence. |
| Player commits to a strategy and Opponent makes a legal move that strategy would refuse. | Arena, strategy, and play (§5.33) | `strategyOf` returns `NotReceptive`; the strategy is never admitted as well formed. |
## 11. Risks and technical debt


| Risk | Evidence boundary and treatment |
|---|---|
| Aperiodic regime unreachable by bounded iteration | §8.3's bounded ordinal construction cannot detect a genuinely aperiodic settlement regime. Any requirement to detect one needs a different construction. |
| Peer replication and federation transport are not deployed | Journal artifacts converge under source-set union, but no process performs peer discovery, artifact transfer, retry, or network quarantine. `infograph-federation` discovers bindings; it is not a replication node. |
| The ecosystem orientation overstates the koios.news migration | The root README calls `@emsenn/koios.news` a direct MetroPlat consumer, while its `package.json` has only legacy dependencies. Migrate the package or correct the orientation; §3 does not count it as verified. |
| The orchestrating autonomic manager has no deployment artifact | §§5.22/7.3 allocate `infograph-orchestrate` with its own orchestration root and `observe`/`analyze`/`planAdjustment`/`adjust` loops; no such executable or long-running cross-root manager exists in the realized system. |
| The derivation-and-revision runtime is not composed | No catalog family or driver composes §6.4's `plan → derive` or `requestConsensus → arbitrationClass/requestArbitration → admission → rule revision` branches. The target runtime remains uncomposed. |
| The RPC coordination branch has no production coordinator | `dispatch` tests fail-closed handling of `coordination-required`, but composition roots install no `RpcCoordinate`, and the default catalog marks no operation that way. §6.2's gate is not deployed. |
| Degree-2 arbitration and gauge structure lack formal and runtime realization | §§5.13d/8.6 require `arbitrationClass`, `requestArbitration`, admitted `H2Class`/`ArbitratedReading` artifacts, and a gauge-extension program covering GHZ/Massey arbitration classes, Tate-module fibers, graded cup products, Wilson plaquette evaluation, inertia/light, and mass–curvature exchange. Infomaterial grounds an H² carrier for closed 2-forms via `symplectic_form_class_in_h2`, but the named GHZ/Tate/Wilson model kinds are not present as Lean declarations, and no theorem proves `zeroH2` iff reconciliation results glue or that arbitration discharges the class; runtime components expose H¹ costs only and implement none of these obligations. |
| CALM correspondence is certified for one model | §§5.13c/8.4 state the cover-model convergence bundle around §5.13b's H¹ coordination-cost trigger. `CRDTCohomologicalCALM.lean` supplies four unconditional modal-lattice facts, not a general biconditional separating non-monotone, nonzero-H¹ cases. |
| Fiber completeness is open | §8.4 cites quantifier adjunction for the converse generator. No result establishes fiber completeness for projection generators. |
| Bound-relative derivation completeness lacks formal proof | §5.18 requires `derive` to succeed iff a proof is `reachableWithin` the finite `SearchBound` and to choose the least-address proof. `RuleSystem.lean` proves fixed-rule `Tstep`/`clS` closure and `existsF` finite fibers; `RuleDynamics.lean` settles rule generators, but neither proves this goal-specific bounded equivalence. |
| Derivation traces, costs, certificates, and execution are unrealized | §§5.18–5.19 require `SearchCost`, content-addressed `DerivationTrace`, verifiable `ExhaustionCertificate`, canonical proof selection, and `execute(Derivation)`. No catalog family or runtime driver produces, verifies, persists, or executes these artifacts. |
| Operational accounting ledgers are not yet integrated into derivation/runtime provenance | §§5.10/5.18–5.20/6.2–6.4/10 require `settle`, `derive`, `execute`, the derivation-and-revision driver, accounting-bearing `metroplat.rpc.outcome` admission, and replay projection to carry or preserve `OperationalAccountingLedger` forecasts, receipts, and residue as causal provenance. Runtime code has stable invocation identity, idempotency-key handoff, and attempt → decision → outcome witnessing in `src/rpc/invocation.mts`, `src/rpc/dispatch.mts`, and `test/rpc.test.mjs`; it also has a finite ledger model and law witness in `src/lib/math/topology/flow.mts`, a proof-health `evidence-flow-accounting` operation in `src/modules/workbench/proof-health/service.mts`, and `test/evidence-flow-operational-accounting.test.mjs`. Those are implementation evidence for RPC witnessing/replay shape and finite accounting laws, not conformance evidence for the settlement, derivation, execution, accounting-bearing outcome, or replay-ledger contracts. |
| FCA–Lambek completeness is a design correspondence, not an admitted theorem or composed runtime | AD-36 and §5.16 use the FCA–Lambek correspondence to keep natural-language grammaticality and knowledge-base concept formation in one language-substrate architecture. Local Infomaterial evidence proves the FCA closure laws and concept-lattice completeness shape (`fca_closure_laws`, `concept_lattice_is_complete`) plus the residuated-lattice-to-commutative-Lambek algebraic edge (`residuated_lattice_is_commutative_lambek`), while the Wurm completeness edge is documented as model-theoretic corpus evidence in `Infomaterial/Calculus/Logic/FCALambekCircle.lean`, not formalized as a Lean declaration and not realized as a composed `parseNaturalLanguage`/`conceptsOf` runtime. |
| Query planning and direct-answer read models are not yet one composed runtime | §5.20 requires a total `plan : Question × Frontier → Plan`, a range-restricted fixed-point relational `evaluateQuery` over journal facts, and a formal-context `conceptsOf` read model over the same frontier relation. The realized codebase contains vault/workspace query services, finite FCA witnesses in `src/lib/math/topology/fca-lambek-circle.mts`, RMN formal-concept terms in `src/lib/language/stdlib/connecting/formal-concept.mts`, and Datalog-shaped reaction support witnesses, but no composed planner that chooses `AnswerDirectly`, `Derive`, or `Coordinate` and no journal-frontier Datalog engine or concept-closure read model satisfying §5.20 end to end. |
| Duplicated responsibility is a defect, not a variant | Under §2, a second implementation of a §5 responsibility is merged into the named owner and removed, not recorded as an architectural alternative. |
| Frontier theorem bundle is absent despite finite runtime conformance | §5.7 requires validated closure manifests, exact maximal tips, round-trip canonicity, and join-semilattice frontier merge. Infomaterial proves `reaches_trans`, `reaches_asymm`, and `past_is_downward_closed` for its causal structures, but defines no frontier/maximal-tip/merge theorem bundle. MetroPlat's finite `deriveFrontier`/`mergeObservedFrontiers` slice and journal-causal tests conform to the target contract; that implementation evidence is not a Lean proof of the abstract laws. |
| `presheafOf`/`posit` lacks a cited construction | Infomaterial proves evidence combination, gluing, and reading, but no declaration constructs a presheaf from one predicated claim. The §5.9/§5.10/§5.14 builder remains SAD vocabulary. |
| Term-reduction termination is uncited | `church_rosser` establishes confluence, not strong normalization. No cited declaration supports §5.3's claim that `eval` always reaches normal form. |
| Software source-to-package translation is structurally checked but not semantically witnessed | §7.2/AD-39 require the `.mts` source, emitted `.mjs` runtime, emitted `.d.mts` types, and packed package to form one compositional, judgment-preserving language family. The realized publication policy checks target existence, executable bins, package-files coverage, and native Node runtime target form; the compiler build and package checks are bounded conformance evidence. They do not yet produce a typed `Translation` witness proving preservation of export identity, type judgments, and operation semantics across source-to-emit-to-pack, and native Node rejects TypeScript runtime entrypoints beneath `node_modules`. |
| Generic language-presentation projection laws are only partially realized | §5.3/§8.7/AD-39 require `LanguagePresentation`, typed `Translation`, declared validation scope, and projection loss profiles. Runtime code has RMN admission/wire projection, concrete `Projector`/`WireCodec` adapters, language-bundle decidable-read conformance, the development dialect, and the arc42 SAD workbench projection set (`src/integrations/filesystem/services/arc42-sad-workbench.mts`, `test/arc42-sad-workbench.test.mjs`): XML, HTML, and RMN projections carry content addresses, carrier identity, media type, validation scope, loss profile, language artifacts, translation witnesses, and shared semantic-address projection families under a validating response contract. That is implementation evidence for bounded arc42 architecture-description projections, not conformance evidence for a single generic kernel recording every presentation, translation obstruction, validation scope, and loss profile as typed language artifacts. |
| An event's origin has no cited construction | Claim/address and causes are grounded, but no Infomaterial declaration models `CandidateEvent.origin`. `VerificationTournament` models contest participants, not an admitted event's asserted origin. |
| `adjust`'s decision procedure is uncited | §5.22 constrains where decisions route, but no declaration derives routing or rule revision from `Map⟨ManagedElement, Charge⟩`, or proves that cross-element procedure's closure or coordination properties. |
| The network-sheaf-on-agent-graph theorem is corpus-proved, not Lean-checked | The corpus proves the H⁰/knowledge-join/vanishing-δ⁰ specialization using cited coordination machinery; Infomaterial has no graph-of-agents declaration. Its identity/sybil automorphism extension remains partial/sketch. |
| Meaningful human control and physical-actuation safety are unintegrated | Corpus material defines a four-predicate human-control gate plus reachability, barrier-function, and safe-envelope schemas. These are not integrated into §§5.29/5.32 and should ground a future physical-actuation block. |
| Office, incumbency, and jural relations lack an Infomaterial citation | AD-15 reuses `Charge` for double settlement, but Lean names no Hohfeld eightfold or office/incumbency structure. The K₄×ℤ/2 orbit is a corpus sketch; an older Heyting lineage is unreconciled. |
| Governance operativity's three primitives are a design decision | Corpus Gov/CHL theory motivates attribution, binding, and becoming, while Cartesian closure and its four-valued classifier remain open or conjectural. §5.26 adopts only the decomposition and knowledge meet. |
| Endeavor composition reuses a corpus-proved monad without an Infomaterial citation | The corpus proves a strong endeavor monad and monotone capability law. Infomaterial's adjacent KZ closure monad has a different carrier and does not discharge §5.27's endeavor claims. |
| Campaign, work relations, hand-off, and roadmap have no building block | An engineering plan names these concepts, but §5 does not derive or own them. Any future block must be grounded from sequencing/facilitation and conflict machinery rather than adopting plan vocabulary directly. |
| Duplicate work-vocabulary lineages are unreconciled | Archived ICK, the archived ops.561 work ledger, and live MetroPlat agree on six work levels and Hohfeld's eightfold but are not one continuous lineage. The SAD follows the live implementation and newest corpus theory. |
| “Site” names two unrelated structures | §8.2's Grothendieck site and §5.28's storage location are not unified. The latter is qualified as “storage site” outside §5.28. |
| Site and settlement's occupation axis lacks an Infomaterial citation | §5.28's bare/inhabited × dead/live classification is not stated in Lean. Crystal occupancy is a one-axis lattice count, and `Settlement.lean` does not model process liveness. |
| “Ground” has three unreconciled senses | §5.31 adopts a bounded causal region. A HoleDiamond causal carrier is nearby but not proved identical; §5.28's bare-dead “unclaimed ground” is deliberately named differently. |
| “Field” (§5.30) is a design decision | Earlier `Field := Claim → Charge`/Lean `Valuation` is single-observer, while §5.30 is multi-observer; an archived Social Field is unrelated. The SAD grounds its use by generalizing §§5.8–5.9. |
| “Workbench” has no quantified-law content | Live workbench modules aggregate lower operations; historical material also calls the directory the ACRA Monitor touchpoint home. The SAD does not make Workbench a separate §5 block; a future definition should bind it to Monitor. |
| Separated MAPE-K stages and multi-loop scheduling are unrealized | §§5.22/5.32 require a stable `LoopId`/cadence and an admitted `Observation → Diagnosis → AdjustmentPlan → Decision` chain. No runtime composes these artifacts or coordinates overlapping fast/slow-loop plans, so diagnosis audit/replay and multi-loop policy provenance remain unrealized. |
| Arena, strategy, and play package uncited constituents | §5.33 bundles individually grounded structures, but the paper leaves that record open. An archived TypeScript concurrent-game realization is prior art, not an Infomaterial or corpus proof of the package. |
| §7.5's protocol allocations mix deployed projections, structural codecs, and target-only integrations | JSON-RPC/MCP/OpenAPI and the stateless LSP projection have current source artifacts (`src/rpc/*`, `src/presentation/*`, `src/sites/mcp/*`, `src/scripts/infograph-lsp.mts`, `src/sites/lsp/*`). CloudEvents, macaroon-style caveat tokens, WebAuthn ceremony records, and ActivityPub/CloudEvents bridging are present as structural codecs or deterministic models (`src/lib/codecs/cloudevents/*`, `src/lib/capability/macaroons/*`, `src/sites/federation/webauthn.mts`, `src/sites/federation/activitypub/*`), not as evidence of deployed cross-instance delivery, production cryptography, or externally certified protocol conformance. `parseNaturalLanguage`/`evaluateQuery`/`conceptsOf` (§5.16/§5.20, AD-36), `infograph-dap` (§7.2), SWIM liveness, Kademlia-style discovery, and CRDT-state wire sync (AD-35) remain target-architecture allocations with no catalog operation or executable integration behind them yet. |
## 12. Glossary


| Term | Definition |
|---|---|
| Value | Data with no obligations attached to it (§5.1). |
| Operation | A rule producing a value from values, with no memory of prior invocation (§5.1). |
| State | A value persisting across invocations, changing an operation's future output (§5.1). |
| Routine | An operation together with the state it consults and updates (§5.1). |
| Engine | A routine with a fixed, general-purpose operation applied to an external input stream (§5.1). |
| Store | A routine whose only operation is retention and retrieval by address (§5.1). |
| Service | A routine reachable only through a declared interface (§5.1). |
| Platform | The graph of services, engines, and stores reachable without crossing a protocol boundary (§5.1). |
| Tool | A bounded-effect routine invoked from outside a platform's ordinary call graph, itself authorized (§5.1, §5.23). |
| System | A named grouping of routines discharging one stated responsibility (§5.1). |
| Translator | A routine turning outside input into a platform's native event representation (§5.1, §5.16). |
| Face | A structure-preserving presentation of the request pipeline to one external protocol (§5.1, §5.17). |
| Wire contract | The externally visible protocol grammar, message shape, and interaction rules a face, tool, translator, or deployment artifact uses at a boundary (§7.5). |
| Protocol allocation | The architecture decision assigning one boundary-crossing building block to a named wire contract, so future integrations reuse that standard instead of choosing an ad hoc protocol (§7.5, AD-37). |
| Conformance evidence | Implementation, test, generated-schema, model-checking, or external-certification evidence that a realized face actually satisfies its allocated wire contract; distinct from the target architecture allocation itself (§7.5, §11). |
| Structural codec | A pure translation or validation model for a protocol shape that preserves MetroPlat identity and judgments, but does not by itself prove deployed transport, production cryptography, or certified protocol conformance (§7.5, §11). |
| Judgment | The total result type of a fallible operation: a success value or a named obstruction, never both or neither (§5.1). |
| Language presentation | A language surface as grammar, judgments, reduction, semantics, and canonical encoding, so a carrier is evaluated by the laws it declares rather than by its file format (§5.3). |
| Language artifact | A content-addressed expression together with its language, optional type, and evidential assertions (§5.3). |
| Translation | A typed judgment from one language artifact into another presentation, retaining source address and semantic assertions when successful and returning a named obstruction when not (§5.3). |
| Language family | Presentations sharing a semantic carrier and lawful translations without requiring their surface syntaxes to coincide (§5.3). |
| Dialect | A constrained language family whose admitted forms and progression are fixed (§5.3). |
| Projection (language) | A presentation-to-presentation mapping that declares its target language, validation scope, and loss profile (§5.3). |
| Loss profile | The named information or judgments a projection may omit, used to distinguish lossless translations from lossy carriers (§5.3, §5.5). |
| Software-development dialect | The fixed causal-refinement progression `dream → plan → architect → spec → tests → docs → code`, read as a language dialect rather than a repository workflow (§5.3). |
| Obstruction | A value naming a specific, checkable reason an operation did not produce its ordinary result (§5.1). |
| Law | A statement about an operation quantified over every input it accepts (§5.1). |
| Search | An operation exploring more than one candidate to satisfy a goal, rather than computing a fixed function of its input (§5.1). |
| Plan | A value naming which operations to invoke, in which order, to discharge a goal at bounded cost (§5.1, §5.20). |
| Address | The digest of a value's canonical byte representation (§5.2). |
| Evidence value (`Charge`) | The four-valued evidential type: unknown, held, denied, contested (§5.8, §8.1). |
| Truth order | Orders evidence values by how much they support a claim (§8.1). |
| Knowledge order | Orders evidence values by how much evidence exists (§8.1). |
| Event | The one durable journal record: origin, claim, address, time, causes (§5.5). |
| Observed closure | The exact admitted, same-site, downward-closed event set committed by a frontier's closure root (§5.7). |
| Frontier | A content-addressed manifest of one observed closure: causal profile, sorted unique maximal tips, closure root, and validation-witness root (§§5.6–5.7). |
| Frontier tip | A maximal event in a frontier's observed closure; two spacelike events may both be tips (§5.7). |
| Frontier merge | The bounded history-union join of two compatible frontiers, preserving spacelike tips (§5.7). |
| Evidence presheaf | A structure assigning an evidence value to every point of a covering space (§5.9). |
| Conflict | A point with two or more independent contributing sources — exactly the points reading `contested` (§5.13a). |
| Coordination cost | The H¹/cycle-rank excess of a cover's overlaps over its spanning forest; zero is the coordination-free merge boundary, and positive cost is the consensus trigger (§5.13b, AD-7). |
| Reconciliation | Degree-1 resolution of independently computed readings: a knowledge join where coordination cost is zero, or a join followed by consensus otherwise; its results remain subject to the degree-2 gluing check (§5.13c). |
| Reconciliation cover | The patches, pairwise overlaps, triple overlaps, common point, and causal frontier over which reconciliation results are compared (§5.13d). |
| H² class | An admitted degree-2 obstruction artifact for reconciliation results: a 2-cocycle modulo degree-1 coboundary, read against the carrier `H² = ker δ² / im δ¹`; `zeroH2` is the trivial class used by the §5.13d arbitration contract. |
| Higher arbitration | The governed operation selected by a nonzero H² class to reconcile incompatible reconciliation results while retaining their class and provenance (§5.13d). |
| Arbitrated reading | A higher-arbitration result naming its H² class, every pairwise resolution, authorizing policy/capability decision, and resulting evidential reading (§5.13d). |
| Concept (FCA) | An (extent, intent) pair that is a fixed point of the prime-prime closure (§8.2). |
| Site | A space of points with a covering relation satisfying self-cover, pullback, composition (§8.2). |
| Ordinal (settlement) | The ordinal type grading settlement depth: zero, successor, countable limit (§8.3). |
| `H1rank` | The exact arithmetic coordination cost of a cover: `(cells + components) − entities` (§8.4, §5.13b). |
| Landauer entropy | `H1rank` read as a physical bit count, by direct definition rather than analogy: one irreversibly erased bit per independent cycle a cover fails to reconcile coordination-free (§8.4). |
| Confluence | The property that any two reduction paths from one term reach a common result (§8.4). |
| Proof | A term of the calculus whose type is the proposition it proves (§5.18, §8.4). |
| Search bound | The finite `⟨rounds, maxTerms, maxRuleFirings, maxProofSize⟩` resource envelope within which one derivation search is complete (§5.18). |
| Search cost | The actual rounds, examined terms, rule firings, and maximum proof size consumed by one derivation (§5.18). |
| Evidence flow | The monotone state progression of a valuation under settlement or rule firing; once a step is smooth/quiescent, later steps remain smooth (§8.8). |
| Cost-to-complete | The `freeEnergy` backlog metric for a finite support of predication cells: nonincreasing along evidence flow, strictly decreasing when a supported cell fires, and bounding the remaining steps to settlement (§8.8). |
| Evidence current | Order-respecting evidence movement along a closure or rule-firing trajectory; operationally, the state-transition flow whose flux is metered by §8.8 ledgers. |
| Evidence unit of account | One knowledge-height unit gained at one supported predication cell; the accounting currency of evidence movement, not a financial token, payment rail, or persistence mechanism (§8.8). |
| Operational accounting ledger | The conservation reading of evidence flow: initial cost equals accumulated flux plus remaining residue, so a partial run has receipts plus residue rather than hidden balance (§8.8); when attached to a governed operation outcome it is causal provenance, and replay projects that admitted ledger rather than allocating a fresh one (§§6.2–6.3, 7.1, AD-40); distinct from §5.29's external target-kind `Ledger`. |
| Evidence-flow receipt | One accounted unit of flux emitted by a transition; receipts itemize as commitments, mints, or double-valued jumps (§8.8). |
| Evidence-flow residue | The remaining `freeEnergy` at a horizon after accumulated receipts are counted; zero residue is the closed book at quiescence (§8.8). |
| Commitment (evidence flow) | A receipt for a cell leaving unknown evidence (`kBot`) for a truth pole during evidence flow (§8.8). |
| Mint (evidence flow) | A receipt for a truth-pole cell becoming contested (`kTop`), i.e. truth-register loss counted as inconsistency-register gain (§8.8). |
| Jump (evidence flow) | A two-unit receipt for a cell moving directly from unknown (`kBot`) to contested (`kTop`) in one step (§8.8). |
| Derivation | A checked proof together with its content-addressed trace, search cost, and causal frontier (§5.18). |
| Derivation trace | The canonical sequence of rule, antecedent, witness, and produced-term addresses explaining how a derivation constructed its proof (§5.18). |
| Exhaustion certificate | Evidence that no proof exists within one declared finite search bound, naming every saturated round and the exhausted resource dimension; never a claim of global underivability (§5.18). |
| Derivation search | Deterministic bounded forward saturation, complete over its declared finite search space and choosing the least-address reachable proof (§5.18). |
| Proof execution | Admitting an existing `Derivation`'s proof and conclusion as one journal event with the derivation address retained as a cause (§5.19). |
| Query planning | The operation deciding whether a question is answered directly, by derivation, or by coordination, before either cost is spent (§5.20). |
| Corner | The Belnap bilattice of ⟨addressability, assertivity⟩ classifying a boundary crossing (§5.14). |
| Rung | The decidability ladder (identity/scott/non-monotone/turing) governing whether a boundary read can complete (§5.14). |
| Scope | A claim's address narrowed to one level of the work spine — endeavor, campaign, project, plan, task, or work-item (§5.1, §5.24). |
| Sequencing | The strict causal order on sibling scopes at one enclosure — one scope's closing event causally preceding another's opening — proved transitive and irreflexive, distinct from enclosure itself (§5.24). |
| Conflict graph (scheduling) | The graph over a set of sibling scopes whose edges mark pairs that cannot proceed on the same resource at once; a resource assignment with no conflicting pair sharing a slot is a proper coloring of this graph (§5.24). |
| Coloring entropy | `log₂` of the number of valid resource-slot assignments a conflict graph admits — the identical bit-count §8.4's Landauer entropy measures for a coordination cover, one construction read two ways (§5.24, §8.4). |
| Facilitation closure | The least set of scopes reachable from an initially-ready seed by repeatedly adding any scope a declared dependency (a completed sibling) makes ready — the proved fixed point dispatch-readiness is, not a per-scope ad hoc status (§5.24). |
| Jural relation | A directed, evidentially-valued relation between an active holder and a passive party at one of Hohfeld's eight correlative kinds (§5.25). |
| Correlative | The derived reading of a jural relation with active/passive swapped and its kind renamed to its Hohfeldian pair — an involution, computed rather than separately admitted (§5.25). |
| Duty | The jural-relation reading in which the potential holder owes the passive party the scoped performance (§5.1, §5.25). |
| Claim (jural) | Duty's correlative: the reading in which the passive party of a duty holds the entitlement to its performance — distinguished from §5.3's "claim" (a typed term); this document qualifies the jural sense as "claim-right" or names it only in Hohfeldian context (§5.25). |
| Privilege | The kind negation-conjugate to power under §8.1's Klein-four symmetry: the potential holder owes no duty not to act — its correlative is no-right (§5.25). |
| Power | The kind read as "an authorized continuation exists in which the potential holder's act changes a passive party's normative position" — its correlative is liability (§5.25). |
| Immunity | The kind negation-conjugate to power under the same symmetry: no authorized continuation changes the passive party's position — its correlative is disability (§5.25). |
| Office | A bearer-independent holder of a deontic profile — a family of jural relations scoped to the work it governs (§5.25). |
| Recognition | One of incumbency's two settled predicates: the office's community acknowledges a candidate as its legitimate occupant — backward-looking, history-sensitive (§5.25). |
| Induction | Incumbency's other settled predicate: the candidate has taken on the office's forward obligation (§5.25). |
| Incumbency | The double settlement of an office's recognition and induction predicates on a candidate; full incumbency (dignitas) only when both are held (§5.25). |
| Investiture | The value recording an agent's incumbency state in an office and, at dignitas, the jural relations devolved onto that agent (§5.25). |
| Devolution | The read-time rewriting of an office's profile onto its incumbent at dignitas, without altering the office's own admitted profile (§5.25). |
| Assignment | The binding of a work scope to an agent as a duty-kind jural relation, the assigner or assigning office holding the correlative claim (§5.25). |
| Capability (jural) | An agent's own `Charge`-valued reading of whether it provides a capability a scope of work requires — read the same evidential way as any other claim, propagating from an office to its incumbent at dignitas independently of the office's authority (§5.25); this document's one formal name for what an earlier, more mechanical work-dispatch presentation in this architecture's history called "skill" — the same underlying notion reached twice, not two competing ones. |
| Governance operativity | The knowledge-meet of attribution, binding, and becoming settlements for a process claiming to be a governance act (§5.26). |
| Attempt | A pair of an intended target and a realized outcome for one try at a scope, retained whether or not the two coincide (§5.27). |
| Endeavor | A sustained, failure-open commitment at the coarsest work-spine level, whose context accumulates every attempt and the capability each left behind (§5.24, §5.27). |
| Storage site | A location together with the rule that would let a journal exist there, whether or not anything has been admitted (§5.28) — distinguished from §8.2's covering-space "site," an unrelated structure. |
| Settlement | A storage site inhabited: paired with an actually-admitted interior (§5.28). |
| Occupation | The four-cornered state of a storage site along two independent axes: bare/inhabited and dead/live (§5.28). |
| Excavation | A direct read of a settlement's plate, bypassing a live managed element; lawful only when no managed element is running over that settlement (§5.28). |
| Relational instrument | A named unit of work stated as a precondition/move/postcondition triple, read as a field of prepared obstructions a move is checked against (§5.29). |
| Target kind | The kind of thing an `InstrumentRelation` names as its scope: standard, protocol, schema, codec, ledger, runtime, law, or proof — one of eight closed categories, none internally defined further, distinguishing what an instrument's `conforms-with`/`uses`/`bridges`/`bricks` relation is a relation *to* (§5.29). |
| Ledger | A target kind (above) naming an external append-only accounting or record-keeping system an instrument may relate to — e.g. a blockchain, a financial ledger, or another platform's own event log; never this architecture's own journal (§5.5), which this document always names "journal," never "ledger" (§5.29). |
| Field | A finite set of named observers, each carrying its own local evidence presheaf, related by declared translations (§5.30). |
| Common ground | A field's glued section: the knowledge-meet of every observer's local reading, graded on a static gluing axis and a dynamic regime axis (§5.30). |
| Ground (kinematic) | A bounded, addressable region of the causal order — a frontier's history read as comparable against other such regions (§5.31); distinguished from two other, unadopted senses of "ground" recorded in §11. |
| ACRA | Autonomic Computing Reference Architecture (Kephart & Chess 2003) — external, industry-standard prior art this document names §5.22 and §5.2–§5.21 against (§5.32), not an internal citation. |
| Managed element | One running instance of §5.2–§5.21, with its own journal (§5.22) — this document's one name for the thing an autonomic manager observes and adjusts through touchpoints; the internal coinage "dish" is retired. |
| Orchestrating autonomic manager | The system one level above a set of managed elements that runs auditable MAPE-K loops through their touchpoints: observing, diagnosing, planning, and adjusting without a privileged effect path (§§5.22, 5.32). |
| Swarm | A set of managed elements observed together, read as a graph of agents — managed elements as vertices, declared observation channels as edges — whose consensus, disagreement, and coordination-freeness are the network-sheaf specialization of §5.13's coordination-cohomology machinery (§5.22). |
| Fleet | Not a distinct structure: this document's plain-English synonym for the `Set⟨ManagedElement⟩` an orchestrating loop observes, analyzes, plans over, and adjusts (§5.22); "swarm" names that set when its network-sheaf structure is specifically in view. |
| Resource autonomic manager | ACRA's term for the single-element MAPE-K loop; folded into a managed element's own §5.2–§5.21 machinery rather than named as a separate system (§5.32). |
| Monitor | The Monitor stage of MAPE-K: `observe` (§5.22) at the orchestrating scale, `query` (§5.11) at the single-element scale (§5.32). |
| Analyze | The MAPE-K stage that derives and admits a `Diagnosis` from an `Observation` without selecting an action (§§5.22, 5.32). |
| Plan | The MAPE-K stage that consumes one admitted `Diagnosis` and admits a typed `AdjustmentPlan`, preserving every diagnostic obstruction (§§5.22, 5.32). |
| Diagnosis | A content-addressed, causally admitted analysis artifact naming its `Observation`, derivation rules, agreement/disagreement reading, missing evidence, identity uncertainty, and coordination cost (§5.22). |
| Adjustment plan | A typed, admitted MAPE-K plan that names the `Diagnosis` warranting it and is the sole input to `adjust` (§5.22). |
| Loop identity | The stable `LoopId`, policy, cadence, and causal frontier distinguishing one asynchronous MAPE-K loop's artifacts from another's (§§5.22, 5.32). |
| Execute | The MAPE-K stage implemented by `adjust`: discharge of an admitted plan through routing, reconciliation, or self-revision, with the plan retained as causal evidence (§§5.22, 5.32). |
| Actuator | ACRA's term for Execute's effector touchpoint: a named, addressable endpoint at this platform's boundary carrying a protocol, address, and command/response predicate pair — a relational instrument (§5.29) specialized to a physical or external effect, gated by that instrument's ordinary precondition check, never a second authorization path (§5.32). |
| Knowledge (MAPE-K) | The shared model every MAPE stage reads and writes: the knowledge base (§5.11), read against ACRA's vocabulary (§5.32). |
| Arena | A set of polarized moves together with an enabling relation stating which moves may follow which (§5.33). |
| Position | A finite, causally-closed set of already-played moves, each carrying its own evidential reading (§5.33). |
| Play | An extension of one position to another respecting an arena's enabling relation (§5.33). |
| Player | The party whose moves in an arena carry positive polarity (§5.33). |
| Opponent | The party whose moves in an arena carry negative polarity (§5.33). |
| Strategy | A nonempty, prefix-closed set of positions satisfying receptivity, determinism, and settlement compatibility (§5.33). |
