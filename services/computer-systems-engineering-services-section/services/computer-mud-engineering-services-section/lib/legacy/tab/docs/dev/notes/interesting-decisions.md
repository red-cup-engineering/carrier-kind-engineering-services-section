---
name: interesting-decisions
description: Grounds the decision-side of game-design theory — Sid Meier's "a series of interesting decisions," Costikyan's taxonomy of uncertainty, Juul's emergence as the soil of meaningful choice — in tab's bilattice and non-confluence. The headline FACTS are that a decision is interesting only under tradeoff + no-dominant-strategy + uncertainty, and that games need uncertainty to hold interest. The headline PROPOSALS are that tab's ⊥/⊤ supply HONEST uncertainty (⊥ = real ignorance, ⊤ = genuine contradiction, neither faked by an RNG) and that non-confluence is the only structure that can make a choice genuinely non-dominated — a fork the algebra presents, not a menu the designer wrote. FACTS and tab-PROPOSALS kept apart.
---

# Interesting decisions

This note is the decision-side companion to `emergence-and-systems-design`.
Where that note asked *what kind of designer tab makes you* (a second-order one, who builds rules), this one asks *what makes the player's choices worth making* — and grounds the answer in two pieces of tab's algebra the rest of the canon has no clean analogue for: the bilattice's ⊥ and ⊤, and non-confluence.

FACTS are what a named source says.
PROPOSALS are claims about tab, kept visibly apart.

## FACT — Meier: a game is a series of interesting decisions

Sid Meier's much-quoted definition — "a game is a series of interesting decisions" (attributed to his GDC talks, sharpened in his 2012 GDC lecture "Interesting Decisions") — comes with a working test for *interesting*.
Meier's diagnostics for a **non**-interesting decision:

- **Dominant option.** "If all players choose B" from a set {A, B, C}, the choice is not interesting — "the game might as well not give them the choice."
  A choice with a dominant strategy is a non-choice.
- **No reason to prefer.** If a player "always chooses the first" of the options, or chooses **at random**, the choice carries no information and is equally dead.

His diagnostics for an **interesting** decision:

- **Tradeoff.** "When choosing A, players must give up on B."
  The options must be incommensurable — not better/worse but better-at-different-things.
  Meier's example: do not offer "a bad gun or a good gun"; offer "sniper vs shotgun" and let the level decide which is better.
- **Risk/reward.** A strong balance of risk against reward keeps the option live.
- **Informed.** The player must "understand the full scope of their choices" — Meier says to err toward giving the player *too much* information, because a choice made in ignorance is not chosen.
- **Uncertainty.** The outcome must not be foregone; the decision lives in the gap between what the player knows and what will happen.

## FACT — Costikyan: games need uncertainty; he taxonomizes it

Greg Costikyan, *Uncertainty in Games* (MIT Press, Playful Thinking series, 2013), argues that "games require uncertainty to hold our interest," and that "the struggle to master uncertainty is central to their appeal."
He resolves "uncertainty" into roughly eleven distinct sources, among them:

- **Performative uncertainty** — can the player physically execute the move (the platformer jump)?
- **Solver's / analytic uncertainty** — the state space is too large to compute, so the outcome is uncertain even with perfect information (chess).
- **Hidden information** — the player has incomplete knowledge of the game state (fog of war, a hidden hand).
- **Randomness** — explicit chance devices (dice, shuffles).
- **Player unpredictability** — other minds, whose choices cannot be predicted.
- **Narrative / semantic uncertainty** — ambiguity in the *meaning* or significance of the game's elements.

His linked concept is **meaningful choice**: a choice is meaningful when it is "influenced by uncertainty and has a significant impact on the outcome."
Remove the uncertainty and the choice collapses into a solved, dominant move — Meier's dead decision, arrived at from the other side.

## FACT — Juul again: emergence is the soil meaningful choice grows in

From the companion note: Juul's **emergent** games are "a small number of rules" that "yield large numbers of game variations, which the players then design strategies for dealing with."
The relevant point for *decisions* is the consequence Juul draws: emergent games "tend to be replayable and tend to foster tournaments and strategy guides."
Strategy guides exist precisely because the decisions are non-trivial and non-dominated — if there were a dominant line, the guide would be one line long.
Emergence is the structure that keeps generating fresh, unsolved decisions; progression, by ordering pre-designed challenges, tends to produce decisions the designer has already solved.

## The common shape — and the missing piece

Meier, Costikyan, and Juul converge: an interesting decision needs (1) a genuine **tradeoff** (no dominant option), (2) **uncertainty** (the outcome is not foregone), and (3) **stakes** (the choice matters to the outcome).
The destroyers of interest are the dominant strategy (kills the tradeoff) and *false* uncertainty — Meier's "random selection" — which feels like a choice but carries no information.
This is the subtle requirement: the uncertainty must be *honest*.
A coin-flip dressed as a decision is exactly as dead as a solved one.
What the canon does not supply is a *substrate* that can tell honest uncertainty from faked uncertainty, or genuine forks from menu items. tab's algebra supplies both — which is the rest of this note.

## PROPOSAL — the bilattice gives HONEST uncertainty: ⊥ and ⊤ are two different unknowns

Most engines have one way to be uncertain: a random number. tab has **two non-random unknowns**, and they are different unknowns — which is exactly the distinction Costikyan's taxonomy needs but most engines flatten.

- **⊥ (bottom) is honest ignorance.** `value.mjs` names it as the world simply not yet having evidence.
  This is Costikyan's **hidden information** uncertainty made into a first-class value: a cell at ⊥ is a fact the player genuinely does not know, not because a die hid it but because the log has not determined it.
  A decision taken against ⊥ cells is uncertain in Costikyan's sense — the player has "incomplete knowledge of the game state" — and the uncertainty is *honest* because ⊥ is the real absence of evidence, readable and distinguishable (`isDetermined` is false exactly here), not a roll the engine could have made go either way.
- **⊤ (top) is genuine contradiction.** Per `ludics-grounding`, ⊤ is "told both true and false simultaneously" — a situation the world holds, not a bug.
  This is Costikyan's **semantic / narrative uncertainty** as a value: ambiguity not in *whether* something is so but in *what it means*, because the evidence genuinely pulls both ways.
  A decision taken against a ⊤ cell is uncertain in the deepest sense Costikyan names — the meaning itself is unsettled — and again honestly: the ⊤ was produced by the knowledge fold over real opposed evidence (`non-confluence-is-choice`: "a cell that two sources push in incompatible directions lands on ⊤"), not manufactured.

The payoff against Meier: tab can offer uncertainty that is neither solved nor random — the two deaths of an interesting decision. ⊥ is not random (it is determinate ignorance the world can later resolve by evidence); ⊤ is not random (it is determinate contradiction).
Both are reproducible — `fold(log)` is deterministic — so the same world replays to the same uncertainties, which is what makes them *honest* rather than capricious.
A player deciding under ⊥/⊤ is deciding under uncertainty that *means something*, the precise thing Meier's "random selection" lacks.

(One caveat tab must respect, from `ludics-grounding`: tab's fusion `truthMeet` reports interaction *outcomes* — a fresh `t ⊙ f` is a failure `f`, not ⊤ — while ⊤ is produced by the knowledge fold.
So "decision under ⊤" means decision against a cell the *world holds both ways*, not against a fresh failed interaction.
The two must not be conflated when wiring decision UI.)

## PROPOSAL — non-confluence is the only structure that makes a choice genuinely non-dominated

Meier's hardest requirement is **no dominant strategy**: a real choice must be one where the options are incommensurable, so that no option dominates across all situations.
In a confluent system this is always, ultimately, a tuning problem — the designer balances numbers so that, *on average*, no option wins, but for any given fully-known state there is in principle a best move; the "choice" is interesting only because the player cannot compute it (Costikyan's solver's uncertainty).
That is real and useful.
But tab can go further, and `non-confluence-is-choice` already records the machinery.

A **bypass chain** of length ≥3 (voidmath F6) forces "multiple incomparable normal forms": the settlement "settles into one of several states and there's no canonical choice."
This is the strongest possible form of *no dominant strategy* — not "no option is best on average," but "the algebra itself has more than one normal form and there is no canonical pick."
The branches are not menu items a designer wrote; they are bypass cones (F7), real alternative settlements.
So a decision sited at a non-confluent fork is non-dominated *by construction*: the geometry, not a balance pass, guarantees the options are incomparable.
As the note puts it, real choice is "not a menu the designer wrote, but a place where the settlement genuinely has more than one normal form and the world's own geometry — not a script — presents the fork."

This is the decision-theoretic completion of the emergence note's claim.
There, non-confluence was the strongest form of "the designer did not write this."
Here it is the strongest form of "no dominant strategy": the two are the same fact read for two different theorists (Salen & Zimmerman, and Meier).
And tab already carries the **seam** that marks such a fork: the cells that resolve differently across the incomparable normal forms read **⊤** when joined.
So the same value that supplies honest semantic uncertainty (above) is also the visible marker of a genuinely non-dominated choice. ⊤ does double duty: it is both the uncertainty and the sign that the decision is real.

## PROPOSAL — Costikyan's sources of uncertainty, located in tab

tab can offer most of Costikyan's catalogue without an RNG, which is unusual and worth recording:

- **Hidden information** → ⊥ cells and the Umwelt projection.
  `observing` filters the settled world to what an actor can sense (`perception-as-umwelt-filter`); what falls outside the Umwelt, and every ⊥ cell, is honestly hidden.
  Two actors in one place "observe different worlds" — fog of war as a consequence of projection, not a drawn veil.
- **Player unpredictability** → other fibers' future appends.
  An NPC is "an entity with a fiber" (`npc-is-entity-with-a-fiber`) driven by the utility-AI `decide`; its next append is not known until the tick runs it, so other minds supply uncertainty the way Costikyan describes.
- **Semantic / narrative uncertainty** → ⊤, as above: the meaning is unsettled because the evidence is opposed.
- **Solver's / analytic uncertainty** → the size of the possibility space.
  With affordance computed rather than listed (`economy-is-predicate-richness`), a rich world's reachable settlements are too many to enumerate ahead of time — analytic uncertainty falls out of predicate richness.
- **Randomness** → **deferred, and that is the point.** tab has no RNG today (`ludics-grounding`: "alea is deferred").
  The proposal of this note is that tab should reach for the *other* sources first, because they are honest and reproducible, and add chance only where genuine indeterminacy is wanted — and even then the right home is non-confluence (the F6 fork), not a pseudo-random draw.
  Costikyan's own framing supports this: randomness is *one* source among eleven, and the most easily abused into Meier's dead "random selection."

## PROPOSAL — a design standard for tab decisions

Putting the canon and the algebra together yields a checklist tab can tune against.
A tab interaction is an *interesting* decision when:

1. **Affordance is plural.** `respond` finds more than one non-⊥ message composing with the target — there are actually several moves (else there is no decision).
  This is readable today.
2. **No move dominates.** Either the moves trade off across situations (tuning, the confluent floor) or — strongest — the decision sits at a non-confluent fork whose branches are incomparable normal forms by F6.
  The fork is honest because the geometry, not a balance pass, makes it.
3. **The outcome is honestly uncertain.** The decision bears on ⊥ cells (hidden state), ⊤ cells (contested meaning), or other fibers' un-run appends (other minds) — uncertainty that is reproducible and non-random, distinguishable from a coin flip.
4. **The stakes are legible.** The player can read enough of the projected world (Umwelt) to grasp the tradeoff — Meier's "err toward too much information."
  This is a renderer concern: surface the ⊥/⊤ glyphs so the player sees *where* the uncertainty is.

A decision that fails (1) is a non-choice; fails (2) has a dominant strategy (Meier's dead decision); fails (3) is solved or faked; fails (4) is a blind guess.
The standard is wholly expressible in tab's existing reads — `respond`'s non-⊥ count, the ⊥/⊤ glyphs, the fork enumeration sketched in `non-confluence-is-choice`, the Umwelt projection — so tuning tab's decisions is a matter of *reading* the algebra, not bolting a decision system onto it.

## What this gives tab

The decision-side canon names what tab's two least-conventional features are *for*.
The bilattice's ⊥ and ⊤ are not just an honest model of disputed facts (their `next-gen-engine-architecture` role) — they are tab's source of **honest, non-random, reproducible uncertainty**, the exact ingredient Meier and Costikyan require and that an RNG fakes.
Non-confluence is not just "real choice" in the abstract — it is the **only structure that makes a choice genuinely non-dominated without a balance pass**, the strongest possible answer to Meier's no-dominant-strategy rule.
Read with `emergence-and-systems-design`, the picture is complete: tab is a second-order, emergence engine (that note) whose choices can be honestly uncertain and genuinely non-dominated (this one) — both properties falling out of one algebra rather than being designed in.

## Sources

- Sid Meier, "Interesting Decisions" (GDC 2012 lecture; the "series of interesting decisions" definition traces to his earlier GDC talks).
  Coverage: https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions — tradeoff, dominant option, risk/reward, information, uncertainty.
- Greg Costikyan, *Uncertainty in Games* (MIT Press, Playful Thinking, 2013) — "games require uncertainty to hold our interest"; the taxonomy of sources of uncertainty; meaningful choice as choice "influenced by uncertainty." https://mitpress.mit.edu/9780262527538/uncertainty-in-games/
- Jesper Juul, "The Open and the Closed: Games of Emergence and Games of Progression" (2002; *Half-Real*, MIT Press, 2005) — emergence as the structure that fosters strategy guides and tournaments. https://jesperjuul.net/text/openandtheclosed.html
- (Companion canon in `emergence-and-systems-design.md`: Sylvester 2013, Hunicke/LeBlanc/Zubek 2004, Salen & Zimmerman 2004, Will Wright.)
- tab's own notes: `non-confluence-is-choice.md` (F6 bypass chains; incomparable normal forms; ⊤ as the seam), `ludics-grounding.md` (⊥ = honest ignorance, ⊤ = contradiction-as-a-value; truthMeet reports outcomes, fold produces ⊤; alea deferred), `perception-as-umwelt-filter.md` (hidden information via projection), `economy-is-predicate-richness.md` (affordance computed, not listed), `npc-is-entity-with-a-fiber.md` (other minds), `next-gen-engine-architecture.md` (the ⊤ role).
- tab code referenced by the above: `being/library/value/scripts/value.mjs` (⊥, ⊤, isDetermined, knowledgeJoin), `being/doing/responding/scripts/respond.mjs` (non-⊥ affordance), `being/doing/observing/scripts/observing.mjs` (Umwelt), `scripts/_substrate.mjs` (supersede — the confluent floor).
