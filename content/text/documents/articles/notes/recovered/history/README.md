# notes — theory of computing, concurrent game systems & agentic drone swarms

Reference theory and study notes for `@561-group/computer`. These are **research notes**, not
normative specs — they are the deep-theory background for what the OS and its game apps (`tab`,
`ruinfold`, `aletheon`) are doing. They fall in two groups: (1) the **category-theory-of-computing**
notes below, each a journal entry dated 2026-05-24 copied verbatim from the archive (provenance at
the foot of this file); and (2) the **agentic drone swarm** study notes, fresh syntheses distilled
from `theories/agency/` and the archive (their own section, mid-file).

The connective claim these notes make (in their own words): computational predicates settle to
one of four truth values — verified `t`, refuted `f`, undecidable `⊥` (forced by Rice), or
contradictory `⊤` — forming the bilattice **FOUR ≅ 2×2**. That FOUR is exactly the kernel's
charge coordinate (`@561-group/math/chu/four`, `@561-group/math/bilattice/charge`). So these
notes are the upstream theory for the floor `math` already implements.

## General / abstract theory of computing

- `what-is-the-theory-of-computing.md` — the framing question: what mathematical structure *is*
  computation (Curry–Howard–Lambek). Leading answer: the **effective topos** Eff, the
  realizability topos over Kleene's first algebra K₁.
- `what-are-the-subtheories-of-computing.md` — companion question on subtheories.
- `effective-topos.md` — Eff: elementary topos, intuitionistic internal logic, proves
  Church–Turing as a *theorem*; FOUR is the image of Ω under the double-negation nucleus.
- `partial-combinatory-algebra.md` — PCA: the applicative structure realizability is built over.
- `kleene-first-algebra.md` — K₁, the canonical PCA for discrete computation.
- `dialectica-category.md` — de Paiva's Dialectica categories (carries Eff via !-Kleisli).

## Concurrent computing / concurrent game systems

- `prime-event-structure.md` — Winskel event structures: events with Player/Opponent polarity,
  causality as partial order, irreflexive-symmetric conflict. The substrate for true-concurrency.
- `concurrent-game-category.md` — concurrent strategies on event structures with symmetry
  (Rideau–Winskel 2011; Castellan–Clairambault–Winskel 2014/2017); a *-autonomous category.
- `concurrent-game-system.md` — the *system* reading: a game-system whose plays are concurrent
  strategies; hosts sub-systems for sequential (Hyland–Ong PCF), nominal (ν-calculus),
  session-typed (Caires–Pfenning, Wadler), and Dialectica-image computation.
- `dialectica-to-concurrent-game-category-functor.md` — the functor connecting the two.
- `ludics.md` — Girard's ludics (loci, designs, behaviours; interaction as cut).

## Agentic drone swarm systems (study notes, distilled from `theories/agency/` + archive)

A second set of notes, distilling the repository's own research on **agentic systems, drones, and
drone swarms** (the deep `theories/agency/.../drone/swarming/library/swarm/` subtree and archive
material) as a source of **features and design ideas** for the OS. These read the machine — per
`../journal/2026-06-04-what-kind-of-computer-this-is.md` — as a paraconsistent, linear, aperiodic,
coordination-free, multi-observer substrate, i.e. a drone-swarm operating system. Unlike the
category-theory notes above, these are *not* verbatim archive copies; they are fresh syntheses that
cite the source files and keep their own inference visibly marked **[INFERENCE]**.

- `agentic-drone-swarm-systems.md` — **lead note.** What an agent / drone / drone swarm *is* in the
  corpus's terms (embodied handedness = Player/Opponent in CGS; swarm = multi-observer system over a
  shared cell-graph; the speaking/doing/learning triad on the truth/knowledge/evidence axes); the
  aperiodicity-makes-the-swarm-tractable finding; the swarm-vs-orchestration dichotomy and the
  ~4-agent saturation wall; the full mapping onto the OS's existing kernel primitives.
- `stigmergy-environment-trace-fields.md` — stigmergy as the coordination mechanism (Grassé 1959),
  the environment-trace field $E_t : L \to V$, pheromone trails, and the $O(N+|L|)$ cost-decoupling
  theorem — distilled as the append-only EAVT trace read as a (qualitative, monotone, paraconsistent)
  stigmergic field.
- `multi-observer-settling-and-consensus.md` — multi-observer systems, network-sheaf consensus on
  agent graphs ($H^0$ = consensus, disagreement = $\top$), CRDT/CALM coordination-freeness, and the
  open cross-substrate federation cohomology — distilled as the OS's "no lock, no clock, hold the
  contradiction" merge.
- `swarm-governance.md` — recognition-based (not office-installed) authority, plural/pluggable
  governance ($\mathbf{Gov}$), the tiyóšpaye-is-an-agentic-drone-swarm reading (seven structural
  identities), and safety-as-cohomology dispatch gating.
- `continuous-learning-and-self-improvement.md` — programs that learn from their own use and rewrite
  their own forms. Distills the corpus's prior thinking (learning-as-closure-fixed-point, the
  continuous-learning loop, the agentive learning triad, dreams/abduction, Voyager/Reflexion/LATS) and
  the 2026-06-05 *audit-is-the-feature* + Horsetail journals into the self-improvement loop shape (run →
  log → audit the why → propose a rewrite → settle/test → adopt), why the append-only trace + linear
  evidence + $\top$-held-with-provenance is the right substrate, the swarm+LLM case, and the
  blast-radius / cohomology-gating caveat.

## Provenance

All files copied verbatim from the archive (not workspace members):

- The nine theory journals: `archive/2026/05/25/voidmath/…/<concept>/docs/dev/journal/2026-05-24.md`
  (deeply nested under the `transfinite-predication-category` / `predicate-category` articulation tree).
- The two computing questions:
  `archive/topical-archive/predication-categories/bucket-4/…/library/computing/questions/`.

These are reference copies for reading; edits belong in the archive originals, not here.
