---
name: economy-is-predicate-richness
description: Value is fiber richness, not an assigned number; trade is fiber exchange (predicates moving between logs); scarcity is settledness; inflation is the tower outrunning settlement. Maps the world-sim's economic layer onto tab's concrete machinery — cells, located-in, the FUNCTIONAL set, the bilattice ⊤ — and marks the one light signal tab would need to make value legible.
---

# The economy is predicate richness

The predication-world-sim makes a strong claim: there is no separate economy subsystem to bolt onto play.
"The game economy isn't a designed system bolted onto gameplay — it IS gameplay."
Every interaction already moves value, because value is not a number an entity carries but a property of how richly its fiber composes. tab's machinery — settled cells, dual-filed `located-in`, the `FUNCTIONAL` set, the bilattice — already realizes most of this; what it does not yet do is *signal* it.

## Value is fiber richness

The doc's headline: "Value IS predicate richness."
A sword with three predicates is worth less than one with fifteen, "because respond() with it produces richer results.
Value isn't assigned — it's computed from fiber richness."

In tab a thing's fiber is literally a list of settled cells: `being(subject, trace)` returns a fiber, one cell per distinct `(predicate, object)` pair folded out of the trace.
A "rich" thing is one whose log has accumulated many distinct, *determined* cells; a thin thing is one whose fiber is short or mostly ⊥.
The substrate already distinguishes a determined cell from honest ignorance (`isDetermined` is true exactly when there is positive or negative evidence).
So value-as-richness is a function of the determined region of a fiber — which tab computes today, and could read off directly.

This is why `respond` is the right place to ground value.
The available actions against a target are "COMPUTED, not listed — whatever messages produce non-⊥ when composed with the entity's fiber."
A richer fiber affords more non-⊥ responses; `composes(target, message)` is true for more channels.
So "worth more" is not metaphor: a richer fiber is one more messages compose with — exactly more affordance.

## Trade is fiber exchange

"Trade IS fiber exchange.
When two entities trade, predicates move between fibers."
And: "the sword you receive ISN'T the same sword I had, because it's now entangled with your predicates instead of mine.
Trade changes the thing traded.
Not metaphorically — geometrically."

tab carries the first half concretely.
`located-in` is "both relational (dual-filed at the place) and functional (an item is in exactly one place at a time; the latest-t row wins), so picking an item up is just a new located-in row, never a mutation of history."
A transfer of possession is one append whose object is the new holder.
Because `located-in` is RELATIONAL it is dual-filed — cached at the object anchor too — so the new holder's log gains the item as contents (`containedBy`) and the old holder's latest `located-in` no longer names them.
The "double-entry" the doc calls for — "my inventory debits the sword, yours credits it" — *is* dual filing: one row, filed at both anchors, read locally from either side.
No ledger object is needed; the accounting IS the EAVT.

The second half — "the sword's entangled pairs (its history) compose with YOUR fiber now" — tab carries in raw form (the whole append-only trace travels with the item) but does not yet *read*.
The entangled-pairs reading is `history-is-geometric`'s territory; here it suffices that the material is present (the log) and the geometric read is unbuilt.

## Scarcity is settledness

"Scarcity IS settlement. ...
Scarce resources are settled resources.
Abundant resources are firable. ...
Gold is scarce because its predicates are highly settled (dense, inert, stable).
Food is abundant because its predicates are firable."

tab's nearest concrete handle is the `FUNCTIONAL` set and supersession.
A functional predication is single-valued over time; the substrate reads the latest-t row, so a change supersedes its predecessor without mutating history.
A settled functional cell is the cheap, stable, closed-under-interaction kind the doc calls scarce: one current value, a fresh assertion supersedes rather than multiplies it.
A non-functional (firable, many-valued) predication accumulates cells freely — abundant.
So tab's functional/relational split already encodes the scarce/abundant split, even though tab does not yet name a price from it.

## Contested value is ⊤

The doc treats contradiction as a value, not a fault: "⊤ is contradiction as a VALUE, not a bug. ⊥ is honest ignorance."
For an economy this is the home of *contested* value — the same good worth one thing through one fiber and its opposite through another. tab already settles such a case to ⊤: when a cell carries both positive and converse (negative) evidence, the knowledge fold lands it at ⊤.
The doc's downstream-pollution example is exactly this: `respond(farm, river)` "now produces ⊤ on soil-health" because the soil is "both irrigated (good) and contaminated (bad)" — "the ⊤ value IS the emergence."
A contested price is the same shape, and the renderer is built to *show* it, not hide it.
The one thing an economy most often fudges — disagreement about worth — tab represents natively and visibly.

## Inflation is the tower outrunning settlement

"Inflation IS the tower expanding faster than settlement. ... more words than there are stable meanings ... more tokens than there are stable values backing them."
This is a claim about tab's growth layer (the tower/fold), which tab does not yet run — `tower-fold-procedural-generation` records that `grow.mjs` is the working seed to port (a next-phase task).
So inflation is, for tab today, a *predicted* failure mode of a layer not yet present, worth recording because the diagnostic is already legible in tab's terms — the ratio of freshly-minted predications to settled functional cells.

## What tab has, and the one thing it lacks

Three of the doc's five economic claims land on machinery tab already has: trade is dual filing, scarcity is the functional/relational split, contested value is ⊤.
Inflation is a property of the deferred fold.
The one missing piece is small and additive: **a value-as-richness signal** — a pure read over a settled fiber returning "how rich is this thing", so the world can *quote* value, not just embody it.
That signal, and a trade move that exchanges `located-in` across two fibers, are the smallest next step — sketched in the addendum below.

## Addendum — the smallest next mechanic (design proposal, not yet built)

- **`richness(thing)`** — a pure read counting the determined cells of a settled fiber (⊥ contributes nothing; ⊤ counts — a thing the world argues about is not worthless), optionally weighting functional (scarce/settled) cells higher.
  Returns `{ score, determined, contested }`.
  Reads only `being(...).fiber` + the predicates already in `value.mjs`; nothing changes.
- **`trade({root, t, give, take})`** — two `located-in` exchanges recorded together.
  Each leg is the existing `changing` move on `located-in` (functional + relational), so supersession and dual filing — the double-entry — come for free.
  Reporting `richness` before/after lets the world quote the swap.
  No ledger, no mutation of history.

## Sources

- `development/lab/archive/predication-categories/bucket-4/.../predication-world-sim/predication-world-sim.md` §"Deeper: the economy of attention", §"The economic layer IS the game economy"
- `development/lab/tab/being/scripts/being.mjs` (fiber as settled cells); `being/library/value/scripts/value.mjs` (isDetermined; ⊤ as a value)
- `development/lab/tab/being/doing/responding/scripts/respond.mjs` (actions computed; composes)
- `development/lab/tab/being/library/thing/library/item/item.schema.json` (located-in relational + functional)
- `development/lab/tab/scripts/_substrate.mjs` (dual filing; the FUNCTIONAL set; containedBy); `being/doing/changing/scripts/changing.mjs` (functional supersession)
