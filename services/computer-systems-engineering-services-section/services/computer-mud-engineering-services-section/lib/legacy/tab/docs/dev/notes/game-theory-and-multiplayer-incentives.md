---
name: game-theory-and-multiplayer-incentives
description: The mathematical game theory a multiplayer TAB must reckon with — von Neumann–Morgenstern utility, Nash equilibrium, cooperative vs non-cooperative games, the repeated Prisoner's Dilemma and Axelrod's tit-for-tat, Schelling points, mechanism design / incentive compatibility / auctions, and evolutionary stable strategies — stated as theory-facts with real citations, then mapped onto TAB's concrete machinery (`decide`'s shared resource pool, `socialize`'s opinions, `trade`'s dual-filed exchange, federation's content-addressed identity, the bilattice ⊤). The thesis: in TAB the GAME is literally a game in the game-theoretic sense, and cooperation should be DESIGNED as an emergent equilibrium, not a scripted rule.
---

# Game theory and multiplayer incentives

A single-player world-sim only has to be interesting.
A multiplayer world has to be *strategically stable*: when many self-interested actors share one append-only world, what they do to each other is a game in the exact technical sense, and the question is which equilibria the rules admit.
TAB's shipped pieces already lay a strategic game on the table without anyone having designed one — `decide` makes NPCs draw down a *shared, depletable* resource pool, `socialize` records opinions actors hold of each other, `trade` moves possession between fibers.
This note states the relevant game theory as theory-facts (with citations), then proposes how TAB's machinery realizes it.
The discipline of this repo applies: the theory below is what the cited works say; the TAB mappings are proposals, marked as such, and nothing here is built beyond what the named scripts already do.

## Theory-facts: the canon a multiplayer designer must know

**Utility under uncertainty (von Neumann–Morgenstern).** In *Theory of Games and Economic Behavior* (1944), von Neumann and Morgenstern proved that an agent whose preferences over risky outcomes ("lotteries") satisfy four axioms — completeness, transitivity, continuity, and independence — can be represented by a utility function such that the agent acts *as if* maximizing the probability-weighted expected value of that function.
This is what makes "rational play" a mathematical object: a payoff number you can put in a matrix.
It is the floor under everything else.

**Nash equilibrium (non-cooperative games).** Nash (PNAS 1950, "Equilibrium Points in n-Person Games"; *Annals of Mathematics* 1951, "Non-Cooperative Games") defined an equilibrium as a profile of strategies in which no single player can improve their payoff by unilaterally deviating, and proved that every finite game has at least one such point (in mixed strategies).
The crucial word is *unilaterally*: a Nash equilibrium is stable against one defector at a time, which is exactly why equilibria can be collectively terrible — see the Prisoner's Dilemma.

**Cooperative vs non-cooperative games.** The division (von Neumann–Morgenstern, then Nash) turns on whether *binding agreements* are enforceable.
Non-cooperative theory takes the individual strategy as the unit and asks what self-interest produces with no enforcer (Nash equilibrium, the core analytical tool).
Cooperative theory takes the *coalition* as the unit and asks how a jointly-achievable payoff is divided — the **core** (allocations no coalition can beat by going it alone), the **Shapley value** (Shapley 1953, a fair division by average marginal contribution).
A world with no central authority is forced into the non-cooperative frame: there is no third party to make an agreement binding.

**The Prisoner's Dilemma.** The canonical trap (formalized by Tucker, 1950): two players each choose Cooperate or Defect; for each, Defect strictly dominates regardless of the other's choice, so the unique Nash equilibrium is mutual defection — yet mutual cooperation pays both more.
Individually rational play yields a collectively worse result.
The depletable commons is the n-player generalization.

**Repeated games and the rise of cooperation (Axelrod).** When the same dilemma is played *repeatedly* by the same partners, defection stops dominating.
The **Folk Theorem** (rigorously, Friedman 1971) shows that in an infinitely (or indefinitely) repeated game with sufficiently patient players, *any* feasible payoff above each player's minimax can be sustained as an equilibrium — in particular, mutual cooperation, enforced by the credible threat of future punishment.
Axelrod's computer tournaments (*The Evolution of Cooperation*, 1984; Axelrod & Hamilton, *Science* 211, 1981) found that the winning strategy was the simplest: **tit-for-tat** (cooperate first, then echo the opponent's last move).
Axelrod distilled why: successful strategies are **nice** (never defect first), **retaliatory** (punish defection at once), **forgiving** (resume cooperating once the partner does), and **clear** (legible enough that the partner can learn to cooperate).
Two structural preconditions: the *shadow of the future* must be long (interactions likely to recur) and partners must be *recognizable* across encounters (you must know whom you are facing).
Both are design knobs.

**Schelling points (coordination without communication).** Schelling (*The Strategy of Conflict*, 1960) observed that in coordination games with multiple equilibria, players converge on a **focal point** made salient by shared context, precedent, or symmetry — "meet in New York" resolves to Grand Central at noon — even with no communication.
Coordination is solved not by computation but by *shared salience*.
A world's named landmarks, scheduled events, and conventional meeting-places are equilibrium-selection devices.

**Mechanism design (incentive compatibility, auctions).** Mechanism design (Hurwicz 1972, who coined *incentive compatibility*; Maskin; Myerson — Nobel 2007) is game theory run backwards: instead of analyzing a given game, you *design the rules* so that when players act in self-interest, the outcome you want results.
A mechanism is **incentive-compatible** (strategyproof / dominant-strategy IC) when honesty is each player's best move.
The **Revelation Principle** (Gibbard 1973; Myerson 1979) says any outcome achievable by any mechanism is achievable by one where truth-telling is an equilibrium, so the designer can search truthful mechanisms without loss.
The canonical worked example is the auction: Vickrey's second-price sealed-bid auction (1961) is strategyproof — your dominant strategy is to bid your true value — and its multi-good generalization is the **VCG mechanism** (Vickrey–Clarke–Groves), where each winner pays the externality they impose on others.
The **Gibbard–Satterthwaite theorem** (1973/1975) bounds the dream: for general preferences over three-plus deterministic outcomes, the only strategyproof, non-dictatorial mechanisms are trivial — so real designs buy strategyproofness with money (auctions), restricted domains, or randomization.

**Evolutionary game theory (ESS).** Maynard Smith & Price (*Nature* 246, 1973) recast equilibrium as *population dynamics*: an **evolutionarily stable strategy** is one that, once common, cannot be invaded by any rare mutant strategy — a refinement of Nash that needs no rational agents, only differential reproduction (or imitation).
This is the right lens for a world of many NPCs and players who copy what works: behaviour spreads by payoff, and the question is which strategies are *uninvadable* once dominant.
Nowak's "five rules for the evolution of cooperation" (*Science* 314, 2006) — direct reciprocity, **indirect reciprocity** (reputation; Nowak & Sigmund, *Nature* 437, 2005), spatial/network structure, group selection, kin selection — enumerate the structural conditions under which cooperative strategies become the ESS.
Reputation is the one that scales past pairwise memory: I help you because others, watching, will help me.

## TAB-proposals: the world is already a game

These are proposals about how TAB's existing machinery realizes the theory above.
They reason from the named scripts; they are not claims that the strategic layer is built.

**TAB's `decide` is an n-player commons dilemma, already running.** In `being/doing/responding/deciding/scripts/decide.mjs`, when an NPC reaches a co-located resource it makes a `use` move: it raises its own pressing `need:<x>` toward the ceiling *and* decrements that resource's `amount` by one (`Math.max(0, amount - 1)`).
The pool is shared (any actor whose path reaches it draws it down) and the move carries no replenishment.
That is the structure of the Prisoner's Dilemma's n-player form: each actor's locally-optimal `decide` (consume the nearest provider) is individually rational, and the Nash equilibrium of pure `decide`-agents is the resource hitting zero — `resourcesFor` filters to `amount > 0`, so once drawn down it vanishes from consideration and the dependent actors fall to `idle` ("no resource reachable").
TAB did not script a tragedy; the tragedy is the equilibrium of the rules as written.
The governance response is the subject of the companion note, `the-commons-and-governance.md`.

**Repeated interaction and recognizable partners are both present.** Axelrod's two preconditions for cooperation — a long shadow of the future and recognizable partners — map directly.
The world is a *persistent* append-only log: the same entities meet across many ticks, so the game is indefinitely repeated, not one-shot.
And partners are *recognizable* by construction: an entity is its content-address (its log), stable across ticks and (per `federate`) across servers.
So the substrate satisfies the conditions under which the Folk Theorem makes cooperation an equilibrium — what is missing is not recognizability or repetition but a strategy that *conditions on history*.
A pure `decide`-agent is the always-defect strategy; a tit-for-tat agent would condition its next move on the partner's recorded past, which TAB can read (the partner's log travels with it).

**Opinions are the reputation channel (indirect reciprocity).** `socialize` (`being/doing/responding/socializing/scripts/socialize.mjs`) computes A's stance toward B by composing their fibers and files it as a functional `opinion-of:<b>` cell — `friend`, `rival`, `neutral`, or `ambivalent`.
Proposal: this is exactly the reputation register Nowak & Sigmund's indirect reciprocity needs.
Cooperation (sharing a resource, honoring a trade) becomes an asserted positive cell on the actor's log; defection (over-drawing, reneging) a negative one; and because opinions compose fibers rather than reading a private memory, a *third party* can form an opinion of an actor it has never transacted with, from that actor's public record — which is precisely what makes reputation scale past pairwise tit-for-tat to a population.
The strategy a multiplayer TAB wants is: `decide` consults `opinion-of` (or the partner's public log) before transacting, cooperating with the well-reputed and withholding from the ill-reputed.
That makes cooperation the better-paying move *because* defection is recorded and costs future trade — the emergent equilibrium, not a scripted "be nice" rule.

**Trade is the bargaining/auction surface.** `trade` (`being/doing/changing/trading/scripts/trade.mjs`) moves possession by a dual-filed `located-in` change and quotes `richness` before/after each leg.
This is where mechanism design lands: a trade is a bargain whose terms two fibers must agree on, and TAB already has a value signal (richness) to price it.
Proposal: an *auction* for a contested resource is a sequence of trade-offers settling to the highest; a Vickrey rule (winner pays the second-highest offer) is strategyproof and expressible as a deterministic read over the offered rows, so bidders have no incentive to misrepresent worth.
The Gibbard–Satterthwaite caveat holds — TAB buys strategyproofness with the medium of exchange (richness/goods), exactly as the theory predicts a money-mediated mechanism must.

**The bilattice ⊤ models a disputed bargain natively.** In bargaining theory the hard case is the *contested claim* — both parties assert the deal is theirs.
TAB does not need a special "dispute" state: `value.mjs` settles a cell carrying both an assertion and its converse to ⊤ ("held both ways"), and `socialize` already uses this — a relationship supplying both warm and cold evidence settles to `ambivalent` (⊤), "a real, contested relationship, not a bug."
Proposal: a disputed possession or a broken bargain is a `located-in` / `owes` cell at ⊤ — the world *holds the contradiction as content* and the renderer shows it, rather than silently picking a winner.
This is the honest model of a bargaining impasse: the game-theoretic "disagreement point" rendered as a first-class value, available for a sanction or arbitration move to resolve, never erased.

**Schelling points are named places and scheduled events.** Coordination-without-communication wants focal points.
TAB's areas have names and `exit-*` topology, and a multiplayer world adds scheduled events (a market day, a meeting hall).
Proposal: these are equilibrium-selection devices — players converge on the named market at the conventional time not because anyone coordinated but because it is *salient*, exactly Schelling's mechanism.
Cheap to provide (they are data), and they do the work of turning many possible meeting equilibria into one expected one, which is the precondition for repeated trade between players who would otherwise never find each other.

**Federation reframes the game as non-cooperative by construction.** `federate` (`being/doing/federating/scripts/federate.mjs`) merges worlds by a G-Set union of content-addressed logs — same SHA-256, same identity, no central server, no "server transfer."
Proposal: this is what forces the *non-cooperative* frame.
With no central authority, no agreement between players is *binding* in the cooperative-game sense — there is no enforcer to appeal to.
So cooperation in a federated TAB cannot rest on enforced contracts; it must rest on the self-enforcing equilibria of repeated play and reputation (Folk Theorem, indirect reciprocity) — which is why the reputation channel above is not a nicety but the load-bearing mechanism.
Federation also imports the *Sybil* problem from distributed-systems game theory: identity is a content-address an actor can mint freely, so reputation must attach to *history-bearing* identities (logs with a costly, observable past), not to bare names — a constraint developed in the companion note's trust-without-a-center section.

**Design stance: cooperation as an ESS, not a script.** The throughline is the evolutionary lens.
A multiplayer TAB is a population of strategies (player and NPC behaviours) that spread by payoff and imitation.
The design goal is to make *conditional cooperation* — cooperate with the well-reputed, punish the over-drawer — the **evolutionarily stable strategy**: the behaviour that, once common, out-pays and cannot be invaded by always-defect.
That is achieved not by forbidding defection but by *pricing* it through the recorded, public, federation-portable consequences the substrate already carries.
The rules make cooperation win; the equilibrium does the rest.

## Sources

- von Neumann, J. & Morgenstern, O. (1944). *Theory of Games and Economic Behavior*. Princeton University Press. (Expected-utility axioms; cooperative/non-cooperative distinction.) — https://en.wikipedia.org/wiki/Von_Neumann%E2%80%93Morgenstern_utility_theorem
- Nash, J. (1950). "Equilibrium Points in n-Person Games." *PNAS* 36(1): 48–49. — https://www.pnas.org/doi/10.1073/pnas.36.1.48 ; Nash, J. (1951). "Non-Cooperative Games." *Annals of Mathematics* 54(2): 286–295.
- Shapley, L. S. (1953). "A Value for n-Person Games." (The Shapley value; cooperative-game division.)
- Axelrod, R. (1984). *The Evolution of Cooperation*. Basic Books. (Tit-for-tat; nice/retaliatory/forgiving/clear; shadow of the future.) — https://en.wikipedia.org/wiki/The_Evolution_of_Cooperation
- Axelrod, R. & Hamilton, W. D. (1981). "The Evolution of Cooperation." *Science* 211(4489): 1390–1396.
- Friedman, J. W. (1971). "A Non-cooperative Equilibrium for Supergames." *Review of Economic Studies* 38. (The Folk Theorem via trigger strategies.) — https://en.wikipedia.org/wiki/Folk_theorem_(game_theory)
- Schelling, T. C. (1960). *The Strategy of Conflict*. Harvard University Press. (Focal points.) — https://en.wikipedia.org/wiki/Focal_point_(game_theory)
- Hurwicz, L. (1972). "On Informationally Decentralized Systems." (Incentive compatibility.) — Nobel 2007 background: https://www.nobelprize.org/prizes/economic-sciences/2007/popular-information/
- Vickrey, W. (1961). "Counterspeculation, Auctions, and Competitive Sealed Tenders." *Journal of Finance* 16(1): 8–37. (Second-price auction; VCG ancestor.) — https://en.wikipedia.org/wiki/Mechanism_design
- Gibbard, A. (1973) & Satterthwaite, M. (1975). The Gibbard–Satterthwaite theorem; Myerson, R. (1979), the Revelation Principle.
- Maynard Smith, J. & Price, G. R. (1973). "The Logic of Animal Conflict." *Nature* 246: 15–18. (Evolutionarily stable strategy.)
- Nowak, M. A. & Sigmund, K. (2005). "Evolution of Indirect Reciprocity." *Nature* 437: 1291–1298; Nowak, M. A. (2006). "Five Rules for the Evolution of Cooperation." *Science* 314: 1560–1563.
- TAB machinery: `being/doing/responding/deciding/scripts/decide.mjs` (the `use` move depletes a shared `amount`); `being/doing/observing/needing/scripts/needs.mjs` (pressing-need reading); `being/doing/responding/socializing/scripts/socialize.mjs` (opinion-of; ⊤ = ambivalent); `being/doing/changing/trading/scripts/trade.mjs` (dual-filed exchange; richness quote); `being/doing/federating/scripts/federate.mjs` (G-Set union; content-addressed identity); `being/library/value/scripts/value.mjs` (the bilattice ⊤).
- Companion notes: `docs/dev/notes/the-commons-and-governance.md`, `economy-is-predicate-richness.md`, `next-gen-engine-architecture.md`.
</content>
</invoke>
