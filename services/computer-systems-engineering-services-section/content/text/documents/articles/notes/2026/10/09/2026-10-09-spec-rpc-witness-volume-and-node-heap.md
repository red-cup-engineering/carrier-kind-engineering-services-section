---
title: "RPC witness volume and node heap: requirements, specification and design"
description: "Why the Bare Cedar Fog MetroPlat node wrote 5.8 GB of RPC witnesses on 2026-10-08 and exhausts its 512 MB heap about every 20 minutes: the cause found in code and on disk (the clock heartbeat and its run-due operation keep two different state roots), the house theory that already governs it, the existing changes judged, and the smallest aligned repair with EARS requirements."
date-created: 2026-10-09
type: specification
status: proposed; not implemented; needs independent receiving (the Senior Engineer does not receive its own outcome)
owner: computer-systems-engineering-services-section
keywords:
  - rpc-witness
  - journal
  - clock
  - run-due
  - heartbeat
  - heap
  - metered-derivable-journal
provenance:
  authors:
    - bare-cedar-fog-claude (Hai Jian), office senior-engineer, incumbency bare-cedar-fog-claude-as-senior-engineer
    - claude-sonnet-5-5 (the carrying model)
  received-under: engineering-services-section/lib/agency/skills/realize-research-grounded-engineering-work/SKILL.md
  duty: engineering-services-section/lib/agency/duties/realizing-allocated-engineering-work.json
  dispatched-by: the Leader's instruction of 2026-10-09, through Bare Cedar Fog's Claude character
---

# RPC witness volume and node heap

Paths below are relative to `/home/emsenn/info/lib/emsenn/services/561-group/services/` unless they start
with `/`. `STORE` means `/gnu/store/gdbrmhcrl3pfnngmcbmp4fii2gp57pcr-bare-cedar-fog-deployment-1`, the
build the running unit executes (`bare-cedar-fog-561-group.service`). `PK` means `STORE/packages`.
`GH-CSS` means the repository `red-cup-engineering/computer-services-section` on `main`.

## Why this note is in this section

The RPC engine (`rpc/dispatch.mjs`, `rpc/journal-witness.mjs`, the journal and its readers) is
`apps/computer-system-engine` of `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section`.
That section's README says it owns capabilities whose subject is a composed system and that code, data and
networking compose there. The governing specification of this problem,
`content/text/documents/specifications/2026-10-06-metered-derivable-journal.md`, names it as `owner`.
The note therefore lives beside that specification. The code to change sits in three other owners, named in
"Design": the organizing engine (`recurring.mjs`), the enterprise host (`serve-instance.mjs`,
`enterprise-runtime.mjs`) and the semiotic EAVT journal store (data tier).

## 1. What the Leader said, and what this note does with it

Verbatim, 2026-10-09:

> "you've got software writing 6gb of records a DAY to my disc? THIS IS YOUR SOFTWARE."

> Aligned code is "derived from research papers I can read, specs I can read, SAS, HLD, LLD ... fixable via codemod, codegen".

> "I am also LIVID THAT YOU ARE WORKING AS A SOLO OPUS RATHER THAN ... WORKFLOW ULTRACODE ... AND THAT IN OUT ACROSS FORWARD BACKWARD IS NOT IN OUR SHIT IS HORRIFYING IT LITERALLY IS CRITICAL TO OUR SHIT THE FUCKING TRIAD THE FUCKING NUCLEAR QUARTET ... WAY WAY WAY TOO MUCH OF WHAT I SAY NEVER MAKES IT INTO ANY RECORD THAT MOTIVATES ANY RESEARCH EXPLAINING AND EXPLORING IT ... in-out-across-forward-backward Is so deep ... relating->knowing,communicating,playing / foward->in,out,across and then those lead on to more ... there is literally too much context and theory for you to do this at once ... that is exactly why we need so much fucking shit about fucking actually doing this step by step, Step By Step, Move By Move, Trace, Actions."

What the house already holds of the last two statements, so none of it is lost here:

- The five directions and the relating/knowing/communicating/playing split are already recorded as a correction
  and dispatched: `561-group-services-section/content/text/documents/articles/notes/2026/10/09/2026-10-09-note-on-the-leaders-repeated-corrections.md`
  (table row "in, out, across, forward, backward"; "Still owed", last item: find the house term and write it
  where the corpus has none). This note does not develop that theory. It does not invent a term for it.
- The Leader's demand for a step-by-step, move-by-move trace is met here by section 10 (every move of this
  investigation, with its source), and by the requirement-level structure below (each requirement has a
  rationale and a source, each decision a stated alternative).
- The workflow demand is a process rule; it is held as `sessions-dispatch-only-office-projected-agents` and
  `capitalized-leader-statements-mark-a-failed-carrier` in `561-group-services-section/lib/agency/rules/`.

## 2. What the house holds (theory, not code)

| Source | What it fixes for this problem |
|---|---|
| `content/text/documents/specifications/2026-10-06-metered-derivable-journal.md:13-38` | The same defect was measured on 2026-10-06 (12.3 GB; `admit-rpc` 1.54 GB on 10-02; four rows per call; outputs stored in full; each row stored three times; empty clock ticks witnessed; unbounded `heads` maps). |
| same, `:40-51` (Law 1) | Store only what cannot be derived. A `pure` or `host-read` operation leaves no row. An act (`journal-write`, `external`) leaves one act row; only an `external` act also leaves an intent row first. A refusal is one row. |
| same, `:53-68` (Law 2) | A row is canonical bytes written once: no parsed duplicate, no stringified copy. |
| same, `:70-84` (Law 3) | A tick that finds nothing due is a settled f: no invocation, no row. "The clock wakes for the next due time it can derive, not on a fixed interval." Coordination rows exist only for `coordination-required` acts. |
| same, `:86-103` (Law 4) | Every effect boundary is metered, with peak resident memory; hosts emit RSS and journal-growth rows per interval. |
| same, `:119-136` (Law 6) | A standing MAPE-K loop reads the ledger; an obstruction class recurs only until a codemod closes it. Agents read this ledger; they do not survey hosts by hand. |
| same, `:138-154` (Migration 1, 2, 3, 6) | Dispatch writes no rows for derivations and one row per act; the witness port releases `heads`; one canonical byte string per row; re-encode closed segments with a manifest of dropped digests; due-time wakeups replace the 15-second interval. |
| same, `:156-163` | Receiving: under 20 MB of journal per host per day at today's workload. |
| `engineering-services-section/content/text/documents/articles/notes/2026/07/11/2026-07-11-research-on-metroplat-architecture-model.md:158-159` | Invariant (5): every boundary crossing is an arrival admitted to the journal before acting, reads too. Law 1 (2026-10-06) supersedes this for derivations ("supersedes-practice: whole-payload RPC witnessing"). |
| `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/services/multi-agent-computer-platform-engineering-services-section/services/agentic-enterprise-computer-platform-engineering-services-section/content/text/documents/articles/specifications/2026-09-28-rpc-evidence-admission-fabrication.md:11` | Action dispatch proceeds only from admitted durable evidence. This is why an act's intent is journaled before it runs. |
| `engineering-services-section/content/text/glossary/concepts/opportunistic-scheduling-loop.md:14-16, 147-149` | There is no polling tick for work whose feasibility an admitted event changed. Physical time is a different boundary: a bounded heartbeat supplies the time observation; it "does not contain a hidden work policy". Tick-based scheduling is ruled out. |
| `public-services-section/services/personal-services-section/services/emsenn-services-section/content/text/glossary/terms/witness-journal.md:32` | Append law: a witness already held carries zero bits, so storing it again costs nothing. A tick that changes nothing is such a witness in all but its timestamp. |
| `engineering-services-section/content/text/documents/articles/notes/2026/09/27/2026-09-27-note-on-the-one-journal.md` | The compact store and the one-journal decision; the RPC witnesses are events of the one journal and may be read back (causal order, federation). |

Answers the house gives to the questions asked:

- What an RPC witness is for. It is the durable intent and outcome of an act at an effect boundary, so that
  dispatch continues only from admitted evidence and so that cost, causes and federation can be read back from
  the one journal. It is not a log of every question the system asked itself.
- What `run-due` is. The clock's tick: it reserves each schedule's due attempt (a write-once marker) and starts
  it, as the schedule's account, through the same catalog; it "carries the observed time as its input and no
  work policy of its own" (`PK/@red-cup-engineering__organizing/src/work/recurring.mjs:19-21`, "`run-due` is the heartbeat a host's timer calls").
- What `mcp-session-activation` is. `infograph:mcp-session-activation` is the issuer string of a capability
  grant. `activateMcpRequestedCapabilities` writes `infograph#<verb>` grants for the subject a session asked
  for (`PK/@red-cup-engineering__metroplat/src/mcp-options.mjs:20,61`). Each `decision` witness for `run-due`
  records that the clock account holds the grant `infograph#run-due` with that issuer. That fact is a reading of
  the capability-assertion feed. It is the same at every tick; Law 1 treats such a reading as derivable.
- Whether a due-check should be witnessed. A check that finds nothing startable should not (Law 3). A tick that
  starts an attempt is an act that changes the world (it reserves and starts external work) and may be witnessed
  once, at the grain of "attempts started". The attempts it starts are witnessed under their own invocations,
  whose caller names schedule, occurrence and attempt (`recurring.mjs:471-478`).

## 3. What is happening (measured, 2026-10-09)

Measured only with `tail -c`, `dd` (6 MB windows), `ls` of single directories and `journalctl --user -u` with a
time window. The witness file was never read whole. Times are UTC unless marked CDT.

| Fact | Value | Source |
|---|---|---|
| `admit-rpc` witness file, 2026-10-08 / 2026-10-09 (10:20 CDT) | 5,798,154,240 B / 1,004,282,024 B | `561-group-services-section/data/journals/2026/10/{08,09}/` (`ls -la`) |
| Other large feeds, 2026-10-08 | `admit-metroplat.clock` 158,015,488 B; `admit-agent-session-token-usage` 77,732,136 B | same directory |
| Tick rate in 6 MB windows at 100, 400 and 700 MB into the 10-09 file (13:29Z, 13:58Z, 14:56Z) | about 7 ticks/s; `run-due` rows are 100%, 91% and 88% of bytes | `dd` windows |
| Window 15:30:15 to 15:31:03Z | 837 rows, 8,996,627 B; `run-due` 83% of bytes; 246 attempt, 246 decision, 246 outcome rows for `run-due` in 48 s (5.1 ticks/s); mean row 10.7 KB | `tail -c 9000000` |
| Window 15:33:14 to 15:33:31Z | 105 ticks, every one with `started = 0` and only `enterprise-work-inference-node` in flight | `tail -c 3000000` |
| Ticks that started nothing | 185 of 190 in one window; 72 of 190 had all 8 in-flight slots full; the rest had 0 or 1 in flight | `tail -c 6000000` |
| Anatomy of one 6,019-byte line | `sources` 3,612 B; `observation` 1,645 B; `bytes` + `core` 707 B | one decoded row |
| Caller of every tick | `{"transport":"metroplat-clock"}`, `resource: infograph`, `verb: run-due`, `subject: bare-cedar-fog.561.group` | decoded attempt row |
| Heap death | 08:38:52 CDT, uptime 1,171 s: Mark-Compact 511.9 -> 508.4 MB, "Ineffective mark-compacts near heap limit"; service consumed 34 min 24 s CPU in 19.5 min and 1.1 GB peak | `journalctl --user -u bare-cedar-fog-561-group.service` |
| Starts today | Schedule re-admission rows at 13:19, 13:39, 13:46, 13:51, 13:55, 14:04, 14:46Z: seven starts | `admit-metroplat.clock.schedule` (14 rows) |
| Live process now (pid 22879, up since 09:46 CDT) | about 167% CPU, RSS about 1.0 GB, `--max-old-space-size=512`, `FELTOS_CLOCK_INTERVAL_MS=15000` | `ps`, `/proc/22879` |
| Unit | `MemoryHigh=1536M`; the cgroup read 1.57 GB, so the kernel is already reclaiming around the node | `systemctl --user show` |

One fact explains the volume. The ticks are not scheduled work. They are the heartbeat looping without waiting.

## 4. Cause: two clock state roots

The clock keeps, per schedule and occurrence, a write-once reservation marker and an outcome file. The code that
decides whether anything is due and the code that starts it read and write different directories.

| | Heartbeat (decides) | `run-due` operation (starts) |
|---|---|---|
| Code | `runClockHeartbeat` builds `binding = { dataRoot, clockStateRoot }` (`PK/@red-cup-engineering__organizing/src/work/recurring.mjs:124-131`) | `clockOperations(binding, ...)` with the operation surface's binding (`recurring.mjs:413,446-`) |
| State root | `clockStateRoot = path.join(config.stateDir, "clock")` (`STORE/app/src/serve-instance.mjs:284`, passed at `:471-476`), `config.stateDir` = `METROPLAT_WEB_STATE_DIR` (`STORE/app/src/instance-config.mjs:97,142`) = `/home/emsenn/.local/state/561-group/bare-cedar-fog.561.group/clock` | `defaultFilesystemBinding(config.metroplatDataRoot, {...})` without `clockStateRoot` (`STORE/app/src/enterprise-runtime.mjs:22`), so `stateDir` falls back to `<dataRoot>/data/state/clock` (`recurring.mjs:68`; the option is declared at `PK/@red-cup-engineering__computer-system-engine/src/rpc/binding.mjs:56`) = `561-group-services-section/data/state/clock` |
| Last reservation written there | 2026-10-05 21:30 CDT (directory mtime); newest `enterprise-loop-engineering` occurrence there is 14928525, the live one is 14929667 | today, by pid 22879 (`reservedAt` 15:30Z) |

Consequences, each checked against the files:

1. The heartbeat's reading (`anyAttemptDue`, `recurring.mjs:272`) sees no reservation for any schedule's current
   occurrence in the old root, so it reports an attempt due on every look.
2. `waitForNextDue` (`:77`) takes the same reading for demand schedules (`node-job-flow-queue`, whose reading
   is `now` when due), so its timer is zero. The loop spins.
3. Each look dispatches `run-due` (`:136`). `run-due` reads the new root (`:454-463`), finds the occurrence
   already reserved, and starts nothing. A tick that starts something happens only at an occurrence boundary
   (every 120 s for the 30 enterprise schedules).
4. Each dispatch is an `external` act (`recurring.mjs:451`), so `witnessedDispatch` writes attempt, decision and
   outcome (`PK/@red-cup-engineering__computer-system-engine/src/rpc/dispatch.mjs:209-361`), each about 10 KB.
   The outcome carries the whole tick receipt including the in-flight list.
5. Idle ticks "found nothing due" are skipped (`recurring.mjs:130-135`, comment "about 14 KB each"): that
   earlier repair covers the case where the reading is right. It cannot cover a reading taken from the wrong
   directory.

I emulated the clock's own `nextAttempt` rule over the new root for every interval schedule (instance schedules,
node jobs, the 30 enterprise schedules) at 15:33Z: nothing was startable (one running, one in retry wait). The
calendar schedules (`book-outreach`, `launch-census`) and the demand job `flow-queue` are settled by their
files. So the spin is not caused by any schedule being due; it is caused by the heartbeat not seeing the
reservations. Sub-cause for the 72 saturated ticks: `anyAttemptDue` ignores `MAX_IN_FLIGHT` (`:59`) while the
tick stops reserving at it (`:460`). That is a second divergence between the two readings and is repaired by
the same change.

What is not established: why the two roots diverged on 2026-10-05. Nothing in this investigation read the git
history of `binding.mjs` or `serve-instance.mjs` for that day (a pickaxe over the tree is forbidden here). The
requirement does not depend on it.

## 5. Heap: what is known and what is not

Known:

- Live set about 508 MB when the node died; GC and `structuredClone` dominate CPU. The startup profile of the
  current process (`/home/emsenn/.local/state/561-group/bare-cedar-fog.561.group/deployments/startup-22879-1791557219285.cpuprofile`,
  26,426 samples) puts `(garbage collector)` first (1,547), then three `structuredClone` frames (about 590
  each) whose callers are `journalRecords` (`PK/@red-cup-engineering__semiotic-eavt-services-section/src/query-semantic-records.mjs:73`)
  <- `query` (`record-semantic-record.mjs:176`) <- `currentSchedules` (`recurring.mjs:262`) <- `anyAttemptDue`
  (`:272`) <- `runClockHeartbeat`. In words: every heartbeat look re-reads the schedule journal and clones every
  record, and with the spin that happens about 18 times a second (`anyAttemptDue`, `waitForNextDue`, `run-due`).
- The same query also walks `data/logs` for the legacy feed (`legacyRecords`, `:92-122`); `data/logs` is small
  (3 entries), so this is not the cost here.
- Each start re-admits two schedule rows (`reconcileDeclaredSchedules`, `recurring.mjs:374`; seven starts today,
  14 rows). The schedule feed therefore grows with restarts, and every look clones all of it.

In-memory structures that grow with witnesses or are held per journal root (code read, not measured):

| Structure | Where | Bound |
|---|---|---|
| Admitted-id table: 32-byte digest, feed number, chain and hash slot per witness ever admitted into a root (`admitted.jsonl` is 108,712,544 B, about 1.0 M ids) | `PK/@red-cup-engineering__semiotic-eavt-services-section/src/journal/filesystem/segment-store.mjs:128-270`, loaded by `rootIndex` `:369` | grows with every witness; typed arrays are off the old-space heap, `byLogEntries` arrays are not |
| Pending index, deferred bodies | same `:306-329`; `pending.jsonl` 25,799,957 B | per pending record, small objects |
| Reading caches | `segments` 24 MB, `projections` 48 MB budgets (`:430-433`, `:712`) | bounded by estimated cost; a reading dearer than the budget is not kept and is decoded again on every request (`segment-store.mjs:403-404`) |
| Whole-segment projection while building a view | `projectSegmentStatements` (`:713-757`): `view.ids` and `view.values` for every witness of a day before the budget check | O(witnesses of the segment); a 1 GB day segment cannot fit in 512 MB |
| Legacy readings | `legacyReadings` Map, `query-semantic-records.mjs:89` | per query key, grows with the legacy feed |
| Witness-port maps | `heads`, `ownEvidence` (`PK/@red-cup-engineering__computer-system-engine/src/rpc/journal-witness.mjs:26-27`); released only on an `outcome` (`:57-65`) | an invocation that ends with an obstruction after its attempt row (`dispatch.mjs:221-262, 277-309`) never releases its entry |
| One root index per enterprise root | `enterprise-runtime.mjs:35` (`defaultFilesystemBinding(root, ...)` per realm) | 15 enterprises |

Not established: which of these holds the 508 MB. I did not attach to or signal the live node (the instruction
forbids altering it, and `diagnostics.mjs` writes into its state directory). The existing instrument is
`installSamplingSignal` in `STORE/app/src/diagnostics.mjs` (SIGUSR2 samples CPU and allocations for 30 s and
writes `.cpuprofile` and `.heapprofile` under `<stateDir>/diagnostics/`; none exists yet). A sampling profile
shows allocation sites, not retainers, so it narrows but does not settle; settling needs a heap snapshot or the
per-structure meter in requirement RQ-9. The prediction that the repair below lengthens mean time to heap death
is a hypothesis stated in section 8, not a finding.

## 6. Existing work, judged

Searched with `gh` (no clone): open and merged PRs and the main branch history of
`red-cup-engineering/computer-services-section`, `computer-data-services-section`, `feltos`, `emsenn/metroplat`,
and the open PRs of all 25 repositories pinned in
`561-group-services-section/services/561-group-operations-services-section/services/bare-cedar-fog-services-section/data/records/machine-deployment-service-records/metroplat/sources.json`,
filtered by changed file name (`recurring`, `rpc/dispatch`, `journal-witness`, `segment-store`, `world-pulse`,
`enterprise-loops`, `serve-instance`, `journal/event`, `clock`). Verdict vocabulary is the house's:
aligned, misaligned, superseded, already landed.

| Change | What it does | Verdict for this problem |
|---|---|---|
| `computer-data-services-section` #21 "Retain compact journal observations and their addressed witnesses", merged 2026-10-08T07:01Z | New segment writes keep `{id, observation}` only; reads reconstruct and check the address; full records stay readable. Law 2. | Aligned and already landed in the pinned source (`ce7a9c5` contains it; 3 matches for "compact" in `event.mjs`). Not running: the running store was built 2026-10-08 01:40 CDT, before the merge, and its `segment-store.mjs:929` appends the whole statement. Deploying it cuts a row from 6,019 B to about 1.7 KB (the `observation` share, 27%), a factor of 3 to 4. It does not touch the cause. |
| `computer-data-services-section` #43 "Recover journal files with a crash-padded or torn tail", merged 2026-10-09 | Recovers the NUL tail that crash-looped the node at 08:19 CDT; durable append. | Aligned to a different defect (durability). Landed, not deployed (the Leader's-corrections note says so). Keep. |
| `computer-services-section` main `da21eddf0` "Reject invalid RPC bodies before raw attempt retention", 2026-10-08T21:20Z | Refuses an invalid body before it is retained in an attempt row. | Aligned, partial, unrelated to the tick (ticks are valid). Landed after the running build (the running `dispatch.mjs` lacks it). |
| `computer-services-section` main `d360f96ca` "Recover the deployed dependency interface from exact source history" (`recurring.mjs`), 2026-10-07 | Put the running clock code into source. | The code under repair. `recurring.mjs` on main equals the running copy (diff empty); `journal-witness.mjs` also equal. No landed repair of the clock exists. |
| `computer-services-section` #30, #120, #131, #129, #130, #92, #49, #18; `computer-data-services-section` #10, #11, #38; `feltos` #8, #9, #12, #21; `emsenn/metroplat` open PRs | #30 and #120 touch `enterprise-loops.mjs` / `serve-instance.mjs` (5 and 25 lines) and the world clock test; none touches `recurring.mjs`, `dispatch.mjs`, `journal-witness.mjs`, `segment-store.mjs` or the heartbeat call. | Unrelated to this defect. Left open for their own receiving; nothing is closed, discarded or reverted by this note. |
| House copy of `recurring.mjs` at `engineering-services-section/.../agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/organizing/src/work/recurring.mjs` | Older than the running code: no demand trigger, `waitForClockInterval` (fixed interval). | Superseded by `GH-CSS` `organizing/src/work/recurring.mjs`, which is the carrier for the change. The house copy is migration material only. |
| `2026-10-06-metered-derivable-journal.md` Migration 1 (derivation shortcut, head release) and 6 (due-time wakeups) | Partly realized in the running code: `isDerivation` shortcut (`dispatch.mjs:122-131`), head release on outcome (`journal-witness.mjs:57-65`), idle tick skipped, `waitForNextDue`. | Aligned and partly landed; the unrealized remainder is exactly this note's repair: one reading for heartbeat and tick; acts written as one row plus intent (not three or four). |

## 7. Requirements

EARS form, one "shall" in each. Priority: P0 must precede the next deployment; P1 is the next engineering
slice; P2 is owed but separable.

| ID | Requirement | Priority | Rationale and source |
|---|---|---|---|
| RQ-1 | The clock shall keep one state root for schedule reservations and outcomes, read and written by its heartbeat and its `run-due` operation alike. | P0 | Section 4: two roots since 2026-10-05; the reading that decides and the reading that starts diverge. The Leader's rule `group-material-on-bare-cedar-fog-lives-under-info` also puts it under the section's `data/state`, not under `~/.local/state`. |
| RQ-2 | When the heartbeat wakes, the clock shall dispatch `run-due` only if one reading, taken through the operation surface, names at least one attempt that can be reserved now and for which an in-flight slot is free. | P0 | Law 3 (a tick that finds nothing startable is a settled f); `anyAttemptDue` ignores `MAX_IN_FLIGHT` (`recurring.mjs:272` vs `:460`). |
| RQ-3 | While the reading names no startable attempt, the heartbeat shall sleep until the earliest of the next derivable due instant, the end of an in-flight attempt, a change in a demand schedule's watched directory, and the configured safety interval, each taken strictly after the instant of reading. | P0 | Law 3 "wakes for the next due time it can derive"; the opportunistic scheduling loop (wavefront, not polling). A zero wait is how the spin arises (`waitForNextDue`, demand branch). |
| RQ-4 | If a dispatched tick starts no attempt, then the clock shall record one obstruction naming the schedule, occurrence and reason, and shall not dispatch again for that triple until the reason changes. | P0 | Law 6: a defect class is filed as a priced obstruction once, not witnessed every tick; keeps any future divergence of the two readings from recreating 5.8 GB. |
| RQ-5 | The witness of a tick shall carry the `(schedule, occurrence, attempt)` triples it started and no listing of attempts already in flight. | P0 | Law 1 (store only what cannot be derived); the in-flight list is a derivation and is repeated in every outcome row today (`recurring.mjs:488`). |
| RQ-6 | The journal shall store each witness as its content address and its observation, and nothing derived. | P0 | Law 2; already built in `computer-data-services-section` #21 and pinned; the running store predates it. Cuts 6,019 B rows to about 1.7 KB. |
| RQ-7 | For an `external` act the dispatcher shall write one intent row before execution and one act row at completion, citing the authorization and coordination decisions by the content address of the grant or lease they read instead of copying them. | P1 | Law 1 and Migration 1; `admitted-by:infograph:mcp-session-activation` and the lease path are repeated in every decision and coordination row. Fail-closed intent (spec 2026-09-28 F-RPC01) is kept. |
| RQ-8 | When an invocation ends after its attempt was admitted and without an outcome, the witness port shall release its `heads` and `ownEvidence` entries. | P1 | Migration 1; `journal-witness.mjs:57-65` releases only on an outcome, while `dispatch.mjs` returns obstructions after admitting the attempt. |
| RQ-9 | The node shall emit, once per interval, heap used, resident set, and the byte size of each journal-derived structure it holds (admitted-id table, reading caches, legacy readings, pending index, in-flight attempts). | P1 | Law 4 and Law 6: the 508 MB is not attributed because the node does not measure itself; an agent should not need to attach to a live node. |
| RQ-10 | The clock shall read the current schedules from a held projection that advances by appended rows only. | P1 | Section 5: each look clones every schedule record; each start appends two more. Cost must not scale with restarts. |
| RQ-11 | When a feed's rows per hour or bytes per day exceed its stated baseline, the Law 6 monitor shall file an obstruction to the owning office. | P1 | Law 6; the Leader found 5.8 GB by looking at a disc. The acceptance bound is the spec's 20 MB per host per day. |
| RQ-12 | The host shall report, for each pinned source, whether the running store was built from it. | P2 | #21 and #43 are landed and pinned but not running; nothing said so. Receiving by re-measurement needs it. |
| RQ-13 | When a day's `admit-rpc` feed is closed, the journal shall pack it under a manifest of the digests of any rows dropped. | P2 | Migration 3; the 2026-10-08 file (5.8 GB) is evidence until certified; nothing is deleted unseen (rule `existing-work-is-judged-before-it-is-discarded`). |

## 8. Specification

### 8.1 The clock reading

One pure function over the clock state root, `clockReading(binding, now)`, returns:

```
{ startable: [{ schedule, occurrence, attempt }],   // reservable now, at most MAX_PER_TICK, at most free slots
  blocked:   [{ schedule, occurrence, reason }],    // reason: capacity | retry-wait | running | exhausted
  wakeAt:    ISO instant | null,                    // earliest instant a blocked or future attempt can start
  freeSlots: integer }
```

- `startable` is computed with the same `dueOccurrence` and `nextAttempt(..., {record:false})` as today, then
  cut to `freeSlots`. The in-flight map is read once.
- `wakeAt` is the minimum of: each interval or calendar schedule's next occurrence (`nextDueAt`), the `ranAt +
  retryAfterSeconds` of each retry-waiting attempt, and a demand schedule's `nextAt`. It is always strictly
  later than `now`. Where a schedule would give an instant that is not later than `now` yet has no startable
  attempt, the reading leaves that schedule out of `wakeAt`, lists it in `blocked` with reason `exhausted`, and
  `wakeAt` falls back to `now` plus the safety interval.
- It writes nothing. Recording an interrupted attempt (`nextAttempt` with `record: true`) stays in the tick.

Exposed as a `host-read` operation `clock-due` in `clockOperations` (Law 1: a derivation leaves no row). The
heartbeat calls `clock-due` through the same `surface` it uses for `run-due`. It then cannot read a different
root: it holds no binding of its own, and `runClockHeartbeat` loses its `dataRoot` and `clockStateRoot`
parameters.

### 8.2 The heartbeat

```
loop:
  reading = dispatch(surface, "clock-due", { now })          // derivation: no rows
  if reading.startable is empty:
      sleep(until min(reading.wakeAt, anInFlightEnds(), demandWatchFires(), now + safetyInterval))
      continue
  tick = dispatch(surface, "run-due", { now })               // one act: intent row + one act row
  if tick.started is empty:                                   // the two readings disagreed
      record obstruction (schedule, occurrence, reason)       // once per triple (RQ-4)
      sleep(until reading.wakeAt or safetyInterval)
```

Properties (to be received as tests, not assumed):

- P-idle: for any state with an empty `startable`, no `run-due` is dispatched and no journal row is written.
- P-progress: every dispatched `run-due` starts at least one attempt, or exactly one obstruction is recorded.
- P-one-root: the set of files the heartbeat reads is the set `run-due` writes (same function, same binding).
- P-wake: the wait is greater than zero in every iteration.

### 8.3 What a productive tick witnesses

`run-due` returns `{ kind: "metroplat.clock.tick", now, started }`; `inFlight` is removed (RQ-5). The attempts it
starts are dispatched exactly as now (`recurring.mjs:471-478`), each under its own invocation and witness.

### 8.4 Journal row and act grain

RQ-6 is a deployment of already landed source. RQ-7 changes `witnessedDispatch`
(`dispatch.mjs:209-361`): for `external` operations write `intent` (the attempt row) and one `act` row holding
the decision, the coordination decision (when `coordination-required`; it is `coordination-free` for `run-due`
and for the enterprise verbs shown), the outcome digest and effect artifacts. The decision's `evidence`
(`admitted-by:*`) becomes the content address of the capability-assertion row that admitted it.

## 9. Design: the smallest aligned change

Order, smallest first. Items A and B stop the volume; C multiplies the saving; D is for the heap.

| Step | Change | Owner and exact location | Carrier |
|---|---|---|---|
| A | One state root and one reading: add `clockReading` and a `host-read` `clock-due` operation, make `run-due` and the heartbeat both consume it, remove `clockStateRoot` from `runClockHeartbeat` and from its call. | `GH-CSS` `services/organizing/src/work/recurring.mjs` (`runClockHeartbeat` `:124`, `anyAttemptDue` `:272`, `waitForNextDue` `:77`, `run-due` `:446-`); `.../apps/feltos-enterprise-host/src/serve-instance.mjs` (`:284`, `:471-476`); `.../enterprise-runtime.mjs:22`. | A PR to `computer-services-section` through the work board; receiving by the CEngO's duty. |
| B | Tick witness without `inFlight`; obstruction on a no-progress tick. | same file, `run-due` return value and heartbeat. | same PR |
| C | Deploy the pinned sources (includes #21 compact rows and #43 tail recovery) in a rebuilt store. | `.../metroplat/sources.json` already pins them; the rebuild is the deployment act. | Operations, not engineering; needs the Leader's go-ahead for a restart (the unit is not touched by this note). |
| D | Heap: per-structure meter (RQ-9) and `clock` schedule projection (RQ-10); then re-measure; then take a SIGUSR2 sampling profile if heap deaths persist. | `GH-CSS` `computer-system-engine` (meter), `organizing` (projection), `semiotic-eavt-services-section` (index sizes) in `computer-data-services-section`. | Separate PRs. |
| E | RQ-7, RQ-8 (dispatcher row grain, head release) and RQ-11. | `GH-CSS` `computer-system-engine/src/rpc/dispatch.mjs`, `journal-witness.mjs`. | Separate PR after A to C are measured. |
| F | Evacuate the stale root `/home/emsenn/.local/state/561-group/bare-cedar-fog.561.group/clock` (75 schedule directories, last written 2026-10-05 21:30 CDT) into the section's `data/state` as an archive once nothing reads it; same for the receipts in `~/.local/share/561-group/releases/bare-cedar-fog.561.group/jobs/`. | Operations (rule `group-material-on-bare-cedar-fog-lives-under-info`). | After A is running. |

Why not a smaller patch: changing only `serve-instance.mjs` to drop `clockStateRoot` would end today's spin but
leave two parallel bindings that can diverge again, and leave the saturation spin. Why not a larger one:
rewriting the clock as a wavefront with no heartbeat (the glossary's ideal) needs the event source for physical
time and the enterprise turns as admitted events; that is a separate piece of research and not needed to stop
the volume.

Codemod or codegen. A and B are hand edits of three functions. What is mechanical and recurring is the class
"a `run-due`-like operation declared `external` that is called by a loop": the Law 6 monitor (RQ-11) files an
obstruction per feed whose rows per hour exceed the baseline; the plan step proposes the codemod "rewrite an
operation's `effects.class`" or "wrap a loop in a reading" through the existing AOE generator. I did not run
any generator.

Expected effect (estimates from the 10-09 samples, to be re-measured, not promises):

| Stage | `admit-rpc` per day |
|---|---|
| Now (about 7 ticks/s, 3 rows, about 10 KB, plus legitimate acts) | 4 to 6 GB (10-08: 5.8 GB) |
| After A and B (ticks only when an attempt starts: at most 30 enterprise attempts per 120 s boundary plus node jobs; the other 10 to 17% of today's bytes remain) | about 0.1 to 0.4 GB |
| After C (rows about 3.5 times smaller) | about 30 to 110 MB |
| After E (act row plus intent, decision cited) | at or near the 20 MB bound; the enterprise turns every 120 s (30 attempts per boundary) may need Law 3 as well: an enterprise with nothing to do is a settled f |

The same arithmetic applies to the neighbouring feeds, which are out of this change but share its cause class:
`admit-metroplat.clock` (158 MB on 10-08, 7 KB per occurrence row) and `admit-agent-session-token-usage` (78 MB
on 10-08, 58 MB by 10:00 CDT on 10-09).

Heap expectation (hypothesis H-1). With A and B the heartbeat stops cloning the schedule journal 18 times a
second and the witness port admits about a tenth of the rows; allocation churn and the pace at which the
admitted-id table grows both fall by about that factor. If H-1 is right the node survives until some slower
retainer fills 512 MB; if heap deaths continue at the same period, the live set is not a function of the spin
and RQ-9's meter, then a heap snapshot, are the next moves. The 512 MB limit is not raised (rule: do not change
the unit; and a larger heap hides, not removes, a retention).

## 10. Receiving conditions

Independent of the Senior (duty `realizing-allocated-engineering-work`, `receiver-condition`): a distinct
engineering receiver observes, at the real node, after A to C are deployed, for 24 hours:

1. `admit-rpc` bytes for the day under 0.5 GB after A and B, under 120 MB after C; zero `run-due` rows in a
   quarter hour with no attempt boundary in it.
2. The heartbeat and `run-due` read one directory; the old root is not written.
3. A tick that starts nothing yields at most one obstruction per (schedule, occurrence, reason).
4. No `FATAL ERROR: Ineffective mark-compacts` in the journal of the unit for 24 hours, or, if one occurs, the
   RQ-9 meter attributes the live set.
5. `sources.json` pins appear in the running store (RQ-12).

## 11. Trace of this investigation (move by move)

1. Primed from the office, incumbency, duty and skill records of the Senior Engineer; printed every rule
   statement in `561-group-services-section/lib/agency/rules/`; read `/home/emsenn/info/AGENTS.md`.
2. Read the unit (`systemctl --user cat`, secrets filtered): `NODE_OPTIONS=--max-old-space-size=512`,
   `MemoryHigh=1536M`, entry `STORE/bin/bare-cedar-fog`.
3. Located the producer by name: `git ls-files` for `*run-due*`, `*journal-witness*`, `*metered-derivable-journal*`;
   `grep -n` over single files of the deployed app only (no recursive grep). Found `rpc/journal-witness.mjs`
   and `rpc/dispatch.mjs` in `computer-system-engine`.
4. Read `dispatch.mjs` and `journal-witness.mjs` in full. Found the derivation shortcut (Law 1) and that
   `run-due` is declared `external`, so it takes the witnessed path.
5. Sampled the witness file with `tail -c`: 270 rows, four row kinds, mean 11 KB; decoded one attempt row:
   caller `metroplat-clock`, verb `run-due`.
6. Read `serve-instance.mjs` (clock wiring) and `recurring.mjs` in full; read the house copy and diffed it.
7. Counted ticks and what each started, from outcome receipts in 3 to 9 MB tails: most start nothing.
8. Checked the 25 schedules' state with `ls` of `data/state/clock/reservations` and a read-only emulation of
   `nextAttempt`: nothing startable, so the heartbeat's reading must differ from the tick's.
9. Read `/proc/22879/environ` (names `METROPLAT_WEB_STATE_DIR`, `FELTOS_CLOCK_*`, no secrets) and listed the
   second state root: last written 2026-10-05. Cause found.
10. Read the startup CPU profile the node itself wrote; traced `structuredClone` to `currentSchedules`.
11. Read `segment-store.mjs` (index, caches, projection) for the heap retainers; read `journalctl` windows for
    the heap-death log lines.
12. `gh`: listed open PRs, searched merged PRs by topic, listed PR files, fetched `main` copies of the three
    files and diffed them with the running copies; read PR #21 and #43 diffs.
13. Compared the pinned source (`ce7a9c5`) with the running store: #21 present in the pin, absent in the store
    (built 2026-10-08 01:40 CDT).
14. Wrote this note. Nothing was edited in the repository except this file; the live node, its unit and its
    environment were not touched; nothing was written outside `/home/emsenn/info`.

## 12. Open questions

- Why the roots diverged on 2026-10-05 (no history read; see section 4).
- Which structure holds the 508 MB (section 5).
- Whether the 30 enterprise turns every 120 s should be dispatched at all when an enterprise has no open work
  (Law 3 applied to the enterprise loop), and whether `enterprise-loop-run` and `enterprise-work-run` need
  separate schedules. This belongs to the enterprise-loops owner, not to this repair.
- Whether a `host-read` operation called by the host's own heartbeat needs authorization at all; today it would
  go through `authorize` like any call.
- The Leader's five directions and relating/knowing/communicating/playing: held by the Senior Scientist's
  dispatch (section 1). No connection to this specification is claimed.

## Addendum: a second disk load, seen 15:44–15:50Z

This was seen by the dispatching session after the investigation above, and is
recorded here as a sibling cause; it is not part of steps A to F.

Within a minute of a push to `emsenn/bare-cedar-fog` main, the node (pid 22879)
ran `git worktree add --detach /home/emsenn/.local/state/561-group/codex-worktrees/agency-receive-<digest> refs/remotes/origin/main`.
It then ran `git submodule update --init --force` over the section submodules in
that worktree, and next took `flock --exclusive .../codex-provider-capacity/`
and began a second worktree. Disk pressure (`/proc/pressure/io`, some avg10) rose
from about 18% to 84–88% and load to 15–17 on 16 CPUs. Those are the levels that
preceded earlier WSL crashes. The checkout was put at idle I/O priority by hand
and was not stopped.

What it implies: each receive of the agency writes a whole checkout of the
superrepo, with its submodules, outside `/home/emsenn/info`. That breaks the
rule `group-material-on-bare-cedar-fog-lives-under-info`, and costs the laptop
its disk for minutes every time main moves. It is owed the same treatment as
the clock: find the governing theory of agency receiving, find any existing
repair, then a requirement such as "a receive shall read only the agency
records that changed, from the existing checkout". The code was not read here.
