# @561-group/astrology-topology-experimental

The ephemeris recomputed as memetic settlement. The classical ephemeris
(`@561-group/astrology-topology`) maps an instant to each body's geocentric
ecliptic longitude by one theory. This package witnesses the same observable
through the workspace's memetic substrate: independent ephemeris theories
assert longitude claims, the bilattice charge algebra carries their
agreements and contradictions paraconsistently, settlement selects the value,
and event times settle as closure ordinals of monotone bracket refinement.

The conformance law is non-negotiable and tested: for every body over a
24-instant grid spanning 2025–2027, |experimental − classical| stays below
the classical ephemeris' own stated accuracy (`EPHEMERIS_PROVENANCE`:
Sun/Moon ≤ 0.02°, planets a few arcminutes, Jupiter ~0.11°, Saturn ~0.17°),
and settled event times stay within the classical event-time claims.

## Substrate

What the memetic substrate actually is, with exact names (read from
`lib/meme`, `lib/memetic-processing-unit`, `lib/memetic-topology`,
`lib/swarm`, `services/memetics`):

- **Meme** (`@561-group/meme`): `Meme = { cell: Cell, charge: Charge }` with
  `Cell = { subject, predicate, object }` (all `unknown`) and
  `Charge = { value: readonly [boolean, boolean], evidence: readonly [unknown[], unknown[]] }`.
  The two value bits are the positive and negative sides; the two evidence
  carriers are the witness lists for each side.
- **The value lattice**: Belnap's FOUR as a bilattice
  (`memetic-processing-unit/src/charge.mts`): `[F,F]` **absurd** (⊥, told
  neither), `[T,F]` **potential**, `[F,T]` **active**, `[T,T]` **stable**
  (⊤, told both). Two orders — knowledge (`joinKnowledge`, `meetKnowledge`,
  `leqKnowledge`) and truth (`joinTruth`, `meetTruth`) — with the Klein gauge
  `negate` (truth involution; witnesses ride to their new side) and
  `conflate` (knowledge involution). Evidence only ever **accumulates**
  (`union`: concatenate, dedupe structurally, never discard a witness).
- **Paraconsistency, concretely**: contradiction is the lattice point
  `stable` (⊤), reached by `joinKnowledge` of opposing testimony. It is a
  *value held in one cell's charge*, with both evidence sides populated —
  not an exception, and not a license to derive everything. Folds are
  cellwise, so a ⊤ cell cannot infect its neighbours: no explosion.
- **Witness / settlement** (`compose.mts`, `mpu.mts`): a `Witness` is a
  `[subject, predicate, object?]` tuple; `compose(witnesses)` drives each
  through the descent (`articulate → predicate → posit → settle`) and folds
  same-cell witnesses by knowledge-join into a glued `Sheaf` whose
  `section: Valuation` carries every cell's folded charge. The stateful
  `Mpu` (`articulate`, `witness`, `settle`, `section`, `chargeAt`) is the
  facade. Fixed-point reads: `brim` (knowledge GFP), `adjudicate` (truth
  LFP), `presume` (truth GFP); `knowledgeGap` lists underdetermined cells.
- **Transfinitely-valued, concretely** (`closure/`): constructive ordinal
  notations up to ε₀ (`Ordinal` = `zero | succ | limit(seq)`, `OMEGA`,
  `OMEGA_SQ`), transfinite iteration of a monotone operator over a
  `Lattice<T>` (`approx(L, φ, α)`: F(0)=⊥, F(α+1)=φ(F(α)), F(λ)=⋁F(β)),
  and `closureOrdinal(L, φ)` which finds the closure ordinal κ and its
  regime: `finite` (κ<ω), `scott` (κ=ω), `transfinite` (ω<κ<ω₁),
  `aperiodic` (no countable κ). `fromBilattice` shows the floor's `settle`
  is the finite-κ restriction of this general closure.
- **Linear-logic flavour**: the substrate's evidence carriers are lossless
  (no weakening of witnesses), and the wider workspace treats resources
  linearly (`typed-resource-catalog`, the swarm's append-only traces:
  `queryTrace`, `mergeTrace`, `readAsOf` folding trace cells by
  `joinKnowledge` into as-of snapshots with `heldTopCount` contradiction
  counts). `services/memetics` records trace datoms
  `[point, state, value, witness, charge]` and runs service loops to
  fixed-point snapshots.

## Design

Three candidate shapes were evaluated against what the substrate supports;
all three fit, and all three are used, each where it is honest:

1. **Theories as independent witnesses** (`theories.mts`,
   `settlement.mts`) — the load-bearing shape. A theory is
   `(body, instant) → longitude` plus an honest per-body tolerance (its own
   stated accuracy). Two theories ship: `ANCHOR_THEORY` ("meeus-standish",
   the classical reference witnessed through `bodyLongitude`, tolerances =
   `EPHEMERIS_PROVENANCE`'s accuracy) and `TRUNCATED_THEORY`
   ("truncated-frozen", an independent in-package recomputation: one-term
   solar centre, ten-term lunar series, frozen-J2000 Standish elements with
   first-order Kepler; no nutation, no E factor). Each claim's charge is the
   knowledge-join of every theory's testimony: self-affirmation
   (`potential(name)`), corroboration (compatible claim, joined positively),
   refutation (incompatible claim, joined through `negate`). Incompatibility
   means the circular distance exceeds the joint tolerance. Contradictory
   witnesses settle ⊤ and are *held*; settlement then selects the
   representative: `potential` claims first (narrowest tolerance), else the
   greatest evidence margin among the ⊤ claims. With honest tolerances the
   classical answer emerges as the settled charge — the anchor is
   corroborated and carries the narrowest tolerance. `settlementSheaf`
   additionally articulates the claims into an `Mpu` so they live as memes
   in a glued section.
2. **Series terms as linear resources** (`linear.mts`) — the truncated
   lunar series is evaluated through `linearSum`: each periodic term is a
   resource consumed exactly once (contraction throws, weakening throws).
3. **Event finding as monotone closure** (`closure-events.mts`) — a bracket
   `[low, high]` is partial knowledge of a crossing time; the bracket
   carrier ordered by reverse inclusion is a knowledge order (join =
   intersection); one bisection step is a monotone refinement morphism φ,
   the identity once within tolerance. Crossings are settled with the MPU's
   own `closureOrdinal`/`approx` transfinite-iteration machinery, and every
   settled ingress/station carries its closure ordinal κ (always in the
   finite regime here: κ ≈ log₂(width/tolerance), and the result *says* so
   rather than presuming it). This is CALM-flavoured: bracket knowledge only
   accumulates, so the crossing claim settles as a least fixed point.

## What is genuinely memetic, and what is a costume

Candidly:

- **Genuinely memetic**: the charge algebra is used as designed — claims
  carry four-valued charges, contradictions are held as ⊤ with lossless
  two-sided evidence, no explosion (tested), corroboration accumulates as
  positive evidence, and the per-cell fold is the substrate's
  `joinKnowledge`/`negate`/`potential`. The bracket closure genuinely runs
  through the MPU's ordinal-indexed `approx`/`closureOrdinal`, and the κ it
  reports is real information. The claims-as-memes sheaf goes through the
  real `Mpu`/`compose` descent.
- **Costume**: every number is still produced by classical floating-point
  celestial mechanics. The anchor witness *is* `astrology-topology`'s
  `bodyLongitude`; the precision of the settled value is inherited from it,
  not derived by the substrate — settlement here *selects*, it does not
  synthesize a better number. The selection rule (potential-first, then
  evidence margin, then tolerance) is this package's adjudication policy
  over the carried charges, not an MPU primitive. The linear-resource
  discipline proves the series evaluation is linear; the arithmetic inside
  is ordinary summation. Refutations are folded with the charge algebra
  directly rather than through `Mpu.articulate`, because the Mpu facade
  only admits affirming witnesses.
- **What would make it more memetic**: theories whose tolerances and
  weights are themselves settled charges (learned from JPL-fixture
  evidence); event brackets shared across a swarm trace (`readAsOf`) so
  settlement is distributed; intervals as the claim objects so settlement
  could *narrow* rather than select.

The mapping is faithful in one important sense: the classical ephemeris'
own provenance discipline ("every chart carries its accuracy claims") is
exactly a tolerance-carrying witness, which is why the witness shape fits
without distortion.

## Surface

- `settleBody(body, jdTt, theories?)` → `BodySettlement` (adjudicated
  claims with charges, the selected claim, contradictions held)
- `settledBodyLongitude`, `settledBodySpeed`, `computeSettledChart`
- `settlementSheaf(settlements)` → the claims as memes in a glued `Sheaf`
- `findSettledIngresses`, `findSettledStations`,
  `findSettledZeroCrossings`, `findSettledCircleCrossings`, `settleBracket`
  (all carrying closure ordinals)
- `ANCHOR_THEORY`, `TRUNCATED_THEORY`, `DEFAULT_THEORIES`,
  `CLASSICAL_ACCURACY_DEGREES`, `TRUNCATED_ACCURACY_DEGREES`
- `linearContext`, `linearSum`

## Install, check, and test

```sh
pnpm install --filter '@561-group/astrology-topology-experimental...'
pnpm run verify   # check + build + node:test conformance suite + boundary audit
```

The conformance suite compares against `@561-group/astrology-topology` over
24 instants (2025–2027) for all ten bodies, checks the truncated theory's
honesty against its own claimed tolerances, compares settled ingress and
station times with the classical event finder, and demonstrates two
contradictory theory-witnesses coexisting (⊤ held, both evidence sides
populated) while settlement still lands within the classical tolerance.
