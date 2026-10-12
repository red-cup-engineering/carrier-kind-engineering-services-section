# Obsmetrologia theorem audit

Audits and derives operational records from the scientific Obsmetrologia Lean
corpus: it censuses theorems, axioms, identification sites and keys, module
strata, and regime instantiations, and it runs the proof-work-order line —
parsing a work order, admitting it as a fabrication specification, running
its gates (`lake build`, an axiom census, the Blueprint chart, the manual
build), and binding a realization receipt. `npm test` runs the suite.

## Axiom law

The Obsmetrologia Lean library admits no axioms except `Quot.sound`.
`propext` and `Classical.choice` are never within any work order's budget,
and no other axiom is either — `ALLOWED_AXIOMS` in `src/proof-work-order.mjs`
is the law's single source of truth in this codebase.

`sorry` is not banned from the library. A theorem proved by `sorry` is a
stated frontier claim, and Lean reports it as depending on `sorryAx`; the
whole-library gate (`scripts/gate-axiom-law.mjs`) counts such theorems as
frontier and does not fail on them. What `sorry` cannot do is realize a proof
work order: a work order promotes a blueprint node to proved, so `sorryAx`
stays outside every order's budget (`FORBIDDEN_AXIOMS`).

The two work orders under `content/work-orders/` in the obsmetrological
section that predate this ruling (`hat-metatile-substitution-witness.json`,
`hat-reflection-frequency.json`) budget `propext`. They are left unmodified
as historical records of what was admitted before 2026-09-21; under the
current law they would not re-admit, and this tooling does not retroactively
rewrite them.

Two gates enforce the law going forward:

- `parseProofWorkOrder` refuses, at parse time, any order whose
  `axiomBudget` names an axiom outside `ALLOWED_AXIOMS`, with failure code
  `AXIOM_OUTSIDE_LAW` (a `sorryAx` entry fails earlier, as `FORBIDDEN_AXIOM`).
  `candidateOfProofWorkOrder` also states the law itself — not the order's
  own budget — as the `axiom-discipline` constraint of every admitted
  specification, citing the law's locator.
- `axiomBudgetFindings`, which reads a real axiom census back against an
  order, flags any axiom outside `ALLOWED_AXIOMS` as `axiom-outside-law`
  independently of the `axiom-outside-budget` check — belt and braces,
  so a declaration is never cleared by an order whose own budget was wrong.
