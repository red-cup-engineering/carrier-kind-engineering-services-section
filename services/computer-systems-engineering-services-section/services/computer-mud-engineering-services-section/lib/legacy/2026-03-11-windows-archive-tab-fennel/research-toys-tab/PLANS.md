---

date-created: 2026-03-30
description: "Consolidation plan for seven Fennel MUD projects into one TAB engine + library."
---

# TAB Consolidation Plan

## What this is

TAB ("Things with Attributes and Behaviors") is a MUD engine built in Fennel where things are tables whose methods are resolved at call-time through metatable dispatch over a list of named behaviors.
Models are pure data (Fennel tables loaded from `.fnl` files); behaviors are pure code (tables of functions, also loaded from `.fnl` files).
Composition happens via `merge-models` with additive attribute accumulation -- no inheritance to override, just layers that stack.

This project consolidates seven prior Fennel MUD projects into one living codebase.

## Target structure

```
tab/
├── engine/           # Core runtime
│   ├── util.fnl      # Thing model, behavior dispatch, model merging
│   ├── models/       # Basic models (thing, container, dimension, animated, ...)
│   └── behaviors/    # Basic behaviors (thing, container, dimension, ...)
│
├── library/
│   ├── teraum/       # The Teraum world (merged from all sources)
│   └── groundhog/    # Botanical/herbalism data and extensions
│
├── archive/          # All original source projects, untouched
│   ├── tab/
│   ├── tab-old-gos/
│   ├── digital-garden/
│   ├── groundhog-os/
│   ├── marmud/
│   ├── gaz-ips/
│   └── teraum/
│
└── PLANS.md
```

## Source projects and what they contribute

| Project | Files | Primary value | Status |
|---------|-------|---------------|--------|
| tab | 368 | **TAB core engine**: models/behaviors split, dimension lifecycle, MUD server/client, timer, web server. Most modular architecture. | Engine source |
| tab-old-gos | 162 | Earlier MarMUD iteration. Monolithic models/behaviors, but has game data, ASCII maps, development docs. | Reference + content |
| groundhog-os | 153 | Richest domain data: 60+ succulent species, Teraum geography (Okaga, Eastlands), herbalism system, botany, recipes, fibercrafts. | Content source |
| digital-garden | 148 | Knowledge-management MUD variant with engine/server/client triple, recipe data, document models. Oldest lineage (chicory engine). | Extension source |
| marmud | 54 | Model-based engine variant (gen/map/mud/rpg/systems/teraum hierarchy). Teraum world regions. | Reference |
| gaz-ips | 34 | Operational tracking: projects, timesheet, inventory, ledger. REPL-oriented. | Extension source |
| teraum | 5 | Minimal standalone Teraum world (server + map). | Reference only |

## Approach

### Phase 1: Extract the engine

Pull from `archive/tab/` into `engine/`:

- `util.fnl` -- the core: `make-model`, `merge-models`, `collect-bases`, `lookup-behavior-method`, file I/O, logging
- Basic models: thing, container, dimension, animated, notable, massive, lookable, object, npc
- Basic behaviors: thing, container, dimension, animated
- System models and behaviors: sys/timer, mud/server, mud/client, map/area, map/region

Get it running on contemporary Fennel + Lua.
No world content, just the core model:

- Create a thing
- Apply behaviors
- Send a message through metatable dispatch
- Verify `make-model` resolves the full inheritance chain with additive attribute merging

### Phase 2: Minimal runnable world

Stand up a minimal Teraum -- one room, one telnet connection, look/move/chat.
Pull from `archive/tab/mud.fnl` (dimension definition) and `archive/tab/domains/models/domains/teraum/`.
Prove the engine runs a real MUD via `(: (require :mud) :lsr)`.

### Phase 3: Migrate library content

Incrementally port content from all sources into `library/teraum/`:

- Regions and areas (merge Eastlands/Central Plains from tab + Okaga and extended geography from groundhog-os + Teraum regions from marmud)
- Lookables, NPCs, objects
- Translate any content still in the older monolithic format (tab-old-gos, marmud) into TAB's models/behaviors split

Port botanical data into `library/groundhog/`:

- Plant database (60+ succulent species from groundhog-os)
- Herbalism and botany systems
- Recipes and fibercrafts

Only delete from archive after content is migrated AND runnable.

### Phase 4: Migrate domain extensions

Port specialized systems into `library/`:

- Digital garden knowledge-management features (from digital-garden)
- IPS operational tracking (from gaz-ips) -- projects, timesheet, inventory
- Any RPG extensions worth preserving (from marmud's rpg/ models)

## Why the TAB model wins

The metatable-dispatch model is the one most aligned with how this repo thinks:

- **Identity is behavioral**: a thing is defined by its behavior list, not a struct type -- `setmetatable made-thing {:__index util.lookup-behavior-method}`
- **Composition is additive**: `merge-models` with `additive-attributes` lets layers stack without overriding -- behaviors, lookables, grammar all accumulate
- **Data/code separation**: models (what a thing is) and behaviors (what a thing does) live in parallel directory trees, independently composable
- **Semiotic interface**: things known by grammar (nouns, adjectives, articles), matched by `term=?
  ` -- the same parsing-as-identity pattern as QtOps
- **No imposed shape**: a thing's shape is the union of its merged bases, not a fixed schema

The older monolithic model (digital-garden, marmud), the GOS-specific fork (tab-old-gos), and the domain-specific tools (gaz-ips) are historical steps toward this architecture.

## Rules

- Nothing in `archive/` gets deleted or modified
- Nothing gets deleted from archive until its content is proven migrated and running in the new structure
- Each phase should result in something that actually executes
