# Plan: excise the FOUR / per-Belnap-class storage lie from voidmath SPOTCOMP

## Context

Under `development/active/voidmath/…/computer-operating-system/hacking/library/spotcomp/`, the positing-cell cluster encodes two falsehoods:

1. **FOUR is materialized as primary structure.** Belnap FOUR is only the boolean *shadow* of the real value.
  `spotcomp.md`'s own body states the truth: a cell's value is the twist product `L^⋈` over a **general** integral commutative residuated lattice `L`, fiber `A_p = L^⋈^(E×E)`.
  FOUR (L = 2) is a projection, never the substrate.
  Yet the cluster stores, partitions-by, and recovers FOUR as if it were the value.
2. **Logs are partitioned by value-class.** The cluster keeps four per-class logs (`<root>/<class>/<class>.jsonl`, class ∈ {assertion,denial,contestation,abstention}).
  The truth: a log is **per-object** — a thing's `.jsonl` IS its own append-only EAVT trace, dual-filed at the subject (`e`) and predicate (`a`) anchors.
  Class is not an anchor; partitioning by it is a false proof.

Intended outcome: the cluster reflects per-object traces of flat EAVT rows `{e,a,v,t}` where `v` is the object/mark and the value is projected on demand over general `L`. **No mention of FOUR anywhere.** Also fix dangling `$ref`s into the nonexistent `.../predication-cell/positing/...
` and `.../cell-settling-dupe/...
` paths.

**Scope: `active/voidmath/…/spotcomp/` ONLY.** No experimental trees, no carrier-tower work, no agents.

## The truth model (the single design, applied to every file)

- **Per-object trace.** A `positing-log` is one thing's append-only sequence of EAVT rows = an **array of `positing-entry`**.
  Rows reach it by dual-filing at the subject and predicate anchors.
  No root-dir-of-class-files object; no class dirs.
- **Flat EAVT row `{e,a,v,t}`.** `v` is the object entity (slug) or a JSON literal/structure — never a bilattice pair.
  The datum is not a field and is not "implicit by which log it lives in."
- **Value projected on demand.** A cell's charge is the `≤_k`-join of its trace's evidence, valued in the general twist product `L^⋈`.
  Never stored, never partitioned-by, never "recovered as FOUR."

## Tier 1 — core positing-cell cluster

Paths relative to `…/spotcomp/hacking/library/`.

**Rewrite (schemas):** - `positing-entry/positing-entry.schema.json` — keep `{e,a,v,t}`; description: `v` is object entity, datum projected from trace.
Remove "implicit by which of four class logs / path IS its class." - `positing-entry/computing-id/computing-id.schema.json` & `cell-record/library/computing-id/computing-id.schema.json` — drop the `class` enum property + its `required` entry + the "class in hash" rationale; content-address over the row `{e,a,v,t}`.
Repoint dangling `entry` `$ref` to the local row schema. - `positing-entry/persisting/persisting.schema.json` & `cell-record/library/persisting/persisting.schema.json` — drop `class`; description: append the row to the per-thing log(s) at its **subject and predicate anchors** (dual-file), not `<class>/<class>.jsonl`.
Fix the noted positing-log↔catalog name mismatch. - `positing-entry/assembling-trace/assembling-trace.schema.json` & `cell-record/library/assembling-trace/assembling-trace.schema.json` — input: a flat entries array + a cell; output: a `cell-trace` = single t-sorted array.
Remove the four-array product and the assertion/denial/contestation/abstention refs. - `positing-entry/assembling-trace/library/cell-trace/cell-trace.schema.json` — a single t-ordered `entries` array of rows at the cell.
Remove the four class arrays. - `positing-entry/assembling-trace/library/cell-trace/projecting-value/projecting-value.schema.json` — retarget: project the cell-trace to the general `L^⋈` charge via `≤_k`-join of evidence.
Remove all FOUR / `{pos,neg}∈FOUR` language. - `cell-record/cell-record.schema.json` — `v`: remove the `{t,f}` bilattice-pair override (object slug/literal/structure only) and the "asserted-true unless overridden" prose.
Keep `stratum` / `derived-from` / `derived-via`. - `positing-log/positing-log.schema.json` — redefine as the per-thing log: an append-only **array of `positing-entry`** (the thing's trace).
Remove `root-dir` and all class language. - `positing-log/loading/loading.schema.json` — read one per-thing log → array of `positing-entry`.
Remove the four-class walk and the entries-by-class output.

**Rewrite (scripts) — read each, then rewrite to the single-array / per-thing model:** - `positing-log/loading/scripts/load.mjs` — read a thing's `.jsonl` → array of rows (no `<class>` walk). - `positing-entry/assembling-trace/scripts/assembling-trace.mjs` — filter rows to cell, sort by `t` → single array. - `positing-entry/assembling-trace/library/cell-trace/projecting-value/scripts/projecting-value.mjs` — `≤_k`-join over `L^⋈`; remove the FOUR/`pos`/`neg` walk.

**Remove (false things — no generator yields them):** - `positing-entry/library/assertion/`, `…/denial/`, `…/contestation/`, `…/abstention/` (4 `$thing` dirs).

**Narrative:** - `docs/dev/spotcomp.md` — first sentence only: "paraconsistent **four-valued** bilattice computer" → general residuated-lattice framing (FOUR named only as a boolean shadow/specialization, if at all).
Body already states the truth; leave it.

## Tier 2 — consumers (blast radius, all in-scope)

- `envelope/envelope.schema.json` — wire body: per-class `entries-by-class` → **array of `positing-entry`**.
  Update header/description (drop "class encoded by which body field").
- `semantic-hypertext-packet/hacking/library/generating-shp/generating-shp.schema.json` + `scripts/generating-shp.mjs` — projects per-thing settled cells into SHP; remove "four per-class JSONL files / Belnap four-valued projection / assertions.jsonl,…" framing.
- `swarm/taking-consensus/scripts/taking-consensus.mjs`, `swarm/finding-disagreement/scripts/finding-disagreement.mjs`, `swarm/electing-leader/scripts/electing-leader.mjs` — read each first; rewrite to consume per-thing traces (single arrays); drop `loadSchema('#schema/assertion')` etc. and the `pos/neg from class arrays` logic.

## Ref hygiene (do during the rewrites)

Several schemas `$ref` nonexistent paths (`.../predication-cell/positing/library/positing-entry/...
`, `.../cell-settling-dupe/...
`).
Repoint every `$ref` to an existing in-scope schema; after edits, confirm no `$ref` is dangling.

## Verification

1. `grep -rIn -e FOUR -e 𝐅𝐎𝐔𝐑 -e Belnap -e belnap -e bilattice -e per-class -e assertion -e denial -e contestation -e abstention <spotcomp>` (excluding `docs/dev/journal/`) → **zero hits** in the core cluster + Tier-2 files.
2. Every `*.schema.json` parses as JSON (`node -e` / `jq .
  `).
3. Every `$ref` resolves to an existing file (script the `$id`→path check, or grep each ref target).
4. The four class `$thing` dirs are gone.
5. `node --check` each rewritten `.mjs`.
