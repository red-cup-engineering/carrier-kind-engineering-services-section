---
date: 2026-05-29
kind: derivation
status: authority-for-the-swarm/claude-code split
scope: development/experimental/swarm-intelligence + development/experimental/claude-code-harness
supersedes-rough-language-in: all prior lab work that conflated the descent stages with the regimes
---

# Genealogy: where swarm-intelligence ends and claude-code-harness begins

This is the authority every later move in the `swarm-intelligence` ↔ `claude-code-harness`
refactor cites. It does two things: (1) it **disambiguates two four-fold structures** that all
prior lab work conflated, and (2) it **derives** — by the generates-relation, not by preference —
which capabilities belong to the swarm substrate and which to the claude-code carrier. The result
is that `claude-code-harness` becomes a *thin wrapper by derivation*.

It does not edit `spotcomp/`. Where it leans on a spotcomp doctrine it cites the doc; it does not
restate or amend the spec.

## 0. The one rule

For any `X` / `Y`: ask *which has to exist for the other to exist?* That one is the **generator**;
it goes left/above. The other — produced by extension or restriction of the generator — goes
right/below. (Repo `CLAUDE.md`; spotcomp `PATH-TYPING.md`, `GENERATOR-VARIANCE.md`.)

## 1. Two four-fold structures, never disambiguated

Prior work — in the lab prose *and* in both packages' code — treated **one** four-fold thing.
There are **two**, and they are orthogonal.

**Axis A — the descent pipeline** `articulating → predicating → positing → settling`.
A *sequence of morphisms*: how a single utterance becomes a single settled cell. A **process /
path**. This is the **fibration / predication axis**; its obstruction is `H¹_top`. Its direction is
normative (spotcomp `SPEC.md` §4); it must not be run backwards.

**Axis B — the regime tower**
`strict-finite (κ<ω) < Scott-continuous (κ=ω) < transfinite-bounded (ω<κ<ω₁) < aperiodic (κ≥ω₁)`.
A *classification of closure orbits* by where the closure ordinal κ lands and whether `H¹`
vanishes. A **static property of a settling**, not a path. This is the **closure / temporal axis**;
its obstruction is `H¹_t`.

The rough language read `SPEC.md` §4's correspondence —

> articulating generates the *aperiodic* category · predicating the *transfinite* · positing the
> *Scott-continuous* · settling the *finite*

— as an **identity** (stage *i* = regime *i*). It is not a law. It is a **default correlation**:
the descent tends to lower closure complexity (articulating admits the most-open potential;
settling projects to a finite checkable frontier), but a *stage is a morphism* and a *regime is a
property of the resulting orbit*. An ordinary articulation can settle finitely.

**The two axes are the two strictly-commuting axes of the bigraded KZ-diamond**
(spotcomp `BIGRADED-DIAMOND-SWARMS.md`): a closure axis and a fibration axis whose 2-cells commute.
They are a **grid**, not a ladder. Collapsing the grid to a ladder — and then nailing that ladder
onto directory descent — is the single error propagated through the rough work.

## 2. Why only the aperiodic corner needs the outside

Strict and Scott-continuous regimes have `H¹ = 0`: their closure orbits are determined by countable
resources. Transfinite/aperiodic carry `H¹ ≠ 0`. Only `κ ≥ ω₁` cannot be completed with countable
resources — it needs generators not derivable inside the fibers.

An external LLM is therefore **not a settling and not a generator in the tree**. Per spotcomp
`IO-ARTICULATION.md`: "a completion is transport presentation," admitted **only** as
`utterance → articulating`. Model sampling is not closure; hidden context is not trace evidence
until admitted. **So the LLM / endpoint layer is a fungible, governed *skill* of the swarm
substrate — never an innate faculty of the conductor.** This is the load-bearing fact behind the
whole cut.

## 3. The generator → generated derivation

1. A **swarm** is `S = (Players, SharedTrace, Fed, Gov, Settle)` (spotcomp `MODELED-PLAYERS.md`
   §6). It *owns* federation, the shared trace, governance, the settling discipline, recognition —
   and the fungible inference enactors as governed skills.
2. **Claude Code is a modeled player** bound into the swarm (`binding-character-to-player`), holding
   a **recognized** conductor/leader **office** (`recognizing-an-agent-as-holding-office`) — derived
   from recognition + governance, *not* innate, and *one of the participants* (spotcomp
   `AGENTIC-EMBEDDING.md` §5: "optional leader only if the leader is one of the participants"). It is
   **inside** the swarm, not above it.
3. Its **handedness** is load-bearing (`MODELED-PLAYERS.md` §4): **inward** `recv`/`send` over the
   shared trace = recall / consensus / memory; **outward** `observe`/`actuate` over env + tools =
   sensing / body.
4. Therefore **swarm-intelligence has to exist for claude-code-harness to exist; the reverse is
   false.** `swarm-intelligence` is the generator (left/above). `claude-code-harness` is a generated
   carrier produced by **restriction**: `binding-character-to-player` + `recognition-of-office`. It
   *inherits* the regime machinery and the bigraded invariants; it may *re-host* only its own
   carrier-specific trace/witnesses. It is **thin by derivation**.

> **The conductor is itself derived.** "Conductor" is not primitive: it is one type of *character*
> (a χ-nucleus over a role), in one type of *swarm* restricted into an *ensemble*, operating under
> *orchestration* — **one object of the governance category `Gov`**, chosen for visibility, with
> siblings choreography / kyriarchical / kin-relational (wolakȟota, the 561 Group's own
> meta-governance). The full derivation and the built morphisms
> (`characterizing`/`forming`/`restricting`/`ensembling`/`governing`/`orchestrating`/`conducting`)
> are in [`ORCHESTRATION-GENEALOGY.md`](./ORCHESTRATION-GENEALOGY.md).

## 4. The cut

| capability | home | why (by the rule) |
|---|---|---|
| LLM inference, endpoints, API-key resolution | **swarm** | fungible governed skill; aperiodic-corner only (§2) |
| descent morphisms `articulating/predicating/positing/settling` | **swarm** | the foundational pipeline; both packages built it blind |
| `prompting`, `decoding`, SHP projection, context-spacesuit (load+render) | **swarm** | substrate morphisms |
| swarm study / consensus / MLD (`dispatch`, `responding`, `executing-runbook`, `studying`) | **swarm** | this is *what a swarm is* |
| outward sensing (`fetching-web`, `reading-file`) | **swarm** | the sensing hand's real reach |
| `learning`, `mutation`, `federation`, **memory** | **swarm** | governed change in settling = the swarm's discipline |
| the bigraded `dreaming` family | **swarm** | closure-discipline on the trace (§5) |
| MCP stdio server | **harness** | claude-code's *tool surface* — the carrier's restriction |
| the three live hooks (SessionStart/UserPromptSubmit/Stop) | **harness** | claude-code-specific IO boundary |
| capturing the Claude-native transcript | **harness** | claude-code-specific sense ingress |
| recognized conductor office + persona | **harness** | the restriction that *is* claude-code-as-conductor |
| cognitive-verb MCP names (`remember/wonder/imagine/ruminate/…`) | **harness, as thin shims** | the conductor's conscious vocabulary, *routing into* swarm capabilities |

## 5. Dreaming on the bigraded diamond — a declared coincidence, not a false proof

A dream is a closure operation run on memory **with the sensing input cut** (the swarm's
`dreaming-state-record`: sensory predicates disconnected, internal predicates continue composing).
Read on the diamond's two axes:

- **closure axis (`H¹_t`)** — how far the consolidation orbit runs: finite fixed point → ω-limit →
  past ω → can't-close-with-countable-resources.
- **fibration axis (`H¹_top`)** — whether the dream stays inside the existing fiber or extends it:
  same predicates/entities → new predicates → new entities/facts.

The four named dreams are **four cells on the diagonal of that grid**, not four rungs of a ladder:

| dream | closure κ | fibration | does | needs outside? |
|---|---|---|---|---|
| finite | <ω | fixed fiber | recombine known cells to a finite fixed point | no |
| scott-continuous | =ω | fixed fiber | join all evidence per cell (directed sup) | no |
| transfinite | ω<κ<ω₁ | **fiber extends** (new co-predicates) | grow predicate vocabulary | no |
| aperiodic | ≥ω₁ | **base extends** (new entities/facts) | channel genuinely new generators | **yes** |

This explains *why only the top corner touches the network*: not "because it's rung 4," but because
extending the *base* with generators not derivable from countable internal resources is exactly the
`κ≥ω₁ / H¹≠0` condition. The diagonal walks from (finite-closure, fixed-fiber) to (aperiodic-closure,
extended-base); the network is needed precisely where *both* axes max out.

**The harness's original placement of regime-named dreams at descent-stage directory depths was not a
false proof — it was an *undeclared coincidence*.** Because the diamond's two axes strictly commute,
the diagonal reads *both* ways (down the descent AND up the regime tower) and the two readings
**agree on-scope and diverge off-scope**. Both are categorically true. That fact is itself the
machinery worth having. The repair is to **declare** the coincidence theorem in the established
convention (`variance:"coincidence"` + `coincidenceTheorem` + journal, as used by `merging` and
`eavt-row`), per spotcomp `GENERATOR-VARIANCE.md` §4:

- **theorem name**: bigraded-diamond commutation — descent-depth placement of a dream coincides with
  its closure-regime placement.
- **scope**: where `H¹ = 0` (strict + Scott-continuous corners) the diamond's 2-cells are trivial and
  the two placements are interchangeable.
- **off-scope distinctness**: where `H¹ ≠ 0` (transfinite + aperiodic corners) the 2-cells are
  nontrivial; the descent reading and the regime reading come apart — the fiber/base extension is
  visible on the fibration axis but not recoverable from the closure axis alone, and vice versa.
- **audit representation**: dream invocations record the theorem citation; neither placement is
  rewritten as the other.

So `dreaming` is **one** swarm morphism — a closure-discipline on the trace — and the four dreams are
restrictions of it along *(κ, fibration-level)*. The harness keeps only **trigger** (the conductor's
conscious command to dream) and **consume** (carry the consolidated memory into the next waking).

## 6. Memory is Q-enriched, and the harness's weighting was a hack

Swarm owns memory. The harness's `sense > remembered-sense > learning` recognition-weighting was a
**hack** standing in for missing machinery. The proper machinery is **Q-enriched (quantale-valued,
"fuzzy") relevance** on memory cells: relevance becomes a value in a quantale `Q` rather than only a
bare value corner, and decay / persistence / promotion / dismissal become quantale operations over the
trace. This is not a bolt-on — the lab's Laplacian/MLD already lives on **Q-enriched cellular
sheaves** (spotcomp `MODULI-DESCENT-LAPLACIAN.md`), so making relevance quantale-valued *unifies*
memory with the consensus/dissent (`H¹`) machinery instead of grafting a provenance order onto the bare value.
The tier-order is retired; what it was approximating (sense persists, learning decays, conflict
surfaces) is recovered as quantale structure.

## 7. Honest obligations (the `hacking/` ledger for this split)

- The four-regime *names* are coinages aligned to the grammar; closure-ordinal proofs are gestured
  at, not proved. Anything claiming a regime placement without a κ-witness stays `hacking/`.
- The dream coincidence theorem cites the bigraded-diamond commutation; the commutation itself is
  asserted from `BIGRADED-DIAMOND-SWARMS.md`, not reproved here.
- `recognition-of-office` for the claude-code conductor uses the existing monotone recognition
  morphism; full recognition-cell settlement math is deferred (`hacking/` where it bites).
- Q-enriched relevance reuses/extends `memory` + `learning` + `mutation`; the choice of quantale and
  the Laplacian tie-in are stated as direction, with the concrete quantale a placement decision in
  Phase 3.
