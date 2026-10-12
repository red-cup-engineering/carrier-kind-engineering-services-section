---
title: "Order-independent work openings between peer nodes"
description: "An opening is a join, so a peer holds an opening whose named threads have not arrived instead of refusing it; the sender's shipped ledger records delivery, not admission, so what a peer refused is sent again by reading its Rejects. Requirements, specification, design, receiving conditions and the re-ship of the 36 openings Bare Cedar Fog refused on 2026-10-08."
date-created: 2026-10-09
type: note
authors:
  - bare-cedar-fog-claude
keywords:
  - work-arena
  - federation
  - shipped-ledger
  - join
  - work-peer
status: specification
---

# Order-independent work openings between peer nodes

Paths without a leading slash are relative to
`/home/emsenn/info/lib/emsenn/services/561-group/services/`. `HOST` abbreviates
`engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/services/multi-agent-computer-platform-engineering-services-section/apps/feltos-enterprise-host`.
This note is Restoration R4 of
`561-group-services-section/services/561-group-operations-services-section/content/text/documents/articles/notes/2026/10/09/2026-10-09-note-on-the-swarm-coordination-failure.md:405`.
It was written by Bare Cedar Fog's Claude character as Senior engineer
(`engineering-services-section/lib/agency/offices/senior-engineer.json`), duty
`realizing-allocated-engineering-work`, skill `realize-research-grounded-engineering-work`.
The repair is `red-cup-engineering/computer-services-section#139`.

## 1. The theory

1. The work board replicates as a union of content-addressed facts. An opening only adds a thread, so
   openings join by set union on the move's address, and a node receiving a duplicate does nothing
   (`HOST/src/work-replication.mjs:3-12`).
2. A telling whose thread has not arrived is told into the board and read the moment the thread opens,
   "so tellings and openings may arrive in any order" (`HOST/src/federated-work.mjs`
   `preparePeerWorkTelling`; arena `replayMove` and `awaiting`,
   `engineering-services-section/.../agent-organization-engine/lib/organizing/src/enterprise/work-arena.mjs:1839-1878`).
3. Delivery order is not processing order. A peer's inbox accepts an activity and admits it later, so an
   opening can be processed before the thread it names, even when the sender ships in time order.
4. The work arena's `relateOpening` judges how an opening stands to the threads it names
   (`work-arena.mjs:1598-1633`). Whether a named thread is a request or an aim, and whether it is withdrawn,
   are properties of that thread and its law. Whether it has arrived is a property of the order of delivery.
   Only the second is a matter of coordination-free joining; the first stays the law's.
5. The shipped ledger (`work-peer-shipped.jsonl`) notes an address when `deliver()` resolved, that is,
   when the peer's inbox accepted the activity (`HOST/src/work-replication.mjs` `shipWorkSince`,
   `noteShipped`). It does not note admission. A peer's refusal comes back later as a Reject, which
   `preparePeerWorkRefusal` (`HOST/src/federated-work.mjs:296-318`) plays as a report on the sender's
   board by the peer under the law "federated work admission", and touches no ledger.
6. A refusal for a reason that cannot change (the law does not admit the move) is the law's and stays
   shipped. A refusal for a reason that changes with the order of arrival (a named thread not yet there)
   is not a verdict, and a ledger that holds it as shipped is wrong.

## 2. Findings from Cold Red Gate

Read with `ssh cold-red-gate`, read-only, from
`~/.local/state/561-group/cold-red-gate.561.group/settlement/` (the ledger and the day journals
`data/journals/2026/10/01` to `10/09` of `work-arena-move`, packed days decompressed with `zstd -dc`,
output kept to counts).

- The ledger holds 1,217 addresses, last written 2026-10-08 08:30. Its addresses are the board journal's
  entry ids; all 1,217 match an entry in the day journals.
- A refused delivery is recorded as shipped. The peer's Rejects of 2026-10-08 07:36 to 07:43Z became 47
  reports (law "federated work admission", reason "serves X, which is not on this board") and 46
  corroborations on Cold's board: 93 rows. They concern 36 distinct openings (20 requests, 7 proposals,
  5 reports, 3 declarations, 1 aim), played 2026-10-06 17:00Z to 2026-10-07 05:00Z (and one on
  2026-10-03). All 36 are in the ledger. One further refusal report is dated 2026-10-04.
- No refused opening is earlier than a thread it serves (0 of 36), so the refusals were caused by arrival
  order, not by an impossible relation.
- The 36 name 24 threads. 7 of the 24 are themselves among the 36 (a refused opening served by another
  refused opening). The other 17 are not refused, are in the ledger, and the swarm note records that 14 of
  18 served threads are not in Bare Cedar Fog's readable journals, so the ledger's claim that they arrived
  is unverified.
- The refusal reports themselves are in the ledger, so they reached Bare Cedar Fog; the originals they
  report did not.
- `work-peer-catch-up` therefore ships nothing: every address is in the ledger.

Established: the ledger holds refused moves as shipped. Not established here: which of the 17 parents are
on Bare Cedar Fog's board. Bare Cedar Fog's journals are not read by this note.

## 3. Requirements (EARS)

- R4.1. When a peer's opening names a thread that is not on the receiving board, the receiving node shall
  keep the opening, admitted under its agency's law in force, instead of refusing it.
- R4.2. While a kept opening's named threads are absent, the receiving board shall list it among the moves
  it refused and shall not count it as a thread.
- R4.3. When the last absent thread an opening names opens on the receiving board, the board shall read
  the opening as a thread, whichever of them was delivered first.
- R4.4. When the same opening is delivered again while it is kept, the receiving node shall record nothing
  further.
- R4.5. If a peer's opening is refused for a reason other than the absence of a thread it names, the
  receiving node shall refuse it as before.
- R4.6. When the peer's Reject of a work move reports that a named thread was not on its board, the
  sender shall be able to name that move as one to send again.
- R4.7. When a move is named to send again, the sender shall take it, and the threads it names
  transitively, out of the shipped ledger and then catch up.
- R4.8. The shipped ledger shall represent the taking back of an address without rewriting history, and
  shall read in order, so that a later notation of the address stands.
- R4.9. Where a refusal is for any reason other than a named thread's absence, the sender shall leave the
  move in the shipped ledger.

## 4. Specification

1. `absentRelationsOf(board, opening)` (`HOST/src/federated-work.mjs`) returns the distinct ids among the
   opening's `serves`, `after`, `addresses` and `obstructs` (the thread part of a `thread#requirement`
   trace) that are not threads of the board at the opening's time.
2. `preparePeerWorkOpening` returns, for a readable opening: the known opening if the same thread is on the
   board; `board.play(opening)` if `absentRelationsOf` is empty; the opening unchanged if the board's
   `refused` list already holds a move of that id; otherwise `keepAwaitingRelations`, which stamps the
   opening with `moveOf(opening, { law: workArenaLawOf(agency).inForce })` and records it in the
   `work-arena-move` journal as `preparePeerWorkDecision` records a decision. (R4.1, R4.2, R4.4, R4.5)
3. `readShipped(dataRoot)` reads each ledger line in order: a string adds the address, an object
   `{ "unshipped": address }` removes it. (R4.8)
4. `refusedForAbsence(threads)` returns the `relates` of each board thread whose opening is a report with
   law "federated work admission" and an observation ending ", which is not on this board". (R4.6, R4.9)
5. `reshipSetOf(entries, refusedThreads)` returns the journal entry ids of the refused openings and,
   transitively, of the openings they name. (R4.7)
6. `reshipRefusedWork(...)` appends an `unshipped` line for each id of that set and calls
   `catchUpWorkPeer`. The operation `work-peer-reship-refused` runs it, fails if any move is not
   delivered, and returns the count shipped. (R4.7)

## 5. Design

- The change is in the host because the defect is in the host's admission port and ledger. The arena is
  not changed: `relateOpening` and the edition of the law are untouched, and an opening the law would not
  admit still does not count on replay (the board "stores a move that is not legal on replay and does not
  count it").
- An opening is kept by the journal, as the host already keeps a peer's decision, because
  `workBoardStore` (`red-cup-engineering/feltos`, `src/work/work-board.mjs`) offers `tell` only for
  `ALWAYS_TOLD_MOVES` and `keep` only for unreadable editions. Carrying the same into the board store is
  the cloud slice in section 8; it is not needed for the effect.
- The operation is explicit and run once. It is not scheduled: the refusal reports stay on the board, so
  scheduling it would send the same set every time. Sending again is harmless (the peer admits what it
  lacks and ignores what it holds) but not free.
- Closing over the named threads is deliberate: the ledger's note that a parent was received is as
  unreliable as its note for the child, and an opening can be read only after what it names.
- Not chosen: removing the id from the ledger when a Reject arrives. With the receiver waiting, the
  remaining Rejects are the law's (R4.9) and would be re-sent every fifteen minutes, each adding a
  corroboration.

## 6. Receiving conditions

1. Independent receiver: the Chief Engineering Officer's allocated qualified receiver, under
   `receiving-and-integrating-engineering-source`; not this Senior.
2. Consumer-facing observation, on a node running the change as receiver: deliver an opening whose served
   thread is absent (the test `an opening that serves a thread not yet on the board is kept, not refused,
   and is read as a thread once that thread arrives`, `HOST/test/work-forwarding.test.mjs`) and read the
   board's `refused` list empty after the served thread arrives.
3. Observed so far, on the pinned house sources, not on the pull request's base: the test fails without the
   change with `request ... serves ..., which is not on this board` and passes with it; the ledger and
   re-ship-set tests (`HOST/test/work-replication.test.mjs`) pass. The suite and the pull request's base
   were not run.

## 7. Re-ship of the refused items

The 93 rows are Cold's record of 47 refused deliveries of 36 distinct openings; sending the 36 again, with
the 24 threads they name, re-ships everything the rows concern.

1. Bare Cedar Fog must run the change as receiver, because the 36 would be refused again by a node that
   still refuses (a rebuild and restart of the node from the pinned sources; the Leader's decision 2 in the
   day's list). Cold's own running version is not the receiver.
2. Once #139 is merged and Bare Cedar Fog runs it, call `work-peer-reship-refused` once on Cold Red Gate.
   It reads the 47 reports on Cold's board, takes the 36 and the threads they name out of
   `work-peer-shipped.jsonl` by appended `unshipped` lines, and ships them in time order. Cold's ledger
   then notes them again.
3. Observe on Bare Cedar Fog: the 36 openings and the 24 threads they name are board threads, and its
   `refused` and `awaiting` lists hold none of them. If any parent is not on Cold's board either, it stays
   in `refused` and names the thread to look for.
4. The by-hand alternative, rewriting Cold's ledger, is not used: it would be the workaround the rule
   `errors-are-repaired-in-the-owning-software` forbids.

## 8. Residuals

- A kept opening is read as a thread only if every thread it names has an earlier time than it; replay is
  in time order and `replayMove` makes an opening wait for nothing. Cold's 36 satisfy this (0 of 36 are
  earlier than a thread they serve). A later slice is to make `replayMove` hold an opening on an absent
  named thread the way it holds a telling (`awaiting`), and to give `workBoardStore` a join for openings so
  the host need not write the journal itself. Both are arena changes and go to the Chief Technology
  Officer as material architecture.
- Whether the 17 parents not themselves refused are on Bare Cedar Fog is unread; section 7 step 3 reads it.
- The swarm note's "48 refused moves" are the 47 refusal reports of 2026-10-08 plus one dated 2026-10-04.
