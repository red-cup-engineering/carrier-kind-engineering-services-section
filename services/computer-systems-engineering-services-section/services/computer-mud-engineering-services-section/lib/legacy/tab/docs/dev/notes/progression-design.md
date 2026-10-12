---
name: progression-design
description: What game studies and motivation psychology actually found about progression — Juul's progression-vs-emergence, Deci & Ryan's self-determination theory and the overjustification effect (why a visible XP number can HURT), Csikszentmihalyi's flow channel, the treadmill critique, and "meaningful progression" as capability-that-opens-the-world vs numbers-going-up — kept separate from how it maps onto tab. The headline: tab's advancement is a SETTLEMENT/CLOSURE THRESHOLD, not a designed level number, which is structurally the intrinsic kind of progression the research endorses; the risk is bolting an extrinsic XP bar onto it and triggering the overjustification effect the field warns against.
---

# Progression design — what the research found, and where tab stands

The brief from `next-gen-engine-architecture.md` is a *living* world that produces stories nobody scripted; tab's substrate is an emergence engine (simple algebra over fibers, outcomes computed not listed).
Progression is the other axis — how a player *grows* across a session.
This note brings the outside research on progression alongside tab's one shipped progression mechanic — **advancement as the crossing of a settlement/closure threshold, NOT a designed level number** — and asks what the research says tab should and should not add. **FACTS** (the literature) and **tab** (proposals, marked) are kept apart.

The headline: the field's deepest distinction is between progression that is **numbers going up** (extrinsic, and — per motivation psychology — actively risky) and progression that is **capability that opens the world** (intrinsic). tab's closure-threshold advancement is *structurally* the second kind.
The danger is reflexively adding the first — an XP bar — on top of it.

## FACTS — Juul: games of emergence vs. games of progression

Jesper Juul (*Half-Real*, 2005; "The Open and the Closed," 2002) draws the field's foundational distinction:

- **Emergence** — "a number of simple rules combining to form interesting variation."
  The challenges are not placed by the designer; they *arise* from rule interaction.
  Open structure, high replayability, many strategies.
  Pre-electronic games (chess, cards) are emergence games.
  Emergence games have *strategy guides* (general tactics).
- **Progression** — "the player has to perform a predefined set of actions in order to complete the game."
  Challenges are placed *serially* by the designer, granting "strong control to the game designer" — good for cinematic/storytelling ambition, but risking "playing a game on a rail … the work of the player is simply to perform the correct pre-defined moves."
  Progression is the *historically newer* structure, entering via the adventure genre.
  Progression games have *walkthroughs* (the exact action sequence).

Juul's diagnostic is sharp and usable: **if your progression can be written as a walkthrough, it is the on-a-rail kind.** Emergence is where the unscriptable story lives.
The two are not exclusive — most games mix them — but the axis tells you which kind of "growth" you are building.

## FACTS — Deci & Ryan: intrinsic vs extrinsic, and why XP can hurt

Self-Determination Theory (Edward Deci & Richard Ryan, 1980s onward) is the field's account of *why* people do things.
Three basic psychological needs drive self-initiated behavior: **autonomy, competence, relatedness.** Motivation runs on a continuum from amotivation through *external regulation* (acting for rewards/punishments) up to *intrinsic motivation* (acting for the inherent satisfaction of the act).

The finding that matters most for progression design is the **overjustification effect** (a.k.a. the undermining effect), among SDT's most-replicated and most counterintuitive results: **adding an extrinsic, expected, contingent reward to an activity that was already intrinsically interesting *reduces* the intrinsic motivation for it.** Deci's 1971 puzzle experiments are the canonical case: people solved puzzles happily for free; paying them increased output *while pay lasted*; **removing the pay dropped their motivation and performance below the original baseline.** Tangible rewards given contingent on engagement/completion/performance undermined intrinsic motivation; *expected* rewards undermined it, *unexpected* ones did not.

The direct game-design consequence, stated repeatedly in the gamification literature: **a visible XP number, points, or achievement bar attached to an activity the player already enjoyed can crowd out that enjoyment** — the player reorients from "I'm doing this because it's interesting" to "I'm doing this for the number."
Short-term engagement spikes; long-term intrinsic motivation erodes.
XP is not free; it can be a *cost*.

The constructive reading of SDT: progression that feeds **competence** (the player can now *do* more) and **autonomy** (the player chose this growth) reinforces intrinsic motivation; progression that is *only* an externally-administered number contingent on grinding undermines it.

## FACTS — Csikszentmihalyi: the flow channel and the difficulty curve

Mihaly Csikszentmihalyi's **flow** is the state of complete absorption where challenge and skill are balanced.
On the challenge-vs-skill graph, the **flow channel** is the diagonal band: above it (challenge ≫ skill) is **anxiety**; below it (skill ≫ challenge) is **boredom**.
Optimal design keeps the player in the channel — challenge slightly above current skill, so overcoming it delivers a small climax of satisfaction.
Because skill *rises* as the player improves, **difficulty must rise with it** to stay in the channel; this is the principle behind the difficulty curve and educational scaffolding.

The progression-relevant corollary: **progression's real job is to keep the player in the flow channel as their skill grows** — not to make a number bigger.
When a level-up actually expands what the player can attempt (new challenges that re-balance against grown skill), progression serves flow.
When a level-up only inflates stats against unchanged challenges, the player slides *below* the channel into boredom — the content trivializes.

## FACTS — the treadmill critique and "meaningful progression"

The **treadmill** (or grind) critique is the field's standing warning.
Repetitive low-intensity tasks hold players in a *mild* flow state that is excellent for session length and habit — and that is exactly the danger: grinding can become "a manipulative retention treadmill that exploits psychological vulnerabilities," especially when paired with monetization shortcuts, producing burnout and eroded trust.
The treadmill is progression-as-numbers-going-up taken to its logical end: the number always climbs, the *world* never opens, the player runs in place.

Against this the field sets **meaningful progression**: growth that **opens the world** — new capabilities, areas, interactions, and *kinds* of challenge — rather than growth that merely scales numbers.
The test is diagnostic: *after this advancement, can the player do something they could not do before, that changes how they engage the world?* If yes, it is meaningful; if it only lets them do the same thing to bigger numbers, it is treadmill.
This is the same axis as Juul's (capability that opens vs. a rail of predefined gains) and Deci & Ryan's (competence/autonomy vs. an extrinsic number).

## tab — mapping the findings onto closure-threshold advancement

tab ships **skills via `#practicing`/`#advancing`**, where **"advancement = crossing a settlement/closure threshold, NOT a designed level number."** Read through the research, this single design choice lands tab on the *intrinsic / meaningful / emergent* side of every axis above.
(Everything here is reading/proposal unless it cites shipped behavior.)

### tab — closure-threshold advancement IS the intrinsic kind, structurally

Deci & Ryan warn that an *externally-administered, contingent number* (XP) undermines intrinsic motivation. tab's advancement is **not an administered number** — it is a *property of the player's own fiber crossing a closure/settlement threshold*.
You do not earn XP toward a level the designer set; your fiber *settles* through practice (`#practicing` accumulating evidence) until a cell closes, and the closure *is* the advancement (`#advancing`).
The growth is **endogenous** — it is the fiber's own state, not a reward handed in from outside.
In SDT terms this feeds **competence** directly (you advanced because you actually became settled/capable) without the extrinsic-reward hook that triggers overjustification. tab gets the *intrinsic* shape for free, because advancement is a fact about the player's fiber, not a payout.

### tab — advancement opens the world (meaningful, not treadmill) because value is computed

The treadmill is numbers-going-up while the world stays closed. tab structurally *can't* do pure-number progression, because **there is no level number** — and because, per `economy-is-predicate-richness.md`, a richer fiber is one that **more messages compose with** (`composes(target, message)` true on more channels; "available actions are COMPUTED, not listed").
So when your fiber settles a new cell, **the world literally opens** — `respond` affords more non-⊥ actions against more targets.
Advancement is *definitionally* capability-that-opens-the-world, the field's gold standard for "meaningful progression," and it is mechanical, not aspirational: more settled fiber = more affordance = more world reachable.
There is no version of tab advancement that is "the same action against a bigger number," because the gain is *new composing channels*, not a scalar.

### tab — emergence is the substrate; progression rides on it without a rail

Juul's diagnostic — *can it be written as a walkthrough?* — cuts cleanly. tab's core is an **emergence engine**: `respond`/fold arithmetic over fibers, outcomes *computed* from rule interaction, not placed by a designer (`next-gen-engine-architecture.md`: "one algebra, no subsystems"; the demo's goal is "a story nobody scripted").
Advancement-by-closure does **not** introduce a progression rail, because *which* cells settle, and therefore *which* capabilities open, depends on the emergent history of play (what you practiced, against what, in what order) — there is no predefined action sequence to walk through.
So tab can have genuine *progression* (the player grows) while staying a *game of emergence* (no walkthrough), which the literature treats as the hard combination to achieve.
The closure threshold is the hinge: it is a progression *event* whose *trigger* is an emergent fiber state.

### tab — the fold is the flow-channel governor (and the inflation risk)

Csikszentmihalyi says progression's job is to keep the player in the flow channel as skill rises. tab's **tower-`fold`** is, read this way, a flow-channel mechanism: as entities settle, they become **vocabulary atoms** the world can build *new, higher-order* structure from — so a settled player faces freshly-composed higher-order challenges rather than trivialized old ones.
Settlement raises both the player's skill *and* the ceiling of available challenge, holding the channel.
But the existing economy note's warning is the same warning in flow terms: **"inflation = the tower outrunning settlement."** If the fold mints challenge-vocabulary faster than the player settles, the player is pushed *above* the channel into anxiety (the world outruns them); if it mints too slowly, *below* into boredom.
So tab's faucet/sink balance from `virtual-economies.md` and the flow channel are the *same* governor: **settled-vs-minted ratio is both the inflation diagnostic and the flow-channel position.** (Fold deferred per `next-gen-engine-architecture.md`; this is the reading of it.)

### tab — the one thing NOT to bolt on: an XP bar

The clearest actionable warning the research gives tab is *negative*. tab's advancement is already the intrinsic, meaningful, emergent kind.
The tempting "next feature" — a visible XP number, a level, a progress bar quoting distance-to-next-level — is **exactly the extrinsic, contingent, expected reward the overjustification effect says will undermine the intrinsic motivation tab's closure threshold already supplies.** Surfacing advancement is fine and good (the player should *feel* their fiber settling) — but it should be surfaced as **legible capability** ("you can now do X / Y composes now"), the competence signal SDT endorses, *not* as a number-toward-a-designed-threshold, which re-imports the treadmill tab structurally avoided.
The renderer already shows fiber state and ⊤; showing *newly-afforded actions* on settlement is the SDT-correct surfacing.
A number is the one thing to resist.

## What tab is ahead on, and the one discipline to keep

Tallying against the field: intrinsic progression (Deci & Ryan) — tab has it structurally, because advancement is an endogenous fiber-closure, not an administered reward.
Meaningful progression (opens-the-world, not numbers-up) — tab has it definitionally, because a richer fiber is more affordance, not a bigger scalar.
Progression-within-emergence (Juul's hard combination) — tab has it, because the closure *trigger* is emergent (no walkthrough) while the closure *event* is real growth.
Flow-channel maintenance (Csikszentmihalyi) — the fold is the governor, with the inflation/anxiety risk made literal as settled-vs-minted ratio.

The one discipline to keep is the *negative* one: **do not bolt an extrinsic XP number onto a system that is already intrinsically motivating.** The research's strongest, most counterintuitive finding — the overjustification effect — is precisely a warning against the most reflexive "progression feature" in the genre. tab's advancement is good *because* it is a settlement threshold and not a level.
Surface the capability; resist the number.

## Sources

### Theory (external) - Jesper Juul, *Half-Real: Video Games between Real Rules and Fictional Worlds* (MIT Press, 2005); and "The Open and the Closed: Games of Emergence and Games of Progression" (2002) — emergence vs. progression; "perform a predefined set of actions"; walkthroughs vs. strategy guides; on-a-rail risk. https://jesperjuul.net/text/openandtheclosed.html - Edward Deci & Richard Ryan, Self-Determination Theory — autonomy/competence/relatedness; the intrinsic↔extrinsic continuum. https://selfdeterminationtheory.org/ - Edward Deci (1971) and SDT meta-analyses — the **overjustification / undermining effect**: expected contingent tangible rewards reduce intrinsic motivation; removing the reward drops performance below baseline. https://selfdeterminationtheory.org/wp-content/uploads/2019/03/2019_RyanRyanDiDomencio_Deci1971.pdf - Overjustification effect in game/achievement design — "The Overjustification Effect and Game Achievements" (Game Developer); Machinations glossary. https://www.gamedeveloper.com/design/the-overjustification-effect-and-game-achievements - Mihaly Csikszentmihalyi, *Flow* — the flow channel; challenge-vs-skill balance; anxiety above, boredom below; difficulty must rise with skill.
(Flow Theory in game design summaries.) https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf - The treadmill/grind critique and "meaningful progression" — grinding as retention treadmill; progression that opens the world vs. numbers going up. https://medium.com/@milijanakomad/product-design-and-psychology-the-role-of-grinding-in-video-game-design-72a2c70a9ae4

### tab (this repository) - `docs/dev/notes/next-gen-engine-architecture.md` — emergence engine ("one algebra, no subsystems"); the demo's goal of "a story nobody scripted." - `docs/dev/notes/economy-is-predicate-richness.md` — richer fiber = more composing channels = more affordance ("actions COMPUTED, not listed"); "inflation = the tower outrunning settlement." - `docs/dev/notes/virtual-economies.md` — the faucet/sink ratio that this note identifies with the flow-channel position. - Built systems referenced: skills via `#practicing`/`#advancing` with **advancement = crossing a settlement/closure threshold, NOT a designed level number**; the renderer showing fiber state and ⊤; the tower-`fold` (vocabulary atoms; minted-vs-settled), deferred per the architecture note.
(Per the task brief and the cited notes.)
