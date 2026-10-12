# natural-computer-simulation-engine

`natural-computer-simulation-engine` is a keystone app: declared now, as a scaffold, so
that the services beneath it get built toward one composition rather than
toward whatever shape each service's own development happens to take.
Per the section's own ruling on what an app is
(`agent-computer-system-engineering-services-section/services/agent-computer-platform-system-engineering-services-section/content/text/documents/articles/notes/2026/08/19/2026-08-19-note-on-apps-as-global-sections-of-the-service-sheaf.md`):
a service ships scripts; an app ships a *use* of scripts across services.
`natural-computer-simulation-engine` composes no service's scripts yet — its
`dependencies` are deliberately empty (see below) — but the composition it
is declared toward is fixed by the design document in `dev/design/`, and
that fixes what its section's services need to become.

## What it simulates

A single membrane-bounded cell, read as a settling system: the membrane
is the only admission point for opaque data into the cell, the interior
is a predication site whose state is evidence-charged rather than a plain
numeric vector, metabolism is charge-settling driven by a maintained
gradient, death is that gradient's loss, and division is the site
splitting into two. The full argument for this design, its staged
roadmap, and what would show it wrong are in
`dev/design/2026-08-21-natural-computer-simulation-engine-design.md`, the actual deliverable
this scaffold exists to be measured against.

## What it will compose, in the app doctrine's own terms

Four services, each named for the role it plays in the composition, only
one of which (the membrane) is a genuinely new object this app's need
would create:

- **`relating`** — the predication/settling substrate. Supplies the
  category-shaped boundary (carriers, morphisms, settling closures) the
  cell's interior state and metabolic settling are built from. Already
  exists, at `@red-cup-engineering/agentic-relation-engine` (version `0.1.4` as of this
  writing).
- **the membrane/admission machinery** — does not exist yet, anywhere in
  the estate, as a standalone service. The nearest existing material is
  the mark/token/claim admission doctrine and the repeated
  `local-a2a-membrane.mjs` pattern (content-addressed, atomic-write,
  per-provider-scoped admission), both read but not yet extracted into a
  reusable service. This app's own honest placeholder for that gap is
  `src/membrane.mjs`.
- **`animating`** — the agent carrier. Supplies the four-stage agency
  descent (becoming/doing/working/governing) this design uses for the
  cell-as-agent reading once a cell needs to perceive and act, not merely
  settle internally. Already exists, at `@red-cup-engineering/agentic-animation-engine`
  (version `0.1.0`).
- **`socializing`** — the multicellular-run substrate. Supplies the
  multi-observer Social Field (members, observer-category base,
  consensus-limit section) this design's later stage, a sheet of
  signaling cells, would be built from rather than hand-rolled. Already
  exists, at `@red-cup-engineering/agentic-socialization-engine` (version `0.1.0`).

## Dependencies

The original scaffold declared `dependencies: {}` because the corpus
repair then owned the section the three packages live in. That repair
landed the same day (round-2 verification: all nine packages published
green, 674/686 tests corpus-wide), so the rationale is superseded:
`@red-cup-engineering/relating@0.1.4` is now a real pinned dependency,
installed and exercised by the app's own characterization test
(`test/substrate-admission.test.mjs`, which records the substrate fact
the membrane service exists to correct — `composeFibers` admits
foreign predicates without complaint). `animating` and `socializing`
stay undeclared for now: the 2026-08-21 panel synthesis
(the section's `content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-the-stage-1-expert-panel-review.md`) found Stage 1's
own §0 specifies no perceive/act loop, so `animating` is deferred to
the stage that actually uses it, and `socializing` is Stage 4 only.
