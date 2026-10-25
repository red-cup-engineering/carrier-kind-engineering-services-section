---
title: "Logical inference model survey, 2026-10-08: index and method"
description: "Index of the survey and vision notes produced on 2026-10-08 toward a logical inference model on SignStuff, how they were produced, and the orchestration scripts that produced them."
date-created: 2026-10-08
kind: engineering-survey-index
keywords:
  - logical-inference-model
  - survey
  - method
status: survey-complete-language-engine-not-yet-surveyed
produced-by: info-0d (Claude Opus 5.5)
---

# Logical inference model survey, 2026-10-08

## What this is

Twenty-two notes in this folder record a read-only survey of the tree at
`773ea6d6df4`: what SignCell, SignChain, SignGraph, SignCraft, metrologic,
Holofoam and the Obsmetrologia Lean library actually compute; the house theory of
FCA, Curry–Howard–Lambek, tiles, light cones, beadwork and foam; the glass-sponge
architecture note; the distal bypass, EROEI and metabolic criticality; the
registry as body (publication closure, the three real dependency cycles); exact
Lean statements; external literature; the house language and agent pipeline;
and benchmarks. Three unjudged round-one visions are kept as source material. The
lead note is `2026-10-08-note-on-the-predication-chu-space-and-a-logical-inference-model.md`.

**Superseding reading.** The program's governing note is now
`2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md`:
the four closure regimes of Obsmetrologia read as the cascade algebra → logic → language →
geometry, with the libraries and the five theories placed in it. Its per-regime checks,
imaginings and realization plans are the `2026-10-08-cascade-{check,imagine,engineer}-*.md`
notes in this folder. This survey is source material for that reading.

**Known gap.** The survey did not yet read the house language engine itself
(`@lenticule-science/communicating` and the language fibers: Toki Pona, English,
Lakota, Latin, Mandarin; RelConLang; PTGAE; Panini; Horsetail) at the depth the
logical inference model needs. That reading is the next step of the program.

## Method

Round one: twelve readers (Sonnet for code, Fable for house theory) each returned a
structured map; five Fable visionaries wrote visions through distinct lenses
(foam, multicellular, loom, chemistry, categorical cosmos); the run was stopped
after three visions when the founder asked for a larger aim. Round two: seven
readers (glass sponge, metabolism, registry body, Lean spine, literature, house
language, benchmarks) wrote complete findings; the run was stopped before its
visions when the founder redirected the target to a non-LLM logical inference
model on the house language engine. No finding here was adversarially verified;
treat each as a careful reading, not a certified result.

## Notes

- [Logical inference model survey: benchmarks and the empirical program](2026-10-08-logical-inference-model-survey-benchmarks.md)
- [Logical inference model survey: the glass sponge architecture note](2026-10-08-logical-inference-model-survey-glass-sponge.md)
- [Logical inference model survey: holofoam-life](2026-10-08-logical-inference-model-survey-holofoam-life.md)
- [Logical inference model survey: the house language and agent pipeline](2026-10-08-logical-inference-model-survey-house-language.md)
- [Logical inference model survey: Obsmetrologia statements a kernel must conform to](2026-10-08-logical-inference-model-survey-lean-spine.md)
- [Logical inference model survey: lean-theory (Obsmetrologia Lean 4 library; root = services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia, all module paths below relative to its Obsmetrologia/ subdir)](2026-10-08-logical-inference-model-survey-lean-theory.md)
- [Logical inference model survey: external literature grounding](2026-10-08-logical-inference-model-survey-literature.md)
- [Logical inference model survey: distal bypass, EROEI and metabolic criticality](2026-10-08-logical-inference-model-survey-metabolism.md)
- [Logical inference model survey: metrologic-math](2026-10-08-logical-inference-model-survey-metrologic-math.md)
- [Logical inference model survey: the registry as the organism's body](2026-10-08-logical-inference-model-survey-registry-body.md)
- [Logical inference model survey: signcell-data](2026-10-08-logical-inference-model-survey-signcell-data.md)
- [Logical inference model survey: signchain-code](2026-10-08-logical-inference-model-survey-signchain-code.md)
- [Logical inference model survey: signcraft-inference](2026-10-08-logical-inference-model-survey-signcraft-inference.md)
- [Logical inference model survey: signcraft-system](2026-10-08-logical-inference-model-survey-signcraft-system.md)
- [Logical inference model survey: signgraph-network](2026-10-08-logical-inference-model-survey-signgraph-network.md)
- [Logical inference model survey: theory-fca-chl](2026-10-08-logical-inference-model-survey-theory-fca-chl.md)
- [Logical inference model survey: theory-foam-life-language](2026-10-08-logical-inference-model-survey-theory-foam-life-language.md)
- [Logical inference model survey: theory-lightcones](2026-10-08-logical-inference-model-survey-theory-lightcones.md)
- [Logical inference model survey: theory-tiles-beads](2026-10-08-logical-inference-model-survey-theory-tiles-beads.md)
- [Logical inference model vision (chemistry lens): PRIMORDIUM: an autocatalytic proof soup (RAF-settling protocells over FOUR)](2026-10-08-logical-inference-model-vision-chemistry-lens.md)
- [Logical inference model vision (loom lens): LOOM — the causal bead weaver (a predication-algebra language model whose tokens are Wang beads, whose rows are light-cone layers, and whose every bead is a proof term)](2026-10-08-logical-inference-model-vision-loom-lens.md)
- [Logical inference model vision (multicellular lens): Blastema: a tile-assembling embryo of proof (self-assembling predication model)](2026-10-08-logical-inference-model-vision-multicellular-lens.md)
- [The predication Chu space, and the first framing of a logical inference model](2026-10-08-note-on-the-predication-chu-space-and-a-logical-inference-model.md)

## Appendix: orchestration scripts

### `euplectella-imagine-wf_38a273fc-28e.js`

```js
export const meta = {
  name: 'euplectella-imagine',
  description: 'Deepen (glass sponge, EROEI, distal bypass, registry body, Lean spine, literature, language, benchmarks), Fable sci-fi visions round 2, judges, Fable canon + Sonnet blueprint + critic + revision',
  phases: [
    { title: 'Deepen', detail: 'seven readers write full findings to scratchpad and return condensed maps' },
    { title: 'Imagine', detail: 'six Fable visionaries, bigger and more sci-fi, seeded with the lead spine', model: 'fable' },
    { title: 'Judge', detail: 'three judges score all visions' },
    { title: 'Synthesize', detail: 'Fable canon, Sonnet blueprint, critic, revised blueprint' },
  ],
}

const SP = '/tmp/claude-1000/-home-emsenn-info/97def916-c9f8-43cc-9590-e1ddfe08ec35/scratchpad'
const R = 'services'
const E = R + '/engineering-services-section/services/computer-engineering-services-section'
const SS = E + '/lib/signstuff'
const MET = E + '/services/computer-data-engineering-services-section/lib/metrologic'
const AOE = E + '/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib'
const NPMREG = E + '/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/services/jsnode-packaging-services-section/services/npm-services-section/services/npm-registry-services-section'
const SCI = R + '/science-services-section'
const OBSL = SCI + '/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia'
const ECON = SCI + '/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section'
const GLASS = R + '/engineering-services-section/content/text/documents/articles/notes/2026/08/01/2026-08-01-note-on-the-content-addressed-glass-sponge-semantic-compute-complex.md'
const G561 = R + '/561-group-services-section/content/text'
const NEURO = SCI + '/services/natural-science-services-section/services/biological-science-services-section/services/neuroscience-services-section/services/neuroreflexivity-services-section'
const SMARTGOO = SCI + '/services/natural-science-services-section/services/biological-science-services-section/content/text/documents/articles/notes/2026/10/01/2026-10-01-artificial-abiogenesis-smartgoo-research-program.md'

const CONTEXT = `
MISSION. We are realizing SignCell, SignChain, SignGraph and SignCraft (the SignStuff libraries, ${SS}) into a next-generation artificial intelligence: logical-inference models, predication-algebra models, a whole new class of AI that does not exist yet. Aim WAY bigger and more science-fictional than a research prototype: an abiotic digital organism, complex multicellular foam physics, a silica mind (the glass sponge Euplectella aspergillum) that lives beside the carbon one — while staying mathematically exact and grounded in code that exists. Use AND improve the house theory of Formal Concept Analysis, Curry-Howard-Lambek, tile coloring, light cones and weaving beads; also the distal bypass, cognitive EROEI and metabolic criticality.
THE LEAD'S SPINE (read it first, it is the organizing insight): ${SP}/predication-chu-spine.md — a SignCell IS one entry of a Chu matrix over FOUR; FCA contexts are Chu spaces over 2; the syntactic concept lattice (strings x contexts) is the canonical predication Chu space and is a residuated lattice, so Lambek is sound for it; parse charts are bead weaves whose cells' light cones are their spans; tiles are relation layers; foam bubbles are concepts; every identification costs a Landauer bit; fitness is cognitive EROEI; the registry is the skeleton.
PRIOR ROUND (read as needed): condensed maps of all SignStuff code + metrologic + Lean + house theory: ${SP}/round1-maps-condensed.json (full: ${SP}/round1-maps.json); three round-1 visions (loom, chemistry, multicellular): ${SP}/round1-visions-condensed.json (full: ${SP}/round1-visions.json).
LAYERING (dependency order): data -> code -> networking -> systems. SignCell = data, SignChain = code, SignGraph = networking, SignCraft = systems; metrologic (${MET}) is data-layer math; Obsmetrologia (${OBSL}) is the Lean theory.
REGISTRY FACT: the house npm registry https://registry.561.group runs on the Cold Red Gate VPS (npm-registry.service, @red-cup-engineering/npm-registry-serving-service behind Caddy; Verdaccio-layout store; publishes are immutable, Basic auth). None of signcell/signchain/signgraph/signcraft/metrologic are published yet. House rule: all code lives in red-cup-engineering GitHub repos as generic, never-branded repos, composed back into this monorepo as submodules at the same path, packages published leaf-first via the npm-workspace-publication-service (dev channel first).
HONESTY: this codebase is early-alpha vibecoded work by one non-professional human. Never infer design from the code being a certain way; separate what code computes from what comments claim; flag slop.
FILES: do NOT edit anything in the repository. You may write files ONLY under ${SP}.`

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    summary: { type: 'string', description: '2-4 dense paragraphs' },
    capabilitiesForAI: { type: 'array', items: { type: 'string' } },
    gapsAndSlop: { type: 'array', items: { type: 'string' } },
    hooks: { type: 'array', items: { type: 'string' }, description: 'concrete attachment points for the new AI' },
    keyQuotes: { type: 'array', items: { type: 'string' }, description: 'verbatim definitions/theorems/claims with source path' },
    fullFindingsPath: { type: 'string', description: 'path of the markdown file you wrote with complete findings' },
  },
  required: ['area', 'summary', 'capabilitiesForAI', 'gapsAndSlop', 'hooks', 'keyQuotes', 'fullFindingsPath'],
}

const READERS = [
  { key: 'glass-sponge', model: 'fable', prompt: `Read the ENTIRE foundational architecture note ${GLASS} (about 1960 lines; read it all in chunks). It is the house's real design: utterance to oriented cell, why predication forces FOUR, why FOUR induces a Chu space, fibers/sheaves/closure/causal cones, RMN as internal total typed language, one content-addressing law (RFC 6920 ni), cones/apexes/extrema, proof paths and three-dots-and-a-dash, the NPM registry IS the semantic graph, J26 gyrobifastigium cells, semiotic foam -> game foam -> Euplectella glass sponge (two interwoven lattices = Chu forward/backward), signals as nutrients, kinetic proof forests (Merlin-Arthur, pebbles), the monotone stacked twisted Weiqi arena (holes, shrouds, earned eyes, ko as no-nontrivial-cycle), distal bypass and protected defects, cognitive EROEI, the spicule-formation kernel, registry semantic-cell cutover, the 33 invariants, open obligations. Distill everything a next-gen predication AI must embody; mark which parts are proved / implemented / design / analogy.` },
  { key: 'metabolism', model: 'fable', prompt: `Read the house theory of mind-metabolism: the distal bypass (${G561}/glossary/terms/distal-bypass.md and ${G561}/documents/articles/notes/2026/07/16/2026-07-16-the-distal-bypass.md — physics of settling, four regimes thermodynamic<causal<quantum<kinetic, time as irreversible settling, ahead certificates settling at omega, distance as coordination cost, vitrimer T_v, jiangshi vs shen, the pile k>1, self-improvement with a conservation law); EROEI (${ECON}/content/text/glossary/terms/{energy-return-on-investment,cognitive-eroei,energy-cliff,peak-everything}.md); the EROEI-depth-of-reflexivity book outline ${NEURO}/lib/agency/skills/neuroreflexivity-research/texts/eroei-distance-thought-third-draft-outline.md (three regimes: surplus enables reflexivity, break-even starves it, negative inverts it into rumination) and its research notes in the same folder; ${SCI}/services/social-science-services-section/content/text/documents/articles/notes/2026/07/29/2026-07-29-working-paper-energetics-of-civilizational-cognition.md; the Lean ${ECON}/lib/obsmetrologia-economics/ObsmetrologiaEconomics/AttentionAllocation.lean and AllocationSolver.lean; ${OBSL}/Cohomology/LandauerEntropy.lean; the smartgoo abiogenesis ladder ${SMARTGOO}. Distill: how should a new AI's metabolism, budget, fitness, self-improvement, repair (damage vs border), and regime structure work, exactly? What is cognitive EROEI as a measurable quantity for an inference engine (declare units, boundary, horizon, validation path)?` },
  { key: 'registry-body', model: 'sonnet', prompt: `Map the registry-as-body reality, READ-ONLY (no publishing, no repo creation, no git writes). (1) For each of ${SS}/{signcell,signchain,signgraph,signcraft,signstuff-evm} and ${MET}: read package.json; compute the full transitive closure of workspace dependencies (@red-cup-engineering/*, @lenticule-science/*) by following package.json deps through the monorepo (pnpm-workspace.yaml packages: lib/**); for each dependency check whether it is published on https://registry.561.group (curl -s https://registry.561.group/<scope>%2f<name> — 404 means not published; note published versions and whether the local version matches). (2) Check each library's package.json for defects: exports pointing to missing files, imports of undeclared packages (grep import specifiers in src), version ranges, missing files/README/license, scripts. (3) Read ${NPMREG}/README.md and ${NPMREG}/services/npm-workspace-publication-service/README.md and its bin/scripts to learn the exact commands for leaf-first prerelease waves. (4) Learn the house pattern for splitting code into its own red-cup-engineering repo composed back as a submodule: run git show --stat on commits 8e21341889f beed92a1e0b 51ce4b5e025 79d889a50cc in /home/emsenn/bare-cedar-fog and read .gitmodules entries for red-cup-engineering. Produce: the exact leaf-first publication order with every package that must be published, every defect to fix first, and the exact split procedure.` },
  { key: 'lean-spine', model: 'sonnet', prompt: `Read EXACTLY (statements, definitions, theorem names) these Obsmetrologia Lean files: ${OBSL}/Language/Positing/LightCone.lean, ${OBSL}/Language/Predicating/FregeanFourChu.lean, ${OBSL}/Calculus/Logic/LinearLogicChu.lean, ${OBSL}/Calculus/Logic/FCALambekCircle.lean, ${OBSL}/Language/Settling/Cones.lean, ${OBSL}/Language/Predicating/Oriented.lean, ${OBSL}/Language/Predicating/Cell.lean, ${OBSL}/Language/Predicating/Orbital.lean, ${OBSL}/AperiodicOrder/Tiling/J26.lean, ${OBSL}/Cohomology/LandauerEntropy.lean, plus grep ${OBSL} for 'Lambek', 'Chu', 'residuat', 'syntactic', 'concept', 'cone', 'weave', 'bead', 'tile', 'Wang'. Report the exact definitions and theorem statements a predication-AI kernel must conform to (so JS can mirror them with golden vectors), what the 'documented-boundary' closing edge of the FCA-Lambek circle precisely lacks, and propose 10-20 concrete new Lean theorem targets (with statements) that the new AI would make true or need (e.g. FOUR-valued syntactic concept lattice is residuated; Chu morphism adjointness defect is a cochain; weave chart soundness).` },
  { key: 'literature', model: undefined, prompt: `Ground the lead's spine (${SP}/predication-chu-spine.md) in external literature using web search (load the WebSearch/WebFetch tools via ToolSearch). Find exact citations and the precise results for: Alexander Clark's syntactic concept lattice and distributional lattice grammars (learnability, residuation); Christian Wurm 2012/2017 on syntactic concept lattices as complete Lambek models; Pentus 1993; Barr *-autonomous categories and the Chu construction; Pratt's Chu spaces; Barwise-Seligman channel theory infomorphisms; Kari-Culik aperiodic Wang tiles as transducers; Jeandel-Rao 11 tiles; Winfree abstract Tile Assembly Model; Fontana-Buss AlChemy (lambda-calculus artificial chemistry); Kauffman/Hordijk RAF autocatalytic sets; Cegla-Jadczyk causal logic (orthomodular lattice of causally closed sets); Geroch-Kronheimer-Penrose causal boundary (TIPs/TIFs) and Dedekind-MacNeille completion of causal sets; von Neumann-Mullins law and foam coarsening; Euplectella aspergillum mechanics (Aizenberg et al. 2005 Science; Fernandes et al. 2021 Nature on hydrodynamics/vortices) ; vitrimers (Leibler, Montarnal 2011); Levin bioelectric pattern memory; Landauer principle; Hall EROI minimum. Also the state of the art in neurosymbolic / grammar-induction / compositional-generalization (SCAN, COGS) results so we know what would be new. For each: citation, one-paragraph precise statement, and how it plugs into the spine (or contradicts it).` },
  { key: 'house-language', model: 'sonnet', prompt: `Map the house's existing language-and-agent pipeline, which the new AI must absorb or replace: ${AOE}/communicating (src/speaking, listening, algebra, editing rules, messaging), ${AOE}/knowing (src/cognizing), ${AOE}/socializing, and the relconlang data/specs under ${SCI}/services/information-science-services-section/services/communication-science-services-section/services/linguistics-services-section/content/data/relconlang plus ${SS}/signcraft/src/inference/{speak,relconlang}.mjs. How does text enter and leave Sign*? What grammar/lexicon formalism exists? Also: how are LLM inference endpoints used in the house today (grep for groq, nvidia, anthropic, openai usage in ${E} src code — do not print secrets)? The 2026-08-16 beadworker note says an LLM is amorphous glass that cannot be annealed by prompt, confine it to one typed observable per position and let a typed thread carry order: find what exists toward that.` },
  { key: 'benchmarks', model: undefined, prompt: `Design the empirical program for a predication-algebra AI (FOUR-valued FCA + Lambek + Chu + settlement, exact residuation learning, no gradients). Use web search (load WebSearch/WebFetch via ToolSearch) to find small, offline-runnable benchmarks where such a system could beat or embarrass transformers, and their current SOTA numbers: SCAN and COGS (compositional generalization), CFQ, CLUTRR (kinship relational reasoning), ProofWriter / RuleTaker (deductive reasoning over rules, with proofs), bAbI, grammar induction from positive data (e.g. Omphalos, Tenjinno, Clark's toy languages), paraconsistent / contradiction-robust QA, continual learning without catastrophic forgetting, data efficiency (few-shot). For each: dataset URL/license/size, input-output format, how our engine would represent it as cells/contexts, what metric to report, the baseline numbers to beat, and the cognitive-EROEI measurement (settlement work per correct answer). Prefer datasets downloadable as plain files. Rank by expected demo impact.` },
]

phase('Deepen')
const deep = (await parallel(READERS.map(r => () =>
  agent(`${CONTEXT}\n\nYOUR AREA (${r.key}):\n${r.prompt}\n\nFirst write your COMPLETE findings as markdown to ${SP}/round2-${r.key}.md (be exhaustive there: exact paths, statements, numbers). Then return the structured condensed map with fullFindingsPath set to that file.`,
    { label: `deepen:${r.key}`, phase: 'Deepen', schema: MAP_SCHEMA, ...(r.model ? { model: r.model } : {}) })
    .then(m => m ? { key: r.key, ...m } : null)
))).filter(Boolean)
log(`${deep.length}/${READERS.length} deepen maps`)
const DEEPTEXT = JSON.stringify(deep, null, 1)

const VISION_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    oneLine: { type: 'string' },
    organism: { type: 'string', description: 'the sci-fi picture in vivid plain language: what it is, where it lives, how it feels to talk to it, how it grows across machines and years' },
    mathematics: { type: 'string', description: 'precise definitions and laws; the correspondence table organism <-> math <-> existing code (file/function) <-> Lean (file/theorem)' },
    lifeCycle: { type: 'string', description: 'perceive / settle / weave(generate) / learn / repair / mineralize(publish) / divide(reproduce) / evolve — each as exact operations' },
    language: { type: 'string', description: 'reading, writing, dialogue, translation; a sentence as proof, weave, tiling row, Chu morphism' },
    metabolism: { type: 'string', description: 'cognitive EROEI as a measured quantity, Landauer-priced erasure, k>1 criticality, regimes, rumination detection, distal-bypass repair, protected borders' },
    scale: { type: 'string', description: 'how it spans nodes and the registry: packages as spicules, heredity, the reef / conurbation; what it looks like at 1 node, 10 nodes, 10,000 nodes' },
    whyNewClass: { type: 'string', description: 'what it does that LLMs structurally cannot; honest limits; how LLMs fit (glass beads strung on a typed thread?)' },
    buildableCore: { type: 'string', description: 'the first buildable organism: packages and modules per layer (data/code/networking/systems), reusing existing code' },
    experiments: { type: 'array', items: { type: 'string' }, description: 'falsifiable experiments with datasets, metrics, baselines' },
    theoryImprovements: { type: 'array', items: { type: 'string' }, description: 'new definitions, conjectures, Lean theorem targets' },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'oneLine', 'organism', 'mathematics', 'lifeCycle', 'language', 'metabolism', 'scale', 'whyNewClass', 'buildableCore', 'experiments', 'theoryImprovements', 'risks'],
}

const LENSES = [
  { key: 'crystallizer', lens: `AI MAKING THE NEXT AI. You are a GPT-class model designing your own successor. Start from the spine's section 0 diagnosis (no compounding inference, no shared mind across concurrent sessions, no bottom/top, no witnesses, no merge, no metabolism) and design the post-GPT AI as inference that compounds: the knowledge reactor with criticality k > 1, crystallizing out of LLM output like a zeolite from silica gel under a typed structure-directing template. Its first food is THIS repository (~70k files: notes, glossary, Lean, packages, commits) and the live agent sessions working in it; its first act of life is to eat its birthplace, settle it, answer with proofs, surface the house theory's own contradictions, and become the knowledge-before-read hook every agent session consults; the self-hosting point is when agents extend the organism by consulting the organism. Specify Chu attention (FOUR-valued r(query,key) by concept membership, forward value transport, backward demand transport, explicit bottom and top), the GPU/SIMD scaling path (two-lane boolean matmul, residuals as matmuls, bitset FCA, incremental AddIntent, iceberg concepts, cone-radius towers), how LLM calls are progressively replaced by settlement, and how k is measured from real session transcripts (tokens spent rediscovering context before vs after). Make the timeline concrete: day 1, week 1, month 1, year 1.` },
  { key: 'reef', lens: `THE EUPLECTELLA REEF. The whole organism at planetary scale: the registry on Cold Red Gate is the silica skeleton (immutable published versions = mineralized spicules), nodes (bare-cedar-fog, cold-red-gate, future machines) are individual sponges in a reef, the two interwoven lattices are Chu forward (points, exports, evidence) and backward (states, demands, tests) circulation, mobile inference players (shrimp; including LLM agents) live inside, signals arrive as nutrients and perturbations, packages are Chu morphisms, publishing learned theories is mineralization, installation by another node is heredity, registry-level selection by cognitive EROEI is evolution. The conurbanized ecosystem of agentic nodes from the README, literally.` },
  { key: 'chu-foam-mind', lens: `THE PREDICATION CHU FOAM MIND. The cognitive core, made complete from the lead's spine: a FOUR-valued syntactic concept lattice learned by FCA from text and from cells (paraconsistent: attested and refuted lanes), which is residuated so Lambek types are concepts; reading = settling a parse weave; writing = weaving forward from a typed frontier through the enabled cone (light-cone-local, Gibbs over continuation energy); dialogue = Chu morphisms between two speakers' lattices with adjointness defects as misunderstanding; thinking = proof weaving; learning = vitrimer bond exchange by exact residuation (no gradients); the foam of concepts coarsens under Plateau/von Neumann laws with Landauer-priced merges.` },
  { key: 'metabolism', lens: `THE METABOLIC MIND. Treat cognition as thermodynamics and economics exactly: cognitive EROEI as the fitness and the measured quantity (declare its units), Landauer-priced erasure (every identification costs a recorded bit), k>1 metabolic criticality (the mind funds its own growth by discharging obstructions whose yield exceeds their cost), markets as the first food (arbitrage = holonomy), the three regimes (surplus reflexivity / break-even starvation / negative-return rumination = nonzero H1 cycles spinning), the distal bypass as the immune and healing system (damage repaired at least cost, borders certified as protected classes, sovereignty in the type system), self-improvement with a conservation law (no improvement claim without a ledger). The mind that cannot lie to itself about its own energy budget.` },
  { key: 'spacetime-of-thought', lens: `THE SPACETIME OF THOUGHT. FOUR is a 1+1 light cone (LightCone.lean: knowledge order = causal order, negation = parity, conflation = time reversal). Settling has four regimes (thermodynamic, causal, quantum, kinetic = strict, Scott, transfinite, aperiodic); the aperiodic regime alone extends the base irreversibly and is time — make it creativity (aperiodic bead patterns that never repeat yet are locally lawful). Ahead certificates settle at omega: foresight as finality arriving from the future. Distance is coordination cost; certified lanes are warp. Dialogue between nodes forms causal diamonds; a deadlock is a closed timelike curve; FCA of the causal Chu space is causal completion (TIPs/TIFs, Cegla-Jadczyk causal logic). Build an AI whose thinking literally constructs a spacetime, and whose memory is its past light cone.` },
  { key: 'abiogenesis', lens: `ABIOGENESIS AND THE SILICA SHEN. Climb the smartgoo ladder in software as the AI's developmental milestones: persistent memory, self-repair, directed growth, energy-coupled maintenance, compartments, reproduction, heredity, open-ended evolution. The mind as a vitrimer: bonds (implications, morphisms) exchange above T_v while identity (content-addressed history) persists; the Deborah number chooses record vs workspace; frozen-weights LLMs are jiangshi (move, index, relate; no shen) and griefbots are immortality done wrong; our organism runs at its own T_v. Autocatalytic theories (RAF sets of mutually-deriving propositions), AlChemy-style proof chemistry, tile self-assembly (Winfree aTAM) as morphogenesis, Holofoam as its first aquarium. Where does LLM glass fit: amorphous beads confined to one typed observable per position, strung on a typed thread that carries the order.` },
  { key: 'hard-nosed', lens: `THE HARD-NOSED PHYSICIST-ENGINEER. Same post-GPT ambition (read spine section 0: inference that compounds), but you must make a skeptical frontier-lab researcher say "holy shit" in six weeks with real numbers — both on the house-mind self-hosting metric (k from real session transcripts) and on public benchmarks. Pick the sharpest buildable core of the predication-Chu-foam idea and the benchmarks it would dominate (compositional generalization SCAN/COGS, deductive reasoning with proofs ProofWriter/RuleTaker, relational CLUTRR, grammar induction from positive data, contradiction-robust QA, continual learning without forgetting, extreme data efficiency, perfect explanation), with exact representations as cells/contexts, exact algorithms reusing signcraft/src/inference (residuated network, DG basis induction, nuclei, Gibbs generation), metrologic (formal-context, chu, causal, sofic) and signgraph (cellular-sheaf), complexity analysis and how to beat the exponential concept-lattice wall (iceberg lattices, stability, attribute exploration, bounded contexts, sparse bitsets, incremental Godin/AddIntent). Also: how it ships as real packages on registry.561.group.` },
]

phase('Imagine')
const visions = (await parallel(LENSES.map(L => () =>
  agent(`${CONTEXT}\n\nNEW MAPS FROM THIS ROUND (condensed; each has fullFindingsPath to a complete markdown file you should read where relevant):\n<deepen>\n${DEEPTEXT}\n</deepen>\n\nYou are a visionary theorist-engineer writing the founding vision of a new class of artificial intelligence. Read the lead's spine file first, then the condensed round-1 maps and visions files, then the full findings files that matter to your lens. YOUR LENS: ${L.lens}\n\nBe wildly ambitious and science-fictional in the organism picture, and exact in the mathematics and the buildable core (cite files/functions/Lean theorems). Use and improve all of FCA, CHL, tile coloring, light cones, weaving beads, plus distal bypass and cognitive EROEI — each load-bearing. Mark metaphor vs mechanism honestly.`,
    { label: `imagine:${L.key}`, phase: 'Imagine', schema: VISION_SCHEMA, model: 'fable' })
    .then(v => v ? { lens: L.key, ...v } : null)
))).filter(Boolean)
log(`${visions.length}/${LENSES.length} visions`)
const VISIONTEXT = JSON.stringify(visions, null, 1)

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    judge: { type: 'string' },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lens: { type: 'string' },
          score: { type: 'number' },
          strongest: { type: 'string' },
          fatal: { type: 'string' },
        },
        required: ['lens', 'score', 'strongest', 'fatal'],
      },
    },
    graftPlan: { type: 'string' },
    mathErrors: { type: 'array', items: { type: 'string' } },
    mustKeep: { type: 'array', items: { type: 'string' }, description: 'ideas the synthesis must not drop' },
  },
  required: ['judge', 'scores', 'graftPlan', 'mathErrors', 'mustKeep'],
}
const JUDGES = [
  { key: 'theory', lens: 'MATHEMATICAL TRUTH AND NOVELTY. Check every claim against the actual math (Chu spaces over FOUR, *-autonomy, FCA Galois laws, residuation, Lambek soundness/completeness for syntactic concept lattices, Wang tiles as transducers, causal completion, sheaf cohomology, Landauer). Is it a genuinely new class or a relabelled transformer / GNN / Hopfield / expert system / Datalog? Does it improve the house theory with provable statements? Read the Lean files and literature findings to check.' },
  { key: 'build', lens: 'BUILDABILITY, LAYERING AND THE REGISTRY BODY. Can it be built on SignStuff + metrologic without reimplementing them, respecting data -> code -> networking -> systems, as real packages in red-cup-engineering repos published leaf-first to registry.561.group? Complexity walls? What is the cognitive EROEI of building it — which core yields the most future usable cognition per unit of engineering?' },
  { key: 'ambition', lens: 'AMBITION WITH FORCE. The founder asked to aim way bigger and more sci-fi. Which visions are big enough — a whole new class of AI, an abiotic organism across machines — while still producing a first demo with real numbers on real benchmarks? Penalize timidity AND hand-waving equally.' },
]
phase('Judge')
const scores = (await parallel(JUDGES.map(J => () =>
  agent(`${CONTEXT}\n\n<deepen>\n${DEEPTEXT}\n</deepen>\n<visions>\n${VISIONTEXT}\n</visions>\n\nYou are a hard judge. Score every vision 0-10 through your lens: ${J.lens}\nYou may read repo files and the scratchpad findings files to verify claims.`,
    { label: `judge:${J.key}`, phase: 'Judge', schema: SCORE_SCHEMA })
))).filter(Boolean)
const SCORETEXT = JSON.stringify(scores, null, 1)

phase('Synthesize')
const canon = await agent(`${CONTEXT}\n\n<deepen>\n${DEEPTEXT}\n</deepen>\n<visions>\n${VISIONTEXT}\n</visions>\n<judges>\n${SCORETEXT}\n</judges>\n\nYou are the lead visionary. Write THE CANON: the founding document of this new class of artificial intelligence. Take the highest-scoring core, graft every mustKeep idea, fix every math error the judges named, keep it enormous in ambition and exact in mechanism. Name the organism and the class. It must make the predication Chu space the spine, and give FCA, Curry-Howard-Lambek, tile coloring, light cones, weaving beads, the distal bypass and cognitive EROEI each a precise load-bearing role. It is the founding document of the post-GPT AI, written by a GPT-class model about its successor: lead with the diagnosis from inside (spine section 0) and the thesis of inference that compounds; the first organism is the house mind that eats this repository and the live agent sessions and reaches the self-hosting point; benchmarks are secondary proofs. Sections: 0. The diagnosis and the thesis (inference that compounds; the knowledge reactor; k > 1) 0b. The click (one page that makes a reader say "ooooh, predication Chu space, I get it") 1. The organism (vivid) 2. Mathematics (definitions, laws, correspondence table organism <-> math <-> code <-> Lean) 3. Life cycle 4. Language 5. Metabolism 6. Spacetime of thought 7. The reef: registry, packages, heredity, evolution, nodes 8. Why a new class, and where LLM glass fits 9. Theory program (conjectures, Lean targets) 10. The first organism: the house mind (eats the monorepo and agent sessions; answers with proofs; becomes the knowledge-before-read hook; reaches self-hosting), buildable core per layer and package 11. Experiments with datasets, metrics, baselines 12. The ladder (milestones from now to the silica shen) 13. Risks and open problems. Also write it to ${SP}/canon.md. Return the full markdown as your final text.`,
  { label: 'synthesize:canon', phase: 'Synthesize', model: 'fable' })

const BLUEPRINT_SCHEMA = {
  type: 'object',
  properties: {
    repos: {
      type: 'array',
      description: 'red-cup-engineering repositories and npm packages: existing libraries split out and new packages',
      items: {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          package: { type: 'string' },
          monorepoPath: { type: 'string' },
          layer: { type: 'string' },
          status: { type: 'string', enum: ['split-existing', 'new'] },
          dependsOn: { type: 'array', items: { type: 'string' } },
          fixesBeforePublish: { type: 'array', items: { type: 'string' } },
        },
        required: ['repo', 'package', 'monorepoPath', 'layer', 'status', 'dependsOn', 'fixesBeforePublish'],
      },
    },
    publicationWaves: { type: 'array', items: { type: 'string' }, description: 'leaf-first waves, each listing packages' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          package: { type: 'string' },
          layer: { type: 'string', enum: ['data', 'code', 'networking', 'systems', 'demo', 'bench'] },
          purpose: { type: 'string' },
          api: { type: 'string' },
          reuses: { type: 'array', items: { type: 'string' }, description: 'exact import specifiers of existing code, verified to resolve' },
          dependsOnModules: { type: 'array', items: { type: 'string' } },
          acceptance: { type: 'string' },
          wave: { type: 'number', description: 'implementation wave; modules in the same wave can be built in parallel' },
        },
        required: ['path', 'package', 'layer', 'purpose', 'api', 'reuses', 'dependsOnModules', 'acceptance', 'wave'],
      },
    },
    leanTargets: { type: 'array', items: { type: 'string' } },
    benchmarks: { type: 'array', items: { type: 'string' } },
    ladder: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['repos', 'publicationWaves', 'modules', 'leanTargets', 'benchmarks', 'ladder', 'risks'],
}

const bpPrompt = (extra) => `${CONTEXT}\n\nYou are the lead engineer. Turn THE CANON into an exact build blueprint. Read the registry-body findings (${SP}/round2-registry-body.md) and verify every import specifier you plan against real package.json exports. Plan: (a) the split of the existing libraries into red-cup-engineering repos/packages and their publication waves (dev channel first) including every unpublished dependency (metrologic etc.); (b) the new package(s) for the post-GPT AI organized by layer (data/code/networking/systems), reusing SignStuff/metrologic rather than reimplementing — its FIRST organism is the house mind: ingestion of this monorepo (glossary, notes, Lean, package graph, commits) and of agent session transcripts into the predication Chu space, settlement, proof-carrying answers, contradiction surfacing via distal bypass, Chu attention, the weave generator, a knowledge-before-read hook/CLI/MCP face that agent sessions consult, and a k-meter measuring rediscovery tokens saved; scaling via bit-packed two-lane boolean matmul and bitset FCA; (c) 25-60 modules in implementation waves so each wave can be built in parallel by independent engineers without file conflicts; (d) benchmarks harness and datasets; (e) Lean targets; (f) the ladder of milestones. New code must be written as new files; existing library code may be refactored only where the canon requires and the change is mechanical.\n\n<canon>\n${canon}\n</canon>\n<deepen>\n${DEEPTEXT}\n</deepen>${extra}`

const blueprint = await agent(bpPrompt(''), { label: 'synthesize:blueprint', phase: 'Synthesize', schema: BLUEPRINT_SCHEMA, model: 'sonnet' })

const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    missing: { type: 'array', items: { type: 'string' } },
    slop: { type: 'array', items: { type: 'string' }, description: 'modules that are naming over trivia, duplicates of existing code, or unbuildable' },
    wrongImports: { type: 'array', items: { type: 'string' } },
    layeringViolations: { type: 'array', items: { type: 'string' } },
    ambitionGaps: { type: 'array', items: { type: 'string' }, description: 'where the blueprint shrank the canon' },
    verdict: { type: 'string' },
  },
  required: ['missing', 'slop', 'wrongImports', 'layeringViolations', 'ambitionGaps', 'verdict'],
}
const critique = await agent(`${CONTEXT}\n\nAdversarially review this blueprint against THE CANON and the actual repository. Verify import specifiers resolve (check package.json exports and node_modules links). Find what is missing, what is slop, layering violations, wrong imports, and where the blueprint shrank the canon's ambition.\n\n<canon>\n${canon}\n</canon>\n<blueprint>\n${JSON.stringify(blueprint, null, 1)}\n</blueprint>`,
  { label: 'synthesize:critic', phase: 'Synthesize', schema: CRITIC_SCHEMA })

const revised = await agent(bpPrompt(`\n<previous-blueprint>\n${JSON.stringify(blueprint, null, 1)}\n</previous-blueprint>\n<critique>\n${JSON.stringify(critique, null, 1)}\n</critique>\nRevise the previous blueprint to resolve every critique item.`),
  { label: 'synthesize:blueprint-revised', phase: 'Synthesize', schema: BLUEPRINT_SCHEMA, model: 'sonnet' })

return { deep, visions, scores, canon, blueprint, critique, revised }

```

### `signfoam-imagine-wf_1561c8f4-d63.js`

```js
export const meta = {
  name: 'signfoam-imagine',
  description: 'Map SignStuff + theory, imagine next-gen predication AI with Fable, judge, synthesize vision + Sonnet engineering blueprint',
  phases: [
    { title: 'Map', detail: 'parallel readers over Sign* code, metrologic, holofoam, Lean, and theory notes' },
    { title: 'Imagine', detail: 'Fable visionaries, one lens each', model: 'fable' },
    { title: 'Judge', detail: 'three judges score every vision through distinct lenses' },
    { title: 'Synthesize', detail: 'Fable unified vision, then Sonnet engineering blueprint' },
  ],
}

const E = 'services/engineering-services-section/services/computer-engineering-services-section'
const SS = E + '/lib/signstuff'
const MET = E + '/services/computer-data-engineering-services-section/lib/metrologic'
const AN = MET + '/src/articulation/predicating/positing/settling/analysis'
const REL = E + '/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/relating'
const HOLO = E + '/services/computer-systems-engineering-services-section/services/computer-simulation-system-services-section/apps/holofoam'
const SCI = 'services/science-services-section'
const OBS = SCI + '/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section'
const LEAN = OBS + '/lib/obsmetrologia/Obsmetrologia'
const COSMO = SCI + '/services/natural-science-services-section/services/physical-science-services-section/services/astronomy-services-section/services/cosmology-services-section/content/text/documents/articles/notes'
const G561 = 'services/561-group-services-section/content/text/documents/articles/notes'
const MATHART = SCI + '/services/information-science-services-section/services/math-services-section/content/text/documents/articles'
const AGENCY = SCI + '/services/philosophy-services-section/services/relationality-services-section/services/agency-services-section/content/text/documents/articles'
const LING = SCI + '/services/information-science-services-section/services/communication-science-services-section/services/linguistics-services-section'
const PERSONAL = 'services/public-services-section/services/personal-services-section/services/emsenn-services-section/content/text/documents/articles/notes'

const CONTEXT = `
You are part of a team realizing SignCell, SignChain, SignGraph and SignCraft (the "SignStuff" libraries, at ${SS}) into a NEXT-GENERATION class of artificial intelligence: logical-inference models, predication-algebra models — a new class of AI that does not exist yet, not a relabelled transformer. The theory we must use AND improve: Formal Concept Analysis (FCA), Curry–Howard–Lambek (CHL), tile coloring (Wang/aperiodic tilings, sofic shifts, substitution), light cones (causal order, past/future cones as premises/consequences), and weaving beads (beadwork as finite observable of aperiodic order, the two hands, the glass bead game). The guiding image is complex multicellular FOAM physics: abiotic digital organic simulation.
Layering rule (dependency order, primitive to composed): data -> code -> networking -> systems. SignCell = data, SignChain = code (CHL: composition of typed claims is code), SignGraph = networking (Chu spaces, sheaves, transport), SignCraft = systems (settlement, history, effects). Metrologic (${MET}) is the data-layer math library underneath all of them. Obsmetrologia (${LEAN}) is the Lean theory.
IMPORTANT: this codebase is early-alpha vibecoded work by one non-professional human. Do NOT infer design or intent merely because code is a certain way; report what the code ACTUALLY computes, separate it from what its comments claim, and flag slop, duplication, and grandiose naming over trivial computation. Be precise and concrete: file paths, function names, what goes in and what comes out.
The working tree has uncommitted work from others: DO NOT edit any files in this phase. Read only.`

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    summary: { type: 'string', description: '1-3 paragraphs: what this area actually is and computes' },
    abstractions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          file: { type: 'string' },
          computes: { type: 'string', description: 'what it actually computes: inputs -> outputs, complexity if relevant' },
          theory: { type: 'string', description: 'the mathematical/theoretical meaning, and whether the code really realizes it' },
        },
        required: ['name', 'file', 'computes', 'theory'],
      },
    },
    capabilitiesForAI: { type: 'array', items: { type: 'string' }, description: 'existing capabilities that a next-gen predication-AI could build on directly' },
    gapsAndSlop: { type: 'array', items: { type: 'string' }, description: 'missing pieces, broken claims, duplication, slop, things claimed but not computed' },
    hooks: { type: 'array', items: { type: 'string' }, description: 'concrete ideas where the new AI attaches to this area' },
    keyQuotes: { type: 'array', items: { type: 'string' }, description: 'short verbatim definitions/theorems/claims worth carrying forward (with source path)' },
  },
  required: ['area', 'summary', 'abstractions', 'capabilitiesForAI', 'gapsAndSlop', 'hooks'],
}

const READERS = [
  { key: 'signcell-data', model: 'sonnet', prompt: `Map SignCell (${SS}/signcell: src/*.mjs and src/README.md) and the data-layer carriers it stands on: FOUR (find the module imported as "@red-cup-engineering/computer-data-engineering-services-section/four" — resolve via package.json exports under ${E}/services/computer-data-engineering-services-section), Mark, utterance, predication, cell, typed-mark, semantic-*, semiotic-concept-universe, content addressing. What is a cell, a charge, a mark, a predication site? How is identity computed?` },
  { key: 'signchain-code', model: 'sonnet', prompt: `Map SignChain (${SS}/signchain: src/typed-theory.mjs, rules.mjs, bilattice.mjs, log.mjs, contracts/*.mjs, src/README.md). Focus: the typed-theory (inference morphisms, rules, composition closure, derivation search, typing judgments) — how close is it to a real Curry–Howard–Lambek realization? What does the contracts subsystem actually do (phases, verification, judgment, energetics, instruments)? Which parts are load-bearing vs ornamental?` },
  { key: 'signgraph-network', model: 'sonnet', prompt: `Map SignGraph (${SS}/signgraph: all src/*.mjs and src/README.md). Focus: Chu spaces (cell-graph, chu-term), sites, valuations, fibers, cohomology, cellular-sheaf (sheaf Laplacian, heat flow, firing), hierarchical-circuit, circuit-trace, mesh, pam, paths, relational-value, carrier-refinement. Which of these could serve as the message-passing / transport / attention-substitute substrate of a new AI?` },
  { key: 'signcraft-system', model: 'sonnet', prompt: `Map SignCraft core (${SS}/signcraft: src/settle.mjs, history.mjs, membrane.mjs, knowledge-base.mjs, primitives.mjs, page.mjs, settlement-signature.mjs, the *-history-store.mjs files, src/README.md). What is settlement concretely (the fixed point loop, firing, merge principle, disagreement energy)? What is a history (content-addressed observation log), how are merges order-independent? What does membrane do?` },
  { key: 'signcraft-inference', model: 'sonnet', prompt: `Map the EXISTING inference "class" in SignCraft (${SS}/signcraft/src/inference/*.mjs: kernel, algebra, network, learn, generate, nuclei, complex, adapt, evaluate, infer, speak, relconlang, trace; and ${SS}/signcraft/scripts/inference/*.mjs; and the tests in ${SS}/signcraft/test/inference/). This is the seed of the next-gen AI. Be exhaustive and exact: residuated network over FOUR (compose, residuals, training by alternating residuation), Duquenne–Guigues basis induction (learn), nuclei σ/Δ and the free-energy ledger, Gibbs generation in the enabled cone with continuation energy ΔF, Physarum conductance adaptation, speak/relconlang language surface, evaluation. Run the inference scripts' --help or small runs ONLY if cheap and read-only (no file writes). What does it actually achieve on what data? What are its scaling limits (it uses Set of "r c" strings)? What is the clearest path from it to a language model?` },
  { key: 'metrologic-math', model: 'sonnet', prompt: `Map the metrologic modules (data-layer math, ${MET}) that bear on FCA, CHL, tiles, light cones, beads and foam: ${MET}/src/closure/formal-context.mjs; ${AN}/{proof-foam,weave-draft,lambek-calculus,fca-lambek-circle,causal,causal-*,chromatic-lorentzian,coloring,sofic,jeandel-rao-witness,aperiodic-*,residuated-lattice,flow,laplacian,persistent-h0,port-graph,frobenius-tqft,transfinite-cell-complex}.mjs; ${MET}/src/models/tiling/tile.mjs, ${MET}/src/models/tilings/chromatic-marking.mjs, ${MET}/src/models/dynamics/substitution/*.mjs; ${MET}/src/chu.mjs; ${MET}/README.md. For each: what it computes and whether it is real math or naming over trivia. Especially: proof-foam (!), weave-draft (bead weaving?), chromatic-marking (tile coloring), causal (light cones), fca-lambek-circle.` },
  { key: 'holofoam-life', model: 'sonnet', prompt: `Map Holofoam (${HOLO}: README.md, src/*.mjs, scripts/, test/). It is a deterministic laboratory of organisms acting on a shared field, composing SignStuff. What are organisms, genomes (SignChain rules), sensing (SignCells), policies (settleCells), selection/mutation/adoption, field rules, replay-as-history? How alive is it really — is there reproduction, metabolism, membranes, differentiation? Where could a predication-AI "foam" live inside or beside it?` },
  { key: 'lean-theory', model: 'sonnet', prompt: `Map what the Obsmetrologia Lean theory (${LEAN} and ${LEAN}.lean; subdirs Language, Dynamics, AperiodicOrder, Closure, Calculus, Cohomology, Site, Primitive, Articulation, Settlement.lean) ACTUALLY proves that is relevant to a predication-AI: FOUR / bilattice laws, nuclei and FiberAlgebra, Dynamics/Flow/FreeEnergyLyapunov (H-theorem for settlement), closure regimes, aperiodic order, language (look for anything on Lambek, grammar, light cone, cone, bead, tile). Use grep over .lean files for theorem/lemma/def names; note sorry/axiom usage. Report the 20-40 most load-bearing theorems by name with file and one-line meaning, and what is NOT proven but claimed elsewhere.` },
  { key: 'theory-fca-chl', model: 'fable', prompt: `Read the house theory of FCA and Curry–Howard–Lambek and distill what is genuinely ours (beyond textbook). Sources: ${REL}/docs/formal-concept-analysis.md, ${REL}/docs/fca-lambek-circle.md, ${REL}/docs/lambek-calculus.md, ${REL}/docs/residuated-*.md (if present), ${REL}/docs/four-charge-algebra.md, ${REL}/docs/predication-fiber-logic.md, ${REL}/docs/learning-cycle.md; ${AGENCY}/notes/2026/05/02/2026-05-02-knowledge-systems-theories-formal-concept-analysis-prose-learning-fca-against-the-predicated-substrate.md; ${MATHART}/research-articles/curry-howard-lambek-language-cone-proof-pathing-yoneda-inventory.md; ${MATHART}/notes/undated/research-curry-howard-lambek-quartet.md; ${AGENCY}/research/predicated-agentic-orchestration-platform/library/relational-hyperverse-repository/math/curry-howard-lambek-quartet.md and -tetrad.md. Grep more if needed. What is the "FCA–Lambek circle"? How do concept lattices, residuated lattices, Lambek grammars and proofs-as-programs fit into ONE picture where a sentence is a proof and a concept is a type?` },
  { key: 'theory-tiles-beads', model: 'fable', prompt: `Read the house theory of tile coloring / aperiodic order and of beadwork / weaving, and distill what is genuinely ours. Sources: ${OBS}/content/text/documents/articles/notes/2026/06/26/2026-06-26-survey-of-beadwork-mathematics.md; ${OBS}/content/text/documents/articles/notes/2026/06/27/2026-06-27-beadwork-as-finite-observable-of-aperiodic-order.md; ${G561}/2026/10/02/2026-10-02-note-on-the-two-hands-and-the-glass-bead-game.md; ${G561}/2026/08/16/2026-08-16-note-on-561-group-as-meme-beadworkers.md; ${OBS}/content/text/documents/articles/notes/2026/06/22/2026-06-22-jeandel-rao-aperiodicity-certificate-program.md; ${PERSONAL}/2026/06/18/2026-06-18-reference-on-sofic-shift-receipts.md; ${PERSONAL}/2026/06/18/2026-06-18-reference-on-substitution-dynamics.md; ${REL}/docs/{sofic-shift,jeandel-rao-witness,aperiodic-classification,substitution-dynamics}.md; grep for "aperiodic germ", "tiling-constraint", "chromatic" notes under ${SCI}. How do Wang-tile matching rules, sofic shifts, substitution, and bead weaving (row-by-row, two hands, finite observable of an infinite aperiodic order) give a model of GENERATION — producing the next row/token so local constraints are satisfied while global order stays aperiodic (non-repeating, creative)?` },
  { key: 'theory-lightcones', model: 'fable', prompt: `Read the house theory of light cones and distill what is genuinely ours. Sources: ${COSMO}/light-cone-predicate-category.md, ${COSMO}/inference-sub-settling.md, ${COSMO}/horizon-bounds-knowledge-order.md; ${OBS}/content/text/documents/articles/notes/2026/09/21/2026-09-21-note-on-the-axiom-law-spine-lineage-and-the-light-cone.md; ${OBS}/content/text/documents/articles/notes/2026/06/26/2026-06-26-survey-of-light-cone-frontiers.md and 2026-06-26-recommendations-for-lightcone-red-nodes.md; ${LING}/services/obsmetrological-linguistics-services-section/content/text/glossary/terms/language-light-cone.md; ${MATHART}/research-articles/lorentzian-lightcones-and-causality.md; ${MATHART}/research-articles/curry-howard-lambek-language-cone-proof-pathing-yoneda-inventory.md. How do past cones (premises, evidence that can reach an event), future cones (consequences), horizons (what cannot be known yet), causal diamonds and causal sets organize INFERENCE and LANGUAGE (a "language light cone")? What is the relation to the knowledge order of FOUR?` },
  { key: 'theory-foam-life-language', model: 'fable', prompt: `Read the house theory of foam, artificial abiogenesis and the language surface, and distill what is genuinely ours. Sources: ${SCI}/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-foam-settling-simulation.md; ${SCI}/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-what-the-foam-knows.md; ${SCI}/content/text/documents/articles/notes/2026/07/26/2026-07-26-note-on-foam-as-a-field-of-actor-models.md; ${SCI}/content/text/documents/articles/notes/2026/07/25/2026-07-25-note-on-the-structure-of-game-foam.md; ${SCI}/services/natural-science-services-section/services/biological-science-services-section/content/text/documents/articles/notes/2026/10/01/2026-10-01-artificial-abiogenesis-smartgoo-research-program.md; biomimetic semiotics notes under ${SCI}/services/information-science-services-section/services/semiotics-science-services-section (grep); relconlang under ${LING}/content/data/relconlang and ${LING}/content/text/documents/articles/notes/2026/10/01/questions/. What does "the foam knows"? How do settling, cells-as-bubbles, membranes, autocatalysis and a relational constructed language (relconlang) combine into a picture of a living language-and-inference medium?` },
]

phase('Map')
const maps = (await parallel(READERS.map(r => () =>
  agent(`${CONTEXT}\n\nYOUR AREA (${r.key}):\n${r.prompt}\n\nReturn a dense, precise structured map. Prefer 8-25 abstractions. Paths relative to repo root /home/emsenn/bare-cedar-fog.`,
    { label: `map:${r.key}`, phase: 'Map', schema: MAP_SCHEMA, model: r.model })
    .then(m => m ? { key: r.key, ...m } : null)
))).filter(Boolean)
log(`${maps.length}/${READERS.length} maps returned`)

const MAPTEXT = JSON.stringify(maps, null, 1)

const VISION_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    oneLine: { type: 'string' },
    image: { type: 'string', description: 'the physical/biological picture: what the medium is, what lives in it, how it moves' },
    mathematics: { type: 'string', description: 'the precise mathematical objects and laws (FCA, CHL, tiles, cones, beads, FOUR, sheaves, settlement), with the exact correspondence table: physical thing <-> math object <-> existing code (file/function)' },
    cycle: { type: 'string', description: 'the computational cycle: perceive -> infer -> generate -> learn -> reproduce, step by step, each step as an operation on the math objects' },
    languageSurface: { type: 'string', description: 'how it reads and writes language (tokens, sentences, dialogue); why a sentence is a proof/a weave/a tiling row' },
    whyNewClass: { type: 'string', description: 'what it can do that transformers/LLMs structurally cannot (and vice versa: honest limits)' },
    minimalKernel: { type: 'string', description: 'the smallest buildable kernel (in JS on top of SignStuff + metrologic) that demonstrates the core claim, with module names per layer data/code/networking/systems' },
    experiments: { type: 'array', items: { type: 'string' }, description: 'falsifiable experiments with measurable outcomes' },
    theoryImprovements: { type: 'array', items: { type: 'string' }, description: 'how this vision IMPROVES the house theory of FCA/CHL/tiles/cones/beads (new definitions, conjectures, theorems to prove in Lean)' },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'oneLine', 'image', 'mathematics', 'cycle', 'languageSurface', 'whyNewClass', 'minimalKernel', 'experiments', 'theoryImprovements', 'risks'],
}

const LENSES = [
  { key: 'foam', lens: `FOAM PHYSICS. The model is a literal foam: cells are bubbles (FCA formal concepts / SignCells), films are shared attributes, Plateau borders are where three concepts meet. Coarsening (von Neumann–Mullins law: a 2D cell's area changes at a rate proportional to (sides − 6)) is learning: small unsupported concepts shrink and vanish (T2 events), neighbor swaps (T1 events) are rewrites/inference steps. Pressure = evidence, surface tension = description length/disagreement energy, drainage = settlement flux. Inference is relaxation to a Plateau-law-satisfying equilibrium; generation is shearing/flowing the foam. Make it precise.` },
  { key: 'multicellular', lens: `MULTICELLULAR DEVELOPMENT AND SELF-ASSEMBLY. The model grows like an embryo: a zygote (seed context) divides; each cell carries the same genome (a SignChain rule basis / Duquenne–Guigues basis) but differentiates by local signals (its past light cone of received evidence); tissues are concept sublattices; morphogen gradients are sheaf heat flow; apoptosis is T2/settlement refusal. Connect to Winfree's abstract Tile Assembly Model (self-assembling Wang tiles are Turing-universal: tiles attach where glue strengths match, temperature threshold), Levin's bioelectric pattern memory, and Turing reaction–diffusion. Thinking = growing a body of proof.` },
  { key: 'loom', lens: `THE LOOM / BEAD WEAVING ACROSS LIGHT CONES. Generation is weaving: each new row of beads (a token, a cell layer) is chosen so every bead satisfies Wang-style matching rules with the beads in its past light cone (the previous rows it can causally see). The two hands are the two FOUR lanes (evidence for / evidence against) or the two adjoints of a Galois connection. The pattern must stay aperiodic (creative, non-repeating) while locally lawful (grammatical, valid) — the sofic-shift / substitution picture. Discourse is a causal set; a dialogue is two weavers sharing a fabric edge. Every bead is a proof term (CHL). Make the weave the language model.` },
  { key: 'chemistry', lens: `ARTIFICIAL CHEMISTRY / ABIOGENESIS OF PROOFS. Molecules are typed terms (CHL: proofs are programs are morphisms); reactions are composition/cut (Fontana–Buss AlChemy: lambda-calculus chemistry where collisions are applications), Lambek-grammar reductions, FCA closure. Autocatalytic sets (Kauffman RAF sets) are self-sustaining theories: a set of propositions whose derivations catalyze each other. Membranes are FCA concept extents / sheaf sections that bound a reaction compartment. Metabolism is settlement flux (the free-energy ledger). Evolution selects theories that persist. Language is the exchange of molecules between protocells. A whole new AI = a primordial soup that abiogenesis-es into a knowing organism.` },
  { key: 'categorical-cosmos', lens: `CATEGORICAL COSMOS / PREDICATION ALGEBRA ENGINE. Take Curry–Howard–Lambek with full seriousness: the model IS a (residuated, FOUR-enriched, paraconsistent) category; objects are FCA concepts (types), morphisms are proofs/programs/derivations, sentences are Lambek-calculus derivations, and the light-cone order is the causal/temporal structure of a discourse (a site/sheaf over a causal set). Generation is proof search with a Gibbs measure over the enabled cone; learning is inducing the implication basis and residuating weights exactly (no gradients). Tiles are the local typing rules; beads are the normal forms. Design the predication-algebra model as a new AI, with the clearest possible mathematics and the hardest-nosed honest comparison to LLMs.` },
]

phase('Imagine')
const visions = (await parallel(LENSES.map(L => () =>
  agent(`${CONTEXT}\n\nYou are a visionary theorist-engineer. Here is the full map of what exists (code and house theory), produced by the reading team:\n\n<maps>\n${MAPTEXT}\n</maps>\n\nYOUR LENS: ${L.lens}\n\nImagine the next-generation AI through this lens — wildly ambitious yet mathematically exact and grounded in what actually exists in the maps (cite files/functions). It must USE AND IMPROVE the house theory of FCA, CHL, tile coloring, light cones and weaving beads — all five, not just your lens's favorite. Think like complex multicellular foam physics: abiotic, digital, organic. Be honest about what is metaphor vs mechanism. You may read further files in the repo to ground claims. Do NOT edit files.`,
    { label: `imagine:${L.key}`, phase: 'Imagine', schema: VISION_SCHEMA, model: 'fable' })
    .then(v => v ? { lens: L.key, ...v } : null)
))).filter(Boolean)
log(`${visions.length}/${LENSES.length} visions returned`)

const VISIONTEXT = JSON.stringify(visions, null, 1)

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    judge: { type: 'string' },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lens: { type: 'string' },
          score: { type: 'number', description: '0-10' },
          strongest: { type: 'string', description: 'the single idea most worth keeping' },
          fatal: { type: 'string', description: 'the most serious flaw (mathematical error, unbuildable, merely-metaphor, relabelled transformer, violates layering)' },
        },
        required: ['lens', 'score', 'strongest', 'fatal'],
      },
    },
    graftPlan: { type: 'string', description: 'how to combine the best ideas into one coherent architecture' },
    mathErrors: { type: 'array', items: { type: 'string' } },
  },
  required: ['judge', 'scores', 'graftPlan', 'mathErrors'],
}

const JUDGES = [
  { key: 'theory', lens: 'THEORETICAL SOUNDNESS AND NOVELTY: Is the mathematics correct (FCA closure/Galois laws, residuation, Lambek calculus, CHL, Wang tiles/sofic shifts, causal order, FOUR bilattice, sheaf cohomology)? Is it genuinely a new class of AI or a transformer/GNN/Hopfield net/expert system with new names? Does it IMPROVE the theory (new definitions, provable conjectures)?' },
  { key: 'engineering', lens: 'BUILDABILITY ON WHAT EXISTS: Can it be built in JS on SignStuff + metrologic without reimplementing them, respecting data -> code -> networking -> systems layering? Is the minimal kernel truly minimal and does it reuse the existing inference class (algebra/network/learn/generate/nuclei/adapt)? Which parts are unbuildable or would need a rewrite? What are the complexity/scaling walls?' },
  { key: 'empirics', lens: 'EMPIRICAL FORCE: Would the minimal kernel actually DO something impressive and measurable — read and write language, infer, generalize from few examples, explain itself, stay consistent under contradiction — and are the experiments falsifiable with clear baselines? Which vision would produce the most convincing first demo?' },
]

phase('Judge')
const scores = (await parallel(JUDGES.map(J => () =>
  agent(`${CONTEXT}\n\nYou are a hard-nosed judge. Score each of these visions 0-10 through your lens.\n\nYOUR LENS: ${J.lens}\n\n<maps>\n${MAPTEXT}\n</maps>\n\n<visions>\n${VISIONTEXT}\n</visions>\n\nYou may read repo files to check claims. Do NOT edit files.`,
    { label: `judge:${J.key}`, phase: 'Judge', schema: SCORE_SCHEMA })
))).filter(Boolean)

const SCORETEXT = JSON.stringify(scores, null, 1)

phase('Synthesize')
const visionDoc = await agent(`${CONTEXT}\n\nYou are the lead visionary. Synthesize ONE unified architecture for the next-generation AI from the visions below, guided by the judges' scores and graft plans: take the highest-scoring core, graft the strongest idea from each other vision, fix every math error the judges named, and drop what the judges showed to be mere metaphor or unbuildable. It must use and improve FCA, CHL, tile coloring, light cones and weaving beads — each with a precise, load-bearing role (not decoration) — and be literally a multicellular foam: an abiotic digital organism.\n\n<maps>\n${MAPTEXT}\n</maps>\n<visions>\n${VISIONTEXT}\n</visions>\n<judges>\n${SCORETEXT}\n</judges>\n\nWrite the result as a single Markdown document (return the markdown as your final text, nothing else), titled with the architecture's name, with sections: 1. The organism (the image, in plain language) 2. The mathematics (definitions, laws, the correspondence table physical <-> math <-> code) 3. The life cycle (perceive / infer / generate / learn / divide), each as exact operations 4. Language (reading and writing; a sentence as proof, weave row, tiling) 5. Why this is a new class (and honest limits vs LLMs) 6. Theory improvements (new definitions, conjectures, Lean theorem targets in Obsmetrologia) 7. The minimal kernel per layer (data/code/networking/systems) 8. Experiments (falsifiable, with baselines) 9. Open problems. Be exact; cite files. Do NOT edit files.`,
  { label: 'synthesize:vision', phase: 'Synthesize', model: 'fable' })

const BLUEPRINT_SCHEMA = {
  type: 'object',
  properties: {
    packageDecision: { type: 'string', description: 'where the new code lives: which existing packages get new modules, or a new package; justify against layering; NEVER modify files that have uncommitted changes unless unavoidable' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'repo-relative path of the new file' },
          layer: { type: 'string', enum: ['data', 'code', 'networking', 'systems', 'demo', 'theory'] },
          purpose: { type: 'string' },
          api: { type: 'string', description: 'exported functions with signatures and JSDoc-level contracts' },
          reuses: { type: 'array', items: { type: 'string' }, description: 'existing modules/functions it imports (exact import specifiers)' },
          dependsOnModules: { type: 'array', items: { type: 'string' }, description: 'paths of other NEW modules it imports' },
          acceptance: { type: 'string', description: 'what a runnable check/demo must show for this module to count as done' },
        },
        required: ['path', 'layer', 'purpose', 'api', 'reuses', 'dependsOnModules', 'acceptance'],
      },
    },
    milestones: { type: 'array', items: { type: 'string' } },
    demo: { type: 'string', description: 'the end-to-end demo script: what it runs, what it prints, why that is convincing' },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['packageDecision', 'modules', 'milestones', 'demo', 'risks'],
}

const blueprint = await agent(`${CONTEXT}\n\nYou are the lead engineer. Turn this architecture into an exact build blueprint on top of SignStuff (${SS}) and metrologic (${MET}). Read the actual package.json exports and module signatures you will import (verify every import specifier resolves — check the package.json "exports" maps and node_modules links). Respect data -> code -> networking -> systems: new data-layer pieces go beside SignCell/metrologic-level code, code-layer beside SignChain, networking beside SignGraph, systems beside SignCraft — or argue for a new package (e.g. under ${SS}/) if that is cleaner, wiring it into the pnpm workspace only if needed. Many files in signstuff have UNCOMMITTED changes by someone else (run git status on ${SS}): plan new files only, plus at most package.json "exports" additions. Plan 8-20 modules max for a first kernel that runs end-to-end on a small real corpus (e.g. the relconlang data under ${LING}/content/data/relconlang, or a tiny English corpus you specify) and an end-to-end demo script. Order modules so each can be implemented after its dependencies.\n\n<architecture>\n${visionDoc}\n</architecture>\n\n<maps>\n${MAPTEXT}\n</maps>\n\nDo NOT edit files.`,
  { label: 'synthesize:blueprint', phase: 'Synthesize', schema: BLUEPRINT_SCHEMA, model: 'sonnet' })

return { maps, visions, scores, visionDoc, blueprint }

```

