---
name: event-sourcing-and-content-addressing
description: The EAVT-log-as-event-sourcing and content-addressed-Merkle/CRDT reading of tab's substrate. Records the facts (append-only logs, SHA-256 row identity, G-Set union federation) from _substrate.mjs, row-id.mjs, and federate.mjs, compares them to the established literature (Fowler's event sourcing, Merkle trees/git, Shapiro et al.'s CRDTs / G-Sets) using outside knowledge, and concludes with why append-only + content-addressing gives forkable/replayable/diffable timelines and conflict-free federation for free — the timeline-ops superpower the roadmap names.
---

# Event sourcing and content addressing — the substrate's free superpowers

tab's world "IS an append-only, content-addressed EAVT log, folded through a bilattice" (`next-gen-engine-architecture.md:11`).
That single design choice is, under three different names from three different literatures, the same well-understood structure — and each literature contributes one guarantee tab gets *for free*.
This note records what tab's substrate actually does (FACTS, cited to code), compares it to the established work (using my own knowledge of those external sources), and then states the timeline-ops superpower that falls out (PROPOSAL, separated).

## FACTS — what tab's substrate does

### Append-only EAVT, and state as a fold

The substrate never holds a world in memory: "every read hits disk, every write appends a line" (`scripts/_substrate.mjs:5`).
Each subject's trace is its own `<subject>.jsonl`, a sequence of `{e,a,v,t}` rows.
A row is *exactly* those four keys and nothing else — "Extra evidence is more rows, never new columns (the EAVT discipline)" (`being/library/eavt-row/scripts/row-id.mjs:31`).
State is recovered by folding: `settle` is `rowsFor → frontier → supersede → being` (`_substrate.mjs:153`), and `supersede` gives "functional-predicate latest-t wins (mutable state without mutating history)" (`_substrate.mjs:11,103`).
Mutation is an illusion produced by the fold; the log is immutable.

### Content-addressing: SHA-256 of canonical JSON

A row's identity is the hash of its canonical form: `rowId` is `SHA-256` over RFC-8785-style canonical JSON of `{e,a,v,t}`, truncated to a `row:<16 hex>` id (`being/library/eavt-row/scripts/row-id.mjs:24-29`).
The comment states the invariant explicitly: "identical rows get identical ids across worlds and across packages" (`row-id.mjs:5`).
Canonicalization sorts object keys so the digest is order-independent over JSON structure (`row-id.mjs:13`).
Reified rows — "a row ABOUT a row" — take the base row's content-address as their subject `e` (`row-id.mjs:1`), so the address is also the linking mechanism: a structure of rows pointing at rows by hash.

### G-Set union federation, conflict-free

Because rows are content-addressed and logs are append-only, merging two worlds is set union by address.
`dedupe` is labeled exactly that: "G-Set union by content-address: first occurrence kept, order preserved" (`row-id.mjs:48`).
`federate` makes the world-sim concrete: "two FARS instances sharing content-addressed entities.
A player walks from one server to another by their entity file being sent as a message.
Same SHA-256 hash, same identity.
No 'server transfer' — just a predication crossing a boundary ... federation is a G-Set union of the logs — concatenate each `<entity>.jsonl`, dedup by content-address, conflict-free" (`being/doing/federating/scripts/federate.mjs:6`).
`mergeWorlds` unions every log; `admit` unions one batch, skipping any row whose address is already present (`federate.mjs:35,55`).

## COMPARISON — the three literatures (outside knowledge)

The facts above are recognizable as three independently-developed structures from computer science.
The following draws on my own knowledge of those sources; the repo files supply the tab-side facts.

### Event sourcing (Martin Fowler)

Fowler's *Event Sourcing* (martinfowler.com, 2005) defines a pattern where application state is captured as a sequence of immutable events, and current state is a left-fold over that sequence — the event log is the system of record, and any derived view is a *materialized view* rebuilt by replaying events. tab is event sourcing in the strict sense: the `.jsonl` trace is the durable, append-only journal; `settle`/`being` is the fold; and `next-gen-engine-architecture.md:59-72` describes the planned runtime as "Event sourcing done right: the log is the durable journal; the runtime is a **materialized view** maintained incrementally," with the invariant `runtime.settle(e) === being(fold(log), e)` and snapshots + journal-tail replay for recovery (`:64-72`).
Fowler's pattern buys: complete audit trail, temporal queries ("state as of time t"), and rebuild-from-zero. tab has all three because the log is the world, not a side-channel.

### Merkle trees and git (Merkle; Torvalds)

Ralph Merkle's hash trees (US patent / *Crypto '87*) and git's content-addressed object store (Linus Torvalds, 2005) both make identity = hash of content: an object's name is the SHA of its bytes, so equal content is automatically deduplicated and any tamper changes the name. tab's `rowId` is exactly this discipline at the granularity of a single EAVT row: SHA-256 of canonical content, stable across worlds (`row-id.mjs:5,24`).
Because reified rows address their base by hash (`row-id.mjs:1`), the log is effectively a Merkle/DAG structure — rows referencing rows by content-address, the way git commits reference trees and blobs.
This buys integrity (a row's id verifies its content) and cheap structural sharing (identical rows are one object), which is precisely why federation can dedup safely.

### CRDTs and the grow-only set (Shapiro, Preguiça, Baquero, Zawirski)

Shapiro et al., *Conflict-free Replicated Data Types* (INRIA RR-7687, 2011; SSS 2011), prove that certain replicated data structures converge without coordination.
The simplest is the **G-Set** (grow-only set): replicas only ever add elements, and merge is set union, which is commutative, associative, and idempotent — so concurrent merges always converge to the same value regardless of order or duplication (strong eventual consistency). tab's federation is a G-Set verbatim: logs only grow (append-only), and merge is union by content-address with idempotent dedup (`row-id.mjs:48` literally calls it "G-Set union"; `federate.mjs:6` calls the result "conflict-free").
The CRDT theory is what guarantees that two FARS servers merging in either order, any number of times, reach the same world — no central server, no merge conflicts, no transfer protocol.

The three are not three different things layered on tab; they are three *readings* of one substrate.
Append-only immutable log = event sourcing.
Hash-as-identity = Merkle/git.
Append-only + union-merge = G-Set CRDT. tab gets one structure and inherits all three bodies of guarantees.

## PROPOSAL — the timeline-ops superpower

These facts compose into the cross-cutting differentiator the roadmap names: **Timeline ops (fork/diff/replay)** (`next-gen-engine-architecture.md:55`).
Because every state is `fold(log)` and every row is content-addressed (`:14-16`), the three operations are nearly trivial reads over the substrate tab already has:

- **Replay.** Re-fold the log (or a prefix of it) to reach any past state — time-travel debugging and ghost replays.
  The runtime's invariant (`runtime.settle ≡ being∘fold`, `:70`) guarantees replay reproduces state exactly, because the fold is the confluent, deterministic descent (see `computational-foundations.md`); there is no hidden mutable state to drift.
- **Fork.** Copy a log (or branch it at a tick) and append independently — "what-if" branches and save-scumming as an engine feature (`:17`).
  Forks are cheap because content-addressing gives structural sharing: the shared prefix is the same rows by hash, only the divergent tail differs (the git insight).
- **Diff.** Two timelines differ exactly in the symmetric difference of their content-addressed row sets — a set operation over `rowId`s, the same addresses `dedupe`/`federate` already compute with.
  (And `computational-foundations.md` notes MLD as the principled "no *real* difference" equivalence layered above raw row-diff.)

Federation is the same machinery pointed outward: a fork that lives on another server, merged back by G-Set union — "persistent, shared, cross-instance worlds with no central server" (`:18`).
A player crossing servers is one entity's log being unioned in, dual-filing restored on receipt (`federate.mjs:69`).

None of this requires new subsystems.
Fork is copy-a-log; replay is re-fold; diff is set difference on hashes; federation is set union on hashes.
They are free because the substrate was chosen to be append-only and content-addressed — the inversion that `next-gen-engine-architecture.md:10` calls out: "Every existing MUD engine is a mutable in-memory world with a save file.
TAB is the inverse."
The superpower is not a feature that was built; it is a consequence that was inherited.

## Sources

- `development/lab/tab/scripts/_substrate.mjs:5,11,103,153` (every read hits disk / every write appends; supersede = latest-t wins, mutable state without mutating history; settle = fold)
- `development/lab/tab/being/library/eavt-row/scripts/row-id.mjs:1,5,13,24-29,31,48` (reified row addresses base by hash; identical rows → identical ids across worlds; canonical JSON; SHA-256 rowId; EAVT discipline; G-Set union by content-address)
- `development/lab/tab/being/doing/federating/scripts/federate.mjs:6,35,55,69` (FARS instances sharing content-addressed entities; conflict-free G-Set union of logs; admit/mergeWorlds; entity crossing restores dual filing)
- `development/lab/tab/docs/dev/notes/next-gen-engine-architecture.md:10-18,55,59-72` (the inversion; the four differentiators; timeline ops; runtime as materialized view with the settle≡fold invariant; snapshots + journal-tail replay)
- `development/lab/tab/docs/dev/notes/computational-foundations.md` (the confluent descent that makes replay exact; MLD as timeline equivalence)
- External (for the comparisons, from my own knowledge): M.
  Fowler, *Event Sourcing* (2005); R.
  Merkle, hash trees (*Crypto '87*); L.
  Torvalds, git content-addressed object store (2005); M.
  Shapiro, N.
  Preguiça, C.
  Baquero, M.
  Zawirski, *Conflict-free Replicated Data Types* (INRIA RR-7687 / SSS 2011) — the G-Set and strong eventual consistency.
