---
name: emergence-and-systems-design
description: Grounds the canon of systemic game-design theory — Sylvester's "engine of experience," the MDA framework, Salen & Zimmerman's second-order design, Juul's emergence/progression split, Will Wright's possibility space — in tab's running algebra. The headline FACT is that all five describe a designer who builds rules and gets experience indirectly; the headline PROPOSAL is that tab's one-algebra/respond-fold IS second-order systemic design by construction: there are no scripted events to design, only fibers that compose, and emergence is the fold over composed fibers. Keeps theory-facts separate from tab-design throughout.
---

# Emergence and second-order systems design

The repo has no research on game-design theory; tab has only its algebra.
This note brings the canon of *systemic* (as opposed to *scripted*) game design to bear on that algebra.
The theory all points one way: the designer who works with emergent systems does not author the player's experience — they author rules, and the experience falls out of how the rules combine. tab is an unusually literal instance of that idea, because in tab there is *nothing to author but the rules*: the world is an EAVT log folded through a bilattice, every "system" is the same `respond`/fold arithmetic over fibers, and there is no event-script layer in which to hand-place a designed moment.
So second-order design is not a discipline tab must adopt; it is the only kind of design tab structurally permits.

Throughout, FACTS are what a named source says, in its words.
PROPOSALS are claims about tab, kept visibly apart.

## FACT — Sylvester: a game is an engine that generates experiences

Tynan Sylvester's *Designing Games: A Guide to Engineering Experiences* (O'Reilly, 2013) frames a game as "a strange kind of machine — an engine of experience."
His causal chain is explicit: a game offers **mechanics** wrapped in **fiction**; mechanics interacting with play produce **events** that carry fictional meaning; events provoke **emotions**; the accumulated emotions are the **experience**.
The designer's craft is to "engineer mechanics that result in meaningful play," not to place the emotions directly.
Games "incite emotions by generating human-relevant events" — Sylvester's running list includes victory, defeat, threat, safety, authorship, friendship, and betrayal.

Two of Sylvester's secondary principles matter here. **Elegance** is depth-per-mechanic: he prizes mechanics that "do a lot with a little," generating many distinct events from few rules, and warns against complexity that does not pay for itself in depth.
And **emergence** is his name for the gap between the simplicity of the mechanic and the richness of the events it throws off — the engine surprises its own builder.

## FACT — MDA: Mechanics → Dynamics → Aesthetics

Hunicke, LeBlanc, and Zubek, "MDA: A Formal Approach to Game Design and Game Research" (Proc.
AAAI Workshop on Challenges in Game AI, 2004; developed at the GDC Game Design and Tuning Workshop, 2001–2004) splits a game into three layers:

- **Mechanics** — "the particular components of the game, at the level of data representation and algorithms": the rules and the actions available.
- **Dynamics** — "the run-time behavior of the mechanics acting on player inputs and each other's outputs over time."
- **Aesthetics** — "the desirable emotional responses evoked in the player."

The paper's central move is that designer and player traverse the chain in *opposite directions*: the designer builds Mechanics and hopes for Aesthetics; the player meets Aesthetics first and only sometimes infers the Mechanics.
Because the designer can only touch the Mechanics end, "small changes to mechanics can cascade into large dynamic and aesthetic effects."
Dynamics is the layer where emergence lives — it is run-time, nobody writes it directly, it is what the mechanics *do* to each other while the clock runs.

## FACT — Salen & Zimmerman: second-order design, and games as emergent systems

Katie Salen and Eric Zimmerman, *Rules of Play: Game Design Fundamentals* (MIT Press, 2004), name the discipline precisely.
"As a game designer, you can never directly design play.
You can only design the rules that give rise to it."
They call this a **second-order design problem**: "designers create experience, but only indirectly."
Their chapter "Games as Emergent Systems" defines emergence as "the phenomenon of unplanned patterns appearing from within a system," and locates its source in "a special disconnect between the rules of the system and the ways those rules play out."
The designer's skill is an *intuition* for that disconnect — for how a rule will ramify once it is loose in the system among the other rules and the players.

## FACT — Juul: games of emergence vs games of progression

Jesper Juul, "The Open and the Closed: Games of Emergence and Games of Progression" (Proc.
Computer Games and Digital Cultures, 2002; expanded in *Half-Real*, MIT Press, 2005), distinguishes two structures. **Emergence** is "the primordial game structure": a small number of rules combine to "yield large numbers of game variations, which the players then design strategies for dealing with" — card games, board games, strategy games. **Progression** offers "many predesigned challenges that the designer has ordered sequentially," through level design — "a tightly controlled sequence of events."
Juul observes that emergent games "tend to be replayable and tend to foster tournaments and strategy guides," and states his own lean: "On a theoretical level, emergence is the more interesting structure."

## FACT — Will Wright: the possibility space and the software toy

Will Wright (designer of *SimCity*, *The Sims*, *Spore*) frames the designer's job as building a **possibility space** — a system broad enough that players "design creatures, vehicles, buildings" and, in doing so, generate their own stories.
Wright is identified with the **software toy**: a system "that cannot be won or lost, but played indefinitely."
His credo is that "the best play experiences lead to the best stories," and that "play and story are self-supporting things" — the designer supplies the space; the player supplies the narrative by moving through it.

## The common shape of the five

All five describe the same designer, viewed from five angles.
The designer authors **rules** (Mechanics / the system / the small rule-set / the possibility space) and receives **experience** (Aesthetics / emotions / play / the player's story) only at a remove, through a layer of **run-time combination** nobody writes by hand (Dynamics / events / emergence / the unfolding of the toy).
The shared imperative is Salen & Zimmerman's: design the rules, not the experience.
The shared danger is Sylvester's: complexity that does not buy depth.
The shared prize is Juul's and Wright's: replayability, a space the player re-enters and finds new, because the experience was never written down — it is regenerated each play from the rules.

## PROPOSAL — tab's one algebra IS second-order design, by construction

In most engines, second-order design is a *discipline*: the designer must resist the temptation to script, because the engine offers a script layer and a systemic layer side by side. tab offers no such temptation, because it has no script layer.
The architecture note states the differentiator plainly: "One algebra, no subsystems.
Mood, combat, crafting, dialogue, ecology are all the same `respond`/fold arithmetic over fibers.
Adding a system is a pure read or an append, not a hand-coded subsystem."
There is no place in tab to write "when the player enters, play the betrayal."
There is only: file rows, and let `respond` and the fold compose them.
So Salen & Zimmerman's "design the rules, not the experience" is not advice tab follows; it is the only thing tab's substrate lets a designer do.
The "second-order disconnect" they prize — between the rules and how they play out — is, in tab, the distance between the EAVT rows on disk and the settled `being` the fold produces from them.

## PROPOSAL — the MDA layers map onto substrate / tick / Umwelt

tab has a clean reading of the three MDA layers, and the mapping is exact rather than loose:

- **Mechanics = the substrate.** The EAVT rows, the bilattice values in `value.mjs`, the `respond` composition (`truthMeet`), the dual-filing rule, the FUNCTIONAL set, supersession.
  This is literally "data representation and algorithms" — MDA's own words for the Mechanics layer.
- **Dynamics = the tick (and, where it arises, non-confluence).** MDA's Dynamics is "the run-time behavior of the mechanics acting on each other over time" — and tab's `ticking` is exactly the endofunctor that carries one settled world to the next (see `paracosm-and-world-sim-fused`: the tick is "the endofunctor that takes a step").
  Crucially, nobody authors the dynamics: they are what the mechanics *do* when the tick runs them against each other.
  Where the settlement is genuinely non-confluent (`non-confluence-is-choice`), the dynamics layer can present more than one run-time outcome from the same mechanics — which is the strongest possible form of "the designer did not write this."
- **Aesthetics = the projected experience.** What a viewpoint actually feels is what `observing` projects through its Umwelt (`perception-as-umwelt-filter`): the settled world filtered to what this actor can sense and, downstream, the emotions tab already computes as algebra — mood as closure-distance, the ⊤-aesthetic of held-both-ways.
  The designer reaches this end only through the substrate, exactly as MDA says.

The MDA observation that "small changes to mechanics cascade into large dynamic and aesthetic effects" is, in tab, the observation that one new row or one new predicate can change what `respond` composes against everything — because affordance is computed, not listed (`economy-is-predicate-richness`: "available actions are COMPUTED, not listed — whatever messages produce non-⊥").

## PROPOSAL — emergence is the fold over composed fibers, not scripted events

Sylvester's "engine of experience" and Salen & Zimmerman's "unplanned patterns from within a system" have, in tab, one concrete referent: **the settlement fold over composed fibers.** An event in tab is not a designed beat; it is what falls out when `respond` composes two fibers and the fold settles the result.
The ludics note already records the canonical case: `respond(farm, river)` lands the soil-health cell at ⊤ — "both irrigated (good) and contaminated (bad)" — and "the ⊤ value IS the emergence."
Nobody wrote a pollution event; the value emerged from two fibers meeting.
Sylvester's chain (mechanics → events → emotions → experience) reads, in tab, as: fibers → `respond`/fold → settled cells (including ⊤ seams) → the Umwelt-projected, mood-valued reading → the player's story.
Each arrow is an operation tab already runs; none of them is a script.

This is also why tab is, in Juul's terms, an **emergence** engine and not a **progression** engine — structurally, not by preference.
Progression "relies on a tightly controlled sequence of events" the designer orders by hand; tab has no event objects to sequence.
A tab world is "a small number of rules" (the algebra + the predicates declared as data) that "yield large numbers of game variations."
Juul's diagnostic markers of emergence are exactly tab's differentiators from the architecture note: replayability (every state is `fold(log)`, so "what-if branches and ghost replays" are free) and the support for strategy over a space rather than a script.

## PROPOSAL — elegance is the algebra's whole reason for being; the possibility space is the predicate set

Sylvester's **elegance** (depth-per-mechanic) is tab's founding bet.
The architecture note's claim "one algebra, no subsystems" is the elegance claim stated maximally: a *single* mechanic (`respond`/fold over the bilattice) is asked to generate mood, combat, crafting, dialogue, and ecology.
If it succeeds, tab's depth-per-mechanic is as high as a game engine's can be — one rule, many systems.
This is the criterion against which tab should be judged and tuned: not "how many systems does it have" but "how much does the one algebra throw off."
Sylvester's warning — that complexity must pay for itself in depth — becomes, for tab, a warning against hand-coding any subsystem that the algebra could have produced: every such subsystem is complexity that elegance was supposed to make unnecessary.

And Wright's **possibility space** is, in tab, the set of declared predicates.
The richer the predicate vocabulary a world files, the more messages `respond` finds non-⊥ (`economy-is-predicate-richness`: a rich fiber is "one more messages compose with — exactly more affordance"), and the larger the space of distinct settled worlds the fold can reach.
To widen a tab world's possibility space is not to add levels or events; it is to add predicates and let the algebra recombine them. tab is, in Wright's sense, a software toy: the architecture note's "done" state is a player who "comes away with a story they could tell — one nobody scripted," which is precisely Wright's "the best play experiences lead to the best stories" — the designer supplies the space (the algebra + predicates), the player supplies the story (the walk through `Mod(S)`).

## What this gives tab

A vocabulary for what tab already is, and a standard to tune it by. tab is a second-order, emergence-class, software-toy engine — not because a designer chose that style, but because the substrate admits no other.
The notes that follow this one apply the *decision*-side of the same canon (Meier, Costikyan, Juul) to tab's bilattice and non-confluence; see `interesting-decisions`.
The throughline of both: the theory describes a designer who builds rules and harvests experience indirectly, and tab is the case where there is nothing to build *but* the rules.

## Sources

- Tynan Sylvester, *Designing Games: A Guide to Engineering Experiences* (O'Reilly, 2013) — the "engine of experience"; mechanics → events → emotions → experience; elegance as depth-per-mechanic; emergence. https://tynansylvester.com/book/
- Robin Hunicke, Marc LeBlanc, Robert Zubek, "MDA: A Formal Approach to Game Design and Game Research," Proc.
  AAAI Workshop on Challenges in Game AI, 2004. https://users.cs.northwestern.edu/~hunicke/MDA.pdf
- Katie Salen & Eric Zimmerman, *Rules of Play: Game Design Fundamentals* (MIT Press, 2004) — chapters "Games as Emergent Systems" and the discussion of second-order design ("you can never directly design play").
- Jesper Juul, "The Open and the Closed: Games of Emergence and Games of Progression," Proc.
  Computer Games and Digital Cultures, 2002; expanded in *Half-Real* (MIT Press, 2005). https://jesperjuul.net/text/openandtheclosed.html
- Will Wright, on the "possibility space" and the "software toy" (interviews and talks on *The Sims* and *Spore*). https://en.wikipedia.org/wiki/Will_Wright_(game_designer)
- tab's own notes: `next-gen-engine-architecture.md` (one algebra, no subsystems; forkable timelines; the Tynan tuning loop), `paracosm-and-world-sim-fused.md` (the tick as endofunctor), `non-confluence-is-choice.md`, `perception-as-umwelt-filter.md`, `economy-is-predicate-richness.md`, `ludics-grounding.md` (⊤ IS the emergence).
- tab code referenced by the above: `being/library/value/scripts/value.mjs`, `being/doing/responding/scripts/respond.mjs`, `being/doing/observing/scripts/observing.mjs`, `being/doing/ticking/`, `scripts/_substrate.mjs`.
