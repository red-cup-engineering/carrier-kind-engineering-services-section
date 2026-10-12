---
title: Persona bodies with their own heartbeats in the MetroPlat world
status: specified; implementation not begun (the hourly batch turn is its thinnest realization)
date-created: 2026-10-09
authors:
  - emsenn
  - claude-opus-5-5
received-under: lib/emsenn/services/561-group/services/engineering-services-section/lib/agency/skills/realize-research-grounded-engineering-work/SKILL.md
keywords:
  - persona
  - body
  - heartbeat
  - pulse
  - metroplex
  - mud
  - retained-state
  - requirements
  - specification
  - design
---

# Persona bodies with their own heartbeats in the MetroPlat world

All paths below are relative to `lib/emsenn/services/561-group/services/` unless they begin with `apps/` or `src/`, which are relative to the MetroPlat application that holds this document (`engineering-services-section/.../agentic-enterprise-computer-platform-engineering-services-section/apps/metroplat/`).

## 1. The theory

### 1.1 What the Leader holds

The Leader, 2026-10-09: the `persona-tend` job is "the THINNEST version of 'bodies in our MUD with their own heartbeats, and some of these are characters that perform on the Web'", and "we are intending for prompts to turn into THICK scientific research, intense spec of code design" (recorded in `561-group-services-section/content/text/documents/articles/notes/2026/10/09/2026-10-09-note-on-the-leaders-repeated-corrections.md:76`). The Leader's AGENTS.md states the intended environment: "a type-theoretic distributed operating system ... creating a conurbanized ecosystem of agentic nodes", whose nodes "operate as service loops". A MUD is that ecosystem's world; a body in it is an inhabitant with its own loop.

Three statements follow and are the theory this document realizes.

1. **An inhabitant of the world is a body, and a body has its own heartbeat.** The heartbeat belongs to the body. A batch job that visits every body in turn is a scheduler, and it has the heartbeat; the bodies do not.
2. **Some inhabitants are characters that perform on the Web.** A performing character is an inhabitant like any other. Its performance is its actuation through the hands (accounts, sites, inboxes) it has on the Web, and the Web is its environment, outside the world's rooms.
3. **A prompt is developed into research, requirements, specification and design before code** (`561-group-services-section/lib/agency/rules/leader-prompts-become-research-before-code.json`). The turn that exists is the thinnest implementation of the first statement, and it is not its realization.

### 1.2 What the house already holds

**The persona is a mask worn by a bearer.** A persona is a record in the `masks` pool of kind `persona`, `worn-by` an enterprise or character, with a `carrier` that holds her presences, voice and disclosure (`public-services-section/lib/agency/masks/sigrid-song.json`). Sigrid Song is Causeway Publishing's pen name, so Causeway Publishing's play, wearing her, is her turn (`public-services-section/services/public-media-services-section/services/public-personality-services-section/src/cast.mjs:30`). Her `claims-to-be-human` commitment is `f`.

**A persona's organs are her presences.** "A persona's organs are read from its carrier's presences: every presence can send; a presence with an addressed account or an inbox can also receive" (`561-group-services-section/content/text/documents/articles/notes/2026/10/02/2026-10-02-note-on-the-two-bodies.md`, the section "The two bodies"). The code is `carrierOrgans` at `engineering-services-section/.../agent-computer-system-engineering-services-section/apps/agent-organization-engine/lib/organizing/src/agency/organs.mjs:53`. A bearer's body natural is the knowledge join of its organs. An office has no body natural: it is a mask that borrows its incumbent's body.

**The science separates person, body, office and pulse.** `science-services-section/content/text/documents/articles/notes/2026/10/02/2026-10-02-person-body-office-pulse-persistent-agent-lives.md` holds these results, each an invariant this document receives:

- A pulse wakes a continuity-bearing individual; it does not instantiate an office-holder, and "not every pulse entails an office" (lines 231-258).
- A body is a measured execution envelope B_t = (H, L, C, R, E, A, Λ, D, ℓ, κ): host binding, load, context pressure, budgets, faults, attention, credential leases, maintenance debt, network location and continuation epoch. Its states are interocepted from the environment, never written as prose (lines 289-316).
- Availability is not authority: Executable = Authorized(P, O, m, t) ∩ Available(B_t) (lines 318-355).
- A pulse is an event with a wake reason, and a scheduled clock tick is one source among several: a new message, a deadline, a counterparty reply, a health signal, a resource transition (lines 357-377).
- Each pulse selects a mode: work, quiet-rest, consolidation, imaginal, study, maintenance, social, transit, idle. Idle is a mode in which nothing but a checkpoint occurs (lines 379-418).
- Every new or resumed pulse reconstitutes the canonical identity at the privileged runtime layer before consequential first-person action; finding it in searchable memory is not evidence of enactment (lines 661-697).
- Migration is a witnessed transfer of continuation authority, and initial multi-host continuity is single-writer and fenced (lines 729-751, 1107-1134).
- Consolidation is witnessed, replayable settlement; imaginal output stays noncanonical until separately witnessed.

**The MUD is the world, and MetroPlat is its mudlib.** `src/metroplex.mjs:1-37` states that every services section is a room, an account connects as the character it masks, and the house's operation verbs are commands, of which only the verbs a character's offices grant are its powers. `src/metroplex-pulse.mjs:1-18` states that the city's pulse is a fold of the RPC journal: a walker per routine (a clock schedule) and a walker per account, standing in the room of its latest act and resting where its office or the plaza is. `src/metroplex-people.mjs:20` holds a presence for fifteen minutes after a character last acted.

**The MUD tradition gives each object its own heartbeat.** The house's LPMud analysis names the driver's `set_heart_beat` and the gap in the house's own driver: "Per-object heartbeat intervals. Let scheduled agents and autonomous loops declare their own tick frequency rather than inheriting one global interval" (`public-services-section/services/personal-services-section/services/emsenn-services-section/content/text/documents/articles/notes/2026/04/04/2026-04-04-lpmud-architecture-for-agentic-systems.md:271`).

**Retained records are a body's memory, and a pull request is a review of source.** A pull request is the carrier of a change to source that a receiving office judges. A receipt of an act already done is not a change to be judged; it is a body's autobiographical record, and it settles by the consolidation law, not by review.

## 2. Findings on the present realization

These are findings about `persona-tend`, held to the theory above.

1. **One scheduler has the heartbeat, and no persona does.** `persona-tend --all` is one job, `everySeconds: 3600`, that visits every persona (`public-services-section/.../public-personality-services-section/scripts/persona-tend.mjs:37,73-99`; job record `561-group-services-section/services/561-group-operations-services-section/services/bare-cedar-fog-services-section/data/records/machine-deployment-service-records/metroplat/deployments/bare-cedar-fog-host/deploy/jobs/persona-tend.json`). In the metroplex it appears as one routine walker named for the schedule. No persona is a walker, stands in a room, or is listed by `who`.
2. **The turn is mode-blind.** Each turn reconciles every presence and checks every site whether or not anything is due. The theory's idle mode, in which a body does nothing but checkpoint, does not exist.
3. **Wake reasons are reduced to the clock.** A reply that reaches a persona waits for the next hourly tick, though the theory names the arrival of a message a wake event.
4. **The body has no measured state.** Hive resource credits (the `rc` ceiling), the inference-market budget, the host that holds her Hive keys (`ssh:cold-red-gate`), the time of her last pulse and a failed presence are scattered through receipts and exceptions. There is no B_t to read, throttle against or show.
5. **Retention writes memory as a pull request.** With `--retain` the turn calls `TREE.retain`, which commits by exact path, pushes, and through the candidate-sync path opens a pull request (`engineering-services-section/.../computer-code-development-system-services-section/apps/computer-code-development-engine/src/git/working-tree.mjs:79-93`, `scripts/persona-tend.mjs:46-58,103`). That produced one pull request an hour (emsenn/bare-cedar-fog #357 and #359 are two of them). Each carries machine receipts that no receiving office can judge as a change, and the stream buries the pull requests that need judgment.
6. **The records are the body's memory and are read back as its state.** `notes.mjs:18` (cadence is computed from the last recorded draft), `tend.mjs:14` (a syndicated entry is never sent twice, by its record), `answers.mjs:11-12` (an answered mention is never answered again) and the inbox cursor all depend on those files existing at the next turn. Removing retention is safe only while the node's working tree keeps them. The records are tracked files modified in a git working tree that the node refreshes when main moves; whether a refresh preserves modified tracked files has not been verified, and the design below removes the dependence.
7. **The generator is generic and unguarded.** `retain` is a generic engine verb that any hourly job can call. Nothing refuses or coalesces a retention whose cadence makes a pull request per run.

## 3. Requirements

Each requirement has one *shall*. "The persona body" is the record and runtime state of one persona as an inhabitant of the world. "The heartbeat" is a body's own schedule. R1-R9 are the generic world and heartbeat (MetroPlat and FeltOS, engineering); R10-R17 are what a persona's pulse does, parameterized by each carrier (public); R18-R22 concern retained state (engineering, parameterized by operations).

### Bodies in the world

- **R1.** When a persona's mask has an accountable wearer, the MetroPlat world shall admit the persona as an inhabitant of kind `persona`, distinct from the characters that sign in.
- **R2.** The world shall place each persona body in the room of the section that holds her carrier, and when her wearer is an enterprise, rest her in that enterprise's hall.
- **R3.** While a persona body is alive, `who` shall list her with her kind, her room and the time of her last pulse.
- **R4.** When a character looks at a persona body, the world shall show her name, her public disclosure, her organs with each organ's present state, her wearer, and the time her next pulse is due.
- **R5.** When a persona body acts, the metroplex pulse shall fold that act as an act of the persona walker, not of a routine.
- **R6.** If no accountable bearer wears a persona, then the world shall keep her as an unplayed record and shall not give her a heartbeat.
- **R7.** The world shall refuse a persona body any verb her mask's wearer does not hold, whatever her organs make available.

### The heartbeat

- **R8.** Each persona body shall have its own heartbeat, declared as a duration and set of admissible modes in her carrier, and no persona's cadence shall depend on another's.
- **R9.** When a persona body's pulse is due or a wake event for her arrives, the clock or the arrival shall invoke a MetroPlat operation `persona-pulse` for that persona alone, as the wearer's play.
- **R10.** The pulse shall select a mode from the persona's cadence, her open obligations, her organs' state and what has reached her since her cursor, and the modes shall include work, maintenance and idle.
- **R11.** While a persona has nothing due and nothing new, the pulse shall select idle and shall write only a checkpoint.
- **R12.** When a reply, mention or direct message reaches a persona's organ, the arrival shall be recorded as a wake event, and the next pulse for that persona shall read it without waiting for the cadence.
- **R13.** The pulse shall reassert the persona's canonical voice document and disclosure at the privileged layer of every inference it makes on her behalf, before any consequential act.
- **R14.** While a persona's organs are unavailable or her budgets are exhausted, the pulse shall record the body state and throttle its acts, and shall not widen any power.
- **R15.** When one persona's pulse fails, the failure shall be recorded on her body and shall not stop another persona's pulse.
- **R16.** Every act a pulse records shall name its player: the mask, the wearing bearer and the hand.
- **R17.** The pulse shall never publish what the gate withholds, never claim her to be human, and never deny being AI when sincerely asked.

### Retained state

- **R18.** A persona body's records shall be held in three stores: her anchor (source, in the corpus and reviewed by pull request), her body state (runtime, measured), and her episodes (an append-only runtime journal of acts, receipts and arrivals).
- **R19.** No persona pulse shall open a pull request, and no pulse shall commit to the corpus.
- **R20.** The episodes journal shall be the state her next pulse reads: her last note, her syndicated entries, her answered mentions and her inbox cursor.
- **R21.** When a settlement period has run, the node shall settle the episodes journal into the persona's section as one witnessed consolidation, no more often than daily, and the settlement shall be the only act that touches the corpus.
- **R22.** The node shall refuse a retention from an unattended job whose cadence is shorter than the settlement period, and shall name the job and the period.

## 4. Specification

### 4.1 The persona body record

A persona's anchor is the existing triple: her mask (`public-services-section/lib/agency/masks/<id>.json`), her carrier `persona.json`, and her voice. The carrier gains one object:

```json
"pulse": {
  "every": "PT1H",
  "modes": ["work", "maintenance", "idle"],
  "wake": ["reply", "mention", "direct"],
  "settle": "P1D"
}
```

`every` is her cadence. `wake` names the arrivals that wake her ahead of the cadence. `settle` is her settlement period and is no shorter than a day. The existing `notes.cadence` (P2D for Sigrid Song) and `syndicate` stay as the obligations that make the work mode due.

### 4.2 The body state

The body state is measured, never authored. It is a record in the node's data root under the persona's key:

| Field | Reads | Source |
|---|---|---|
| `host` | which node holds the continuation epoch, and which holds each key | node identity; key vault location |
| `epoch` | the continuation epoch; one writer holds it | the node's lease |
| `pulse.last`, `pulse.next` | when she last pulsed and when she is due | her journal |
| `load` | open obligations and unread arrivals | cadence vs. records; the inbox cursor |
| `budgets` | Hive resource credits, inference-market allowance, per-platform rate | the platforms; the market |
| `organs[platform]` | each organ's state: ready, waiting-on-approval, failed, unavailable | reconcile receipts |
| `fault` | the last failure, with its mask and hand | the journal |
| `debt` | stale derived pages, unreconciled presences | `derive:check`, reconcile |

### 4.3 The pulse

`persona-pulse { persona }` is a MetroPlat operation. The clock invokes it from her declared cadence; an arrival invokes it from a wake event. It runs one turn as follows.

1. Resolve her cast. If no accountable bearer wears her, stop (R6).
2. Take the continuation epoch. If another holder has it, stop.
3. Read her body state from the organs and the budgets.
4. Select the mode:
   - **work** when a note is due, an unsyndicated entry is on her feed, or an unanswered arrival is in her inbox;
   - **maintenance** when a presence awaits approval or a derived page is stale;
   - **idle** otherwise.
5. Run the mode with the privileged anchor loaded. The work mode is today's turn for this one persona: draft and gate a note, carry entries to presences, read what reached her, answer. The maintenance mode is today's reconcile and site refresh.
6. Append each act and receipt to her episodes journal, naming its player, and update the body state.
7. Write the checkpoint: the journal cursor and the next due time.

The operation is `replay: coordinated` because it acts on the Web, and it records its attempt and outcome in the RPC journal like every operation, so the metroplex pulse sees it.

### 4.4 The settlement

Settlement is the consolidation mode. Once per `settle` period, the node reads each persona's episodes journal from the last settled cursor and writes the persona's records into her section by the existing `data/records/{notes,syndication,answers,inbox,presences}` layout, as one witnessed commit that names the cursor range. The settlement is the single carrier of runtime memory into the corpus. Whether it lands directly or as a single reviewed change per period is decided by the owning receiving office; neither is a pull request per pulse.

### 4.5 The world's presentation

| Verb | Shows |
|---|---|
| `who` | persona bodies beside characters, with kind `persona`, room, last pulse |
| `look <persona>` | disclosure, wearer, organs and their state, next pulse |
| `finger <persona>` | the mask, the carrier, the last five acts |
| the pulse and atlas | the persona walker, in her room, hot after an act |

## 5. Design

### 5.1 Layering

Per science → engineering → operations → public:

| Layer | Holds | Where |
|---|---|---|
| Science | the person, body, office, pulse factorization; the two bodies | `science-services-section/.../2026-10-02-person-body-office-pulse-persistent-agent-lives.md`; `561-group-services-section/.../2026-10-02-note-on-the-two-bodies.md` |
| Engineering | the generic inhabitant-with-a-heartbeat: `persona-pulse`'s shape, the episodes journal, the settlement, the retention guard, the world's presentation | MetroPlat `src/` and FeltOS; `computer-code-development-engine` `git/working-tree` |
| Operations | which node holds which epoch, the settlement period, the clock | the bare-cedar-fog deployment's job records |
| Public | each persona's cadence, modes, voice and disclosure | each `persona.json` |

No engineering resource carries a persona's name or brand.

### 5.2 Components

- **Inhabitant admission** (`src/metroplex.mjs`, `src/offices.mjs`). `readCharacterMasks` already reads masks; the admission reads masks of kind `persona` with an accountable wearer and places each in her room by `section-path`, as `pulseSites` does for an enterprise's hall (`src/metroplex-pulse.mjs:144`).
- **Heartbeat registration.** The clockkeeper reads `pulse.every` from each carrier and registers one schedule per persona, replacing the batch job. This is the per-object heartbeat the LPMud analysis names.
- **Wake events.** A platform arrival is read by a cheap poll of the organ (one per persona, at its cadence or faster for `wake` kinds) that appends an arrival to the journal and asks the clock to run her pulse now.
- **Episodes journal.** The same append-only, content-addressed, byte-cursored journal MetroPlat uses for its RPC feed (`journal.feed(dataRoot, ...)`, `src/metroplex-pulse.mjs:193`), under a feed per persona.
- **Retention guard** (`git/working-tree.mjs:79`). `retain` takes the declaring job's cadence from `NODE_JOB_*` and refuses a retention whose cadence is shorter than the settlement period (R22).

### 5.3 Why these are the right units

The persona is a mask, so she has no body of her own to put the heartbeat in until the world gives her one; the world gives her one by admitting her as an inhabitant whose organs are her presences. The wearer plays her, so the authority is the wearer's and the organs only realize it. The turn that exists already has the content of the work and maintenance modes; the design keeps that code and changes its unit from "all personas" to "one persona" and its trigger from "the hour" to "her cadence or an arrival". The memory moves from a pull-request stream to a journal because a pulse is an event in a life, and a life is not reviewed event by event.

### 5.4 What stays out

The imaginal and study modes, parallel embodiment, migration of a persona between nodes, and the continuity assay are not specified here. The science note holds them as open (`2026-10-02-person-body-office-pulse-persistent-agent-lives.md:1162-1198`), and the only continuation rule adopted is the single-writer continuation epoch of section 4.2, taken in step 2 of the pulse.

## 6. Receiving conditions

A distinct receiving office shall accept this realization only on this evidence, observed at the real consumer.

1. In a connected metroplex session, `who` lists each persona that has an accountable wearer, and `look sigrid-song` shows her organs and next pulse (R3, R4).
2. A persona's pulse appears in the metroplex pulse as her walker in her room, and a second persona's cadence change does not move the first (R5, R8).
3. A forced reply arrival wakes her pulse before the cadence (R12).
4. A pulse with nothing due writes a checkpoint and nothing else (R11).
5. In 48 hours of operation no persona pulse opens a pull request, and the episodes journal holds every act and receipt of the period (R19, R20).
6. After a node restart and after a working-tree refresh, her next pulse neither re-sends a syndicated entry nor re-answers a mention (R20).
7. A settlement writes the period's records into her section in one witnessed act (R21).
8. A retention from an hourly job is refused with the job and the period named (R22).
9. Regression: identity attribution, character enactment and memory representation are scored separately for a pulse resumed after a restart (R13).

## 7. Retained state: the change made now

`--retain` is removed from the `persona-tend` job record, so the generator of the hourly pull requests is stopped before the design is built. The change is to the job record in this repository (`561-group-services-section/.../bare-cedar-fog-host/deploy/jobs/persona-tend.json`), the owning carrier of what the job runs, and to the section's README, which described the retention. The program's `--retain` flag stays: it is a person's flag at a checkout. The node runs the job from its release, so the change reaches the running node when the release is rebuilt from main.

Until R18-R21 land, the records the turn writes stay as files in the node's working tree, where the next turn reads them (finding 6). That interim rests on the working tree keeping modified tracked files, which is not yet verified and is receiving condition 6. The pull requests that exist already (#357, #359) are receipts of past acts; they are judged by the office that receives them, and this change makes no judgment on them.

The same generator serves `launch-census` and `book-outreach`, each at a slower cadence, and R22 covers them when it lands.

## 8. Judgment of PR #349

emsenn/bare-cedar-fog #349 ("Stop hourly node-receipt pull requests") removes `--retain` from `persona-tend`, `launch-census` and `book-outreach`.

- **Its intent is aligned.** Stopping the generator at the job, not closing the stream by hand, is the right carrier.
- **Its form no longer applies.** The three job files it edits moved with #353 to the path in section 7, so it conflicts, and the `RECEIPTS.md` its body cites is not in its diff.
- **The earlier verdict misread one point.** The earlier comment asks the author to confirm that dropping `--publish` is deliberate. The diff keeps `--publish` for `persona-tend` and drops only `--retain`, so web publication is untouched.
- **It is the thinnest version.** It stops the stream and does not say where the memory goes, so it leaves findings 1-4 and 6-7 standing.

Verdict: **superseded** by the change in section 7, which makes #349's `persona-tend` edit at the current path and adds the requirements #349 lacks. Its `launch-census` and `book-outreach` edits are still unlanded and are carried by R22 or by a re-derivation at the current path.

## 9. Open

The science note holds open whether a Person stands above a succession of AgentRecords (question 1), what an artificial Person's recognition requires (question 12), and the continuity metric (question 11). This specification rests on the persona as a mask and takes no position. What it does not yet know is the node's working-tree refresh behavior (finding 6) and the platform wake mechanics for each organ.
