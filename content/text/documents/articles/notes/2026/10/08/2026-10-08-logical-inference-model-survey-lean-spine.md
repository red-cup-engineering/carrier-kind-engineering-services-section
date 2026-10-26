---
title: "Logical inference model survey: Obsmetrologia statements a kernel must conform to"
description: "Complete findings of the lean-spine reader: Obsmetrologia statements a kernel must conform to."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - survey
  - lean-spine
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# round2 lean-spine: Obsmetrologia statements the predication-AI kernel must mirror

Root (call it `OBS`): `services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia`
Toolchain `leanprover/lean4:v4.31.0`, `autoImplicit=false`, dependency-free, "axiom law admits only Quot.sound". I read the files exactly; I did not build or run Lean (instructions: pretend no tests). All "proved" below = a theorem exists in the file, no claim that I checked it compiles.

HONESTY legend: PROVED = theorem/def exists in file. PROSE = only in a comment. SLOP = comment claims more than the code does.

---------------------------------------------------------------------------
## 0. Alphabet: Reading (FOUR) -- exact definitions (for JS golden vectors)

`OBS/Language/Positing/Reading.lean`, `Four.lean`:
- `abbrev Reading := Articulating.Corner` ; `pos`, `neg : Reading -> Bool` (Corner.toStatus); `ofSlots p n`.
- Names: `kBot` = Corner.absurd = (pos,neg)=(0,0) "told nothing"; `tTop` = Corner.potential = (1,0) "told true"; `tBot` = Corner.active = (0,1) "told false"; `kTop` = Corner.stable = (1,1) "told both / held contradiction".
- `joinK a b = ofSlots (a.pos||b.pos) (a.neg||b.neg)`; `negate a = ofSlots a.neg a.pos`; `conflate a = ofSlots (!a.neg) (!a.pos)`; `negConf a = ofSlots (!a.pos) (!a.neg)`.
- `leK a b : Bool = (!a.pos||b.pos) && (!a.neg||b.neg)`; `leT a b = (!a.pos||b.pos) && (!b.neg||a.neg)` (positive up, negative DOWN).
- Gauge `K4 = {id, neg, conf, negConf}` with `K4.act`, `K4.mul`.
- `Reading.Closure` (`Language/Settling.lean:65`): `op : Reading->Reading`, `infl : KLE a (op a)`, `mono`, `idem : op(op a)=op a`. `settle c seed := c.op seed`. `joinClosure k` (op a = joinK a k) and `liarClosure` (op a = joinK a (negate a)), `liar_step_fixed_iff : liarClosure.op a = a <-> a=kBot \/ a=kTop`, `liar_settle_ne_truth`.

### Golden tables I computed (python, from the twist-product formulas; adjunction brute-force confirmed over all 64 triples, fuse associative, unit kTop)
Twist product over `Two` (`Calculus/Logic/TwistProductResiduation.lean:89-94`):
`fuse <x,y> <z,v> = < x AND z , (x->v) AND (z->y) >`;  `imp <x,y> <z,v> = < (x->z) AND (v->y) , x AND v >`; unit `one = <1,1> = kTop`. (`->` on Two is `!a || b`.)
Order of columns: bot, t, f, top (= kBot, tTop, tBot, kTop).

fuse (`readingFuse`, "tensor"), row a, col b:
```
bot : f   bot f   bot
t   : bot t   f   t
f   : f   f   f   f
top : bot t   f   top
```
imp (`readingImp a b`, row a => col b):
```
bot : t   t   bot bot
t   : bot t   f   f
f   : t   t   t   t
top : bot t   f   top
```
par (`readingPar a b = negate(fuse(negate a)(negate b))`, `LinearLogicMix.lean:37`):
```
bot : t   t   bot bot
t   : t   t   t   t
f   : bot t   f   f
top : bot t   f   top
```
Note fuse(bot,bot)=f (NOT bot), fuse(bot,t)=bot: the tensor is not knowledge-monotone-looking; it is truth-order residuated. Mirror it as-is.
time/space (LightCone): bot (0,0); t (1,+1); f (1,-1); top (2,0). K4 sign table: id (1,1), neg (1,-1), conf (-1,1), negConf (-1,-1) on (centered-time sign, space sign), centered = time-1.
`readingMix_strict`: fuse t f = f but par t f = t. `readingMix: TLE (fuse a b) (par a b)` for all a b. `readingPar_eq_readingFuse_iff`: agree iff one side is top or sides equal and not bot (LinearLogicMix:64, statement continues past what I printed).

---------------------------------------------------------------------------
## 1. LightCone.lean (216 lines) -- PROVED, all by cases/decide

Namespace `Obsmetrologia.Reading`. Exact signatures:
- `def time (a) : Nat := a.pos.toNat + a.neg.toNat` ; `def space (a) : Int := a.pos.toNat - a.neg.toNat`.
- simp lemmas `time_kBot=0, time_tTop=1, time_tBot=1, time_kTop=2`; `space_kBot=0, space_tTop=1, space_tBot=-1, space_kTop=0`; `time_le_two`; `coords_injective (ht: time a = time b) (hx: space a = space b) : a=b`.
- `kle_iff_null a b : KLE a b <-> (a.pos=true -> b.pos=true) /\ (a.neg=true -> b.neg=true)`.
- `tle_iff_null a b : TLE a b <-> (a.pos=true -> b.pos=true) /\ (b.neg=true -> a.neg=true)`.
- `kle_iff_lightcone a b : KLE a b <-> (space b - space a <= time b - time a /\ space a - space b <= time b - time a)` (Int casts).
- `kle_time_mono : KLE a b -> time a <= time b`; `kBot_past_tip`, `kTop_future_tip`; `null_rays`.
- `tTop_tBot_spacelike : time tTop = time tBot /\ not KLE tTop tBot /\ not KLE tBot tTop /\ TLE tBot tTop`.
- Parity/time-reversal: `time_negate : time (negate a) = time a`; `space_negate : space (negate a) = - space a`; `time_conflate : time (conflate a) = 2 - time a`; `space_conflate : space(conflate a) = space a`; `time_negConf`, `space_negConf`.
- K4: `centered a := (time a:Int)-1`; `timeSign`, `spaceSign : K4 -> Int`; `act_centered g a : centered (K4.act g a) = timeSign g * centered a`; `act_space g a : space (K4.act g a) = spaceSign g * space a`; `signs_injective`; `timeSign_mul`, `spaceSign_mul`; `signs_table`.
- Chu: `chu_dual_time (C) (x:C.sts) (a:C.pts) : time ((ChuSpace.dual C).r x a) = time (C.r a x)`; `chu_dual_space ... = - space (C.r a x)`.
PROSE only: "{1,P,T,PT} is the component group of O(1,1)/O(3,1)"; "one diamond turned a quarter turn" (is just the (u,v)->(t,x) change of variables). The "light cone" is the 4-element poset FOUR drawn as a diamond; there is NO light cone of a token/span/corpus in Lean. The spine's "knowledge growth is proper time" = only `kle_time_mono` (time monotone along KLE) + FreeEnergyLyapunov `kHeight` (see 10).
SLOP/duplication: `Dynamics/Flow/FreeEnergyLyapunov.lean:95 kHeight` is exactly `time` (0,1,1,2) with its own `kHeight_mono`, `kHeight_lt_of_lt`. Two names for one function.

---------------------------------------------------------------------------
## 2. FregeanFourChu.lean (107 lines)
- `abbrev FregeanPredication := PredicationCell`.
- `def independentEvidenceReading (evidence : Bool x Bool) : Reading := Reading.ofSlots evidence.1 evidence.2`.
- `def valuationOfIndependentEvidence claim evidence : Valuation := Valuation.posit claim (independentEvidenceReading evidence) Valuation.knowledgeLeast`.
- `def predicationChu : ChuSpace where pts := FregeanPredication; sts := Valuation; r := fun claim valuation => valuation claim`. (`Valuation = PredicationCell -> Reading`.)
- `predicationChu_matrix` rfl; `predicationChu_reads_independent_evidence`.
- `structure FregeanPredicationForcesFourAndChu : Prop` with fields `evidence_roundtrip`, `reading_exhaustive`, `chu_carries_reading`; `theorem fregean_predication_forces_four_and_chu`.
Honest read: all three fields are bookkeeping about `Bool x Bool ~ Reading` and `rfl`-level evaluation. It does NOT prove "predication forces FOUR"; the doc itself says that claim lives in `Orbital.orbital_exhaustive` (and see section 7 for what that actually says). The Chu space here is the trivial "evaluation matrix" Cells x (Cells->FOUR). It is the correct object for the spine ("Cells x States -> FOUR") but states are ALL valuations (a full function space), not the corpus-derived contexts. Kernel conformance: a SignCell charge = `valuation claim`.

---------------------------------------------------------------------------
## 3. LinearLogicChu.lean (303 lines)
Structures (exact):
```
structure ChuSpace where pts : Type; sts : Type; r : pts -> sts -> Reading
def ChuSpace.dual (C) : ChuSpace := { pts := C.sts, sts := C.pts, r := fun x a => Reading.negate (C.r a x) }
structure ChuMap (C D : ChuSpace) where fwd : C.pts -> D.pts; bwd : D.sts -> C.sts
    adj : forall a y, D.r (fwd a) y = C.r a (bwd y)
ChuMap.id, ChuMap.comp f g (fwd := g.fwd o f.fwd ; bwd := f.bwd o g.bwd)
ChuMap.dualMap f : ChuMap (dual D) (dual C) := {fwd := f.bwd; bwd := f.fwd}
```
Theorems: `ChuSpace.dual_involution`/`Chu.dual_involution : dual (dual C) = C`; `dual_dual_r`; `ChuMap.dualMap_dualMap` (fwd,bwd agree, by rfl); `four_negate_involution`; `four_star_autonomous : (forall a b c, leT (fuse a b) c <-> leT a (imp b c)) /\ (forall x, negate(negate x)=x)`; `Order.TwistProduct.fourTensor_leT_iff`; `readingFuse a b := toReading (fuse (ofReading a) (ofReading b))`, `readingImp`; `readingFuse_tle_iff a b c : TLE (readingFuse a b) c <-> TLE a (readingImp b c)`; `diamond_adjoint_box k a b : TLE (readingFuse a k) b <-> TLE a (readingImp k b)`.
Critical honesty points:
1. "FOUR is *-autonomous" (`four_star_autonomous`) is only the residuation adjunction + negation involution on the 4-element alphabet. It is NOT shown that Chu(FOUR) (spaces) is *-autonomous: no tensor, hom or par on `ChuSpace`; `LinearLogicMix.lean` header says verbatim "The space-level question ... is not built here". No category laws for `ChuMap` are stated (id_comp, comp_assoc missing). Only comp/id defined.
2. The doc string says the dual is "transposing and negating". Standard Chu (Barr/Pratt) duality is transpose ONLY. The house dual composes transpose with the entrywise negation automorphism. Both are involutions; the house one is a different duality. Must be kept distinct in JS (`dual` vs `transpose`).
3. Adjointness is strict equality in FOUR (not an inequality): ChuMap is Barr's exact Chu morphism over the set FOUR, not a lax/residuated one. Translation fidelity "up to truth order" is not representable; only exact (see targets 11).
4. `ChuSpace.pts/sts : Type` (Lean types, no finiteness, no content addressing).
Kernel conformance (JS): ChuSpace as sparse matrix; `dual`; ChuMap check `D.r(f a, y) === C.r(a, g y)` for all a,y; compose f then g: fwd=g.fwd∘f.fwd, bwd=f.bwd∘g.bwd; `dualMap` swaps. Golden: dual∘dual = id; dualMap∘dualMap = same fwd/bwd.

Also in this area:
- `Language/Identification.lean` (123 lines): `ChuSpace.RowEq`, `ColEq`, `collapse C : ChuSpace` (pts := Quot RowEq, sts := Quot ColEq), `collapse_r_mk` (rfl), `collapse_separable`, `collapse_extensional`, `collapse_mk_eq_iff : Quot.mk RowEq a = Quot.mk RowEq a' <-> RowEq a a'`, `ChuMap.collapse f : ChuMap (collapse C) (collapse D)` (descends, adjointness by `f.adj`), `measuredChu k trace : ChuSpace` (pts := Token, sts := Claim x Token, r := (measure k trace <t,test.1,test.2>).value), `measure_factors_collapse`, `token_identified_iff`. This IS the biextensional collapse = clarification of a context: the machinery for "every identification costs a bit" exists as a quotient, with NO cost attached. `ChuMap.collapse` is not shown functorial (no collapse_id / collapse_comp).
- `Calculus/Logic/LinearLogicMix.lean`: `readingPar`, `readingPar_comm`, `readingPar_negate`, `readingMix`, `readingMix_strict`, `readingPar_eq_readingFuse_iff`.
- `AperiodicOrder/Tiling/StepN/SubstitutionMatrix.lean` + `PortGrowth.lean`: `padovanChu`, `padovanMatrix_is_chu_incidence (i j) : padovanMatrix i j = if (padovanChu.r i j).pos then 1 else 0` ; `portGrowth_telescopes`; `portGrowth_renorm_padovan : portGrowth padovanMatrix 3 i j = padovanMatrix i j + matId i j` (M^3 = M + I). The Chu content is only that a 0/1 matrix is viewed as the pos-lane; no negative lane.

---------------------------------------------------------------------------
## 4. FCALambekCircle.lean (241 lines) and what the closing edge lacks

Imports: `Calculus/Order/FormalConceptAnalysis` (393), `Calculus/Logic/LambekCalculus` (332), `Calculus/Order/ResiduatedLatticeStandalone` (237), `Language/Settling`.

### 4.1 Supporting definitions (exact)
FCA (`OBS/Calculus/Order/FormalConceptAnalysis.lean`), BOOLEAN ONLY:
- `abbrev ExtSet G := G -> Prop`, `IntSet M := M -> Prop`, `subA`, `subB`.
- `primeA I A := fun m => forall g, A g -> I g m`; `primeB I B := fun g => forall m, B m -> I g m`; `closeA I A := primeB I (primeA I A)`; `closeM`.
- `prime_adjunction`, `subA_closeA`, `closeA_mono`, `closeA_idem`, `primeA_closeA : primeA(closeA A) = primeA A`.
- `structure Concept G M I` (extent, intent, closed pair), `leC` (extent inclusion), `conceptCompleteLattice I : Order.CompleteLattice`, `structure ConceptLatticeData`, `conceptLatticeData I`. `implies`, `implies_iff_closeM` (attribute implications = closure).
- Header says verbatim: "Belohlavek (2004) generalizes ... That generalization is documented here in prose; the Boolean case L = 2 ... is what we prove." => NO many-valued / FOUR-valued FCA exists anywhere in Lean.
Lambek (`LambekCalculus.lean`):
```
structure LambekAlgebra extends Lattice where
  dot lres rres : carrier -> carrier -> carrier ; e : carrier
  dot_assoc ; dot_one_left ; dot_one_right
  dot_lres_adj : forall a b c, meet (dot a b) c = dot a b <-> meet b (lres a c) = b     -- a.b <= c  <=>  b <= a\c
  dot_rres_adj : forall a b c, meet (dot a b) c = dot a b <-> meet a (rres c b) = a     -- a.b <= c  <=>  a <= c/b
```
Derived: `dot_lres_le_iff`, `dot_rres_le_iff`, `modus_ponens_left : a . lres a c <= c`, `modus_ponens_right : rres c b . b <= c`, `dot_mono_left/right`, `lres_mono_right`, `lres_antitone_left`, `rres_mono_left`, `rres_antitone_right`, `one_le_lres/rres`, `lres_one : lres e a = a`, `rres_one`, `lambek_biresiduation` (6-conjunct bundle), `commutative_collapses_to_single_implication : (comm) -> (forall a c, lres a c = rres c a) /\ (a.b<=c <-> b <= lres a c)`, `Trivial` one-element algebra. Not complete lattice (only `Lattice`: meet/join binary). No sequent calculus.
ResiduatedLattice (`ResiduatedLatticeStandalone.lean:49`): extends BoundedLattice with `fuse imp one`, `fuse_comm`, `fuse_assoc`, `fuse_one`, `fuse_imp_adj`, and **`one_eq_top` (integral)**. Derived `fuse_mono_left/right`, `bond_counit`, `bond_unit`, `bond_saturates_iff`, `bonds_compose`.

### 4.2 The circle, as proved (FCALambekCircle)
- `fcaClosureOp I : FCA.ClosureOp G` (op := closeA I; ext/mono/idem from FCA). `fca_closure_laws`. Edge (1) claim "FCA closure = settling closure": what is proved is that `closeA` satisfies extensive+monotone+idempotent ON POWERSETS. `Settling.Reading.Closure` acts on a 4-point Reading, a different carrier. The "identity" is that both are instances of "closure operator"; no map relates them (SLOP: "is the settling closure" is overstated; a FCA closure is a nucleus on P(G), Settling closure is a closure on FOUR).
- `conceptLatticeData`, `concept_lattice_is_complete` (4 bullet statements about sInf/sSup). Edge (2).
- `lambekOfResiduated (R : Order.ResiduatedLattice) : Lambek.LambekAlgebra` (dot := fuse; lres a c := imp a c; rres c b := imp b c; e := top, via `one_eq_top`). `lambekOfResiduated_comm`, `residuated_lattice_is_commutative_lambek`. Edge (3).
- `TwoLambek := lambekOfResiduated Order.Two`, `TwoLambek_comm`.
- `structure CircleData G M I R where fcaClosure : FCA.ClosureOp G ; conceptLattice : FCA.ConceptLatticeData G M I ; lambek : Lambek.LambekAlgebra` and `the_circle I R : CircleData G M I R`.

### 4.3 Precisely what the "documented-boundary" closing edge lacks
(The literal string `documented-boundary` does not occur anywhere in OBS (grep -rn found nothing); the "closing edge" is the header bullet "The closing edge (model-theoretic, documented not formalized)" and the closing note before `CircleData`.) The edge is Wurm (2012) + Belohlavek: "syntactic concept lattices give complete semantics for Lambek; in the many-valued setting the concept lattice of (2) carries the residuated/Lambek structure of (3)". Missing, in order of dependency:

M1. **The circle is not a circle.** `CircleData` has three INDEPENDENT fields; `lambek := lambekOfResiduated R` for an arbitrary unrelated integral commutative `R`, and nothing relates `R`, `I`, the concept lattice and the closure. No theorem mentions both `FCA.Concept` and `Lambek.LambekAlgebra`. Edge (3)->(2) is the thing that is not there.
M2. **No product on concepts.** `ConceptLatticeData` carries only an `Order.CompleteLattice`. There is no `dot`, `lres`, `rres` on `FCA.Concept G M I`, hence no `LambekAlgebra` whose carrier is concepts. Not even for any monoid-indexed context.
M3. **No syntactic context.** No monoid/strings (`List Sigma`), no contexts `(l,r)`, no incidence `I w (l,r) := l ++ w ++ r in L`, no language `L`. The word "syntactic" appears in OBS only in LambekCalculus/FCALambekCircle (prose) and Closure files unrelated (OrdinalCore, RuleSystem).
M4. **No Lambek logic.** No formula type `Tp` (atoms, `\`, `/`, `.`), no sequent/derivability `Gamma |- A`, no cut / cut-admissibility, no interpretation `[[.]] : Tp -> A.carrier` into a `LambekAlgebra`, hence no SOUNDNESS theorem (easy direction), no free algebra/Lindenbaum, no COMPLETENESS (Wurm/Buszkowski). `LambekAlgebra` is only an algebraic structure; the "Lambek calculus" of the file name is not a calculus.
M5. **No Pentus / CFG**: Lambek grammars generate exactly the context-free languages is PROSE only; no grammar, no derivation of a string, no language generated.
M6. **No many-valued (Belohlavek/FOUR) FCA.** Derivations are `Prop`-valued; the residuated-lattice parameter L never enters FCA. So "in the many-valued setting the concept lattice carries the residuated structure" has no definition behind it.
M7. **Wrong algebra for FOUR.** The only bridge from a ResiduatedLattice to Lambek is `lambekOfResiduated`, which needs `one_eq_top` (integral) and commutativity. FOUR's fusion (twist product) is NON-integral: the monoid unit is `<1,1> = kTop`, but the truth-top is `<1,0> = tTop` (`TwistProductResiduation` header says so; my table confirms: fuse t kTop = t != kTop... fuse(t,top)=t, and fuse(t,f)=f so t is not a unit). Therefore `TwoLambek` is the 2-element Boolean algebra (`Order.Two`), NOT FOUR; the docstring "(the FOUR/Two fragment)" and "FOUR base sits inside" are overreach. There is NO `LambekAlgebra` on `Reading` anywhere, and the twist construction is not stated as an `Order.ResiduatedLattice` (it cannot be: integral).
M8. **Closing the loop to closure (1).** Needs: the concept-lattice product is `(A.B)''` i.e. FCA closure (edge 1) applied to the pointwise product -- the link of edge (1) to edge (3) -- also absent.
M9. **Commutative collapse only.** Everything bridging to FOUR is commutative; the syntactic lattice is intrinsically non-commutative (concatenation), so the FOUR alphabet alone can never supply the order structure; it must supply the VALUE lattice of an L-valued incidence, with non-commutativity coming from the monoid of strings.

### 4.4 Other "CHL" (CurryHowardLambek.lean, 948 lines) is NOT the Lambek calculus
`OBS/Language/Predicating/CurryHowardLambek.lean`: `Ty = base | arrow | prod | unit`, `Tm` de Bruijn STLC, `HasTy`, `step`, `Red`, `Par`, `dev`, `par_triangle`, `par_diamond`, `par_confluent`, `church_rosser : Red t u -> Red t v -> exists w, Red u w /\ Red v w`; `propOfTy v phi : Ty -> Prop` with base case `Reading.pos (v phi) = true`; `curry_howard : pos(v phi)=true -> forall A, propOfTy v phi A`; `curryFn/uncurryFn`, `ccc_exponential_adjunction` (both round trips are `rfl`: it is Lean's own currying on Props, not the term calculus); `structure CurryHowardLambek` (5 fields), `theorem curry_howard_lambek`; `TypeFormer = terminal|product|exponential|dual`, `chl_quartet_is_nuclear` (a bijection of 4 names with the 4 corners -- numerology, `card_eq_four : all.length = 4 := rfl`).
Honest: (a) "Lambek" here = Lambek-Scott CCC, a structural (contraction/weakening/exchange-allowed) intuitionistic STLC, unrelated to the non-commutative Lambek syntactic calculus of LambekCalculus.lean; no file connects them. (b) `curry_howard` is vacuous: with `pos = true` ALL non-base types are trivially inhabited; no typing derivation `HasTy` is connected to `propOfTy` (no soundness `HasTy [] t A -> propOfTy v phi A`). (c) The CCC claim is never about `Tm` modulo beta/eta as a category. For the spine "sentence = Lambek derivation = proof term" a NEW non-commutative linear lambda calculus (Lambek-van Benthem) is needed (targets T4-T6).

---------------------------------------------------------------------------
## 5. Settling/Cones.lean (119 lines) -- "cones" here are NOT light cones
- `abbrev CValuation := PredicationCell -> Valued` (value + evidence lists).
- `CValuation.value`, `settle c v phi := Reading.settle c (v phi).value` ("unit cone"), `brim c v phi := Reading.settle c (Valued.presumeFree (v phi)).value` ("counit cone").
- `settle_le_brim : KLE (settle c v phi) (brim c v phi)`; `Void c v phi := settle != brim`; `void_iff`; `not_void_of_full (h1: (v phi).evidence.1 != []) (h2 : ... .2 != []) : not Void`; `oneSided_void`; `cancelled_not_void`.
- Monograph reading in comment: void = space, apex = time. The pointwise cones are the interval [least forced, most allowed] of a cell's reading; the void = under-determinedness (a one-sided cell). This is the "ignorance gap" of a cell, a good ready-made notion for generation: the lawful continuations of a cell are exactly [settle, brim]. Naming collision with LightCone.lean: "cone" here = unit/counit settlement, there = causal diamond. Keep separate names in JS (`settleCone`, `brimCone` vs `causalDiamond`).
- Valued: evidence lists carry witness tokens (`Slot = List Token`), presumeFree puts a witness-free side to present.

---------------------------------------------------------------------------
## 6. Predicating/Oriented.lean (140) and Cell.lean (96)
Cell (`OBS/Language/Predicating/Cell.lean`): `abbrev Entity := Token`, `Predicate := Claim`; `structure PredicationCell where subject : Entity; predicate : Predicate; object : Entity` (deriving DecidableEq, Repr). `seed u = <u.token,u.claim,u.token>`; `predicating (c : Articulating.PotentialCell) := seed c.utterance`; morphism generators `converse phi = <o,p,s>`, `subjProj = <s,p,s>`, `objProj = <o,p,o>`, `specialize f phi = <s, f p, o>`. Laws: `converse_converse` rfl, `converse_seed`, `converse_ne (h : s != o)`, `subjProj_idem`, `objProj_idem`, `specialize_comp`, `specialize_id`. The header claims "generates a category (the predication category)" but NO category structure is defined (no Hom, comp, assoc); only these endomaps. SLOP-ish: "generative home of category theory".
Oriented (`Language/Predicating/Oriented.lean`): `orientedCell : Articulating -> PredicationCell | utter u => <u.token,u.claim,u.token> | pair u a => <u.token,u.claim,a.head.token>`; `orientedCell_pair_eq_composeSeeds`; `orientedCell_mem_cellsOf`; `orientation_generated`; `orientedCell_reflexive_iff`; `converse_orientedCell_pair : converse (orientedCell (pair u a)) = orientedCell (pair <a.head.token, u.claim> (utter u))`; `subjProj_orientedCell`; `objProj_orientedCell_pair`; `tokenEdge`, `tokenEdge_pair`, `tokenEdge_pair_pair : tokenEdge (pair u (pair v a)) = tokenEdge (pair u (pair v b))` (an edge reads only head and the next head). Summary: the cell generated by an articulation (list of utterances `(token, claim)`) is a binary-adjacency cell: subject = token of the head, predicate = head's claim, object = token of the next utterance. So a text (sequence) generates predication cells between ADJACENT tokens only, claim = the left token's claim. This is a "bigram" generator: head claim carried over. For a corpus kernel: cell stream from a token sequence = sliding window of width 2 (`tokenEdge`) -- a bead row neighbour pair. Note comment: "the shape a causal set has".

---------------------------------------------------------------------------
## 7. Predicating/Orbital.lean (550 lines)
- `Orbital.Perm E` (toFun, invFun, left, right), `mapPair`, `Perm.id/comp/inv`, `Equivariant (f : E x E -> E x E) := forall sigma p, f (sigma.mapPair p) = sigma.mapPair (f p)`.
- `swap a b`, `swap_left/right/fix`, `transport_exists (hab : a!=b) (hso : s!=o) : exists sigma, sigma a = s /\ sigma b = o` (via at most two swaps).
- `diagonal_fixed (three)`, `offdiag_contained (four)`, `offdiag_four`.
- **`orbital_exhaustive (four : exists a b c d : E, pairwise distinct) (f) (hf : Equivariant f) : (forall p, f p = p) \/ (forall p, f p = (p.2,p.1)) \/ (forall p, f p = (p.1,p.1)) \/ (forall p, f p = (p.2,p.2))`.**
- `id_equivariant`, `converse_equivariant`, `subjProj_equivariant`, `objProj_equivariant`.
- `ThreeSample` (3 elements) with `third`, `third_spec`, `third_unique`, `thirdMap`, `thirdMap_equivariant`, `thirdMap_not_orbital`: at exactly 3 entities a FIFTH equivariant map exists (send every off-diagonal pair to the doubled excluded third). So the threshold is 4, not 3 (module docstring is honest about correcting the task).
Honest read: this proves "equivariant self-maps of E x E are the 2^2 = 4 coordinate selections" when |E|>=4. It does NOT prove "predication forces FOUR (the bilattice)". The coincidence 4 = 2^2 (coordinate selections of a pair) = |FOUR| = |Bool x Bool| is numerology; FOUR as evidence lanes is forced by a different (modelling) argument (two independent acts), not by this theorem. The docstring of FregeanFourChu cites this as the forcing result; flag.
Kernel hook: the four generators on the cell (converse, subjProj, objProj, id) are the reindexings -- exactly the three curryings/projections of a triadic context; extension to triples is target T17.

---------------------------------------------------------------------------
## 8. AperiodicOrder/Tiling/J26.lean (252) -- NOT Wang tiles
`Obsmetrologia.AperiodicOrder.J26`: combinatorial boundary of the Johnson solid J26 (gyrobifastigium) as two triangular prisms glued along a square after a one-step rotation.
- `inductive Vertex = q0|q1|q2|q3|a|b|c|d`; `Edge` (14: q0q1,q1q2,q2q3,q3q0,q1a,ab,bq2,aq0,bq3,q2c,cd,dq3,cq1,dq0); `Face` (8: leftTop,leftBottom,leftSide0,leftSide1,rightTop,rightBottom,rightSide0,rightSide1).
- `vertices/edges/faces : List`, `edgeEnds : Edge -> Vertex x Vertex`, `faceVertices`, `faceEdges`.
- `leftSharedCycle = [q0,q1,q2,q3]`, `rightSharedCycle = [q1,q2,q3,q0]`; `shared_cycle_is_quarter_turned : rightSharedCycle = leftSharedCycle.drop 1 ++ [.q0]` := rfl.
- `exterior_faces_come_from_prisms : leftPrismBoundary.take 4 ++ rightPrismBoundary.take 4 = faces.map faceVertices` := rfl.
- `every_face_boundary_is_valid (face) : boundaryValid face = true`; `combinatorial_counts : vertices.length=8 /\ edges.length=14 /\ faces.length=8`; `vertices_nodup`, `edges_nodup`, `faces_nodup`; `exterior_face_arities : faces.map (length . faceVertices) = [3,3,4,4,3,3,4,4]`.
- `inductive Cell = vertex|edge|face|volume`, `cellDim`, `cellFaceBool`, `cellFace`, `face_dim_drop : cellFace lower upper -> cellDim lower < cellDim upper`, `cellComplex : CellComplex.CellComplex`.
Honest: a finite checked combinatorial object (V-E+F = 8-14+8 = 2 not stated as a theorem; the closed 3-cell is added as `volume`). It has nothing to do with tile colouring, weaving, Wang tiles, the "quarter turn" is purely the list rotation. It is the "one quarter-turn glue" cell model of a gyrobifastigium; it is relevant to the spine ONLY as a worked CellComplex instance that the H1 machinery could eat. No Euler characteristic theorem, no homology computation of `cellComplex` in this file.

Tile / Wang / bead / weave in Lean (grep):
- Wang: only `AperiodicOrder/Tiling/Witness/JeandelRao*.lean` and `StepN/MetallicMean.lean`. `JeandelRaoDecidableCore.lean`: `structure JeandelRaoAperiodicObject {tileCount : Nat; decorated : Edge -> Int; markerCore : QEdge -> Int}`; `jeandelRao11Object` with `tileCount := 11`. **The 11 Wang tiles are never defined** (no tile colours, no matching rule, no tiling). The witnesses are two one-vertex Anderson-Putnam cochain complexes `jrComplex` (6 edges, 3 faces) with cochain `phi` and `markerRingComplex` (7 edges, 4 faces, H1 rank 5 per the docstring) with `b3`, `q0Loop`; data transcribed by hand from JSON certificates (`jeandel_rao_marker_01_decorated_certificate_v20.json`, `..._v13.json`), `OneVertexComplex.delta1`, `IsCocycle`, `NonzeroH1Class phi := IsCocycle phi /\ exists e, phi e != 0` (valid since delta0 = 0), theorems `phi_closed`, `phi_nonzero`, `jeandelRaoMarker01_nonzero_h1_class`, `markerRing_b3_nonzero_h1_class`, `b3_ne_q0Loop`, `jeandelRao11_certificate`, substitution tower persistence in `JeandelRaoPersistence.lean/JeandelRaoSubstitution*.lean` (`subPull b3 = phi`). SLOP flag: "Jeandel-Rao 11 tiles" is a Nat literal + transcribed numbers; aperiodicity is not proved; only "nonzero H1 class on these finite complexes".
- bead: `AperiodicOrder/Tiling/PortGraph.lean` (128): `Port B := B x Bool`, `ThreadPass B := B x Bool x Bool` (the (s,p,o) shape), `Thread B := List (ThreadPass B)`, `holeTransition : Graph Bool := fun a b => a != b`, `Legal`, `legal_iff_distinct : Legal (b,i,j) <-> i != j`, `ThreadLegal`, `condensate : Nat -> Reading` (0->kBot, 1->tTop, >=2->kTop), `empty_consistent`, `single_consistent`, `over_occupation_inconsistency (n) : (condensate (n+2)).isInconsistency = true`, `mirror_fixes_empty`, `mirror_fixes_condensate_pole`, `mirror_fixes_condensate`. So a bead = a lenticule with in/out port, a pass thread is a walk; occupation count n gives a Reading. "Weave crossing" `warpAlt` and `overUnder_swap_is_negate` live in OTHER libs (`obsmetrologia-fibercraft/.../LenticleCrossing.lean`, `ObsmetrologiaFibercraft.lean`; `WeaveDraft` is referenced by `Language/Positing/LocalMldClassification.lean` but is NOT in the core lib). `AperiodicOrder/Tiling/LenticleIdentification.lean` mentions weave-crossing readings.
- Tile colouring: `Calculus/Order/ColoringEntropy.lean`: `edge_colouring_entropy : logNat 2 properEdgeColourings.length _ _ = RReal.ofRat 1` (a proper 2-colouring of an edge costs 1 bit = full shift entropy); `triangleColourings` (27 colourings). `Calculus/Order/GraphColoring.lean`, `Dynamics/Flow/ChromaticK4Analytic.lean`, `ChromaticTileCubicGap.lean`, `ChromaticTileRayleigh.lean`, `Tiling/FiniteLocalRule.lean` (grep hits; not read). No theorem identifies a tile colour with a concept/type.
- Light cone / causal: `Language/Spine.lean`, `Language/Positing/Measure.lean`, `Value/PreCategory.lean`, `Settlement.lean` mention causal; `Dynamics/Flow/FreeEnergyLyapunov.lean` mentions cone. No causal set, no causal order on tokens/events in Lean.

---------------------------------------------------------------------------
## 9. Cohomology/LandauerEntropy.lean (72 lines) -- a rename, not physics
```
def landauerBits (N : CoverNerve) : Nat := N.H1rank
theorem landauer_zero_iff_reversible (N) : landauerBits N = 0 <-> N.entities = N.cells + N.components := CoverNerve.h1_vanishes_iff_forest N
theorem landauer_eq_coordination_cost (N) : landauerBits N = N.cells - (N.entities - N.components)
theorem reversible_is_landauer_free {S V} (K : MarkovKernel S V) (pi) (hrev : forall z o, V.mul (pi z) (K.P z o) = V.mul (pi o) (K.P o z)) (hrow : forall o, K.sum (fun z => K.P o z) = V.one) : IsStationary K pi
```
(`CoverNerve` in `Cohomology/CoordinationCohomology.lean:270`: fields `entities cells components : Nat` with `components_le_entities`, `entities_le_cells_add_components`; `H1rank N := (cells + components) - entities`; `H0rank`; `h1_vanishes_iff_forest`; `h1rank_is_coordination_cost`; `tree_coordination_free`; `CoverNerve.ofIndexedCoverIncidence`.)
Honest: `landauerBits` is DEFINED to be the cycle rank; "each independent cycle is one erased bit (kT ln 2)" is PROSE. There is no entropy, no erasure map, no merge operation, no inequality "erasure >= bits". The detailed-balance theorem is an existing Markov lemma re-exported. The kT ln 2 scaling is attributed to `edge_colouring_entropy` (1 bit per colour choice). The spine's "every identification costs a Landauer bit" has NO formal counterpart: `ChuSpace.collapse` (identification) and `landauerBits` (cycle rank) are unconnected. Also `CoverNerve` is three Nats with inequality axioms: counts-only, not a graph (graph-backed version only for `Discrete.FinTree`).

Neighbours relevant to EROEI/metabolism (exist!): `Dynamics/Flow/FreeEnergyLyapunov.lean`: `kHeight`, `deficit cells v w = sum_{phi in cells} (kHeight (w phi) - kHeight (v phi))`, `deficit_antitone`, `deficit_strict_of_fires`, `deficit_eq_zero_iff`, `equilibrium_of_deficit_zero`, `fenOrbit_le_succ`, `fenOrbit_monotone`, `freeEnergy_antitone`, `freeEnergy_strict_of_fires`, `converges_in_bounded_steps`, `firing_steps_bounded`, `kappa_bounded_by_initial_free_energy`, `closureAtZeroTemp_is_hard`, `energy_gives_unique_equilibrium (r : ClosureRegime)`, `free_energy_is_lyapunov`. => settling is an H-theorem on a Nat free energy = total missing knowledge height; this is the right notion for "settlement work" in EROEI's denominator and for Gibbs/DeltaF in generation (T=0 hard limit only).
"Distal bypass": the Lean `Cohomology/DifferentialBypass.lean` ("differential bypass") is a DIFFERENT thing from the spine's "distal bypass (dropped stitch vs fault line)": it is `MuNuAgreement M E`, `MuNuDifferential`, `DifferentialBypass` certificate = closure-algebra fixed point + kappa-regime alignment; `differential_bypass_sound`, `differential_bypass_h1_vanishes`, `mu_nu_differential_no_bypass`. No dropped-stitch/fault-line theorem exists in Lean. No lean support at all for foam, Plateau, EROEI, vitrimer, metabolism (grep: only Cohomology.lean, ScottFace, BlowupClassification, CollatzTwoAdicLock hit on loose words).

---------------------------------------------------------------------------
## 10. Other grep inventory ('Lambek','Chu','residuat','syntactic','concept','cone','weave','bead','tile','Wang')
- Lambek: LinearLogicChu, FiringSpiral (`Dynamics/Flow`), CurryHowardLambek, Predicating.lean, NormalOrder, Logic.lean, LambekCalculus, FCALambekCircle.
- Chu: Identification, Predicating, HatMetatile (Tiling/Witness), Logic.lean, LinearLogicChu, PortGrowth, CurryHowardLambek, NormalOrder, LightCone, FregeanFourChu, LinearLogicMix, SubstitutionMatrix, Odometer (Closure), TwistProductResiduation.
- residuat: Value/Category, Order.lean, FCALambekCircle, Logic, LambekCalculus, Reading, Record, LinearLogicChu, Fibration (`Language/Predicating/Fibration.lean`: "bilattice-residuated homomorphism" `f* v = v o f`, reindexing on Valuation), InverseHull, FormalConceptAnalysis, OrderInfra, CompleteNucleus (+`Language/Positing/NucleusAndCommutingNuclei.lean`), SettlementSpiral, PairwiseStoneClopen, FreeEnergyLyapunov, Interfaces, Real/Multiplication, TwistProductResiduation.
- concept (FCA): `Site/Topic.lean` (claim/term incidence `C.incidence`; `FCA.conceptOfExtent C.incidence A`; Topic = concept localized at a claim site point with explicit support cover; `coverRestriction_overlap_concepts_agree`) and `Site/Intension.lean`. => a Boolean claim x term context + concept per site point already exists: the closest thing to the SignCell corpus context, with sheaf gluing of concepts across overlaps. Worth reading for the kernel (I did not read it in detail).
- weave/bead: see sec 8. tile/Wang: sec 8.

---------------------------------------------------------------------------
## 11. What a predication-AI kernel must conform to (checklist for JS golden vectors)
1. Reading algebra: pos/neg slots, negate/conflate/negConf, leK/leT, joinK, time/space, tables fuse/imp/par above (all 16 entries each), `readingFuse_tle_iff` (all 64 triples), `diamond_adjoint_box`, `readingMix`, `readingMix_strict`.
2. K4 sign table; `act_centered`, `act_space`; negate: time fixed, space flips; conflate: time -> 2-time, space fixed.
3. ChuSpace/dual/ChuMap/compose/dualMap exactly as above. Adjointness strict equality. dual includes negation.
4. Collapse: RowEq/ColEq quotient; matrix descends; ChuMap descends.
5. Cell shape (subject,predicate,object), converse/subjProj/objProj/specialize; orientedCell from an articulation list (head token, head claim, next head token); tokenEdge.
6. Settling: Closure laws, joinClosure/liarClosure behaviour; settle vs brim cones and Void; deficit via kHeight (= time).
7. FCA Boolean: primeA/primeB/closeA, concept = closed pair, leC by extent inclusion, implications = closeM.
8. Lambek algebra axioms (bi-residuation, modus ponens, monotonicity) as property tests on any candidate (string-language syntactic lattice, FOUR twist).
9. Nerve: H1rank = cells + components - entities (truncated Nat subtraction!), forest iff 0.

---------------------------------------------------------------------------
## 12. New Lean theorem targets (statements)

Notation: `Sigma` finite alphabet, `Str := List Sigma`, `Ctx := Str x Str`. Statements are in Lean-ish pseudocode; the ones marked [BF] I have already brute-force checked (python) at small size; [CHK] = check by finite brute force in JS before spending Lean time; [HARD] = research-grade.

T1. FOUR is a (non-integral, commutative) Lambek algebra  [easy, closes M7]
```
def fourLambek : Lambek.LambekAlgebra  -- carrier Reading, order <=_T (truth lattice: meetT, joinT)
  dot := readingFuse; lres a c := readingImp a c; rres c b := readingImp b c; e := Reading.kTop
theorem fourLambek_comm : forall a b, fourLambek.dot a b = fourLambek.dot b a
theorem fourLambek_nonintegral : fourLambek.e != (truth top = Reading.tTop)
theorem lambekOfResiduated_not_applicable_to_four : not (exists R : Order.ResiduatedLattice, R.carrier = Reading /\ R.fuse = readingFuse)   -- because one_eq_top fails
```
Data: unit check fuse(top,a)=a for all 4 (table above, [BF]), assoc [BF], adjunction [BF].

T2. Chu(FOUR) is a category and dual is a contravariant involutive functor
```
theorem ChuMap.id_comp (f : ChuMap C D) : (ChuMap.comp (ChuMap.id C) f).fwd = f.fwd /\ (...).bwd = f.bwd
theorem ChuMap.comp_id ; theorem ChuMap.comp_assoc (f g h)
theorem dualMap_id : (dualMap (ChuMap.id C)).fwd = id /\ ...bwd = id
theorem dualMap_comp (f g) : dualMap (comp f g) = comp (dualMap g) (dualMap f)   -- on fwd, bwd
theorem collapse_id, collapse_comp   -- Identification's collapse is a functor
```
(All rfl-level; currently missing, so "Chu(FOUR) is *-autonomous" has no category under it.)

T3. Space-level tensor, hom, par (the missing LinearLogicMix remainder)
```
def ChuSpace.tensor (A B) : ChuSpace := { pts := A.pts x B.pts
   sts := { fg : (A.pts -> B.sts) x (B.pts -> A.sts) // forall a b, B.r b (fg.1 a) = A.r a (fg.2 b) }   -- Pratt/Barr
   r := fun (a,b) fg => A.r a (fg.2 b) }
def ChuSpace.par A B := dual (tensor (dual A) (dual B)) ; def ChuSpace.hom A B := par (dual A) B
theorem tensor_hom_adjunction : ChuMap (tensor A B) C ~ ChuMap A (hom B C)   -- natural bijection on (fwd,bwd)
theorem tensor_assoc, tensor_comm, tensor_unit (unit space I = <Unit, Reading-pts?>) 
theorem space_mix : exists m : ChuMap (tensor A B) (par A B), m.fwd = id-like  -- lifts readingMix? [CHK]
```
Caution (point 2 in sec 3): house `dual` = transpose + negate; Barr's *-autonomy is for transpose. Determine whether `negEntries : ChuSpace -> ChuSpace` is an automorphism commuting with tensor [CHK], then *-autonomy transfers.

T4. Lambek sequent calculus as syntax + soundness in every LambekAlgebra  [closes M4 soundness]
```
inductive Tp (At) | atom : At -> Tp | ldiv : Tp -> Tp -> Tp | rdiv : Tp -> Tp -> Tp | prod : Tp -> Tp -> Tp
inductive Derives : List Tp -> Tp -> Prop   -- Lambek (1958) with nonempty antecedent, rules: ax, \L, \R, /L, /R, .L, .R, cut
def interp (A : LambekAlgebra) (v : At -> A.carrier) : Tp -> A.carrier   -- dot, lres, rres
theorem derives_sound (A) (v) : Derives G B -> A.le (foldDot (G.map (interp A v))) (interp A v B)
theorem cut_admissible : Derives G A -> Derives (D1 ++ [A] ++ D2) C -> Derives (D1 ++ G ++ D2) C
```
T5. Syntactic concept lattice is a Lambek algebra (Boolean case; Clark/Wurm)  [closes M2,M3,M8]
```
def synCtx (L : Set Str) : Str -> Ctx -> Prop := fun w (l,r) => l ++ w ++ r in L
def synLattice L := FCA.conceptCompleteLattice (synCtx L)         -- concepts over (Str, Ctx)
def synDot (A B : Concept Str Ctx (synCtx L)) : Concept := conceptOfExtent _ {w | exists x in A.ext, y in B.ext, w = x ++ y}   -- closure of the product, i.e. (A.B)''
def synLres A C := conceptOfExtent _ {y | forall x in A.ext, x ++ y in C.ext}   -- A \ C   (already closed)
def synRres C B := conceptOfExtent _ {x | forall y in B.ext, x ++ y in C.ext}  -- C / B
def synE := conceptOfExtent _ {[]}
def synLambek (L) : Lambek.LambekAlgebra   -- carrier = Concept Str Ctx (synCtx L), with the 4 axioms
theorem syn_biresiduation : synDot A B <= C <-> B <= synLres A C <-> A <= synRres C B
theorem syn_noncommutative : (exists L A B, synDot A B != synDot B A)   -- e.g. L={ab}
theorem syn_dot_assoc, syn_unit
```
Key lemma to prove first: closure is a quasi-homomorphism `closeA (X.Y) = closeA (closeA X . closeA Y)`.
T6. Completeness (Buszkowski/Pentus/Wurm)  [HARD, closes the 'closing edge']
```
theorem lambek_complete_powerset (G A) : (forall Sigma-valuations v, A_pow.le (prod G) (interp v A) in P(Str+)) -> Derives G A    -- Buszkowski 1982, via canonical Lindenbaum model, needs cut_admissible
theorem lambek_complete_syn : (forall L v, synLambek.le (prod ...) ...) -> Derives G A  -- Wurm 2012: every P(Str)-model embeds into a syntactic concept lattice
```
Split into T6a (power-set models via Lindenbaum, needs T4's cut) and T6b (embedding of P(Str) models into a syntactic concept lattice: the map X |-> closure under the context set it generates is an injective residuated-lattice homomorphism after choosing L = union of the language the formulas denote).
T7. Parse-chart soundness for AB-grammars (and bead-locality)  [closes the weave claim]
```
structure Lex (At) := (lex : Sigma -> Set (Tp At))
def chart (g : Lex) (w : Array Sigma) : Nat -> Nat -> Set (Tp At)   -- (i,j) span
  chart i i := g.lex w[i] ;  chart i j := {A | exists k in [i,j), B, (A/B in chart i k /\ B in chart (k+1) j) \/ (B in chart i k /\ B\A in chart (k+1) j)}
theorem chart_sound : A in chart i j -> Derives (w[i..j].map ...) A   -- uses T4
theorem chart_cone_locality (i j) : chart i j depends only on chart on {(a,b) | i<=a<=b<=j}   -- span = past light cone (by definition of recursion; formalize as: two charts agreeing on the sub-triangle agree at (i,j))
theorem chart_complete_ab : Derives-by-AB-rules-only -> in chart      -- AB grammar completeness (CYK correctness)
```
T8. Valiant form: charts are a least fixed point of an upper-triangular matrix over a semiring, and FOUR-valued charts are the same with `readingFuse`/join
```
theorem chart_eq_lfp : chart = lfp (fun C => G + C . C)        -- C = G + C.C over semiring (Set Tp, union, pointwise rdiv-lres 'application')
def chartFour (g : Sigma -> Tp -> Reading) : ...                 -- value of type A on span = join_k (A/B at (i,k)) (x)_{tensor} (B at (k+1,j)) etc. (join in <=_K so contradictions accumulate)
theorem chartFour_boolean_restriction : restricting to {bot,t} recovers chart (soundness of embedding Two -> FOUR)
```
Honest note for the spine: a CYK chart is NOT a Wang tiling (the split point k is existentially summed, not local). A single derivation IS a local tiling if the split is part of the colour, or a shift-reduce run (row t+1 from row t by a local rewrite), whose row-to-row relation is a transducer. So "chart = union over tilings = semiring matrix closure".
T9. Wang tile set as a transducer; strip-tiling = relation power  (tile layers)
```
structure WangTile (C) := (n e s w : C)
def tileRel (T : List (WangTile C)) : C -> C -> Prop   -- W --N/S--> E : relation on words by rows
theorem strip_tileable_iff_composite_nonempty (T n) : (exists n-row valid patch of width m) <-> (rowRel T)^n (nonempty on word-length m)
theorem shiftReduce_row_is_tile : shift-reduce step of an AB grammar = one Wang row with a head marker colour
```
and a concrete one: `def jrTiles : List (WangTile (Fin 4))` of 11 tiles (the Jeandel-Rao set; needs the literature table) with `jrTiles.length = 11` replacing the literal `tileCount := 11`, plus `decide`-checked finite patches for n up to some N. [HARD: aperiodicity itself; not needed].
T10. FOUR-valued context concept lattice = product of two Boolean lattices, with twist order  [closes M6]
```
structure Ctx4 (G M) := (r : G -> M -> Reading)
def Ipos r g m := (r g m).pos = true ; def Ineg r g m := (r g m).neg = true
def conceptLattice4 (C : Ctx4 G M) := Concept G M (Ipos C.r) x Concept G M (Ineg C.r)     -- lane-wise derivation, shared G,M
def leK4 (a b) := leC a.1 b.1 /\ leC a.2 b.2           -- knowledge order: product
def leT4 (a b) := leC a.1 b.1 /\ leC b.2 a.2           -- truth order: positive up, negative down
theorem conceptLattice4_complete_bilattice : the pair (leK4, leT4) makes it an interlaced bounded bilattice (Avron: = Twist(concepts(Ipos) , concepts(Ineg)^op) )
theorem twist_correspondence : conceptLattice4 C ~ TwistProduct-like structure over the Boolean concept lattices; consistent concepts = those whose pos extent is disjoint from neg extent? [CHK]
```
T11. Twist of a (possibly non-commutative) Lambek algebra is residuated  [BF: adjunction checked; associativity/unit NOT]
```
def twistDot <x,y> <z,v> := < x.z , (x \ v) /\ (y / z) >
def twistLres <x,y> <p,q> := < (x\p) /\ (q\y) , x.q >        -- a \ c
def twistRres <p,q> <z,v> := < (p/z) /\ (v/q) , q.z >        -- c / b
theorem twist_biresiduation : twistDot a b <=_T c <-> b <=_T twistLres a c <-> a <=_T twistRres c b     where <x,y> <=_T <z,v> iff x<=z /\ v<=y
```
I brute-forced the two equivalences over ALL 64^3 triples in the twist of P(M), M = {1,a,b}, ab=a, ba=b?? (xy := x for x,y in {a,b}; non-commutative; 64 twist elements): both hold. BUT associativity of twistDot and the unit <1,1> FAIL in that model, because P(M) is not integral (1 != top): the house's twist (TwistProduct, commutative) needs `one_eq_top`. So the theorem needs integrality (or a different unit, e.g. <1,0>? untested); the syntactic lattice is NOT integral (e = closure{[]} is not top), so T11 as an associative monoid for syntactic lattices requires a corrected unit/associativity: run [CHK] on integral non-commutative examples and on the non-integral unit candidates before Lean. Practical fallback: carry TWO syntactic lattices (positive, negative) as a pair and define the FOUR-valued product only through the pair (T10), use Twist only for the order.
T12. Chu morphism = adjointness exactly; defect is a cochain (translation fidelity)
```
def adjDefect (f : C.pts -> D.pts) (g : D.sts -> C.sts) : C.pts -> D.sts -> Prop := fun a y => D.r (f a) y != C.r a (g y)
theorem adjDefect_empty_iff_chuMap : (forall a y, not adjDefect f g a y) <-> exists m : ChuMap C D, m.fwd=f /\ m.bwd=g
theorem adjDefect_comp (f1 g1 f2 g2) : adjDefect (f2 o f1) (g1 o g2) a z -> adjDefect f1 g1 a (g2 z) \/ adjDefect f2 g2 (f1 a) z    -- subadditive (union bound)
-- numeric version with weights w : Reading -> Reading -> Nat (graph distance in the truth/knowledge order): defect is a 1-cochain on the nerve of speakers; coboundary of 0-cochain 'relabel by K4 gauge' vanishes:
def actC (g : K4) (C) : ChuSpace := {C with r := fun a x => K4.act g (C.r a x)}
theorem chuMap_gauge_functorial (f : ChuMap C D) (g) : exists f' : ChuMap (actC g C) (actC g D), f'.fwd=f.fwd /\ f'.bwd=f.bwd     -- any entrywise map preserves adjointness
theorem adjDefect_gauge_exact : (forall a y, D.r (f a) y = K4.act g (C.r a (b y))) -> adjDefect_up_to_gauge_g = empty
```
Statement of the cochain claim to be validated [CHK]: define on a triple i->j->k of speakers the "holonomy defect" `h_ijk = adjDefect(T_ik) xor-composed with adjDefect(T_jk o T_ij)`; show the Reading-valued discrepancy is a 2-cocycle in the Cech complex of the speaker nerve (needs a cochain complex on an actual graph, which `CoverNerve` (3 Nats) does not provide; use `CellComplex` or `OneVertexComplex`).
T13. Biextensional collapse preserves the concept lattice; clarification
```
theorem collapse_concepts_iso (C : ChuSpace over Two-readings) : Concept(C) ~ Concept(collapse C)      -- clarification of a context
theorem collapse_idempotent : collapse (collapse C) ~ collapse C   (iso of Chu spaces)
theorem collapse_universal : biextensional D -> every ChuMap C D factors uniquely through collapse C
theorem collapse_functorial : collapse (comp f g) = comp (collapse f) (collapse g)
```
T14. Identification ledger: every merge costs a recorded bit (formalize Landauer where it is currently prose)  [closes sec 9 gap]
```
def merges (C) : Nat := ... number of merges needed to reach collapse C from discrete finite C (|C.pts| - |collapse C.pts| + |C.sts| - |collapse C.sts|)
def erasedBits (n : Nat -> classes sizes) : Nat -- log2 of class sizes, additive: cost of nested quotients is a chain rule  erasedBits (g o f) = erasedBits f + erasedBits g
theorem identification_cost_additive
theorem landauer_h1_union_find : CoverNerve.H1rank N = number of cells whose endpoints are already in the same component when added (union-find redundant unions)
theorem landauerBits_via_identification : landauerBits N = redundantIdentifications N        -- replaces the definitional rename with a theorem
```
T15. Cell-addition ledger (Euler conservation) = obstruction bookkeeping for EROEI
```
theorem addCell_euler (N N' : CoverNerve) (h : N' = N + one cell) : (N'.H1rank - N.H1rank) + (N.H0rank - N'.H0rank) = 1 with exactly one of the two terms equal to 1
def eroei (discharged enabled work erasure : Nat) : Rat := (discharged + enabled) / (work + erasure)
theorem eroei_gt_one_iff ; theorem rumination_iff_h1_positive_and_no_discharge
theorem deficit_is_settlement_work : work (settle) <= initial deficit (FreeEnergyLyapunov: kappa_bounded_by_initial_free_energy)
```
Needs a definition of `enabled` (future inferences): suggest = increase in |closed concepts reachable|; explicitly flag as invented; the Lean-supported part is the first line (Euler conservation) and `kappa_bounded_by_initial_free_energy` for the denominator.
T16. Causal Chu space and self-duality -- CORRECTION OF THE SPINE
```
def causalChu (P) (prec : P -> P -> Prop) : ChuSpace := {pts := P, sts := P, r := fun x y => Reading.ofSlots (decide (prec x y)) (decide (prec y x))}
theorem causalChu_dual_eq : ChuSpace.dual (causalChu P prec) = causalChu P prec           -- STRICT equality, any relation, by negate (ofSlots p q) = ofSlots q p
theorem causalChu_diag : r x x = ofSlots (prec x x) (prec x x) ∈ {bot, top}     -- bot if irreflexive, top if reflexive (cycle)
theorem causalChu_time_eq_prec_count / space ...: time (r x y) = [x≺y]+[y≺x] ; space = [x≺y]-[y≺x]
theorem closed_timelike_curve_iff_top : r x y = kTop <-> x ≺ y /\ y ≺ x
theorem settle_time_monotone (c : Reading.Closure) a : time a <= time (c.op a)  /\  (at most 2 strict increases along any settle chain)    -- from infl + kle_time_mono ; kHeight_eq_time
```
The spine says "antisymmetric precedence is self-dual, the generative regime breaks it". With the r(x,y)=(x≺y, y≺x) encoding the dual (transpose + negate) is ALWAYS equal to itself, antisymmetric or not (proof: dual.r y x = negate(r x y) = ofSlots (y≺x) (x≺y) = r y x). The arrow-of-time symmetry breaking must be encoded some other way (e.g. a non-square Chu space events x observers, or r(x,y)=(x≺y, not x≺y)). Flag to lead.
T17. Orbital exhaustiveness for triples (the three curryings of a triadic context)  [CHK threshold, conjecture]
```
theorem orbital_exhaustive_n (n) (hE : exists n-many... |E| >= 2n pairwise distinct) (f : (Fin n -> E) -> (Fin n -> E)) (hf : Equivariant f) : exists s : Fin n -> Fin n, forall p, f p = fun i => p (s i)    -- the n^n coordinate selections
```
For n = 2: 4 maps, hypothesis 4 distinct elements (proved, threshold 4 = 2n; three fails: ThreeSample). Conjecture: threshold 2n (check n=3 with |E|=5 (should fail, extra map) and |E|=6 (should hold) by brute force over S_|E|-equivariant maps on a small model [CHK]). For n=3 gives 27 reindexings, of which the Chu-relevant generators are the 6 permutations (converse etc.) + projections.
T18. Concept = bubble: extent/intent volume and wall functional; coarsening is monotone  [definitional + easy]
```
def volume (c : Concept G M I) [Fintype G] : Nat := card c.extent ; def walls c : Nat := card c.intent
theorem concept_volume_antitone_in_intent : c.intent subset d.intent -> d.extent subset c.extent     -- from prime_adjunction
theorem coarsening_loses_concepts : removing a point from G (induced subcontext) maps Concept(G') into Concept(G) as a join-subsemilattice?  [CHK]
def surfaceCost c := walls c * (card of distinguishing states)   -- invented functional; the Lean-supported part is the antitone Galois pair
```
T19. Gibbs/Delta-F generation: enabled continuation = [settle, brim] cone; temperature interpolation  [medium]
```
theorem enabled_cone_nonempty_iff_not_void ...; theorem brim_idempotent: brim c (fun phi => Valued.ofReading (brim c v phi)) = brim c v   [CHK]
theorem generation_step_deficit_nonincreasing : the lawful continuation chosen at T=0 (closureAtZeroTemp) satisfies deficit' <= deficit  (FreeEnergyLyapunov.freeEnergy_antitone)
```
T20. Registry/skeleton as a Chu morphism (typed dependency): a package = ChuMap; version immutability = initiality
```
structure Pkg := (exports : Type) (demands : Type) (satisfies : exports -> demands -> Reading)
theorem pkg_compose : ChuMap composition = dependency resolution (A depends B depends C gives A depends C); resolution defect = adjDefect (T12)
theorem published_version_immutable : (content-address) injectivity of ChuSpace presentation: collapse(P)=collapse(P') <-> same hash   [definitional once hashing is a quotient]
```
Lowest-risk order to build: T2, T1, T16, T12 (rfl-level) -> T5 (Boolean syntactic lattice, the keystone) -> T4 (+soundness) -> T10 -> T7/T8 -> T14/T15 -> T13 -> T3 -> T6 (hard) -> T11 (needs [CHK]) -> T17.

---------------------------------------------------------------------------
## 13. Gaps & slop summary
1. FCALambekCircle "circle" = 3 unrelated fields; closing edge absent (M1-M9). `TwoLambek` is Two, not FOUR; `lambekOfResiduated` cannot take FOUR (integrality).
2. Header of LinearLogicChu says Chu(FOUR) *-autonomous; only the 4-element alphabet is. No tensor/hom/par on spaces; no category laws on ChuMap.
3. House dual = transpose + negation, not Barr's transpose.
4. `Landauer.landauerBits := H1rank` is a definition; kT ln2 and "erased bit per cycle" are prose; no connection to collapse/identification.
5. `CurryHowardLambek`: Lambek = CCC; `curry_howard` is vacuous; no HasTy -> propOfTy soundness; `chl_quartet_is_nuclear` is numerology (4 names).
6. `Orbital`: honest 4 = 2x2 coordinate selections for |E|>=4; "predication forces FOUR" is not what it proves; FregeanFourChu's three fields are bookkeeping.
7. `kHeight` duplicates `Reading.time`.
8. `Cones.lean` "cones" != light cones; "differential bypass" != spine "distal bypass".
9. `J26` is a gyrobifastigium cell complex, not tile colouring / Wang. JR 11 tiles are a Nat; cohomology data hand-transcribed from JSON certificates.
10. `CoverNerve` is counts + inequalities, not a graph; `Cohomology` H1 results are about ranks, not cochains/cocycles over speakers.
11. FCA is Prop/Boolean only; no many-valued FCA; no concept-lattice product.
12. `PredicationCell` "generates a category" - only endomaps defined.
13. No Lean for: foam/Plateau, EROEI, vitrimer, metabolic criticality, distal bypass (dropped stitch), syntactic concept lattice, Wurm/Pentus, CYK/chart, causal sets, weaving in core lib (WeaveDraft is in other libs), Wang tiles proper.
14. Spine correction: `causalChu` is self-dual always (T16).
15. Spine correction: CYK chart is not literally a Wang tiling; derivations/shift-reduce runs are (T8, T9).

## 14. Attachment points for the AI (hooks)
- `ChuSpace` JS twin keyed by content hash; golden file from section 0 tables.
- `Identification.collapse` => clarification step in the settle loop; ledger of merges (T14).
- `Settling.Closure` + `settle/brim/Void` => the ask-for-evidence queue (Void cells) and generation cone.
- `FreeEnergyLyapunov.deficit` => cost of settlement; `CoverNerve.H1rank` => obstructions; `Orbital` => cell reindexing generators.
- `Site/Topic.lean` Boolean claim/term concept + cover gluing => first real context to run T5 on.
- `LightCone.time/space` => per-cell causal coordinates in the corpus ledger.
