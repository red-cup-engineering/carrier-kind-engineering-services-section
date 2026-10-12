<!-- Provenance: wave-1 ultracode output (workflow computer-as-real-computer-spec, 31 agents). The normative spec; structured waist/featureMap/buildWaves/openQuestions captured at the foot. Companion to computer-architecture.md (L0-L9) and the language-cones journal. -->

# @561-group/computer — A Real Computer on a Paraconsistent-Linear-Aperiodic Substrate

**Status:** Normative specification (final). RFC-2119 keywords (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY) carry their RFC-2119 meaning. This document specifies what `@561-group/computer` is as a *real computer* — the features a computer is expected to present (processes, files, memory, I/O, IPC, identity, a shell, networking, boot/introspection) AND the operational substrate a computer cannot run without (durability, atomicity, access enforcement, peer authentication, termination, resource bounds) — rederived so none re-imports the clock, the single heap, last-write-wins, or the FOUR→2 collapse. It is the artifact the build executes against.

This spec states facts the codebase already realizes (cited `path:line`) apart from facts it PROPOSES (marked PROPOSED). It does not treat file-header comments as settled; it flags internal inconsistencies inline as **⚠** and resolves each with a decision. Every cited line below was re-verified against source during this revision.

---

## 0. The one sentence

> Everything is a **charged predication** appended **durably and atomically** to an **append-only trace** addressed by a **typed path**; every read is a **fold to a fixed-point cone**; every tile is a **Chu transform** between cones; access is checked **at the membrane**; the boolean/byte world appears **only at the outermost edge**, by projecting a cone to a verdict.

A "real computer" here is NOT "the same features as Unix." It is the features a computer is expected to present, rederived so that none re-imports the four amputations that make the von-Neumann shadow (journal `2026-06-04`:152-161): (1) the FOUR→2 truth-projection, (2) the clock/period, (3) the single flat heap, (4) winner-takes-all on conflict. Unix is the **degenerate shadow** this machine casts on purpose, at the edge, when it must act. **But the operational substrate beneath the epistemics — durable append, atomic write, access enforcement, peer trust, bounded resources, defined termination — is not optional philosophy; a machine that flattens-correctly yet loses data on crash, enforces no permissions, and trusts every peer is not yet a real computer.** §1.5 and Wave 0 make that substrate normative and FIRST.

---

## 1. The architectural laws (the acceptance test for every change)

These are derived from the journals and the architecture note (`computer-architecture.md` §1) and are NORMATIVE. Every conformant component MUST satisfy all of them.

**L1 — The atom is a charge, never a boolean.** A value MUST be `value=[believesTrue, believesFalse]` over a lossless evidence carrier `[posWitnesses, negWitnesses]`, read as the Belnap–Dunn FOUR bilattice `t / f / ⊥ / ⊤` (journal §1). Operations MUST act bitwise on the pair; nothing MUST crush it to one bit before the edge. A boolean MUST be obtained only as a read-time projection onto the truth order (`compute in knowledge; decide in truth`).

**L2 — Evidence is linear.** Witnesses MUST be unioned on the fold and MUST NOT be silently dropped or freely duplicated. Re-rolling a value as a bare `{pos,neg}` or a single boolean, and overwriting in place, are the two named regressions and are FORBIDDEN below the edge (journal §2:64-66).

**L3 — The world is its append-only folded trace.** State MUST be an append-only trace of `{e,a,v,t}` rows; the current value MUST be the *fold* of the trace; the functional/latest-`t` lens (`supersede`) MUST be a read-time projection, NEVER a destructive write (`substrate.mjs:170`). An "update" MUST append counter-evidence (the converse predication); a "delete" MUST append a retraction tombstone (`v:null`), never an `unlink`/overwrite/`Map.delete`.

**L4 — ⊤ is held; ⊥ is first-class.** A cell told both a predicate and its converse MUST settle to ⊤ and MUST be KEPT with both witnesses (`substrate.mjs:section()` ⊤-bucket). ⊤ MUST NOT be treated as an error, folded into denial, or reconciled to a winner. ⊥ (no evidence) MUST be distinct from `f` (denied) at every layer below the edge. No decision read MAY invent a winner on a balanced ⊤ (L4a).

**L4a — A balanced ⊤ is a tie, never a winner.** Every decision/projection read (`adjudicate`, `can`/`may`, `exitStatus`, `peerLiveness`, `render`) MUST distinguish a supported side from a *balanced* ⊤ (equal support on both faces) and MUST surface the balanced case as an explicit `tie`, carrying BOTH witness sets. "Pick the supported side" MUST NEVER silently become "pick a side." The collapse to a one-sided verdict is opt-in, takes an explicit `onTie`/`onTop` policy parameter, and lives only at the act-edge.

**L5 — Address = type = name = location, one act.** The directory tree IS the type language: `library/X` = object/term, bare `X` = morphism, `hacking/X` = admitted-without-derivation, and `/hacking/` depth = open-derivation depth (TRC README; journal §4). A handle MUST be a typed path, never a recycled integer (fd/pid/uid).

**L6 — Routing is conformance.** A kind MUST be reached only by restriction (a MUST predicate) and structure affixed only by extension; each node owns its `restrict.mjs`; routing a path to its deepest inhabited kind IS validating it (TRC README).

**L7 — The runtime settles, it does not tick.** Advance MUST be by Knaster–Tarski least-fixed-point closure, monotone in knowledge. A "tick" MUST be a transaction boundary, not a heartbeat (journal §3). No wall-clock MAY drive execution; `Date.now()` MUST NOT be a default `t`/`now`. Wall-clock MAY enter only as DATA (L7a), never as a driver or default ordering coordinate.

**L7a — Three time roles, kept distinct.** (1) `t` (the witness-ordering coordinate) MUST be logical — a monotone transaction counter from `now(world)→tx` (§1.5), never `new Date()` by default. (2) Wall-clock-as-data (a timestamp a caller wants recorded) MUST enter only as an explicitly-witnessed row, never the default `t`. (3) A future-scheduled action MUST be an appended intent carrying a logical deadline, read at settle — never a `setInterval`/`setTimeout` that drives the loop. Expiry/caveat/auth-decay/rate-limit MUST decay against a caller-supplied logical `now`, exactly as `authenticated` already does.

**L8 — Content is identity via one jcs.** Identity MUST be `sha256(jcs(value))` with exactly one RFC-8785 canonicalizer (the `./json` export). `JSON.stringify` MUST NOT be used for identity. On-disk persisted bytes MUST also be the canonical `jcs` form, not `JSON.stringify` (L8a) — see ⚠ in §1.5.

**L9 — The error channel is the FOUR face, not a throw.** A primitive MUST NOT throw for a domain condition and MUST NOT return a bare `ok|err`. It MUST return a charge/cone whose face IS the error channel: `⊥` = no evidence (ENOENT), `f` = denied-with-witnesses (EACCES), `⊤` = held contradiction (the new capability), `t` = done. The collapse to a one-sided verdict MUST happen in exactly one place — `adjudicate` at the act-edge — and `adjudicate` MUST itself stay FOUR-valued (L9a). Throwing is RESERVED for programmer/shape-contract errors (`assertRow`/`assertDatom`/empty-term).

**L9a — `adjudicate` is FOUR-valued; the boolean is a separate, parameterized edge.** `adjudicate(cone)` MUST return `{verdict: FOUR, supported, witnesses, tie}` — NOT a bare `Result<T,Charge>`. The further collapse to `Result<T,Charge>` is a SEPARATE projector `commit(adjudication, {onTie, onTop})` whose `err` MUST carry BOTH witness sets. A `Result<T,Charge>` with no stated `onTie`/`onTop` policy is non-conformant: it is last-write-wins reborn at the keystone.

**L9b — The fault witness is structured.** A `⊥`/`f`/`⊤` charge crossing the membrane MUST carry a structured reason payload (a `condition` tag plus witnesses) sufficient to branch on fault class — absent vs denied vs contended vs resource-exhausted vs not-a-directory vs loop vs timed-out. The FOUR face is the *channel*; the carried witness is the *errno-equivalent*.

**L10 — Federation is the tensor ∥, gated by trust.** Merge MUST be a G-Set union by content-id + re-fold, with no coordinator and no clock; disagreement MUST be absorbed as ⊤ with both witnesses, never last-writer-wins. A peer's rows MUST enter only at the standing that peer earned (L10a).

**L10a — Federation admission control.** `admitLog`/`federate` MUST verify each incoming row's witness provenance (a signed witness mapping to a recognized principal) before union. An unverified/unrecognized row MUST enter at ⊥ standing (held, inert) or be rejected with a recorded `f`, never silently folded as fact. `adjudicate` MUST weight evidence by witness-trust so a flood of unrecognized witnesses cannot force ⊤. The local `enqueue` trust-funnel and the network `admitLog` trust-gate are the SAME admission discipline at two membranes.

**L11 — Math never imports computer.** `@561-group/math` MUST be imported by name; nothing here MUST re-implement FOUR, the charge ops, the Chu machinery, or the descent. A truth-LFP/GFP closure MUST be obtained from `math/bilattice/cone` (over a lifted category — §1.4), NOT re-derived in `computer/`.

**L12 — The cone is the boundary currency.** Below the outermost edge, the value handed between tiles MUST be a cone (`sectionSpace`), never a flat `{affirmed,denied,contradicted}`. `section`/`render` is the ONLY place evidence MAY collapse, and only at the edge. The cone MUST be the LITERAL return of `read` and `settleProcess` (L12a), not an additive carry alongside a flat primary return.

**L13 — The membrane enforces access.** Every membrane call that touches the trace (`read`, `append`, `witness`, `resolve`) MUST accept the acting `principal`/capability and MUST consult `can`/`may` at the membrane. The FOUR→act projection for access: `t` admit, `f` deny-with-witness, `⊥` no-basis (deny, ENOENT-class), `⊤` contested — HELD (the membrane returns the ⊤ charge; default act-edge policy is deny-but-surface, never silent admit nor silent deny).

---

## 1.4 The descent-category shape bridge (a verified Wave-1 obligation, not a hookup)

⚠ **VERIFIED SHAPE GAP (blocker if ignored).** The four cone generators `settle`/`brim`/`adjudicate`/`presume` in `math/bilattice/cone.mjs:42,60,77` operate on a **descent category** — `{ presheaf, traces:[{ valuations:[{ base, "fiber-algebras":[…] }] }] }` — iterating `possibilizeTruth ∘ necessitateTruth` (cone.mjs:65). The computer substrate (`substrate.mjs`) folds with `joinKnowledge` directly and its cone is a `chuSpace` whose shape is `{ folded:{ entity, fiber:[{predicate,object,value:{pos,neg,evidence}}] }, space }` (`sectionSpace`). **There is NO adapter from `folded`/`sectionSpace` to a descent category.** Therefore "wire `adjudicate` as the eavt/datom decision read" is NOT a hookup; it is a shape-bridge build.

**Resolution (NORMATIVE, Wave 1):** introduce a named, tested adapter `foldedToCategory(folded, rows) → category` lifting the substrate's folded fiber + witnessing rows into the descent category, AND a conformance test proving `category → adjudicate → section` equals a substrate-native truth-LFP on representative cells (the contested/⊤ case MUST be pinned). The closure itself MUST come from `math/bilattice/cone` (L11). Until `foldedToCategory` exists and passes, the `adjudicate`/`brim`/`presume` reads are NOT buildable and Wave 1 is not complete.

## 1.5 The operational substrate (durable, atomic, bounded — Wave 0, normative)

The single write membrane today is `append.mjs`: `mkdirSync(dirname(path),{recursive:true}); appendFileSync(path, JSON.stringify(row)+"\n")` — **verified**. NO fsync, NO atomic temp-rename, NO advisory lock, persists `JSON.stringify` (not `jcs`). The whole "append-only never loses a witness" guarantee currently rests on this.

**OP1 — Durability.** `append` MUST define crash-consistency: `fsync`/`fdatasync` before reporting success, or a documented relaxed mode with an explicit durability face in the cone. Default MUST be durable.

**OP2 — Write atomicity & concurrent-writer safety.** Concurrent appends MUST NOT interleave into corrupt JSONL: one of (a) single-writer discipline (the loop/request-queue), (b) `O_APPEND` atomicity with a max-row size, (c) an advisory lockfile. The mechanism MUST be stated per log root.

**OP3 — Torn-line recovery.** The read membrane MUST tolerate a torn final line from a crash mid-append: skip/repair, never propagate a parse throw.

**OP4 — Canonical on-disk bytes (L8a).** Persisted rows MUST be written via `jcs`, not `JSON.stringify`. ⚠ `append.mjs` violates this.

**OP5 — Resource bounds & admission control.** Define a bounded `request-queue` with an explicit rejection cone (`f`, resource-exhausted) when full; a subscriber cap on `carrier` hubs; trace snapshot/compaction (fold-to-snapshot that ARCHIVES, never deletes). "No backpressure" (CALM) MUST be paired with admission control at the edge or it is an OOM hole.

**OP6 — Termination of settle.** ⚠ **VERIFIED:** `settleProcess` (`process.mjs:80,88`) is a bounded `for(step<maxFolds=1024)` loop that **silently returns the last board** on non-convergence — a hidden timeout. The lattice height bounds the monotone closure (convergence within `N=lattice-height` for a monotone derive); `maxFolds` guards only a non-monotone derive (a law violation). On the cap, `settle` MUST surface a saturation/residue `⊥` cone (a held `precipitate`), NEVER silently the last board.

**OP7 — Clean shutdown & idle.** The append-driven loop MUST block on next-append when quiescent (no spin/poll-tick). A `shutdown` morphism MUST drain queues → flush/fsync → checkpoint → halt. A quiesced process's wakeup is the appended intent itself, not a poll.

---

## 2. The object model — what each thing IS

The machine has exactly **one** state object: a set of `{e,a,v,t}` rows (the trace), each carrying a charge over a lossless evidence carrier. Every classical object is a **read-lens** (a named fold). The named filetypes `datom{e,a,v,tx,op} → eavt{e,a,v,t} → triple{s,p,o}` are forgetful PROJECTIONS of one predication carrier (`triple.mjs:3-7`), reached by projection, never by a constructor that drops a witness.

### 2.1 A memory-cell IS a settled `(subject, predicate, object)` cell
- **Address** = a typed path via `address(root, term, type)` (TFAS).
- **Value** = the charge `fold` settles via `joinKnowledge` (evidence unioned, ⊤ held).
- **poke** = append a positive predication. **Update** = append the converse. **free** = append a retraction tombstone (`v:null`) keeping every witness.
- **peek** = fold to the cone. **seek/as-of** = fold the `t' ≤ T` prefix (`readAsOf`).
- NO mutable cursor, NO fd table. The typed path IS the durable handle. A poke/free is durable per OP1 only after `append` reports success.

### 2.2 A file IS a typed path whose folded trace is its content; its TYPE is where it sits in the tree
- **open** = articulate the path: route through `witness`, `stat` into a charged scott category. `⊥` = names nothing yet; `⊤` = conforms two kinds, HELD.
- **unlink/rename/link/symlink** MUST be append-only: unlink = converse on the existence cell; rename = bind the same content-identity to a new coordinate; hardlink = dual-filing (TTMS `writeDual`); symlink = a path-valued cell resolved by re-running `witness`. No `unlinkSync` ever.
- **cwd & relative resolution (PROPOSED, §4.2):** a non-rooted term resolves against the session cwd; the `.`/`..` policy is decided in Wave 0/10 (TFAS `hygiene` ESCAPES `..` today — that decision determines navigable-FS vs flat-keyed-store).
- **Blob/binary content (PROPOSED, §4.4):** a non-EAVT regular file's CONTENT is a content-addressed leaf OUTSIDE the predication model (a `sha256(jcs)`-named blob the trace references), not encoded as predication rows. `readText` is the read-only escape today.

### 2.3 A process IS a settling — a language cone over its own readiness diagram
- **PID** = its content/typed-path address `processes/<modal>/<id>`, never a recycled integer.
- **run** = `settleProcess`: Knaster–Tarski iteration to a least fixed point, no clock (`process.mjs:77-118`); quiescence = the section stops moving; non-convergence = a held residue (OP6).
- **exit status** = the FOUR composite (`process.mjs:112-117`: `t`/`f`/`⊥`/`⊤`), witnesses kept, a balanced ⊤ a tie (L4a). NEVER an 8-bit code.
- **load/exec (PROPOSED, §4.1):** a program binds via `opts.derive`; `exec(proc, program)` sets the derive strategy (a horsetail form or a tile pipeline). "Running" IS iterating that derive to a fixed point.
- **inheritance (PROPOSED, §4.1):** `spawn` MUST define what the child inherits (env/cwd/principal/caps/cursors copied vs shared vs federated-on-exit) and how the child trace merges back (the join).
- **wait/join** = settle this process + its `afterSet` predecessors to fixed points, then harvest the composite.
- **kill/cancel** = append counter-evidence (folds to denied/⊤). **reap** = read the precipitate residue and re-enqueue.
- **process group/session** = a modal sub-world.
- **blocking/waking (PROPOSED):** a quiesced process is re-driven by the APPEND of a new relevant row (the intent IS the wakeup), never a poll. `would-block`/`EAGAIN` is the `⊥` residue face.

### 2.4 An identity IS the recognition graph read as a Chu space
- A principal exists exactly insofar as evidence names it — no uid, no `/etc/passwd`.
- **recognize/dispute** append to the same cell; a contested name holds at ⊤ with both witnesses.
- **groups/roles** are derived (folded `recognize`), never a stored table.
- **permission** (`can`/`may`) is FOUR-valued; the boolean gate is taken only at the act-edge; consulted AT THE MEMBRANE (L13).
- **authentication** is a continuous fold, no session bit: standing recomputed at act-time, decays via caller-supplied `opts.now`.
- **accountability (H⁰):** "principal narrows, accountable stays apex" MUST be MECHANICALLY ENFORCED (§4.6).

### 2.5 A stream IS a charged-cell channel — three frames of one trace
- **stdin** = the append face; **stdout** = the settle/knowledge face (holds ⊤ as a first-class `top` event); **stderr** = the void/gap cone (open obligations, held, replayable), not out-of-band text.
- **EOF** = "no rows with `t' ≤ cursor` beyond here" — a cursor fact.
- **Backpressure** = demand as as-of cursors; the writer only appends (CALM) — paired with admission control (OP5).
- **TTY/blob (PROPOSED, §4.4):** interactive bytes (raw/canonical, `^D`→EOF-as-cursor-fact, `^C`→an appended signal intent) and binary blobs ride the blob membrane, not the predication frames.

### 2.6 A channel (IPC) IS cone-passing
- A "message" is an immutable content-addressed set of rows. **send** = `admitLog` (gated, L10a); **recv** = `federate` + re-fold. Idempotent/commutative/associative — a delta-state CRDT. No ordering/acks/consensus.
- A value walks by `migrate`: same sha256 ⇒ same identity ⇒ no transfer protocol.
- A **signal** is the void-cone gap: unsettled cells ARE the wakeup set, pull not push, re-armed by append.
- No backpressure / no delivery-ack is a stated PROPERTY (§10), not a bug.

---

## 3. The thin syscall waist (the centerpiece)

⚠ **The draft's 14 calls were NOT minimal:** three were append-flavored (`append`/`enqueue`/`federate` all reduce to one monotone G-Set admission); two were edge-projectors (`adjudicate`/`render`) when the thesis demands ONE edge; `advance`/`precipitate` were views of one settle-to-quiescence; `relate`/`relateFrom` are pure library queries returning flat arrays (an L12 violation). The waist is tightened to **a ~10-call orthogonal basis**, each on ONE owning tile, each returning a cone, none derivable from the others.

**Orthogonality criterion (stated):** two waist calls are orthogonal iff neither is expressible as a composition of the others AND each is owned by exactly one tile.

| # | Call | Shape | What it is | Owning tile | Status |
|---|---|---|---|---|---|
| 1 | `resolve` | `(root, term, type, {principal?}) → Cone<Handle>` | **open**: term → typed-path handle; `⊥` unroutable/absent-type, `⊤` two-kinds, `f` denied; access-checked | TFAS | partial (today `address()` returns a bare string; throws on empty type — must be ⊥) |
| 2 | `witness` | `(handle, {principal?}) → Cone<Kind>` | **stat/fstat + byte-read-descent**: deepest inhabited kind + epistemic depth; the ONLY `node:fs` touch; durable/atomic/torn-tolerant | posix-holography | partial (throws on a path naming nothing; MUST return ⊥) |
| 3 | `read` | `(handle, {asOf?, frame?='settle', principal?}) → Cone<Section>` | **read/seek (memory peek)**: fold the trace to a CONE in the frame; returns the cone LITERALLY (L12a) | TTMS → substrate | partial (default returns flat `section`) |
| 4 | `append` | `(handle, predication, {validate?, source?, principal?, durable?=true}) → Cone<TxWitness>` | **the ONE write funnel**: monotone G-Set admission; `validate` = local trust mode (was `enqueue`); `source` = peer-merge mode; update=converse, delete=tombstone; durable per OP1; colliding writes fold to ⊤ | TTMS → posix-holography membrane | partial (returns string; positive-only; no durability/lock/tombstone) |
| 5 | `adjudicate` | `(cone, {onTie?, onTop?}) → Adjudication` | **THE decision edge**: knowledge-cone → FOUR-valued truth verdict `{verdict,supported,witnesses,tie}` (L9a); `commit({onTie,onTop})` is the SEPARATE one-sided collapse | substrate (over `foldedToCategory` → math `cone`) | **missing** (needs the §1.4 bridge) |
| 6 | `spawn` | `(world, principal, accountable, {inherit?}) → Cone<Process>` | **fork**: allocate at a modal-world path; PID = typed-path; H⁰ enforced; `inherit` = COPY/SHARE/FEDERATE rule | process-runtime | partial (`allocateProcess` places, not creates; no cone; no inherit) |
| 7 | `settle` | `(world, id, {derive?}) → Cone<Process>` | **exec/wait**: settle to LFP; wait = quiescence; saturation = a held residue `⊥` cone (OP6); the `⊥`/`⊤` face IS the residue/EAGAIN (so `precipitate` is a read-FACE); `derive` = the loaded program | process-runtime | exists (primary return MUST become the cone) |
| 8 | `project` | `(rows, schema?) → Cone<Event[]>` | **notify/poll**: trace-delta → topic-tagged events; `⊤` → held `top` event; charge survives for ALL events; schema is a PARAMETER | event-projection | partial (flat for all but `top`) |
| 9 | `federate` | `(local, remote, {trust}) → Cone<Section>` | **network fork-merge**: G-Set union + re-fold; `⊤` on conflict; admission-gated (L10a). Retained as its own call (a distinct trust-gate+re-fold membrane) | distribution | exists (MUST add the L10a gate) |
| 10 | `render` | `(cone, {commit, onTop}) → WireFrame` | **the boolean/byte collapse, edge-only**: serialize a charge carrying evidence + the `⊤` marker; a `⊤` MUST show a visible contradiction marker by DEFAULT (L4a); collapse-to-supported is opt-in | carrier + shp | partial (`section` leaks past the edge; default hides one side of ⊤) |

**DEMOTED out of the waist (with derives-from):**
- `advance` → internal scheduler driver (`#`-import). *Derives-from:* a fold of `settle` over the world. Its `Board` MUST keep the per-process `settled` cones (it already carries `settled` — `orchestration.mjs:108`), a non-disjoint dashboard lens, never the value handed to the next pass.
- `precipitate` → the `⊥`/`⊤` read-FACE of `settle`'s cone. *Derives-from:* reading `settle`'s residue. ⚠ Verified already used in `cost.mjs:21,156` and `orchestration.mjs:124` — NOT first-use; the unbuilt part is RE-DRIVING the residue into layer N+1 (`growTower`).
- `enqueue` → `append({validate})` mode. *Derives-from:* `append` behind a validate policy. ⚠ Verified: `request-queue` returns `intent|null`, not a cone, no in-tree consumer; readmit only with a draining consumer and a bounded depth (OP5).
- `relate`/`relateFrom` → substrate library functions (the `/substrate` barrel). *Derives-from:* a pure query over read output. ⚠ Verified: `relate(rows, predicate, object)` returns `string[]` from `rows[]` (`substrate.mjs:72,85`) — a flat array crossing a boundary, an L12 violation if kept in the waist.

**Tile-ownership correction:** TFAS owns `resolve` (it IS `address()`); posix-holography owns `witness` (the single `node:fs` touch, absorbing the byte-descent) and is the durable/atomic `append` membrane (OP1-4); TTMS owns the `read`/`append` term-log peek/poke logic; substrate owns `adjudicate` + the fold algebra; process-runtime owns `spawn`/`settle`; event-projection owns `project`; distribution owns `federate`; carrier+shp own `render`. ⚠ The draft credited posix-holography with `resolve`/`read`/`append` whose real code lives in TFAS and TTMS — corrected.

**The rhythm:** `append → settle → project → render → block-on-next-append`. No timer drives it; quiescence blocks (OP7). "A tick is a transaction boundary."

### 3.1 The error/Result discipline (L9/L9a/L9b)
Every primitive MUST return a cone whose FOUR face carries the failure with a STRUCTURED reason (L9b): `⊥`=ENOENT-class, `f`=EACCES/resource-class (with a `condition` tag distinguishing `ENOSPC`/`EMFILE`/`ENOTDIR`/`ELOOP`/`ETIMEDOUT`/`ECONNREFUSED`/`EEXIST`…), `⊤`=held, `t`=done. `adjudicate` stays FOUR-valued (L9a); the one-sided `commit` is the ONLY `ok|err` site, carrying both witness sets. ⚠ Presently violated everywhere (read/write/stat throw on missing/unclassifiable; `eavt-append` `mkdirSync` can throw; `asName`/`allocateProcess`/`capabilityValue` throw `TypeError` for runtime conditions; `neverthrow` not a dependency). Wave 2.

---

## 4. The feature set mapped to a real computer's expectations

### 4.1 Process model & lifecycle
A process IS a settling; PID is its typed-path; exit is the FOUR composite; the scheduler is settle-to-quiescence. EXISTS: `settleProcess`, `settleProcesses`, `advanceProcesses`, `precipitateUnsettled` (verified used), `allocateProcess`, `dispatchProcess`/`executeProcess`, `orderProcess`/`accessibleFrom`/`afterSet`, `governAction`, `conserveEvidence`. MISSING/PROPOSED: `exec`/program-loading; a process-inheritance morphism; `joinProcess`/`wait`; `cancelProcess` (no kill/signal/abort exists — grep confirms zero); `signalProcess`; process group/session; a canonical `exitStatus` with a `tie`; suspend/resume in settling; init/PID-1 owning reaping + orphan adoption; the append-triggered wakeup. SHADOW RISKS: a kill as destructive write or status-field mutation; collapsing FOUR exit to 8-bit/boolean OR inventing a winner on a balanced ⊤; a heartbeat loop driver; a recycled-int PID; SIGKILL winner-takes-all; reaping that drops the residue; a busy-poll wakeup. ⚠ VERIFIED: `dispatch.mjs:21` defaults `stamp` to `new Date().toISOString()` (clock leak; Wave-1 guard + caller `opts.t`). ⚠ VERIFIED: `deriveProcessState` returns `dispatchedTo`/`executionState` as bare last-writer scalars (`dispatch.mjs:87-88`) — a contested status loses its ⊤; MUST become cone-valued IN WAVE 1 and MUST NOT be the basis for any act until then. ⚠ VERIFIED: `maxFolds=1024` silent stop (`process.mjs:80,88`) — resolved by OP6.

### 4.2 Filesystem & namespace
A file IS a typed path whose folded trace is its content. EXISTS: `stat`, `readDirectory`/`writeDirectory` (not in `exports`), `read`/`write` descent, `readText`, `eavt-append`/`eavt-read`, the fold algebra, TFAS codec + `hygiene`, TTMS dual-filing. MISSING: durable/atomic/lock-safe append (OP1-4); `unlink`/`rm`/`rmdir`/`rename`/`link`/`symlink`; symlink/fifo/socket/device decomposition (`witness.mjs:14-15`); public `list`/`mkdir`; a change-stream; `mount`/graft; the access check at the membrane (L13); cwd + relative/`..` resolution; the blob/binary content membrane; chmod/chown-as-data. SHADOW RISKS: `unlinkSync`/`rmSync`/`renameSync`; a boolean `exists()`/`access()`; an fd/cursor; raw `mode&0o7777` as the access answer; rename/link picking a winner (today `realizing.mjs`/`scaffolding.mjs` THROW on an existing path — safe but throwing is the explosion reflex; the substrate read is hold ⊤). ⚠ VERIFIED: `ttmsWrite` defaults `opts.t` to wall-clock (`write.mjs:16`).

### 4.3 Memory & addressing
ONE memory object: the append-only EAVT trace; the current value is the FOLD. EXISTS: `address`, `ttmsWrite`/`writeDual` (poke), `ttmsRead`/`fold`/`settle`/`readAsOf` (peek), `witnessOf` (provenance), `relate`/`relateFrom` (deref), `rowId`/`dedupe`/`jcs`, the tombstone (honored in `fold`'s `opts.retract`). MISSING/PROPOSED: a unified `allocate`/`poke`/`peek`/`free`/`deref`/`enumerate`/`provenance`/`decide` vocabulary; an `enumerate` (readdir of typed memory); trace snapshot/compaction (OP5); modal worlds as a derived allocation calculus (journal §5 self-flagged inference). ⚠ VERIFIED: `ttmsWrite` is positive-only (`write.mjs:6-8`) — a `retract(root,term,key)` morphism is missing. SHADOW RISKS: `datom.currentValue` as the default memory read; `supersede` baked in; a `free` as deletion; a flat single log per root (single heap); `peek` returning a flat `{pos,neg}`/boolean.

### 4.4 I/O & streams
A stream IS a charged-cell channel; three frames of one trace; binary/interactive bytes ride the blob membrane. EXISTS: `eavt-append`/`eavt-read`, `projectEvents` (`⊤`→`top`), `createSseHub`/`sseFrame`, `createRequestQueue`, `readAsOf`. MISSING: `openStream(path)→{append,settled,gap}`; EOF/close/cancel; resumability (`Last-Event-ID` = cursor; SSE frames carry no `id:`; `readAsOf` and `carrier` unconnected); demand-backpressure; a `pipe`/`composeTransforms`; the stderr/void-gap surface; the blob membrane; TTY line discipline; subscriber caps (OP5). SHADOW RISKS: ⚠ VERIFIED: `sseFrame` drops the charge and most events emit flat BEFORE the edge (`event-projection.mjs:273-275`) — charge MUST survive to the renderer. ⚠ VERIFIED: `carrier.keepAlive()` is a timer (`sse.mjs:95-102`) — benign liveness ping, MUST NOT become the scheduler's pulse and MUST have NO read path into a settle. ⚠ VERIFIED: `request-queue.drain()` freezes arrival into a single total order — this MUST carry NO conflict-resolution precedence: two intents touching the same cell BOTH append and fold to ⊤ ("the appender folds colliding intents to ⊤" MUST be a TESTED invariant). Also: adopting Node byte streams wholesale; treating stderr as a text error channel.

### 4.5 Inter-process communication
IPC IS cone-passing: send = `admitLog` (gated, L10a), recv = `federate` + re-fold. EXISTS: the full federation algebra (proven idempotent/commutative/associative, ⊤-on-conflict, `sectionConeOf`); the SSE fan-out; the single-writer queue; parallel composition. MISSING: **peer authentication / row-signature / sybil resistance / trust gate on `admitLog` (L10a — a BLOCKER)**; a named `send`/`recv`/`connect`/`channel`; a FIFO/named-channel as a durable typed path; the Chu-transform pipe (⚠ VERIFIED: `chuTransform`/`composeTransforms` = 0 uses); a `signals` surface; a `coneWire` serialization. SHADOW RISKS: a `send`/`recv` that BLOCKS; an acked/ordered queue; a last-write-wins mailbox; a receiver trusting the SSE render; signals as imperative interrupts; shared mutable memory with an external lock; **a forged `grant`/`recognize` row folding in (the ⊤-injection DoS L10a closes).**

### 4.6 Identity, users, permissions, capabilities, auth
The most complete, most law-abiding subsystem and the worked proof. EXISTS (all in `principal`, pure): `recognize`/`dispute`, `attest`/`present`, `whois`, `authenticated` (decays via caller-supplied `now`), `can`, `may`, `grant`/`revoke`/`attenuate`/`delegate` (`capabilityRef = rowId(jcs(cap))`). All 17 contract tests pass. MISSING/PROPOSED: `whoami`/`asPrincipal`/sudo; `groupMembers`/`rolesOf`/`inGroup` (derived); `authenticate` (mint a fresh witness); `why` (audit cone); `caveat`/expiry; `authenticated().space`; **the membrane access check threading principal through read/append/resolve/witness (L13)**. SHADOW RISKS: `whoami` collapsing to one name; `can`/`may` read as boolean (a balanced ⊤ is a tie); a session/token bit; groups as a stored table. ⚠ VERIFIED: the H⁰ invariant in `delegate` (`principal.mjs:376`) is assigned by CONVENTION with no throw/assert — it MUST become a MECHANICAL check (a delegation-constructor assertion PLUS a property test over chains) BEFORE setuid-style features ride on it. ⚠ `admitted:boolean` inside settlement (`governAction`/`isAdmitted` = `value===FOUR.T`) projects ⊤ to `admitted:false` mid-settle — keep FOUR through settlement, derive the bool only at the act-edge; audit any `admitted:bool` feeding back into a settle.

### 4.7 Shell & userland interface
The shell/REPL/TUI are USERSPACE. `computer` offers the rhythm as tools. EXISTS in userspace: `horsetail` (eval=settle); the single-writer `request-queue`; the process/job model; `event-projection`/`carrier`. MISSING: `makeSession` (env+cwd+principal+job table); env-vars as a `/env` typed-path subtree; a job table; a FOUR `$?`/`verdict` (with a `tie`); `subshell` (sub-settle in a federated child world — depends on the §4.1 inheritance rule); a standard `drain → step → project → wire`. ⚠ VERIFIED: `horsetail` ships but is NOT in `files` and not in the npm `test` script. ⚠ STALE SMEAR STRUCK: the draft claimed horsetail re-derives FOUR in `charges.mjs` — VERIFIED FALSE: `charges.mjs:16` imports `{fromCharge, toCharge, FOUR, GLYPH}` from `@561-group/math/chu/four`; `evaluator.mjs:24-31` imports the kernel chu/descent. Remaining work is only "verify no second FOUR copy remains." SHADOW RISKS: exit status as a one-byte scalar; env vars as a mutable LWW map; reaping/killing by mutating a status field; pipes as byte streams; a clock driving the loop; a login/auth session bit.

### 4.8 Networking & distribution
A remote entity is reached by content-address; "connecting" IS admitting a peer's log (GATED, L10a); sync is anti-entropy by content-id set-difference. EXISTS: the federation algebra, `costGraphSummary`, the SSE wire. MISSING: a transport/membrane tile (no `socket`/`connect`/`listen`/`bind`/`peer`/DNS/gossip in computer/); **peer authentication (L10a)**; a content-address for a remote NODE; discovery; `diff`/`reconcile`; peer liveness as a charge (decaying against a LOGICAL `now`, NOT real time, L7a); `coneWire`. SHADOW RISKS: host:port opaque addressing; a clock/coordinator for sync (vector clocks/Lamport/leader election — destroys ⊤-on-conflict); connection state as mutable non-append-only; a boolean reachability flag; winner-takes-all reconciliation; **a real-time liveness decay.** ⚠ The keepAlive timer (`sse.mjs:95-102`) MUST stay a transport-only ping with no read path into a settle.

### 4.9 Boot/init, introspection, devices, time, signals
EXISTS: process lifecycle; TRC `witness`/`auditing`/`locating`; `stat` naming fifo/socket/block-device/character-device; `event-projection`/`carrier`; logical time implicit in `t`. MISSING: any `boot`/`init`/`bootstrap` (grep ZERO); **boot ORDER, a trace-integrity check on a corrupt/partial trace (OP3), init/PID-1 owning reaping + orphan adoption**; devices decomposed into restriction morphisms with a charge-valued read membrane (`witness.mjs:14-15`); a cone-valued `ps`/`introspect` (per-process cones, not crushed buckets); a `now(world) → tx` (Wave 0, L7a/OP6); `find`-as-introspection; an uptime/boot-trace surface; a `signal`/preemption; **wall-clock-as-data ingress (L7a role 2).** SHADOW RISKS: a boolean running/dead state; an imposed heartbeat; a single global init/heap; LWW device reads; wall-clock ISO stamps as the default `t`.

---

## 5. The eavt/datom resolution — two cones over one trace

The sharpest genuine inconsistency, **confirmed in code:**
- **eavt `fold`** (`substrate.mjs`): a contested cell rises to ⊤; retraction is a converse predication KEPT; evidence unioned. Paraconsistent, held.
- **`datom.currentValue`** (`datom.mjs:50-58`, VERIFIED): `if (d.op === RETRACT) live.delete(key)` — destructive, last-writer-wins, the loser's witnesses DROPPED, ⊤ impossible.

NOT two storage formats, NOT rivals — **two cones over the one trace:**
> **`settle` = the knowledge-frame cone (knowledge-LFP).** Holds ⊤. eavt's fold — `eavt-read ≈ settle`.
> **`adjudicate` = the truth-frame cone (truth-LFP).** FOUR-valued, a balanced ⊤ a tie. What `currentValue` reaches for — `datom.currentValue ≈ adjudicate`.

**Resolution (NORMATIVE):**
1. **eavt is the default everywhere.**
2. **`adjudicate` (the truth-LFP cone, over `foldedToCategory` → math `cone`) MUST REPLACE `datom.currentValue` as the decision read.** Picks the supported side WITHOUT destroying the loser; a balanced ⊤ is a `tie` (L4a/L9a).
3. **`currentValue`'s `Map`+`live.delete` MUST be DELETED, not waivered** (revising the draft). The current-value view is a NON-DESTRUCTIVE projection (`adjudicate`/`decide`) over the kept trace; any `{e,a,v}[]` wire shape is derived at the render edge. A `waiver` annotates but does not stop destruction; only removal does.
4. **`triple` is the forgetful RDF shadow** (forget `t`), reached by projection. Raw `datom` is admitted only at explicit interop boundaries with a recorded waiver and a guard — but its DESTRUCTIVE `currentValue` is gone.

---

## 6. The cone reframe — the central debt and why it coheres

1. **The boundary between tiles IS a cone.** Evidence is conserved across every seam; `section`/`render` is the ONLY collapse, at the edge. ⚠ VERIFIED: `section()` drops `c.value.evidence` (`substrate.mjs:178-188`) yet is the PRIMARY boundary in horsetail/process-runtime/event-projection. Demote `section` to an edge-only render; the cone (`sectionSpace`) is the boundary currency AND the LITERAL return of `read`/`settle` (L12a); a lint guard MUST fail if a flat section crosses a tile boundary.

2. **A tile IS a Chu transform** — an adjoint pair checked at construction. `connect(src, tgt, forward, backward)` MUST throw at construction if not adjoint (MECHANICAL, not a comment); `composeTransforms` raises the cone one fold at each stage. ⚠ VERIFIED: `chuTransform`/`composeTransforms`/`connect` have 0 real uses in computer/ (only the MCP `serving.mjs` + a test). The single biggest gap between stated architecture and running code.

3. **The tower GROWS by `settle → vanish → precipitate`.** ⚠ CORRECTED FRAMING (verified): `precipitate` is ALREADY a side read in `cost.mjs:21,156` and `orchestration.mjs:124` — NOT first-use. The four fixed-point cones are the four canonical reads: `settle` (knowledge-LFP), `brim` (knowledge-GFP), `adjudicate` (truth-LFP, §1.4 bridge), `presume` (truth-GFP). The UNBUILT growth is RE-DRIVING the residue into layer N+1 (`growTower`) — the difference between "a settle library" and "a real computer."

---

## 7. The de-smear — one primitive, one owner

- **`posix-holography` owns the byte/fs membrane and `witness`/`append`-durability.** The only `node:fs` touch; durable/atomic/lock-safe (OP1-4); today it throws and `appendFileSync`s with no fsync/lock.
- **`substrate` owns `fold`/`settle`/`section`/`sectionSpace`/`relate`/`supersede`/`reify`/`adjudicate`/`foldedToCategory`.** Promote to a single canonical export (`/eavt` or `/substrate`); retire the 63-segment path. ⚠ VERIFIED OWNERSHIP CYCLE RISK: `substrate.mjs:20` imports the row algebra (`rowId`/`assertRow`/`dedupe`/`jcs`) FROM `typed-resource-catalog/eavt`. **Decision:** the import direction MUST be `substrate depends on TRC's row algebra`; a no-cycle lint guard between posix-holography and TRC MUST be added in Wave 1; re-export TRC's jcs/rowId from `/substrate`, do not duplicate.
- **`TFAS` owns `resolve`** (the address codec).
- **`TTMS` owns term-addressed memory** (`address`/`read`/`write`/`writeDual`/`readAsOf`/`witnessOf`/`retract`). `sectionSpace` MUST be its default read.
- **`TRC` owns the type namespace** and the data tower (`eavt`/`datom`/`triple`) as forgetful projections (with `currentValue`'s `live.delete` REMOVED, §5).
- **`principal` owns identity/capability; `process-runtime` owns the process model + scheduler; `distribution` owns federation; `event-projection`/`carrier`/`request-queue` own the I/O subsystem; `horsetail` is the userspace language.**

**Smears to kill:** (1) `section()` as boundary currency → cone. (2) Witness re-derivation — `shell`/`arnold`/`daleske` hand-roll `buildWitnessIndex` → promote the projector to one `computer/projectors` export. (3) Domain-knowledge leaks — `event-projection`'s `NON_ACTOR_PREFIXES`/`DEFAULT_EVENT_SCHEMA`, `process-runtime`'s `PROCESS_FUNCTIONAL` → make them parameters; rename `DEFAULT_EVENT_SCHEMA` → `TAB_EVENT_SCHEMA`. (4) ⚠ STRUCK: "horsetail re-derives FOUR" — VERIFIED FALSE; downgrade to "verify no second FOUR copy remains."

**Flat exports to retire:** the ~50-subpath exports map collapses to the ~10-call waist plus tile barrels; internal morphisms (`sniff`, `flatfile-write`, the per-node `eavt-append/read/settle`, the 63-segment `eavt-substrate`) become `#`-imports.

**⚠ INCONSISTENCY (build-visibility, VERIFIED):** `files` publishes only the four substrate tiles — `process-runtime`, `distribution`, `principal`, `horsetail`, `event-projection`, `carrier`, `request-queue` are exported but NOT in `files`. Resolve: `files` MUST list every exported tile, or the exports MUST be pruned.

**⚠ INCONSISTENCY (missing source):** `predicate-algebra-parser` is named in the description with no source/export. Resolve: land it as the L8 interpretation tier or strike it. `horsetail/believe.mjs` is the absorbed remnant.

---

## 8. The shadow-regression checklist (lint guards / tests)

1. A **destructive write** (`unlinkSync`, overwrite, status-field mutation, `live.delete`/`Map.delete`) instead of appended counter-evidence.
2. A **boolean/8-bit verdict** where a cone/charge belongs — collapsing `⊥`≠`f`≠`⊤`, OR inventing a winner on a balanced ⊤ instead of a `tie`.
3. A **clock/heartbeat** driving execution (`keepAlive`'s timer MUST NOT become the scheduler's pulse; `decayStanding`/`stamp`/`ttmsWrite`/`peerLiveness` MUST keep `now`/`t` caller-supplied logical, never `Date.now`).
4. An **opaque recycled integer** (PID/fd/uid) instead of a content/typed-path address.
5. **Last-write-wins / winner-takes-all** on conflict (including arrival-order conflict precedence in `request-queue.drain`) instead of holding ⊤ with both witnesses.
6. A **flat section crossing a tile boundary** (including as the primary return of `read`/`settle`) instead of a cone.
7. A **throw for a domain condition** instead of a settled charge; `Result`/`adjudicate` as `ok|err` without carried evidence, structured reason (L9b), or `tie`/`onTop` policy.
8. **`math` importing `computer`**, re-rolling `{pos,neg}`, or re-deriving FOUR/the truth-LFP closure.
9. A **non-durable / non-atomic / unlocked append**, a `JSON.stringify` on-disk persist (not `jcs`), or a read that throws on a torn final line (OP1-4).
10. An **unauthenticated peer row** folding in as fact, or a **waist call that touches the trace without a principal/access check** (L10a/L13).
11. A **silent `maxFolds` truncation** returning the last board instead of a held residue cone (OP6).
12. An **import cycle** between posix-holography and typed-resource-catalog.

---

## 9. The ordered build plan (waves)

The ordering puts the OPERATIONAL SUBSTRATE first, then the cone+Result foundation, then the Chu layer, then the subsystems. Safety-critical enforcement (durability, access, peer-auth) is NOT buried behind the cone refactor.

**Wave 0 — The operational substrate.** Durable+atomic+lock-safe `append` persisting via `jcs` (OP1-4); torn-line crash-tolerant read (OP3); membrane access-control threading principal and consulting `can`/`may` (L13); federation admission / row-signature / recognition gate (L10a); the logical clock `now(world)→tx` (L7a/OP6); `settle` surfacing a residue cone on `maxFolds` saturation (OP6); the Wave-0 lint guards (durability, no-`Date.now`-default, no-`live.delete`, no-unauthenticated-admit, no posix↔TRC cycle). Risk: high. Depends on: nothing. *Nothing above is a real computer until this lands.*

**Wave 1 — Cone-everywhere foundation + the shape bridge + the FOUR-valued adjudicate (the keystone).** Promote `substrate` to one canonical `/substrate` (import direction `substrate→TRC`, no cycle); make `sectionSpace` the LITERAL default return of the fold reads (L12a); demote `section` to edge-only; BUILD `foldedToCategory` + its conformance test (§1.4); build the FOUR-valued `adjudicate` (over the lifted category, from math) + `brim`/`presume` + the separate `commit({onTie,onTop})` (L9a); wire `adjudicate` as the eavt/datom decision read (§5); make `deriveProcessState` cone-valued NOW; add the §8 guards. Risk: high. Depends on: 0. *If wrong, everything re-flattens.*

**Wave 2 — The Result/no-throw discipline at the membrane.** `read`/`append`/`witness`/`resolve` return a structured cone (L9b) instead of throwing; `resolve` with absent type → ⊥ (only empty term throws); `commit`/`Result` only at the act-edge carrying both witness sets. Risk: high. Depends on: 0, 1.

**Wave 3 — The Chu-transform tile layer.** `connect` (adjointness MECHANICALLY checked at construction) + `composeTransforms`; first pipelines (`relate|section|shp`, `may`-as-a-transform). Risk: high (0 uses today). Depends on: 1.

**Wave 4 — Collapse the waist + sync `files`/`exports`.** Reduce ~50 subpaths to the ~10-call waist + tile barrels; demote `advance`/`precipitate`/`relate`/`enqueue`; sync `files` with `exports`; resolve `predicate-algebra-parser`; promote `list`/`mkdir` and the projector. Risk: medium. Depends on: 1, 2.

**Wave 5 — Filesystem mutation verbs + cwd + blob membrane.** `unlink`/`rename`/`link`/`symlink` append-only; decompose symlink/fifo/socket/devices into restriction morphisms; the blob membrane; cwd + relative/`..` resolution; `watch` and `mount` (admission-gated). Risk: medium. Depends on: 0, 1, 2.

**Wave 6 — Memory API + single retraction + compaction.** `allocate`/`poke`/`peek`/`free`/`deref`/`enumerate`/`provenance`/`decide`; `ttmsWrite.retract(root,term,key)` emitting the tombstone; cone-default `peek`; remove the wall-clock `t` default; trace snapshot/compaction (OP5). Risk: medium. Depends on: 0, 1, 2.

**Wave 7 — Identity hardening + missing verbs + H⁰ enforcement.** `whoami`/`asPrincipal` (H⁰ MECHANICALLY enforced via a delegation-constructor assertion + a property test over chains); `groupMembers`/`rolesOf`/`inGroup`; `authenticate`; `why`; `caveat` (logical expiry); `authenticated().space`. Risk: low. Depends on: 0, 1.

**Wave 8 — Process lifecycle: exec, inheritance, cancel, join, signal, groups, residue growth.** `exec`/load + the inheritance morphism; `joinProcess`/`wait`; `cancelProcess` (counter-evidence); `signalProcess`; `groupProcesses`; `exitStatus` (FOUR + tie); `watchProcess`; the append-triggered wakeup; fix the `stamp` clock leak; `growTower`. cancel/join/signal/exitStatus/groups/exec depend only on [0,1,2]; only `growTower` depends on [3]. Risk: high. Depends on: 0, 1, 2, 3.

**Wave 9 — Stream subsystem.** `openStream(path)→{append,settled,gap}`; cursor `readCells`/EOF-as-cursor-fact; `subscribe` with demand/AbortSignal + subscriber cap (OP5); `renderFrame` as the ONLY charge→bytes collapse (default SHOWS a ⊤'s contradiction); `Last-Event-ID` = cursor; the stderr/void-gap face; blob/TTY membranes. Risk: medium. Depends on: 0, 1, 3, 8.

**Wave 10 — Shell/session seam (computer-side tools).** `makeSession`, `setenv`/`getenv`/`environ` over `/env`, `verdict` (FOUR `$?` with tie), `spawn`/`jobs`/`wait` job table, `subshell` (sub-settle with a defined child→parent merge), `stream`; ship `horsetail` (add to `files` + test script; verify single FOUR import). Risk: medium. Depends on: 4, 8, 9.

**Wave 11 — Network membrane + distribution verbs (trust-gated).** The network membrane tile (the only `node:net`/QUIC/WS touch): `peerAddress`, `dial`/`listen`, `announce`/`discover`, `diff`/`reconcile`, `walk`, `peerLiveness` (FOUR, logical `now`), `coneWire`, `subscribeFederation`. CALM/clock-free/⊤-on-conflict + the L10a gate. Risk: high. Depends on: 0, 1, 2, 3, 9.

**Wave 12 — Boot/init, introspection, devices, logical time, scheduler stratification, shutdown.** `boot(root)` (replayable, trace-integrity check on corrupt/partial, defined order) + init/PID-1 reaping + orphan adoption; `ps`/`introspect` (cone-valued, per-process cones); `device` (charge-valued membrane); wall-clock-as-data ingress (L7a role 2); `signal`; `shutdown` (OP7); stratify the scheduler by the four regimes and make `commitTick`/`scheduleToQuiescence`/`mergeBoards` real transaction-boundary objects. Risk: medium. Depends on: 0, 1, 8, 11.

---

## 10. Open questions

See the structured `openQuestions` field; it records both genuine undecided questions AND the rationale for the few critique points NOT folded in as normative.

---

This document is normative. A change that violates any law in §1, fails any check in §8, backslides a feature in §4 into its shadow risk, or breaks the operational substrate in §1.5 is non-conformant regardless of whether tests pass.

---

## Appendix A — the syscall waist (structured)

- `resolve` resolve(root, term, type, {principal?}) -> Cone<Handle> — open / address: term -> typed-path handle (the capability). Cone face: t resolved, BOT unroutable OR absent-type (open-world ENOENT analogue, NOT a throw), TOP routes-to-two-kinds (held), f access-denied. Carries /hacking/ derivation-depth as epistemic status; access-checked at the membrane (L13). Owned by TFAS (it IS address()). Today address() is a pure string codec with no cone and THROWS on empty term AND empty type (address.mjs:19,26). Resolution: absent type -> BOT cone; only the genuinely empty TERM throws (shape contract). _(tile: typed-filepath-addressing-system)_
- `witness` witness(handle, {principal?}) -> Cone<Kind> — stat/fstat AND the byte-read-descent (absorbs the posix read-descent; same membrane act). Route to the deepest inhabited kind + epistemic depth. The ONLY node:fs touch; the durable/atomic/lock-safe/torn-line-tolerant membrane (OP1-4, OP3). stat() returns a charged scott category. Must return BOT (not throw) for a path naming nothing; TOP for a path conforming two kinds. Access-checked (L13). _(tile: posix-holography (the membrane))_
- `read` read(handle, {asOf?, frame?='settle', principal?}) -> Cone<Section> — read/seek (the memory peek): fold the term-addressed trace (or the t'<=asOf prefix) to a CONE in the chosen fixed-point frame (settle=knowledge-LFP default holds TOP; brim=knowledge-GFP; adjudicate=truth-LFP; presume=truth-GFP). Returns the cone (sectionSpace) LITERALLY (L12a), never a flat {affirmed,denied,contradicted} as the primary value, never additive-alongside-a-flat-return. Empty log -> BOT cone, never a throw. Access-checked. Owned by TTMS. _(tile: typed-term-memory-system -> substrate)_
- `append` append(handle, predication, {validate?, source?, principal?, durable?=true}) -> Cone<TxWitness> — write -- THE ONE write funnel (monotone G-Set admission). update = append the converse predication; delete = append a retraction tombstone (v:null). validate = the local trust mode (subsumes the former enqueue; a network intent is validated, never touches the trace directly). source = the peer-merge provenance mode (the core the former federate-write shares). Two intents touching the same cell BOTH append and fold to TOP, NEVER last-write-wins (a TESTED invariant). Durable+atomic+lock-safe, persisted via jcs not JSON.stringify (OP1-4). Access-checked (L13). Returns a cone witnessing the tx (row content-ids). _(tile: typed-term-memory-system -> posix-holography membrane)_
- `adjudicate` adjudicate(cone, {onTie?, onTop?}) -> {verdict:FOUR, supported, witnesses, tie} — THE decision edge: project a knowledge-cone to the truth frame (truth-LFP), over foldedToCategory -> math/bilattice/cone.adjudicate (NOT a bare hookup -- the section-1.4 shape bridge; NOT a re-derivation, L11). FOUR-VALUED (L9a): returns {verdict, supported, witnesses, tie}, NEVER a bare Result<T,Charge>. The supported side WITHOUT destroying the loser (TOP and both witnesses survive one re-fold away); a BALANCED TOP surfaces as tie, never an invented winner (L4a). The further one-sided collapse to Result<T,Charge> is a SEPARATE projector commit(adjudication,{onTie,onTop}) whose err carries BOTH witness sets. Replaces datom.currentValue as the decision read. MISSING today (grep:0); the deeper gap is shape-incompatibility with the substrate fold, not absence. _(tile: substrate (over foldedToCategory))_
- `spawn` spawn(world, principal, accountable, {inherit?}) -> Cone<Process> — fork: allocate a process at a modal-world typed path processes/<modal>/<id>; PID = the content/typed-path address, never a recycled integer; principal narrows, accountable stays apex (H^0 MECHANICALLY enforced -- a delegation-constructor assertion + a property test, not a comment). inherit = the COPY/SHARE/FEDERATE rule for which subtrees the child gets (env, cwd, principal, capabilities, open stream cursors) and how the child trace merges back (the join). Today allocateProcess PLACES (does not create), returns a frozen object not a cone, throws on no id. _(tile: process-runtime)_
- `settle` settle(world, id, {derive?}) -> Cone<Process> — exec/wait: settle one process to its Knaster-Tarski least fixed point by read-fold-settle iteration, no clock; the wait is reaching quiescence; a quiesced process is re-driven by the APPEND of a new relevant row (the appended intent IS the wakeup), never a poll. derive = the loaded program (exec). exit status = FOUR composite (t ready, f denied, BOT unsettled, TOP ran-and-contradicted-HELD), witnesses kept, a balanced TOP a tie. On maxFolds saturation it MUST return a held residue BOT cone (OP6), NEVER silently the last board (verified maxFolds=1024 silent stop, process.mjs:80,88). The BOT/TOP face IS the residue/EAGAIN -- so the former 'precipitate' is a read-FACE of this cone, not a separate waist call. Cone is the LITERAL return (L12a). _(tile: process-runtime)_
- `project` project(rows, schema?) -> Cone<Event[]> — notify/poll: a PURE projection of a trace-delta into topic-tagged events; a TOP projects to a first-class held 'top' event carrying the charge + both witness sets. Deterministic (no Date.now/Math.random, input-order). The event taxonomy (NON_ACTOR_PREFIXES, the renamed TAB_EVENT_SCHEMA) is a PARAMETER, not a baked default. CHARGE MUST SURVIVE FOR ALL EVENTS, not just 'top' (verified flat today, event-projection.mjs:273-275) -- the collapse is render's job, not project's. _(tile: event-projection)_
- `federate` federate(local, remote, {trust}) -> Cone<Section> — network fork-merge: a binary G-Set union of append-only logs deduped by content-id (idempotent, commutative, associative -- a delta-state CRDT over gossip). recv = federate + per-observer re-fold; a value walks by migrate (same sha256 => same identity). Conflict held as TOP with both witnesses, never last-write-wins. ADMISSION-GATED (L10a): each incoming row's witness provenance/signature is verified and gated by recognition; an unverified/unrecognized row enters at BOT (inert) or is rejected with a recorded f -- never silently folded as fact (closes the TOP-injection sybil DoS). Retained as its own waist call (distinct trust-gate+re-fold membrane), not merely an append mode. sectionConeOf is the one cone-passing boundary that exists. _(tile: distribution)_
- `render` render(cone, {commit, onTop}) -> WireFrame — the boolean/byte collapse, edge-only: serialize a charge to an SSE/HTTP wire frame, ALWAYS carrying evidence + the held TOP marker in data-* fields. The ONLY place charge collapses to bytes; downstream bytes, upstream charges. A TOP MUST show a VISIBLE contradiction marker by DEFAULT (L4a) -- collapse-to-supported is opt-in via {commit,onTop}, and which side is supported is a caller/observer parameter. Today section leaks past the edge and the default hides one side of a TOP (shp CALM projection is opinionated) -- both fixed here. _(tile: carrier + semantic-hypertext-packet)_

## Appendix B — build waves

**Wave 0 — The operational substrate a real computer cannot run without, ahead of the cone work: durable+atomic+lock-safe append persisting via jcs (OP1-4); torn-line crash-tolerant read (OP3); membrane access-control threading principal through read/append/witness/resolve and consulting can/may (L13); federation admission control / row-signature / recognition gate (L10a); the logical clock now(world)->tx (L7a/OP6); settle surfacing a residue cone on maxFolds saturation (OP6); the Wave-0 lint guards (durability, no-Date.now-default, no-live.delete, no-unauthenticated-admit, no posix<->TRC cycle). Nothing above is a real computer until this lands.** (risk: high)
  - posix-holography (durable/atomic/lock-safe/jcs append + torn-line read; OP1-4, OP3)
  - posix-holography + principal (membrane access-control, L13)
  - distribution (federation admission / peer-auth / recognition gate, L10a)
  - (new) clock surface (now(world)->tx logical clock, L7a)
  - process-runtime (maxFolds saturation -> residue cone, OP6)
  - lint guards (durability, Date.now-default, live.delete, unauthenticated-admit, posix<->TRC cycle)

**Wave 1 — Cone-everywhere foundation + the verified shape bridge + the FOUR-valued adjudicate (the keystone). Promote substrate to one canonical /substrate (import direction substrate->TRC, no cycle); make sectionSpace the LITERAL default return of the fold reads (L12a); demote section to edge-only; BUILD foldedToCategory + its conformance test (section-1.4); build the FOUR-valued adjudicate (truth-LFP over the lifted category, from math) + brim/presume + the separate commit({onTie,onTop}) projector (L9a); wire adjudicate as the eavt/datom decision read (section-5); make deriveProcessState cone-valued NOW; add the section-8 guards. If wrong, everything re-flattens.** (risk: high; deps: 0)
  - substrate (canonical /substrate, cone-literal returns, foldedToCategory + conformance test)
  - math/bilattice/cone via foldedToCategory: adjudicate/brim/presume + commit({onTie,onTop})
  - datom (REMOVE currentValue's live.delete; replace its role with adjudicate)
  - process-runtime (deriveProcessState cone-valued)
  - lint guards (flat-section-at-boundary, tie-on-TOP, destructive-write, math-imports-computer)

**Wave 2 — The Result/no-throw discipline at the membrane: read/append/witness/resolve return a structured cone (BOT=ENOENT, f=EACCES/resource with an L9b condition tag, TOP=held, t=done) instead of throwing; resolve with absent type -> BOT (only empty term throws); throwing reserved for shape-contract guards; commit/Result only at the act-edge carrying both witness sets.** (risk: high; deps: 0,1)
  - posix-holography (read/append/witness/resolve return structured cones, L9b)
  - typed-filepath-addressing-system (resolve absent-type -> BOT)
  - commit/Result (neverthrow-or-in-house) at the adjudicate edge only

**Wave 3 — The Chu-transform tile layer: connect(src,tgt,forward,backward) with adjointness MECHANICALLY checked at construction (throws if not adjoint), composeTransforms, and the first pipelines (relate|section|shp, may-as-a-transform) expressed as transforms so the cone is raised, not rebuilt. The central architectural debt (chuTransform has 0 uses today).** (risk: high; deps: 1)
  - (new) chu-transform layer (connect with construction-time adjointness check, composeTransforms, dualTransform over math/chu)
  - may() rebuilt as a transform through governAction
  - relate|section|shp expressed as a pipeline

**Wave 4 — Collapse the waist and sync the package surface: reduce ~50 subpath exports to the ~10-call waist + tile barrels; demote advance/precipitate/relate/enqueue per section-3 (#-imports or modes); sync files[] with exports (or prune); resolve predicate-algebra-parser; promote list/mkdir and the witness->state projector to shared/public.** (risk: medium; deps: 1,2)
  - package.json (exports collapse to ~10-call waist, files/exports sync, fix import direction)
  - predicate-algebra-parser (land as L8 or strike)
  - (new) computer/projectors export (one witness->state resolver)
  - posix-holography (public list/mkdir)

**Wave 5 — Filesystem mutation verbs + cwd + blob membrane, append-only: unlink/rename/link/symlink as counter-evidence / re-binding / dual-filing / path-valued cells (never node:fs delete); decompose symlink/fifo/socket/devices into restriction morphisms with a charge-valued read membrane; the blob/binary content membrane (content-addressed leaves); cwd + relative/.. resolution policy; watch (change-stream) and mount (federated graft, admission-gated).** (risk: medium; deps: 0,1,2)
  - posix-holography (unlink/rename/link/symlink, append-only)
  - posix-holography (device/exotic-type restriction morphisms; blob content membrane)
  - typed-filepath-addressing-system (cwd + relative/.. resolution)
  - event-projection watch(path); distribution mount/graft as tensor

**Wave 6 — Memory API surface + single retraction + compaction: present allocate/poke/peek/free/deref/enumerate/provenance/decide over TTMS/substrate; give ttmsWrite a retract(root,term,key) emitting the tombstone; make peek cone-default; remove the wall-clock t default; build trace snapshot/compaction (fold-to-snapshot, archive-never-delete, OP5).** (risk: medium; deps: 0,1,2)
  - typed-term-memory-system (retract morphism, caller-supplied logical t, cone-default peek)
  - substrate/typed-term-memory-system (unified allocate/poke/peek/free/deref/enumerate vocabulary)
  - substrate (decide as adjudicate over the kept trace; trace snapshot/compaction)

**Wave 7 — Identity hardening + the missing verbs + H^0 enforcement: whoami/asPrincipal (narrow principal, accountable stays apex -- H^0 MECHANICALLY enforced via a delegation-constructor assertion + a property test over chains), groupMembers/rolesOf/inGroup (derived), authenticate (mint a fresh witness), why (audit cone), caveat (logical expiry), and expose authenticated().space. Extends the already-complete worked proof.** (risk: low; deps: 0,1)
  - principal (whoami, asPrincipal, H^0 mechanically enforced)
  - principal (groupMembers/rolesOf/inGroup derived)
  - principal (authenticate, why, caveat against logical now, authenticated().space)

**Wave 8 — Process lifecycle: exec/load, inheritance, cancel, join, signal, groups, residue growth. exec (bind a derive/program) + the inheritance morphism (env/cwd/principal/caps/cursors); joinProcess/wait (harvest predecessor composite); cancelProcess (append counter-evidence, never delete); signalProcess (SIGTERM/SIGINT as appended intents); groupProcesses (modal sub-world); exitStatus (FOUR harvest with tie); watchProcess; the append-triggered wakeup; fix the stamp clock leak; growTower (settle->vanish->precipitate re-drive). cancel/join/signal/exitStatus/groups/exec depend only on [0,1,2]; only growTower depends on [3].** (risk: high; deps: 0,1,2,3)
  - process-runtime (exec/load, inheritance morphism, joinProcess, cancelProcess, signalProcess, groupProcesses, exitStatus, watchProcess, append-wakeup)
  - process-runtime (fix dispatch.mjs stamp clock leak)
  - process-runtime growTower (settle->vanish->precipitate re-drive; depends on Chu layer)

**Wave 9 — Stream subsystem: openStream(path)->{append,settled,gap}, cursor-based readCells with EOF-as-cursor-fact, subscribe with demand/AbortSignal + subscriber cap, renderFrame as the ONLY charge->bytes collapse (carrying evidence + the TOP marker, default SHOWS the contradiction); connect readAsOf to the carrier for resumability (Last-Event-ID = cursor); wire the stderr/void-gap face; the blob/TTY membranes.** (risk: medium; deps: 0,1,3,8)
  - (new) stream tile (openStream, readCells, frameOf, subscribe, subscriber cap)
  - carrier (renderFrame edge-only collapse, TOP-visible default, Last-Event-ID = cursor)
  - event-projection (charge survives for all events, not just top)
  - carrier/posix-holography (void/gap stderr face; blob/TTY membranes)

**Wave 10 — Shell/session seam (computer-side tools, not the shell): makeSession (env+cwd+principal+job table), setenv/getenv/environ over a /env typed path, verdict (FOUR $? with tie), spawn/jobs/wait job table, subshell (sub-settle with a defined child->parent merge), stream; ship horsetail (add to files + test script; verify no second FOUR copy remains). The shell/REPL/TUI remain userspace.** (risk: medium; deps: 4,8,9)
  - (new) session seam (makeSession, submit/step, verdict, setenv/getenv/environ, jobs/wait, subshell, stream)
  - horsetail (add to files[] and the npm test script; verify single FOUR import)

**Wave 11 — Network membrane + distribution verbs (trust-gated): the network membrane tile (the only node:net/QUIC/WS touch): peerAddress, dial/listen, announce/discover (federated facts), diff/reconcile (anti-entropy), walk (network migrate), peerLiveness (FOUR, decaying against a LOGICAL now), coneWire (lossless cone serialization), subscribeFederation. Must keep CALM/clock-free/TOP-on-conflict AND the L10a admission gate.** (risk: high; deps: 0,1,2,3,9)
  - (new) network membrane tile (peerAddress, dial, listen, coneWire; admission-gated)
  - distribution (announce/discover, diff, reconcile, walk, peerLiveness against logical now)
  - carrier (subscribeFederation bidirectional)

**Wave 12 — Boot/init, introspection, devices, logical time, scheduler stratification, shutdown: boot(root) (settle the catalog+process world from the trace, replayable, trace-integrity check on corrupt/partial, defined order) + init/PID-1 owning reaping + orphan adoption; ps/introspect (cone-valued live board carrying per-process cones + find-as-introspection); device (charge-valued membrane); wall-clock-as-data ingress (L7a role 2); signal; shutdown (drain->flush->checkpoint->halt, OP7); stratify the scheduler by the four regimes and make commitTick/scheduleToQuiescence/mergeBoards real transaction-boundary objects.** (risk: medium; deps: 0,1,8,11)
  - (new) boot tile (boot with integrity check + order, init/PID-1 reaping, wall-clock-as-data ingress)
  - (new) introspection surface (ps cone, introspect, find-as-hacking)
  - posix-holography device(path) charge-valued membrane
  - process-runtime (stratifyRegime, commitTick, scheduleToQuiescence, mergeBoards, signal, shutdown)

## Appendix C — open questions

- REJECTED-CRITIQUE RATIONALE -- advance's Board crushes readiness cones (Shadow-detector, minor): PARTIALLY rejected. Verified orchestration.mjs:108 -- advanceProcesses ALREADY carries `settled` (the full per-process board) alongside the disjoint dispatched/blocked/contradicted buckets, so the per-process cones are NOT destroyed, only the partition is the default lens. Folded the SPIRIT (the Board MUST keep per-process cones; bucket membership is a non-disjoint dashboard lens) but did not treat it as a data-loss blocker. advance is also demoted out of the waist (an internal driver) so it is no longer a boundary the next pass reads.
- REJECTED-CRITIQUE RATIONALE -- collapse ALL append-flavored calls to one (Minimality critic, major): PARTIALLY rejected. Folded the collapse of enqueue (now an append({validate}) mode) and the local append unification, but KEPT federate as its own waist call (a 10-call basis, not 8-9). Rationale: the L10a trust-gate + per-observer re-fold over a peer's G-Set is a distinct membrane discipline (admission control, provenance verification, TOP-on-conflict re-fold) that is not merely 'append with a source parameter'; collapsing it would hide the security boundary the completeness critic correctly flagged as a blocker. Open: is federate truly irreducible to append({source,trust}), or is the distinction presentational? Decide when the network membrane (Wave 11) lands and the admission code is concrete.
- Wall-clock-as-service ingress (L7a role 2): the spec states wall-clock enters only as an explicitly-witnessed external-fact row, never the default t. But WHERE does the real wall-clock value physically come from (the one place node's Date.now is allowed), how is that single ingress audited so it cannot leak into ordering, and does a future-scheduled action's logical deadline need a periodic 'tick the clock forward' fact appended by init/PID-1 (which risks re-importing a heartbeat)? Decide the single sanctioned Date.now site and the deadline-advance mechanism in Wave 12.
- foldedToCategory fidelity (the section-1.4 shape bridge): the adapter lifts the substrate's folded fiber + witnessing rows into math's descent category. Is the lift LOSSLESS (every witness/evidence coordinate survives the round trip category->adjudicate->section), and does adjudicate over the lifted category provably equal a substrate-native truth-LFP on contested/TOP cells, or only on consistent cells? The conformance test must pin the contested case; if the lift loses evidence on a TOP, adjudicate silently re-flattens. Resolve BEFORE declaring Wave 1 complete.
- adjudicate's dependency on brim/presume: does the FOUR-valued truth-LFP adjudicate need the knowledge-GFP (brim) and truth-GFP (presume) cones to be well-defined over the kept trace, or can it be built standalone first? The cone-completeness claim says all four are canonical reads of a layer; the build order must know whether adjudicate has a HARD dependency on the GFP cones (which would re-order Wave 1's units) or only a conceptual one.
- Single blessed retraction at the WRITE API: the two-cones reading resolves the READ (eavt-default + adjudicate) and the spec REMOVES currentValue's live.delete. But does the write API expose EXACTLY one retract morphism (ttmsWrite.retract emitting the v:null tombstone), and is raw destructive datom kept at all (waivered interop) or removed entirely from exports? Decide the precise export surface in Wave 4/6.
- Modal worlds / allocation are inference, not derived (computer-architecture.md:227): delegate/asPrincipal/process-group/subshell all rest on un-derived modal box/diamond semantics. Must box/diamond be derived as allocation primitives (read math/type-theory) BEFORE hardening setuid-style features and federated child worlds on them, or is typed-path=world enough for now and the modal operators deferred? The H^0 mechanical enforcement (Wave 7) and subshell child->parent merge (Wave 10) both ride this.
- The star-autonomous symmetry / race-coherence question (computer-architecture.md:226): content-identity-by-jcs handles commuting ops (same canonical row => same cell), but non-commuting genuine causal deps (directed paths) have no representation beyond folding to TOP. With OP2 (single-writer/lock) now guaranteeing no torn interleave, is an explicit coherence/symmetry (directed/cubical) module still needed for genuine causal conflicts, or is fold-to-TOP acceptable for them and OP2 sufficient for the mechanical race?
- coneWire ownership at the network boundary: the 'one membrane' law was stated for node:fs (posix-holography). Introducing node:net needs an explicit decision -- is the network membrane a SECOND membrane (a peer tile, owning coneWire + dial/listen) or a generalization of posix-holography? The spec proposes a new tile (Wave 11); confirm this does not violate the single-membrane discipline, or restate the law as 'one membrane per substrate kind (fs, net)'.
- No-backpressure / no-delivery-ack as a stated PROPERTY vs a mechanism: monotone G-Set union gives a writer that never blocks and a sender that cannot/must-not learn whether a receiver folded its delta. The spec states this as a guaranteed PROPERTY of the IPC layer, with bounded-queue admission control (OP5) only at the EDGE. Confirm no app legitimately needs end-to-end delivery confirmation below the edge (which would force a reply-fact round-trip, re-importing rendezvous), or carve out where a confirmation-fact is admissible.
- The four-regime scheduler stratification vs the finite settle loop: advanceProcesses runs the same finite settleProcess for every process regardless of regime. Building stratifyRegime (articulate/predicate/posit/settle) implies a transfinite/aperiodic iteration distinct from the finite maxFolds loop (now residue-surfacing per OP6). Is the transfinite/aperiodic closure machinery imported from math/bilattice/void, or does computer/ need its own driver, and how does the OP6 residue-surfacing interact with a transfinite regime that legitimately does not converge?
- The job table boundary (computer tool vs userspace): makeSession (env+cwd+principal+job table) is proposed as a computer-side seam while the shell/REPL/TUI stay userspace. Is the job table itself (binding a horsetail form to an allocated process) a computer tool or a userspace concern, and does horsetail (shipped-but-not-published today) become part of the published kernel surface or stay a userspace dependency once added to files[]? Decide in Wave 10.
