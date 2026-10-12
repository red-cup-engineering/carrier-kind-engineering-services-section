---
name: concurrency-and-the-tick
description: How the repo models concurrency without locks — one append-only graph that many writers share, a deterministic per-turn tick that settles it once, content-addressed G-Set merge that makes concurrent appends conflict-free, and settle as the confluent floor below which the arrow of time is one-way. Records the repo facts (swarm's "multiple agents, one graph, one tick"; voidmath's confluent settle; spacetime's irreversible settling step; tab's content-addressed substrate and G-Set federation) and proposes tab's runtime + multiplayer server: how many sessions settle once per tick under a tick-anchored global order, why content-addressing makes merges conflict-free, and how crash-recovery stays exact.
---

# Concurrency and the tick

tab's hard gaps are a fast runtime (Layer 1) and a real multiplayer server (Layer 3)
(`docs/dev/notes/next-gen-engine-architecture.md:25-26`). Both are concurrency problems: many
NPCs and many human sessions act "at once" against one world. The repo already carries a model
for this that does not reach for locks, threads-with-shared-mutable-state, or a transaction
manager. This note records that model in the repo's own words, then proposes how tab's runtime
and server use it.

## What the repo says

### One graph, one tick, many writers (FACT)

The swarm package states the shape directly. Its claim is that "a swarm is a field of semiotic
workers whose local articulations can be composed into relational models without first flattening
those workers into a central controller" (`development/lab/swarm/README.md:14-19`). Concurrency is
not coordinated by a controller; it is *folded* out of a shared trace. Work state "is derived from
EAVT traces, not maintained as a hidden in-memory object"
(`development/lab/swarm/README.md:196-198`): readiness, assignment, execution, review, and failure
are separate append-only JSONL records, and "derived status folds those traces"
(`development/lab/swarm/README.md:209-211`). Many offices act; none holds the status; status is a
fold over what everyone wrote.

Because state is a fold over an append-only log and never a live object, a restarted process
recovers it by re-reading files: `replayRunbooks(root)` "rebuilds those runbooks directly from
JSONL EAVT work rows" and is described as "the first crash/replay invariant ... a restarted
process can recover the runbook plan from files rather than trusting live objects from the
planning turn" (`development/lab/swarm/README.md:301-308`). `replayOperations(root)` extends this
to the whole board and returns "a compact snapshot plus replay residue"
(`development/lab/swarm/README.md:310-317`). The principle: nothing authoritative lives in memory,
so a crash loses nothing the log did not already hold.

### Settle is the confluent floor (FACT)

The voidmath kernel's `settle` "iterates the commutating closure possibilize . necessitate to its
knowledge-least fixed point (unique by confluence)" and "terminates by Knaster-Tarski over the
bounded knowledge lattice" (`development/active/voidmath-kernel/.../settling/scripts/settle.mjs:1-21`).
Confluence is the load-bearing word: whatever order the contributing moves arrived in, the fold
reaches one fixed point. tab's own non-confluence note records the kernel's stance that "`settle`
is the confluent floor" and that genuine forking ("multiple incomparable normal forms") lives in
the *upper* coherences, above the fold, not at settle time
(`docs/dev/notes/non-confluence-is-choice.md`, §"What the repo says" and §"Sources").

The spacetime package reads the same settle physically. `thermalizing` "is the kernel's `settle`"
and reaches "the knowledge-least fixed point (unique by confluence)"; crucially, "irreversibility
lives here — not in the local laws (reversible) but in the settling step itself"
(`development/lab/spacetime/.../thermalizing/thermalizing.md:9-23`). The gluing of local sections
into one global section "is the arrow of time"
(`development/lab/spacetime/.../thermalizing/thermalizing.md:18-22`). So the repo separates two
things cleanly: the underlying moves are reversible and order-free; the *settling* of them into one
section is the one-way step. That is exactly a tick.

### Content-addressed G-Set merge is conflict-free (FACT)

tab's substrate is on-disk append-only logs, one `<subject>.jsonl` per entity, with "every read
hits disk, every write appends a line" and no world object held in memory
(`scripts/_substrate.mjs:1-13`). Every row is content-addressed by `rowId`, and `allRows`
deduplicates by content-address so a row that was dual-filed at two anchors "appears in two logs;
dedup collapses them" (`scripts/_substrate.mjs:86-98`).

Federation is then a set union. tab "gets this almost for free: rows are content-addressed
(`rowId`), logs are append-only, so federation is a G-Set union of the logs — concatenate each
`<entity>.jsonl`, dedup by content-address, conflict-free"
(`being/doing/federating/scripts/federate.mjs:1-19`). `admit` skips rows already present by
`rowId` and appends the rest (`being/doing/federating/scripts/federate.mjs:35-53`); `mergeWorlds`
does this per log (`being/doing/federating/scripts/federate.mjs:55-64`). A G-Set (grow-only set)
is a CRDT: union is commutative, associative, and idempotent, so two instances that merged each
other's logs in either order reach the same set. A player "walks from one server to another by
their entity file being sent as a message. Same SHA-256 hash, same identity. No 'server transfer'
— just a predication crossing a boundary" (`being/doing/federating/scripts/federate.mjs:6-9`).

### The deterministic tick (FACT)

tab's `ticking` is "one autonomous advance of the world" in three phases — ambient physics, needs
decay, then the actor phase where every NPC fires its `intends` reflexes and its goal-seeking
`decide` (`being/doing/changing/ticking/scripts/ticking.mjs:1-18`). The determinism rule is
explicit: "All rules are deterministic functions of state (no RNG, no clock-read), so replay
reproduces them" (`being/doing/changing/ticking/scripts/ticking.mjs:14-16`). Ordering inside a
tick is handled by sub-stamping: "Actor moves are sub-stamped `<tick>/act:N` so they sort AFTER
this tick's ambient/decay writes and supersede them"
(`being/doing/changing/ticking/scripts/ticking.mjs:16-17`, and the `enact` helper at lines 74-77).
`supersede` then keeps "only the max-t base row for each functional `a`"
(`scripts/_substrate.mjs:100-114`), so within a tick the latest sub-stamp wins, deterministically.

The archive's qtmud loop is the prior art the self-running-world note already cites: a
`tick-universe` drains a per-tick schedule of events
(`development/lab/archive/multi-user-dungeon/tab/racket/personal-projects-racket-bcf/racket-qtmud/qtmud.rkt:107-122`),
and `run-universe` runs it on a thread with a fixed `(sleep 0.2)` cadence
(`development/lab/archive/multi-user-dungeon/tab/racket/personal-projects-racket-bcf/racket-qtmud/qtmud.rkt:123-128`).
The schedule is drained to empty each tick, then the loop sleeps and recurs — a single-threaded
heartbeat, not concurrent mutation.

## What this adds up to (FACT, restated as a model)

The repo's concurrency model has four parts that fit together:

1. **One append-only graph** that many writers share. Writers never mutate; they append. There is
   no shared mutable cell to race on (`scripts/_substrate.mjs:1-13`).
2. **A deterministic settle** that folds the graph to one fixed point, independent of arrival
   order, by confluence (`settle.mjs:1-21`; `non-confluence-is-choice.md`).
3. **Content-addressed merge** that makes two writers' (or two instances') appends combine by
   conflict-free G-Set union (`federate.mjs:1-19`).
4. **A tick** that is the one-way settling step — the place where order is imposed (by sub-stamp)
   and the arrow of time lives (`ticking.mjs:14-17`; `thermalizing.md:18-23`).

Concurrency is therefore pushed entirely below the tick: between ticks, writers append in any
order to a grow-only graph; at the tick, settle collapses that graph to one deterministic state.

## PROPOSAL — tab's runtime and multiplayer server

This is tab design, separated from the facts above. It applies the four-part model to the two
named gaps.

### The runtime is a materialized fold, never the authority

Layer 1 already specifies an incremental fold maintained behind the `#substrate` API, with the
invariant that `runtime.settle(e)` MUST equal `being(fold(log), e)` for all `e`
(`docs/dev/notes/next-gen-engine-architecture.md:58-76`). Reading the concurrency model, the same
invariant is what makes concurrency safe: the runtime's current-value index is a *derived view*,
so two appends racing into the index are harmless — the index is only ever a cache of the
confluent fold, and replay re-derives it. Proposal: keep the runtime single-writer (see below) and
treat its index purely as a settle-accelerator, so the soak test (`settle ≡ pure-fold` after random
histories) doubles as the concurrency-safety test.

### Many sessions settle once per tick, under a tick-anchored global order

The architecture note already states the server shape: "The runtime daemon owns the one tick and
is the sole writer. Sessions enqueue input; the loop, under a busy-guard, drains the queue
(tick-anchored, server-wide monotonic order so concurrent moves settle deterministically within a
tick), ticks, then routes per-player output" (`docs/dev/notes/next-gen-engine-architecture.md:79-86`).
This note grounds *why* that works:

- **Sole writer + enqueue** is the qtmud loop generalized: sessions are producers that append
  intents to a queue; the loop is the single consumer that drains and ticks
  (`qtmud.rkt:107-128`). No two writers touch the log concurrently, so there is no lock to take —
  the busy-guard is the only mutual exclusion, and it guards the drain, not the data.
- **Tick-anchored monotonic order** is the existing `<tick>/act:N` sub-stamp
  (`ticking.mjs:74-77`) extended from NPC acts to session inputs. Proposal: when the loop drains
  the queue, it assigns each session input the next `act:N` within the current tick, in queue
  order. Two players who both "took the lamp" this tick get `act:0007` and `act:0008`; `supersede`
  (`_substrate.mjs:100-114`) makes the later sub-stamp win, deterministically and identically on
  replay. The arbitration rule is the existing latest-t fold, not new contention logic.
- **Settle once per tick** means the per-tick fold runs after the whole queue is drained and the
  ambient/decay/actor phases append, so every session observes one consistent settled state for
  that tick (its own frontier of it — `_substrate.mjs:118-127`). Determinism is preserved because
  the only nondeterministic input — wall-clock arrival order of session packets — is frozen into
  the `act:N` order *once*, at drain time, and then logged. After that, the tick is a pure function
  of the log, exactly as `ticking` requires (`ticking.mjs:14-16`).

### Why content-addressing makes concurrent merges conflict-free

Two independent uses, both already supported by `rowId` + G-Set:

- **Within one server, no write conflicts.** Because appends are content-addressed and dedup by
  `rowId` (`_substrate.mjs:86-98`), two code paths (e.g. the dual-filed relational row at subject
  and object anchors) that emit the *same* row are idempotent — the second is skipped, not a
  conflict. There is no "last write wins" data loss because there is no overwrite; functional
  arbitration is done downstream by `supersede` on `t`, not by clobbering rows.
- **Across servers, federation needs no central server.** A player crossing instances is a single
  entity log unioned in (`federate.mjs:66-71`); the G-Set union is commutative/idempotent, so
  instances can sync in any order, any number of times, and converge
  (`federate.mjs:1-19`). Proposal: the multiplayer server's reconnect/resume path is the same
  primitive — a returning session re-presents its entity log, `admit` dedups what is already there,
  and only genuinely new rows append. Reconnection is federation-with-self.

### Crash-recovery and replay stay exact

The architecture note's Layer 1 already prescribes "periodic content-addressed snapshots ... restart
= load the latest snapshot + replay the journal tail after it. Crash recovery stays free and exact"
(`docs/dev/notes/next-gen-engine-architecture.md:68-72`). The concurrency model is what makes
*exact* honest: because the durable journal is the only authority and the tick is a deterministic
fold over it (`ticking.mjs:14-16`; `settle.mjs:1-21`), replaying the journal tail re-derives the
identical materialized view — including the identical `act:N` arbitration of concurrent session
moves, because that ordering was *logged*, not recomputed from wall-clock. This is exactly swarm's
discipline — recover from files, not from live objects (`README.md:301-317`) — applied to the game
world. A crash mid-tick loses at most the un-drained queue (in-flight session packets), never any
settled state.

### Where the one-way step is, and why that is the only barrier

Following spacetime's reading (`thermalizing.md:18-23`), the proposal puts the single irreversible
barrier at the tick boundary: appends before it are reversible and order-free; settle at the tick
is the one-way collapse. Sessions therefore need no inter-session synchronization at all between
ticks — they append to disjoint or content-addressed rows — and the loop's per-tick settle is the
only place global order is established. This is the minimum-barrier design the model permits: one
barrier per tick, owned by the sole writer.

## Sources

- `development/lab/swarm/README.md:14-19, 196-211, 301-317` (one graph one tick; trace-derived status; replay/crash recovery)
- `development/active/voidmath-kernel/articulating/library/category/predicating/library/category/positing/library/category/settling/scripts/settle.mjs:1-21` ("knowledge-least fixed point (unique by confluence)"; Knaster-Tarski)
- `development/lab/spacetime/library/informational-spacetime/library/condensing/library/quantum-spacetime/library/collapsing/library/classical-spacetime/library/thermalizing/thermalizing.md:9-23` (settle = arrow of time; irreversibility in the settling step, not the local laws)
- `development/lab/tab/scripts/_substrate.mjs:1-13, 86-98, 100-114, 118-127` (append-only on-disk world; content-addressed dedup; supersede; frontier)
- `development/lab/tab/being/doing/federating/scripts/federate.mjs:1-19, 35-71` (G-Set union; content-addressed conflict-free merge; entity crossing)
- `development/lab/tab/being/doing/changing/ticking/scripts/ticking.mjs:1-18, 14-16, 74-77` (deterministic tick; `<tick>/act:N` sub-stamp ordering)
- `development/lab/archive/multi-user-dungeon/tab/racket/personal-projects-racket-bcf/racket-qtmud/qtmud.rkt:107-128` (tick-universe schedule drain; run-universe thread + sleep)
- `development/lab/tab/docs/dev/notes/next-gen-engine-architecture.md:25-26, 58-86` (the two gaps; Layer 1 runtime; Layer 3 server: sole writer, enqueue, tick-anchored monotonic order)
- `development/lab/tab/docs/dev/notes/non-confluence-is-choice.md` (settle is the confluent floor; forking lives above the fold)
