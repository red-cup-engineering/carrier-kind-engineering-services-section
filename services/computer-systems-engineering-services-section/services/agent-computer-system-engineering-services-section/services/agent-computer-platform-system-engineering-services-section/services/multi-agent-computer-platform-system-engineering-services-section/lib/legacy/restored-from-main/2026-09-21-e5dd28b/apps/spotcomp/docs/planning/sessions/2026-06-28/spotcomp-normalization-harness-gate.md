# Plan: Set up a SPOTCOMP-normalization harness for Claude

## Context

The repo holds ~9k research notes whose proofs need to be placed into the running tree at the positions the math says they belong (per CLAUDE.md).
The placement discipline is governed by the SPOTCOMP spec (canonical: `development/experimental/emsenn/active/hacking/spotcomp/HANDROLLED-SPOTCOMP-SPEC.html`) and the TRC spec (under `development/claude/.../typed-resource-catalog/docs/dev/specification.md`).
Across sessions, Claude (me) repeatedly needs to: check whether a schema's location matches its derivation chain, check whether a directory's files conform to the per-thing layout (schema.json + jsonl + scripts/), and notice when migrating lab content into active/ would violate dual-filing or slug-discipline.
Right now these checks are partly built but not connected:

- `check-placement.mjs` exists as a sophisticated cone-apex matcher returning five status values, but is not wired into anything that fires automatically.
- The PreToolUse `gate.mjs` enforces only two crude heuristics (`library/<gerund>/` and `library/library/`); it ignores the real placement checker.
- The test runner at `development/active/tests/run-potential-tests.mjs` has a clean registry pattern (`{id, file, suites, paths}`) with 16 checks across 5 suites — but no check verifies SPOTCOMP per-thing conformance.
- The 15 SPOTCOMP invariants from the spec (dual-filing, slug pattern, gerund discipline, schema/jsonl colocality, monotone covenant, scripts-only-in-morphisms, …) have no mechanical verifier.

The aim of this plan is to set me up — not to do the normalization work, but to give me a harness I can lean on across sessions.
The first deliverable is a journal entry that captures the exploration and the proposed wiring; subsequent deliverables wire one piece at a time.

## Recommended approach

Build incrementally on the existing test-registry + gate + check-placement.mjs infrastructure.
Do not introduce a parallel harness.
Each increment is small and independently committable.

### Increment 0 — Clean up CLAUDE.md before anything else

CLAUDE.md is the load-bearing context every future Claude session reads first.
It is currently materially out of date in five concrete ways (each verified against the on-disk tree this session):

1. **FOUR realization path is pre-regime-grammar.** CLAUDE.md gives the path as `articulating/library/articulation-cell/predicating/library/predication-category/.../bilattice/library/four/`.
  That path does not exist on disk.
  The actual path is `articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/library/variety/library/lattice/taking/library/twist-product/equipping-with-negation/library/bilattice/library/four`.
  Fix: replace the path in the "Where this lives in the potential tree" paragraph under the FOUR proof.

2. **Articulation-cell names are pre-regime-grammar.** CLAUDE.md lists the four phase-cells as `potential-articulation-cell` / `active-articulation-cell` / `stable-articulation-cell` / `absurd-articulation-cell`.
  No `articulation-cell` directory exists.
  Per the four-regime grammar (already in CLAUDE.md), the four phase-cells live regime-prefixed under `aperiodic-predication-cell`.
  Fix: rewrite the bulleted list to use the regime-prefixed names that match the actual tree.

3. **TRC spec path is wrong by the same regime-prefix gap.** Under "What Lives Inside the Directory" the TRC spec is referenced at a path containing `predication-category`; actual path contains `transfinite-predication-category`.
  Confirmed location: `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/thing/library/system/library/operating-system/library/computer-operating-system/hacking/library/spotcomp/hacking/library/typed-resource-catalog/docs/dev/specification.md`.
  Fix: update the path.

4. **The "Open task list (2026-05-27 session)" is stale.** Today's `development/potential/docs/dev/journal/2026-05-28.md` contains six numbered corrections (scott-continuous-posit-trace placement, predication-cell-trace relocation, predication-valuation operation placement, finite-trace-family handling, …) that the task list does not reflect.
  Several listed tasks appear substantially done: Task 4 (entity-set placement) is realized at `predication-cell-set/library/predicate-set/library/predicate-category/library/category/library/entity-set`; Task 5 (predication-fiber-algebra) is realized at `transfinite-predication-category/positing/library/predication-fibration/library/predication-fiber-algebra`.
  Fix: re-audit each numbered task against the actual tree, mark done what is done, fold in the six 2026-05-28 corrections, and re-date the section header to the new session.

5. **Internal inconsistency between the two halves.** The first half (FOUR proof, articulation-cell paths, "Locating a File" procedure) was written against the pre-regime-grammar chain; the second half ("The four-regime grammar (stabilized 2026-05-27)") is the new grammar.
  The first half was never reconciled.
  Fix: read each path-mentioning paragraph in the first half and update it to thread through the regime-prefixed chain.

The cleanup is a normalization pass on CLAUDE.md itself — exactly the kind of work the harness will later automate.
Doing it by hand once first is the manual rehearsal that informs what the automated check has to find.
Capture a brief note in the journal entry from Increment 1 about what kinds of staleness showed up here, since each one is a candidate invariant for the SPOTCOMP-conformance suite (e.g. "every path-mention in a doc resolves to an on-disk directory").

### Increment 1 — Journal the exploration (first code-impacting commit)

Create `docs/dev/journal/claude/` at the repo root and write `2026-05-28.md` capturing:

1. The three pieces that already exist (test-registry, check-placement.mjs, gate.mjs) and the gaps between them.
2. The 15 SPOTCOMP invariants and which are checked today vs. which aren't (use the Explore-agent findings from this session as the source — they're in conversation context, not the journal).
3. The wiring proposal (Increments 2–4 below) in enough detail that a future Claude session can resume cold.
4. A short list of "questions for emsenn" that surface placement ambiguities — e.g., are `docs/` invariants in scope for the harness, or only substrate files.

This journal entry is the artifact the user explicitly asked for.
It is also the "checkpoint" — once it's on disk, future sessions can ground themselves in it via the standard journal-reading discipline.

### Increment 2 — Wire `check-placement.mjs` into the test runner

Add a new check entry to `development/potential/tests/run-potential-tests.mjs`:

```
{
  id: 'placement-conformance',
  file: './check-placement-conformance.mjs',
  suites: ['schema', 'quick'],
  alwaysChanged: true,
}
```

Write `development/active/tests/check-placement-conformance.mjs` as a thin wrapper that: - Walks all `*.schema.json` under `development/active/`. - Calls the existing `check-placement.mjs` for each. - Aggregates results by the five statuses it already returns (`properly-placed`, `properly-placed-with-admitted-gaps`, `id-mismatch`, `no-id-in-schema`, `schema-unreadable`). - Fails the suite when anything other than the two `properly-placed*` statuses appears.

Reuse, don't reimplement.
The cone-apex logic in `check-placement.mjs` is already correct and load-bearing.

### Increment 3 — Add a SPOTCOMP-conformance check, one invariant at a time

Each invariant gets one file under `development/active/tests/`.
Suggested first three, in order:

1. `check-spotcomp-thing-layout.mjs` — for every directory containing a `.schema.json`, confirm a sibling `.jsonl` exists; for morphism directories (those with `scripts/`), confirm at least one `<imperative-slug>.mjs` is present.
2. `check-spotcomp-slug-discipline.mjs` — for every path segment under `development/active/`, confirm it matches `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`; for every `a` field in every `.jsonl` row, confirm it contains the substring `ing`.
3. `check-spotcomp-monotone-covenant.mjs` — for every morphism schema, confirm `"monotone": true` is declared.

Register each in the suite list with `suites: ['schema']` (and `'quick'` for the cheap ones).
Later increments add the dual-filing law check (this is the most mechanically valuable — it verifies every EAVT row appears in exactly two logs).

### Increment 4 — Upgrade `gate.mjs` to call `check-placement.mjs`

Replace the two crude heuristics with a real call to `check-placement.mjs` for any tool call writing/editing a `*.schema.json` file.
When the placement status comes back as `id-mismatch` or `no-id-in-schema`, the gate blocks with the cone-apex's diagnostic message.
The two heuristics stay as cheap pre-filters before the cone-apex call.

### Increment 5 — Surface the harness in CLAUDE.md and MEMORY.md

Once the above is wired, add a short pointer in CLAUDE.md (under a new "Procedures > Running the harness" subsection) and save a `reference_normalization_harness.md` memory pointing at the test scripts and the gate.
This is the discoverability step — without it, future Claude sessions won't find the harness.

## Critical files to reuse (do not reinvent)

- `development/active/tests/run-potential-tests.mjs` — registry.
  Add to the `tests` array; don't fork the runner.
- `development/active/articulating/library/.../spotcomp/hacking/checking-placement/scripts/check-placement.mjs` — cone-apex matcher.
  Import and call; don't reimplement.
- `development/active/articulating/library/.../spotcomp/hacking/library/tool/hacking/library/pre-tool/hacking/using/scripts/gate.mjs` — PreToolUse gate.
  Edit in place; don't add a parallel hook.
- `development/experimental/emsenn/active/hacking/spotcomp/HANDROLLED-SPOTCOMP-SPEC.html` — source of truth for invariants.
  Re-read when an invariant's definition is unclear.
- `development/claude/.../typed-resource-catalog/docs/dev/specification.md` — TRC spec.
  Same role; the two specs agree on the per-thing layout.
- AJV 2020 (`ajv/dist/2020.js`) — already imported across the existing checks.
  Reuse.

## Verification

After Increment 0: `grep -n "articulation-cell/predicating" CLAUDE.md` returns nothing (the stale pre-regime path is gone).
Every path mentioned in CLAUDE.md resolves to an on-disk directory: `for p in $(grep -oE 'articulating/library/[a-z0-9/-]+' CLAUDE.md | sort -u); do [ -e "development/active/$p" ] || echo "MISSING: $p"; done` prints nothing.
The "Open task list" header is re-dated to today and reflects the six 2026-05-28 corrections from the potential journal.

After Increment 1: `git log --oneline -1` shows the journal commit; `ls docs/dev/journal/claude/` shows `2026-05-28.md`.

After Increment 2: `cd development/active && npm run test:schema` runs the new placement-conformance check and reports a per-status count over all schemas in active/.
The expected first-run output is informative, not necessarily green — it exposes how much existing placement is correct.

After Increment 3: `npm run test:schema` includes the three new invariant checks.
Each prints offending paths when it fails.

After Increment 4: Attempting to Write a `.schema.json` to a wrong path triggers the gate with a cone-apex diagnostic, not the crude heuristic.
Verified by attempting one deliberate misplacement in a scratch branch.

After Increment 5: A fresh Claude session reading CLAUDE.md and MEMORY.md finds the harness within the first few file reads.
