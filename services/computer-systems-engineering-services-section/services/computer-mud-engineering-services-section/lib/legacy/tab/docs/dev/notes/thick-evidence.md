---
name: thick-evidence
description: Evidence is a term, not a bit. tab's cells now optionally carry a WITNESS — the intra-action rows that justify each face — the Curry–Howard "term t:p" made of on-disk, content-addressed rows. The thin presence bits are the degenerate case; `aggregate` is the witness-combining join. Additive and opt-in, so the thin path is unchanged; this is the seat from which voidmath-kernel's settle/charge can be re-adopted.
---

# Thick evidence

The voidmath-kernel evidence-carrier note draws the distinction: **thin** evidence is presence bits `(pos,neg) ∈ {0,1}²` (the mark is the trivial `{const:true}`); **thick** evidence is a real witness term — "evidence for p is a term `t : p`" (Curry–Howard) — and the join *combines* the witnesses (`{allOf:[w1,w2]}`) rather than OR-ing bits. tab began thin (the right floor).
This note records the first step toward thick, taken additively so nothing thin breaks.

## What changed

`being(subject, rows, { witness: true })` now emits, per cell, a `witness: { pos:[rowId…], neg:[rowId…] }` — the **intra-action rows that established each face**.
A positive row witnesses the positive face; a converse row witnesses the negative face.
The witness is a proof object: *this cell holds because these cuts occurred* (and, via the existing `enacted-by` reification, by these agents).
It is the on-disk, content-addressed analogue of the kernel's witness term — the rows *are* the proof, and `rowId` is their identity.

`value.aggregate(a, b)` is the **witness-combining join**: a content-addressed union of witness lists, deduped and order-preserving.
Thin evidence is its degenerate case — presence is a single trivial mark and the join is union — so the bilattice arithmetic over `(pos,neg)` is unchanged; `aggregate` is the thick layer's join, used when the marks are real terms.

It is **opt-in**: with `witness` off (the default), `being`'s output is byte-identical to before, so all the thin machinery — `respond`, `observing`, the tick, replay determinism — is untouched.
`settle(root, subject, { witness: true })` threads it to disk-backed reads.

## Why this is the seat for re-adopting the kernel

The kernel hosts the thick join already (`aggregating/scripts/aggregate.mjs`), and under Jakl's result `FOUR ≅ Chu(2,0)`: the thin presence-bilattice is `Chu(2,0)`, thick witnessed evidence is the general `Chu` with real terms in the matrix. tab's witness lists are exactly those matrix entries.
So the migration path is: thin now → witnesses on disk (this note) → import the kernel's `aggregate`/`settle`/`charge` once the witnesses carry enough structure, which then unlocks the deferred depth elsewhere — the **forks oracle** (cone residuation `Act F7.2`, which needs to know *which* rows entangle, `non-confluence-is-choice`) and richer **history** reads (`history-is-geometric`).

## What's deferred

The witness is currently a flat list of `rowId`s.
The kernel's thick evidence carries *structured* terms (proofs with `allOf`/`anyOf` shape) and the spectral/cohomology reads above settle.
Importing `voidmath-kernel` (adding the first intra-repo dependency) waits until the witness terms are structured enough to beat the rolled-in fold — the standing "stabilize then re-adopt" milestone.
Until then tab stays dependency-light, with the witness seat in place.

## Sources

- `development/active/voidmath-kernel/docs/dev/notes/2026-06-01-evidence-the-carrier-and-the-chu-root.md` (thin vs thick; the Chu(2,0) root; `aggregate` combines witnesses)
- `development/active/voidmath-kernel/.../charge/aggregating/scripts/aggregate.mjs` (the kernel's witness-combining join)
- `development/lab/tab/being/scripts/being.mjs` (opt-in witness collection), `being/library/value/scripts/value.mjs` (`aggregate`)
- `development/lab/tab/docs/dev/notes/non-confluence-is-choice.md`, `history-is-geometric.md` (the depth this unlocks)
