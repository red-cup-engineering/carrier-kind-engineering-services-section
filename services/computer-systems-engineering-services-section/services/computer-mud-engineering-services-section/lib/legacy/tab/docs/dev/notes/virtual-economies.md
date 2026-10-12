---
name: virtual-economies
description: What two decades of virtual-economy research (Castronova's Norrath GDP, Lehdonvirta & Castronova's Virtual Economies, EVE's player-driven single shard, mudflation, faucets/sinks, item decay, gold-farming/RMT as attack, comparative advantage) actually found — kept separate from how it maps onto tab's running machinery. The headline: the discipline's hardest-won lesson is that a virtual economy is a faucet/sink flow problem, and tab's needs/resource-depletion loop is a faucet with almost no sinks, while richness-as-value and trade-as-dual-filing already give tab a NATIVE economy the field had to bolt on. Extends economy-is-predicate-richness.md.
---

# Virtual economies — what the field found, and where tab stands

The existing note `economy-is-predicate-richness.md` argues that in tab the economy is not a subsystem: value IS fiber richness, trade IS dual-filed `located-in`, scarcity IS settledness, contested value IS ⊤.
That note reasons from the predication-world-sim doc and tab's code.
This note brings the outside discipline — twenty-odd years of people studying real shipping virtual economies — alongside it, and asks where their hard-won lessons land on tab's machinery.
The two halves are kept apart: **FACTS** (what the literature reports) and **tab** (proposals, marked).

The single most load-bearing finding is not about value at all.
It is about *flow*: a virtual economy lives or dies on the balance between **faucets** (where currency and items enter) and **sinks** (where they leave). tab today has a strong faucet story and almost no sinks.
That is the gap this note exists to name.

## FACTS — the founding measurements (Castronova)

Edward Castronova (PhD economics, Wisconsin 1991; professor at Indiana) wrote the first serious economics of a virtual world.
His 2001 paper *Virtual Worlds: A First-Hand Account of Market and Society on the Cyberian Frontier* treated EverQuest's planet **Norrath** as a real economy and measured it: by valuing Norrathian goods against the eBay price of the platinum-piece currency (~120 platinum to US$1 in 2001), he computed a **GNP per capita of about US$2,000**, which placed Norrath's per-capita output **77th in the world — between Russia and Bulgaria**, with an implied aggregate around US$135 million.
The point was not the number but the claim it licensed: virtual goods are *genuinely scarce* and therefore have *real value*, so the tools of economics apply without apology.

His 2005 book *Synthetic Worlds: The Business and Culture of Online Games* generalizes: conditions of **scarcity, specialization, and comparative advantage** inside a synthetic world reproduce the properties of contemporary economies, so economic theory can be used to *study* — and to *design* — them.
The founding move of the whole field is exactly the move the existing tab note makes from the other direction: there is no clean line between "the game" and "the economy."

## FACTS — faucets and sinks, mudflation, decay (Lehdonvirta & Castronova)

Vili Lehdonvirta and Castronova's *Virtual Economies: Design and Analysis* (MIT Press, 2014) is the field's textbook.
Its frame: a virtual economy is built from **markets, institutions, and money** over **artificially scarce** goods, and the designer's central job is to manage the **flow** of those goods through the system.
The operational vocabulary:

- **Faucet** — any source that *creates* new currency or items: a mob drop, a quest reward, a completed dungeon, a gathered resource node, a crafted output.
  Every kill, quest, and gather is a faucet.
- **Sink** — any drain that *destroys* currency or items, removing them from circulation: repair costs, transaction taxes, item decay/breakage, NPC vendor purchases, consumables, fees, and high-priced low-utility "money-burning" goods.
- **Mudflation** (the MUD-era term) — when the continued operation of the world makes previously-acquired wealth and gear *decline in value*, because the uninterrupted flow from faucets outpaces the sinks.
  The canonical statement: **"without sinks, there will be inflation."**

The design lesson is blunt and repeated across the literature: **faucets are easy and fun to add, sinks are hard and unpopular, and a world that only adds faucets inflates until its currency is worthless.** Concrete sinks that shipped and worked:

- **WoW repair costs** — gear loses durability with use and must be repaired for gold; a *dynamic* sink, because repair bills scale with character level, so the drain grows as the faucet grows.
- **WoW auction-house cut** — a *percentage* tax on sales; because it is a percentage, it removes *more* gold in absolute terms exactly when prices are inflating, a self-strengthening sink.
- **EverQuest / RuneScape money-burners** — mounts, houses (RuneScape Construction sinks millions building a player house), and prestige goods with low intrinsic utility, sold expressly to soak up excess currency.
- **Ultima Online blue armor / Kingdom of Loathing collectibles** — items priced high but with little gameplay benefit, introduced purely as sinks.

Two structural subtleties the book stresses: (1) the best sinks are **dynamic** — they scale with wealth (percentage taxes, level-scaled repair) so the drain tracks the faucet automatically rather than needing constant hand-tuning; (2) **item decay is itself a sink** — gear that wears out keeps demand for new gear alive, so the crafting faucet has somewhere to flow *to*.
A world with durable, never-decaying items and an ever-flowing crafting faucet floods itself.

## FACTS — EVE Online: the player-driven single shard

EVE Online is the field's living laboratory because it is almost entirely **player-driven** and runs on a **single shard** — one universe, one market, every player in the same economy rather than sharded copies.
CCP Games employed economists and publishes **Monthly Economic Reports** with money supply, faucet/sink breakdowns, production, and trade — central-bank-style instrumentation of a game economy.

Two facts matter most for tab:

- **Destruction is the primary sink.** In EVE, ships and modules are *consumed* — when a ship is destroyed in combat it is gone, and its replacement must be re-mined, re-manufactured, and re-bought.
  The **Battle of B-R5RB** (January 2014, ~7,548 characters, 21 hours) destroyed over **11 trillion ISK** of ships, an estimated US$300,000–330,000 of real value, in a single battle.
  That is a colossal *sink event*: it pulled enormous accumulated value out of circulation and created fresh demand all the way down the production chain.
  EVE's loss-is-permanent design is what keeps its economy from drowning in its own faucets.
- **Production chains and comparative advantage are the content.** Because players have different opportunity costs, not everyone is suited to every task, so **specialization and a division of labor** emerge: miners, refiners, manufacturers, haulers, traders, each depending on the others through "intricate networks of interdependence."
  The economy is not a menu of vendor prices; it is an emergent web of who-makes-what-for-whom.
  EVE's total in-game value was estimated around US$18M (2014) — but the interesting quantity is the *structure* of trade, not its sum.

## FACTS — gold-farming and RMT as an economic attack

Real-money trading (RMT) — selling in-game currency, items, or characters for real cash — and the **gold-farming** (often botted) that supplies it are studied as **negative externalities** and, in the field's own framing, as an **economic attack** on the world.
Castronova analyzed RMT with ordinary supply-and-demand.
The mechanism of harm: gold farmers run an **industrial faucet** — monopolizing high-yield resource nodes, botting kills around the clock — that floods the currency supply far faster than designed, driving **artificial inflation** that disadvantages players who earn honestly.
Lehdonvirta's framing is that RMT is "like pollution" of the service the designers are trying to provide.
The research direction is mostly **detection** (trading-network analysis, anomaly detection on player-driven markets) — finding the attacker by the abnormal *shape* of their flow, not by any single transaction.

The deep point for any economy design: an attacker who can mint currency cheaply (a bot farm) is attacking the **faucet/sink balance** itself.
Defenses are either better sinks (so excess drains out) or detecting and closing the abnormal faucet.

## tab — mapping the findings onto the running machinery

The existing note already claims tab has a *native* economy.
The field's findings sharpen exactly *which* parts are native and *which* part is missing.
(Everything in this section is proposal / reading, not built behavior unless it cites shipped code.)

### tab — richness-as-value and trade-as-dual-filing ARE the native economy

What Castronova had to *argue into existence* — that virtual goods have real, scarcity-grounded value and that "the economy IS the game" — tab has by construction.
`economy-is-predicate-richness.md` already grounds this: value is the determined-cell count of a settled fiber (`being(...).fiber`), computed not assigned; trade is two dual-filed `located-in` legs, which is **double-entry accounting for free** — the field builds ledgers; tab's EAVT *is* the ledger.
So tab does not need to bolt on a market data structure to *have* prices: a `richness(thing)` read quotes value directly.
This is the half tab is *ahead* on.

### tab — needs/resource-depletion IS a faucet/sink loop, but it is mostly faucet

This is the load-bearing map. tab ships **needs/resources that DEPLETE** (the scarcity layer) and **`#crafting`** (fiber fusion, recipes-as-data).
Read through the field's vocabulary:

- A **gathered/crafted output** is a **faucet** — a `#crafting` fusion mints a new rich fiber; a resource node yields material.
  Faucets, tab has.
- A **depleting need** (hunger draining, a resource node emptying) is a **consumption sink** — value leaves when food is eaten or a node runs dry.
  So tab has *one* genuine sink class already: consumption.
- **The gap:** tab has *consumption* sinks but no obvious **durability/decay sink** on crafted goods, no **transaction-tax sink** on trade, no **money-burner sink**.
  The field's blunt lesson — "without sinks, there will be inflation" — predicts that as soon as tab has persistent players crafting, the world fills with durable rich fibers and their value mudflates.
  A sword's fiber, once fused, does not wear out; `#crafting` is a faucet with no matching item-decay sink.

So the field-grounded proposal is a **decay sink expressed in tab's own terms**: an item's fiber *loses determined cells over use/time* — a `#degrading` move (the inverse of `#advancing`) that supersedes determined cells back toward ⊥, lowering `richness` and so lowering quoted value.
Because value IS richness, *decay needs no separate durability number*: a worn sword is literally a thinner fiber.
This is item-decay-as-a-sink rendered natively — the field's sink, but as fiber arithmetic, not a bolted-on durability stat.

A second native sink is the **transaction tax**: because trade is a dual-filed `located-in` exchange, a percentage sink is one extra leg that retires a fraction of the exchanged richness to ⊥ (or to a "world" anchor).
The field's strongest sink — a *percentage* drain that scales with the trade — falls out of the `trade({give, take})` move sketched in the existing note's addendum with one added leg.

### tab — the fold IS the mudflation mechanism, made literal

`economy-is-predicate-richness.md` already records the claim "inflation IS the tower expanding faster than settlement … more tokens than there are stable values backing them," and notes the tower/fold is the deferred growth layer (`grow.mjs` to be ported).
The field gives this a precise external name: **mudflation is faucets outrunning sinks.** In tab those are the same statement: the fold mints new vocabulary atoms (faucet) and *settlement* is what backs them (the sink-side stability).
So the diagnostic the existing note names — "the ratio of freshly-minted predications to settled functional cells" — is exactly the field's faucet/sink ratio. tab can, in principle, *instrument its own mudflation* the way CCP instruments EVE: a Monthly-Economic-Report-style read over the fold reporting minted-vs-settled.
The instrumentation is a pure read; tab has the substrate for it once the fold runs.

### tab — gold-farming/RMT as an attack on the faucet/sink ratio

The field studies RMT as an industrial faucet detected by the abnormal *shape* of its flow. tab's substrate is unusually well-suited to this defense because the world IS an append-only, content-addressed trace: a bot's industrial faucet appears as an abnormal *density* of mint events (`#crafting`/gather faucets) at one anchor, and trade is dual-filed so every transfer is locally auditable from both sides.
The field's "detect the attacker by the shape of their flow" is, in tab, a read over the trace's faucet density per anchor — the same minted-vs-settled instrument, narrowed to one subject.
(Proposal; no detection code exists.)

### tab — comparative advantage and production chains as emergent, not authored

EVE's lesson is that the *content* is the emergent web of specialization, not a vendor menu. tab's crafting is **recipes-as-data** and value is **computed** from fiber richness, so a production chain (ore → ingot → blade → sword) is just a sequence of `#crafting` fusions, each raising richness, each a faucet feeding the next stage's input.
Comparative advantage emerges if different entities have different fibers (different settled skills via `#practicing`/`#advancing`), making them better at different fusions — which is exactly tab's skill model.
So the *interdependence web* EVE grows by hand-balancing, tab grows from the algebra: who-can-make-what is a fact about whose fiber composes with which recipe (`composes(target, message)`), computed, not assigned.
The note `next-gen-engine- architecture.md` flags the demo world as where this gets exercised; this is the economic content of that demo.

## What tab is ahead on, and the one loop it must close

Tallying against the field: value-with-real-scarcity (Castronova's founding argument) and the-economy-is-the-game and double-entry trade — tab has these by construction, where the field had to build or argue them.
Comparative-advantage production chains — tab grows from the skill/crafting algebra rather than hand-balancing.
The fold gives mudflation a literal mechanism and a free diagnostic.

The one thing tab is *behind* on is the field's hardest, least glamorous lesson: **sinks.** tab is strong on faucets (crafting, gathering) and has only consumption sinks (depleting needs).
Without a **decay sink** (fiber thinning, expressed as `#degrading`) and ideally a **transaction-tax sink** (an extra `located-in` leg retiring richness), tab's economy will mudflate the moment it runs at scale — and the beautiful part is that *both sinks are native*: decay is just richness flowing back toward ⊥, tax is one more dual-filed leg.
The economy is the algebra; the missing piece is the half of the algebra that *removes* value, not the half that makes it.

## Sources

### Theory (external) - Edward Castronova, *Virtual Worlds: A First-Hand Account of Market and Society on the Cyberian Frontier* (CESifo Working Paper No. 618 / SSRN, 2001) — Norrath GDP/GNP-per-capita measurement, platinum-to-eBay valuation, "77th richest / between Russia and Bulgaria." https://papers.ssrn.com/sol3/papers.cfm?abstract_id=294828 - Edward Castronova, *Synthetic Worlds: The Business and Culture of Online Games* (Univ. of Chicago Press, 2005) — scarcity/specialization/comparative-advantage reproduce real-economy properties. - Vili Lehdonvirta & Edward Castronova, *Virtual Economies: Design and Analysis* (MIT Press, 2014) — markets/institutions/money over artificial scarcity; faucets, sinks, money supply, design of flow. https://mitpress.mit.edu/9780262535069/virtual-economies/ - "Gold sink" (Wikipedia) — faucet vs sink, passive vs active/dynamic sinks, "without sinks there will be inflation," UO/RuneScape/KoL examples. https://en.wikipedia.org/wiki/Gold_sink - "Mudflation" (Muds Wiki / The Ancient Gaming Noob) — definition: continued operation devalues acquired resources; uninterrupted faucet flow. https://tagn.wordpress.com/2021/09/06/dealing-with-mudflation/ - "Battle of B-R5RB" (Wikipedia) — single-shard destruction event, ~11 trillion ISK / ~US$300–330k destroyed as a sink event. https://en.wikipedia.org/wiki/Battle_of_B-R5RB - EVE Online Monthly Economic Reports (CCP Games) — faucet/sink/money-supply instrumentation of a player-driven economy. https://www.eveonline.com/news/view/monthly-economic-report-february-2026 - Lehdonvirta et al., gold-farming/RMT literature — RMT as negative externality / "economic attack" / "pollution"; detection by trading-network and anomaly analysis. https://www.researchgate.net/publication/263566691_Understanding_Gold_Farming_and_Real-Money_Trading_as_the_Intersection_of_Real_and_Virtual_Economies

### tab (this repository) - `docs/dev/notes/economy-is-predicate-richness.md` — value-as-richness, trade-as-dual-filing, scarcity-as-settledness, ⊤-as-contested-value, inflation-as-tower-outrunning-settlement; the `richness(thing)` / `trade({give,take})` addendum this note extends with sinks. - `docs/dev/notes/next-gen-engine-architecture.md` — "one algebra, no subsystems"; the demo world as where production chains/specialization get exercised. - Built systems referenced as faucets/sinks: `#crafting` (fiber fusion, recipes-as-data), needs/resources that deplete (consumption sink), `#practicing`/`#advancing` (skill differentiation → comparative advantage), the dual-filed `located-in` trade leg, the tower-`fold` (mint = faucet, settlement = backing).
(Per the task brief and the existing economy note; fold deferred per `next-gen-engine-architecture.md`.)
