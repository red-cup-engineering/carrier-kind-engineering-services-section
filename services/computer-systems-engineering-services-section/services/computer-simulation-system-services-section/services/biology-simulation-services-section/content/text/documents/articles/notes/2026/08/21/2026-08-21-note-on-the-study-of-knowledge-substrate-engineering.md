---
title: "Study of Knowledge-Substrate Engineering"
description: "S4 of the software planning program: the claim layer's composeFibers read against the literatures that already engineered a store of evidence-bearing, possibly contradictory assertions merged by a lattice join — Doyle's JTMS and de Kleer's ATMS on retraction over a dependency network, Fitting's bilattice semantics for logic programming as the direct academic lineage of the FOUR-valued charge and the sharp distinction it draws between the knowledge order composeFibers implements and the truth order the substrate exposes but the draft never calls, state-based CRDT theory (Shapiro et al. 2011) that proves composeFibers' convergence for free and also names the unbounded-growth bill that convergence proof does not pay, delta-CRDTs and causal-stability garbage collection, event sourcing and differential dataflow's multiplicity encoding for the journal and for a future retraction path, and the paraconsistent-database literature's practical experience shipping exactly this kind of store; each checked decision closes with a verdict of confirmed, revise, or open."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-study-of-knowledge-substrate-engineering
authors:
  - claude-sonnet-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "claim-layer", "composeFibers", "truth-maintenance-systems", "bilattice", "fitting", "crdt", "event-sourcing", "differential-dataflow", "paraconsistent-databases", "knowledge-substrate"]
tags: ["draft", "study"]
---


## Scope and method

This is S4 of the software planning program's studies of the science
(program note, §2.1): the literatures that engineered, under other
names and mostly decades ago, what the claim layer is now proposing to
be — a store of evidence-bearing, possibly contradictory assertions,
merged by a lattice join. Its brief is to check the shell draft's §2
(the two-layer state model) and the panel review's §4 (the settling
engine) against that prior art, and to hand the claim layer's
low-level design a set of engineering obligations the drafts do not
yet carry.

Method: before reading any literature, the actual mechanism was read.
`composeFibers` (`relating/lib/articulating/predicating/positing/
fiber.mts:489`) folds a list of memes into a valuation by finding the
bucket for each meme's predicate, and where a cell already has an
assignment, replacing it with `meme(m.cell, joinKnowledge(prior.charge,
m.charge))`; where no cell exists yet, pushing a fresh assignment. That
is the entire operation. There is no admission check inside it (the
panel review's probe already established this independently — a site
knowing only `metabolizes` accepted a meme predicated on `teleports`),
no code path that removes an assignment, and no code path that lowers
a charge. It is, exactly as this study's brief states, a pure join:
idempotent, commutative, and associative by construction, because
`joinKnowledge` is a join in a lattice and nothing outside that lattice
operation touches the assignment list. Every claim below about what
the substrate does or does not do is checked against this function and
its neighbors (`bilattice-charge.mts`, `dihedral-gauge.mts`), not
against the drafts' description of it. Where the drafts and the code
disagree, this note follows the code.

## 1. Truth maintenance systems and the shape of retraction

The claim layer's join has no undo. That is worth taking seriously
before assuming it is a defect, because the literature that first
built machinery for exactly this problem — a store of derived beliefs
that has to change when its inputs change — arrived at a specific,
non-obvious answer: retraction is not implemented as deletion, in
either of the two founding systems.

**Doyle's JTMS** (Jon Doyle, "A Truth Maintenance System," *Artificial
Intelligence* 12(3):231–272, 1979) exists to solve incremental belief
revision without full re-derivation. Nodes hold propositions;
*premises* have the empty justification and are always IN; every other
node is IN or OUT according to its justifications. The workhorse
justification form, the SL-justification, makes a node IN iff some
justification has every node on its in-list IN and every node on its
out-list OUT — the out-list is where default reasoning lives, and it
is why the retraction mechanism does not touch stored data. When a
premise is withdrawn or an antecedent's status flips, *dependency-
directed backtracking* walks the justification graph from the affected
node outward, relabeling only nodes actually reachable through
justification links, flipping each to OUT once none of its
justifications still hold. When the walk reaches a distinguished
contradiction node and it goes IN, the system traces back through the
network to extract the minimal offending assumption set — a *nogood*
— and installs a new justification that permanently blocks that
combination from recurring. The crucial structural fact: nogood
installation is itself monotonic and cumulative. JTMS turns each
contradiction into a permanent constraint layered on top of a
revisable IN/OUT labeling; the underlying justification network only
grows, and what looks like "forgetting" a belief is relabeling driven
by structure the network already contains.

**De Kleer's ATMS** (Johan de Kleer, "An Assumption-Based TMS,"
*Artificial Intelligence* 28(2):127–162, 1986) is the closer precedent
to a pure join. Instead of one current belief state, ATMS attaches to
each datum a *label*: the set of minimal consistent *environments*
(assumption sets) under which the datum holds. Labels are computed
bottom-up, compositionally, by combining antecedent labels through the
justification structure and minimizing — a lattice-style monotone
propagation. All consistent contexts exist simultaneously; switching
context is selecting a different environment, free because nothing
needs recomputing. When a contradiction is derived, its supporting
environment becomes a *nogood*, and any environment that is a superset
of a recorded nogood is pruned from future label computations. ATMS
**never deletes nodes or justifications** — the network is append-only,
exactly like `composeFibers`. What looks like retraction is achieved
entirely by exclusion: a datum believed false in a given context
simply has an empty or nogood-only label there, and nogoods only ever
accumulate. This is the closest published analogue to "a monotone join
with poison entries that participate in the same join operation," and
it is direct evidence that the pattern the claim layer would need —
add an override entry rather than remove the overridden one — has forty
years of engineering behind it as the standard way to get retraction-
like behavior out of a substrate that structurally cannot delete.

**Why monotone-only stores are insufficient in practice, and the
standard fixes.** The TMS literature (Doyle 1979; de Kleer 1986; Kenneth
Forbus and Johan de Kleer, *Building Problem Solvers*, MIT Press, 1993)
is explicit that unbounded monotone accumulation fails for two concrete
reasons distinct from each other: sources recant or get superseded by
more specific information, which is a genuine content change and not
merely an addition; and justification networks grow without bound, so
production JTMS implementations carry explicit garbage collection of
unreachable nodes as ordinary memory management, not as a belief-
revision feature. Two fixes recur, and both are reconcilable with a
monotone substrate rather than requiring one to abandon it: default
(SL) justifications so new evidence flips a status by changing what is
IN/OUT without deleting the old justification; and nogood caching,
which treats a contradiction as a permanent negative constraint that
participates in future computation exactly as a positive justification
does — override, not deletion. Reiter's default logic (Raymond Reiter,
"A Logic for Default Reasoning," *Artificial Intelligence* 13, 1980)
supplies the semantic target these procedures approximate: a
monotonic deductive closure plus a distinct extension-selection step.
Alchourrón, Gärdenfors, and Makinson's AGM belief revision ("On the
Logic of Theory Change," *Journal of Symbolic Logic* 50(2), 1985) is
the clean theoretical statement of the same split: a monotonic closure
operator, with contraction and revision as separate operators layered
on top rather than folded into the closure itself.

**Does the claim layer need retraction for this engine's stages?** Not
at Stage 1, and the reasoning is the same reasoning the panel review
already applied to the regime (§4: "the regime is forced, not
detected" — a finite site forces strict settling, closure ordinal κ ≤
3). Stage 1's sources of evidence are the scenario's mark schedule and
the two machine-authored bindings directions, both closed-world and
enumerable in advance; nothing in the Stage-1 scenario recants. The
scenarios that would need retraction — a source that later proves to
have been lying, a provenance-flagged claim that must be struck once
its witness is invalidated, a claim admitted under one gradient regime
that should not survive a gradient discontinuity — are named
explicitly as Stage 2+ concerns (organelle nesting, the membrane's
`transform` verb, and the resubmission-attack provenance gate already
gesture at exactly this). When that stage arrives, the standard
mechanism this literature converges on is not "make `composeFibers`
support removal": it is a poison/override meme that the same join
consumes — a machine-authored claim carrying a distinguished
provenance tag meaning "this prior evidence is superseded," read at
the query layer (or by a dedicated reconciliation pass, ATMS-style)
rather than by mutating the assignment list. This preserves every
proof `composeFibers` currently has for free (idempotence,
commutativity, associativity — see §3) and matches both JTMS's nogood
layering and ATMS's append-only label computation. Building deletion
into the join itself is the one option this literature does not
recommend; every real system it covers gets revision behavior by
adding structure on top of a monotone substrate, never by making the
substrate itself lower.

## 2. Bilattice logic programming: the direct lineage, and what a join-only settling truncates

The charge structure's own name for itself — FOUR, two orthogonal
orders over one carrier, `[truth-side, falsity-side]` evidence — is
not analogous to Melvin Fitting's bilattice semantics for logic
programming; it *is* that semantics, read against its own foundational
paper, Michael Ginsberg's "Multivalued logics: a uniform approach to
reasoning in artificial intelligence" (*Computational Intelligence*
4:265–316, 1988), which introduced bilattices — structures carrying two
simultaneous lattice orders, ≤ₜ (truth) and ≤ₖ (knowledge), over one
set — as the uniform home for exactly Belnap's four values (false,
true, unknown/neither, both/contradictory) and for ATMS-style
reasoning as a special case. The direct grounding of the claim layer's
own docs confirms this reading was not invented for this study:
`docs/four-charge-algebra.md`, shipped inside `@red-cup-engineering/
relating`, states plainly that "the package exposes both orders so
callers can choose whether they are asking 'how much evidence is
recorded?' or 'how true is this reading?'" — the knowledge-order/
truth-order distinction is already named in the substrate's own
documentation, before this study's literature check.

Fitting gave the operational semantics directly: in "Bilattices in
logic programming" (ISMVL 1990) and "Bilattices and the semantics of
logic programming" (*Journal of Logic Programming* 11(2):91–116, 1991),
he defines an immediate-consequence operator Φ_P over bilattice-valued
interpretations, generalizing van Emden–Kowalski's two-valued T_P and
Kripke's three-valued extension. Concretely, Φ_P(I) = T_P(I) ∪
¬F_P(I): the set of atoms some rule body makes true in I, unioned with
the negation of the set every rule body makes false in I. Φ_P is
monotone in the **knowledge order**, so Knaster–Tarski gives it a
≤ₖ-least fixpoint — the Kripke–Kleene/Fitting model. This is, exactly,
the shape of `composeFibers`: fold evidence, monotone in ≤ₖ, converge
to a least fixed point (the panel review's §4 "the fold produces no
change, witnessed by the `knowledgeLeastValuation` receipt machinery"
is this fixpoint, verified in code at `fiber.mts:518-531,545-560`, not
merely asserted). So far the claim layer matches Fitting's theory
precisely, and can cite Fitting 1991 directly for its own convergence
guarantee.

Where it stops matching is exactly where Fitting's own later work
goes next. In "The family of stable models" (*Journal of Logic
Programming* 17:197–225, 1993), Fitting generalizes the Gelfond–
Lifschitz stable-model transformation to bilattice-valued programs,
and the operator this requires is monotone in the knowledge order but
**antitone in the truth order** — antitonicity is precisely what
encodes negation-as-failure, and it is a second, independently defined
operation the truth order supplies that the knowledge order
structurally cannot: increasing the assumed truth of a negated body
literal must decrease what gets derived, which is not expressible as
any join. "Kleene's three valued logics and their children"
(*Fundamenta Informaticae* 20, 1994) makes the same point from the
other side: restricting FOUR's connectives — conjunction, disjunction,
negation — to {true, false, unknown} and reading them via the **truth**
order recovers Kleene's strong three-valued logic; the knowledge order
supplies no connective structure of its own, only the join/meet
("consensus"/"gullibility") and conflation that a settling engine
already uses. Fitting's 2002 survey ("Fixpoint semantics for logic
programming," *Theoretical Computer Science* 278:25–51) systematizes
the whole picture as a single operator over *pairs* of interpretations,
from which the Kripke–Kleene, stable, and well-founded fixpoints are
all extracted by different constructions layered on that one operator
— and every construction past Kripke–Kleene needs the truth-order-
linked, antitone half. The well-founded model in particular is an
*alternating* fixpoint (van Gelder 1989/1993, formalized generally by
Marc Denecker, Victor Marek, and Mirosław Truszczyński's Approximation
Fixpoint Theory, in *Logic-Based Artificial Intelligence*, Kluwer,
2000): compute the antitone Gelfond–Lifschitz-style operator's least
fixpoint, apply it again, and the *square* of that antitone map is
what becomes ≤ₖ-monotone and iterable — no single knowledge-order join
ever performs this.

Oded Arieli and Arnon Avron's "The value of the four values"
(*Artificial Intelligence* 102(1):97–141, 1998) states the practical
consequence sharply: FOUR is strictly more expressive than three- or
two-valued restrictions precisely because the truth order and
knowledge order can vary independently, letting a system distinguish
"confirmed true despite some contradicting evidence" (a `both`/`active`
value, high on ≤ₖ, and — this is the operative fact — ≤ₜ-comparable to
`true`) from "merely not yet refuted" (`potential`, low on ≤ₖ, also
≤ₜ-below `true` but for a structurally different reason). Answering
that distinction is a truth-order query.

**Is the truth order present in the substrate, and is it used?** It is
present and it is unused, and both facts are checkable in the code
this session rather than asserted from the drafts. `bilattice-
charge.mts` exports `joinKnowledge`/`meetKnowledge`/`leqKnowledge`
*and* `joinTruthValue`/`meetTruthValue`/`leqTruth` (the latter defined
at line 395 as `leqSide(left.value[0], right.value[0]) &&
leqSide(right.value[1], left.value[1])` — the textbook truth-order
definition, note the flip on the falsity side). `dihedral-gauge.mts`
goes further: it names `orderSwapValue` as the explicit order-
isomorphism witness between the knowledge order and the truth order
(swapping `absurd ↔ active`, `potential ↔ stable`), and its own doc
comment states the limitation this study needed to find: "accumulated
witness lists do not carry enough information to perform that
complement lawfully. Use this module to read the finite symmetry
algebra of admitted charge values, not to rewrite evidence carriers."
That is: the substrate *knows* the truth order and can compute it over
bare charge values, but the operation is deliberately not lifted to
operate lawfully over evidence-bearing Memes or Valuations — the level
`composeFibers` and everything downstream of it actually works at. A
repo-wide grep of the app's own draft code (only `src/membrane.mjs`
exists so far; no `interior.mjs`, `engine.mjs`, or `chemistry.mjs` have
been written) and of the entire `biology-simulation-services-section`
tree outside `node_modules` turns up zero uses of `joinTruth`,
`leqTruth`, or `meetTruth`. Every draft written to date uses only the
knowledge order.

**Verdict on the operational gap, stated plainly.** A system
implementing only the knowledge-order join reconstructs exactly
Fitting's Kripke–Kleene layer and nothing past it. It cannot correctly
interpret logical negation as a connective (¬ is truth-order —
¬true=false, ¬false=true, ¬neither=neither, ¬both=both — distinct
from knowledge-order conflation, which swaps `neither` and `both`
instead). It cannot compute stable models or do negation-as-failure,
both of which need an antitone-in-≤ₜ operator a monotone join cannot
express by construction. It cannot compute a well-founded model. And
concretely, for this engine: it cannot rank *how true* a settled
`both`/`active` cell is relative to another `both` cell arrived at by
different evidence — it can only report how much evidence exists, per
Arieli–Avron's distinction. The design so far never asked this
question (no draft queries "is this claim more confirmed than that
one," only "has this claim settled"), so the gap is currently latent
rather than load-bearing. It becomes load-bearing the first time a
downstream module needs to rank or compare confirmed claims rather
than merely fold them — a plausible LLD requirement for, e.g.,
choosing which of two contradictory bindings-table inputs a chemistry
parameter should read when both are `active`. §7 flags this as open.

## 3. State-based CRDTs: what composeFibers gets for free, and what it does not

`composeFibers` is, structurally, a state-based CRDT (CvRDT) merge, and
the founding paper proves exactly the guarantee the claim layer needs
and currently only asserts. Shapiro, Preguiça, Baquero, and Zawirski,
"Conflict-Free Replicated Data Types" (SSS 2011, LNCS 6976, pp.
386–400; extended in "A comprehensive study of Convergent and
Commutative Replicated Data Types," INRIA RR-7506, 2011), show that
for a state-based object whose payload lives in a join-semilattice and
whose merge computes the least upper bound, Strong Eventual
Consistency follows from three algebraic proof obligations on merge —
idempotence, commutativity, and associativity — plus monotonicity of
state under the semilattice order. `joinKnowledge` is a join in a
lattice by construction, so all three obligations hold structurally;
the panel review's own §4 replay discipline already names one of them
as a required test ("a test that `joinKnowledge` is order-insensitive
in implementation, not just on paper"), which is exactly the
commutativity obligation this literature specifies, but the idempotence
and associativity obligations are not yet named anywhere in the
drafts and should be.

The same paper is also the direct citation for the cost the claim
layer is paying and not yet accounting for. Its catalog of concrete
CvRDTs includes the G-Set (grow-only set, merge = union) as the
degenerate case where correctness is free precisely because nothing is
ever removed — and every assignment list inside a `composeFibers`
fiber is exactly a G-Set of evidence marks per cell. The paper is
explicit that CvRDTs needing removal (2P-Set, OR-Set) pay for it with
tombstones or unique-tag bookkeeping that itself grows unboundedly
unless separately garbage-collected. Almeida, Shoker, and Baquero's
delta-CRDTs ("Delta State Replicated Data Types," *Journal of
Parallel and Distributed Computing* 111, 2018, pp. 162–173; conference
precursor NETYS 2015) solve a different problem — naive state-based
CRDTs ship the entire replica state on every sync round, which is
bandwidth-prohibitive — by having updates produce small
join-semilattice deltas that are merged incrementally while remaining
provably equivalent to full-state merge. The claim layer's merge unit
is already an individual meme rather than a whole-valuation snapshot,
so it is structurally closer to delta-CRDT dissemination than to naive
full-state CRDT sync already; this literature confirms the tick loop's
"fold the memes admitted this tick plus the standing valuation" design
is the efficient pattern, and it should be cited for that, but it does
not touch storage cost — delta-CRDTs solve transmission cost, and the
delta still gets joined into a state that only grows.

The engineering answer to that unbounded-growth cost is causal-
stability garbage collection: Preguiça, Baquero, and Shapiro's
dotted-version-vector line of work ("Efficient Causality Tracking for
Distributed Key-Value Stores" and the causal-CRDT formulation used
across the Riak/Basho ecosystem; see also Christopher Meiklejohn's
2019 "Applied Monotonicity" retrospective on Riak CRDTs) tags each
update with a dot (replica-id × counter), tracks a causal context per
replica, and permits discarding a tombstone or dot only once it is
*causally stable* — provably observed by every replica, via a
periodic meet over causal frontiers, so nothing in the future can need
it again. This is precisely the mechanism the claim layer does not
have: no tombstones, no version vectors, no anti-entropy pass, no
computed notion of "this evidence item is safe to prune." For a
single-process, single-replica engine (which Stage 1 is — one process
invocation, no distributed sync) causal stability degenerates to
something simpler and immediately available: an evidence item is
provably stable the moment its tick has been recorded in the journal
and the tick budget has passed it, because there is exactly one writer
and no concurrent replica that could still need to observe it. The
LLD should say this explicitly rather than import distributed-systems
machinery this engine does not need yet — the *concept* (evidence past
which no future observer can arrive) transfers even though the
distributed mechanism does not.

**What the LLD must test, per this literature's standard checklist.**
Property-based tests generating random meme orderings and asserting
idempotence (`compose(compose(m))=compose(m)`), commutativity across
all pairwise orderings, and associativity across groupings — the CAI
discipline Riak's `riak_dt` suite and the "Riak DT Map" paper (Brown,
Cribbs, Meiklejohn, Elliott, PaPEC 2014) codify for production CRDT
types, and that Automerge's and Yjs's `crdt-benchmarks` suites extend
with convergence-under-random-partition-and-reunion tests. Those two
libraries are also the closest existing precedent for the second
obligation this literature names and the drafts do not: both have had
to publicly address "document size grows forever" complaints from real
users, which is the exact failure mode of an evidence list with no
retention policy. The LLD should carry an explicit growth-budget test
— evidence-list length per cell as a function of tick count and
admitted-mark count under a fixed workload, with unbounded slope
treated as a regression — alongside the CAI tests, not instead of
them.

## 4. Event sourcing and incremental view maintenance: discipline for the journal

The shell draft's trace design ("the trace *is* the log," §9) is
already, without citing it, the practitioner discipline Martin Fowler
and Greg Young describe for event sourcing: the log is the sole source
of truth and append-only; derived/current state is never ground truth,
it is a fold over the log (Young's formulation: "a snapshot is a
memoization of your left fold"); snapshotting exists purely as a
performance optimization, chosen against a replay-time budget rather
than for correctness; and a stale or broken projection is repaired by
wiping it and replaying the log, never by patching it directly. This
maps onto the engine directly: the journal (`trace.mjs`) is the log,
the composed valuation and chemistry state are the fold, and
`stateHash` (tick loop step 12) is exactly the memoization checkpoint
this literature describes — except the shell draft currently computes
one every tick rather than at a chosen cadence, which is correct for
Stage-1 scale (tens of species, tens of claims — §7's own stated non-
goal of performance) but will need the cadence question answered
explicitly once scale changes, per this literature's own guidance that
snapshot frequency is a replay-time-budget decision, not a fixed
policy.

The classical incremental view maintenance literature — Ashish Gupta
and Inderpal Singh Mumick, "Maintenance of Materialized Views:
Problems, Techniques, and Applications" (*IEEE Data Engineering
Bulletin* 18(2), 1995, pp. 3–19) — taxonomizes exactly the distinction
this engine's design already exploits without naming it: insertion-
only view maintenance is the structurally simple case (monotone,
self-maintainable in the common case), while deletion/update
maintenance requires either auxiliary derivation-count bookkeeping or
full recomputation, because naive deletion propagation is unsound
once a view involves duplicate elimination or negation. The chemistry-
to-claim observables (`bindings.chemistryToClaim`) and the claim-to-
chemistry parameters (`bindings.claimToChemistry`) are both views over
the claim store in this sense, and both are currently insertion-only
— which is why they are cheap. This citation is the formal statement
of why that cheapness is not incidental: it is the easy half of a
well-studied hard/easy split, and the drafts should say so explicitly
rather than leave it implicit.

Frank McSherry, Derek Murray, Rebecca Isard, and Michael Isaacs's
"Differential Dataflow" (CIDR 2013) is the literature's answer to the
harder half, and it is the single most directly actionable citation in
this study for the claim layer's eventual retraction path (§1, §7).
Differential dataflow represents every datum as a `(data, time, diff)`
triple, `diff` a signed integer multiplicity — insertion is +1,
retraction is −1 — and the *same* incremental machinery (accumulate
diffs per key, propagate deltas) handles both without special-cased
undo logic. Concretely for this engine: a monotone, union-based
evidence store could add retraction cheaply by re-encoding each
evidence item's presence as a signed count rather than by redesigning
`composeFibers` — presence becomes `count > 0`, the merge becomes
multiset-sum-of-signed-counts (still a commutative monoid, still
idempotent under the right reduction, still associative), and a
retraction is simply replaying a −1 event through the existing fold.
This is a materially different and cheaper design than either JTMS's
nogood layering or the ATMS/CRDT tombstone pattern (§1, §3): it needs
no unique-tag causal metadata, only a scalar per evidence item. The
LLD should record this as the recommended forward-compatible shape for
retraction, staged as an explicit future-work item with its own test
plan, rather than left undesigned — precisely because it composes with
the join `composeFibers` already has instead of requiring a second
merge operator.

**Discipline for the LLD, stated as obligations, not description.**
(1) A replay-determinism test that folds the journal from genesis and
asserts the recorded `stateHash` at every tick, not only the final
one — the shell draft already specifies this (§4 step 12's note on
localizing divergence to its first tick) and this literature is the
citation for why that granularity is correct practice, not
overengineering. (2) A stated snapshot cadence policy, chosen against
a replay-time budget, the moment Stage-1's "performance is explicitly
a non-goal" stops being true. (3) Every derived observable
(`chemistryToClaim`, division/death checks reading the settled
valuation) documented as rebuildable-from-the-journal, never as a
second source of truth — which the shell draft's "domain outcomes are
data in the trace, never exceptions" already gestures at but should
state as the general rule this literature names it as. (4) The
multiplicity encoding above recorded now as the retraction design
target, so a future LLD does not have to choose between JTMS-style
nogood layering, ATMS-style relabeling, and CRDT-style tombstoning
without knowing a fourth, cheaper option exists and composes with what
is already built.

## 5. Paraconsistent stores in practice: what implementers hit

The claim layer's own theoretical ancestor among shipped systems is
annotated logic programming: Michael Kifer and V.S. Subrahmanian's
"Theory of Generalized Annotated Logic Programming and its
Applications" (*Journal of Logic Programming* 12(3&4):335–367, 1992)
annotates facts and rules with elements of an arbitrary complete
lattice and gives a monotonic immediate-consequence operator with a
unique least fixpoint — Belnap FOUR, fuzzy, probabilistic, and
temporal reasoning all fall out as instances by choice of lattice,
making this the direct theoretical parent of "merge by lattice join"
as a general pattern, not only of the bilattice case §2 covers. The
practical fallout is instructive: Leach and Lu, "Query Processing in
Annotated Logic Programming: Theory and Implementation" (*Journal of
Intelligent Information Systems*, 1995), report that naive resolution
becomes intractable once annotations are non-ground, because proof
search must constraint-solve over the annotation lattice rather than
merely unify; their fix was a dedicated resolution procedure built
specifically to make annotated query answering tractable. The lesson
transfers directly: the claim layer's queries (does this cell hold,
compared against what threshold of evidence) must not be written as
naive scans once the lattice-valued structure is in the query path,
and the LLD's test plan should include a query-cost check now rather
than discover this the way annotated logic programming did.

Paraconsistent relational databases hit the unbounded-growth problem
this study's §3 raises from a different angle, and hit it first.
Rajiv Bagai's four-valued tuple relational calculus work
("Tuple Relational Calculus for Paraconsistent Databases,"
IBERAMIA-SBIA 2000, LNCS 1952) and the companion line on infinite
relations in paraconsistent databases (Bagai and Sunderraman) report
that because positive and negative evidence are tracked independently
rather than derived by closed-world complementation, paraconsistent
relations can become effectively infinite, forcing symbolic or
generalized-tuple representations instead of materialized extensions
— unbounded evidence storage was not a hypothetical risk for these
systems, it was the first wall implementers hit, well before query
semantics became the harder problem. "A Useful Four-Valued Database
Logic" (*Proc. 22nd International Database Engineering and
Applications Symposium*, ACM, 2018) is a direct, later response: it
collapses full four-valued evaluation toward three-valued-style
processing (a single "inconsistent" marker replacing the full evidence
record) specifically to recover the query performance naive
four-valued evaluation loses. That is a warning shot for this engine's
own possible future: if evidence-list growth or query cost ever forces
a similar collapse, it should be a deliberate, documented LLD decision
made with this precedent in hand, not a surprise discovered in
production.

One adjacent tradition is worth naming precisely so it is not
conflated with the claim layer's approach. Consistent query answering
— founded by Marcelo Arenas, Leopoldo Bertossi, and Jan Chomicki,
"Consistent Query Answers in Inconsistent Databases" (PODS 1999) —
does not store contradictory evidence at all: inconsistency relative
to integrity constraints is resolved at query time by considering all
minimal repairs, and a consistent answer is one true in every repair.
This is the architectural opposite of the claim layer's choice
(discard the contradiction and answer what survives every repair,
versus keep the contradiction as first-class queryable data), and it
is worth naming because it is the tradition most likely to be
suggested as "the standard way databases handle this" by someone
unfamiliar with Belnap-style stores — and it is not the same problem.
Its own literature (surveyed in Leopoldo Bertossi, *Database Repairing
and Consistent Query Answering*, Morgan & Claypool, 2011) reports
consistent query answering is coNP-complete in data complexity even
for simple constraint classes, because the number of minimal repairs
can be exponential — a cost the claim layer's design does not inherit,
precisely because it never computes repairs. This is a point in the
claim layer's favor worth recording as such.

## Verdicts

**The claim layer as a `relating`-fiber join store.** CONFIRMED. Read
directly against Ginsberg 1988, Fitting 1991, and Shapiro et al. 2011,
the design is a coherent instance of a well-studied pattern on both
its academic side (bilattice logic programming) and its engineering
side (state-based CRDTs), not an ad hoc invention needing either
literature's blessing retroactively. `composeFibers`' idempotence,
commutativity, and associativity are structural (§3), and its
knowledge-order fixpoint matches Fitting's Kripke–Kleene construction
exactly (§2). No revision needed to the shell draft's §2 architecture
on this point.

**Join-only settling with no retraction.** CONFIRMED for Stage 1,
OPEN beyond it. Stage 1's evidence sources are closed-world and
enumerable in advance (§1), matching the panel review's own "the
regime is forced, not detected" argument for κ ≤ 3 settling; nothing
in this literature suggests Stage 1 needs retraction machinery it does
not have. What settles the open question for later stages: the first
scenario that requires a source to recant, a provenance-flagged claim
to be struck, or a claim to be invalidated by a gradient discontinuity
— named already as Stage 2+ territory (organelle nesting, the
membrane's `transform` verb, the resubmission-attack gate). When that
scenario is designed, this study recommends the differential-dataflow
multiplicity encoding (§4, §1) over JTMS nogood layering or ATMS/CRDT
tombstoning, because it composes with the existing join rather than
requiring a second merge operator — but that is a recommendation for
the LLD that builds it, not a decision this study can make now.

**The truth order, present but unused.** REVISE, with the revision
being an explicit LLD note rather than new code. The substrate already
exports `joinTruthValue`/`meetTruthValue`/`leqTruth` and the
`orderSwapValue` isomorphism, and its own docs distinguish "how much
evidence" from "how true" — but every draft written to date
(`membrane.mjs`; no `interior.mjs` yet) uses only the knowledge order,
and the dihedral-gauge module's own comment states the truth-order
operations are not lawfully lifted to evidence carriers. The claim
layer's LLD should state explicitly, as a scoping decision rather than
an oversight, whether Stage 1 needs to rank confirmed claims by
"how true" (Arieli–Avron's distinction, §2) — the current design
never asks this question, so the omission is currently harmless, but
it should be a stated choice, with the citation to Fitting 1993/2002
recorded as what a future stage would need if the answer changes.

**Evidence lists growing without bound.** REVISE. Confirmed as a real,
named cost in both the CRDT literature (§3: grow-only structures pay
for tombstone-free monotonicity with unbounded carrier growth) and the
paraconsistent-database literature (§5: Bagai's infinite-relations
problem was the first wall implementers hit, not a late-stage
surprise). The revision: the claim layer's LLD must carry an explicit
growth-budget property test (evidence-list length as a function of
tick count and admitted-mark count, unbounded slope as a regression)
alongside the CAI tests §3 already requires, and must state — even if
only to defer it — the causal-stability argument that makes pruning
sound for a single-process, single-replica engine: an evidence item is
provably stable once its tick has passed, because there is exactly one
writer and no concurrent replica that could still need to observe it.
This is simpler than the distributed-systems mechanism (dotted
version vectors, anti-entropy) the CRDT literature builds for the
multi-replica case, and the LLD should say so rather than importing
machinery this engine does not need yet.

**The bindings table as sole coupling.** CONFIRMED, from the IVM
literature's own terms rather than by architectural intuition alone.
Both coupling directions are views over the claim/chemistry state in
Gupta and Mumick's sense (§4), and both are currently insertion-only,
which is exactly the structurally cheap half of the classical
insertion/deletion split this literature names. The design's decision
to keep the bindings table as the *only* coupling, declared rather
than ad hoc (shell draft §2), is what keeps both views in the cheap
half; an ad hoc coupling that let arbitrary code read or write across
the claim/chemistry boundary would risk crossing into the expensive,
deletion-aware half of view maintenance without anyone deciding to.
No revision.

**The trace/journal design.** CONFIRMED, and the practitioner event-
sourcing literature (§4) supplies the vocabulary the shell draft is
missing rather than a correction: the journal is the log, the composed
state is a fold over it, `stateHash` is the memoization checkpoint.
One addition, not a revision: the LLD should state a snapshot-cadence
policy now, even if the policy is "one per tick, revisit when
performance stops being a non-goal" — stated as a policy with its
trigger condition named, per this literature's own guidance that
cadence is a replay-time-budget decision, not a default left implicit.
