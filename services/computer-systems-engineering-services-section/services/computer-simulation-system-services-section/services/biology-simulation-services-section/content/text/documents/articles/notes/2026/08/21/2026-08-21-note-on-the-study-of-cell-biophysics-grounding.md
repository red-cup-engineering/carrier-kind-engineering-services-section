---
title: "Study of Cell Biophysics Grounding"
description: "S6 of the software planning program: the panel biophysicist's brief on proton-motive force, copy-number distributions, minimal-cell reference points, division size-control, stochastic partitioning, and cell-death nomenclature — originally written from training memory — redone against verified literature (Taniguchi 2010, Bennett 2009, Hutchison 2016, Pelletier 2021, Amir 2014, Taheri-Araghi 2015, Campos 2014, Huh & Paulsson 2011, Galluzzi 2018, Goldbeter & Koshland 1981, Hopfield 1974, Ninio 1975, Balaban 2004, Süel 2006, and their surrounding literature), with a per-decision verdict for each item the ADR docket is waiting on, one substantive revision (the integer-copy-number premise needs a stated scope boundary against bulk metabolites), and one correction to the study's own question framing (Süel et al. 2006 shows noise-driven excitability, not bistability)."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-study-of-cell-biophysics-grounding
authors:
  - claude-sonnet-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "proton-motive-force", "copy-number", "minimal-cell", "syn3.0", "adder", "partitioning", "cell-death", "kinetic-proofreading", "membrane-transport", "tissue-heterogeneity", "literature-review"]
tags: ["draft", "study"]
---


This is S6 of the software planning program's document set. Its job
is narrow and specific: the panel biophysicist's brief (Stage-1
Expert Panel Review §2, and the identifications S0 routed here in
its §8–9) was written from training memory, and the program's own
rule is that training memory is draft input, not a decision. Every
claim below was checked against a search this session actually ran;
where a number could not be pinned to a primary source, that is
stated as an open flag rather than smoothed over. Three research
passes fed this note — one direct (this session's own searches) and
two delegated in parallel for coverage, all consolidated here with
duplicate citations reconciled. Register is plain throughout: this
document reports what the literature says, not what the engine
should conclude from it beyond the stated verdicts.

## 1. Proton-motive force: magnitude, dynamics, what a scalar hides

Δp decomposes as `Δp = ΔΨ − Z·ΔpH`, with `Z ≈ 59 mV` per pH unit at
37°C — the electrical (membrane potential) and chemical (pH
gradient) components are both real, separately measurable
quantities, not a notational convenience.

**Bacteria.** Setty, Hendler & Shrager (*Biophysical Journal*, 1983)
measured ΔΨ, ΔpH, and Δp simultaneously in intact *E. coli*: at
external pH 7.5–7.8, Δp ≈ −165 mV, with ΔΨ dominant (order 125 mV)
and ΔpH small (tens of mV). Critically, the split is not fixed —
as external pH falls toward 5.5–6.6, ΔpH rises to compensate while
total Δp is held roughly constant, i.e., the cell actively
*interconverts* between the two components rather than maintaining
a stable ratio (corroborated by a 2021 bioRxiv study on *E. coli*'s
pH robustness via Δp). **Mitochondria.** ΔΨm is the dominant term,
typically 120–180 mV (some measurements 150–220 mV depending on
respiratory state and whether the mitochondria are isolated or
in-cell), with ΔpH contributing a smaller remainder (order 30–60
mV); ΔΨ is roughly 80% of the total driving force (Nicholls &
Ferguson, *Bioenergetics*, 4th ed.; Brand & Nicholls, *Biochemical
Journal* 435:297–312, 2011).

**Collapse dynamics under uncouplers.** CCCP and DNP collapse Δp on
a seconds timescale by the qualitative consensus of the
potentiometric-dye literature (TMRM, DiSC3(5), DiOC2) — fast
relative to metabolic and growth timescales (minutes to hours), but
no single primary source pinned an exact time constant in this
search; a 2026 *Biophysical Journal* paper on osmotic-stress-induced
PMF collapse in *E. coli* documents comparably fast (seconds-scale),
reversible collapse from a different perturbation, reinforcing that
Δp is a fast-relaxing state variable generally. **Flagged open**:
no authoritative single number (e.g. a half-time in seconds) for
uncoupler-induced collapse specifically.

**Membrane electrical (RC) timescale.** Neuronal membrane time
constants run 8–20 ms; no bacterial-specific figure was found, but
general membrane capacitance (~1 µF/cm²) makes a millisecond-scale
RC constant the reasonable expectation for any lipid bilayer,
bacterial or eukaryotic. **Flagged open**: no bacteria-specific
number confirmed.

**Verdict groundwork.** The ordering that matters for the engine is:
electrical relaxation (ms, probable) ≪ PMF collapse under an
uncoupler (seconds, qualitatively confirmed) ≪ metabolic/growth
timescales (minutes–hours). This ordering supports treating Δp as a
fast, externally-set scalar at Stage 1. What it silently omits: (a)
the ΔΨ/ΔpH split is not a static decomposition of one number — real
cells actively convert between them in response to external
conditions (Setty et al. 1983), and different transporters couple
preferentially to one component or the other, so a scalar hides a
real regulatory degree of freedom, not just detail; (b) active pH
homeostasis (antiporters, acid-resistance systems) that maintains
the split runs on timescales that *do* overlap with metabolism —
decoupling Δp from interior reactions removes a real feedback loop,
which is a legitimate Stage-1 scoping choice but should be named as
an omission rather than left implicit.

## 2. Copy numbers: where integer state is honest, where it lies

Taniguchi, Choi, Li, Chen, Babu, Hearn, Emili & Xie, "Quantifying
*E. coli* Proteome and Transcriptome with Single-Molecule
Sensitivity in Single Cells," *Science* 329:533–538 (2010) —
measured 1,018 YFP-fusion strains by single-molecule fluorescence.
Protein number distributions fit a gamma distribution; low-abundance
regulators (e.g. LacI, ~10 tetramers/cell) sit at single digits to
tens of copies, most essential proteins average in the tens, and
abundant proteins (glycolytic enzymes, elongation factors) reach
thousands of copies per cell. mRNA counts run lower still — typically
under 1 to about 100 copies per cell (induced *lacZ* mRNA ≈ 50/cell),
corroborated by Skinner et al., "Measuring mRNA copy number in
individual *Escherichia coli* cells using single-molecule FISH,"
*Nature Protocols* 8:1100–1113 (2013). This is the low end the
integer-state premise is built for, and it holds.

It fails, and fails by a wide margin, for metabolites. Bennett,
Kimball, Gao, Osterhout, Van Dien & Rabinowitz, "Absolute metabolite
concentrations and implied enzyme active site occupancy in
*Escherichia coli*," *Nature Chemical Biology* 5:593–599 (2009) —
LC-MS/MS quantification of over 100 metabolites; total intracellular
metabolite pool ≈ 300 mM, with glutamate the single most abundant
species, and ATP specifically at ≈ 9.6 mM. Converting at a standard
*E. coli* cell volume of order 1 fL (10⁻¹⁵ L): 9.6 mM × 6.022×10²³
/mol × 10⁻¹⁵ L ≈ 5.8×10⁶ molecules of ATP per cell — squarely in the
millions, four to five orders of magnitude above the regulatory-
protein regime the draft cites. Water, at molar concentration, is
further still into the continuum.

**Bottom line.** The crossover between "stochastic, integer-honest"
and "continuum, concentration-honest" sits somewhere around 10³–10⁴
copies. Regulatory proteins and mRNAs (1 to low hundreds) are safely
on the discrete side; core metabolites at millimolar concentrations
(10⁵–10⁷ molecules/cell) are safely on the continuum side. The
premise is directionally correct but the draft's own species — I1,
I2, L, H, W, S, P — need a declared identity: are they meant to
stand in for regulatory/information-carrying actors, or for bulk
metabolites? The literature says these cannot honestly be the same
kind of thing simulated the same way.

## 3. Minimal cells: JCVI-syn3.0/syn3A and the division floor

Hutchison, Chuang, et al., "Design and synthesis of a minimal
bacterial genome," *Science* 351:aad6253 (2016) — confirmed as the
real paper. JCVI-syn3.0: 531 kb genome, 473 genes, built by
minimizing the 1,079 kb synthetic *Mycoplasma mycoides* genome
(JCVI-syn1.0) via improved transposon mutagenesis that distinguished
essential from quasi-essential genes. At publication, 149 of the 473
genes (roughly 31%) had unknown or unassignable biological function
— a material caveat for anyone treating syn3.0 as a fully understood
parts list. Breuer et al., "Essential metabolism for a minimal
cell," *eLife* 8:e36842 (2019), gives the metabolic follow-through
on the closely related syn3A strain (543 kb, 493 genes): a
near-complete metabolic reconstruction accounting for 98% of
enzymatic reactions, with roughly 92% of genes essential or
quasi-essential in vivo (about 68% strictly essential). Exact
per-category gene counts (metabolism vs. information processing vs.
membrane vs. unknown) exist in both papers' figures but were not
independently re-extracted here.

**The division-defect story.** Pelletier et al., "Genetic
requirements for cell division in a genomically minimal cell,"
*Cell* 184:2430–2440 (2021), is the confirmed follow-up. JCVI-syn3.0
divides irregularly — filamentous, vesicular, blebbing/pinching
morphology rather than clean binary fission. syn3A adds 19 genes
back to syn3.0; of those, seven are necessary and sufficient to
restore normal morphology and regular division, including the two
canonical division-ring genes `ftsZ` and `sepF`, plus a hydrolase of
unknown substrate and several membrane-associated proteins of
unknown function. The direct reading for this program: bare
metabolic and informational viability (the 473-gene set) is *not*
sufficient for orderly division machinery — a minimal cell that can
grow and replicate its genome can still fail to divide cleanly
without a specific, separately minimal set of division genes. This
is real evidence that "division machinery" is its own minimal
requirement, distinguishable from "viability" in general, which
bears directly on any claim that a small reaction network alone
constitutes a complete division story.

## 4. Division size control: the adder literature

Three independently confirmed papers converge on the same result
across at least four bacterial species. Amir, "Cell size regulation
in bacteria," *Physical Review Letters* 112:208102 (2014) — the
analytically tractable model proposing that cells add a roughly
constant increment of volume between divisions regardless of birth
size, which the subsequent literature came to call the "adder"
model. Taheri-Araghi et al., "Cell-Size Control and Homeostasis in
Bacteria," *Current Biology* 25:385–391 (2015) — direct experimental
confirmation in both *E. coli* and *B. subtilis*: cells add a
constant volume each generation irrespective of newborn size (the
"constant Δ" model). Campos et al., "A Constant Size Extension
Drives Bacterial Cell Size Homeostasis," *Cell* 159:1433–1446 (2014)
— confirmation in both *E. coli* and the evolutionarily distant
*Caulobacter crescentus*, explicitly disproving the older
critical-size ("sizer") paradigm as the general mechanism.

**Exceptions, for later stages, not this one.** *Schizosaccharomyces
pombe* (fission yeast) is closer to a sizer: Pan, Saunders,
Flor-Parra, Howard & Chang, *eLife* 3:e02040 (2014), show the kinase
Cdr2p accumulates in cortical nodes that scale with surface area,
providing a geometric size-threshold signal for mitotic entry —
genuinely a different control mechanism, not adder relabeled.
Mycobacteria (*M. smegmatis*, BCG) follow a "parallel adder" applied
per growth pole/per replication origin under optimal conditions, but
this itself breaks down in a pole-age-dependent way under
sub-optimal carbon sources (Current Biology 2017 on mycobacterial
parallel adders; a follow-up PMC study on carbon-source-dependent
deviations). None of this touches a single well-mixed bacterial-type
cell, which is Stage 1's actual scope.

**Mechanism, not just fit.** The adder is not purely phenomenological.
Two credible mechanistic candidates exist: (1) FtsZ threshold
accumulation combined with biomass-proportional (balanced)
synthesis reproduces adder statistics exactly (Si et al.,
"Mechanistic Origin of Cell-Size Control and Homeostasis in
Bacteria," *Current Biology*, 2019); (2) replication-initiation
coupling — initiation triggered at a fixed volume-per-origin,
division following after a roughly fixed time delay (Wallden,
Fange, Lundius, Baltekin & Elf, *Cell* 166:729–739, 2016), extended
to a "double-adder" model by Micali et al., *eLife* e48063 (2018).
Both candidates would make "divide when accumulated biomass since
birth crosses a fixed increment" an emergent property of a reaction
network's own accumulator species, rather than an externally
imposed rule — which is exactly the shape the draft already chose
(simulation core draft §5, keyed to `W_pool`).

## 5. Partitioning at division: the null model and its failures

Huh & Paulsson published two related but distinct papers in 2011,
and both matter here. "Random partitioning of molecules at cell
division," *PNAS* 108:15004–15009 — the mechanistic paper
establishing binomial partitioning (each molecule independently
assigned to a daughter with probability equal to volume fraction)
as the baseline null model, and showing how partitioning-error
magnitude depends on the segregation mechanism. "Non-genetic
heterogeneity from stochastic partitioning at cell division,"
*Nature Genetics* 43:95–100 — the companion paper, showing
partitioning noise is often statistically indistinguishable from
"intrinsic" biochemical expression noise in its downstream effects
on phenotypic variability.

**Real deviations are documented and specific.** Lindner, Madden,
Demarez, Stewart & Taddei, "Asymmetric segregation of protein
aggregates is associated with cellular aging and rejuvenation,"
*PNAS* 105:3076–3081 (2008) — spontaneous protein aggregates in
*E. coli* localize to and are preferentially inherited by the old
pole, a super-Poissonian, non-random deviation tied to cellular
aging. Active segregation systems (ParABS-family plasmid and
chromosome partitioning, operating via a Brownian-ratchet ParA
gradient mechanism) drive partitioning error rates far below the
binomial expectation — deterministic apportionment rather than
chance assignment, the sub-Poissonian counterpart to aggregate
mis-segregation. No single canonical review pinned down a specific
ParABS error-rate figure in this search; the qualitative claim
(actively segregated entities are far more regular than binomial)
is well supported across primary sources even so.

**Bottom line.** Binomial partitioning is the correct default, not a
universal law. It holds exactly for species with no aggregation
tendency and no active segregation apparatus — which describes the
draft's seven-species baseline network. Any future species meant to
represent an inclusion body, a plasmid, an organelle, or anything
else under dedicated segregation machinery needs its own
partitioning rule, and the ADR should say so as a stated scope
boundary.

## 6. Cell-death nomenclature: NCCD and the orthogonality claim

Galluzzi, Vitale, Aaronson, Abrams, et al., "Molecular mechanisms of
cell death: recommendations of the Nomenclature Committee on Cell
Death 2018," *Cell Death & Differentiation* 25:486–541 (2018) —
confirmed as the current, standing general reference; it succeeds
2009, 2012, and 2015 NCCD documents in the same venue. A 2023
follow-up exists but is scoped narrowly to apoptosis in disease, not
a full re-classification — no comprehensive successor to the 2018
taxonomy was found. The 2018 paper recognizes intrinsic and
extrinsic apoptosis, mitochondrial-permeability-transition-driven
necrosis, **necroptosis** (RIPK1/RIPK3/MLKL), **pyroptosis**
(gasdermin-mediated, caspase-1/11), **ferroptosis** (iron-dependent
lipid peroxidation via GPX4), **parthanatos**, entotic cell death,
NETotic cell death, lysosome-dependent cell death,
autophagy-dependent cell death, immunogenic cell death, cellular
senescence, and mitotic catastrophe — the regulated-necrosis
landscape the study asked to confirm, confirmed in full.

**The orthogonality claim is directly supported, not just
plausible.** The NCCD's own terminological resolution is to use
"programmed" for death occurring in physiological or developmental
contexts, "regulated" for any death inhibitable by specific
genetic or pharmacological intervention, and to reserve "accidental"
strictly for death from overwhelming, uncontrollable insult. This
explicitly rejects a clean programmed-versus-accidental (or
programmed-versus-structural) binary for the regulated-necrosis
family, because necroptosis and pyroptosis are simultaneously
molecularly regulated *and* morphologically and functionally lytic
— membrane rupture is the executed outcome of a program, not
evidence against one. This is precisely the discipline the panel
review states independently ("regulated necrosis... is a program
that produces boundary failure").

**PMF collapse and membrane integrity as separable observable
endpoints** are also confirmed as standard practice, not an
engine-specific invention: mitochondrial membrane potential loss is
assayed with potentiometric dyes (TMRM, JC-1), plasma-membrane
permeabilization with exclusion/leakage assays (propidium iodide,
LDH release). Ward et al., *Journal of Neuroscience* 27:8238 (2007),
measured both in parallel during glutamate excitotoxicity and found
them correlated but genuinely distinguishable — apoptotic cells can
lose ΔΨm without immediate PI positivity. One caveat worth carrying
forward: TMRM itself can respond to both mitochondrial *and*
plasma-membrane potential, so any engine-side analogue of these two
modes should be defined by distinct underlying state variables (as
the draft already does — σ/flux for bioenergetic death, an explicit
site-dissolved flag for boundary death), never by one shared proxy
signal.

## 7. Futile cycles, ultrasensitivity, and kinetic proofreading

Goldbeter & Koshland, "An amplified sensitivity arising from
covalent modification in biological systems," *PNAS* 78:6840–6844
(1981) — confirmed. Zero-order ultrasensitivity: when the converter
enzymes on both arms of a substrate cycle (e.g. a kinase and its
opposing phosphatase) are saturated by their substrate — operating
in the "zero-order" regime rather than the linear regime — the
steady-state fraction of modified substrate becomes a steep,
switch-like function of the ratio of enzyme activities, with
sensitivity that can in principle be increased without bound as
substrate excess over enzyme grows.

**The energetic cost of futile cycling is genuinely thin
literature**, not a search failure. A 2024 *Cell Metabolism* review,
"Futile cycles: Emerging utility from apparent futility," cites
lipid futile cycling (glyceride/fatty-acid) as accounting for up to
roughly 10% of daily energy expenditure in some contexts, but
explicitly describes systematic ATP accounting for phospho-cycles —
including the classic fructose-6-phosphate/fructose-1,6-bisphosphate
cycle the draft's R2–R3–R4 loop stylizes — as "an important but
abandoned area" of research. No solid whole-cell percentage figure
exists for that specific cycle. This means S0's own quantitative
falsifier (σ spent on the held-open contradiction versus measured
gain in switching steepness) has no real-cell number to benchmark
against yet — the mechanism is right in shape (Goldbeter–Koshland),
the quantitative validation target is open.

**Kinetic proofreading** — Hopfield, "Kinetic proofreading: a new
mechanism for reducing errors in biosynthetic processes requiring
high specificity," *PNAS* 71:4135–4139 (1974), and Ninio, "Kinetic
amplification of enzyme discrimination," *Biochimie* 57:587–595
(1975) — both confirmed as the real founding papers, independently
proposing the same driven, dissipative-intermediate-step mechanism
for beating the equilibrium discrimination floor. Measured error
rates: DNA replication achieves overall fidelity of order 10⁻¹⁰
errors per base pair through three serial filters — polymerase base
selection alone (~10⁻⁴ to 10⁻⁵), proofreading exonuclease
improvement (roughly 10²–10³-fold, an escape rate of order 10⁻²),
and mismatch repair (a further ~10⁻³) — per Kunkel's review of DNA
replication fidelity (*Journal of Biological Chemistry* / *Annual
Review of Biochemistry* 69:497–529, 2000). Translation is markedly
less accurate: in vitro selection-plus-proofreading error is of
order 10⁻³, and downstream quality control (miscoding-triggered
premature termination) suppresses the observed cellular error rate
roughly tenfold further, landing in the commonly cited 10⁻⁴–10⁻⁵
per-codon range. These are the concrete numbers the membrane's
own proofreading-cost prediction (S0 §2: admission discrimination
beyond the equilibrium floor must scale with σ spent at the
membrane) would eventually be checked against, once Stage 3 gives
the admission predicate something real to discriminate.

## 8. Membrane transport archetypes and the transduction boundary

The four-part taxonomy is standard: passive diffusion, facilitated
diffusion (channels and carriers), primary active transport, and
secondary active transport, per the organizational structure used
throughout Alberts et al., *Molecular Biology of the Cell*
(NCBI Bookshelf, "Transport of Small Molecules" and "Ion Channels
and the Electrical Properties of Membranes"). It carries a real,
load-bearing kinetic distinction, not just a naming convenience:
ion channels move on the order of 10⁶–10⁸ ions per second when open
— near the diffusion limit — while carriers and pumps operate
through a conformational cycle and are correspondingly far slower,
typically tens to a few hundred events per second (general carrier
turnover ~30–300/s; facilitated GLUT-type transporters ~100/s;
Na⁺/K⁺-ATPase ~130–170 cycles/s, moving 3 Na⁺ out and 2 K⁺ in per
cycle), with some fast antiporters (e.g. the red-cell Cl⁻/HCO₃⁻
exchanger, capnophorin/AE1) reaching up to ~10⁵/s — faster than
typical pumps but still four to five orders of magnitude below
channel throughput. These figures are order-of-magnitude aggregates
(Milo & Phillips, *Cell Biology by the Numbers*, Garland Science,
2015, is the standard citable compilation), not pinned universal
constants, and should be used as such.

**Receptor-mediated signal transduction is a structurally distinct
category, confirmed as standard, not novel framing.** GPCRs
(seven-transmembrane, G-protein/β-arrestin coupled) and receptor
tyrosine kinases (single-pass, intrinsic kinase activity,
autophosphorylation-driven docking) are canonically organized in
membrane biology as "receptors," separate from "transporters" —
ligand engagement produces a conformational and catalytic signal,
and nothing crosses the membrane. This is why transport and cell
signaling occupy separate chapters in Alberts, not an incidental
textbook choice. The direct implication for the engine: translocation-
gated transport has a defining throughput number (a flux, in ions or
molecules per second) that characterizes its kinetic class; signal
transduction has no such number, because the "payload" is the
admission event itself. This confirms the panel review's scoping
call precisely — the bamboo Lsi-style transport template, built for
gated translocation and correctly seated at Stage 3 as a
multicellular relay, structurally cannot be stretched to cover
receptor transduction, because there is no flux for its rate
machinery to describe.

## 9. Tissue heterogeneity: standing variance versus required consensus

Both regimes are real, well documented, and genuinely distinct
biological postures — not two readings of the same phenomenon.

**Standing heterogeneity as healthy.** X-chromosome inactivation
mosaicism traces to Lyon's 1961 hypothesis (*Nature*, "Gene Action
in the X-chromosome of the Mouse"): random, clonally propagated
silencing of one X chromosome produces mosaic tissue in female
mammals, with calico/tortoiseshell cat coat patterning as the
textbook visible instance (modern review: "X-chromosome inactivation:
the gift that keeps on giving," *Nature Structural & Molecular
Biology*, 2023). Bacterial persisters — Balaban, Merrin, Chait,
Kowalik & Leibler, "Bacterial Persistence as a Phenotypic Switch,"
*Science* 305:1622–1625 (2004) — confirmed via microfluidic
single-cell tracking that antibiotic-surviving persister cells arise
from pre-existing, non-genetic phenotypic switching into a slow-
growth state, not from resistance mutation. A third example worth
adding: Elowitz, Levine, Siggia & Swain, "Stochastic Gene Expression
in a Single Cell," *Science* 297:1183–1186 (2002), quantified
intrinsic and extrinsic noise as drivers of clonal phenotypic
heterogeneity, now the standard mechanistic basis cited for
bet-hedging strategies.

**A correction to this study's own question framing.** Süel,
Garcia-Ojalvo, Liberman & Elowitz, "An excitable gene regulatory
circuit induces transient cellular differentiation," *Nature*
440:545–550 (2006), is real and correctly titled, but its finding is
not bistability. The paper's central result is that competence
entry and exit in *B. subtilis* is governed by **noise-driven
excitability** — one stable state plus a noise-triggered excursion
through an unstable region and back — and the authors explicitly
show that two stable states are *not* required for this behavior.
Bistability is the right word for the Balaban persister
switch; it is the wrong word for Süel's competence circuit. This
should be corrected wherever the study spec's phrasing propagates.

**Required consensus.** Cardiac electrical function depends on
gap-junction (connexin Cx40/Cx43/Cx45) electrotonic coupling for
synchronized action-potential propagation across the myocardium;
disruption of this coupling causes arrhythmia (reviewed in
*Cardiovascular Research* 80:9, and in more recent work on mixed
electrotonic/ephaptic conduction mechanisms). Epithelial barrier
function depends on coordinated, uniform tight-junction sealing
(occludin, claudins, ZO-1/ZO-2) across an entire cell sheet — a
local failure compromises the whole barrier, reviewed in "Mechanisms
regulating intestinal barrier integrity," *Experimental & Molecular
Medicine* 50:e120 (2018), and in Alberts' "Cell Junctions" chapter.
These are cases where uniformity, not variance, is the healthy
state, and no single-cell heterogeneity mechanism substitutes for
it.

## Verdicts

**Exogenous scalar Δp.** CONFIRMED for Stage 1. The timescale
ordering (electrical relaxation likely ms, PMF collapse under an
uncoupler on the order of seconds, metabolic/growth timescales
minutes to hours) supports treating Δp as a fast, harness-set scalar
without computing it from interior reactions. What this omits should
be stated explicitly in the ADR rather than left implicit: the
ΔΨ/ΔpH split is not a static decomposition — real cells actively
interconvert the two components, and different transporters couple
to one or the other preferentially, so the `{chemical, electrical}`
shape the draft already reserves is the right future-proofing and
should be exercised as soon as any scenario has more than one
gradient-coupled transporter. Active pH homeostasis is a real,
timescale-overlapping feedback loop this abstraction removes; that
removal is an acceptable Stage-1 scoping choice but an undeclared
one until the ADR says so.

**Integer copy numbers.** REVISE. Confirmed true for regulatory
proteins and mRNA (1 to low hundreds of copies — Taniguchi et al.
2010), which is the regime the draft's justification describes. It
does not hold for metabolites: real intracellular metabolites sit at
millimolar concentrations, which at bacterial cell volume works out
to order 10⁵–10⁷ molecules per species (Bennett et al. 2009), four
to five orders of magnitude above the cited 1–10³ range. The
revision: the ADR should state as a declared scope boundary that
Stage-1 species represent regulatory or information-carrying actors,
not bulk metabolites, and that a scenario introducing a
bulk-metabolite-like species at physiological abundance should route
immediately to the already-named tau-leaping/hybrid upgrade path —
not treated as a distant contingency, since a biologically literal
scenario would hit this boundary almost immediately.

**The seven-reaction cycle's biological honesty.** CONFIRMED, with
one open quantitative item. R7's leak fraction is well grounded —
real basal mitochondrial proton leak accounts for roughly 20–30% of
resting metabolic rate in hepatocytes and up to ~50% in skeletal
muscle, matching the design's "roughly a fifth" framing closely
enough to stand, if anything conservatively. The R2–R3–R4
held-contradiction structure is a legitimate stylization of a
substrate cycle bought for switching sensitivity, mechanistically
grounded in Goldbeter & Koshland's zero-order ultrasensitivity. The
open item: no real-cell literature gives a solid whole-cell
percentage-of-ATP-budget figure for any specific futile cycle
(a 2024 review calls this "an abandoned area"), so S0's own σ-versus-
response-steepness falsifier has no real-cell number to benchmark
against — the mechanism is right, the quantitative target is open,
not confirmed or disconfirmed.

**Adder division trigger.** CONFIRMED for Stage 1. Amir 2014,
Taheri-Araghi et al. 2015, and Campos et al. 2014 independently
support adder over sizer/timer alternatives across at least four
bacterial species, and mechanistic candidates (FtsZ threshold
accumulation with balanced biosynthesis; replication-initiation
coupling) mean the rule need not be imposed by fiat — it can be an
emergent property of the reaction network's own accumulator species,
which is the shape the draft already chose. Named exceptions —
*S. pombe*'s sizer-like surface-area control, mycobacteria's
condition-dependent parallel-adder deviations — are real but out of
scope for a single well-mixed bacterial-type Stage-1 cell; log them
now for whenever a non-bacterial or asymmetrically-growing cell type
enters the engine.

**Binomial partitioning.** CONFIRMED as the correct Stage-1 null
model. Huh & Paulsson's two 2011 papers establish it as the
mechanistic baseline and show partitioning noise's real contribution
to phenotypic variability, matching exactly the role the draft
assigns it. Real deviations exist and are well documented — aggregate
mis-segregation to the old pole (Lindner et al. 2008, super-
Poissonian), active segregation systems like ParABS (sub-Poissonian,
far more regular than binomial) — but neither applies to the
baseline seven-species network, which has no aggregating or
actively-segregated species. The ADR should record this as a stated
scope boundary: binomial is correct because nothing in scope yet
violates its preconditions, not because it is universally true.

**The four-mode death taxonomy.** CONFIRMED. Galluzzi et al. 2018
(NCCD) is the real, current general reference, and it independently
supports the panel's own added discipline: the regulated-necrosis
landscape (necroptosis, pyroptosis, ferroptosis, and further modes)
is both molecularly programmed and structurally destructive, which
is precisely why NCCD itself rejects a clean programmed/accidental
binary for these modes. PMF-collapse and membrane-integrity are
confirmed as separable observable endpoints in real experimental
practice (different assays — ΔΨm probes versus exclusion/leakage
assays), matching the engine's bioenergetic-versus-boundary split,
with the caveat that the underlying state variables, not a shared
proxy signal, should keep the two modes distinguishable — which the
draft already does.

**The Lsi-style transport template's scoping.** CONFIRMED. The
passive/facilitated/primary-active/secondary-active taxonomy is
standard and carries a genuine kinetic distinction (channels at
10⁶–10⁸ ions/s versus carriers and pumps at roughly 10¹–10⁵ events/s).
Receptor-mediated signal transduction is a confirmed, textbook-
standard structurally distinct category — the admission event is the
payload, nothing translocates, and there is no throughput number to
characterize it by. The panel's scoping call is exactly right: the
Lsi template covers gated translocation and cannot be stretched to
cover transduction, which needs its own predicate shape.

**Predicate-dependent tissue heterogeneity.** CONFIRMED empirically;
the engineering choice is OPEN. Both standing-heterogeneity-as-
healthy (X-inactivation mosaicism, bacterial persisters, noise-driven
excitable differentiation) and required-consensus (cardiac
gap-junction synchrony, epithelial tight-junction barrier integrity)
regimes are real, well documented, and genuinely distinct dynamical
postures. What settles the open half: Stage-4 design work on which
predicate a given scenario declares — this study can confirm the
biology exists in both forms; it cannot yet say what mechanism the
engine should use to choose between them for a given tissue model,
because that design does not exist yet.
