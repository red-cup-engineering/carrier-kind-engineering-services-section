---
title: Zone of Proximal Development Lens
description: Defines the ZPD lens for interpreting bilattice composition ratios as learning difficulty levels for task dispatch and gamification.
date-created: 2026-04-06
type: note
name: zpd-lens
keywords:
  - lens
  - bilattice
  - composition-ratio
  - task-difficulty
  - gamification
specialization: plan
application: gamification
project: sunday-funday-sprint
---

## The concept

Vygotsky's Zone of Proximal Development: the space between what a learner can do alone and what they can't do even with help. In between is the zone — what they can do WITH scaffolding. That's where learning happens.

The bilattice gives us this for free. When office and task compose:

| Composition result | What it means | Vygotsky |
|---|---|---|
| All t (agreement) | Office already handles everything this task asks | Below ZPD — too easy, no learning |
| Mix of t and ⊥ | Office handles some, has no information about rest | IN the ZPD — scaffolding available |
| All ⊥ (unknown) | Office shares nothing with this task | Above ZPD — too hard, no scaffold |
| Any ⊤ (conflict) | Office and task actively contradict | Accommodation needed — restructuring |
| Any f (told false) | Office explicitly cannot do this | Blocked — constraint violation |

The ratio IS the difficulty rating. The ratio IS the quest difficulty. The ratio IS the dispatch priority signal. One computation, three applications.

## The entity

A lens is an entity whose predicates define how to interpret another entity's composition. The ZPD lens doesn't compute — message() computes. The lens provides the interpretation vocabulary.

```yaml
id: zpd-lens
introduces: lens
title: "Zone of Proximal Development"
extends: lens
interprets: composition-ratio
too-easy-threshold: 0.8
in-zone-lower: 0.3
in-zone-upper: 0.8
too-hard-threshold: 0.3
conflict-indicator: top-present
theory-source: library/theories/humanities/theories/psychology/terms/zone-of-proximal-development.md
```

### How to use it

Step 1: Compute the composition.
```bash
node systems/fars/message.js first-officer '{"department":"command","work-type":"procedure","status":"open"}'
```

Step 2: Count the values in the composed result:
- t count / total = agreement ratio
- ⊥ count / total = unknown ratio  
- ⊤ count = conflict count

Step 3: Read the ZPD lens predicates to interpret:
- agreement > 0.8 → too easy
- agreement 0.3–0.8 → in zone
- agreement < 0.3 → too hard
- any ⊤ → conflict requiring accommodation

### What makes this a lens, not a tool

A tool would be: `computeZPD(office, task) → {difficulty: "medium"}`. That's procedural.

A lens is: an entity whose predicates define the interpretation. The computation happens via message(). The lens provides vocabulary for reading the result. Different lenses interpret the same composition differently:

- **ZPD lens**: reads it as learning difficulty
- **Dispatch lens**: reads it as assignment quality (high t = good match)
- **Conflict lens**: reads it as governance risk (any ⊤ = review needed)
- **Quest lens**: reads it as game difficulty (mixed = interesting quest)

Same algebra, same composition, different interpretation. The lens IS the view.

### The deeper question

Can the lens itself participate in the composition? Instead of a two-step process (compose, then interpret), could you:

`message(zpd-lens, {office: "first-officer", task: "some-task"})`

And the ZPD lens entity would internally compose office with task, apply its interpretation predicates, and return the result?

This requires the graph expansion plan — the ZPD lens needs to expand `office: first-officer` into first-officer's full fiber before composing. Until expansion works, the lens is a two-step interpretation. After expansion, the lens becomes a one-step operation.

## What this enables for gamification

- **Quest difficulty without game code**: every task has a difficulty relative to every office, computed by the algebra
- **Smart dispatch**: assign tasks in the ZPD — hard enough to be interesting, not so hard they fail
- **Progression tracking**: as an office enriches (gains predicates), its ZPD shifts — tasks that were too hard become in-zone, tasks that were in-zone become too easy
- **The leveling mechanic**: an office "levels up" when its ZPD shifts enough that its current work is all too-easy — time for harder tasks or retirement-as-fold

## Dependencies

- message() working (done)
- The ZPD lens entity created (just a markdown file with the predicates above)
- For one-step operation: graph expansion (the expansion/reduction plan)
- For game integration: the composition ratio needs to be a named output of message() rather than something the caller counts manually
