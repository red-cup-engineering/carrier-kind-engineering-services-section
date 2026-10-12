---
title: "Stakeholders and Concerns of the Natural Computer Simulation Engine"
description: "The 42010-required grounding of the architecture description, rewritten after the owner rejected a first draft of generic software-process roles: the engine's actual stakeholders are the parties of this project's own world — the owner and the tiyospaye whose research program this is, the natural-computing-science section for which this app is the keystone instrument of the nature-is-computing thesis, the obsmetrological mathematics section for which the engine is the first executable test bench of the proved corpus, the agent-computing verb packages the engine composes, the biological sciences whose honesty constraints bound every claim, and future memoryless agent sessions — each with the concerns they actually hold, and the traceability rule that a view addressing none of them is cut."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-stakeholders-and-concerns
authors:
  - claude-fable-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "iso-42010", "stakeholders", "concerns", "natural-computing-science", "obsmetrologia"]
tags: ["draft"]
---


Per the planning program §2.2. A first draft of this note named
generic software-process roles; the owner rejected it, correctly —
this engine has actual parties, from the project's own world, and
the concerns worth architecting for are theirs.

## Stakeholders

**The owner, and the tiyospaye whose work this is.** Morgan
Sennhauser (emsenn) — researcher, sole finalizer, chairperson of the
561 Group, the corporate structuration of a small, nascent, real
tiyospaye whose research program is relationality: relations as
ontologically prior to entities. The engine is a piece of that
program, not a product. What the owner holds that no other
stakeholder does: the authority to accept or reject every decision,
the only persistent memory across sessions, and finite attention
that the process must respect rather than flood.

**The natural-computing-science section.** This app was founded as
that section's keystone: the section's thesis is that nature *is*
computing — the strong reading, not computation-inspired-by-nature —
and the cell is its paradigm case. The engine is the thesis's first
instrument: the third pole beside mechanistic whole-cell simulation
and learned virtual-cell models, distinguished by admission-as-
judgment membranes and paraconsistent interior state. The section's
concern is that the instrument be capable of *refuting* the thesis'
concrete claims, not merely illustrating them: the falsifiers must
be real experiments, and a failed falsifier gets filed as a
scientific result in the section's notes, the way the 2026-08-21
design corrections already were.

**The obsmetrological mathematics section.** The engine is the
first executable system that composes the proved corpus at scale —
settling closures, the FOUR bilattice, the cohomology, the
reaction-network theorems. Its concerns run both directions: proved
theorems get *used* rather than reinvented (S7 found five the
drafts were about to not use — `joinList_congr`, the CALM chain,
quiescence-as-algebra, the stochastic-settling bridge, Poisson
settling), transcriptions state honestly what is machine-checked
versus conformance-tested (the conformance-vector mechanism is the
house discipline for this), and gaps the engine finds are filed
upstream as mathematics work — the admission guard, the truth-order
lifting, the driven-regime convergence question — instead of being
worked around silently.

**The agent-computing corpus.** The nine verb packages under
`@red-cup-engineering` are the substrate the engine composes:
`relating` now, `animating` and `socializing` at the stages that
earn them. The engine is also the second keystone (beside the JADE
composition over the nine) guiding that corpus's development: what
the engine needs from a package is evidence about what the package
should become. Its concerns: the engine consumes published surfaces
and never forks them; composition kinds are stated; needs are filed
as issues against the packages, dated and specific.

**The biological sciences.** The biology and botany sections, and
through them the discipline itself, hold the honesty constraint:
simulator output is behavior of a formal system until compared to
real data, species-class scope boundaries are stated, and the
literature-verified studies (S5, S6) gate what may be claimed. This
stakeholder also holds the engine's one live gift back to the
field: the futile-cycle cost measurement S6 found the literature
lacks.

**Future agent sessions.** The implementers and maintainers. They
arrive memoryless, read the repo before the owner, and drift — the
external drift review documents exactly how. Their concern, held on
their behalf since they cannot hold it: that the cheap path be the
correct path — standing status as the entry point, LLD-before-code
gates, import-cycle and banned-API checks, batch commits, and no
new scopes, vocabularies, or config files to rediscover.

## Concerns

1. **Refutability of the thesis' claims** — the falsifier
   experiments bear on admission-as-judgment, paraconsistent-hold,
   and gradient-driven settling as stated; failures are publishable
   results. (Natural-computing-science, owner.)
2. **Theorem fidelity** — proved corpus results are used where they
   exist, cited by file, with machine-checked versus
   conformance-tested status stated. (Mathematics section.)
3. **Upstream filing** — substrate gaps become dated filings
   against their owning sections, never silent workarounds.
   (Mathematics section, agent-computing corpus.)
4. **Biological honesty** — formal-system qualifier until real-data
   comparison; scope boundaries by species class; study-gated
   claims. (Biological sciences, owner.)
5. **Replayability** — bit-for-bit reproduction from (scenario,
   seed, engine version); claim-side order-independence carried by
   theorem, chemistry-side by pinned SSA identity and PRNG
   discipline. (All parties; it is what makes a run evidence.)
6. **Physics conformance** — conservation assertions, Wegscheider
   load-checks, scoped TUR windows with bias-corrected σ, V7
   splitting-error convergence on the chemistry side.
   (Natural-computing-science, biological sciences.)
7. **Composition determinacy** — which packages, as which kind of
   reference, with the workspace migration as implementation's
   prerequisite. (Agent-computing corpus, future sessions.)
8. **Reviewability at the owner's pace** — one document per track
   per chunk; batch commits; house note form throughout. (Owner.)
9. **Maintainability by the memoryless** — standing status current;
   gates mechanical; drift detectable by checks, not vigilance.
   (Future sessions, owner.)
10. **Bounded growth with named exits** — evidence budgets with the
    dedup license `joinList_congr` provides; stated upgrade paths
    (Anderson's method, tau-leaping, truth-order adoption,
    retraction via multiplicity encoding) reachable without
    rearchitecting. (Future sessions, mathematics section.)

## Traceability rule

The architecture description's five views (context, functional,
information, behavioral, verification) each declare, in their
opening paragraph, which concerns they discharge. Concerns 4 and 8
are process concerns discharged by the program itself; the other
eight must each be claimed by at least one view, and any view
claiming none is cut.
