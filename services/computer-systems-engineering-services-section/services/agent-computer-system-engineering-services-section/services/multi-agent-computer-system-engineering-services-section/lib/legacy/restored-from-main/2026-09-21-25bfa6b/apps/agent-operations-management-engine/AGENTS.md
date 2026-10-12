# AGENTS.md — @red-cup-engineering/agent-operations-management-engine

## What this package is

The operations-management practice for the ecosystem.
It is **downstream** of `@red-cup-engineering/agentic-animation-engine` and `@red-cup-engineering/agentic-relation-engine` and draws its capability from them; it never reaches sideways into the operations manifold site or other consumers.

## Laws to keep

- **Descent, not a new data model.** Every carrier projects to cells over minted relating terms (`src/terms.mts`) and, where it represents work, descends to the animating work algebra (`asWorkItem`, `asWorkProject`).
  Do not invent a parallel ontology — extend the descent.
- **Identity is by interned carrier.** relating identifies terms by reference.
  Always mint terms through `term(...)
  ` / `predicate(...)
  ` in `src/terms.mts` so equal ids coincide.
  Never call relating's `token`/`mark` directly for an entity id — that breaks coincidence with animating governance.
- **Reuse the substrate's morphisms.** δ-dispatch readiness comes from `@red-cup-engineering/agentic-animation-engine` `readyWork`; capacity selection from its `decide`; budgets from its accounting.
  Do not re-implement these — bind to them.
- **Pure modules, thin transport.** Domain logic lives in the module functions; `src/package-bin.mts` only routes a JSON document to a pure morphism.
  Keep it that way.

## Layout

`structuring` (WBS) · `scheduling` (calendars/recurrence/CPM) · `prioritizing` (priority/scoring/capacity) · `flowing` (status/board) · `assigning` (office-dispatch/workload) · `governing` (fleet/swarm approval gates) · `automating` (rules/recurring) · `accounting` (time/budget) · `reporting` (metrics) · `viewing` (view models).
Root: `operate`.

## Build / check

```sh
pnpm --filter @red-cup-engineering/agent-operations-management-engine run check
pnpm --filter @red-cup-engineering/agent-operations-management-engine run build
```
