# FizzOS

FizzOS is a deterministic world kernel and service runtime for inhabitable
multi-user computer systems. This is the current source-direct implementation:
one coherent package distilled from every archived FizzOS generation, with
their strongest capabilities restored behind explicit boundaries.

Retired implementations remain as read-only evidence in `lib/legacy`. The
current runtime does not import them and has no build step. It carries exactly
one runtime dependency, exact-pinned: `@lenticule-science/metrologic`, the house-consolidated
bilattice floor — not a private, drifting substrate copy but the same carrier
every other current `@561-group` package reads its FOUR algebra from.

## Semantic center

- Belnap FOUR stores positive and negative evidence independently, so
  contradiction is data rather than an excuse for explosion.
- Immutable assertion worlds make every transition inspectable and replayable.
- Functional predicates settle ordered races without conflating supersession
  with contradictory evidence.
- Local perception excludes remote state structurally.
- An ordered tick is the sole simulation writer.
- Optional capabilities compose explicitly instead of modifying process-global
  registries or a monolithic scene.

## Capability surface

The current package covers the union of the strongest July and August archived
systems:

- data-defined worlds, interaction, components, creator/admin operations, mail,
  professions, aliases, language, combat, doors, search, and comforts;
- persistence, atomic saves, exact restoration, replay, bounded checkpoints,
  stable sessions, flood control, idle ticking, and concurrency assays;
- deterministic clock, seasons, weather, tides, fields, ecology, markets,
  crafting, curing, construction, campaigns, trade routes, and ships;
- skills, social ties, reputation, crime, NPC agency, thoughts, interiority,
  predication, faculties, inhabiting, knowledge, communication, and ludics;
- governance, bounded Lisp automation, instancing, federation, HTTP service,
  terminal client, and reusable source client.

The 41 public subpaths name current architectural modules directly; no legacy
alias or compatibility layer is exported. Two data-defined examples—Garden and
Teraum—exercise the same public game boundary.

## Run it

Node.js 20 or newer is the only prerequisite.

```sh
npm run verify
npm exec fizzos
```

The local Garden client understands `look`, `go north`, `take lantern`,
`inventory`, `drop lantern`, and `say hello`. Set `FIZZOS_ACTOR` to choose the
actor identity.

The other executable interfaces are:

```sh
npm exec fizzos-world
npm exec fizzos-look
npm exec fizzos-tell -- gardener "go north"
npm exec fizzos-tick
PORT=3000 npm exec fizzos-serve
```

`fizzos-serve` exposes JSON health, metrics, connection, command, tick, and
event endpoints. It closes both its simulation timer and listener cleanly on
SIGINT or SIGTERM.

## Reproducible meet-or-beat proof

`content/capability-concordance.json` maps every distinct archived test category
to a current module and test. `npm run verify` then:

1. syntax-checks all shipped source, examples, tools, and tests;
2. runs the deterministic current suite, including a repeated 26,880-tick
   exact-replay horizon with a bounded active trace;
3. proves that the concordance is the complete archived category union;
4. imports all 41 package exports and checks all six executables;
5. verifies the packed npm artifact declares only the one permitted,
   exact-pinned `@lenticule-science/metrologic` runtime dependency and no other.

See `content/capability-concordance.md` for the comparison and
`content/architecture.md` for the module theory.

## Improvements over the archive

The reconstruction retains the archives' assertion model, per-actor fibers,
deterministic simulation, content-defined games, broad world systems, and
document-like command/event seams. It also removes their recurring liabilities:

- no bespoke, drifting external substrate package seam — the sole external
  dependency is the canonical, house-consolidated `@lenticule-science/metrologic` bilattice
  floor, exact-pinned, replacing what was previously a hand-rolled local copy;
- no process-global functional-predicate state;
- no mutable `Map` presented as an immutable world;
- no wall-clock time or ambient randomness inside settlement;
- no single scene module coupling every optional system;
- no breadth claim without executable current and packed-package evidence.
