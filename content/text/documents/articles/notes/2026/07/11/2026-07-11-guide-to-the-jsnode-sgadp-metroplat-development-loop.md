---
title: "Guide to the JSNode SGADP–MetroPlat development loop"
description: "Transcript-grounded handoff for using MetroPlat to sense, decide, apply, and verify repairs to MetroPlat itself. Separates live machinery from the self-generative autonomic target."
date-created: 2026-07-11
status: working handoff; live source wins over this note
keywords:
  - organizing
  - agent
  - computing
  - settlement
  - action
  - witness
  - structure
---

# Guide to the JSNode SGADP–Infography [renamed later to MetroPlat] development loop

## 1. What the name refers to

`JSNode-SGADS` in the originating transcript and `JSNode-SGADP` in later
conversation name the **JSNode self-generative autonomic development
system/platform role**. They do not currently name a separate checked-in
package, process, or source directory. The live managed element and the
partially built autonomic manager are both in `@emsenn/metroplat`.

The shorthand `Infographic-JSNode-SGADP ↔ MetroPlat` is therefore best read,
pending a more explicit ruling, as the reflexive loop in which an agent uses
MetroPlat's own ledger, workbench, operation catalog, and effectors to develop
MetroPlat. Do not search for a second application and do not create one merely
to make the name concrete.

The ratified conception is in
`dev/content/ideas/2026/07/11/2026-07-11-self-generative-autonomic-development-stack.md`.
This guide is narrower: it records how to operate and continue building the
loop without confusing the target architecture with the machinery that exists.

## 2. The transcript record

The high-signal sessions, in causal order, are:

1. Claude `d99129c2-f105-4b34-861f-b34c42fcf028`, transcript at
   `~/.claude/projects/-home-emsenn-info/d99129c2-f105-4b34-861f-b34c42fcf028.jsonl`.
   This session established the L0–L7 stack, wrote the training note, reframed
   repair as APR/CEGIS, chose terms-as-content-addressed-data before a source
   printer, and implemented the first `term-census` increment.
2. Claude `fa1a9ab1-0f20-41e2-a4ac-86555ac25cd1`, transcript at the analogous
   project path. This session diagnosed the work-dispatch read-model mismatch,
   then received the decisive operator correction: sensors were proliferating
   while agents still performed source changes by hand. It established that
   the already-live `lexicon-sweep` is the effector and that probabilistic
   `name-fit` is useful later, when decision-making rather than application is
   the bottleneck.
3. Codex `019f52f5-5d78-7682-bc7d-7c1adf3c732e`, transcript at
   `~/.codex/sessions/2026/07/11/rollout-2026-07-11T15-53-59-019f52f5-5d78-7682-bc7d-7c1adf3c732e.jsonl`.
   This session turned back toward conventional Node architecture and the full
   replacement constraint: a repair must absorb callers and delete the
   superseded path, not add an `n+1` clean architecture beside the old one.

The implementation commits that matter most are `aaccc0d1` (lexicon loop),
`ba170652` (behavioral oracle), `5db5fe78` (workbench consolidation),
`59fe16dd` (training note), and `976db9df` (term store/census). Later commits
substantially changed RPC, contracts, encounters, package surfaces, and source
ownership, so transcript claims must always be checked against `HEAD`.

## 3. The invariant behind the loop

The finish line is coherence, not smallness or simplicity:

> A competent reader can form one model of the system and every file they open
> confirms it.

Essential mathematical complexity stays. Accidental competing accounts,
polysemous ownership, stale descriptions, bypass paths, and hand-carried
invariants are the debt.

The management rule is:

> Before doing development work by hand, ask whether MetroPlat already has a
> verb that can perform it. If the missing capability is what prevents the
> repair, building that capability is the work.

This does **not** mean every edit must first cause a new tool to be built. The
operator's strongest correction was that measurement, judgment, and
application are different roles. If an existing effector can apply an agent's
case-by-case decision, use it. Do not build another sensor or an automated
decision-maker as a way to postpone machine application.

## 4. MAPE-K mapped to the live package

### Knowledge

The intended K is the journal and its replayable projections. Current durable
material includes:

- ruled lexicon claims and their folded files under `data/lexicon/`;
- term bindings under `data/terms/`;
- proposed work under `data/work/`;
- immutable journal material under `data/logs/` when admitted;
- program-contract evidence admitted by `catalog-verify`;
- Claude transcript-derived claims admitted by `claude-session-admit`.

Important standing caveat: all currently checked-in `data/work/*.json` items
carry charge `unknown`. The training note calls its queue ratified, but the
materialized work claims do not encode that standing. Do not silently upgrade
them to held work.

### Monitor

Live sensors include:

- `lexicon`, `lexicon-census`;
- `term-census`;
- `catalog-verify` and `math-laws`;
- the rest of `src/modules/workbench/`;
- session, work, package, path, export, topology, cohesion, and proof-health
  readouts distributed through the catalog.

Sensors must produce replayable charged evidence when their result matters to
standing. A returned JSON report alone is still agent memory with a longer
route.

### Analyze

Today, analysis is mixed:

- an agent or operator can interpret census results and choose a correct name
  and explicit referent scope;
- program-contract measurement classifies generated behavior with FOUR
  evidence;
- FCA/intension capabilities exist elsewhere in the package, but the queued
  `name-fit` operation does not exist;
- generic stage-wise `localize` does not exist.

Manual judgment is acceptable during bootstrap. Judgment must become explicit
input to an effector or an admitted proposal; it must not remain an intention
in a session.

### Plan

The target representation is an admitted obligation or patch proposal with a
charge, causal evidence, and bounded scope. The current `data/work/` tier is a
partial bootstrap, not yet a reliable dispatcher: the transcript found that
task-token claims and the jural/causal work readers use different
presentations, and the live queue still needs a proved gluing path.

Do not respond to that gap by building fleet machinery before it is required
to perform the current repair. One agent can follow an explicitly ratified
small sequence while dispatch remains unfinished.

### Execute

One important effector is live:

- `lexicon-sweep` rewrites lexical segments across an **explicit file list**,
  preserves case shape and simple plurals, shares its matcher with the census,
  and is dry-run unless `apply: true` is supplied.

The effector deliberately does not discover its own scope and does not decide
meaning. Scope is the referent ruling. Its verdict is external: the relevant
type/build/test gate plus a fresh census.

The general term-repair effector is not live. Terms are stored and compared,
but live operations still take `runTerm` from inline TypeScript. There is no
stored-digest loader, ruled term-rewrite proposer, ratify-and-apply path, or
source realization from a territorialized workspace.

### Verify and ratchet

`pnpm run verify` currently runs TypeScript checking, selected boundary
checks, build, tests, and package checks. Contrary to the transcript plan, it
does **not** currently run `lexicon-ratchet`, `catalog-verify`, or
`term-census`, and no `lexicon-ratchet` operation exists. Therefore a green
package verification is not evidence that the autonomic invariants held.

## 5. The loop that can be run today

For a naming/coherence repair whose meaning and scope can be decided now:

1. Read the current tree, relevant ruling, and working-tree status. Work only
   on a quiet or deliberately isolated scope.
2. Run the census through MetroPlat and retain its reading. Remember that the
   normal CLI journals its own arrival; this is part of the intended territory,
   not a read-only shell command.
3. Decide the referent split. Preserve frozen wire/storage strings and any
   separately ruled senses.
4. Express the decision as `word`, `replacement`, and an explicit list of
   files. Dry-run `lexicon-sweep` first.
5. Inspect the receipt. If the effector cannot express the required safe
   change, improve the effector instead of performing its work manually.
6. Apply the same request with `apply: true`.
7. Run targeted type/tests, then a fresh census over the same scope. The
   census zero/delta and external gates are the verdict.
8. Admit or otherwise durably retain the reading, decision, receipt, and
   verification evidence before treating the repair as settled.
9. Delete any superseded path when the change is architectural. A parallel
   replacement is not completion.

Do not run a broad lexical sweep merely because a lexicon entry is `held`.
`statement → event`, for example, has a held word-level ruling but a frozen
`metroplat.statement` wire value and may have natural-language or technical
referents outside the intended scope. The file list is part of the ruling.

## 6. The self-repair loop that remains to be built

The transcript's APR/CEGIS target is:

1. A behavioral sensor admits a reproducing defect as evidence/obligation.
2. `localize` evaluates a composed RMN operation stage by stage and identifies
   the first schema-refusing seam.
3. `propose-repair` rewrites term data using a ruled move set.
4. Candidates are checked against domain/codomain contracts, an independent
   TypeScript twin where one exists, and applicable law bounds.
5. Survivors are admitted as unknown patch claims with counterexamples and
   evidence.
6. Ratification changes standing; application moves the content-addressed
   term binding.
7. The workspace is realized from admitted territory and checked
   byte-identically, so source becomes a projection rather than a hand-edited
   authority.

Only step 1 is partial and step 0.5 (term census/storage) exists. Specifically:

- `catalog-verify` can admit program-contract evidence, including denied
  evidence with obstruction text, but does not create the richer defect/work
  claim described in the transcript;
- `term-census` compares inline terms with stored bindings and can admit new
  bindings;
- `localize`, `propose-repair`, digest-bound execution, `territory-census`,
  and workspace realization are absent;
- the original `relate-relations` seed-7 defect is not safe to call current:
  later contract and induction changes may have changed it, so reproduce it
  against `HEAD` before using it as the first self-repair target.

## 7. Immediate continuation discipline

Before choosing the next increment, reconcile three sources of standing:

1. live source and package scripts;
2. journal/materialized charges;
3. the training note and transcript queue.

Then choose the smallest increment that moves an actual repair from an agent's
hands into MetroPlat. Likely candidates are:

- exercise and harden the existing census → scoped sweep → external verdict
  loop on one genuinely ratified referent scope;
- add the missing ratchet/behavioral gates only after defining how their
  readings are admitted and accepted;
- close the stored-term execution seam before attempting generic term repair;
- territorialize only the minimum workspace state required for faithful
  realization, then expand coverage by observed need.

Keep architecture reconstruction and autonomic development mutually
correcting: conventional Node ownership must make the effect path legible,
while the paraconsistent substrate must remain the authority for evidence,
standing, contradiction, and replay. Neither a generic clean architecture nor
an elegant autonomic blueprint is allowed to become an `n+1` account beside
the code that actually runs.

The target representation is an admitted obligation or patch proposal with a
charge, causal evidence, and bounded scope. Task-token claims and the
jural/causal work readers use different presentations, and the queue needs a
proved gluing path.

One important effector:

`pnpm run verify` runs TypeScript checking, selected boundary
checks, build, tests, and package checks. A green
package verification is not evidence that the autonomic invariants held.
