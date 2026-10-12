---
title: "Study of Rule-Based Modeling and Membrane Computing"
description: "S3 of the software planning program: a literature study of Kappa/BioNetGen/NFsim rule-based modeling, P-Lingua/MeCoSim P-system implementations, and brane calculi, run specifically to check the panel review's membrane contract and its expressive-economy distinctiveness claim against the nearest engineering prior art, concluding that the claim survives narrowly (open-domain provenance deduplication and multi-tick trace conditions) but was overstated broadly (bounded source-counting is cheaply absorbed by Kappa's counter extension) and that P-system implementations supply concrete, stealable techniques for the admission-pipeline LLD and for Stage-2 nested organelles."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-study-of-rule-based-and-membrane-computing
authors:
  - claude-sonnet-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "kappa", "bionetgen", "nfsim", "p-systems", "p-lingua", "active-membranes", "brane-calculi", "membrane-service", "rule-based-modeling"]
tags: ["draft", "study"]
---


## Scope and method

This is S3 of the software planning program named in
`2026-08-21-note-on-the-software-planning-program.md` §2.1. It checks
two documents against the published literature and the maintained
tooling of rule-based modeling and membrane computing: the membrane
contract in `2026-08-21-note-on-the-stage-1-expert-panel-review.md`
§3, and the membrane-as-predicate claim and falsifiers in
`2026-08-21-natural-computer-simulation-engine-design.md` §0.1 and
§4. The six questions in the assignment are answered in order below,
each with citations to sources actually consulted (author, year,
venue or project documentation), and the note closes with verdicts
on the four decisions it was assigned to check. Method: web search
against primary sources — the Kappa platform paper, the KaSim
manual, the NFsim papers, the P-Lingua/MeCoSim papers, Păun's active-
membranes literature, and Cardelli's brane calculi paper and its
citing literature — followed by direct reasoning about what each
system's actual expressive mechanism can and cannot do, since the
distinctiveness question (§5 below) is not settled by any single
paper but by working through the encodings by hand.

## 1. Kappa and BioNetGen: what a rule is, and the combinatorial
   explosion argument

A Kappa rule is a graph-rewrite rule over **site graphs**: an agent
is a node with a fixed, named interface of sites; each site carries
an internal state (a modification mark, drawn from a small
enumerated set — phosphorylated/unphosphorylated and the like) and a
linking state (free, bound to a specific other site, or
underspecified), with the structural constraint that at most one
edge in the whole graph uses a given site. A rule's left-hand side is
a **pattern** — a partial site graph naming only the sites relevant
to the transformation, "don't care, don't write" (DCDW) — and its
right-hand side states how that pattern's matched image is
transformed. The manual is explicit that a rule's *instances* are
its embeddings into the current mixture, and DCDW is what makes those
embeddings cheap to find: because the interface is rigid, "an
embedding between 2 sited graphs is completely defined by the image
of one node" (Kappa tools reference manual, `tools.kappalanguage.org`,
KaSim manual). BioNetGen's BNGL is the same idea in a different
concrete syntax — molecules with typed component sites, rules as
graph-rewrite patterns over those components — described at length
in the BioNetGen 2.2 paper (Harris et al. 2016, *Bioinformatics*
32(21):3366–3368) and its predecessor documentation.

The combinatorial-explosion argument, stated precisely, is: a
protein with n independently-modifiable sites has up to 2ⁿ
distinguishable species, and a pathway of a handful of such proteins
generates species and reaction counts that grow exponentially — the
whole reason rule-based modeling exists as a distinct methodological
move rather than "just write the reaction network." Danos, Feret,
Fontana, Harmer, and Krivine's line of work (surveyed in the Kappa
platform paper, Boutillier et al. 2018, *Bioinformatics*
34(13):i583–i592, PMC6022607) frames the rule as *both* a mechanistic
description and an executable instruction precisely so the modeler
never has to enumerate the species the rules imply. A rule states a
local condition ("this site is free and that site is phosphorylated")
and its consequence, and the simulator is responsible for finding all
the places in the current mixture where that local condition holds —
which is a fundamentally different computational commitment than
writing out a reaction for every combination up front.

KaSim (the Kappa simulator) commits to this at the level of the main
event loop: each simulation event costs "a per-event time cost which
is independent of the size of the set of generable species" (Kappa
platform paper). The mechanism the 2018 paper describes for making
this true in practice is a model-dependent indexing structure built
once at load time such that "no pattern — whether the left side of a
rule, a user-defined observable, or any sub-pattern of these — is
ever scanned twice for the same embedding into the mixture"; when two
rules' left-hand sides share a sub-pattern, a match to that
sub-pattern is shared across the search for both. After a rule fires,
only the embeddings gained or lost by the local structural change are
recomputed, not the whole match set. The runtime data structure
carrying the mixture is the site graph itself, held as agent
instances with typed interfaces and an explicit edge relation over
sites (the manual's own definition, "a graph where edges use sites in
nodes"); KaSim never compiles this down to a reaction-network table —
the mixture stays a graph, and the reaction network some other
approach would have enumerated exists only implicitly, as the set of
current embeddings.

## 2. NFsim and the network-free extension

BioNetGen can still generate an explicit reaction network from BNGL
rules when the rules happen to generate a tractable one (the
`generate_network` action) — but for the cases the whole approach
exists for, that network is intractably large or literally infinite
(unbounded polymerization, for instance). NFsim (Sneddon, Faeder, and
Emonet 2011, *Nature Methods* 8(2):177–183) is BioNetGen's answer:
"network-free" stochastic simulation that never generates the
reaction network at all. Its mixture is not a vector of species
counts but a live population of individual molecule *objects*, each
carrying its own binding/modification sites, matched directly by
rules at simulation time — "objects with binding and modification
sites acted on by reaction rules" (Sneddon et al. 2011). Because the
simulator samples molecules and applies rules directly to them, its
per-event cost scales with the number of *rules*, not the number of
species or reactions those rules would imply if expanded.

The specific mechanism that makes this exact rather than approximate
is worth carrying into the membrane LLD: NFsim (building on Yang,
Monine, Faeder, and Hlavacek's kinetic Monte Carlo method, 2008,
*Physical Review E* 78:031910, arXiv:0712.3773) samples a rule and a
candidate set of reactant molecules using an *overestimate* of the
rule's true firing rate (computed from a cheap upper bound on how
many matches could exist), then checks whether the sampled molecules
actually satisfy the rule's full pattern. If they do not — the
molecularity constraint fails, or (in a homodimerization rule) the
same molecule gets sampled for both pattern slots and the two matches
would overlap on a site, a "clash" — the event is rejected: time
still advances by the sampled increment, but no state changes. This
"null event" spends exactly the excess probability mass the
overestimate introduced, so the overall process remains an *exact*
stochastic simulation despite never enumerating the true rate. NFsim
trades a controlled rate of wasted ticks for never paying the
combinatorial cost of computing an exact rate up front.

## 3. P systems in practice: P-Lingua/MeCoSim, active membranes,
   promoters and inhibitors

P-Lingua is the specification language, and pLinguaCore its parser
and simulator library, for the whole family of P-system variants
(cell-like, tissue-like, symport/antiport, active membranes, and
more); MeCoSim ("Membrane Computing Simulator") is the general-
purpose front end that loads P-Lingua models, drives parameterized
"virtual experiments," and visualizes membrane structure, multisets,
and simulation traces. The workflow, and the further pipeline to a
GPU-parallel back end (PMCGPU), is described in the P-Lingua/MeCoSim
literature (e.g. the Springer chapter "A Simulation Workflow for
Membrane Computing: From MeCoSim to PMCGPU Through P-Lingua," 2018;
the P-Lingua framework overview and the tissue-P-systems-with-
promoters paper, *Journal of Membrane Computing* 2020).

Operationally: a P-system configuration is a tree of nested
membranes, each region holding a multiset of symbol objects. A rule
is a local multiset-rewrite: consume some multiset in a region,
produce another (possibly sending some objects to a parent or child
region, or dissolving the enclosing membrane). Execution proceeds in
global steps under **maximal parallelism** — at each step, every
membrane applies as many rule instances, on as many disjoint objects,
as it possibly can, chosen nondeterministically when more than one
maximal multiset of applications is available. This nondeterminism is
the central implementation headache the P-systems simulator
literature keeps returning to: because P systems are "intrinsically
nondeterministic computational devices," their computation trees are
"difficult to store and handle with computers with one processor,"
and most working simulators (P-Lingua/pLinguaCore included) resolve
the choice at each step by a single random selection among the
maximal applicable multisets rather than exploring the branching
computation tree, which is adequate for confluent or expected-value
use but does not, by itself, verify a nondeterministic design's
worst-case or all-branches behavior (survey material collected under
"Maximally Parallel Multiset-Rewriting Systems," Ciobanu and Păun
lineage; "Minimization Strategies for Maximally Parallel Multiset
Rewriting Systems," arXiv:1009.2706).

**Active membranes** (Păun, "Computing with Membranes," *Journal of
Computer and System Sciences* 61(1):108–143, 2000) add a
**polarization** label {+, −, 0} to every membrane and let rules fire
conditioned on, and mutate, that polarization, plus a membrane-
**division** rule that replaces one membrane with two (or more) each
inheriting a share of the parent's contents, at the modeler's choice
possibly with different objects routed to the two daughters depending
on which of them carries which polarization afterward. Computationally,
this is the mechanism the whole "P systems solve NP-complete problems
in polynomial time" result family runs on: division under maximal
parallelism creates exponentially many membranes in a linear number
of steps, each free to carry a different partial assignment (this is
literally how SAT is solved by active-membrane constructions — one
division per variable, generating 2ⁿ membranes holding all truth
assignments, then a bounded number of steps to check each and
communicate a yes/no answer back out; see the SAT/active-membranes
literature, e.g. Pérez-Jiménez and Riscos-Núñez's line of work, and
"P systems with active membranes: trading time for space," *Natural
Computing* 2010). Polarization itself does no computation beyond
being one more finite label a rule's left-hand side can test and its
right-hand side can set — its work is entirely to make division
selective (send objects with the "+" -compatible rule one way, the
"−" one the other) so the exponential membrane population can be
steered rather than merely replicated. Later work shows the
polarization labels are not essential to the completeness/complexity
results — they can be traded for plain labels at some cost in rule
count ("Trading polarizations for labels in P systems with active
membranes," *Acta Informatica* 2004) — which matters for §5 below:
polarization is a *convenience* encoding of a finite external tag on
a membrane, not a distinct expressive primitive.

**Promoters and inhibitors** are the P-systems literature's own
mechanism for conditioning a rule on context beyond its own
left-hand-side multiset: a rule with promoter set P can only fire if
every object in P is *also* present in the region (modeling an
enzyme's presence without consuming it); a rule with inhibitor set I
can only fire if *no* object in I is present. Both are standard
enough to have their own completeness results (e.g. "tissue P systems
with at most two promoters ... using only symport rules of length 1
are Turing universal," and weight-two promoters/inhibitors already
suffice for computational universality in the purely catalytic case —
"Promoters and Inhibitors in Purely Catalytic P Systems," 2015).
Structurally, a promoter or inhibitor is exactly a second, unconsumed
pattern the rule's applicability is conjoined or negated against — it
extends what a rule can be conditioned on, but the condition is still
a **multiset-membership test against the current region's contents**,
evaluated at the instant the rule is considered. Nothing in the
promoter/inhibitor literature conditions a rule on the *history* of
how those objects arrived, only on their co-presence now.

## 4. Brane calculi: what survived into practice

Cardelli's brane calculi (2004, *Proceedings of CMSB'04*; also at
`lucacardelli.name/Papers/Brane Calculi.pdf`) is a family of process
calculi in which, unlike P systems, the active computational entities
live *on* the membrane itself rather than in the enclosed region —
actions such as bud, mate, and drip encode vesicle budding, membrane
fusion, and phagocytosis directly as calculus primitives, with
interactions available on both faces of a membrane simultaneously.
This is a genuinely different modeling commitment from both P systems
and Kappa: it targets the topology-changing events of a real membrane
(fission, fusion) as first-class actions rather than as encoded
side-effects of rewriting a region's contents.

What survived is theoretical development, not a maintained simulator.
The follow-on literature — "On the Computational Power of Brane
Calculi" (2006), "Projective Brane Calculus," "Brane Calculi Systems:
A Static Preview of their Possible Behaviour" (arXiv:1108.3429) — is
almost entirely expressiveness and static-analysis results. The one
practical line that appears repeatedly is **encoding** brane calculi
into an existing, already-implemented process-algebra tool rather
than building brane calculi its own execution engine: π@, a
prioritized, polyadic extension of the π-calculus built specifically
"for the implementation of compartmentalised bio-inspired calculi"
(Versari, 2007–2008 line of work), gives "reasonable" encodings of
both BioAmbients and Brane Calculi into a stochastic π-calculus
variant (Sπ@) that already has execution tooling. A separate,
narrower result simulates a bounded symport/antiport P system inside
Brane Calculi itself (*BioSystems*, 2007) — a mutual-encoding result,
not new tooling. No maintained, general-purpose brane-calculi
simulator comparable to KaSim, NFsim, or P-Lingua/MeCoSim turned up
in this search; the formalism's afterlife is as a comparison point
and an encoding target for calculi that do have tools, and as a
conceptual vocabulary (bud/mate/drip) that later membrane-computing
and systems-biology work cites for its topology-change primitives
without adopting its execution model.

## 5. The distinctiveness audit: steelmanning the opposite case

The panel's claim (Stage-1 review §3) is that admission conditioned
on "the site's joined evidence trajectory (witness provenance,
independent-source counts)" is where the engine's membrane escapes
absorption into Păun's active membranes, because a P-system encoding
of such a predicate "pays a combinatorial rule-table tax per
predicate" where `composeFibers`' knowledge-join supplies the same
thing as one generic algebraic operation. The rule-based literature
in §1–§3 above gives the tools to test this claim by attempted
encoding rather than by argument alone, and the result is mixed —
narrower than the panel stated in one direction, and, in a different
respect, actually stronger.

**Where the claim is weaker than stated: bounded source-counting.**
"Independent-source counts" read as a threshold condition — admit
once at least k independently-sourced witnesses have been seen — is
exactly the shape of problem Kappa's counter extension was built to
solve cheaply. Boutillier and Cristescu ("When rule-based models need
to count," arXiv:1708.02651, 2017) document that naive Kappa cannot
express "phosphorylated at exactly n sites" without one rule per
value of n, and that the traditional workaround — a chain of dummy
agents attached one per unit, incremented and decremented alongside
the real event — works but costs memory management overhead for
synthesizing and degrading the chain. Their fix, adopted into the
Kappa language proper, is an agent-level **counter site**: an
integer-valued site with a declared range, tested and incremented by
ordinary rule syntax, no dummy-agent chain and no per-value rule
required. This is a direct, compact, already-implemented answer to
"admit once k independent sources have contributed," and it means the
panel's "combinatorial rule-table tax per predicate" is not the
generic cost of expressing a counting-shaped admission condition in a
Kappa-family system — it is the cost of expressing it in a system
*without* a counter extension, which is exactly the gap Kappa's own
maintainers closed. A steelmanned P-system encoding could do the
analogous thing with a bounded integer object count in a region
tested by a threshold rule (`count ≥ k → admit`), which is no worse
than the Kappa case and does not require polarization or division at
all. So: if "independent-source counts" is read as a bounded integer
threshold, active-membrane absorption is real and cheap, and the
panel's economy argument does not hold for that half of the claim as
stated.

**Where the claim survives, and survives more sharply than the panel
argued: open-domain identity deduplication.** The concrete predicate
Stage 1 actually ships — "reject a claim whose witnesses are
digest-identical to witnesses the site already holds," the
resubmission-attack gate — is not a counting condition at all; it is
an **equality test against an open, unbounded value domain** (sha256
digests). Every mechanism surveyed above — Kappa/BNGL's internal
states, P-systems' symbol objects, even Kappa's counters — assumes a
*finite, enumerable* alphabet of site or object values fixed at model-
declaration time; DCDW and rigid interfaces are precisely what buys
Kappa's tractable matching, and both depend on that finiteness. To
test "is this digest equal to one already present" inside such a
system, the encoding has exactly two options, and both are bad in
the way the panel gestured at but did not name precisely. Either (a)
mint one agent type or one symbol-object value per distinct digest
ever seen, which is not a "combinatorial rule-table tax" in the sense
of more rules — it is an unbounded *type-alphabet* tax, worse than a
rule-count blowup because it violates the fixed-signature assumption
the whole matching-cost argument in §1 depends on (a system whose
agent signatures grow at runtime is not the system whose per-event
cost independence Boutillier et al. 2018 proves); or (b) encode
digest comparison as an external, string-valued rate function or
guard bolted onto the rule engine, which is exactly the kind of
escape hatch BNGL's "local functions" already permit for rate
modulation but which stops being a *rule-table* mechanism the moment
it happens — it becomes ordinary imperative code consulted by the
rule engine, conceding the P-system-family formalism does not,
natively, hold this predicate. So the sharper, correct form of the
distinctiveness claim is not "provenance-sensitivity in general"
(too broad — bounded counting is absorbed) but **"identity-based
deduplication over an open evidence domain, and conditions on
multi-tick trace/closure state, are outside what site-graph or
symbol-multiset pattern matching was designed to hold without either
an unbounded type alphabet or an admitted escape to external code."**
The settling-closure half of the claim (conditioning on whether a
site's charge state is a genuine fixed point versus mid-cycle
transient) is similarly outside reach for the same reason as trace
history in §3: promoters/inhibitors and Kappa embeddings test the
*current* structural state, never a predicate over the history of
how that state was reached, and none of the systems surveyed offer a
native primitive for "this region's dynamics have converged" — a
harness would have to inject synthetic history tokens into the
mixture to fake it, which is engineering around the formalism, not
an encoding within it.

**Net verdict on the audit:** the panel's argument is directionally
correct but its example ("independent-source counts") was the weakest
possible instance to hang the claim on, since it is the one case
Kappa's own extension literature already solved compactly. The
resubmission-attack gate the panel required Stage 1 to ship is,
fortunately, not that case — it is digest-identity deduplication,
which is where the claim actually holds, and holds for a reason
sharper than "no local rule table holds it": it is that the P-system
and Kappa-family formalisms are built on a *closed, finite value
alphabet* assumption that a real witness-digest domain violates by
construction, not merely a matter of how many rules it would take.

## 6. What the membrane LLD should steal

Four concrete, transferable techniques from this literature, mapped
onto the ordered-predicate admission pipeline the panel's contract
(§3) specifies — an array of named predicates evaluated per incoming
mark, site-presence floor first:

1. **Shared sub-pattern indexing, KaSim-style.** KaSim's rule that "no
   pattern is ever scanned twice for the same embedding" (Boutillier
   et al. 2018) applies directly if two or more admission predicates
   test overlapping conditions on the same mark or site region — e.g.
   both the site-presence floor and a typeGate predicate inspect the
   mark's predicate name. Build the predicate array as predicates over
   a small set of named, precomputed facts about the incoming mark
   (predicate present in site? source count? digest already held?)
   rather than each predicate independently re-deriving those facts
   from the raw mark and site state; compute the shared facts once per
   mark, before the ordered array runs.
2. **NFsim's overestimate-then-reject discipline, inverted for a
   veto pipeline.** NFsim spends a controlled rate of null events to
   avoid computing an exact combinatorial rate up front (Yang et al.
   2008; Sneddon et al. 2011). The membrane's ordered-predicate
   pipeline is a veto chain, not a rate computation, but the same
   cost discipline transfers directly: order predicates cheapest-
   first and short-circuit on first rejection (already implicit in
   "ordered array," but the LLD should state it as a requirement,
   with the site-presence floor and any O(1) structural checks first,
   and the provenance-gate's digest-comparison — the one predicate
   this study found to be structurally the most expensive, an
   equality test against a growing set — ordered last), so that the
   average-case cost of a rejection is dominated by cheap predicates,
   not by the one expensive one.
3. **Kappa counters for any future bounded-count predicate.** §5
   established that bounded threshold conditions (k independent
   sources) are the case the field already solved compactly. If a
   later predicate needs a bounded count, the LLD should specify it
   as an incrementally-maintained integer on the site (updated at
   admission time, tested at O(1)), the direct analogue of a Kappa
   counter site, rather than re-deriving the count from the full
   evidence history on every incoming mark.
4. **Incremental applicability update after each event, KaSim-
   style.** After a mark is admitted (or a fold/settling event
   changes site state), only the facts that predicate touched need
   recomputation, not the whole predicate array's cached facts —
   the direct analogue of KaSim recomputing only the embeddings
   "gained or lost" by a rule's structural change rather than
   rescanning the whole mixture. The LLD's data structure for the
   site's admission-relevant state (site-presence set, source counts,
   held digests) should expose fine-grained invalidation, not a
   single dirty flag over the whole site.

The P-Lingua/MeCoSim maximal-parallelism literature (§3) is the one
area that does *not* transfer directly to Stage 1: the panel's
contract already commits to per-mark, ordered, non-parallel
evaluation (a mosaic of predicates, not a maximally-parallel rule
application step), which sidesteps the nondeterministic-choice
implementation headache that dominates P-system simulator design.
That headache becomes relevant again only if a later stage introduces
genuinely concurrent, order-sensitive admission across multiple marks
in the same tick — worth flagging for the settling engine's own LLD,
not this one.

## 7. Stage-2 nesting: prior art for organelles

P-system implementations treat nesting as structurally uniform: a
membrane is the same kind of object at every depth, and the whole
configuration is a tree of regions, each an instance of the same
rule-application machinery, differing only in their local rule sets
and their position in the tree (Păun 1998's original tree-structured
hierarchy; P-Lingua represents this directly as its membrane-
structure data model, and MeCoSim's structure viewer renders it as
such). Two operations specifically change the tree shape at runtime,
and both are directly relevant to Stage 2's organelle plan:

- **Dissolution**: a rule can dissolve its own enclosing membrane,
  releasing that region's contents into its parent region and
  removing the corresponding tree node. Complexity results treat
  dissolution as a resource, not a free operation — systems with
  dissolution plus elementary division (each membrane starting with
  at most one child) are bounded in power by P, while dissolution
  plus 2-division without that restriction can reach PSPACE
  ("Membrane Dissolution and Division in P," 2009; the semi-uniform
  active-membranes-with-2-division results cited in §3). The
  practical lesson for a boundary-failure/lysis event (the panel's
  structural-death mode, §1 of the panel review) is that dissolution
  in the P-systems literature is always modeled as an explicit,
  named rule outcome that collapses a specific tree node and
  reparents its contents — never a silent state one infers from
  absence — which matches the panel's own requirement that
  site-dissolved be an explicit terminal state rather than a boolean.
- **Division**: a membrane rule replaces one tree node with two or
  more siblings, each a full copy of the membrane machinery
  (potentially with contents routed differently per daughter, using
  polarization or an equivalent finite tag as the routing key, §3
  above). This is the direct prior art for organelle *replication*
  should Stage 2 or later need it, but the panel review's own
  division design (§0.5 of the founding design, the settled-fixed-
  point-plus-bounded-divergence gate) is already a stronger, checked
  condition than anything in the base active-membranes division rule,
  which fires under maximal parallelism with no fidelity check beyond
  what the modeler encodes by hand — nothing to steal there beyond
  the general shape "division is a named rule that produces two tree
  nodes from one."

The one place P-system nesting differs sharply from the Stage-2 plan
as stated (§1, Stage 2 of the founding design) is admission semantics
at the boundary: nested P-system membranes admit by the same
symbolic-pattern-match rule mechanism as every other membrane in the
tree, while the design commits an organelle boundary to the *same
epistemic evaluator* Stage 1 built (FOUR charge and site-context
predicates) one level deeper. This is exactly the "literal P-systems
kinship" the design already names for the tree structure and rule-
instantiation pattern, paired with exactly the departure §5 of this
study locates precisely: nesting the tree shape is uncontested prior
art; nesting an epistemic (rather than symbolic-pattern) admission
evaluator at each level is the part with no P-systems precedent, for
the same reason §5 found no precedent at Stage 1 — the formalism's
finite-alphabet assumption, not its tree structure, is what it does
not share with `composeFibers`.

## Verdicts

**The membrane-as-ordered-predicate-mosaic contract (panel review
§3).** CONFIRMED. The "mosaic, never a monolith" design — an ordered
array of independently named, independently gated predicates, each
verdict content-addressed and recorded — is not merely defensible
against the P-systems tradition, it is closer to how real P-system
implementations already behave in practice than a single-predicate
membrane would be: MeCoSim's own structure viewer and the promoter/
inhibitor literature (§3) both treat a region's admissibility as the
conjunction/negation of several independently-stated conditions, not
one rule. Nothing in this study's search found reason to revise the
contract's shape. The one addition worth making explicit in the LLD
(not a contract change) is §6's ordering discipline: cheapest
predicates first, the digest-equality provenance check last, since
this study found that check to be structurally the most expensive
predicate class available to the membrane.

**The expressive-economy distinctiveness claim (panel review §3,
"the claim that prior art cannot absorb").** REVISE. The claim
survives, but not for the reason or the example the panel gave. Its
stated example — "independent-source counts" — is exactly the
predicate shape Kappa's counter extension (Boutillier and Cristescu
2017) already absorbs compactly, so citing bounded counting as the
escape from active-membranes absorption is wrong and should be
struck. The claim should be revised to rest on the two predicate
shapes this study found genuinely outside the rule-based and
membrane-computing traditions' native reach: (a) equality/
deduplication tests against an open, unbounded value domain (digest
identity), which violates the finite-alphabet assumption every
system surveyed — Kappa, BNGL, NFsim, P-systems — depends on for its
own tractability arguments, and (b) conditions on multi-tick
trace/closure behavior (is this site's state a genuine fixed point),
which no system surveyed offers as a native primitive at all,
symbolic-pattern or epistemic. The resubmission-attack gate Stage 1
is required to ship is, fortunately, case (a) and not the weaker
counting case, so the requirement itself needs no change — only the
stated justification for why it is required.

**The provenance-gate as a Stage-1 requirement (panel review §3, "as
a requirement, not an extension").** CONFIRMED, with the revised
justification from the item above substituted for the original one.
Digest-identity deduplication is the one predicate shape this study's
attempted encodings could not express inside any surveyed system
without either an unbounded type alphabet (a strictly worse cost than
"more rules") or an admitted escape to external, non-rule-table code.
Shipping it at Stage 1 is the correct discharge of the distinctiveness
claim in fact, even though the claim's original stated reasoning
needed the revision above.

**The `nested()` organelle plan (founding design §1, Stage 2; panel
review §3).** CONFIRMED for the tree-structure and rule-
instantiation half of the plan — reusing the same membrane
constructor one level deeper is uncontested, well-precedented P-
systems practice (dissolution and division as explicit, named,
tree-shape-changing rule outcomes, never silent). OPEN for the
epistemic-evaluator-at-every-level half: no system surveyed in this
study nests an epistemic (FOUR-charge, site-context) admission
evaluator inside a symbolic-pattern-match tree, so there is no prior
art either confirming or refuting that this composes cleanly at
depth — in particular, whether a nested predicate's provenance/
trace-history checks should see the parent site's evidence trail or
only the organelle's own is not settled by anything in this
literature and needs its own falsifier when Stage 2's LLD is
written. What would settle it: build the two-level nested case
Stage 2 first needs, feed it the same adversarial-provenance and
digest-resubmission scenarios used at Stage 1 (panel review §6), and
check whether the outer membrane's and the organelle's verdicts on
the same mark ever disagree in a way neither level's contract
anticipated — the same H¹-disagreement check the panel review's §5
already proposes for the site-presence floor, run one level deeper.
