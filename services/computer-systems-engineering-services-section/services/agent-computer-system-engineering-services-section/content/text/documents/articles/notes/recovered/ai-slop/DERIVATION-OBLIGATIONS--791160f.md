# Derivation Obligations

Status: blocking obligations for final conformance.
Each item must be closed by proof, a cited theorem already present in the repo, or an explicit non-goal before SPOTCOMP can be called implementable in the strong normative sense.

## D0. Implementation Subordination

The code in `src/` is a probe.
It cannot define SPOTCOMP.
If the probe and the derivation disagree, the probe changes.

Evidence needed:

- conformance matrix that cites math/source obligations before code behavior;
- tests named as law probes, not as complete conformance tests.

## D0a. Sub-Specification Family

Split the monolithic SPOTCOMP draft into named sub-specifications before claiming normative implementability.
PAM, TRC/TDP, SHP, wire/federation, operating, modeled-player, CGS, and learning surfaces must have distinct documents with declared dependencies and handoff objects.
TRC and TDP are one on-disk object seen as catalog and running theory derivation program.

Evidence needed:

- PAM specification as Predicate Algebra Modeling, not an undefined acronym;
- derivation of PAM instruction classes from the predication-fiber machinery;
- value-profile parameterization that does not privilege the finite FOUR profile;
- TRC/TDP/PAM boundary between closure-rule programs and wavefront model settlement;
- TRC/TDP/PAM boundary between typed resource catalog and model kernel;
- SHP/PAM boundary between witness/projection and packet output;
- modeled-player/PAM boundary between local settling model and CGS strategy;
- conformance matrix assigning each requirement to one owning sub-specification.

Current working surface: [library/pam/specification.md](./library/pam/specification.md), [library/trc-tdp/specification.md](./library/trc-tdp/specification.md), [library/operations/specification.md](./library/operations/specification.md), [library/cgs/specification.md](./library/cgs/specification.md), [library/modeled-player/specification.md](./library/modeled-player/specification.md), [library/implementation/specification.md](./library/implementation/specification.md), [library/swarm-runtime/specification.md](./library/swarm-runtime/specification.md), [library/shp/specification.md](./library/shp/specification.md), [library/wire-federation/specification.md](./library/wire-federation/specification.md), and [library/learning/specification.md](./library/learning/specification.md).
These files are normative skeletons, not complete standards.

## D0b. Operations Specification

Derive the operating layer as typed substrate content, not as external project management or host bookkeeping.
Being, doing, working, governing, work types, processes, procedures, ledgers, budgets, costs, and stationarity claims must all cite predication, settlement, witness, and cost machinery.

Evidence needed:

- being/doing/working/governing derived from Hoare strata and stage categories;
- work-type classification for process, procedure, derivation, and inquiry;
- operations-loop mapping from planning/dispatch/execution/tracking/review/ feedback to sigma/delta, history extension, global sections, and nucleus update;
- process record schema tied to deployment, capabilities, syscall policy, and spawn/exit witnesses;
- procedure record schema with preconditions, steps, actors, budgets, witnesses, postconditions, and downgrade behavior;
- ledger projection from witnesses to balanced postings with commodities;
- budget records with exhaustion policy and reset/coherence witnesses;
- Lawvere-quantale cost domain and composition laws;
- reads-free theorem carried into implementation boundaries;
- stationarity, detailed-balance, Laplacian, and Laplacianization handoff evidence.

Current working surface: [library/operations/specification.md](./library/operations/specification.md), [schema/operations-profile.schema.json](./schema/operations-profile.schema.json), [src/operations-profile.mjs](./src/operations-profile.mjs), [schema/operations-records.schema.json](./schema/operations-records.schema.json), and [src/operations-records.mjs](./src/operations-records.mjs).
The profile checker validates declaration shape for the operations layer; the records checker validates finite bundles for process, procedure, work event, budget, ledger posting, cost event, and operations-loop records.
They do not prove the Hoare/stage derivation, ledger projection theorem, budget/coherence laws, Lawvere-quantale settlement profile, or Laplacianization handoff.

## D1. Trace Object Derivation

Derive EAVT JSONL traces from positing as the Scott-continuous trace generator.

Evidence needed:

- row identity law;
- append monotonicity;
- directed-join behavior;
- independence relation for trace-monoid commutation;
- boundary between trace event, finite row presentation, and projected artifact.

Current working surface: [TRACE-AXES.md](./TRACE-AXES.md), [schema/trace-axis-profile.schema.json](./schema/trace-axis-profile.schema.json), and [src/trace-axis-profile.mjs](./src/trace-axis-profile.mjs).
This surface checks declaration shape for the rich trace axes and finite-presentation boundary; it does not close D1.

Related working surface: [POSITING.md](./POSITING.md), [schema/positing-profile.schema.json](./schema/positing-profile.schema.json), and [src/positing-profile.mjs](./src/positing-profile.mjs) separate categorical positing from EAVT event presentation and downstream effects.

History-action working surface: [TRACE-MONOID-SETTLEMENT.md](./TRACE-MONOID-SETTLEMENT.md), [schema/trace-monoid-settlement-profile.schema.json](./schema/trace-monoid-settlement-profile.schema.json), and [src/trace-monoid-settlement-profile.mjs](./src/trace-monoid-settlement-profile.mjs) validate declarations for trace-monoid histories, independence relation, valuation action, same-trace-class valuation equality, Foata/prefix evidence, and CRDT convergence conditions.
It does not compute history normal forms, prove independence from rows, or execute closure.

IETF identity working surface: [CANONICAL-IDENTITY.md](./CANONICAL-IDENTITY.md), [schema/canonical-identity-profile.schema.json](./schema/canonical-identity-profile.schema.json), and [src/canonical-identity-profile.mjs](./src/canonical-identity-profile.mjs) validate declaration shape for row IDs, JCS/I-JSON preconditions, envelope signature input, stream item identity, and timestamp policy.
The checker does not implement a complete JCS canonicalizer or duplicate-detecting parser.

## D2. Fiber Algebra Derivation

Derive value interpretation from the active predication-fiber algebra, not from a fixed FOUR carrier.

Evidence needed:

- declaration of parameter lattice `L`;
- entity-pair index `E x E`;
- twist-product operations;
- boolean specialization into FOUR as a projection/special case;
- validation rule that keeps non-FOUR fibers legal.

Current working surface: [PREDICATION-FIBER-ALGEBRA.md](./PREDICATION-FIBER-ALGEBRA.md), [PREDICATION-FIBER-QUANTIFIERS.md](./PREDICATION-FIBER-QUANTIFIERS.md), [schema/predication-fiber-profile.schema.json](./schema/predication-fiber-profile.schema.json), [src/predication-fiber-profile.mjs](./src/predication-fiber-profile.mjs), [schema/predication-fiber-quantifier-profile.schema.json](./schema/predication-fiber-quantifier-profile.schema.json), and [src/predication-fiber-quantifier-profile.mjs](./src/predication-fiber-quantifier-profile.mjs) validate declaration shape for the base lattice/category/entity parameters, pointwise fiber algebra, fibration axioms, hyperdoctrine properties, reindexing/quantifier adjunctions, FOUR boundary, and implementation boundary.
The checkers do not prove twist-product residuation, generator exhaustiveness, Beck-Chevalley, Frobenius, comprehension, specialization quantifier adjoints, or the full arbitrary-`L` theorem.

## D3. Category/Generator/Codomain Path Typing

Specify a checker for path roles: category root, generator, codomain object, trace, schema witness, script witness, projection artifact, and implementation support.

Evidence needed:

- path grammar;
- initial-object witness for category roots;
- generator variance declaration;
- codomain proof target;
- rejection cases for object-oriented or containment-only placements.

Current working surface: [PATH-TYPING.md](./PATH-TYPING.md) and [schema/path-role.schema.json](./schema/path-role.schema.json).

## D4. Extension/Restriction Variance

For each generator used by SPOTCOMP, prove whether it extends or restricts its domain.

Evidence needed:

- extension and restriction criteria;
- examples from predication-cell-set extension and cell-trace slicing restriction;
- consequence for codomain shape;
- audit representation in EAVT rows.

Current working surface: [GENERATOR-VARIANCE.md](./GENERATOR-VARIANCE.md), [schema/generator-variance-profile.schema.json](./schema/generator-variance-profile.schema.json), and [src/generator-variance-profile.mjs](./src/generator-variance-profile.mjs) validate declaration shape for extension embeddings, restriction frontiers, coincidence scopes, required predication examples, and implementation boundaries.
The checker does not prove embeddings, restriction functoriality, scoped coincidence, or the final EAVT audit vocabulary.

## D5. CHL Language Cone Separation

Keep CHL language columns and morphism positions distinct unless a coincidence theorem applies.

Evidence needed:

- list of distinct morphisms relevant to SPOTCOMP: articulating, predicating, positing, settling, proof, term-instantiation, existential push-forward, SHP projection;
- specialization/coincidence theorem references;
- spec text forbidding collapse of these morphisms into one generic "assert" or "settle" operation.

Current working surface: [POSITING.md](./POSITING.md) checks the locution/illocution/perlocution split and records positing as the native morphism under the speech-act, term-instantiation, and existential-push-forward aliases.
It does not prove the full CHL coincidence theorem.

Related working surface: [PREDICATION-STAGES.md](./PREDICATION-STAGES.md), [schema/predication-stage-profile.schema.json](./schema/predication-stage-profile.schema.json), and [src/predication-stage-profile.mjs](./src/predication-stage-profile.mjs) declare the four stage categories that prelocutionary and locutionary handlers must preserve.

Ingress working surface: [PRELOCUTIONARY-INGRESS.md](./PRELOCUTIONARY-INGRESS.md), [schema/prelocutionary-ingress-profile.schema.json](./schema/prelocutionary-ingress-profile.schema.json), and [src/prelocutionary-ingress-profile.mjs](./src/prelocutionary-ingress-profile.mjs) declare token/claim/utterance grounding, articulating ingress, locutionary handler classes, and parse-before-illocution boundaries.
The checker does not prove token-before-claim ordering or articulating category generation.

Current working surface: [CHL-LANGUAGE-CONES.md](./CHL-LANGUAGE-CONES.md), [schema/chl-language-profile.schema.json](./schema/chl-language-profile.schema.json), and [src/chl-language-profile.mjs](./src/chl-language-profile.mjs) validate declaration shape for the CHL language apex, required column legs, distinct SPOTCOMP morphism inventory, scoped coincidence policy, path-theory column, and implementation boundary.
The checker does not prove the coincidence theorem or derive the full path-theory cone-leg.

## D6. Regime Record And Federation Discipline

Make regime declaration load-bearing for runtime and federation.

Evidence needed:

- strict, Scott-continuous, transfinite-bounded, and aperiodic regime record schema;
- allowed federation payloads per regime;
- rule that endpoint-state shipping is insufficient for transfinite-bounded and aperiodic regimes;
- trajectory format for non-Scott-continuous firing ordinals.

Current working surface: [REGIME-FEDERATION.md](./REGIME-FEDERATION.md), [schema/regime-record.schema.json](./schema/regime-record.schema.json), and [schema/federation-profile.schema.json](./schema/federation-profile.schema.json).

## D7. Bigraded Cohomology Audit Surface

Define the audit surface for bigraded settling cohomology without requiring every implementation to compute all advanced invariants initially.

Evidence needed:

- designation-grade and cohomological-degree coordinates;
- where `H^1_t` and `H^1_top` appear in a swarm audit;
- K4-sector projection when FOUR-specialized fibers are used;
- downgrade behavior when a checker cannot prove vanishing.

Current working surface: [COHOMOLOGY-AUDIT.md](./COHOMOLOGY-AUDIT.md), [schema/cohomology-audit-profile.schema.json](./schema/cohomology-audit-profile.schema.json), and [src/cohomology-audit-profile.mjs](./src/cohomology-audit-profile.mjs).
The checker validates declarations only; it does not compute cohomology, prove vanishing/non-vanishing, derive top-cell membership, or validate cached cohomology values.

## D8. SHP Object And Projection Morphism

Derive the SHP object and the SHP projection morphism from the active SPOTCOMP placement.

Evidence needed:

- SHP object schema;
- RFC 7992 inhabitant profile;
- class-as-morphism-identity rule;
- data-carrier rule;
- monotone annotation/settlement rule;
- no alternate plain-text packet profile.

Current working surface: [SHP.md](./SHP.md), [schema/shp-profile.schema.json](./schema/shp-profile.schema.json), and [src/shp-profile.mjs](./src/shp-profile.mjs).
The checker validates declarations only; it does not prove the SHP object derivation, full RFC 7992 conformance, HTML parser correctness, or projection-morphism placement relative to settling and TRC.

## D9. Modeled-Player CGS Embedding

Derive modeled players from concurrent games with symmetry.

Evidence needed:

- mapping from EAVT trace events to event-structure events;
- causality and conflict extraction;
- Player/Opponent polarity rule;
- handedness and observation bounds as strategy constraints;
- symmetry groupoid for player/replica/order equivalence;
- strategy equivalence relation for swarm conformance.

Current working surface: [CGS-EMBEDDING.md](./CGS-EMBEDDING.md) and [schema/cgs-profile.schema.json](./schema/cgs-profile.schema.json).
The checker is declaration-level only; it does not prove receptivity, innocence, interaction-and-hiding composition, or symmetry-groupoid laws.

Strategy-law working surface: [CGS-STRATEGY-LAWS.md](./CGS-STRATEGY-LAWS.md), [schema/cgs-strategy-laws-profile.schema.json](./schema/cgs-strategy-laws-profile.schema.json), and [src/cgs-strategy-laws-profile.mjs](./src/cgs-strategy-laws-profile.mjs) validate declaration shape for CGS object boundaries, strategy morphism boundaries, receptivity, symmetry quotienting, interaction-and-hiding composition, and sequential/innocent restrictions.
The checker does not prove those laws.

Information-side preconditions for this embedding are tracked in [INFORMATION-GAMES.md](./INFORMATION-GAMES.md) and [schema/information-game-profile.schema.json](./schema/information-game-profile.schema.json).
That checker remains declaration-level and does not prove the information-to-CGS functor.

Player/character terminology and binding preconditions are tracked in [PLAYER-CHARACTER-BOUNDARY.md](./PLAYER-CHARACTER-BOUNDARY.md), [schema/player-character-profile.schema.json](./schema/player-character-profile.schema.json), and [src/player-character-profile.mjs](./src/player-character-profile.mjs).
That checker is declaration-level only; it does not prove local-settling correctness, skill admissibility, modal governance, host installation correctness, CGS receptivity, or strategy composition.

## D10. IETF Standards Binding

Bind the stable mathematical objects to IETF standards only after the object boundary is fixed.

Evidence needed:

- RFC 8785 canonical JSON for signed payload identity;
- RFC 8032 Ed25519 or another specified signature profile;
- RFC 8259 JSON constraints and duplicate-key handling;
- RFC 9110/9112 HTTP transport profile if HTTP is used;
- RFC 3986/3987 identifier policy;
- RFC 7992/WHATWG HTML constraints for RFC-structured SHP packets.

Current working surface: [WIRE-PROFILES.md](./WIRE-PROFILES.md), [schema/wire-profile.schema.json](./schema/wire-profile.schema.json), [src/wire-profile.mjs](./src/wire-profile.mjs), [schema/federation-admission-profile.schema.json](./schema/federation-admission-profile.schema.json), and [src/federation-admission-profile.mjs](./src/federation-admission-profile.mjs).
The checkers validate declarations only; they do not register media types, validate live HTTP exchanges, run TLS, perform complete canonicalization, verify real signatures, execute local admission, or prove signature implementation correctness.

Canonical identity working surface: [CANONICAL-IDENTITY.md](./CANONICAL-IDENTITY.md), [schema/canonical-identity-profile.schema.json](./schema/canonical-identity-profile.schema.json), and [src/canonical-identity-profile.mjs](./src/canonical-identity-profile.mjs) add RFC 7493/I-JSON, RFC 8785/JCS, RFC 7464 item identity, RFC 3339 timestamp, and RFC 8032 signature-input obligations.
It does not close cryptographic correctness or parser correctness.

## D11. Conformance Test Suite

Turn the obligations above into executable conformance checks.

Evidence needed:

- trace-law tests;
- path-typing tests;
- extension/restriction declaration tests;
- regime/federation compatibility tests;
- SHP packet validation tests;
- CGS modeled-player fixture tests.

## D12. Chunk Chain Derivation

Derive the large interstitial chunks named in [CHUNK-MAP.md](./CHUNK-MAP.md).

Evidence needed:

- `settling -> information`: category of settled informational artifacts, receiver-relative uncertainty reduction, provenance, and aboutness closure;
- `information -> computers`: reason why executable/persistent computer substrate has schema/log/script structure and EAVT trace carriers;
- `computers -> POSIX`: exact POSIX assumptions needed by SPOTCOMP;
- `POSIX -> SPOTCOMP`: path-theory cone-leg, path-typing checker, TRC discipline, and dual-filing proof;
- `computers -> agents`: embedding of tool use, planning, persistent state, governance, skills, and traces into agentic-system records;
- `information -> games`: functor from settled information and partial observation into CGS arenas and strategies.

Current working surface for the settling-to-information branch: [SETTLING-INFORMATION.md](./SETTLING-INFORMATION.md), [schema/information-profile.schema.json](./schema/information-profile.schema.json), and [src/information-profile.mjs](./src/information-profile.mjs).
The checker is declaration-level only and does not prove the category of informational artifacts, closure-rule correctness, aboutness closure completeness, or SHP projection correctness.

Current working surface for the information-to-computers branch: [INFORMATION-COMPUTERS.md](./INFORMATION-COMPUTERS.md), [schema/information-computer-profile.schema.json](./schema/information-computer-profile.schema.json), and [src/information-computer-profile.mjs](./src/information-computer-profile.mjs).
The checker is declaration-level only and does not prove actual schema validation, append-only behavior, script determinism, canonicalization implementation correctness, or federation convergence.

Current working surface for the computers-to-POSIX branch: [COMPUTERS-POSIX.md](./COMPUTERS-POSIX.md), [schema/posix-profile.schema.json](./schema/posix-profile.schema.json), and [src/posix-profile.mjs](./src/posix-profile.mjs).
The checker is declaration-level only and does not inspect real filesystem state, enforce append flags, execute processes, validate byte encodings, or prove path hom-functor equality.

Current working surface for the POSIX-to-SPOTCOMP resource contract: [TRC-LAYOUT.md](./TRC-LAYOUT.md), [schema/trc-layout.schema.json](./schema/trc-layout.schema.json), and [src/trc-layout.mjs](./src/trc-layout.mjs).
The checker is declaration-level only and does not inspect real file modes, actual append-only behavior, ESM default exports, schema validation, or path hom-functor equality.

Current working surface for the computers-to-agents branch: [AGENTIC-EMBEDDING.md](./AGENTIC-EMBEDDING.md), [schema/agentic-profile.schema.json](./schema/agentic-profile.schema.json), and [src/agentic-profile.mjs](./src/agentic-profile.mjs).
The checker is declaration-level only and does not prove skill admissibility, governance algebra, recognition settlement, behavioral-space inclusion, or CGS strategy correctness.

The governance sub-branch is tracked in [GOVERNANCE.md](./GOVERNANCE.md), [schema/governance-profile.schema.json](./schema/governance-profile.schema.json), and [src/governance-profile.mjs](./src/governance-profile.mjs).
The checker is declaration-level only and does not prove modal restriction, capability-fiber implication, non-amplification, or finite-settlement correctness.

Current working surface for the information-to-games branch: [INFORMATION-GAMES.md](./INFORMATION-GAMES.md), [schema/information-game-profile.schema.json](./schema/information-game-profile.schema.json), and [src/information-game-profile.mjs](./src/information-game-profile.mjs).
The checker is declaration-level only and does not prove event-structure completeness, strategy receptivity, innocence, interaction-and-hiding composition, or symmetry-groupoid laws.

## D13. Categorical Machinery Integration

Turn [CATEGORICAL-MACHINERY.md](./CATEGORICAL-MACHINERY.md) from a source-backed working spine into proof-backed conformance obligations.

Evidence needed:

- trace-axis preservation declarations for causal order, recognition fiber, refinement, and provenance;
- positing-naturality checker or proof witness for reindexing, projection, dual filing, and federation;
- positing naturality declarations for predicate-category reindexing and 2-cell status;
- closure-2-monad witness tying rule execution to least-fixed-point settlement;
- regime-sensitive federation rules tied to cohomology/audit preservation;
- local-settling embedding for modeled players;
- CGS event-structure and strategy mapping for swarm traces.

## D14. Governance Algebra

Derive SPOTCOMP governance from modal restriction and capability fibers rather than from an external policy table.

Evidence needed:

- proof that the SPOTCOMP authorization frontier is a sub-region of one accessibility relation;
- one modal restriction evaluator parameterized by governance, trust-boundary, federation, capability, authentication, and agent self-queueing surfaces;
- exact EAVT authorization and revocation row derivation;
- capability-fiber implication and non-amplifying delegation proof;
- denied side-effect no-state-advance proof;
- finite governance settlement projection with frontier, rule-system, and output algebra;
- conflict/cohomology surface for inconsistent authorization facts.

Current working surface: [GOVERNANCE.md](./GOVERNANCE.md), [schema/governance-profile.schema.json](./schema/governance-profile.schema.json), and [src/governance-profile.mjs](./src/governance-profile.mjs).
The checker validates declarations only; it does not prove any of the obligations above.

## D15. Predication Stage Category Derivation

Derive the four stage categories and the functors/restrictions between them.

Evidence needed:

- articulating as generator of the aperiodic predication category;
- predicating as generator of the transfinite predication category;
- positing as generator of the Scott-continuous predication category;
- settling as generator of the finite predication category;
- proof that the direction is aperiodic -> transfinite -> Scott-continuous -> finite;
- proof that finite settlement and FOUR projections do not define upstream stages;
- prelocutionary/locutionary handler rule preserving the declared stage boundary.

Current working surface: [PREDICATION-STAGES.md](./PREDICATION-STAGES.md), [schema/predication-stage-profile.schema.json](./schema/predication-stage-profile.schema.json), and [src/predication-stage-profile.mjs](./src/predication-stage-profile.mjs).
The checker validates declarations only; it does not prove the stage category derivation.

Related working surface: [PRELOCUTIONARY-INGRESS.md](./PRELOCUTIONARY-INGRESS.md), [schema/prelocutionary-ingress-profile.schema.json](./schema/prelocutionary-ingress-profile.schema.json), and [src/prelocutionary-ingress-profile.mjs](./src/prelocutionary-ingress-profile.mjs) refine the prelocutionary/locutionary handler rule.
The checker validates ingress declarations only; it does not prove the token/claim primitive theorem or handler correctness for a real runtime.

## D16. Closure And Settling Apex Derivation

Derive final settlement from closure 2-monad and settling-endofunctor machinery, not from bounded implementation iteration.

Evidence needed:

- closure 2-monad proof with knowledge monotonicity, inflationary unit, lax-idempotent multiplication, and predicate-reindexing naturality;
- proof that closed predication fibrations are property-like algebras;
- settling endofunctor derivation for `F_U(E)_tau = Cl(E) join_k u_tau`;
- closure-merge commutation proof placed at the correct categorical level;
- Knaster-Tarski least-fixed-point proof for the settling apex;
- sigma/delta correctness for evidence accumulation and tensor resolution;
- local-settling restriction proof, including modeled-player local state as bounded sub-settling;
- rule that bounded fuel yields a partial prefix unless fixed-point evidence is present;
- proof that FOUR is only a downstream finite projection/fiber, not a settling substrate.

Current working surface: [CLOSURE-SETTLING.md](./CLOSURE-SETTLING.md), [schema/closure-settling-profile.schema.json](./schema/closure-settling-profile.schema.json), and [src/closure-settling-profile.mjs](./src/closure-settling-profile.mjs).
The checker validates declarations only; it does not compute closure, prove Knaster-Tarski, prove the full 2-categorical closure-merge lift, or decide closure ordinals.

## D17. CHL Language Cone Derivation

Derive the SPOTCOMP CHL language cone rather than treating cross-column translations as analogies.

Evidence needed:

- CHL language apex construction with open-ended cone-leg functors;
- proof that classical three-column CHL is a specialization, not the whole language object;
- column inventory for type theory, proof theory, category theory, domain theory, path theory, and applicable fiber-stable columns;
- cross-tradition coincidence theorem scoped exactly to the predication-settling category;
- off-scope distinctness proof for column morphisms and their hom-functors;
- path-theory cone-leg from CHL language to the POSIX path category;
- Yoneda path-identity proof including schema identity, script witnesses, and reference edges;
- implementation rule that compact commands name their composed morphisms rather than becoming new primitive morphisms.

Current working surface: [CHL-LANGUAGE-CONES.md](./CHL-LANGUAGE-CONES.md), [schema/chl-language-profile.schema.json](./schema/chl-language-profile.schema.json), and [src/chl-language-profile.mjs](./src/chl-language-profile.mjs).
The checker validates declarations only; it does not prove the CHL apex, cross-tradition coincidence, path-theory cone-leg, or Yoneda obligations.

## D18. Recognition And Admission Derivation

Derive recognition-cell settlement and local admission rather than treating parse success, shape success, or signature verification as sufficient evidence.

Evidence needed:

- recognition fiber preservation theorem for trace projections;
- distinction between finite shape recognition and mathematical recognition settlement;
- admission rule that combines canonical identity, signature verification, governance, capability, observation, action bounds, and receiver-relative recognition;
- role-recognition derivation for swarm roles such as leader, validator, observer, and actor;
- rejected-admission mapping to audit, conflict, or cohomology evidence;
- proof that unknown recognition blocks strong swarm conformance without preventing local quarantine records.

Current working surface: [RECOGNITION.md](./RECOGNITION.md), [schema/recognition-profile.schema.json](./schema/recognition-profile.schema.json), and [src/recognition-profile.mjs](./src/recognition-profile.mjs).
The checker validates declarations only; it does not prove recognition-cell settlement, the information-to-CGS functor, governance modal restriction, strategy receptivity, or symmetry laws.

## D19. Bigraded Diamond Swarm Derivation

Derive modeled-player swarms through the lab predication-categories KZ diamond, bigraded common knowledge, bigraded cohomology, and multi-observer settling machinery.

Evidence needed:

- proof-backed statement of the closure KZ and fibration KZ axes on the common settling 2-category;
- strict commutation or exact downgrade of the KZ diamond comparison cell;
- preservation of truth-order and knowledge-order adjoint systems into modeled-player common knowledge;
- rule that `C^t` and `C^k` cannot be collapsed except under cited degeneracy conditions;
- bigraded cohomology audit connection to `H1_t` and `H1_top`;
- multi-observer-system reading `V : O -> Settlings_B` for modeled players and agent graphs;
- per-observer rule-system convergence at the supremum of closure ordinals;
- aperiodic tiling witness requirements for any quasicrystal-like swarm claim;
- separation between aperiodic tiling mathematics and IETF DRIP/Remote ID conformance for UAS deployments.

Current working surface: [BIGRADED-DIAMOND-SWARMS.md](./BIGRADED-DIAMOND-SWARMS.md), [schema/bigraded-diamond-swarm-profile.schema.json](./schema/bigraded-diamond-swarm-profile.schema.json), and [src/bigraded-diamond-swarm-profile.mjs](./src/bigraded-diamond-swarm-profile.mjs).
The checker validates declarations only; it does not prove the KZ diamond, compute common knowledge, compute cohomology, derive concrete tilings, validate DRIP exchanges, or close the CGS embedding.

## D20. Aperiodic Swarm Witness Derivation

Derive quasicrystalline or substitution-shaped modeled-player swarms from aperiodic settling classification rather than from graph topology or runtime asynchrony.

Evidence needed:

- local-settling tile object for each modeled-player patch;
- finite-window projection rule from trace frontier to local settling patch;
- substitution, patch, direct-limit, or regime witness for non-periodicity;
- Anderson-Putnam-style finite approximants, transition maps, and direct-limit cohomology target;
- aperiodic classifying invariant and, where used, co-classifying invariant status;
- common-base MLD comparison scope and invertible settling-morphism evidence;
- step-n substitution matrix, singular/non-singular status, and rank-claim downgrade rule;
- bilattice-alignment commutation witness for any claim stronger than cardinality coincidence;
- weighted-swarm stability cone or downgrade policy for continuous, tropical, probabilistic, or trust-weighted protocols.

Current working surface: [APERIODIC-SWARM-WITNESS.md](./APERIODIC-SWARM-WITNESS.md), [schema/aperiodic-swarm-witness-profile.schema.json](./schema/aperiodic-swarm-witness-profile.schema.json), and [src/aperiodic-swarm-witness-profile.mjs](./src/aperiodic-swarm-witness-profile.mjs).
The checker validates declarations only; it does not compute cohomology, prove MLD-equivalence, build an Anderson-Putnam complex, decide weight-stability, or validate a live swarm.

## D21. DRIP UAS Binding

Bind UAS deployments to the current DRIP RFC surface without letting standards identity replace SPOTCOMP mathematical identity.

Evidence needed:

- declaration of RFC 9153, RFC 9374, RFC 9434, RFC 9575, and RFC 9886 when a deployment claims DRIP/UAS conformance;
- explicit non-normative status for active DRIP Internet-Drafts unless a deployment separately profiles them;
- mapping from local modeled-player, vehicle, controller, operator, or registry records to DET/UAS ID roles;
- rule that local slugs, row IDs, and modeled-player IDs do not become DETs without an explicit binding;
- broadcast RID authentication check before local recognition/admission;
- DNS/DIME registry lookup separation from modeled-player proof and trace merge;
- downgrade behavior for unverifiable RID messages;
- proof that aperiodic tiling, bigraded common knowledge, and CGS strategy evidence do not imply DRIP/UAS conformance.

Current working surface: [DRIP-UAS-BINDING.md](./DRIP-UAS-BINDING.md), [schema/drip-uas-profile.schema.json](./schema/drip-uas-profile.schema.json), and [src/drip-uas-profile.mjs](./src/drip-uas-profile.mjs).
The checker validates declarations only; it does not validate live RID broadcasts, query DNS, verify DET cryptographic material, implement ASTM or civil-aviation rules, or prove modeled-player swarm conformance.

## D22. Moduli, Descent, And Laplacian Integration

Derive swarm-level strong conformance through the lab's moduli, descent, Q-enriched Laplacian, Verdier, six-functor, and strong-MLD machinery rather than through ordinary MLD or endpoint summaries alone.

Evidence needed:

- meta-moduli descent for closure-rule systems, with closure-equivalence as the invariant rather than rule-source identity;
- distinction between settling-level regime partition and meta-level maximum-regime stratification;
- rule-language-fragment or regime-specific substitution witness for meta-regime claims;
- regime-sensitive named-example placement, including Padovan in the finite/strict placement, Fibonacci in the Scott-continuous placement, and Tribonacci in the transfinite placement;
- declaration of whether cohomology evidence uses shadow cohomology, Boolean d-frame Q-enriched cohomology, direct-limit aperiodic construction, or a weighted theorem with its stated scope;
- Verdier sheaf/cosheaf duality scope and six-functor scope for any profile using those claims;
- strong-MLD firing-orbit type function with truth-only, falsity-only, and top-firing cases;
- downgrade rule when descent, meta-regime, cohomology route, Verdier scope, six-functor scope, or composed-duality orbit data is unknown.

Current working surface: [MODULI-DESCENT-LAPLACIAN.md](./MODULI-DESCENT-LAPLACIAN.md), [schema/moduli-descent-laplacian-profile.schema.json](./schema/moduli-descent-laplacian-profile.schema.json), and [src/moduli-descent-laplacian-profile.mjs](./src/moduli-descent-laplacian-profile.mjs).
The checker validates declarations only; it does not compute cohomology, prove descent, decide a rule-language fragment, construct a bitopological settling site, prove Verdier duality, or validate strong MLD for a live swarm.

## D23. Regime Substitution Ladder Integration

Derive substitution-family usage through the regime-sensitive staged ladder rather than through name-only, step-depth-only, alphabet-size-only, or benchmark-suite-only classification.

Evidence needed:

- explicit separation of benchmark lift regime from SPOTCOMP staged placement;
- Padovan finite/strict placement at the settling boundary;
- Fibonacci Scott-continuous placement at the positing boundary;
- Tribonacci transfinite placement at the predicating boundary;
- base/cofinality and `lambda` declarations for any `omega_1` benchmark lift;
- step-n moduli coordinate declaration distinct from staged placement;
- bilattice cardinality boundary and operation-level commutation evidence for any structural-alignment claim;
- downgrade rule for later substitution families without explicit placement evidence.

Current working surface: [REGIME-SUBSTITUTION-LADDER.md](./REGIME-SUBSTITUTION-LADDER.md), [schema/regime-substitution-ladder-profile.schema.json](./schema/regime-substitution-ladder-profile.schema.json), and [src/regime-substitution-ladder-profile.mjs](./src/regime-substitution-ladder-profile.mjs).
The checker validates declarations only; it does not compute substitution cohomology, classify a live rule system, construct the meta-moduli stack, or prove a live swarm's strong MLD class.

## D24. Realizability And Deformation Integration

Derive realized swarm classes, rule-system meta-points, deformation claims, and CHL-recursion stabilization through the lab's realizability and deformation machinery rather than through runtime observation or endpoint summaries.

Evidence needed:

- meta-realizability map from settling moduli to meta-moduli, with closure-equivalence as target identity;
- increment-sequence fiber declaration for realized settling classes;
- regime-respecting upper-bound relation between settling regime and meta-regime;
- realizability-axis declarations for regime, bigraded value type, predicate-naturality, and rule-language fragment;
- countable-support increment discipline for the cardinality-bound scope;
- predicate-generator coupling evidence for specialization, converse, subject-projection, and object-projection;
- tangent-dimension declaration through `Ext^1`, `H1`, and per-regime non-Scott-continuous firing ordinals;
- explicit non-semicontinuity policy, including the `0, 1, 0` chain and rejection of monotone-trace heuristics;
- CHL stabilization tangent comparison through the derivative of `pi^real`, with fiber tangent and enrichment scope declared;
- downgrade rule when realizability axis, increment support, predicate coupling, tangent dimension, or stabilization scope is unknown.

Current working surface: [REALIZABILITY-DEFORMATION.md](./REALIZABILITY-DEFORMATION.md), [schema/realizability-deformation-profile.schema.json](./schema/realizability-deformation-profile.schema.json), and [src/realizability-deformation-profile.mjs](./src/realizability-deformation-profile.mjs).
The checker validates declarations only; it does not compute cohomology, decide realizability, calculate Ext groups, derive a live tangent space, or prove CHL stabilization for a live swarm.

## D25. Void Relationlessness Stage Translation

Translate older void-cone and failure-geometry machinery into the current articulating, predicating, positing, and settling stage categories rather than letting void become a fifth stage, a runtime exception bucket, or a FOUR-only finite artifact.

Evidence needed:

- translation from void-cone vocabulary to the four staged regimes;
- declaration that void is the null relationless case at articulating;
- active-tree finite witness for void as `null` and potential cell slots as void/void;
- descending void filtration with `V_infty` as a separate invariant;
- associated graded of void exits paired with apex `H1`, with Verdier and direct chain-level routes named;
- reinterpretation of legacy `H0(Void_v)` wording as associated graded or cosheaf homology, not ordinary connected-component homology;
- value-agnostic null instances beyond FOUR, including bilattice, stochastic, Lawvere, and Lorentzian readings;
- separation of conflation's void/fullness axis from negation's truth axis;
- failure geometry as stage-obstruction geometry, not transport or process error handling;
- weighted stability cone and rank-collapse downgrade rule for continuous, tropical, probabilistic, trust-weighted, or UAS swarm profiles.

Current working surface: [VOID-RELATIONLESSNESS-STAGES.md](./VOID-RELATIONLESSNESS-STAGES.md), [schema/void-relationlessness-profile.schema.json](./schema/void-relationlessness-profile.schema.json), and [src/void-relationlessness-profile.mjs](./src/void-relationlessness-profile.mjs).
The checker validates declarations only; it does not compute void filtrations, cohomology, rank stability, or a live modeled-player swarm's relationless frontier.

## D26. Trace Monoid Settlement Bridge

Derive order-independent settlement through trace-monoid histories and closure-driven valuation action, not through row order, peer identity, or raw G-Set merge alone.

Evidence needed:

- finite step set `Sigma` with stage-typed step identities;
- symmetric irreflexive independence relation `I`;
- quotient congruence and abstract-history initiality for `M(Sigma, I)`;
- Foata normal form or equivalent block summary with block depth and prefix order;
- declaration that rows are finite event presentations, not step identity;
- independence criteria covering causal order, closure-rule premise/conclusion overlap, predicate reindexing coupling, recognition, governance, and observation gates;
- valuation action mapping steps to atomic or batch positings with knowledge-monotone behavior and datum preservation under reindexing;
- same-trace-class same-valuation theorem or declared proof route;
- closure-merge commutation, closed initial state, common closure operator, writes-as-deltas, and same-multiset convergence conditions for CRDT claims;
- separation between knowledge-order merge/preorder and truth-order modeling;
- federation downgrade rule when history equivalence is unverifiable.

Current working surface: [TRACE-MONOID-SETTLEMENT.md](./TRACE-MONOID-SETTLEMENT.md), [schema/trace-monoid-settlement-profile.schema.json](./schema/trace-monoid-settlement-profile.schema.json), and [src/trace-monoid-settlement-profile.mjs](./src/trace-monoid-settlement-profile.mjs).
The checker validates declarations only; it does not compute Foata normal form, infer independence from raw rows, execute closure, or prove live swarm convergence.

## D27. Modeled-Player Swarm Dynamics

Derive modeled-player swarm conformance through ruled multi-observer systems, agentive positing, network-sheaf/d-frame consensus, CGS strategy laws, and aperiodic dynamics rather than through peer records, local loops, or key identity.

Evidence needed:

- expansion of SPOTCOMP as Subject-Predicate-Object Trace Computer Operating Modeled-Players and proof that all named positions are represented;
- external-player/model/character boundary;
- ruled multi-observer system `(O, V, r)` with per-observer closure rules;
- local-settling references for each modeled player;
- joint closure-ordinal supremum for heterogeneous rule systems;
- agentive positing action on local and merged settlings;
- relational assertion/claim status after merge and closure;
- configuration-space versus trajectory distinction for player profiles;
- graph-incidence-poset network-sheaf surface for agent graphs;
- distinction between cellwise meet, knowledge join, global sections, and d-frame con-failure/top witnesses;
- CGS strategy obligations built over ruled observer-local settlings;
- smooth path versus transition event typology: regime jump, increment event, and rule perturbation;
- aperiodic swarm witness tying local settlings to substitution, patch, direct-limit, MLD, or regime evidence;
- downgrade rule when player dynamics, strategy law, or aperiodic witness is unknown.

Current working surface: [MODELED-PLAYER-SWARM-DYNAMICS.md](./MODELED-PLAYER-SWARM-DYNAMICS.md), [schema/modeled-player-swarm-dynamics-profile.schema.json](./schema/modeled-player-swarm-dynamics-profile.schema.json), and [src/modeled-player-swarm-dynamics-profile.mjs](./src/modeled-player-swarm-dynamics-profile.mjs).
The checker validates declarations only; it does not compute consensus, prove cohomology, compute MLD invariants, validate CGS morphism composition, or validate DRIP/UAS exchanges.

## D28. Continuous Learning

Derive continuous learning as monotone governed change in modeled-player represented state, skills, memory fragments, or closure-rule systems.
Learning must be visible as trace-bearing predication activity and, when it occurs in a play, as admissible ludic/CGS activity under strategy and governance bounds.

Evidence needed:

- answering as positing into `Phi = E x Pi x E`;
- referencing as projection out of the predication-cell-set;
- learn/use cycle from reference to answer to closure/settlement to later reference;
- teaching as bearer-side predication that does not mutate the conferred object;
- idempotence and bearer-conformance preservation for repeated teaching;
- separation between teaching and host-runtime installation;
- skill improvement as monotone, inflationary, idempotent closure over a skill specification;
- memory as a governed local fragment rather than context-window presence;
- evidence learning, skill learning, and rule learning as distinct change classes;
- rule learning as `r(o)` perturbation and transition unless a closure-equivalence proof is present;
- ludic and CGS admissibility for learning that changes observation, inference, capability, or strategy behavior;
- downgrade rule when hidden adaptation, weight update, context presence, installation, or rule change is offered as learning evidence without the corresponding predication/transition record.

Current working surface: [CONTINUOUS-LEARNING.md](./CONTINUOUS-LEARNING.md), [schema/continuous-learning-profile.schema.json](./schema/continuous-learning-profile.schema.json), and [src/continuous-learning-profile.mjs](./src/continuous-learning-profile.mjs).
The checker validates declarations only; it does not prove skill fixed points, validate learning quality, inspect model weights, or prove closure-equivalence of rule changes.

## D29. I/O As Articulation

Derive external I/O as articulation rather than treating transport input as trace or settlement evidence.

Evidence needed:

- token, claim, and utterance as the primitive carrier for outside input;
- articulating as the I/O gate from utterance to the aperiodic category;
- locutionary handler derivation for argv, hooks, HTTP, tool calls, and LLM interaction surfaces;
- proof that prompts, completions, hidden context, and tool-call envelopes are presentations until admitted as typed SPOTCOMP evidence;
- mapping from unresolved or partial functions to typed predication content, trajectory prefix, or downgrade;
- IETF/RFC binding after the mathematical object boundary is known.

Current working surface: [IO-ARTICULATION.md](./IO-ARTICULATION.md), [schema/io-articulation-profile.schema.json](./schema/io-articulation-profile.schema.json), and [src/io-articulation-profile.mjs](./src/io-articulation-profile.mjs).
The checker validates declarations only; it does not validate live LLM behavior, prove articulating category generation, inspect HTTP traffic, verify signatures, or execute settlement.

## D30. Proof-Tree Irresolution

Derive SPOTCOMP as a categorical proof engine for unresolved or partial functions rather than a total-function API with exceptions.

Evidence needed:

- articulating recursion grounded by token, claim, and utterance;
- stage/regime preservation for articulating, predicating, positing, and settling;
- partial-map support and outside-support bottom/default discipline;
- obstruction handling for default, gauge, parity, cohomology, recognition, and regime failures;
- fixed-point evidence for final settlement and explicit non-final trajectory prefixes otherwise;
- TRC/TDP replay law showing unresolved cases remain typed and auditable;
- standards binding only after object-boundary placement.

Current working surface: [PROOF-TREE-IRRESOLUTION.md](./PROOF-TREE-IRRESOLUTION.md), [schema/proof-tree-irresolution-profile.schema.json](./schema/proof-tree-irresolution-profile.schema.json), and [src/proof-tree-irresolution-profile.mjs](./src/proof-tree-irresolution-profile.mjs).
The checker validates declarations only; it does not prove the active tree, compute closure, inspect live catalogs, validate outside systems, verify signatures, or decide cohomology.
