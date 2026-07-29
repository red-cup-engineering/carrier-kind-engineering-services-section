# 561 Group Operations Manifold category map

561 Group Operations Manifold is the agent-facing orchestration package for this repository.
It does not define JSNode, LLM, gaming, or web ontology.
It admits those upstream carriers through a small set of orchestration and transport projections.

## Base

The base object is the 561-group workspace as an agent-observable computing environment:

```text
repo evidence
-> upstream carriers
-> agent arena / workspace readings
-> transport projection
```

561 Group Operations Manifold should not treat HTML, JSON, CLI output, package manifests, dependency graphs, or scripts as its ontology.
Those are boundary witnesses over carriers owned by `@emsenn/computing`, `@emsenn/organizing-with-llm-agents`, `@emsenn/organizing-with-jsnode`, `@emsenn/gaming`, and `@emsenn/web`.

## Modules

| Module | Category role |
| --- | --- |
| `@emsenn/561-group-operations-manifold` | Root callable surface. Dispatches named 561 Group Operations Manifold actions through the same script map used by HTTP and CLI. |
| `./serve` | Executable HTTP boundary for the live `ops.561.group` process. |
| `./scripts` | Internal script/action map used by package-script entrypoints. Each action is a transport projection of a package capability, not a separate implementation. |
| `./agents` | Agent harness projection: LLM harness carrier, computing observation arena, gaming strategy, and capability-check play. |
| `./agents/arena` | Computing observation arena for “inspect existing capability before inventing code.” |
| `./agents/strategy` | Gaming strategy and flow reading over that arena. |
| `./agents/harness` | `@emsenn/organizing-with-llm-agents` harness and run carriers for 561 Group Operations Manifold as an agent harness. |
| `./capabilities` | Workspace capability search over `@emsenn/organizing-with-jsnode` package/function/type readings. |
| `./workspace` | Workspace dependency graph and SVG/JSON projections over `@emsenn/organizing-with-jsnode` readings. |

## Transport

The live app is a thin `@emsenn/jsnode-ick/package-bin-web` projection over 561 Group Operations Manifold's package scripts:

```text
package.json#bin
-> jsnode package-script catalog
-> WebUX / OpenAPI / MCP / HTTP POST
```

Adding a feature means first finding or building the carrier in the proper upstream package, then mounting that carrier's reading here.
561 Group Operations Manifold code should mainly select, compose, and project; it should not reimplement upstream discovery, graphing, inference, game analysis, or transport mechanics.

## Current agent play

The current 561 Group Operations Manifold agent arena has four moves:

1. request
2. inspect existing capabilities
3. choose an existing carrier
4. mount a transport projection

The successful play is used by `capability-check` when the workspace already has a matching package, function, or type.
The obstructed play stops after inspection when no carrier is found.

The strategy is intentionally visible through the `operations-manifold-agents` package script and its `/operations-manifold-agents` HTTP/MCP transport projections; agents should be able to see the harness that is supposed to stop them from inventing duplicate code.
