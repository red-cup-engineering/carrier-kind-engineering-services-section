---
title: "The metered, derivable journal"
date: 2026-10-06
status: governing specification (Red Cup Engineering Senior); receiving by the Chief Engineering Officer
owner: computer-systems-engineering-services-section
supersedes-practice: whole-payload RPC witnessing; hand surveys of hosts by agents
---

# The metered, derivable journal

## Why this exists

On 2026-10-06 the Bare Cedar Fog journal held 12.3 GB and grew 1.2–2.7 GB a day,
against about 15 MB a day in early September. One feed, `admit-rpc`, wrote
1.54 GB on 2026-10-02: 121,727 rows for 34,355 invocations, about 7 KB each at the
median and 105 KB at p99. The causes, measured once:

- **Four rows per invocation.** Each call writes attempt, decision, outcome and coordination
  rows, even when it only reads.
- **Outputs of derivable reads stored in full.** Outcome rows carry `receipt.value`, which
  came to 929 MB of the 1.54 GB. A read's output is a function of the operation, its input
  and the journal head, so it can always be recomputed.
- **Each row stored three times.** The envelope keeps `bytes` (the core as an escaped
  string), `core` (the same object parsed) and `observation.address` (the row again, as
  escaped JSON).
- **Empty clock ticks.** About 17,000 clock invocations a day found nothing due, and each
  one was witnessed.
- **Unbounded memory.** `journalRpcWitness` keeps `heads` and `ownEvidence` maps per
  invocation and never releases them.

A further 12.5 GB SQLite file (`cairn/revisions.sqlite`) held a derivable index. All of
these numbers were found by an agent reading disks by hand. That is itself the defect this
specification removes: the system must measure, record and analyze its own resource
throughput, and agents must read the result.

This contradicts the Group's purpose. The distal bypass prices every erasure and promises
coordination near its thermodynamic floor. Software that stores what it can derive, many
times over, runs the negative-return loop the EROEI notes describe.

## Law 1 — Store only what cannot be derived

Every invocation falls into exactly one of three classes, decided by its declared
`effects.class`:

| Class | Effects | What the journal keeps |
|---|---|---|
| **Derivation** | `pure`, `host-read` | Nothing per call. Its proof path, the content address of (operation ref, input address, journal head), names its output. A caller cites that proof path as a cause. A consumer that needs the value re-derives it or reads a cache, and every cache can be discarded. |
| **Act** | `journal-write`, `external` | One act row at completion, holding the invocation, decision, outcome digest, effect artifacts and resource meter. Only an `external` act also writes an intent row before execution, because fail-closed durability of intent matters only when the outside world changes. |
| **Observation** | an act whose input arrives from outside (a venue reading, a sensor, a message) | The observed bytes, once, by content address. These are the Group's only ephemeral facts: read again later, the world may answer differently. |

Refusals are acts. A refused invocation writes one row naming the refusal, and nothing more.

## Law 2 — Every term once, by its semiotic content address

A journal row is SEAVT: `{e, a, v, t}`. Each coordinate is an RMN term, or the address of
a term already interned in the content-addressed store. Under this law:

- A term (an operation, a schema, a subject, a payload) is stored once, in canonical
  bytes, under its content address. Rows refer to it by address.
- A row is canonical bytes, written once. No parsed duplicate, no stringified copy, no
  JSON nested inside a string.
- Derived readings are passes over the trace and never stored fields: FOUR charge,
  saturation (`Fix σ`), settlement (`H*`), RDF projections, indexes.
- A functional attribute appends a row only when its value changes.
- Closed days pack into segments: SEAVT rows, delta-coded and compressed. Indexes over a
  segment are derived and can be discarded.
- **No SQLite, anywhere.** Indexes are flat, derived files (sorted address tables,
  posting lists) rebuilt from the segments.

## Law 3 — FOUR settles demand; only ⊥ and ⊤ cost work

A schedule or a reading is a FOUR-valued predicate over the trace:

- **t (settled true)** or **f (settled false)**: answered from the trace. No invocation,
  no row.
- **⊥ (undecided)**: needs work. This is the only state that dispatches an invocation.
- **⊤ (contradiction)**: an obstruction. It becomes a certificate for the owning office
  (Law 6).

A clock tick that finds nothing due is a settled f. It costs no invocation and no row. The
clock wakes for the next due time it can derive, not on a fixed interval.

Coordination-free operations (CALM: monotone over the trace) need no coordination record
and no ordering. Coordination rows exist only for `coordination-required` acts.

## Law 4 — Every effect boundary is metered

Each act row carries its resource meter:

- bytes read and written on disk;
- bytes received and sent on the wire;
- CPU time (user and system);
- wall time;
- peak resident memory;
- tokens and currency for inference and venues.

The units stay distinct, and nothing converts between them without a stated, evidenced
conversion. Derivations are metered too: one aggregate row per (operation, host, closed
interval), with count, bytes and CPU. Hosts emit a resource row per interval: disk use by
state root, journal growth, process RSS, swap, and order-7 page availability on WSL.

The meter is the source for the allowance ledger and the CFO's books, and it answers what
a capability costs.

## Law 5 — State lives outside source

Source repositories hold code, schemas, specifications and authored text. Every runtime
state root lives under the host's state directory and belongs to an instance:

- journals;
- ledgers (including `561-group-main-ledger.beancount`);
- settlements;
- editions, contracts and records written by jobs.

A job never writes into a working tree, and the `workingTree.custody` declaration is
retired. Every state root is replicated off the host. The encrypted restic repository in
R2 (`561-group-host-backups`) is the first carrier, and its password is held on two hosts.

## Law 6 — The system analyzes and repairs itself

A standing MAPE-K loop runs over the resource ledger and the journal:

- **Monitor.** Laws 1–5 as checks, each a FOUR-valued reading. Examples: bytes stored per
  act; how much of the stored data was derivable; duplicate-term bytes; growth against a
  rolling baseline; any SQLite file; any state root inside a working tree; any job without
  a meter.
- **Analyze.** Each failing reading is an obstruction certificate, priced in the units of
  Law 4 and filed to the office that owns the offending package.
- **Plan.** A recurring obstruction class gets a deterministic codemod in the existing AOE
  generator or codemod carrier. Examples: rewrite an operation's `effects.class`; move a
  state path out of the working tree; replace a SQLite index with a flat derived index.
- **Execute.** The codemod produces a candidate, and the candidate lands through the queue.
- **Knowledge.** Receiving is re-measurement. The obstruction closes when its reading
  settles to t.

Agents read this ledger. They do not survey hosts by hand.

## Migration of what exists

1. **Dispatch** (`computer-system-engine/src/rpc/dispatch.mjs`): derivations write no
   rows. Acts write one row, and `external` acts also write an intent row. Every receipt
   carries its meter. The witness port releases `heads` and `ownEvidence` when an
   invocation completes.
2. **Journal encoding** (`openJournal().appendRows`): one canonical byte string per row, and
   terms interned by address.
3. **Existing journals:** re-encode closed segments under Laws 1–2. Drop the outputs of
   derivations, keep acts and observations, and write a manifest of the dropped rows' digests
   so the cut is certified rather than silent. Target: under 1% of today's size.
4. **CAIRN:** delete `revisions.sqlite` and derive a flat posting index from git and the
   transcript archive when someone asks for it.
5. **State roots:** move every working-tree state root (about 51 paths, listed by the Law 6
   monitor, not by hand) under the instance state directory, then retire
   `workingTree.custody`.
6. **Clock:** due-time wakeups replace the 15-second interval.

## Receiving conditions

- Journal bytes per host per day are under 20 MB at today's workload, as reported by the
  Law 4 host meter.
- Zero `.sqlite` files on any host, as the Law 6 monitor reads it.
- No runtime state inside any working tree.
- Every act row carries a meter, and every host emits interval resource rows.
- At least one obstruction class is closed by a codemod with no agent editing source by hand.
