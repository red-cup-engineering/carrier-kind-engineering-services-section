---
title: "Standing Status of the Natural Computer Simulation Engine"
description: "The always-current status note a fresh session reads first: the app's name is pinned, the planning program governs all work, which documents exist and where they stand, and what the next single job is. Update this note in place as statuses change; do not fork it into dated successors."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-standing-status
authors:
  - claude-fable-5
status: current
keywords: ["natural-computer-simulation-engine", "status", "planning"]
tags: ["status"]
---


**Name**: natural-computer-simulation-engine. Decided 2026-08-21. Not
to be reopened. House backronyms are glossary material, never app or
package names.

**Governing process**: the software planning program
(`2026-08-21-note-on-the-software-planning-program.md`). Studies →
stakeholders → architecture description with ADRs → HLD → per-module
LLDs → implementation, gated in that order. No module is implemented
before its LLD is owner-accepted. Preparatory documents are the work;
code is not rushed.

**Owner's standing corrections in force**: notes in the house note
form with full frontmatter, in this section's notes tree; git commits
batched at natural boundaries, never per edit; no new npm scopes,
`.npmrc` files, or backronym-named artifacts; the packaging future is
the pnpm-workspace migration ruled in the external drift review
(leader-assistant notes, 2026-08-21), run as its own dedicated
session before implementation.

**Documents and statuses**:

- Founding design (app `dev/design/`) — draft input, two false
  premises corrected 2026-08-21.
- Expert panel review — draft input.
- Software shell draft; simulation core draft — draft inputs.
- Planning program — draft-for-owner-review; governs.
- S0, the cell through the settling mathematics —
  draft-for-owner-review; §6 (TUR) recut and §8 updated per S5's
  verification; membrane-localization scoped to declared scenario
  property.
- S1–S6 — all delivered 2026-08-21, draft-for-owner-review, each
  ending in per-decision verdicts; the program note's §2.3 docket
  carries the fold-in. Headline revisions: frame-width bound + V7
  splitting-error target required before the frame ADR passes;
  integer-copy-number scope boundary by species class; provenance
  gate rejustified via open-domain digest dedup; replay must pin SSA
  identity and PRNG draw order; truth-order use-or-defer ruling owed
  by the interior LLD; V6/TUR scoped to constant-Δp windows.
- Stakeholders and concerns — draft-for-owner-review (four
  stakeholders, ten concerns, traceability rule for the views).
- Architecture description, HLD, LLDs, test plan — not yet written.

**Code that exists**: `src/membrane.mjs` (contract stub),
`test/substrate-admission.test.mjs` (passing; pins the substrate's
admission permissiveness), pinned dependency
`@red-cup-engineering/relating@0.1.4`.

**The head-to-head** (S8,
`2026-08-21-note-on-meeting-and-beating-current-virtual-cell-tooling.md`):
the meet gate (COPASI-matching on a BioModels suite plus the physics
suite) and four beat demonstrations — run-the-disagreement (B1,
flagship), computed integration obstructions (B2), thermodynamic
refusal with the dissipation ledger (B3), hash-verified replay (B4)
— with spatial solvers, genome-scale curation, and learned
prediction explicitly conceded. First publication candidate: the
futile-cycle cost measurement.

**Next single job**: the ADR docket acceptance pass, then the
architecture description's views, HLD oriented toward B1–B3.
