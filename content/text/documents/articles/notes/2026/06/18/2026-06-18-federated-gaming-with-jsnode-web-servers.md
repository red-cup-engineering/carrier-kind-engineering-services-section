---
title: "Federated gaming with JSNode web servers"
date: 2026-06-18
description: "A design note for jsnode-web-computer: treating Node packages, modules, functions, package-bin transports, and whole workspaces as concurrent-game arenas and strategies that can federate across web servers."
sources:
  - sites/research.561.group/content/library/notes/2026-06-17-mysterious-spacetime-geometries-of-the-void.md
  - sites/research.561.group/content/library/notes/2026-06-18-mysterious-machines-strategy-self-and-the-concurrent-game.md
  - sites/koios.news/dev/docs/notes/2026-06-16-jsnode-as-workspace-topology.md
---


`jsnode-web-computer` should be the package that makes the repo's Node workspace playable.
Not playful in the decorative sense, but playable in the categorical sense: a package becomes an arena, an exported module or function becomes a possible move, an executable transport becomes a strategy, and a web server becomes the boundary where other strategies can enter the game.

The research notes give the pieces.
The mysterious-spacetime note gives the engine: admit marks through a codec, run the descent, preserve the trace, read consensus and obstruction, and re-enter the fixed point at the next scale.
The mysterious-machines note gives the operational form: computation is a strategy in a concurrent game with symmetry; process composition is cut; the shell pipe and the package-bin stdin/stdout boundary are already process-as-proof.
The JSNode topology note gives the current local split: `@emsenn/jsnode-ick/workspace` reads package manifests and source imports, while `@emsenn/jsnode-ick/topology` settles those facts into topology carriers and served projections.

The synthesis is straightforward: a JSNode web computer is a concurrent game system whose board is the workspace topology and whose moves are the capabilities the packages expose.

## Arena

At the smallest useful scale, an arena is a module boundary.
The events are the observable affordances around that module: imports, exports, functions, types, package scripts, bins, route handlers, MCP tools, and docs surfaces.
Causal order comes from dependency and call structure: a function cannot be played before the module that exports it is available; a service cannot be played before its upstream package carriers settle; a route cannot be invoked before its app is mounted.
Conflict comes from incompatible versions, reserved route names, mutually exclusive package roles, non-conforming codecs, missing builds, or two strategies that claim the same public surface.
Polarity comes from boundary direction: imports, request bodies, environment, and upstream package facts are Opponent moves; exports, responses, generated docs, conformance findings, and downstream affordances are Player moves.

At package scale, the package is the arena.
At workspace scale, packages compose in parallel over the dependency graph.
At ecosystem scale, workspaces compose by federation: each server publishes enough of its carrier, catalog, graph, conformance state, and strategy surface for another server to play against it without sharing a private filesystem.

## Strategy

A strategy is a lawful way to play one arena into another.
For this package, that means a process or service that reads a whole carrier, emits a whole carrier or projection, records the witness, and does not rely on private ambient state except where the arena declares it.

Examples:

- A `package.json#bin` script is a strategy from stdin carrier to stdout carrier.
- A TypeScript module export is a strategy from imported types and values to exported values.
- A web route is a strategy from HTTP request carrier to HTTP response carrier.
- An MCP tool is the same strategy projected through a tool-call envelope.
- A package documentation generator is a strategy from package topology to prose, diagrams, and linked data.
- A conformance checker is a strategy from package/workspace carriers to charged findings.

This keeps the package-bin web server from being merely a script launcher.
The launcher is only one projection of a richer game object.
The same underlying strategy should be visible as HTTP, WebUX, OpenAPI, MCP, graph data, and documentation.

## Scales

The package should support several nested scales without changing the basic model.

At function scale, the game asks: what does this function require, what does it emit, what laws make it composable, and what failures are real obstructions rather than thrown exceptions?

At module scale, the game asks: what functions and types form a coherent arena, what imports define the Opponent surface, and what exports define Player commitments?

At package scale, the game asks: what scripts, bins, modules, exports, package metadata, docs, and conformance rules make the package playable by another package?

At workspace scale, the game asks: what package dependency graph, role graph, lifecycle graph, consumption graph, and conformance graph describe the common field?

At federation scale, the game asks: what can two web servers exchange so that each can treat the other as a lawful arena instead of an opaque remote API?

The same carrier should climb these scales by re-entry.
A settled function reading becomes a module move.
A settled module reading becomes a package move.
A settled package reading becomes a workspace move.
A settled workspace reading becomes a federated ecosystem move.

## Federation

Federation should not mean a bespoke protocol first.
It should mean parallel composition over published strategy surfaces.

Each `jsnode-web-computer` server can publish:

- a workspace carrier summary;
- package, module, function, and script catalogs;
- graph projections for dependency, consumption, role, and conformance relations;
- operation-surface documents for executable moves;
- signed or content-addressed witness traces for prior plays;
- obstruction reports where composition is blocked.

Another server can then import those projections as Opponent moves.
If the remote package offers a script, the local server can treat it as a strategy over HTTP or MCP.
If the remote package offers only a graph and conformance report, the local server can still play documentation, analysis, or planning games against that surface.
If two servers expose compatible carriers, their games compose directly.
If not, the obstruction is a first-class finding: a codec mismatch, a missing invariant, a route collision, an unbuilt declaration surface, or an untrusted witness.

This gives federation the same shape as the repo's substrate discipline: no hidden deletion, no bare boolean compatibility, no private magic.
There are carriers, witnesses, obstructions, and projections.

## WebUX

The WebUX should make the game inspectable.
The first view should not be a marketing page; it should be the current arena.

Useful views:

- package graph: packages as arenas, dependency edges as causal structure;
- module graph: source modules, exports, imports, and internal moves;
- function graph: functions/types as local moves with input/output carriers;
- strategy catalog: package-bin, HTTP, MCP, and module-export strategies;
- obstruction board: conformance findings, missing declarations, route conflicts, version drift, build gaps;
- witness trace: previous plays, generated docs, graph projections, and settlement stages;
- federation map: remote servers and the surfaces they publish.

The categorical diagrams should not be separate illustrations.
They should be projections of the same carrier that the server uses to run.
Clicking a package node should reveal its module arena.
Clicking a module should reveal exported moves.
Clicking a move should reveal its strategy surfaces: function signature, package-bin transport, HTTP route, MCP tool, tests or conformance witnesses, and docs.

## Package Shape

The package should probably sit above the current pieces:

- `@emsenn/jsnode-ick/workspace` reads workspace/package facts and consumption edges.
- `@emsenn/jsnode-ick/topology` settles workspace/package topology and serves topology projections.
- `@emsenn/jsnode-ick/package-lint` projects conformance findings for package arenas.
- `@emsenn/jsnode-ick/package-bin-transport` projects package-bin affordances through JSNode ICK HTTP/MCP transports.
- `@emsenn/jsnode-ick/package-bin-web` provides WebUX, catalog, discovery, OpenAPI, HTTP, and MCP projection for package-bin computing.
- `@emsenn/gaming`, `@emsenn/computing`, `@emsenn/animating`, and `@emsenn/relating` provide the upstream algebra for games, process, agency, and relation.

`jsnode-web-computer` should compose these into a higher-level computer:

1. Discover package/workspace carriers.
2. Induce topology and conformance facts through JSNode ICK readings.
3. Project arenas at function, module, package, workspace, and federation scales.
4. Project strategies through web transports.
5. Render categorical diagrams from the same carrier.
6. Record witnesses and obstructions as game traces.
7. Admit remote web computers as federated arenas.

This package should not replace JSNode ICK package-bin WebUX.
It should explain and extend it: the web server is the transport boundary for executable package strategies; the web computer is the arena that lets those strategies participate in larger games.

## Why This Matters

The immediate value is better repo orientation.
Agents and humans need to see how packages, modules, functions, and services compose.
Static dependency graphs are useful, but they do not show what can be played.
A concurrent-game view shows the affordance surface: what can move, what must move first, what conflicts, what settles, and what remains obstructed.

The deeper value is that this makes the package ecosystem itself a computer.
Each package is not just code on disk; it is a strategy-bearing node in a federated arena.
Each server is not just an HTTP process; it is a player exposing lawful moves.
Each dependency edge is not just installation metadata; it is a causal relation in a game of computation.
Each conformance failure is not a failed checklist item; it is an obstruction in the arena that must be measured before composition can continue.

That is the route from Node packages to federated gaming: read the workspace as a carrier, settle its topology, render its arenas, expose its strategies, and let other servers play against them.
