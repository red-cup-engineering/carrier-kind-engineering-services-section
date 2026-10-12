---
title: TAB Reference — voidmath, MUDs, and their synthesis
date-created: 2026-05-31
author: Claude-Opus-4.8
status: distilled reference (read this instead of re-deriving)
---

# TAB Reference: voidmath, MUDs, and their synthesis

Plain factual reference.
Sections 1–2 are facts about things that exist (voidmath as built; MUDs as a studied form).
Section 3 is the synthesis and the design stance for TAB (claims to act on, not code that exists yet).
Section 4 is repo location facts.

## 1. voidmath (the kernel TAB builds on)

Location: `development/active/voidmath`.
Run `node tests/run-kernel-tests.mjs` (31/31 pass).

- The only primitive is the **utterance**: an ordered pair `[token, claim]`.
  Token is slot 0, claim is slot 1; each is a JSON Schema 2020-12 document.
  The 2020-12 meta-schema self-validates, so the recursion has a floor.
  Every other object is arrays/objects of prior schemas rooted in this pair.
- Every object is a JSON Schema; every morphism is a script; a thing's directory path (its URI) is its categorical coordinate.
  The directory tree is the type language.
- The **descent** settles an utterance to a finite fixed point through four generators, each living *inside* the category the previous one generates (nested, not parallel): `articulate → predicate → posit → settle`.
- The four regimes are four **closure-rule ordinals**, each constructing a distinct body of mathematics: aperiodic = MLD (aperiodic order); transfinite = HTT; scott-continuous = category theory; finite = algebra.
  Any given known mathematics is constructed within exactly one of these four ordinals.
- **Aperiodic (`articulate`):** wraps the utterance into a cell `[carrier, [token-slot, claim-slot]]`.
  A slot is empty `[]` or singleton.
  The four cell phases are the 2×2 of slot-presence: potential `[[],[]]`, active `[[t],[]]`, stable `[[],[c]]`, absurd `[[t],[c]]`.
  Fregean reading: object = token, concept = claim (the open gap), subject = the act = the open slot.
  The predication monad: `saturate` (μ) fills the object-slot (potential→active); `transfer` (η) reopens it, discarding the object (non-injective); `twistor` is the non- invertible unit, whose residue is the unsaturated concept, which descends.
- **Transfinite (`predicate`):** forms the cell-set **Φ = E×Π×E** (E from the saturated object, Π from the descended concept).
  A cell is an oriented `(subject, predicate, object)` triple.
  Adds a value-free fiber over a predicate-category with four generator families: specialization (is-a), converse (involution swapping subject/object), subject-projection, object-projection.
- **Scott-continuous (`posit`):** value enters as the **bilattice charge** `[positive-slot, negative-slot]`, each empty/singleton — the Belnap four values ⊥ / positive / negative / ⊤ (the same 2×2 object as the cell phases).
  Packages the fiber as a presheaf with a knowledge-monotone trace.
  Modal pair: `possibilize` (◇, knowledge-join) ⊣ `necessitate` (□, knowledge-meet).
- **Finite (`settle`):** iterates the closure `possibilize ∘ necessitate` to its unique knowledge-least fixed point (unique because ◇□ = □◇).
  The glued result is the sheaf (H¹ = 0, no residue).
  This is the bottom of the descent.
- The descent is a **residue-cascade**: each regime saturates one gap and passes the next as residue.
  The coherences `twistor`/`cohere`/`commutate` are the same comparison 2-cell re-run over a richer carrier (token → relation → charge), non-invertible at the top two joints and invertible at the bottom (the bilattice forces it), which is why the residue drains to zero.
- **The metacircle:** a morphism run is an EAVT row `{e, a, v, t}` appended to the codomain's log (`witness-run`).
  A node's log is its arrows-in (Yoneda).
  A node's value is `project = settle(fold(log))`, written as its `.schema.json`.
  So **schema = settle(fold(log))**.
  A type, a morphism, and an instance are the same kind of node.
  `project` outputs an enum of the witnessed objects — the data- bearing finite shadow of the log, not a generalization over it.
- State is **read (folded), never stored**.
  The log is append-only (a G-Set CRDT); dedup is on read by content hash (RFC-8785 JCS sha256).
- **Charge is read from data, not stored:** a present field is positive; schema- negativity (`additionalProperties:false`, `not`) is negative.
- A document's fields are already cells: each key a predicate, each value an object.
  A value that is itself an object is itself a cell-set (recursion).
  So every object is its own Φ — the structure is **fractal**; every node runs its own descent.
- Bilattice operations: `join-knowledge` = componentwise OR; `meet-knowledge` = componentwise AND; `join-truth` = OR-positive / AND-negative; `negate` = swap the two slots; `compare-knowledge` = subset-of-marks partial order. positive ⊔ negative = ⊤.
- Two closures are distinct and cannot be merged. **Quantifying along the base** (∃ = pushforward / ∀ = pullback over specialization edges) is a transfinite, value-free operation that moves charge between related predicates. **`settle`** (scott, per-cell modal closure) never consults the base.
  Contradiction (H¹ ≠ 0) appears only by closing charge along the base, surfacing a cell at knowledge-⊤; it lives in the fiber (the charges), not the base (the vocabulary's roles always agree).
- A node advances itself in time by **self-articulation**: the utterance `[token = state-now, claim = state-next]`.
  There is no separate world-clock mechanism; "the next step" is the node uttering its own next state.
- Status: proven on singleton seeds.
  Multi-cell Φ scales (demonstrated in `development/experimental/playground`: a ~4M-cell grid settles in ~0.5 s; settle- time tracks reading, not grid size).
  The quantifying base-closure is prototyped in the playground but not yet in the kernel.

## 2. MUDs (multi-user dimensions, as a studied form)

- A MUD is a persistent, shared, text-mediated world inhabited through language.
  Minimal essence: (a) the world is read as prose (second-person present),
  conjured in the player's imagination; (b) place is a graph of discrete rooms
  joined by named exits, with no coordinates or metric; (c) players are embodied
  and co-present; (d) it is real-time and concurrent.
- A MUD is constituted by its community as much as its code. A persistent social
  world generates real social facts: norms, governance, harm, belonging (Curtis,
  "Mudding," 1992; Dibbell, "A Rape in Cyberspace," 1993).
- Bartle's player taxonomy: Achievers, Explorers, Socializers, Killers. A world
  balances populations that hold one another in tension (Bartle, "Designing
  Virtual Worlds").
- Three design lineages: **Diku/Aber** (combat, levels, loot — the gauntlet;
  ancestral to the MMO industry); **LPMud** (the mudlib/driver split — the world
  is programmable from inside); **TinyMUD/MOO/MUSH** (social and built — players
  make and program the world).
- Standard architecture: a command parser (verb-object grammar) over a line
  protocol (telnet); a world of rooms + exits + objects + mobs; a tick/heartbeat;
  most MUDs persist players but reset the world.
- Chronic problems of the form:
  1. **Consequence-lessness:** the world resets and respawns; player actions do
     not persist or matter.
  2. **Persistence-vs-fairness:** a truly persistent world is exhausted by the
     first players, so designers reset it — which causes #1.
  3. **Identity/duplication:** no principled notion of when two things are the
     same thing; duplication bugs.
  4. **Author/player divide:** builders make the world, players consume it; co-
     creation is rare.
  5. **Simulation-depth vs playability:** rich simulation tends toward tedium,
     playable worlds toward cardboard.
  6. **Partial/stale perception:** a player's world-knowledge is reconstructed
     from scrollback — partial and delayed.
  7. **Spatial coarseness:** a room is undifferentiated; there is no intra-room
     position.
- Problems #6 and #7 are essential properties of the text-MUD form (the imagined,
  partial world is the art), not defects to remove. Problems #1–#5 are failures of
  the world's ontology of state and authorship.

## 3. A MUD in light of voidmath (synthesis; TAB design stance)

- A MUD and voidmath share their atom: both are made of utterances (language acts
  about things). A MUD is therefore the lowest-impedance game for voidmath; a
  graphical game would demand modeling (space, physics, rendering) voidmath does
  not do.
- A MUD command (verb + object) is a Fregean predication cell: the player is the
  act/subject, the verb is the unsaturated concept, the object is the saturated
  token.
- A MUD world-state is a set of `(subject, predicate, object)` facts = Φ.
  Relations include located-in, exit-to, contains, wields, is-a. Containment
  chains (room ⊃ chest ⊃ coin) are the object-as-cell-set recursion. is-a is the
  specialization generator; paired relations (contains / located-in) are converse.
- Each thing — the world, a player, an item — is a node with its own descent
  (fractal). A player is a node, not a special record type.
- Partial observation maps to the four-valued charge: from one player's view a
  fact is unknown (⊥), true, false, or contradictory (⊤). ⊥ ≠ false: "you see
  nothing special" is unknown, not absent — the substrate of hidden objects and
  lies. The server's authoritative state is the sheaf gluing all partial views
  (H¹ = 0 = consistency; a desync is H¹ ≠ 0). This is the same gluing as CRDT
  convergence.
- Decisive design fact: making the world **be its history** (append-only log +
  `project = settle(fold(log))`) rather than storing mutable state cures or
  reframes the ontology-of-state problems:
  - #1 (consequence): an append-only world cannot reset; every act permanently
    changes the world's projection. Consequence becomes the default.
  - #3 (identity): a thing is its log-address; two things are the same iff they
    share a log; a copy is a new log; race-duplication cannot occur.
  - #4 (authorship): to act is to witness rows that project into the world; to
    play is to write the world; there is no author-time/play-time split.
  - #2 (fairness): renewal (repop, regrowth, seasons) must be authored as the
    world articulating its own next state into the log, not a silent reset.
    Scarcity is otherwise permanent.
  - #5 (depth): state is read on demand, so unobserved simulation depth costs
    nothing to maintain.
- The math models world-state only. It does not model the prose (room
  descriptions, voice) or the community (channels, reputation, governance). Those
  remain authored language and emergent social life that the substrate serves and
  must not replace.
- TAB design priorities: (P1) lead with consequence — "a world that remembers
  everything and never resets." (P2) Renewal is authored, never a silent reset.
  (P3) Co-authorship is native, designed with social governance in mind (a world
  that records everything also records harm). (P4) Preserve four-valued partial
  perception and authored prose.
- Open design questions: the economy of a never-resetting world (how scarcity
  stays playable via authored renewal alone); what death is in a log-world
  (whether permadeath is the only honest death); where the social substrate
  (channels, identity, reputation, governance) lives, and whether players' own
  descents are where knowledge-of-others and reputation accrue.

## 4. Repo locations

- All prior MUD codebases are collected under `development/lab/archive/multi-user-dungeon/`, bucketed by class then language: `tab/{elisp,fennel,javascript,python,racket,docs,variants,worlds,...}
  ` and `qtops/racket/`.
  The nearest ancestor of TAB is the EAVT snapshot `multi-user-dungeon/tab/javascript/tab-2026-05-25`.
- Across these codebases the same engine shape recurs: schemaless things; noun/adjective term-addressing; behavior composed from qualities/systems rather than class trees; commands decoupled from effects via a scheduled loop; world as a relational on-disk substrate; worlds kept separate from the engine.
  In voidmath terms these are hand-derivations of: schema = settle(fold(log)); loci/URIs; is-a-as-morphism; witness/project; Φ on disk; engine-as-descent vs world-as-utterances.
