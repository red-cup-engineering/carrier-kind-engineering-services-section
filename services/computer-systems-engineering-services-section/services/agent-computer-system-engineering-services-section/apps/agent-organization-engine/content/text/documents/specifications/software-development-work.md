---
title: Software-development work over Sign carriers
status: specified; integration incomplete
date-created: 2026-09-27
date-modified: 2026-09-28
---

# Effect and boundary

An agent organization can change a software system while preserving its
declared capabilities and recording what changed. The carrier is a
content-identified source snapshot with its dependency relations, intended
effect, authority, and observed outcome. A renamed directory or green test
alone is not that effect. The agent's work is a transition over that carrier;
an instance name is never the owner of the transition.

Code generation, codemods, and relocation are distinct AOE work components:

- **Code generation** projects executable code from an admitted specification
  or schema. Its output retains the specification identity and can be checked
  for drift.
- **Codemod** applies a declared semantic source transformation to admitted
  source, with before/after identities and refusals for stale or ambiguous
  input.
- **Relocation** changes ownership or location of a capability and migrates
  every relevant consumer and persisted reference. Its success is the
  surviving effect and removed old route, not the filesystem move itself.

The input to relocation is a **capability**, not merely a source path. It must
name the effect, its admitted carrier, the proposed owner and dependency
reason, affected consumers and state, and the observable effect after the
move. A path-rewrite plan may implement part of that work, but cannot decide
ownership or prove that a capability survived. Generating code from an
unidentified schema or codemodding code without a declared transformation has
the same defect: the tooling is running ahead of its specification.

An AOE relocation or package collapse must therefore admit a placement datum
before planning file operations: capability identity, useful effect, carrier,
owner before and after **with their kinds**, dependency reason, affected
consumers, and a concrete observation of the effect. A platform, module,
application, component, or service can own executable capability. An
instance can supply configuration and state but cannot own that capability:
`(ops.561.group, instance-of, MetroPlat)` never entails
`(ops.561.group, owns, MetroPlat executable)`. A relocation away from an
instance may record that historical error as its before state; the placement
schema refuses an instance as the after-owner before a journal is opened or a
source file is changed. A process belongs to the hosting service:
`(ops.561.group, instance-of, MetroPlat)` names installation data, while
`(FeltOS enterprise host, loads, MetroPlat)` and
`(MetroPlat, interprets, OPS declaration)` describe execution. Neither
relation makes OPS a process owner. The datum is a SignCell. The work graph links that
cell to the before/after owners and consumers. Its content identity is bound to
the journaled plan so an application cannot silently substitute a different
placement. This is a declared placement and a mechanical witness, not proof
that the declared owner is correct or that every runtime consumer still works;
those require observation through the real consumer before the architectural
move is complete.

These components are agent work under AOE's animating/doing/working faculty.
The lower-level code engine may parse languages, inspect modules, and plan
byte-bound edits; it does not own agent assignment, authority, execution
history, or a platform-specific code mission. No OPS or Koios package owns
these transformations.

# Contract completion before fabrication

The work arena distinguishes a question and its answers, a proposal and its
arguments, and a request with a contract. An answer or adopted idea is not
automatically a requirement, proof, or accepted software outcome. Necessary
proof and conformance obligations must be stated in the request's conditions
and received on their own evidence.

An order's result codomain (`returns`) and admitted examples travel with its
requirements and conditions through refinement, counter-offer, agreement and
completion after a miss. Completion reads the full operative contract and
admits its replacement through the same contract admission as a refinement.
Its replayed contract determines the new order identity and the next maker's
typed work intent; earlier deliveries still answer their original revision.
Adding only a result codomain or examples can therefore complete an incomplete
order. A projection retaining only requirements and conditions cannot perform
this transformation.

The checkout's controlled order-completion consumer demonstration exercises
this path and refuses ill-typed examples and results. It does not demonstrate
live allocation, independent receiving, deployment, or a mathematical proof.

# Write and implementation order

1. **Data carriers:** specify canonical source and schema identity using SCA,
   SEN, SEAVT, and SignCell. A source file's path is a location, not its
   identity. An admitted work intent identifies the source snapshot,
   requested effect, preconditions, actor, and authority. A specification or
   schema is identified input to generation, not prose inferred from output.
   The six current AOE software-work carrier schemas live in
   `lib/animating/specifications/software-change/*.schema.json`. Their `$id`
   values preserve the existing SignCell identities; `aoe-codegen` projects
   `lib/animating/src/becoming/doing/working/software-change/carriers.mjs`
   from them. Change the schemas first and run the generator's check after
   generation. An inline copy of a carrier shape in the work implementation
   would restore the implementation-first drift.
2. **Change and relations:** specify a SignChain transition from the admitted
   before identity to the proposed after identity, and a distinct transition
   to the observed after identity if applied. SignGraph carries modules,
   exports, imports, schemas, consumers, and deployed instances as separate
   entities and their typed dependencies. Relocation must preserve or
   deliberately retire each relevant edge, not just rewrite visible strings.
3. **Tooling and evidence:** SignCraft admits the work intent against policy,
   assays the proposed transition and affected graph, keeps contradictory or
   incomplete evidence visible, and settles a witnessed result or typed
   refusal. A generated proposal cannot witness its own deployment.
   A source-changing run persists its proposal as a SignChain telling before
   mutation. Application reads that telling, verifies the admitted source and
   output projection, then appends a distinct telling after observing output.
   Reconstructing a history after the write would not witness this sequence.
   A crash after mutation but before the final telling leaves an unresolved
   proposal, not a settled success.
4. **Language mechanics:** one code-layer parser/edit planner identifies
   syntactic changes and binds them to exact source bytes. A code generator
   projects an identified specification into source. Neither primitive owns
   actor selection, authority, work history, or a platform-specific mission.
5. **AOE execution:** AOE owns generation, codemod, and relocation as agent
   work. A work receipt names actor, authority, input identities, rule,
   affected graph, output identities, checks, and unresolved effects. Apply
   only when the admitted plan still matches the source; otherwise refuse and
   leave it unchanged. The work is complete only when relevant consumers use
   the surviving output and the superseded route is gone. AOE's persistent
   mission state uses an absolute data root supplied by its running
   system/caller; AOE must not derive persistent storage from its source or
   release directory.
6. **Composed software:** FeltOS may make those AOE abilities available to
   its agents. MetroPlat may expose them to an organization through its
   general platform surfaces. A named MetroPlat instance supplies identity,
   policy, configuration, and state; it contributes no forked server or
   codemod implementation.
7. **Federation:** `ops.561.group` is one MetroPlat instance. `koios.news` is
   a separate news service federating with it by the Semioverse protocol
   combination. Content Mill is a FeltOS module and Newswire is an AOE
   syndication component. Their effects are not installed into OPS merely
   because OPS can reach them.

# Current implementation evidence and migration

Development uses `@red-cup-engineering/animating/software-change/mission/development`.
The enterprise host installs `aoe-develop-software` and `aoe-development-product`
through its native operation surface. A request names an authored requirement
and its objective. The requirement's `asks.development` carries the generated
`DevelopmentReceiving` contract: office, repository-relative territory, reading
and writing lanes, verification and consumer conditions. Current office standing
or an exact coordinating allocation admits the work; an unrelated allocation
does not. Source reads, product reads, derivation, fabrication and receiving
recheck the same requirement revision and authority. Requester-supplied constraints
and closure must match the contract, including when those fields are optional.
The standalone `aoe-code-mission` command uses the same capability with explicit
caller-owned custody and receiving inputs. Inference returns EngineeringContribution:
role, text, unresolved obligations and an optional specified product. It cannot
author authoritative inputs, authority or proof claims. The engine requires an
actual predecessor read and records successful stage-local source/product view
identities and codepoint windows, contribution identity, request basis and host
authority in EngineeringArtifact. Cached-source freshness probes are distinct
from inference readings. Causal grounding leaves semantic proof unestablished.
The production free-cloud inquiry has produced an admitted native research
artifact; that artifact was consumed into the received human actor-hosting
replacement. Actual Node hosts have demonstrated registration, literal handle
discovery, signed cross-instance delivery/reply, recipient-scoped inbox reads,
and credential login with stable keys after a process restart. These effects do
not establish deployment of every enterprise capability or cloud world host.

Research, operational concept, requirements, architecture, HLD, LLD and artifact
specifications feed subsequent transformations. The final specification supplies
a source-free module order or deterministic schema-module projection. Receiving
checks the actual consumer. Its counterexample activates renewed derivation
under the same grant; repetition of an already refuted byte transition stops.
The advisory mission loop, routing pulse, action parser and private trajectory
store are retired.

The host's compute port can supply inferenceOptions.agentBounds and
inferenceOptions.workPlacement using the inference engine's existing request
contract. Development preserves that policy into every default inquiry rather
than dropping it at the bridge. The native dispatcher enforces request, tool,
token, depth and resource ceilings and retains zero-cash-only admission.
Actor requests cannot replace host compute policy. Bounded tool agents may use
the extent granted for their work; an independent six-round default is not
substituted for an explicit host grant.

Inference receives named demand fields and preceding product addresses. Its
`read_source` and `read_product` tools return bounded Unicode-codepoint windows;
complete observed source and product carriers stay in native custody. File sources
are streamed into immutable flatfile custody under their raw-byte ni identity;
there is no 64 KiB source-file cutoff or repeated full-text source product.
The host derives context.sources directly from its admitted readable snapshot.
Agents select read_source({id, offset?, limit?}) using an announced reference;
the host resolves the filename, rechecks the reading lane and original version,
and verifies the complete current held body before returning the window.
Legacy path reads remain usable, and id pins continuation. Intermediate
directory links, invalid UTF-8, NUL text, unknown identities and withdrawn
standing cannot expose a source. Read-only inquiry needs no writable placeholder.
HLD can
retrieve its architecture by address without repeating every earlier artifact
in every prompt. Views identify their projections rather than claiming their
truncated text is the complete content-addressed carrier. Submitted artifact
identity and work closure participate in the question identity.

The actor returns product addresses. `aoe-development-product` reads exact products
from native SignCraft custody in bounded byte windows. Its explicit
projection: "source-text" reads a held source body in bounded Unicode windows
under that question's current protected requirement and office authority.
A schemaModules projection may provide specificationPath for one schema;
the authoritative JSON schema and generated runtime are then received together
by deterministic projection and the actual consumer checks. ActivityPub carries the
request in a canonical SEN/A2A user message; the receiving host binds the verified
sender as principal, invokes native authorization and dispatch, and returns a
correlated agent reply. Immediate inbox execution reads the addressed outcome;
bulk arrival processing also recognizes it.

The current native fabrication port invokes the shared Code renderer directly.
The host supplies its admitted compute options, source lanes and receiving ports;
it does not import a deployment helper absent from the supplying engine. Its
schema-module contract comes from that actual native operation. The engine's
separate edge-schema-projector remains a network projection of the same compiler;
its deployment and receiving are independent of this local native binding.
Development's earlier generated actor and receiving contracts remain historical
evidence, rather than qualification of the current composition. Direct service-office
and closure-bearing duty records replace the absent form compiler and registry;
the enterprise runtime loads and founding no longer authors the same work twice.
Deployed actor admission and categorical/Hoare proofs remain unestablished.

Native provider admission derives `tool-calling` from the actual tools offered.
A live Groq agent has executed a source tool and completed the following model
exchange under native zero-cash admission. HTTP deadlines now begin after account
and kernel-slot admission; caller cancellation still bounds the whole work and
releases its lease. Default development inquiries keep their work and pricing
custody beneath the receiving host's data root. Receiving tests refute the model's
claim that optional contract conditions are automatically requester-owned.


The JSNode syntax package retains the parser and source-bound module-rewrite
plan. AOE Animating now owns `aoe-codemod`: it admits an actor and exact source,
uses the parser's plan, records SignCell source/work identities, ordered
tellings through SignCraft's knowledge base, a SignGraph, and a settlement.
Its mutation route requires a separate planned invocation with `--journal`:
the proposal is written and synced as a SignChain telling before source changes.
Before even proposing a module rewrite, AOE now reads the nearest package owner
of the real source file, refuses an undeclared owner or instance, and binds the
exact package declaration digest to the work intent and SignGraph evidence.
Changing that declaration invalidates the pending write. This establishes
which declared owner the edit targets; a module-specifier rewrite alone cannot
decide whether the dependency or capability belongs there.
The `--write` invocation refuses a missing, mismatched, or completed proposal,
then appends an applied or observed telling after reading the output back.
If an interrupted write left the projected bytes on disk without its final
telling, the next invocation observes those bytes and records an observation
without claiming to have performed the write. Codemod, code generation,
workspace relocation, and package collapse now share this durable proposal
and observation lifecycle. The old
`jsnode-codemod` entrypoint is retired. The pure path-reference projection
now lives in the code layer; AOE owns `aoe-relocate` for workspace relocation
and package collapse. Its plans and observed effects use the same Sign work
carrier. Artifact cells are identified by content and kind; before and after
locations are separate graph relations, so moving unchanged content retains
one artifact identity. The JSNode relocation command and exports are retired.
Relocation now requires a SignCell placement datum naming the capability
effect, carrier, ownership reason, affected consumers, and observable result;
the journal and SignGraph retain that declaration alongside the mechanical
change. The command still does not discover every consumer or prove the
declared effect at runtime. It therefore must not be read as a completed
capability migration. Code generation now has an AOE `aoe-codegen` work
command: it reads identified
`*.schema.json` inputs, asks the code-layer JSON Schema renderer for a
projection, compares or writes the exact output, and records input and output
SignCells, their SignGraph relations, and SignCraft ordered evidence. Its write
requires a prior journaled proposal and refuses a changed schema or output.
Before projection, AOE resolves the nearest declared software package for the
schemas and output directory. It refuses an absent owner, an instance owner,
or different source and output owners. Exact package-declaration bytes join the
work intent and SignGraph evidence, so a changed owner declaration invalidates
a pending write. This checks declared ownership of generation; it does not
prove the schemas belong in that package or that consumers receive the effect.
The former computer-system-engine generator and its package scripts were dead:
that package has no `x-codegen` schemas, and its hand-split declaration file
needs unresolved cross-package references. That entrypoint is retired rather
than falsely advertised as a way to regenerate the file. The pure renderer
remains in the JavaScript code-fabrication package. The bounded code-mission entrypoint now lives in AOE Animating and uses the
shared software-work cell, graph witness, and SignChain journal for execution
outcomes. Its code-context projection remains in the lower code engine. The former private mission runtime, parser and trajectory machinery has been retired. The native development circuit consumes seven successive engineering contributions, shared deterministic fabrication and exact receiving. These commands do not yet establish
organizational authority or close every consumer and deployment edge;
identifying a caller-supplied actor is weaker than admitting an authorized one.
The placement carrier distinguishes engines, platforms, applications,
modules, components, services, and instances. For a receiving package, AOE
reads its `package.json` name and `softwareKind` declaration, checks the
declared kind against the placement, and binds that source digest into the
proposal and work evidence. It refuses an absent, ambiguous, changed, or
mismatched owner declaration before writing. It also rejects an instance as
the new owner. The AOE relocation and collapse routes
also read tracked instance declarations carrying an explicit `instanceOf`
relation before proposal and application: a declared instance identity cannot
be relabeled a service to receive executable capability. This is a
source-grounded negative check,
not an ownership proof for an accepted placement. This establishes the receiving package's declared identity and kind,
not the truth of its architectural fit. Relocation still needs to observe the
capability through real consumers and close non-source dependencies before
claiming a completed move. A source path, package
name, or hostname alone cannot attest ownership. For a package
collapse with mapped bare exports, AOE now asks the shared JSNode parser which
JavaScript sources actually import those exports. In a Git worktree it searches
tracked and non-ignored untracked sources; outside Git it walks the supplied
root. It refuses an omitted source consumer before journaling and searches
again before applying. The discovered paths join the SignGraph's affected
consumer relations. This closes one concrete source-consumer route, including
static imports, literal dynamic imports, CommonJS requires, and JSDoc imports.
It does not discover computed imports, non-JavaScript references, ignored
files, runtime consumers, or every deployment edge. A complete relocation
still requires source-grounded owner identity and observation through the
real consumers; the receipt alone does not prove that capability survived.
The lower JSNode package-collapse planner currently refuses `.mts` and
`.d.mts` inputs. Two older relocation examples expect those forms to work,
but a separate TypeScript translation script does not make them part of this
admitted parser path. Restoring that effect requires one code-layer TypeScript
projection with its own exact-source contract, then AOE consumer migration;
silently parsing TypeScript as JavaScript would hide the gap.

The OPS and Binding Generations MetroPlat instance declarations contain
identity and selections without package manifests. Separate FeltOS host
deployment bundles install the selected exports and hold host web, network,
and companion settings; their systemd units start the FeltOS executable.
OPS is not a process owner. The production release has
not yet been observed on that executable. Its former in-process Koios
operation source has been removed from the instance manifest; a real federated
link remains to be implemented and observed. None of these source locations
by itself proves a deployed capability.
