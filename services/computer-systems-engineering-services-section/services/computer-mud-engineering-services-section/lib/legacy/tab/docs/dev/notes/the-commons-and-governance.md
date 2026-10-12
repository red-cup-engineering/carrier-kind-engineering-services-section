---
name: the-commons-and-governance
description: Hardin's Tragedy of the Commons vs Ostrom's Governing the Commons, stated as theory-facts with real citations — and the finding that TAB's `decide` already runs Hardin's dynamic (a shared, depletable resource pool drawn to zero by self-interested NPCs). Then maps Ostrom's eight design principles for how real communities AVOID the tragedy (boundaries, proportionality, collective choice, MONITORING, GRADUATED SANCTIONS, conflict resolution, local autonomy, nesting) onto emergent TAB systems built from machinery that already exists: reputation via `socialize`'s opinions and factions, monitoring via the public ambient log, sanctions via withheld trade and recorded stance. Closes with trust-without-a-center under federation: how content-addressed identity, the Sybil problem, and the bilattice ⊤ shape governance with no central server.
---

# The commons and governance

TAB's `decide` already produces a tragedy of the commons.
Not as a designed challenge — as the bare equilibrium of its rules: an NPC at a resource raises its own need and decrements the resource's `amount` by one, the pool is shared, nothing replenishes it inside the move, so a world of pure `decide`-agents draws every provider to zero and then starves at `idle`.
This is the single most important governance fact about a multiplayer TAB, and it is not hypothetical — it is what `being/doing/responding/deciding/scripts/decide.mjs` does today.
The literature that matters here is the literature on how shared resources are *actually* governed without collapse, and TAB has the machinery to build those governance systems from parts it already ships.
As with all notes here, the theory below is what the cited works say; the TAB mappings are proposals, marked as such.

## Theory-facts: Hardin vs Ostrom

**Hardin's tragedy (1968).** Garrett Hardin, "The Tragedy of the Commons" (*Science* 162, 1968), argued that a resource open to all is doomed: each user reaps the *full* private benefit of taking one more unit (one more cow on the common pasture) while the *cost* of degradation is spread across all users and deferred.
So the rational individual always takes more, every individual reasons the same way, and the commons is destroyed — "ruin is the destination toward which all men rush, each pursuing his own best interest."
Hardin's prescribed escapes were stark: either *privatize* the resource (cut it into owned parcels) or impose *central state coercion* ("mutual coercion, mutually agreed upon").
He saw no third way.

**Ostrom's correction (1990).** Elinor Ostrom, *Governing the Commons* (Cambridge University Press, 1990; Nobel 2009), showed empirically that Hardin was wrong about the third way.
Her central distinction: Hardin conflated an **open-access** resource (no rules, no boundary, anyone takes anything) with a **common-pool resource** (rivalrous and hard to exclude from, but *governed* by a defined community).
Open-access does collapse.
Common-pool resources, Ostrom documented across centuries of field cases — Swiss alpine pastures, Japanese village forests, Spanish *huerta* irrigation, Philippine and Nepali water systems — are routinely managed sustainably by their communities *without* privatization and *without* a central state, through self-organized institutions.
The communities solve the dilemma themselves.

**Ostrom's eight design principles.** From the long-enduring cases she abstracted eight design principles that successful common-pool governance shares:

1. **Clearly defined boundaries** — who may draw on the resource, and where the resource ends.
2. **Proportional equivalence between benefits and costs** — appropriation rules fit local conditions; those who take more (or benefit more) contribute more.
3. **Collective-choice arrangements** — those affected by the rules can participate in changing them.
4. **Monitoring** — the resource and the appropriators are watched, by monitors who are accountable to (often *are*) the users themselves.
5. **Graduated sanctions** — violators face penalties that *start small* and escalate with the severity and repetition of the offence; not instant exile, but a warning, then a fine, then exclusion.
6. **Fast, cheap conflict-resolution mechanisms** — low-cost local arenas to settle disputes.
7. **Minimal recognition of rights to organize** — the community's right to make its own rules is recognized (not overridden) by external authority.
8. **Nested enterprises** — for larger systems, governance is layered in nested tiers rather than one monolithic authority.

The mechanism underneath these is the game theory of the companion note: monitoring + reputation + graduated sanctions convert a one-shot Prisoner's Dilemma into an indefinitely repeated game with recognizable, history-bearing partners, in which conditional cooperation is the equilibrium (Folk Theorem; Axelrod's tit-for-tat; Nowak & Sigmund's indirect reciprocity).
Ostrom's principles are, read through the companion note, the *engineering* of the conditions under which cooperation is an ESS.
Olson's *The Logic of Collective Action* (1965) supplies the contrast Ostrom answers: large anonymous groups free-ride and fail to provision public goods *unless* the group is small enough, or structured enough, for contributions to be monitored — which is exactly the structure Ostrom's principles supply.

## TAB-proposals: Ostrom's principles as emergent systems

These are proposals for how TAB builds Ostrom's governance from machinery it already has.
The point is that none of them is a scripted "be cooperative" rule — each is an incentive structure that makes cooperation pay.

**The tragedy is already TAB's default.** `decide`'s co-located `use` move (`{ subject: resource, predicate: "amount", object: Math.max(0, amount - 1) }`) is the cow on the common pasture: private benefit to the user (`need:<x>` raised), shared and deferred cost (the pool drops for everyone, forever).
`resourcesFor` drops any provider with `amount <= 0`, so depletion is terminal within the current rules.
TAB ships Hardin's *open-access* world.
The work is to make it a governed *common-pool* world — to add Ostrom's principles as systems, not to rewrite `decide` into a saint.

**Boundaries and proportionality (principles 1–2): cells on the resource and the actor.** Boundaries are data: a resource can carry a `governed-by:<faction>` cell and an actor a `member-of:<faction>` cell, so "who may draw" is a read, not a hardcode.
Proportionality is the richness signal the economy note already proposes — `richnessOf` quotes worth, so a draw can cost in proportion to benefit (an actor that takes more owes more), turning the free decrement into a *priced* appropriation.
Both are appends; neither needs new substrate.

**Monitoring (principle 4) is free — the log is public and ambient.** This is TAB's structural gift.
The world is an append-only EAVT log; every `use` that depletes a resource is a row anyone can read, and observation in TAB is *ambient* (a row filed at a place is visible to co-located observers through their Umwelt).
So monitoring — the principle Ostrom found communities must spend real effort to arrange — is the substrate's default: over-drawing is *witnessed by construction*, not by a watchman.
Proposal: the public, content-addressed, replayable log IS the monitoring institution.
A draw is a public act with a permanent record; there is nowhere to consume in secret.

**Reputation and graduated sanctions (principle 5) via `socialize`.** Because monitoring is automatic, sanctions can be social.
`socialize` files `opinion-of:<other>` cells (friend / rival / neutral / ambivalent) by composing fibers; a witnessed over-draw is negative evidence on the over-drawer that shifts others' opinions toward `rival`.
Graduation falls out naturally and *without a threshold table* if sanction severity reads the *recorded history*: a first offence is one negative cell (a cooler stance, a warning); repetition accumulates more (settling toward `rival`, then refusal to trade, then faction-wide exclusion).
The sanction ladder is the accruing public record, read at the moment of the next interaction — which is exactly graduated, community-administered punishment, emergent from the opinion mechanism rather than scripted.
Crucially, the sanction is a *withheld future benefit* (trade refused, resource access revoked), so it costs the sanctioner nothing and prices defection for the defector — the Folk-Theorem punishment that makes cooperation the equilibrium.

**Factions as the nested, collective-choice, conflict-resolution layer (principles 3, 6, 8).** A faction is an entity with members (`member-of`) and governed resources (`governed-by`); its rules are cells, changeable by appends from members (collective choice); disputes are resolved by reading the faction's recorded stance and, where contested, by the bilattice.
Nesting (principle 8) is the natural shape of content-addressed entities: a faction is an entity, factions can belong to larger entities, governance layers without a monolith.
Proposal: factions are not a new subsystem but a *naming convention over the existing opinion/membership cells* — the same `socialize`/`opinion-of` machinery read at the group level (a faction's stance toward an actor is the aggregate of its members' opinions).

**Disputes settle to ⊤, honestly (principle 6).** Conflict-resolution needs a way to *hold* a dispute before resolving it.
TAB has it: a contested claim — two parties both asserting a resource is theirs, a sanction one faction levies and another denies — settles to ⊤ in `value.mjs` ("held both ways"), the same value `socialize` already uses for an `ambivalent` relationship.
Proposal: a dispute is a cell at ⊤, rendered as a dispute (not silently resolved to one side), and a conflict-resolution move (arbitration, vote, ordeal) is what *lowers* it to t or f.
The world models the impasse as content, which is the precondition for a *fair, visible* resolution rather than a hidden tiebreak.

**The whole loop, as an equilibrium.** Put together: a resource is governed by a faction (boundary); drawing on it costs in proportion to benefit (proportionality); every draw is logged and ambiently witnessed (monitoring); over-drawing accrues negative opinion that escalates from a cooler stance to refused trade to exclusion (graduated sanctions); disputes hold at ⊤ until an arbitration move settles them (conflict resolution); and all of this is appends to a public log changeable by faction members (collective choice, local autonomy, nesting).
No step is a scripted "cooperate" command.
Each is an incentive that makes drawing-down-the-commons *cost the drawer their reputation and their future access* — so a self-interested actor, in an indefinitely repeated world of recognizable partners, cooperates because it pays.
That is Ostrom's finding rendered as TAB systems, and it is the answer to the tragedy `decide` ships with.

## Trust without a center: federation

Federation removes the one thing Hardin's *other* escape — central state coercion — depends on.
There is no central server: `federate` (`being/doing/federating/scripts/federate.mjs`) merges worlds by a G-Set union of content-addressed logs, so two instances share entities with the same SHA-256 and a player crosses servers by their log being sent as a message, with no authority transferring them.
This makes Hardin's "mutual coercion, mutually agreed upon" unavailable — there is no coercer.
Governance in a federated TAB *must* be the Ostrom kind (self-organized, reputation-and-sanction based) because the Hardin kind is structurally absent.
The companion note's point recurs: with no enforcer, no agreement is binding in the cooperative-game sense, so the only stable cooperation is the self-enforcing kind.

**Reputation is the trust primitive, and it is portable.** Because identity is a content-address and the log travels with the entity, an actor's *reputation travels with it across servers* — the negative opinions earned for over-drawing on one instance arrive, by G-Set union, on the next.
Proposal: this is trust-without-a-center done right — no central reputation server, yet a portable, tamper-evident history (content-addressing makes the log's rows verifiable; you cannot forge a row's hash).
A newcomer with a thin log is, correctly, an unknown quantity (its fiber is mostly ⊥ — honest ignorance, not a clean slate to exploit).

**The Sybil problem is the boundary the design must hold.** Distributed reputation has one structural attack: identity is cheap, so a defector can abandon a sullied identity and mint a fresh one (a Sybil), shedding its negative history.
TAB does not escape this for free — a content-address is mintable.
The defence is the one the literature points to: make reputation attach to *history-bearing* identities, so that a clean log is worth *less* than an established one.
Proposal: trust should weight an actor's *accrued, witnessed history* (a long log of honored trades and cooperative draws), so that a fresh identity carries no positive reputation to spend — abandoning a sullied log means abandoning all the trust it earned.
Combined with Ostrom's boundary principle (faction membership is gated, not open), this makes the Sybil's fresh start a *cost*, not an escape: the over-drawer who flees its reputation arrives everywhere as a stranger with nothing to trade on.
This is a design constraint, not a built feature — flagged here as the open governance problem federation introduces, and the place where the trust-without-a-center design earns or loses its stability.

## Sources

- Hardin, G. (1968). "The Tragedy of the Commons." *Science* 162(3859): 1243–1248. (Open-access collapse; privatization or central coercion as the only escapes.) — https://en.wikipedia.org/wiki/Tragedy_of_the_commons
- Ostrom, E. (1990). *Governing the Commons: The Evolution of Institutions for Collective Action*. Cambridge University Press. (Common-pool vs open-access; the eight design principles; field cases.) — https://evonomics.com/tragedy-of-the-commons-elinor-ostrom/ ; Ostrom Workshop: https://ostromworkshop.indiana.edu/courses-teaching/teaching-tools/tragedy-commons/index.html
- Olson, M. (1965). *The Logic of Collective Action: Public Goods and the Theory of Groups*. Harvard University Press. (Free-riding; why monitorable/small groups provision public goods.)
- Axelrod, R. (1984). *The Evolution of Cooperation*; Nowak, M. A. & Sigmund, K. (2005). "Evolution of Indirect Reciprocity." *Nature* 437: 1291–1298. (Repeated-game / reputation basis of the governance mechanism — see the companion note for full citations.)
- TAB machinery: `being/doing/responding/deciding/scripts/decide.mjs` (the `use` move depletes a shared, non-replenishing `amount` — Hardin's dynamic, shipped); `being/doing/observing/needing/scripts/needs.mjs` (`resourcesFor` drops depleted providers); `being/doing/responding/socializing/scripts/socialize.mjs` (`opinion-of`; ⊤ = ambivalent; the reputation/sanction register); `being/doing/federating/scripts/federate.mjs` (G-Set union; content-addressed, portable identity; no central server); `being/library/value/scripts/value.mjs` (the bilattice ⊤ for held disputes).
- Companion note: `docs/dev/notes/game-theory-and-multiplayer-incentives.md` (Nash, Folk Theorem, mechanism design, ESS — the game theory underneath these principles); `economy-is-predicate-richness.md` (richness as the proportionality signal); `next-gen-engine-architecture.md` (federation as a differentiator).
</content>
