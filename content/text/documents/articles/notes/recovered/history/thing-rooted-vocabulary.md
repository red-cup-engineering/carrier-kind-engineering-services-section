---
name: thing-rooted-vocabulary
description: TAB's root vocabulary — thing, paracosm, intra-action — and the operations algebra being·doing·observing·changing·growing, with where each came from and how they nest. The spine the rest of the package hangs on.
---

# The thing-rooted vocabulary

`tab` starts from `thing` and uses the words the archive's `tab-2026-05-25/tab.schema.json` (line 5)
already coined. They are kept because they are load-bearing, not decorative.

- **thing** — the root object. The repo's definition: *"the polysemous wrapper for a categorical
  primitive; every thing IS an object at the math layer; every thing is the apex of a cone."* In
  tab a thing is a `<id>.jsonl` log; its state is the fold of its rows. It has no fields beyond
  `id` and `kind` — everything else is predications.
- **paracosm** — the world-engine; a populated, settling world. The fused note
  (`paracosm-and-world-sim-fused`) ties this to the formal paracosm theory: a tab world is a
  *model* of a paracosmic sketch, made to run.
- **intra-action** (Barad's agential realism) — a predication is not a property an entity *has* but
  a cut the world makes. Each base row `{e,a,v,t}` is an intra-action: `a` the apparatus, `v` the
  determinable. This is why negative evidence is the *converse* predication, not a polarity field,
  and why who made a cut is a *reified* row, not a column.

## The operations algebra (and how it nests)

`being` is the **root morphism**; the others nest under it because each works on the prior's
residue. A generator and the object/category it generates nest — exactly as in voidmath-kernel.

```
being        fold a trace → the settled thing                (generates `thing`)
└ doing      enact being: append the next intra-action       (works on being's residue, the trace)
  ├ observing  being localized to an observer (Umwelt)        (a sensing cut that returns, not changes)
  └ changing   functional doing (one place, one clock)        (single-valued-over-time predicates)
    └ ticking  the autonomous advance                          (a bundle of changes the world makes itself)
       └ growing  aperiodic→finite accretion  [next phase]
```

The user's correction during planning was precisely this nesting: *"since doing works on the
residue of being, it'd go nested in it."* It matters because **the path is the coordinate** — the
posix filepath is a Curry–Howard/Yoneda address, so a morphism's position states what it operates
on. `being/doing/changing/ticking/scripts/ticking.mjs` *reads* as "the autonomous advance is a
functional enactment of being," and that reading is the type.

## Why keep it deep rather than flat

A flat `library/{being,doing,observing,changing}` would lose the derivation. The depth says, for
free, that observing and changing are two ways of enacting being, that ticking is a kind of
changing, that growing is a kind of ticking-driven accretion. The archive proved the value of this
when its `grow.mjs` wrote rooms at a path *"whose path proves σ placed it there"* — the coordinate
is the proof term.

## Sources

- `development/lab/archive/multi-user-dungeon/tab/javascript/tab-2026-05-25/tab.schema.json` (line 5)
- `development/active/voidmath-kernel/README.md` ("the path is the coordinate")
- the `thing` definition under the predication-categories bucket (`.../library/object/library/thing/thing.md`)
