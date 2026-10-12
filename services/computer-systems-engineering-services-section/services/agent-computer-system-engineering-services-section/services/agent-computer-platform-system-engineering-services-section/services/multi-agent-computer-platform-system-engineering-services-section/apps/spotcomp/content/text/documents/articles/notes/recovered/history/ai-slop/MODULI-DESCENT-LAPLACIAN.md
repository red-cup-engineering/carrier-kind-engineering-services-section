# Moduli, Descent, And Laplacian Machinery

Status: source-backed declaration surface. This file records the lab
predication-categories machinery that SPOTCOMP must preserve when it talks
about rule systems, regimes, d-frame cohomology, Verdier duality, and strong
MLD. Lab theorem claims are treated as proven for SPOTCOMP derivation even
where archive metadata has not been cleaned up. This file is not a
computational cohomology engine.

## 1. Descent Is A Rule-System Obligation

The lab separates two stack levels:

- the settling moduli stack classifies settlings up to MLD-equivalence;
- the meta-moduli stack classifies closure-rule systems up to
  closure-equivalence.

The meta-moduli stack theorem says the meta-moduli prestack is already a
1-stack. Effective descent is driven by closure operators: compatible local
closure operators glue because they are equationally specified in the
predication fiber algebra, and the fiber algebra has sheaf-like descent for
that equational data. Rule syntax is not the invariant; the generated closure
operator is.

SPOTCOMP consequence: a swarm profile that cites a closure-rule system must
declare whether rule-system identity is syntactic identity, closure-equivalence,
or a descent-glued rule-system class. Federation cannot merge local rules by
string equality when the mathematical invariant is closure-equivalence under
effective descent.

## 2. Two Regime Stratifications

There are two different regime readings:

- a settling-level partition of coarse moduli by the actual closure ordinal of
  one settling;
- a meta-level stratification of rule systems by the maximum regime any
  settling under that rule system can attain.

The coarse-moduli regime decomposition is set-theoretic and combinatorial, not
a topological locally-closed stratification. The meta-stratification is a
locally-closed substack decomposition by rule-language fragment:

- atomic-only fragments are meta-strict;
- finite conjunction/disjunction fragments are meta-Scott-continuous;
- universal-quantifier fragments are meta-transfinite-bounded;
- alternating-quantifier or richer fragments are meta-aperiodic.

Named substitution examples are regime-sensitive. Padovan belongs in the
finite/strict placement, Fibonacci in the Scott-continuous placement,
Tribonacci in the transfinite placement, and later step families continue the
regime-indexed ladder only with explicit placement evidence. This staged
placement is separate from the lab benchmark convention that lifts selected
substitutions over `E = omega_1` and can classify the benchmark run as
aperiodic. SPOTCOMP must not use a substitution name as a generic synonym for
"aperiodic" without the corresponding regime witness.

SPOTCOMP consequence: a runtime cannot infer the rule-system regime from one
small finite run or from an interchangeable named example. A conformance
profile must separately record the local settling regime and the meta-regime
of the closure-rule system, and must say which rule-language fragment or
regime-specific substitution witness justifies the meta-regime claim.
[REGIME-SUBSTITUTION-LADDER.md](./REGIME-SUBSTITUTION-LADDER.md) records the
named-substitution placement and benchmark-lift boundary.

## 3. D-Frame Cohomology Uses The Laplacian Route

The lab's d-frame cohomology material rejects a fake shortcut: d-frames do not
come with a ready-made published cohomology theory. The chosen working route is
Tarski/Lawvere Laplacian cohomology for lattice-valued or quantale-enriched
cellular sheaves, with shadow cohomology as a scaffold when the native
d-frame/Laplacian framework is not yet available.

The cellular-extension plan decomposes the needed machinery into:

- Q-enriched sheaves on Grothendieck sites;
- fibered cellular structure on the bitopological settling site;
- transfinite cellular structure for aperiodic regimes.

The Boolean d-frame scope is closed at corpus rigor through Q-enriched Curry
layers and Verdier duality on the bitopological settling site. Non-Boolean and
direct `omega_1` fixed-point convergence claims must still name their exact
scope: direct-limit construction, weighted/Pisot-aligned theorem, or direct
Tarski-Lawvere fixed-point convergence.

SPOTCOMP consequence: a swarm cannot claim native d-frame cohomology merely
because it stores two bilattice coordinates. It must name whether it is using
shadow cohomology, Boolean d-frame Q-enriched cohomology, a direct-limit
aperiodic construction, or a non-Boolean weighted theorem with its stated
conditions.

## 4. Verdier And Six-Functor Scope

The Verdier-duality theorem on the bitopological settling site gives a
Q-enriched sheaf/cosheaf derived equivalence across the four regimes at corpus
rigor. In the d-frame specialization, two dualities compose:

- spatial Verdier duality, exchanging sheaf and cosheaf presentations;
- value-category duality from bilattice negation, swapping positive and
  negative evidence sides.

This yields a co-classification view of aperiodic settlings: a sheaf-side
`H1` class and a cosheaf-side `H1` class are dual presentations of the same
MLD-class where the theorem scope applies.

The Q-enriched direct/inverse image theorem names a six-functor package
`Phi*`, `Phi_*`, `Phi!`, `Phi_!`, tensor, internal Hom, and Verdier duality.
Its functor definitions and four standard axioms are part of the lab theorem
surface for the broader Q-enriched setting.

SPOTCOMP consequence: a conformance profile may rely on the Verdier
sheaf/cosheaf duality only inside the theorem's scope. Six-functor claims must
carry scope labels and cannot be promoted into runtime conformance by the
existence of a declaration checker.

## 5. Strong MLD Is A Strict Refinement

Ordinary aperiodic MLD classifies by the classifying invariant. Strong MLD adds
the composed-duality firing-orbit type at each non-Scott-continuous firing:

- truth-only;
- falsity-only;
- top-firing.

The value-category-side firing-orbit classification is supplied by bilattice
negation on d-frame-valued sheaves, and the spatial preservation under MLD
bisimulation is part of the strong-MLD theorem surface. SPOTCOMP should track
both pieces explicitly because implementations can easily preserve ordinary
MLD while losing the composed-duality firing-orbit data.

SPOTCOMP consequence: a swarm that only preserves ordinary `H1` equality has
not established strong MLD. Strong MLD claims must include the firing-orbit
type function and must cite the theorem scope in which the composed-duality
orbit data is preserved.

## 6. Implementation Boundary

The implementation probe may check declaration shape for this layer. It must
not:

- identify rule systems by source text when closure-equivalence is the
  mathematical invariant;
- treat a single finite run as proof of a meta-regime;
- flatten d-frame cohomology to one `H1` slot;
- use Verdier or six-functor language without theorem scope;
- treat strong MLD as ordinary MLD plus naming.

Unknown descent, unknown meta-regime, unknown native/cohomology route, or
unknown composed-duality orbit data blocks strong swarm conformance.

## 7. Declaration Probe

The files [schema/moduli-descent-laplacian-profile.schema.json](./schema/moduli-descent-laplacian-profile.schema.json),
[examples/moduli-descent-laplacian-profile.json](./examples/moduli-descent-laplacian-profile.json),
and [src/moduli-descent-laplacian-profile.mjs](./src/moduli-descent-laplacian-profile.mjs)
define a declaration-level checker for this boundary.

The probe checks declarations for:

- meta-moduli descent through closure operators and closure-equivalence;
- settling-level and meta-level regime stratifications;
- Q-enriched/d-frame Laplacian cohomology route and theorem-scope boundaries;
- Verdier and six-functor scope separation;
- strong-MLD composed-duality orbit data;
- implementation downgrades.

It does not compute cohomology, prove descent, decide a rule-language fragment,
construct a bitopological settling site, prove Verdier duality, or validate
strong MLD for a live swarm.
