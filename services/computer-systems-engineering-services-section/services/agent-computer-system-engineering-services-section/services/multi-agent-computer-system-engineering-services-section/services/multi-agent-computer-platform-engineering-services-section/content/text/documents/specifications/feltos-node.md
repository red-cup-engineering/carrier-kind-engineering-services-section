---
title: "The FeltOS node"
description: "What a FeltOS node holds, loads, reads and writes: a world served from flat files it reads by address, inside the Leader's memory budget, with the ordered work that realizes it."
date-created: 2026-10-11
type: specification
owner: multi-agent-computer-platform-engineering-services-section
answers:
  - content/requirements/feltos-runs-in-32-mb-with-a-64-mb-startup-peak.json
  - content/requirements/feltos-is-the-mud-driver-and-metroplat-its-library.json
  - content/requirements/feltos-ecology-is-read-from-the-last-event.json
basis:
  - "Leader, 2026-10-10: \"FeltOS should use about 32mb of RAM at most once started, with a 64mb startup spike acceptable.\""
  - "Leader, 2026-10-10: \"get stuff our flatfiles properly organized by proof path addressing so able to use formula to \\\"predict\\\" where files will be rather than keeping indexes, hot or cold.\""
  - "Leader, 2026-10-11: \"proof path addressing, CHL directionality via yoneda embedding, combined with our content addressing, means we do NOT NEED TO HAVE THINGS HOT IN MEMORY NOR DO WE NEED INDEXES.\""
  - "Leader, 2026-10-04: \"MetroPlat is meant to be a MUD, not have ... a MUD as something it provides\"; \"why the FUCK does metroplat have a clock\"."
  - "engineering-services-section glossary: content-addressed-store (put, get, has; content equals address; path layout is deterministic; indexes are derivable, never load-bearing)."
provenance:
  authors:
    - bare-cedar-fog-claude
  office: Red Cup Engineer Senior
  not-the-leaders-words: "An agent's specification derived from the Leader's statements quoted under basis."
---

## 1. What a node is

A FeltOS node is one running FeltOS MUD driver serving one world. MetroPlat is the driver's
enterprise library: its areas, characters, offices and work are the world's content. Bare Cedar Fog
and Cold Red Gate are worlds of the 561 Group Semioverse; each is a node.

The node is judged by `feltos-runs-in-32-mb-with-a-64-mb-startup-peak`: at most 32 MB of JavaScript
memory (heapUsed + external + arrayBuffers) once started and 64 MB while starting, not growing with
history, and finding every record at a location computed from its address. Its receiving test is
`apps/feltos-enterprise-host/scripts/check-memory-budget.mjs`; its live cell is
`process.memoryUsage()` of the running node at t+60 s and t+30 min.

## 2. What the node holds in memory

The host declaration, the instance declaration, the open sockets, and the working set of the requests
in flight. Nothing it holds is proportional to the number of witnesses, records, offices, operations,
days or peers. A request that needs a record reads it and lets it go.

## 3. What the node loads

- **At start:** the host and instance declarations, the HTTP listener and the entrance. Start does not
  read the agency, the catalog, the work board or any log.
- **On a request:** the operation family that owns the requested verb, imported the first time a verb
  of that family is asked for. Discovery (MCP, HTTP, human views) lists verbs from the instance's
  declared exports and their descriptors, read on demand, without importing their implementations.
- **Never in the node process:** the inference engine, the agent harness, the code-development engine,
  publication and release services, companions, and remote MCP upstreams. Each is its own service. The
  world reaches it as a Character's act over A2A or HTTP, and it reaches the world the same way.

## 4. How the node reads

Every read is address resolution. A record's address is its content address (an `ni:` name, from the
computer-content-address section); its location is the path the `ni-path` formula computes from that
address. The node keeps no map from address to location, in memory or on disk.

- **A witness or record:** `get(address)` opens the one file the formula names.
- **An office, duty, skill or rule:** read by its id at the path its id names. The agency is not
  walked, held or watched.
- **A thread of work:** its head is a state record named by the thread; the thread is read by walking
  causes back from the head, each cause fetched by its address, for as many steps as the reader needs.
- **What is due:** a schedule is a record; whether it is due is computed at the moment it is asked,
  from the schedule and the time its last run ended (its state). Nothing is written to keep it current.
- **The world's resources:** read from when each was last harvested or polluted, by formula, as the
  FeltOS ecology law states.

## 5. What the node writes

- **Records and state** that the world must remember (work items, their heads, ledger entries, office
  acts, schedule state): tracked flat files at `data/records/<type>-records/` and
  `data/state/<object>-state/` of the section that owns them.
- **Content-addressed objects:** `put(bytes)` writes the bytes once at the path their address names.
  An object exists if and only if its file exists; existence is admission. A witness whose cause has not
  arrived is stored as written; a reader that needs the cause resolves it by address when it reads.
- **Logs:** one plain JSON line per act that some consumer reads, appended to
  `data/logs/<type>-logs/<date>.jsonl`, untracked. An act no consumer reads is not logged. A clock tick
  that runs nothing writes nothing. A log line carries what its readers need and references rules,
  invocations and outputs by address instead of copying them.

The store keeps no admission ledger, located buckets, pending or waiting sets, verification
checkpoints, packed segments or caches beside these files.

## 6. The clock

The driver ticks. At a tick it computes which schedules are due (section 4), runs each due job in the
enterprise execution worker, writes the job's state when the run ends, and logs one line per run.
There is no `run-due` RPC per tick and no witness of a tick.

## 7. Moving a world onto this design

Each world is converted once. The conversion carries into tracked records and state what a consumer of
the new design reads (each work thread's head and items, ledger entries, office acts, schedule state,
and the records of retired instances such as ops.bindinggenerations.net that the world must keep), then
deletes the journal store: admission facts, located buckets, ledgers, checkpoints, packed segments, and
every log no consumer reads. No reader of the old layout is kept.

## 8. Work, in order

Each item is one repository's change, landed with its consumers moved and the replaced code deleted in
the same change. Each is judged by the receiving test and, for 6 and 7, by the live cell.

1. **Store** (semiotic-eavt-services-section, in computer-data-engineering): content-addressed objects
   by `ni-path`, per-type daily logs, heads as state records; the admission machinery deleted. Specified
   in semiotic-eavt's `store.md`, with its migration map (`store-migration-map.md`, every call site) and
   conversion (`store-conversion.md`). It lands as one migration in waves: the new store, then each
   repository moved whole in one change (eavt-services-section's stem law, computer-system-engine,
   organizing, feltos, the host, metroplat, then the other consumers), no consumer ever reading both
   forms; the old store and computer-system-engine's `journal` are deleted in the change that moves
   their last consumer. The world's own save is part of this item: FeltOS's world host persisted through signcraft's
   file-history-store, a causal history carrier the migration map missed; the world is saved as its current
   state, and signcraft's history stores and their receiver scripts are deleted with the old store.
2. **Agency read by address** (organizing, in agent-organization-engine): `agencyAt` and the held
   registry read records by id; no directory walk, no `fs.watch`.
3. **Operations on demand** (metroplat): operation families imported on first use; descriptors read on
   demand; the fixed operation-family loader and the generated package-wide catalog removed.
4. **Node composition** (feltos-enterprise-host): the inference engine, agent harness, code-development
   engine, companions and remote upstreams leave the node process; the host bounds the store calls it has
   in flight to 8; `check-memory-budget.mjs` restored
   at the host.
5. **Clock** (organizing `work/recurring`, FeltOS driver): due work computed from schedule and last run;
   no per-tick RPC or witness.
6. **Conversion of Bare Cedar Fog**, then its release through the Guix deployment from its machine
   record; measured live.
7. **Conversion of Cold Red Gate**, with ops.bindinggenerations.net's records carried in, then its
   release; measured live.
