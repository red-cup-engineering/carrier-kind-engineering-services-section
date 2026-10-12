---

date-created: 2026-03-30
description: "Consolidation plan for four Racket MUD projects into one qtops engine + library."
---

# QtOps Consolidation Plan

## What this is

QtOps ("qualities operations") is a MUD engine built in Racket where things are closures that dispatch on symbols, and identity is constituted relationally through the procedures a thing carries.
Qualities compose via `<>` prefix functions — no inheritance, no type hierarchy.

This project consolidates four prior Racket MUD projects into one living codebase.

## Target structure

```
qtops/
├── engine/           # Core runtime
│   ├── things.rkt    # Closure-based thing model
│   └── qualities/    # Basic qualities (contents, area, exits, lookable, ...)
│
├── library/
│   ├── teraum/       # The Teraum world (merged from all sources)
│   └── emsops/       # emsenn's game extensions (harvestable, NPC, okaga, ...)
│
├── archive/          # All original source projects, untouched
│   ├── racket-mud/
│   ├── racket-mud-ecosystem/
│   ├── teraum-mud/
│   └── teraum-racket-mud/
│
└── PLANS.md
```

## Source projects and what they contribute

| Project | Primary value | Status |
|---------|--------------|--------|
| racket-mud | Original struct-based engine. Fully subsumed by ecosystem's racket-mud-old/. | Reference only |
| racket-mud-ecosystem | **qtops core library** (closure model, ~60 qualities), emsops extensions, old engine archived inside. | Engine source |
| teraum-mud | Standalone QtOps world. Runnable. Quality defs may be more current. Bellybrush focus. | Engine + content source |
| teraum-racket-mud | Richest content (Ack 23 lookables/room, Honeyfern Labs, trivia layering). Recipe format. Old-sources archive. | Content source |

## Approach

### Phase 1: Stabilize the engine

Extract `qtops/things.rkt` and the basic qualities from `racket-mud-ecosystem/qtops/` into `engine/`.
Get it running on contemporary Racket.
No content, just the core model:

- Create a thing
- Apply qualities
- Send messages
- Verify the closure/procedure model works

### Phase 2: Minimal runnable world

Stand up a minimal Teraum — one room, one connection, look/move/chat.
Pull from `teraum-mud/main.rkt` and `racket-mud-ecosystem/teraum/`.
Prove the engine runs a real MUD.

### Phase 3: Migrate library content

Incrementally port content from all sources into `library/teraum/`:

- Regions and areas (merge Bellybrush from teraum-mud + Ack detail from teraum-racket-mud)
- NPCs and objects
- Trivia layers
- Translate recipe-format content to qtops quality calls where needed

Only delete from archive after content is migrated AND runnable.

### Phase 4: Migrate emsops

Port game extensions (harvestable, NPC, document, okaga starship) into `library/emsops/`.

## Why the qtops model wins

The closure-based model is the one most aligned with how this repo thinks:

- **Identity is relational**: a thing is what it responds to, not what struct it is
- **Composition is functorial**: `<>` quality functions transform things without hierarchy
- **Semiotic interface**: things known by nouns/adjectives, matched by `term=?
  `
- **No imposed shape**: qualities compose orthogonally, no inheritance to fight

The struct model and recipe model are historical steps toward this.

## Programming standards

Every line we write must hold up to these.
No exceptions, no "fix later."

1. **`for-each` for side effects, `map` for values.** If you're not using the return value, it's `for-each`.
  Period.
2. **No hidden side effects.** A function called `>name=?
  ` must not also secretly mutate `term=?
  `.
  If two things must be set together, make that explicit in one function that says what it does.
3. **String building uses `string-join` or `format`, not mutation.** No `(set! r (string-append r ...))
  ` in a loop.
4. **Log deliberately.** Not every operation needs a log line.
  Log state transitions and errors, not routine lookups.
5. **Quality functions (`<>foo`) are the public API.** The `>foo` procedure constructors are internal plumbing — don't export them unless there's a reason.
6. **Each quality file must be independently testable.** Include `module+ test` with at least one test that applies the quality to a thing and exercises the procedures it adds.
7. **Qualities must not assume application order** beyond their declared dependencies.
  If `<>area` needs `contents`, it requires `contents.rkt` and applies `<>container` itself.
8. **No `call~~` in quality code.** That's an engine-internal escape hatch.
  Qualities interact with things through the message interface only.

## Quality migration order

Qualities depend on each other.
Migrate in this order, testing at each step.

### Tier 0 — Leaf qualities (no quality dependencies)

These only need `things.rkt`.
Migrate first, in any order:

- `notable` — `notable?
  `, `set-notable!
  `
- `noun` — nouns, adjectives, `noun=?
  `, `adjective=?
  `, `term=?
  ` composition
- `description` — `description`, `set-description!
  `
- `trivia` — `trivia`, `add-trivia!
  `, `add-trivium!
  `
- `mass` — `mass`, `set-mass!
  `
- `exits` — `exits`, `has-exit?
  `, `exit`
- `pronouns` — pronoun procedure constructors (helper, not a quality)
- `time` — `schedule-event!
  `, tick loop (needed later for animation)
- `client` — output buffer, `message!
  ` (needed later for mudsocket)
- `brightness`, `lit`, `energetic`, `radiation` — simple numeric qualities

### Tier 1 — Composites depending on Tier 0

- `lookable` — composes `description` + `noun`
- `npc` — composes `description` + `notable` + `pronouns`
- `fillable` — `fill-quality!
  ` (factory pattern, needs `things.rkt`)
- `sight` — `look-thing!
  ` (needs `message!
  ` from `client`)

### Tier 2 — Core world model

- `contents` — containment model (`<>container`, `<>contained`).
  Needs `fillable`.
- `universe` — thing registry, factory.
  Needs `fillable` + `universe-thing`.
- `noise` — ambient text.
  Needs `animation`.
- `region-area` — `region`, `set-region!
  `

### Tier 3 — Playable world

- `area` — composes `description` + `contents` + `exits`
- `object` — composes `notable` + `mass`
- `region` — region/area linking, `fill-areas!
  `

### Tier 4 — Network and interaction

- `mudsocket-client` — telnet client abstraction
- `mudsocket-server` — TCP listener
- `mudsocket-sight`, `mudsocket-speech`, `mudsocket-contents`, `mudsocket-trivia` — command handlers
- `rpg-mudsocket-server` — full connection handler composing all of the above

### Tier 5 — Game-specific (library/, not engine/)

- `teraumi`, `harvestable`, regional flavors (ackian, brusher, etc.)
- These go in `library/teraum/`, not `engine/`

## Rules

- Nothing in `archive/` gets deleted or modified
- Nothing in triage gets deleted until its content is proven migrated and running
- Each phase should result in something that actually executes
- Each quality must pass `raco test` before the next one starts
