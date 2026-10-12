---
title: "Predicated Cosmology"
description: "A cosmology in which the universe is modeled as a predication settling: spacetime events are entities, physical observables are predicates, evidence is bilattice-valued, causality bounds the knowledge order, and cosmic time is a settling bound."
component-of: cosmology
---


A scientific research program: the cosmological theory of *predicated cosmology* — the universe as a [predication settling](../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-settling.md) whose entity set is the set of [spacetime](../../terms/spacetime.md) events, whose predicates are physical observables (temperature, density, polarization, four-momentum, …), whose value bilattice records the evidence that has accumulated about each (event, observable, event) cell along the past light cones reaching observers, and whose closure rules are the laws of physics restricted to causally accessible reindexings.

The reframing is ontological rather than computational.
Predicated cosmology is not "Lambda-CDM with extra mathematical machinery."
It is a claim about *what kind of structure the universe is*: a settling, in the technical sense of [predication categories](../../../../humanities/theories/math/theories/categories/theories/predication-categories/_index.md).
The standard observables of cosmology — the [scale factor](../evolution/terms/scale-factor.md) $a(t)$, the [Hubble parameter](../evolution/terms/hubble-parameter.md), the CMB temperature, the matter power spectrum — appear as projections of that settling onto particular predicates and particular [observers](concepts/observer.md).
The standard puzzles — the [arrow of time](../evolution/terms/cosmic-time.md), the [horizon problem](../evolution/terms/cosmic-inflation.md), the [dark sectors](../structure/terms/dark-matter.md), the [baryon asymmetry](../evolution/terms/baryogenesis.md) — appear as structural facts about the settling: monotonicity of the [knowledge order](../../../../humanities/theories/math/theories/categories/theories/predication-categories/concepts/knowledge-order.md), bounds on [causal evidence](concepts/causal-evidence.md), evidence-asymmetry between predicate fibers, and broken symmetries in the [predication fiber algebra](../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fiber-algebra.md).

The cosmology reformulation of this content lives in the standard cosmology entries: a predicated [cosmological settling](objects/cosmological-settling.md) projects onto the [Friedmann equations](../evolution/terms/friedmann-equations.md) when the [cosmological principle](../../terms/cosmological-principle.md) is enforced as a symmetry on the settling, and onto the [Lambda-CDM model](../../terms/lambda-cdm-model.md) when the predicate fibers are restricted to the standard six.
This subtheory and the parent cosmology entries describe the same universe from different angles: the parent gives the empirical and historical content; this subtheory gives the predication-categorical apparatus and proposes new structural questions the parent cannot phrase.

## Convention

This research subtheory follows the predication-categories research-directory convention.
Every note is a Markdown file with YAML frontmatter; one entity per file; filenames are stable lower-kebab-case slugs.

```yaml
---
type: concept | definition | morphism | theorem | conjecture | question | example | narrative | reference
class: substrate | observable | observer | horizon | symmetry | invariant | ...
status: draft | sketch | proved | open | refuted
depends-on: [...]
realizes: [...]
see-also: [...]
introduces: [...] | recaps: [...] | discusses: [...] | instantiates: [...] | explores: [...]
---
```

## Layout

- `concepts/` — cosmological-semantic anchors that recur across the program (cosmic event, observer, causal evidence, cosmic horizon, cosmic time as settling bound).
- `objects/` — definitions of cosmological-categorical structures (the spacetime entity set, the light-cone predicate category, the cosmological settling, the comoving frame, the CMB quiescent frontier, the dark-sector fiber).
- `morphisms/` — the cosmological moves: light-cone restriction, cosmic-time reindexing, frame change, redshift reindexing.
- `theorems/` — claims linking predicated structure to standard cosmological observations and predictions.
- `questions/` — open structural questions the predicated framing makes phrasable.
- `narratives/` — short rhetorical documents walking paths through the material and bridging to standard cosmology.

## Imported research

A second tranche of upstream material lives in the math-from-relationality-bucket — three abstract precursors that state the same constructions (the Flow KZ-comonad, the residuated sufficiency gap $g$, the Reflexive–Friedmann System) in their generic categorical form before specialization to cosmology: [`reflexive-cosmology.md`](../../../../../../work/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/math-from-relationality-bucket/reflexive-cosmology.md), [`reflexive-hubble-tension.md`](../../../../../../work/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/math-from-relationality-bucket/reflexive-hubble-tension.md), [`reflexive-residuated-sufficiency.md`](../../../../../../work/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/math-from-relationality-bucket/reflexive-residuated-sufficiency.md).
The substantive mathematical content of these three is fully captured by the seven imported entries below; they are cited per-entry as additional provenance.
The third also has scope beyond cosmology — it states the calibration index $g$ generically across instrument inter-calibration domains — and is a candidate upstream source for any future predicated theory of measurement.

## Sibling subtheory

A categorical / multiversal counterpart to this subtheory now lives at [`predicated-multiverse`](../predicated-multiverse/_index.md).
Where this subtheory models a single universe as a [predication settling](../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-settling.md), predicated-multiverse models populations of [worlds-as-nuclei](../predicated-multiverse/objects/world-as-nucleus.md) connected by the [Wood Between the Worlds](../predicated-multiverse/objects/wood-between-worlds.md) liminal mediator.
The bridge between the two subtheories is the open question [does-cosmological-settling-induce-world-structure](../predicated-multiverse/questions/does-cosmological-settling-induce-world-structure.md).

## Imported entries

A body of cosmological research developed in the prior **reflexive-existence** and **relational-history-fiber** programs (sscu-sprint, 2026-02 / 2026-03) has been translated into the predicated framing and now lives inside this theory:

- The **Hubble tension as residuation failure** thread — three sscu-sprint drafts consolidated into [inference-sub-settling](objects/inference-sub-settling.md), [sufficiency-gap](objects/sufficiency-gap.md), [cosmic-time-flow](morphisms/cosmic-time-flow.md), [hubble-tension-as-residuation-failure](theorems/hubble-tension-as-residuation-failure.md), [reflexive-friedmann-coupling](theorems/reflexive-friedmann-coupling.md), and the empirical-plan example [hubble-tension-empirical-plan](examples/hubble-tension-empirical-plan.md).
- The **stellar evolution** nuclei-pair construction → [stellar-evolution-as-predicated-settling](examples/stellar-evolution-as-predicated-settling.md).

Each translated file carries a `## Provenance` section pointing back to its sscu-sprint source.

## Status

Draft.
The theory is being founded.
Most theorems are at sketch status — they state the claim and the predication-categorical machinery it would use, but the proof apparatus has not been worked out in full.
The theory's first job is to put the right structures in place; the second is to formalize the bridge to Lambda-CDM and identify which of the standard puzzles the framing dissolves, which it sharpens, and which it leaves untouched.
