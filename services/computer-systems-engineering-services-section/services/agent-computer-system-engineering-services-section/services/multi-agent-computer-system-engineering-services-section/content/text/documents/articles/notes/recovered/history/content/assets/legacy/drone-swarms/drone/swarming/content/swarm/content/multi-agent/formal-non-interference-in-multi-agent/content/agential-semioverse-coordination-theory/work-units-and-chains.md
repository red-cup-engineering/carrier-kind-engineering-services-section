---
title: Work units and chains in the agential semioverse
aliases:
  - "Work units and chains in the agential Semioverse"
date-created: 2026-01-08T00:00:00
date-updated: 2026-03-09T00:00:00
---

## Work units - A work unit is a single skill invocation (identified by manifest `id`) with concrete inputs, a runtime, and a closure (expected outputs). - Each invocation creates a [footprint](../../../../mathematics/objects/universes/interactive-semioverse/terms/footprint.md) (log/audit) tying agent, inputs, outputs, and status to a marking in the [interactive semioverse](../../../../mathematics/objects/universes/interactive-semioverse/index.md). - Units are the atomic transitions for Petri-net/Lean models: enabled by preconditions (tokens) and firing to produce new tokens (outputs/artifacts).

## Chains of work - A chain is an ordered (or [partially ordered](../../../../mathematics/objects/posets/terms/partial-order.md)) set of work units whose outputs feed later inputs. - Chains can be modeled as transitions connected by places: outputs ↔ places, transitions ↔ skills.
Reachability/liveness checks ask if the chain can finish. - Validation steps: 1.
Does each unit have its required inputs satisfied by prior outputs or provided tokens?
2.
Are any shared resources contended (boundedness)?
3.
Is the target closure reachable (reachability)?

## Practical guidance - Explicitly name the inputs/outputs that are passed between units; avoid implicit global state. - Record reference URIs (e.g., encyclopedia ids) alongside tokens to reduce ambiguity in chains. - Prefer small units; split “do-everything” skills into composable steps where possible.
