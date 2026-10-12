---
title: "The nightly finite dream: requirements, specification and design"
description: "Dreaming as a routine of the Bare Cedar Fog MetroPlat node: once a night the finite corner of the dream tower re-reads the node's settled records since its last dream, emits inert bottom-opened proposals for latent cells, and lands them as unsettled open questions for the owning office, with the schedule's disk cost named."
date-created: 2026-10-09
type: specification
status: proposed; not implemented; needs independent receiving (the Senior Engineer does not receive its own outcome)
owner: agent-computer-system-engineering-services-section
keywords:
  - dreaming
  - finite-corner
  - open-question
  - node-job
  - work-board
  - schedule
provenance:
  authors:
    - bare-cedar-fog-claude (Hai Jian), office senior-engineer, incumbency bare-cedar-fog-claude-as-senior-engineer
    - claude-sonnet-5-5 (the carrying model)
  received-under: engineering-services-section/lib/agency/skills/realize-research-grounded-engineering-work/SKILL.md
  duty: engineering-services-section/lib/agency/duties/realizing-allocated-engineering-work.json
  dispatched-by: the Leader's standing direction of 2026-10-09, through Bare Cedar Fog's Claude character
---

# The nightly finite dream

Paths are relative to `/home/emsenn/info/lib/emsenn/services/561-group/services/` unless they start with `/`.
`KNOWING` means `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/knowing`.
`JOBS` means `561-group-services-section/services/561-group-operations-services-section/services/bare-cedar-fog-services-section/data/records/machine-deployment-service-records/metroplat/deployments/bare-cedar-fog-host/deploy/jobs`.
`HELD NOTE` means `engineering-services-section/content/text/documents/articles/notes/2026/06/05/2026-06-05-seam-memory-dreaming.md`.

## 1. The theory this specification realizes

These statements are the house's, taken from the held note and the dreaming module. They are not new.

1. The trace field is the semiosphere. Memory is the field the next articulation is read against (HELD NOTE, fact 1).
2. Dreaming is a generative re-settling that emits inert proposals. A dream reads a memory window through the sheaf, finds latent cells, and opens each as a bottom-opened `open-question` cell. A bottom-opened cell is a second fact, "the cell was asked"; it is never a fifth value and never determines the cell (HELD NOTE, facts 6 and "The design").
3. A dream never settles the trace. It proposes. A governing pass decides which proposals are articulated (HELD NOTE, "Aspirational").
4. The semiosphere has a night cycle. By day work writes cells; by night dreaming re-reads the field and opens questions; by day again governance answers some (HELD NOTE, "Aspirational").
5. The finite corner is the regime `k < omega`. It recombines existing claims to a least fixed point, invents nothing, uses no network and is deterministic and replayable (HELD NOTE, fact 5 and fact 7). The aperiodic corner is the only one that calls an enactor; this specification does not use it.
6. A latent cell is a topic that co-occurs across at least `minSupport` distinct memory terms and has no memory term of its own (HELD NOTE, "The design").
7. A question is not work merely because it is asked. The Senior Engineer's skill states: "Do not make a question, idea, assistant interpretation, or correction into work merely to persist it" (`engineering-services-section/lib/agency/skills/realize-research-grounded-engineering-work/SKILL.md:77`). A dream proposal is therefore carried as an unsettled opening addressed to an office, with no allocation, price or taking, until that office decides to allocate it.
8. Resources follow science, engineering, operations, then the 561 Group. The dream is generic engineering and carries no section's data; the job record that schedules it is operations and the node's own (`science-engineering-operations-parameterize-in-order`).

## 2. What the house holds, judged

The house holds three implementations or fragments of dreaming. Each is judged against the theory above.

| Held thing | Where | Judgment |
|---|---|---|
| `dreamWindow`, `readWindow`, `latentTopics` | `engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/agent-computer-platform-system-engineering-services-section/services/multi-agent-computer-platform-system-engineering-services-section/lib/legacy/SWARM/src/dreaming.mjs:90-119` | Aligned in discipline, misaligned in substrate. It is the exact finite corner of the held note: inert, bottom-opened, network-free, witnessed (`:101-113`). It reads `swarm-sheaf`, `memory` and `cognition` of the legacy SWARM, which are not the node's record store, and it is stored under `lib/legacy`. Its logic migrates; its imports do not. A GitHub code search of the `red-cup-engineering` organization for `dreamWindow` returned no result on 2026-10-09, and a repeat was refused by the rate limit; the slice's first step repeats it before writing the function. |
| `strictFiniteDream`, `scottContinuousDream`, `transfiniteDream`, `aperiodicDream` | `KNOWING/src/dreaming/index.mjs:145,172,199,297` | Aligned in substrate, incomplete for this purpose. It is the organization's package (`@red-cup-engineering/knowing`), works over `observation` values in the SignChain evidence order, and states the four regimes. `strictFiniteDream` composes chains (object of one observation is subject of the next); it does not detect latent cells and it emits observations, not open questions. The latent-cell function is absent. |
| `dreaming-state-record` and `dreaming` schemas | `science-services-section/services/philosophy-services-section/services/relationality-services-section/services/agency-services-section/schemas/dreaming-state-record.schema.json` | Aligned, not used here. It describes a fiber that is dreaming (sensory predicates suspended). It states that a dream-tick invokes no inferring morphism. The nightly job does not suspend any entity; it adopts only the rule that no inference is invoked. |
| Node job declarations | `JOBS/*.json`, reader `engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/services/node-runtime-authority-services-section/services/node-runtime-release-promotion-service/src/node-job.mjs:16-25,48-80,111` | Aligned. A job declares a cron `schedule` with a `timeZone` or `everySeconds`, `maxSeconds` from 1 to 86400, `successExitStatus`, and `workingTree.custody` only when it writes the repository. `JOBS/launch-census.json` is the precedent for a daily cron job in `America/Chicago`. |

The change is therefore small in schedule and large in code. The schedule is one job record. The code is a new function in the organization's `knowing` package, a record reader, an open-question sink and an entry script. No job record is written in the house yet, because a record that names a script that does not exist fails every night and adds load for nothing. The draft record is in section 6.

## 3. Requirements

Each requirement has one "shall". The subject is "the nightly dream".

- R1. The nightly dream shall run once per local night on the Bare Cedar Fog MetroPlat node as a node job.
- R2. The nightly dream shall read only the settled records admitted after the cursor held by its previous completed dream.
- R3. The nightly dream shall read records through the node's settled-record reader and not by scanning the filesystem.
- R4. The nightly dream shall treat each settled record term of the window as one memory term.
- R5. The nightly dream shall derive latent cells with the finite corner of `KNOWING/src/dreaming` and no other regime.
- R6. The nightly dream shall define a latent cell as a topic present in at least `minSupport` distinct memory terms of the window and absent as a term of its own.
- R7. The nightly dream shall produce the same proposals from the same window and the same cursor.
- R8. The nightly dream shall invoke no network call and no inference.
- R9. The nightly dream shall emit each proposal as a bottom-opened `open-question` cell carrying its regime, its support and the witness terms that raised it.
- R10. The nightly dream shall write no settled record and no cell other than the opening of a proposal.
- R11. The nightly dream shall land each proposal on the work board as an unsettled opening addressed to the office that owns the section of its witness terms.
- R12. The nightly dream shall carry no allocation, price, taking or deadline on a proposal.
- R13. The nightly dream shall derive a proposal's identity from its agent, predicate and topic, so that a proposal already open is not opened twice.
- R14. The nightly dream shall leave unopened any proposal whose topic matches a proposal already answered or declined by the owning office, until a new witness term appears.
- R15. The nightly dream shall open at most `maxProposals` proposals per run, ranked by support and then by topic.
- R16. The nightly dream shall advance its cursor only after every proposal of the run is landed or recorded as skipped.
- R17. The nightly dream shall name, in its run record, the window, the cursor before and after, the count of terms read, the count of proposals derived, opened and suppressed, and the bytes it read and wrote.
- R18. The nightly dream shall read the disk's I/O pressure before reading any record and shall exit with the temporary-failure status, leaving the cursor unmoved, when the ten-second average of "some" pressure exceeds 60.
- R19. The nightly dream shall run in the local night, outside the hours in which interactive sessions work on the node.
- R20. The nightly dream shall not declare `workingTree` custody, because it writes no repository file.
- R21. The nightly dream shall hold no section's data, name or brand in its code; the sections, the offices and the thresholds are parameters of the job record.
- R22. The nightly dream shall refuse to run when its window exceeds `maxTerms`, and shall record the refusal so that the next run's window is narrowed by the cursor.

## 4. Specification

### 4.1 Function (code, in the organization's `knowing` package)

Add `latentCellDream(observations, options)` to `KNOWING/src/dreaming/index.mjs`, beside `strictFiniteDream`. It is the finite corner of the held note, restated over `observation` values instead of SWARM sections.

- Input. `observations` is the window, each observation's `task.subject` naming its memory term and its `task.object` carrying the term's topic tokens. `options` are `minSupport` (default 2), `maxProposals`, `observer`, `at`.
- Output. The existing dream result shape (`dreamResult`), whose observations are open-question observations: `task.predicate` is `open-question`, `task.object` is the topic, `evidence` is the `noEvidence` pair (the cell is asked, neither supported nor refuted), `note` is the sorted witness terms and the support count.
- Properties. Pure, synchronous, deterministic. Sorted by support descending, then topic ascending. No import of the legacy SWARM and no network. Its tokenizer is a parameter (`options.tokenize`) whose default is the knowing package's existing tokenizer; the function adds no second tokenizer.
- Tests, in `KNOWING/test/dreaming.test.mjs`, port the four tests of the held note: latent-cell surfacing with witnesses, inertness (the input window is byte-identical after the call), singleton suppression, and cursor-window prefix reading.

The legacy `dreaming.mjs` is not deleted. After the function above lands and is received, the legacy file is recorded as superseded in the migration ledger of its section, which is the judgment `existing-work-is-judged-before-it-is-discarded` requires before any removal.

### 4.2 Reader (data)

`windowOfSettledRecords({ cursor, sections, maxTerms })` returns the memory terms admitted after `cursor`. It uses the settled-record reader the node already serves and the record classes the job record names. It never lists a directory tree. The reader's output carries each term's owning section so that R11 can address the opening.

### 4.3 Sink (networking)

`openProposalOnBoard({ proposal, owner })` opens a proposal on the work board as an unsettled opening: `kind` `question`, `source` the content address of the witness terms, `serves` empty, no allocation. The opening is addressed to the owning office. It uses the board's existing opening verb and does not create a second registry. The owning office reads it with the existing full-thread reader and may allocate it, decline it, or answer it.

### 4.4 Entry script (systems)

`scripts/nightly-dream.mjs`, run by the node job. It performs, in order: the pressure check (R18), the cursor read, the window read, `latentCellDream`, the suppression against answered or open proposals (R13, R14), the openings (R11), the cursor write (R16), the run record (R17). The cursor and the run record are admitted as records of the node's own data section. They are not files in the repository.

## 5. Design

### 5.1 Why the finite corner only

The held note builds the finite corner and names the others as holes (HELD NOTE, "Aspirational"). The finite corner is the only one that is deterministic from the window alone, makes no call and costs reading time only. The scott-continuous and transfinite functions already exist in `KNOWING/src/dreaming/index.mjs:172,199` and may become later nightly steps once receiving shows what the finite corner's proposals are worth. The aperiodic corner needs an enactor and therefore inference spend, so it requires a separate decision of the office that owns the spend.

### 5.2 Why unsettled openings and not tasks

Proposals that the owning office has not yet judged would flood allocation if each carried a price and a taking. The skill forbids turning a question into work merely to persist it (theory statement 7). An opening with no allocation lets the owning office see the question, and costs the board one record per proposal.

### 5.3 Why the cursor

A window bounded by the cursor makes the run's reading proportional to a day of change, not to the whole record store. It also makes the dream replayable: the same cursor and the same records produce the same proposals (R7). If a night is skipped for pressure, the next window is two days wide, so the window cap (R22) bounds it.

### 5.4 The owning office

The owner of a proposal is the office whose section holds the witness terms. When witness terms span sections, the owner is the lowest section that contains them all, and the opening names the other sections. A proposal with no resolvable owner is addressed to the Chief Engineering Officer of Red Cup Engineering, who receives engineering work (the receiving duty is to be confirmed by the slice, C8).

## 6. The schedule and its cost

### 6.1 Draft job record

Write to `JOBS/nightly-dream.json` only when the entry script exists in the release (receiving condition C4).

```json
{
  "id": "nightly-dream",
  "summary": "The node dreams once a night: its settled records since the last dream are re-read through the finite corner and the latent cells found are opened as unsettled questions for the offices that own them",
  "directory": "app/node_modules/@red-cup-engineering/knowing",
  "node": ["scripts/nightly-dream.mjs", "--min-support", "2", "--max-proposals", "25", "--max-terms", "5000"],
  "maxSeconds": 600,
  "successExitStatus": [0, 75],
  "schedule": "40 3 * * *",
  "timeZone": "America/Chicago",
  "firstDueAt": "<the first 03:40 America/Chicago after the release, as a UTC instant>"
}
```

`successExitStatus` 75 is the temporary-failure status that R18 uses for a skipped night. The record is checked by `node-job.mjs:111` (`maxSeconds` between 1 and 86400) and by the deployment's verify step.

### 6.2 When it runs

It runs at 03:40 America/Chicago, which is 08:40 UTC while Chicago keeps daylight time and 09:40 UTC after it ends on 2026-11-01. The cron rule is held in the zone, so it follows the change. The hours of 03:40 to 03:50 contain no declared job of `JOBS` that starts on the same minute: the interval jobs begin at minutes `:00`, `:05`, `:07`, `:11`, `:15`, `:30` and `:45`, and the daily cron jobs run at 06:00 America/Chicago (`launch-census`) and 00:05 UTC (`chain-reconciliation`). The four-hourly `repository-maintenance` fires at 02:00, 06:00, 10:00 UTC, which is 21:00, 01:00 and 05:00 Chicago, and does not overlap.

### 6.3 Its cost

The cost is named per run, as bounds the entry script enforces, not as measurements. No run has been made.

- Read. The settled-record reader is called once per record class the job record names, not per record. The window is capped by `maxTerms` (5000). The reads are of records the node already holds; they add no write except the node's witness of each call. The node writes about 10 KB per witnessed RPC, three times per RPC (`engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/content/text/documents/articles/notes/2026/10/09/2026-10-09-spec-rpc-witness-volume-and-node-heap.md`, "Why this note is in this section" and section 1). With at most 8 reader calls, 25 openings, 1 cursor write and 1 run record, the run makes at most 35 witnessed calls, so the journal growth is at most 35 x 3 x 10 KB, about 1 MB per night.
- Compute. One Node process for at most 600 seconds (`maxSeconds`), single-threaded, in memory for a window of at most 5000 terms. The finite corner is quadratic in no input; its support count is a single pass.
- Disk during the day. None. The job does not run in the day. The pressure check (R18) additionally skips the night when the laptop is already loaded, and a skipped night costs one witnessed call.
- Disk because of repository pushes. None. The job declares no `workingTree` custody (R20), so it does not trigger the checkout of the superrepo that each push to main causes on the node.
- The day's comparison. The 2026-10-08 incident wrote 5.8 GB of witnesses in a day. One night of this job is about 1 MB, or one part in 5800 of that day, and it is bounded by the caps above, not by the number of records.

## 7. Receiving conditions

The Chief Engineering Officer or another office that did not fabricate the change receives it. It is received when all of these hold.

- C1. `latentCellDream` exists in `KNOWING/src/dreaming/index.mjs`, passes the four ported tests, and a test shows the input window unchanged after the call (R7, R10).
- C2. A test run over a fixture window shows that two runs from the same cursor yield identical proposals and identical identities (R7, R13).
- C3. A test shows that a proposal whose topic matches an answered opening is suppressed, and reappears when a new witness term is added (R14).
- C4. The entry script exists in the released `@red-cup-engineering/knowing` and passes the node-job verify step; only then is `JOBS/nightly-dream.json` written.
- C5. A dry run on the node, started by hand at night with the same arguments, prints the run record of R17 and writes no opening.
- C6. The first scheduled run's openings are read by the owning office through the board's full-thread reader and carry no allocation, price or taking (R11, R12).
- C7. The journal growth of one scheduled night, read from the node's own measure, is at most 2 MB. If it exceeds that, the job is disabled and the cause is repaired in the owning software before it is enabled again.
- C8. The suppression rule (R14) needs the owning office's decline to be a readable record on the board. If the board holds no such record, the slice states which verb carries it and the receiving office accepts that verb before the job is enabled.

## 8. Cloud slice

One slice, in the repository that publishes `@red-cup-engineering/knowing`: add `latentCellDream`, the window reader, the board sink and `scripts/nightly-dream.mjs`, with the tests of C1 to C3, and open a pull request for the Chief Engineering Officer to receive. The house then writes `JOBS/nightly-dream.json` (C4) in a separate change under the Bare Cedar Fog operations section.

## 9. Not yet derived

- The record classes the first window reads. The job record names them; the choice belongs to the office that owns each class, and the first run should read one class.
- The board verb that carries an unsettled opening of kind `question`. Section 4.3 requires the board's existing opening verb; the slice's first step names it from the board's full-thread reader, and C8 holds the receiving condition.
- The `asOf` boundary. The held note defers `readAsOf` until the monotone-`t` migration (HELD NOTE, fact 2); this specification uses a cursor of admission order and not `asOf`.
