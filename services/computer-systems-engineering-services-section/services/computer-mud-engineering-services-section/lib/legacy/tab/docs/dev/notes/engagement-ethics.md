---
name: engagement-ethics
description: The ethics of engagement — the compulsion-loop / Skinner-box / dark-pattern literature (variable-ratio reinforcement, Schüll's "machine zone," loot boxes, engagement-vs-well-being) set against an autonomy-supportive, honest-world design ethic, and the POSITION that tab's substrate makes the ethical path structurally natural. The world is a deterministic, inspectable, replayable/forkable log with no hidden state and ⊥ = honest ignorance, so the manipulation mechanisms (hidden RNG, concealed state, dependence-by-design, the player who can't leave) are largely unbuildable on it. FACTS from the critique kept apart from tab PROPOSALS and the stated tab stance.
---

# The ethics of engagement

`player-motivation` reads the *constructive* engagement literature — SDT, flow, Yee, presence — and maps the three needs onto tab morphisms.
This note reads the *critical* literature: the study of how engagement is manufactured against the player's interest, and the ethical line between *supporting* a need and *exploiting* it.
Then it takes a position.
Rigby & Ryan themselves draw this line — the same SDT lens that explains healthy engagement explains the unhealthy kind, as a *substitute* satisfaction that displaces real need-fulfilment (Rigby & Ryan, *Glued to Games*, 2011) — so the ethics is not a foreign import; it is the other half of the motivation theory.

As in the companion note, **theory-facts** (what the critique found) are kept apart from **tab-proposals** and from the **tab stance** (the position I argue for tab).
The stance is mine.

## Theory: how engagement is manufactured against the player

### Operant conditioning and the variable-ratio schedule

**Fact.** Skinner's operant conditioning showed that the *schedule* of reinforcement governs behaviour, and that the **variable-ratio schedule** — a reward delivered after an unpredictable number of responses — produces the highest, most persistent, most extinction-resistant rate of responding of any schedule (Skinner, *Schedules of Reinforcement*, Ferster & Skinner, 1957).
The slot machine is the canonical variable-ratio device, and "Skinner-box" mechanics is the term of art for game systems that borrow it: randomised rewards on an unpredictable schedule (drops, gacha, loot boxes) engineered to keep the response going regardless of the player's stated goals.

### Schüll's "machine zone" — design for dissociation

**Fact.** Natasha Dow Schüll's *Addiction by Design: Machine Gambling in Las Vegas* (Princeton UP, 2012), drawing on fifteen years of field research, documents how electronic gambling machines are *deliberately engineered* to pull players into the **"machine zone"** — a trancelike state in which time, money, social demands, and bodily awareness dissolve.
The design goal is not the win but **time-on-device**: once in the zone "gambling addicts play not to win but simply to keep playing … even at the cost of physical and economic exhaustion."
Schüll's key analytic move, borrowing Winnicott, is **perfect contingency** — complete alignment between an action and the machine's immediate response — which makes the zone possible.
The ethical charge is that the industry's metric (continuous time-on-device, "player productivity") is *structurally opposed* to the player's welfare: the machine is optimised to extract, not to serve.

### Compulsion loops, retention metrics, and engagement ≠ well-being

**Fact.** The free-to-play industry organises design around the **compulsion loop** (or core engagement loop): a short cycle of anticipation → action → reward → reinvestment, tuned to keep the player cycling, and measured by **retention** (D1/D7/D30 return rates), **session length**, and **daily active users** — proxies for time and spend, not for whether the time was well spent. **Fact.** Rigby & Ryan distinguish *engagement* from *well-being* directly: a game can be highly engaging (need-satisfying in the moment) while leaving the player *worse off* afterward, when the engagement is a thin substitute — obsessive passion rather than harmonious passion — that crowds out the autonomy it superficially supplies (Rigby & Ryan, 2011).
A retention metric cannot tell the two apart; it counts the return, not the reason.

### Dark patterns in game design

**Fact.** Zagal, Björk & Lewis ("Dark Patterns in the Design of Games," *Foundations of Digital Games* 2013, 39–46) name and catalogue **dark game design patterns** — patterns "used intentionally by a game creator to cause negative experiences for players which are against their best interests and likely to happen without their consent."
Their catalogue includes **grinding** (repeated tedious tasks that "cheat" the player out of their time), **appointment mechanics** (designs exploiting loss-aversion so the player must return on the game's schedule or lose progress — FarmVille's withering crops), **pay-to-skip / pay-to-win**, and **playing-by-appointment / social-pyramid** schemes that conscript the player's friends.
The common thread is a **conflict of interest** between creator and player resolved in the creator's favour, often via *concealment* (the player cannot see the mechanism acting on them).

### Loot boxes — the convergence with gambling

**Fact.** Zendle & Cairns ("Video game loot boxes are linked to problem gambling: Results of a large-scale survey," *PLOS ONE* 13(11), 2018, n = 7,422) found that the amount spent on loot boxes correlated with **problem-gambling severity**, and more strongly than spending on non-randomised in-game items — implicating the *gambling-like (variable-ratio, concealed-odds) feature itself*, not merely microtransaction spending.
Replications and adolescent samples reproduced the link.
This is the variable-ratio schedule, monetised, with the odds hidden — the Skinner box and Schüll's machine fused into a game mechanic.

### The synthesis the critique points to

**Fact / synthesis.** Across these sources the *mechanisms* of exploitative engagement share four structural ingredients:

1. **Hidden randomness** — a variable-ratio schedule whose odds the player cannot see (loot-box drop rates, slot RNG).
2. **Concealed state** — the system knows things about the player and the world the player cannot inspect (pity timers, difficulty rubber-banding, A/B-tested hooks, spend-based targeting).
3. **Dependence by design** — appointment mechanics and loss-aversion that make *leaving* costly, so the loop runs on the game's schedule, not the player's.
4. **A metric opposed to the player** — time-on-device / retention / spend as the optimisation target, structurally indifferent to whether the player is better off.

These four are the inverse of an *autonomy-supportive* design: one that gives the player genuine volition, full information, and the freedom to stop.
That inversion is the hinge of the position below.

## tab stance: an honest world, and why the substrate makes it natural

This is the position. **tab should adopt, as a deliberate design ethic, the autonomy-supportive, honest-world stance: the world is deterministic, inspectable, and replayable/forkable; the player is supported in their volition, never manipulated; and the player can always leave, replay, or fork.** I argue not only that tab *should* do this but that tab's substrate makes the ethical path the *structurally natural* one — the four exploitative ingredients above are largely *unbuildable* on it, or buildable only by fighting the grain.
I take the four ingredients in turn and show what tab's existing properties do to each.

### 1. Hidden randomness ↔ tab has no hidden RNG; the world is deterministic

**Proposal.** The self-running world is built from "deterministic functions of state — no RNG, no LLM" (`the-self-running-world`), and "the same log produces the same future."
A variable-ratio schedule with concealed odds — the engine of the Skinner box and the loot box — has *nowhere to live* in a world whose every transition is a deterministic fold of a public log.
Even when tab adds indeterminacy, it does so as **non-confluence** — a genuine fork in the settlement geometry whose alternative branches are *real and enumerable* ("the forks are REAL — the alternative branches exist as bypass cones," `non-confluence-is-choice`), not a hidden weighted die. tab's form of chance is an *inspectable* fork, not a concealed schedule.
The ingredient most central to manufactured compulsion is the one tab structurally lacks.

### 2. Concealed state ↔ tab has no hidden state; ⊥ is honest ignorance, ⊤ is shown

**Proposal.** This is the deepest structural alignment.
The exploitative pattern *depends* on the system knowing more than it shows — pity timers, spend-targeting, rubber-banding. tab's substrate forbids the asymmetry in two ways already noted:

- **The world IS the append-only log** (`the-self-running-world`, `history-is-geometric`): there is no separate hidden game state to conceal, because state is just `fold(log)` over content-addressed rows.
  What the engine "knows" is what the log says, and the log is the world.
- **The two honest corners of the bilattice.** `perception-as-umwelt-filter` and `ludics-grounding` record that **⊥ means honest ignorance** ("not yet experienced (unknown)") and **⊤ is *shown*, not hidden** ("the SHP carries each cell's glyph so ⊤ situations are visible, not hidden"; "the renderer never invents: every line is a settled predication").
  A system whose model of *not knowing* is a first-class displayed value, and whose model of *contradiction* is a displayed value rather than a silently-picked side, cannot easily run the concealment the dark pattern needs.
  The engine that says "⊥, I don't know" out loud is constitutionally bad at hiding a pity timer.

The one honest asymmetry that *does* exist — that an actor's private cuts stay private until perceived (the Umwelt frontier) — is asymmetry *between players in the fiction*, not between the engine and the player.
The engine conceals nothing from the player about how the world works; it only models that your character hasn't seen the harbormaster's private act yet.
That is *diegetic* limited perception (good — it is presence and discovery), not *operant* concealment (the dark pattern).
The distinction is the whole ethic: hide things *in the world* from a character, never hide *the world's mechanism* from the person.

### 3. Dependence by design ↔ the player can always leave, replay, or fork

**Proposal.** Appointment mechanics make *leaving* costly; the honest-world ethic makes leaving free. tab's substrate makes leaving-and-returning *lossless* by construction:

- **Replayable.** "The same log produces the same future"; `--replay` re-folds the whole world and "gets the same answer" (`the-self-running-world`).
  A player can leave and the world they left is exactly recoverable — there is no FOMO-able perishable state, because nothing perishes; the log keeps everything.
- **Forkable.** `next-gen-engine-architecture` makes "forkable, replayable, diffable timelines" a Layer-0 consequence: "save-scumming *as an engine feature*, for free."
  A player who dislikes where a session went can fork the timeline and try again.
  The mechanic that dark patterns weaponise (loss aversion over a single fragile timeline) is *defused* when timelines are cheap, branchable, and the past is never destroyed.
- **The world runs without the player.** `the-self-running-world` and `the-self-running-world`'s tick advance the world "with or without the player."
  A world that does not *need* you online to keep existing is one that has no incentive to trap you online — the appointment mechanic's entire premise (the world decays unless you tend it on schedule) is absent because the world is a tick over a log, not a stake the engine holds hostage.

### 4. A metric opposed to the player ↔ tab optimises for an honest story, not time-on-device

**Stance (normative, mine).** The first three are structural — tab's substrate resists the mechanisms.
The fourth is a *choice*, and I argue tab should make it explicitly: **adopt no retention/time-on-device/spend metric as a design target.** The substrate removes the *mechanisms* of manufactured compulsion but does not, by itself, forbid a designer from *wanting* one; that is a stance to state, not a property to inherit.
The `next-gen-engine-architecture` already names the *right* target — "a person … plays for an hour, and comes away with a *story they could tell* — one nobody scripted."
That is a well-being-shaped metric (did the time produce something the player values?), the SDT-respectful inverse of time-on-device.
The stance: tab's success is measured by the *quality of the story the player leaves with*, explicitly **not** by how long the engine kept them, and the engine should ship no machinery (no daily-login reward, no energy timer, no streak, no concealed difficulty hook) whose only purpose is to lift a retention number.

### Why the ethic is the *natural* path, not just the chosen one

**Synthesis (mine).** Map the four exploitative ingredients against tab's four substrate properties and they cancel almost perfectly:

| exploitative ingredient | tab substrate property | result |
| --- | --- | --- |
| hidden variable-ratio RNG | deterministic fold; chance = inspectable non-confluence | no place to hide odds |
| concealed game state | world IS the public log; ⊥ honest, ⊤ shown | nothing the engine hides from the person |
| dependence by design | replayable + forkable + world runs without you | leaving is lossless; no FOMO to weaponise |
| retention-as-target | (a stance) story-you-can-tell as the metric | must be *chosen*, but nothing pulls against it |

Three of the four are *structural*: building the dark pattern means building *against* the substrate — adding a hidden RNG to a deterministic world, a concealed state-store beside an append-only log, a perishable hostage-stake into a replayable one.
The substrate doesn't merely *permit* the ethical design; it makes the unethical design the *harder, grain-fighting* one.
And this is the same property tab already prizes for other reasons — determinism for replay, the public log for federation and crash-recovery, ⊥/⊤ for honest modelling. **The honest-world ethic is not a constraint tab pays for; it falls out of the properties tab built for engineering reasons.** That is the position: tab is, almost accidentally and then on purpose, an autonomy-supportive engine, because an inspectable deterministic log is what a respectful world is *made of*.

## What is stance vs. what is structure

To keep the proposal honest about itself: three of the four protections are *structural* (properties of the substrate as built — no hidden RNG, no hidden state, replayable/forkable) and one is a *normative choice* (refusing retention metrics) that the substrate enables but does not enforce. tab can still be designed unethically *on top of* an honest substrate — a designer could bolt a manipulative reward schedule onto deterministic rows.
The substrate makes that *hard and against the grain*; the ethic makes it *forbidden*.
Both are needed.
This note records both, and argues tab should state the stance plainly because the structure already leans that way.

## Sources

### Theory (the critique of manufactured engagement)

- Ferster, C.B. & Skinner, B.F. (1957). *Schedules of Reinforcement*.
  Appleton-Century-Crofts.
  (the variable-ratio schedule's extinction-resistant responding)
- Schüll, N.D. (2012). *Addiction by Design: Machine Gambling in Las Vegas*.
  Princeton University Press.
  (the "machine zone"; perfect contingency; design for time-on-device over the player's welfare)
- Zagal, J.P., Björk, S. & Lewis, C.
  (2013).
  "Dark Patterns in the Design of Games." *Foundations of Digital Games (FDG 2013)*, 39–46.
  (dark game design patterns: grinding, appointment mechanics, pay-to-skip; conflict of interest + concealment)
- Zendle, D. & Cairns, P.
  (2018).
  "Video game loot boxes are linked to problem gambling: Results of a large-scale survey." *PLOS ONE* 13(11): e0206767.
  (loot-box spend ↔ problem-gambling severity; the variable-ratio feature implicated)
- Rigby, S. & Ryan, R.M. (2011). *Glued to Games: How Video Games Draw Us In and Hold Us Spellbound*.
  Praeger / ABC-CLIO.
  (engagement ≠ well-being; obsessive vs. harmonious passion; the SDT line between supporting and exploiting a need)
- Ryan, R.M. & Deci, E.L. (2000).
  "Self-Determination Theory…" *American Psychologist* 55(1), 68–78.
  (autonomy-support vs. control; the over-justification effect — extrinsic reward crowding out intrinsic motivation)

### tab (the substrate properties that make the ethic natural)

- `docs/dev/notes/the-self-running-world.md` (deterministic, no RNG; replayable; the world runs without the player)
- `docs/dev/notes/non-confluence-is-choice.md` (tab's chance = inspectable real forks, not a hidden die)
- `docs/dev/notes/perception-as-umwelt-filter.md` (⊥ honest ignorance; renderer never invents; diegetic vs. operant concealment)
- `docs/dev/notes/ludics-grounding.md` (⊤ is shown, not hidden; the four honest corners)
- `docs/dev/notes/history-is-geometric.md` (the world IS the append-only log; no separate hidden state)
- `docs/dev/notes/next-gen-engine-architecture.md` (forkable/replayable/diffable timelines as a Layer-0 consequence; "a story they could tell" as the target)
- `docs/dev/notes/player-motivation.md` (the companion: SDT's three needs mapped to tab's autonomy-supportive systems)
