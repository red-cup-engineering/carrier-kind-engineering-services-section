# Source Map

This file records the local material used for this first experimental profile.

## Primary SPOTCOMP Draft

- `development/emsenn/active/hacking/spotcomp/HANDROLLED-SPOTCOMP-SPEC.html`
  - Strong source for the existing SPOTCOMP vocabulary: predicating, EAVT, dual filing, closure, settling, path identity, package namespace, federation, and SHP.
  - Known flaw carried forward only as a warning: it treats FOUR too exceptionally and leaves per-row datum encoding unresolved.
    This workspace corrects that by making EAVT rows the trace substrate and treating finite value algebras as projections over traces.
- `development/experimental/emsenn/active/hacking/spotcomp/HANDROLLED-SPOTCOMP-SPEC.html`
  - Actual on-disk path for the handrolled source above.
    It also names the six subsystem views: PAM as Predicate Algebra Modeling, TDP as Theory Derivation Program, TRC as Typed Resource Catalog, MAS as Messaging Agentic Swarm, SHP as Semantic Hypertext Packet, and SPOTCOMP as the whole computer.
    This workspace treats TDP and TRC as one on-disk catalog/program object.
- `development/experimental/spotcomp/library/pam/specification.md`
  - Current PAM sub-specification skeleton.
    It reads PAM as the SPOTCOMP CPU/instruction-set layer while parameterizing value algebra beyond the older finite profile.
- `development/experimental/spotcomp/library/trc-tdp/specification.md`
  - Current TRC/TDP sub-specification skeleton.
    It records the correction that Theory Derivation Program and Typed Resource Catalog are two readings of the same on-disk running proof-tree object.
- `lab/archive/research/operations/engineering/research/archive/esm-predication/README.md`
  - Identifies `@561-group/predication-algebra-model` as the stateful runtime historically called PAM.
- `lab/archive/research/operations/engineering/research/archive/esm-predication/docs/architecture/layering.md`
  - Separates pure predication algebra, predication-algebra-model/PAM, filesystem server, and context-protocol server as additive layers with one-way dependencies.
- `lab/archive/research/operations/engineering/research/archive/esm-predication/docs/architecture/principles.md`
  - Records the PAM runtime principles: all computational data is SPO, algebra governs, every input is reified, reads are witness walks, event log is source of truth, driver is a thin pump, and witness is the answer.
- `development/experimental/spotcomp/library/operations/specification.md`
  - Current operations sub-specification skeleton for being/doing/working/governing, process/procedure/derivation/inquiry, ledgers, budgets, cost, and stationarity/Laplacian handoff.
- `development/experimental/spotcomp/schema/operations-profile.schema.json`, `development/experimental/spotcomp/examples/operations-profile.json`, and `development/experimental/spotcomp/src/operations-profile.mjs`
  - Current declaration probe for the operations sub-specification.
    It checks that an implementation profile names the required strata, work types, operations-loop stage readings, process/procedure boundaries, ledger/budget/cost discipline, and stationarity/Laplacian evidence without treating host scripts or bookkeeping as sufficient operating-layer evidence.
- `development/experimental/spotcomp/schema/operations-records.schema.json`, `development/experimental/spotcomp/examples/operations-records.json`, and `development/experimental/spotcomp/src/operations-records.mjs`
  - Current finite record-bundle probe for the operations sub-specification.
    It checks process, procedure, work event, budget, ledger posting, cost event, and operations-loop record declarations plus cross-record references, host-script projection, governed exhaustion, witness projection, and read-free settlement-cost separation.
- `lab/archive/relating-repo/relating-repo/operations/engineering/triage/operations/command/commands/rsc-quiescent/triage/work-orchestration/texts/goals/operations-loop.md`
  - Defines the planning, dispatch, execution, tracking, review, feedback loop and identifies its mathematical grounding as sigma/delta, global sections, stationarity, entropy decrease, and detailed balance.
- `lab/archive/relating-repo/relating-repo/operations/engineering/triage/operations/command/commands/rsc-quiescent/triage/accounting/texts/chart-of-accounts.md`
  - Gives the double-entry account structure and commodities for operational ledger projections.
- `lab/archive/relating-repo/relating-repo/library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/objects/process-record.md`
  - Defines process records as substrate entities for host process, deployment, capabilities, syscall policy, spawn witness, exit witness, and closure kind.
- `lab/archive/relating-repo/relating-repo/library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/objects/budget-record.md`
  - Defines budget records with resource kind, bound, scope, exhaustion policy, current consumption, reset policy, and witness requirements.
- `lab/archive/relating-repo/relating-repo/library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/concepts/cost-discipline.md`
  - States cost discipline as Lawvere-quantale settling: reads free, admissions cheap, settlement billable.
- `lab/archive/relating-repo/relating-repo/library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theorems/cost-composition-via-lawvere-quantale.md`
  - Proves substrate cost composes by the chosen Lawvere quantale.
- `lab/archive/relating-repo/relating-repo/library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theorems/cost-discipline-reads-free.md`
  - Proves reads do not advance substrate state and therefore do not consume settlement fuel.
- `lab/archive/relating-repo/relating-repo/operations/engineering/triage/library/triage/relating/archive/sscu-sprint/docs/math/acts/laplacian.md`
  - Defines Laplacian as deviation from stationarity via `I - ObservationKernel`.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/lawvere-laplacian-grothendieck-sites.md`
  - Proves Lawvere Laplacian preserves sheafhood on Grothendieck sites.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/moduli/theories/laplacianizers/objects/moduli-of-laplacianizations.md`
  - Defines moduli of Laplacianizations as equivalence classes of Hilbert structures on a chain complex.
- `development/experimental/spotcomp/library/wire-federation/specification.md`
  - Current standards-facing wire/federation sub-specification skeleton.
    It treats serialization, signature, transport, problem detail, and admission as mathematical representation/admission morphisms after object boundaries are fixed.
- `development/experimental/spotcomp/schema/federation-admission-profile.schema.json`, `development/experimental/spotcomp/examples/federation-admission-profile.json`, and `development/experimental/spotcomp/src/federation-admission-profile.mjs`
  - Current receiver admission bundle probe.
    It checks received representation records, canonical identity, signature verification, ordered local admission gates, regime binding, outcome/audit behavior, HTTP problem details, and non-conformance boundaries.

## Active Predication And Settling Work

- `development/active/articulating/articulating.schema.json`
  - Articulating constructs the potential articulation cell and is upstream of predicating.
    This workspace treats it as generating the aperiodic predication category.
- `development/active/library/token/docs/dev/journal/2026-05-25.md`, `development/active/library/claim/docs/dev/journal/2026-05-25.md`, and `development/active/library/utterance/docs/dev/journal/2026-05-25.md`
  - Token and claim are the non-assembling primitives, and utterance is their ordered pair.
    This workspace uses them to state the I/O-as-articulation boundary in [IO-ARTICULATION.md](./IO-ARTICULATION.md).
- `development/active/docs/dev/journal/2026-05-27.md` and `development/active/docs/dev/journal/2026-05-28.md`
  - Current active proof-tree cleanup notes.
    They record the category/generator/codomain discipline, the articulating-to-settling regime chain, morphism-boundary schemas, and the need to avoid certifying operations before their regime placement is derived.
- `development/experimental/spotcomp/PROOF-TREE-IRRESOLUTION.md`
  - SPOTCOMP-local interpretation of the active proof tree as the engine for unresolved or partial functions, including recursion grounding, regime preservation, partial-map support/default discipline, fixed-point versus prefix boundaries, TRC/TDP replay, and standards placement.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/predicating.schema.json`
  - Current predicating schema.
    It names predicating as the transfinite homotopy generator whose codomain is the predication-category.
    It still references FOUR directly; this workspace treats that as a projection choice, not as the global substrate type.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/settling.schema.json`
  - Current settling schema.
    It describes monotone trajectories and per-cell traces.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/settling/settling.schema.json`
  - Current active-path settling schema.
    It names settling as the finite-algebra generator inside positing, projecting Scott-continuous monotone trajectories to finite trace-family algebras.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/trace-monoid/trace-monoid.schema.json`
  - Important open proof obligation: concurrent independent positing steps commute, but the functor from abstract history systems to valuation lattices is not fully derived.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-fibration-2-category/hacking/settling-endofunctor/docs/dev/journal/2026-05-24.md`
  - Settling is the orbit of a closure-plus-increment endofunctor; the closure ordinal determines the regime.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-fibration-2-category/hacking/closure-2-monad/hacking/library/closure-merge-commutation/docs/dev/journal/2026-05-24.md`
  - Lean-verified closure-merge commutation underwrites CRDT convergence and reconciles close-then-merge with merge-then-close at fixed invariants.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/perlocuting/library/perlocution/sigma-delta-cycle/delta-pass/docs/dev/journal/2026-05-24.md`
  - Delta-pass is evidence accumulation as knowledge-join, the CRDT merge view.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/perlocuting/library/perlocution/sigma-delta-cycle/docs/dev/journal/2026-05-24.md`
  - One sigma/delta cycle is delta-pass followed by sigma-pass; repeated cycles converge to the settling least fixed point when the regime permits endpoint evidence.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/perlocuting/library/perlocution/sigma-delta-cycle/sigma-pass/docs/dev/journal/2026-05-24.md`
  - Sigma-pass resolves contested cells through twist-product tensor updates and emits only changed entries.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predication-cell/tracing/library/trace/docs/dev/journal/2026-05-24.md`
  - Trace carries event, temporal/causal, evidence, recognition, refinement, and provenance axes.
    EAVT JSONL is a carrier/projection of trace events, not the whole trace object.
- `development/active/hacking/proof-engine/cell-trace-shape.mjs`
  - Provides an executable source for provenance accumulativity: local derived-from references must point to earlier local records.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/positing/hacking/library/positing-naturality/docs/dev/journal/2026-05-24.md`
  - Positing commutes with predicate-category reindexing and upgrades to a 2-cell in the predication-fibration 2-category, modulo noted formalization gaps.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/positing.schema.json`
  - Active schema for positing as the knowledge-order least extension that changes only one predicate fiber and one entity-pair coordinate.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/hacking/library/positing-naturality/docs/dev/journal/2026-05-24.md`
  - Current active path for the positing-naturality theorem: reindexing a positing is equivalent to positing at the reindexed cell with the same datum.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/hacking/library/locution/docs/dev/journal/2026-05-24.md`
  - Locution is environmental delivery and decoding, distinct from pure positing and downstream closure.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/hacking/library/illocution/docs/dev/journal/2026-05-24.md`
  - Illocution is pure event-bounded positing; IO and closure firing are downstream effects.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/settling/hacking/perlocuting/library/perlocution/docs/dev/journal/2026-05-24.md`
  - Perlocution is closure-unit propagation toward least fixed point and is distinct from event-bounded positing.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-fibration-2-category/hacking/closure-2-monad/docs/dev/journal/2026-05-24.md`
  - Closure is a lax-idempotent 2-monad; its apex is the Knaster-Tarski least fixed point of the closure orbit.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/library/predication-settling-category/library/predication-settling/hacking/library/four-regime-dichotomy/docs/dev/journal/2026-05-24.md`
  - The four closure-ordinal regimes determine when 2-categorical and cohomological content trivializes or remains load-bearing.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/library/predication-fibration/library/predication-hyperdoctrine/hacking/library/bigraded-settling-cohomology/docs/dev/journal/2026-05-26.md`
  - Defines the two-row bigraded cochain complex and the `H1_t`/`H1_top` decomposition.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/library/predication-fibration/library/predication-hyperdoctrine/hacking/library/bigraded-settling-cohomology/hacking/library/designation-grade/docs/dev/journal/2026-05-26.md`
  - Designation grade is the first axis of bigraded settling cohomology.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/library/predication-fibration/library/predication-hyperdoctrine/hacking/library/bigraded-settling-cohomology/hacking/library/cohomological-degree/docs/dev/journal/2026-05-26.md`
  - Cohomological degree is the second axis; degree 1 holds first-order obstructions.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/library/predication-fibration/library/predication-hyperdoctrine/hacking/library/bigraded-settling-cohomology/hacking/library/h1-t/docs/dev/journal/2026-05-26.md`
  - Defines `H1_t = H^{0,1}` as truth-side first-order obstruction.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/positing/library/predication-fibration/library/predication-hyperdoctrine/hacking/library/bigraded-settling-cohomology/hacking/library/h1-top/docs/dev/journal/2026-05-26.md`
  - `H1_top` measures first-order paraconsistent obstruction and is regime-sensitive.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/prose/learning/claims/audit-content-via-inconsistency-sheaf-cohomology.md`
  - Audit content lives in the inconsistency sheaf's cohomology.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/code/structures/inconsistency-sheaf-record.md`
  - Defines the substrate inconsistency-sheaf record with top cells, witness citations, classifications, cache, and repair resolutions.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/library/local-settling/docs/dev/journal/2026-05-24.md`
  - Local settling restricts the closure cycle to object-local cells; modeled-player state is a special case of local settling.

## Predication Fiber Algebra Sources

- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/library/predication-fiber-algebra/docs/dev/journal/2026-05-24.md`
  - Current active source for `A_p = (L x L)^(E x E)`, pointwise bilattice and residuated operations, uniform fibers across predicates, boolean specialization into FOUR, and classical relation as further collapse.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/library/predication-fiber-algebra/reindexing/reindexing.schema.json`
  - Current active source for predicate-morphism pullback `f*` on predication-fiber algebras: converse swaps subject/object coordinates, subject projection reads the subject diagonal, and object projection reads the object diagonal.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/library/predication-fiber-algebra/existentially-quantifying/existentially-quantifying.schema.json`
  - Current active source for existential quantification as the left adjoint to reindexing, with knowledge/truth order fold and fill rules.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/library/predication-fiber-algebra/universally-quantifying/universally-quantifying.schema.json`
  - Current active source for universal quantification as the right adjoint to reindexing, with knowledge/truth order fold and fill rules.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/library/predication-fiber-algebra/scripts/quantifier-adjoints.mjs` and `development/active/tests/check-predication-fiber-quantifier-adjoints.mjs`
  - Active finite checker for the quantifier adjunction laws over a boolean two-entity instance and the current coordinate morphism set.
    This is useful law-probe evidence, not a full arbitrary-`L` proof.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/docs/dev/journal/2026-05-24.md`
  - Current active source for the cloven predication fibration, A1-A3, generator action, generator exhaustiveness, pullback closure, and the `C^op -> DBiLat(L)` functor.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/hacking/gauge-twisted-reindexing/docs/dev/journal/2026-05-24.md`
  - Source for partial reindexing support, outside-support bottom/default extension, and the obstruction behavior that appears when gauge choices do not commute with the default extension discipline.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/library/predication-hyperdoctrine/docs/dev/journal/2026-05-24.md`
  - Current active source for the two hyperdoctrine adjoint systems, Frobenius for knowledge/truth meets, Beck-Chevalley, dual comprehension, and failure of general Frobenius for fusion.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/predication-fiber-algebra.md`
  - Archive object definition for the pointwise twist-product predication fiber algebra.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/predication-fibration.md`
  - Archive object definition for predication fibration over `(L, C, E)`.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/predication-hyperdoctrine.md`
  - Archive object definition for predication hyperdoctrine and property-like B1-B4 layer.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/twist-product-residuation.md`
  - Archive proved claim for twist-product fusion/residual truth-order residuation.
- `/predication-categories/library/predication-cell-complex-site/content/explanations/exhaustiveness-of-four-predication-cell-complex-site-generators.md`
  - Archive proved claim that entity-symmetric bottom-preserving bilattice homomorphisms factor through the four predicate generator classes, subject to stated hypotheses.

## Information And Documentation Sources

- `lab/hacking/library/being/doing/library/philosophy/semiotics/information/information.md`
  - Information is receiver-relative uncertainty reduction, not raw data.
- `lab/hacking/library/being/doing/library/library/information/knowing-as-settling/knowing-as-settling.md`
  - Knowing is settlement under a community closure-rule system and is regime-classified.
- `lab/hacking/library/being/doing/library/library/information/aboutness/aboutness.md`
  - Aboutness is predication participation and closes under the predicate category.
- `lab/hacking/library/being/doing/library/philosophy/semiotics/document/document.md`
  - A document is an intentionally preserved sign whose provenance, arrangement, and purpose matter.
- `lab/archive/library/science/library/information/library/knowledge-systems/theories/predicated-knowledge-systems/concepts/discourse-community-as-fiber.md`
  - A discourse community is a scope/fiber with predicate vocabulary, closure rules, entity set, and consistency commitment.
- `lab/archive/library/science/library/information/library/knowledge-systems/theories/predicated-knowledge-systems/concepts/epistemic-closure.md`
  - Epistemic closure is settlement under a closure-rule system and is governed by the four closure regimes.
- `lab/archive/library/science/library/information/library/knowledge-systems/theories/predicated-knowledge-systems/code/structures/knowledge-fiber-algebra.md`
  - Knowledge fiber algebras are settled subalgebras of predication fibers for a scope.
- `lab/archive/library/science/library/information/library/knowledge-systems/theories/predicated-knowledge-systems/code/structures/predicated-knowledge-system.md`
  - Predicated knowledge systems package value lattice, predicate category, entities, closure rules, and scopes.

## Information-To-Computer Sources

- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/eavt/docs/dev/journal/2026-05-24.md`
  - EAVT is a computer-operating-system carrier for one transactionally located assertion, not a math object.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/spotcomp/hacking/library/typed-resource-catalog/docs/dev/specification.md`
  - TRC states schema as type/proposition/object, log as inhabiting fiber evidence, script as closure-rule morphism, dual filing, canonical identity, and G-Set federation.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/spotcomp/hacking/library/typed-resource-catalog/typed-resource-catalog.schema.json`
  - The active schema records the catalog-root-only view and notes the per-thing TRC discipline in description text.

## Computers-To-POSIX Sources

- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/operating-system.schema.json`
  - An operating system supervises subsystems and exposes a userland surface.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/doing/working/running/running.schema.json`
  - Computer-operating-system running includes starting, spawning, supervising, dispatching, stdio binding, signal forwarding, and stopping.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/path-category/docs/dev/journal/2026-05-24.md`
  - POSIX paths form a small path category whose root is initial and whose morphisms are ancestor-to-descendant containment.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/spotcomp/hacking/library/typed-resource-catalog/docs/dev/specification.md`
  - The TRC source states the regular-file, UTF-8, LF-delimited log, module-loading, package import, and failure-surfacing expectations inherited by the POSIX contract profile.

## Agentic Systems And Swarms

- `development/active/.../agentic-systems/agentic-systems.schema.json`
  - Agentic systems have member sets, governance processes, and governing souls.
- `development/active/.../agentic-systems/library/character/character.schema.json`
  - Characters carry agent kind, governance regime, skill generators, identity key, behavioral-space bounds, and sigma/delta commutation flags.
- `development/active/.../agentic-systems/library/swarm/swarm.schema.json`
  - Swarms are parallel character collections coordinating through a shared cell graph under a recognition discipline.
- `lab/hacking/library/tech-extra/tool-use/tool-use.md`
  - Tool use is the atomic host-executed action surface governed by function schemas.
- `lab/hacking/library/tech-extra/agent-memory/agent-memory.md`
  - Persistent state is supplied by durable memory/state mechanisms accessed through tool use.
- `lab/hacking/library/tech-extra/agent-orchestration/agent-orchestration.md`
  - Orchestration supplies state management, control flow, communication, observability, and conflict resolution for multi-step agentic execution.

## Bigraded Diamond And Swarm Mathematics

- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/kz-diamond-strict-commutation.md`
  - Source for the closure KZ / fibration KZ strict-commutation diamond and its axis-orthogonality argument.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/two-disentangled-kz-structures.md`
  - Separates fibration-KZ as vertical cleavage/indexing structure from closure-KZ as saturation structure.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bigraded-common-knowledge.md`
  - Defines truth-axis and knowledge-axis common-knowledge fixed points and records generic axis divergence.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/bigraded-settling-cohomology.md`
  - Defines the two-row bigraded cochain complex with truth and inconsistency rows.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/bigraded-aperiodic-regime-trichotomy.md`
  - Splits the aperiodic stratum into consistent, paraconsistent, and mixed sub-strata.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/bigraded-realizability-refinement.md`
  - Proves independent realizability of truth and inconsistency initial-segment classes on discrete predicate categories.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/multi-observer-system.md`
  - Defines multi-observer systems as functors from observer categories to settlings.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/network-sheaf-consensus-on-agent-graphs.md`
  - Specializes multi-observer systems to agent graphs and identifies consensus with limit/global sections.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence-with-per-observer-rules.md`
  - Extends convergence to observers with distinct closure rule systems and separates evidence-layer from inferential-layer paraconsistency.

## Aperiodic Swarm Witness Mathematics

- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/anderson-putnam-direct-limit.md`
  - Imports the inverse-limit/direct-limit cohomology pattern for aperiodic settling classification.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/aperiodic-classifying-invariant.md`
  - Defines the `H1` classifying invariant for aperiodic settlings and its step-n refinement.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/aperiodic-co-classifying-invariant.md`
  - Defines the cosheaf-side companion invariant and its Verdier-duality relation to the classifying invariant.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/step-n-substitution-rule.md`
  - Defines step-n substitution rules, substitution matrices, and the closure-rule shape used by substitution-flavored aperiodic settlings.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/step-n-classifying-invariant.md`
  - Defines the post-shift step-n classifying invariant and the rank-n claim under the theorem's hypotheses.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/mutually-locally-derivable.md`
  - Defines MLD equivalence for aperiodic settlings by invertible settling morphisms.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodic-regime-classification.md`
  - Gives the common-base classification of aperiodic settlings by equality of classifying invariants.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/step-n-and-bilattice-correspondence.md`
  - Proves only the n = 2, 3, 4 bilattice cardinality coincidence and records that structural correspondence needs more evidence.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/examples/benchmark-2-thue-morse.md`
  - Demonstrates the singular-matrix and bilattice-negation-commutation boundary: Thue-Morse is aperiodic and self-dual but not a generic rank-2 case.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/questions/aperiodic-swarm-classification.md`
  - Connects aperiodic settling classification to substitution-shaped swarm protocols and weighted/Pisot-stability obligations.

## Moduli, Descent, And Laplacian Mathematics

- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/meta-moduli-stack-theorem.md`
  - Gives the meta-moduli stack of closure-rule systems up to closure-equivalence, with effective descent through closure operators.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/meta-stratification-by-regime.md`
  - Stratifies closure-rule systems by the maximum regime their settlings can attain and by rule-language fragment.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/regime-decomposition.md`
  - Separates the settling-level coarse-moduli partition by actual settling regime from the meta-level rule-system stratification.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/d-frame-cohomology-framework.md`
  - Selects the Tarski/Lawvere Laplacian route for d-frame cohomology and treats shadow cohomology as scaffolding.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/cellular-extension-plan.md`
  - Gives the Q-enriched Grothendieck-site, fibered-cellular, and transfinite-cellular layers for the bitopological settling site.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md`
  - Gives Q-enriched Verdier sheaf/cosheaf duality on the bitopological settling site and the composed d-frame duality.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/q-enriched-sheaf-direct-inverse-image.md`
  - Names the Q-enriched six-functor package and its standard axioms for hyperdoctrine morphisms.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tarski-lawvere-fixed-point-grothendieck-sites.md`
  - Records the Tarski-Lawvere fixed-point statement for Grothendieck sites and its relation to direct-limit handling of transfinite covers.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/q-enriched-aperiodic-direct-limit-cohomology.md`
  - Gives the Q-enriched aperiodic direct-limit cohomology surface with generator slots at non-Scott-continuous firing ordinals.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/strong-mld-via-composed-duality.md`
  - Refines MLD by composed-duality firing-orbit type: truth-only, falsity-only, and top-firing.

## Regime Substitution Ladder Sources

- `development/experimental/spotcomp/REGIME-SUBSTITUTION-LADDER.md`
  - Current SPOTCOMP correction: staged substitution placement and `omega_1` benchmark lift status are separate axes.
    Padovan is finite/strict placement, Fibonacci is Scott-continuous placement, and Tribonacci is transfinite placement.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/step-n-substitution-rule.md`
  - Defines step-n substitution rules, substitution matrices, canonical examples, and the `E = omega_1` aperiodic-lift condition.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/step-n-moduli-substack.md`
  - Places Fibonacci and Thue-Morse in `M^(2)`, Padovan and Tribonacci in `M^(3)`, and Tetranacci in `M^(4)` as meta-moduli coordinates.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/examples/benchmark-1-fibonacci.md`
  - Computes the Fibonacci `E = omega_1`, `lambda = omega_1 + 1` benchmark lift as aperiodic.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/examples/benchmark-3-padovan.md`
  - Computes the Padovan `E = omega_1`, `lambda = omega_1 + 1` benchmark lift as aperiodic.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/examples/benchmark-suite-summary.md`
  - Summarizes the benchmark-suite regimes and explicitly leaves Scott-continuous cases out of that suite, which makes the suite a computation protocol rather than a staged-placement table.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/step-n-and-bilattice-correspondence.md`
  - Proves the `n = 2, 3, 4` cardinality coincidence and separates it from operation-level structural alignment.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/canonical-step-shift-resolution.md`
  - Shows Fibonacci-to-step-3 extension data including a Tribonacci branch, so step depth and named-family placement must remain explicit.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/critical-exponents-at-step-n-fixed-point.md`
  - Separates n-bonacci growth behavior from Padovan-style extension data, which prevents a single substitution ladder from being flattened to one generic recurrence.

## Realizability And Deformation Sources

- `development/experimental/spotcomp/REALIZABILITY-DEFORMATION.md`
  - Current SPOTCOMP declaration surface for the meta-realizability stack morphism, realizability axes, predicate-naturality coupling, tangent-dimension behavior, and CHL-stabilization checks.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/meta-realizability-map.md`
  - Gives `pi^real : M^SKH -> M^meta`, essential surjectivity, regime-respecting upper-bound behavior, and increment-sequence fibers.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/realizability-program.md`
  - Decomposes realizability by regime layer plus bigraded, predicate-naturality, and rule-language-fragment axes.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/realizability-cardinality-bound.md`
  - Bounds realizable firing-ordinal subsets under countable rule-system and countable-support increment restrictions, and records why unrestricted increments trivialize the question.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/c-naturality-coupling-realizability-refinement.md`
  - Gives the specialization, converse, subject-projection, object-projection, and orbit-closure coupling rules for per-predicate firing patterns.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tangent-dimension-constructible-non-semicontinuous.md`
  - Identifies tangent dimension with `Ext^1`, transports it through `H1`, gives per-regime values, and proves constructible but non-semicontinuous behavior.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/regime-stratification-non-semicontinuity.md`
  - Supplies the explicit `0, 1, 0` chain showing that knowledge-order enhancement can introduce then pre-empt non-Scott-continuous firings.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/chl-recursion-stabilization-check.md`
  - Gives the CHL recursion stabilization test as a comparison between meta-tangent and non-fiber settling tangent directions.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/meta-moduli-deformation-theory.md`
  - Gives the meta-deformation Ext surface and obstruction vocabulary used by the stabilization check; stale status metadata is not used as a downgrade here.

## Void Relationlessness And Stage Translation Sources

- `development/experimental/spotcomp/VOID-RELATIONLESSNESS-STAGES.md`
  - Current SPOTCOMP declaration surface translating old void-cone and failure-geometry vocabulary into articulating, predicating, positing, and settling.
- `development/active/library/void/void.schema.json`
  - Current active finite witness for void: JSON `null`, recording relationlessness at an articulation-content slot.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/potential-aperiodic-predication-cell.schema.json`
  - Current active witness that the potential aperiodic predication cell carries void in both articulation-content slots.
- `development/active/library/utterance/docs/dev/journal/2026-05-25.md`
  - Records utterance as the ordered token/claim carrier for articulating and explains why the pair gives the four aperiodic cell positions.
- `development/active/tests/check-articulating-predicating.mjs`
  - Executable active-tree witness for potential `[token, claim] / [null, null]`, active `[{}, null]`, stable `[null, {}]`, and absurd/both classifications.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/void-cone-cohomology.md`
  - Gives the void filtration associated graded and its apex `H1` pairing through Verdier sheaf/cosheaf duality; legacy `H0(Void_v)` language is treated as associated-graded/cosheaf-homology vocabulary here.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/void-cone-associated-graded-direct.md`
  - Gives the Verdier-independent chain-level identification between firing events and graded void-exit events.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/value-agnostic-void-cone.md`
  - Generalizes void to closure-pointed value categories with support-respecting closure and a closure-trivial element.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/void-cone-structure.md`
  - Records void-cone behavior by regime, conflation as void/fullness axis, negation as truth axis, and `V_infty` as limiting void.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/geometries-of-failure-dynamics-of-void.md`
  - Reads failure geometry as void dynamics and non-Scott-continuity obstruction, with the agentic reading of aperiodic continuing agency.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/lorentzian-apex-void-as-timelike-spacelike.md`
  - Gives the Lorentzian instance: apex as causally connected/timelike pairs and void as spacelike-separated pairs.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tropical-rank-collapse-classification.md`
  - Gives the shape-specific stability-cone and rank-collapse boundary for weighted continuous variants, including Padovan's opposite ordering.

## Trace Monoid Settlement Sources

- `development/experimental/spotcomp/TRACE-MONOID-SETTLEMENT.md`
  - Current SPOTCOMP declaration surface for history objects, independence relations, valuation actions, Foata-prefix evidence, CRDT convergence, and federation boundaries.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/trace-monoid/docs/dev/journal/2026-05-24.md`
  - Defines `M(Sigma,I) = Sigma* / ~_I`, with `I` symmetric and irreflexive, and places concurrent independent positings in a free partially commutative history monoid.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/trace-monoid/trace-monoid.schema.json`
  - Active schema for trace monoid evidence, including generator, independence, Foata, prefix, and history-category declarations.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/positing/hacking/library/positing-naturality/docs/dev/journal/2026-05-24.md`
  - Positing commutes with predicate reindexing, preserving the datum while moving the predicate/cell coordinate.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-fibration-2-category/hacking/closure-2-monad/hacking/library/closure-merge-commutation/docs/dev/journal/2026-05-24.md`
  - Lean-verified closure-merge commutation and distributed convergence results used to turn unordered independent histories into stable endpoint settlements.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/lean/PredicationCategories/Homebrew/Settling/CRDT.lean`
  - Formal CRDT convergence witness: closed initial state, writes, knowledge-join merge, closure between merges, and permutation-invariant final closure.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/distributed-settling-system.md`
  - Defines distributed settling systems as finite replicas exchanging states by pointwise knowledge-order join.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/settling-merge-semilattice.md`
  - Proves pointwise knowledge-order merge of predication settlings is commutative, associative, and idempotent.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/modeling-preorder-independence.md`
  - Separates modeling morphisms and preorder morphisms, preventing merge/order evidence from being mistaken for truth-side modeling evidence.
- `lab/archive/old-archive/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/from-gsu-ccs-20260313/math/history-and-fiber-algebra.md`
  - Earlier history/fiber-algebra bridge used as background for reading trace monoid histories as actions on predication fibers rather than as row-order artifacts.

## DRIP UAS Standards Sources

- `https://datatracker.ietf.org/wg/drip/documents/`
  - IETF Datatracker page listing the current DRIP working-group RFCs and active drafts; checked on 2026-05-28.
- `https://www.rfc-editor.org/rfc/rfc9153`
  - DRIP requirements and terminology for UAS Remote ID.
- `https://www.rfc-editor.org/rfc/rfc9374`
  - DRIP Entity Tag for UAS Remote ID.
- `https://www.rfc-editor.org/rfc/rfc9434`
  - DRIP architecture.
- `https://www.rfc-editor.org/rfc/rfc9575`
  - DET authentication formats and protocols for broadcast Remote ID.
- `https://www.rfc-editor.org/rfc/rfc9886`
  - DETs in DNS and DRIP Identity Management Entity registry lookup surface.

## Player Character Boundary Sources

- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/spotcomp/settling/library/player/player.schema.json`
  - Modeled player is an object of the observer category; the player itself is external and the system holds a settling representing the model.
    Character, peer, operator, inference-model, application, user, system, and observer are player kinds.
- `lab/archive/multi-user-dungeon/tab/docs/2026-03-11/agent-hierarchy.md`
  - Practical hierarchy: persona is persistent identity, role bundles skills, skill is decision procedure, methods/tools are callable execution surfaces.
- `lab/archive/doing/working/hacking/doing/working/planning/library/task/library/characters-as-cells/characters-as-cells.md`
  - Character records are system-resident cells with identity, boundary, capability-fiber, session, personnel/office/persona, memory, and soul-related surfaces.
- `lab/archive/old-archive/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/relating-archive/sscu-sprint/docs/math/structure/agent.md`
  - Agent structure has epistemic profile, normative regime, local flow/nucleus, commutation, stability, and monotone observation refinement.
- `lab/archive/old-archive/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/relating-archive/sscu-sprint/domains/universes/semiotic-universe/domains/interactive-semioverse/domains/agential-semioverse/agential-semioverse.md`
  - Internal agents have bounded internal state, admissible operators, policy, memory fragments, monotonicity, closure compatibility, fragment preservation, and failure monotonicity.
- `lab/archive/old-archive/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/relating-archive/sscu-sprint/domains/universes/semiotic-universe/domains/interactive-semioverse/domains/agential-semioverse/domains/computing/agential-semioverse-repository/theory/agent-skill-interaction.md`
  - Skill-first operation makes actions legible to the formal model; skill improvement is a monotone closure operation.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/teaching/teaching.md`
  - Teaching confers a skill, memory, or doctrine on a bearer record as a predication; it is distinct from host installation and preserves bearer conformance.

## Implementation Core Sources

- `development/experimental/spotcomp/library/implementation/specification.md`
  - Current consolidated implementable-core skeleton.
    It lines up exact EAVT rows, local JSONL item identity, RFC 7464 stream boundary, canonical row IDs, append-only/G-Set merge, recognition/admission, TRC/TDP replay, PAM closure, SHP packet projection, wire/federation morphisms, modeled-player runtime, and operations witnesses as one implementation proof surface.
- `development/experimental/spotcomp/NORMATIVE-FUNCTIONS.md`
  - Current basic function surface.
    It reads the JSONL EAVT log as the local SPOT carrier, the subject-predicate-object cell trace inside TRC/TDP, and names parse, identify, append, dual-file, merge, replay, posit, close, settle, project, read, transport, and admit as categorical implementation functions rather than independent subsystems.
- `development/experimental/spotcomp/FUNCTION-LAWS.md`
  - Current implementation law sheet for the basic function surface.
    It records parse soundness, row identity laws, append/dual-filing laws, G-Set merge laws, replay context laws, positing naturality boundary, closure/settlement laws, projection/read laws, transport/admission laws, composition paths, and standards attachment points.
- `development/experimental/spotcomp/OPERATIONAL-MATH-FUNCTIONS.md`
  - Current operational mathematical function surface.
    It moves beyond data-carrier specification by naming articulation/reification, fiber, delta-cell, reindexing, adjoint, positing, trace, replay, delta/sigma closure, recognition, governance, admission, projection, read, transport, modeled-player, learning, work, budget, cost, and ledger functions, plus the math gaps that must be looked up from the lab before executable conformance can be claimed.
- `development/experimental/spotcomp/TRACE-PACKET-TRANSPORT.md`
  - Current row/log/packet/wire/admission rulebook.
    It records carrier and standards rules for those functions, while keeping packets and transports inside the mathematics without making them the whole mathematics.
- `development/experimental/spotcomp/schema/implementation-core-profile.schema.json`, `development/experimental/spotcomp/examples/implementation-core-profile.json`, and `development/experimental/spotcomp/src/implementation-core-profile.mjs`
  - Current declaration probe for the implementation-core skeleton.
    It checks that a profile preserves the aperiodic-to-finite derivation direction, exact EAVT row carrier, JSONL/RFC 7464 stream boundary, canonical row identity, append/G-Set merge, admission gates, runtime surfaces, minimum component inventory, and non-conformance boundaries.
- `development/experimental/spotcomp/library/swarm-runtime/specification.md`
  - Current swarm runtime sub-specification skeleton.
    It consolidates modeled-player families over `(O, V, r)`, federation/admission, exact trace state, player-local loops, CGS/ludic handoff, packet/wire projection boundaries, operations/governance/cost, bigraded/aperiodic obligations, standards boundaries, and runtime non-conformance cases.
- `development/experimental/spotcomp/SWARM-FUNCTIONS.md`
  - Current function-composition contract for swarms.
    It composes parse, identify, admit, append, dual-file, replay, close/settle, project, transport, posit, read, and merge over JSONL EAVT SPOTs into external ingress, local player steps, shared trace federation, consensus/disagreement surfaces, CGS handoff, learning transitions, operations/cost paths, and aperiodic/bigraded evidence paths.
- `development/experimental/spotcomp/schema/swarm-runtime-profile.schema.json`, `development/experimental/spotcomp/examples/swarm-runtime-profile.json`, and `development/experimental/spotcomp/src/swarm-runtime-profile.mjs`
  - Current declaration probe for the swarm runtime skeleton.
    It checks that a profile declares the full swarm loop rather than relying on the minimal signed-envelope ingestion probe in `src/swarm.mjs`.

## Modeled Player Swarm Dynamics Sources

- `development/experimental/spotcomp/library/modeled-player/specification.md`
  - Current modeled-player sub-specification skeleton.
    It makes the external/model/player boundary, ruled observer-local settling carrier, I/O-as-articulation boundary, CGS handoff, swarm consensus/disagreement surfaces, aperiodic witness boundary, and governed learning transitions the owned modeled-player surface.
- `development/experimental/spotcomp/MODELED-PLAYER-SWARM-DYNAMICS.md`
  - Current SPOTCOMP declaration surface for modeled players as ruled observer-local settlings, with agentive positing, network-sheaf consensus, CGS strategy, transition dynamics, and aperiodic witness boundaries.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/multi-observer-system.md`
  - Defines `V : O -> Settlings_B`, consensus as limit, disagreement as pointwise divergence or cohomological obstruction, and observer-level MLD refinements.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/multi-observer-system-with-rules.md`
  - Extends multi-observer systems with per-observer closure-rule systems `r(o)`, separating evidence-layer from inferential-layer disagreement.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/transformers/agentive-positing-morphism.md`
  - Defines attributed positing `posit^a_(phi,q)` acting on observer-local and merged settlings, with assertion/claim status dependent on the global merged state.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/temporally-bounded-positing.md`
  - Provides assertion-time/truth-window machinery and the rule that retraction is denial positing rather than erasure.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/channel-theoretic-speech-acts.md`
  - Reads positing and closure as graded channel-theoretic incidence extension and information flow over the predication fiber.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/network-sheaf-consensus-on-agent-graphs.md`
  - Specializes multi-observer systems to finite agent graphs and identifies consensus/global sections, disagreement, and CALM-compatible merge surfaces.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md`
  - Lifts network-sheaf consensus to d-frame/bilattice structure and preserves con-failure/top disagreement witnesses.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/configuration-space-vs-trajectory.md`
  - Separates the predication fiber functor/configuration space from a settling trajectory, which prevents player frontiers from standing in for modeled-player space.
- `lab/archive/relating-repo/relating-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/tunneling-and-agential-dynamics.md`
  - Classifies agential dynamics as smooth within-class paths versus transition events from regime jumps, increments, or rule perturbations.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/library/category/hacking/library/ludics/docs/dev/journal/2026-05-24.md`
  - Places ludics as a paraconsistent linear-logic category on the predication-fiber substrate, sibling to CGS and other game-semantics categories, not as a settling-stage shortcut.

## Continuous Learning Sources

- `development/experimental/spotcomp/library/learning/specification.md`
  - Current learning sub-specification skeleton.
    It owns governed modeled-player learning as trace-bearing changes to represented state, skills, memory fragments, rule systems, and strategy-relevant behavior.
- `development/experimental/spotcomp/CONTINUOUS-LEARNING.md`
  - Current SPOTCOMP declaration surface for learning as monotone governed change in modeled-player represented state, skills, memory fragments, and closure-rule systems.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/learning/hacking/answering/docs/dev/journal/2026-05-24.md`
  - Places answering as positing a `(subject, predicate, object)` cell and value into `Phi = E x Pi x E`, producing a cell record at an asserted stratum.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/learning/hacking/answering/answering.schema.json`
  - Gives the structured answering surface used by the continuous-learning probe.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/learning/hacking/teaching/hacking/referencing/docs/dev/journal/2026-05-24.md`
  - Places referencing as projection out of the predication-cell-set by product projection or coordinate swap.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/learning/hacking/teaching/hacking/referencing/referencing.schema.json`
  - Gives the structured referencing surface used to separate projection from learning evidence.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/teaching/teaching.md`
  - Defines teaching as bearer-side predication that confers a skill, memory, or doctrine without mutating the conferred object and with idempotent behavior for repeated input.
- `lab/archive/old-archive/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/relating-archive/sscu-sprint/domains/universes/semiotic-universe/domains/interactive-semioverse/domains/agential-semioverse/agential-semioverse.md`
  - Models internal agents with admissible operators, policy, memory fragments, monotonicity, closure compatibility, fragment preservation, and failure monotonicity.
- `lab/archive/old-archive/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/relating-archive/sscu-sprint/domains/universes/semiotic-universe/domains/interactive-semioverse/domains/agential-semioverse/domains/computing/agential-semioverse-repository/theory/agent-skill-interaction.md`
  - Treats skill improvement as a monotone closure operation from prior skill plus new requirement to a fixed point preserving prior cases.
- `lab/hacking/library/tech-extra/agent-memory/agent-memory.md`
  - Separates volatile context, checkpoints, approximate retrieval, structured knowledge, and durable file-backed memory as different memory surfaces.
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/library/category/hacking/library/ludics/docs/dev/journal/2026-05-24.md`
  - Keeps learning-in-play under the ludic and CGS boundary rather than outside modeled-player strategy.

## Governance And Capabilities

- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/governance/assets/computing/platform/pypredcomp/docs/dev/decisions/authorization-is-modal-restriction.md`
  - Authorization surfaces are one modal restriction operator over one accessibility relation.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/governance/assets/computing/platform/pypredcomp/docs/dev/specs/security/capability-model.md`
  - Capabilities are substrate cells; capability checks are fiber implication; delegation is non-amplifying.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/governance/assets/computing/platform/pypredcomp/docs/dev/specs/filesystem/capability-permissions.md`
  - Action capabilities gate state-authoring surfaces before ord-stamp or state advance.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/governance/assets/computing/platform/pypredcomp/src/security/capabilities.py`
  - The implementation slice centralizes token-aligned capability matching and raises insufficient-scope errors for denied action-capability calls.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/governance/assets/computing/platform/pypredcomp/src/substrate/respond.py`
  - The modal authorization gate can yield a vacuous no-cell/no-event outcome on denial.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/governance/assets/computing/platform/pypredcomp/tests/conformance/test_modal_authz_box.py`
  - Tests truth-meet preservation, non-amplification, one relation across six surfaces, and no-state-advance denial.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/theories/predicated-computing/governance/assets/computing/platform/pypredcomp/tests/conformance/test_t02_32f_observer_authoring.py`
  - Observer role fixtures show restricted authoring surfaces and denied side effects without event or fiber advance.

## Concurrent Game Systems

- `development/experimental/spotcomp/library/cgs/specification.md`
  - Current CGS sub-specification skeleton.
    It owns the prime-event-structure object boundary, Player/Opponent polarity, conflict versus bilattice inconsistency distinction, symmetry groupoid, concurrent strategy morphism on `A^perp || B`, and interaction-and-hiding composition.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/code/structures/cgs.md`
  - Defines CGS as the ambient `*`-autonomous category: objects are prime event structures with symmetry and polarity; morphisms are concurrent strategies on `A^perp || B`.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predication-cell/hacking/library/event/hacking/library/event-structure/hacking/library/prime-event-structure/docs/dev/journal/2026-05-26.md`
  - Records prime event structures, conflict inheritance, minimal-conflict presentation, polarity, and symmetry groupoid as CGS object data.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predication-cell/hacking/library/event/hacking/library/event-structure/hacking/library/arena/hacking/library/strategy/hacking/library/concurrent-strategy/docs/dev/journal/2026-05-26.md`
  - Records concurrent strategies, receptivity, no Player-sequentialization requirement, strategy interaction, and hiding.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predication-cell/hacking/library/event/hacking/library/event-structure/hacking/library/arena/hacking/library/strategy/hacking/library/innocent-strategy/docs/dev/journal/2026-05-26.md`
  - Records innocent/sequential strategies as deterministic concurrent strategies and therefore special cases of the general swarm model.
- `development/experimental/spotcomp/CGS-STRATEGY-LAWS.md`
  - Separates the CGS strategy morphism laws from event-shape declarations: `A^perp || B`, receptivity, symmetry quotient, interaction-and-hiding composition, and sequential/innocent restrictions.

## Recognition And Admission Sources

- `development/experimental/spotcomp/TRACE-AXES.md`
  - Records `recognition-fiber` as a required trace axis and states that finite row presentations forget it unless another resource carries it.
- `development/experimental/spotcomp/AGENTIC-EMBEDDING.md`
  - Records swarms as shared trace/cell-graph coordination under recognition discipline, with structural roles derived from recognition cells and governance.
- `development/experimental/spotcomp/INFORMATION-GAMES.md`
  - Records informational objects as receiver-relative and requiring a recognition fiber before observation maps become game views.
- `development/experimental/spotcomp/CGS-EMBEDDING.md`
  - Records admitted federate delivery as causally depending on verification and governance checks, and rejected admissions as candidate conflict evidence.
- `development/active/proof-engine/predication-cell-trace-shape.mjs`
  - Shape recognition checks schema conformance and knowledge monotonicity for a predication-cell trace; it does not settle full recognition.
- `development/active/proof-engine/finite-predication-cell-trace-shape.mjs`
  - Shape recognition checks same-cell, time monotonicity, stratum monotonicity, knowledge monotonicity, and local provenance accumulativity.
- `development/active/proof-engine/finite-predication-trace-family-shape.mjs`
  - Shape recognition checks finite trace-family carrier shape and duplicate cell-trace rejection.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/learning/hacking/answering/docs/dev/journal/2026-05-24.md`
  - Positing a cell-record into the predication-cell-set admits it at stratum `asserted`; this is admission into a substrate realization, not proof of final recognition settlement.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/library/illocution/docs/dev/journal/2026-05-24.md`
  - The illocution alias is a one-step recognition by tradition and is explicitly not formally derived, motivating scoped recognition obligations.

## Implementation Smoke Tests

- `development/active/hacking/tests/articulating-predicating.test.mjs`
  - Shows the active tree's current ordered-pair realization of predicating and its FOUR classification.
- `development/active/hacking/tests/predication-cell-set.test.mjs`
  - User or concurrent-session work currently modifies this area.
    This workspace does not touch it.

## User Guidance Captured In This Session

- EAVT is the trace, not a special envelope around a FOUR value.
- JSONL EAVT logs are Scott-continuous traces.
- Semantic Hypertext Packets, not plain text documentation formats, are the relevant finite hypertext projection surface for SPOTCOMP proper.
- In `active/`, each `library/$thing/` is the initial object of a category; `$thing/$morphism` names category generators; `$thing/library/$object` names codomains of those generators.
- The dependency direction to respect is articulating to predicating to positing to settling, and aperiodic to finite.
- The stage-category direction is articulating as aperiodic predication category, predicating as transfinite predication category, positing as Scott-continuous predication category, and settling as finite predication category.
- Closure and final settlement are controlled by closure 2-monad, settling endofunctor, sigma/delta, and least-fixed-point evidence; bounded fuel is partial unless that evidence is present.
- CHL language columns are distinct cone-leg functor projections from one language apex; cross-tradition coincidence is a scoped theorem, not a definition that collapses all column morphisms.
- Path derivation should ask whether a node is a category or generator, and whether a generator extends or restricts its domain.

## Prelocutionary Ingress Sources

- `development/active/library/utterance/docs/dev/journal/2026-05-25.md`
  - Utterance is the ordered token/claim carrier that articulating takes as input; it is not itself an act.
- `development/active/library/token/docs/dev/journal/2026-05-25.md`
  - Token is a non-assembling primitive and the atomic identity-carrying side of utterance; string presentation is not categorical identity.
- `development/active/library/claim/docs/dev/journal/2026-05-25.md`
  - Claim is a non-assembling primitive and the atomic content-carrying side of utterance; token/claim position is load-bearing.
- `development/active/articulating/articulating.schema.json`
  - Articulating is the constitutive generator from utterance to the aperiodic predication category.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/library/locution/docs/dev/journal/2026-05-24.md`
  - Locution is environmental delivery and typed decoding; argv, hook payload, and HTTP receive are distinct from pure positing and closure.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/settling/hacking/illocuting/library/illocution/docs/dev/journal/2026-05-24.md`
  - Illocution is event-bounded positing: a position/datum act with no downstream entailment baked in.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/settling/hacking/perlocuting/library/perlocution/docs/dev/journal/2026-05-24.md`
  - Perlocution is process-bounded closure propagation to a least fixed point and is distinct from illocution.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/hacking/library/positing-entry/docs/dev/journal/2026-05-24.md`
  - Positing-entry is an append-only event object and does not carry projected charge/value as a field.

## Generator Variance Sources

- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/hacking/extending/extending.md`
  - Extension is structural containment by monomorphism or structure-preserving injection, not mere set inclusion or logical implication.
    It is reflexive and transitive.
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/specializing/specializing.md`
  - Specializing presents faithful subcategory inclusion or invariant-cut subcategory structure.
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/remarks/specialization-as-open-immersion.md`
  - Specialization has `exists_f |- f* |- forall_f`; restriction/reindexing and adjoint extension positions must not be conflated.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/docs/dev/journal/2026-05-27.md`
  - Enumerating extends compact cell-set data `{entity-set: E, predicate-set: Pi}` into explicit generated positions `E x Pi x E`.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/settling/sampling-a-predication-cell/docs/dev/journal/2026-05-24.md`
  - Sampling a predication cell adds a finite sample presentation for supplied cell, datum, and transaction; no default truth is introduced.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predication-cell/slicing-to-predication-cell-trace/docs/dev/journal/2026-05-27.md`
  - Cell-trace slicing restricts a global predication-settling and fixed cell to the Scott-continuous trace over that cell; the finite array is only a checkable presentation.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/settling/assembling-from-predication-settling/docs/dev/journal/2026-05-27.md`
  - Assembling from predication settling restricts a valuation trajectory to finite settling trace-family presentation and forgets global valuation maps after cellwise slicing.
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/settling/hacking/library/local-settling/docs/dev/journal/2026-05-24.md`
  - Local settling is a bounded restriction of universal settling to `Phi_X`; local fixed points are contained in the global fixed point.

## CHL Language Cone Sources

- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/library/category/library/language/docs/dev/journal/2026-05-24.md`
  - CHL language is a category with open-ended column-leg functors from a shared apex; columns remain distinct except under scoped coincidence.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/library/category/library/language/hacking/path-resolving/library/path-resolution/docs/dev/journal/2026-05-24.md`
  - Path-resolving is the path-theory column morphism; Yoneda on the POSIX path category makes path identity categorical.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/agents/hacking/library/claude/hacking/library/claude-code/inferring/hacking/parsing/hacking/detecting/hacking/library/styling-pattern/hacking/library/idiom/hacking/library/by-chl-language-cones/hacking/library/type-as-proposition-as-object/docs/dev/journal/2026-05-24.md`
  - Schema placement is a type/proposition/object claim and schema identity must cohere with path identity.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/agents/hacking/library/claude/hacking/library/claude-code/inferring/hacking/parsing/hacking/detecting/hacking/library/styling-pattern/hacking/library/idiom/hacking/library/by-chl-language-cones/hacking/library/term-as-proof-as-morphism/docs/dev/journal/2026-05-24.md`
  - Script default export is the morphism handle; pure morphisms and wrappers are distinct categorical positions.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/agents/hacking/library/claude/hacking/library/claude-code/inferring/hacking/parsing/hacking/detecting/hacking/library/styling-pattern/hacking/library/idiom/hacking/library/by-chl-language-cones/hacking/library/function-type-as-implication-as-exponential/docs/dev/journal/2026-05-24.md`
  - Script with input and output schemas is a witness of function type, implication, and exponential morphism.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/agents/hacking/library/claude/hacking/library/claude-code/inferring/hacking/parsing/hacking/detecting/hacking/library/styling-pattern/hacking/library/idiom/hacking/library/by-chl-language-cones/hacking/library/categorical-model-as-cone-apex/docs/dev/journal/2026-05-24.md`
  - Cross-column translations factor through the categorical apex or they are not CHL translations.
- `development/active/articulating/docs/dev/journal/2026-05-25-shadows-and-apex-tower.md`
  - Illocution, term-instantiation, existential push-forward, and SPOTCOMP positing are discipline-specific shadows of one tower position, not one untyped morphism.

## SHP Sources

- `development/experimental/spotcomp/library/shp/specification.md`
  - Current SHP sub-specification skeleton.
    It treats Semantic Hypertext Packets as finite packet projection objects with class-as-morphism identities, `data-*` carrier coordinates, trace-frontier linkage, RFC 7992 inhabitant profile, and packet-safety obligations.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/spotcomp/hacking/library/semantic-hypertext-packet/docs/dev/journal/2026-05-26.md`
  - SHP uses class attributes as morphism identities, `data-*` attributes as input-carrier elements, and nested HTML as carrier-of-carriers structure.
    SHP and TRC are siblings under SPOTCOMP.
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/spotcomp/hacking/library/semantic-hypertext-packet/library/rfc-7992/docs/dev/journal/2026-05-24.md`
  - RFC 7992 is the current RFC-shaped SHP inhabitant profile.
- RFC 7992
  - Defines the HTML format for RFCs; used here only as an SHP inhabitant profile, not as the whole SHP object.

## IETF And Wire Sources

- `development/experimental/spotcomp/library/wire-federation/specification.md`
  - Current wire/federation sub-specification skeleton.
    It treats JSON, canonicalization, signatures, HTTP, problem details, media types, JSON text sequences, DRIP/UAS, and federation admission as standards-constrained representation and admission morphisms.
- RFC 3629
  - Defines UTF-8.
- RFC 3339
  - Defines the Internet date/time profile used for timestamp strings.
- RFC 5646
  - Defines language tags.
- RFC 6838
  - Media type registration procedures and registration trees.
- RFC 6839
  - Registers the `+json` structured syntax suffix.
- RFC 7464
  - Defines JSON text sequences and `application/json-seq`; the sequence format has no canonical JSON form, so signatures must bind item bytes or a manifest.
- RFC 8259
  - Defines JSON syntax.
- RFC 7493
  - Defines I-JSON constraints used by JCS: UTF-8, duplicate-name rejection, Unicode restrictions, and interoperable number boundaries.
- RFC 8785
  - Defines JSON Canonicalization Scheme for deterministic JSON bytes, including I-JSON preconditions, no token whitespace, recursive object-property sorting, and preserving array order.
- RFC 8032
  - Defines Ed25519 as an EdDSA instantiation.
- RFC 8410
  - Defines Ed25519 identifiers for X.
    509/SPKI contexts.
- RFC 9110
  - Defines HTTP semantics including `Content-Type`.
- RFC 9457
  - Defines problem details and `application/problem+json`.
- RFC 7992
  - Defines the RFC HTML format used as an SHP inhabitant profile.

## Chunk-Chain Sources

- `lab/hacking/library/being/doing/library/library/information/knowing-as-settling/knowing-as-settling.md`
  - Knowing is settlement under a community's closure-rule system.
- `lab/hacking/library/being/doing/library/philosophy/semiotics/information/information.md`
  - Information is receiver-relative uncertainty reduction, not raw data.
- `lab/hacking/library/being/doing/library/library/information/aboutness/aboutness.md`
  - Aboutness is predication participation and is community-relative under closure.
- `lab/hacking/library/being/doing/library/philosophy/semiotics/document/document.md`
  - A document is a preserved sign with provenance and arrangement, not automatically a SPOTCOMP packet.
- `development/active/.../computer-operating-system/hacking/library/eavt/docs/dev/journal/2026-05-24.md`
  - EAVT is a computer-operating-system substrate carrier for persisted trace rows.
- `development/active/.../spotcomp/hacking/library/typed-resource-catalog/docs/dev/specification.md`
  - TRC gives the schema/log/script discipline, dual filing, per-thing logs, import aliases, append-only semantics, and G-Set federation.
    Its rich trace axes (causal, recognition, refinement, provenance) are trace metadata or declared projections, never EAVT row fields.
    The row is exactly `{e, a, v, t}` — Subject, Predicate, Object, Trace-time — with no fifth field, because standards conformance requires EAVT to be EAVT without exception.
- `development/active/.../path-category/docs/dev/journal/2026-05-24.md`
  - POSIX paths form the path category; root is initial and paths are identities by Yoneda.
- `development/active/.../category/library/language/hacking/path-resolving/library/path-resolution/docs/dev/journal/2026-05-24.md`
  - Path-resolving is SPOTCOMP's path-theory column morphism; path identity is the ancestor-chain hom-functor plus reference edges, and coincidence with other CHL columns is theorem-bound.
- `development/active/.../agentic-systems/*.schema.json`
  - Agentic systems, characters, and swarms carry governance, skills, identity keys, recognition, and shared cell-graph coordination.
- `development/active/.../game-system/hacking/library/concurrent-game-system/docs/dev/journal/2026-05-24.md`
  - CGS supplies the typed theory of computing and SPOTCOMP bridges for federation, handedness, and name mobility.
- `development/active/.../event-structure/hacking/library/arena/hacking/library/strategy/docs/dev/journal/2026-05-26.md`
  - Strategies act from configurations and local views; sequential innocence is a restriction of concurrent strategy.
