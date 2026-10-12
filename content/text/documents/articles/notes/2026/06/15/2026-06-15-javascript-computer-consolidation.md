---
title: "JavaScript/JSNode computer app consolidation plan and module inventory"
description: "A survey of the four *-computer apps, a plan to fold their capabilities into lib/jsnode, and the first verified additive slice (the pure dependency-graph analysis cluster)."
date: 2026-06-15
status: salvaged-from-tmp
source: "/tmp/claude-1001/-home-emsenn-561-group/e5fced88-124c-4481-a94f-3939e05f74d5/tasks/wfjkigz8l.output"
---

# JavaScript/JSNode computer app consolidation

**Goal:** Fold the `*-computer` apps' capabilities into `lib/jsnode`: survey, write a consolidation plan, land one verified additive first slice.

## Module inventories

### `@emsenn/javascript-computer` (source-app)

Path: `/home/emsenn/561-group/apps/javascript-computer`

- App deps: `@emsenn/javascript`, `typescript`
- App exports: `.
  `, `./cli`
- Bin entries: `./dist/cli.mjs`

| Module | Purpose | Pure | I/O | External deps | App-shell only | Recommended destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/introspect.mts` | Project TypeScript declaration surfaces (.d.ts files) into TypeCatalog via the TypeScript compiler API, extracting classes, interfaces, type aliases, and functions. | no | fs, process | typescript | no | `./analysis` |
| `src/documentation.mts` | Extract the documentary surface (name, kind, signature, JSDoc) of exported symbols from source files using syntactic parsing. | no | fs | typescript | no | `./analysis` |
| `src/documentation-edit.mts` | Locate exported symbols with character spans and provide pure transforms to rewrite JSDoc blocks without modifying code. | no | fs | typescript | no | `./analysis` |
| `src/imports.mts` | Read import/re-export/dynamic-import bindings from source files, projecting the demand surface (what modules consume) as the dual of supply. | no | fs | typescript | no | `./analysis` |
| `src/cli.mts` | CLI entry point: parse arguments, call introspectDirectory, and output TypeCatalog as JSON. | no | process.stdout, process.stderr, process.argv | — | yes | stays-app |
| `src/index.mts` | Public library export surface: re-exports the introspection, documentation, import-reading, and JSDoc-editing functions. | yes | — | — | no | `./analysis` |

### `@emsenn/jsnode-computer` (source-app)

Path: `/home/emsenn/561-group/apps/jsnode-computer`

- App deps: `@emsenn/javascript-computer`, `@emsenn/jsnode`
- App exports: `.
  `, `./workspace`, `./cli`
- Bin entries: `./dist/cli.mjs`

| Module | Purpose | Pure | I/O | External deps | App-shell only | Recommended destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/cli.mts` | Historical CLI entry point: parsed args and dispatched to workspace commands (search, describe, analyze, boundary linting) | no | process.stdout, process.stderr, fs | — | yes | becomes-thin-script |
| `src/workspace.mts` | Filesystem walker: reads package.json manifests into JSNodePackage carriers, discovers workspace stratification (lib/apps/services/sites/ops) | no | fs | @emsenn/javascript-computer | no | `./workspace` |
| `src/graph.mts` | Workspace dependency DAG: projects JSNodeWorkspace onto its internal package-to-package edges, supports ego-graph slicing | yes | — | @emsenn/jsnode/topology | no | `./topology` |
| `src/analysis.mts` | Graph geometry: components, cycles, diameter, centrality, strata via BFS/Tarjan; role/domain quotient projections; grading analysis | yes | — | @emsenn/jsnode/topology | no | `./analysis` |
| `src/dependencies.mts` | External & internal dependency report: every declared dep (all kinds), usage counts, drift detection (version range conflicts) | yes | — | @emsenn/jsnode/topology | no | `./analysis` |
| `src/consistency.mts` | Health audit: Node engines, script coverage, module-type spread (ESM/CommonJS), missing descriptions/licenses, drift summary | yes | — | @emsenn/jsnode/topology | no | `./analysis` |
| `src/domain.mts` | Domain-facet catalog & quotient: groups packages by domain prefix, per-domain members, roles, cross-domain edges; domain SCC analysis | yes | — | @emsenn/jsnode/topology | no | `./analysis` |
| `src/role-catalog.mts` | Role-facet catalog: joins ROLE_LEXICON to workspace, catalogs packages by role, per-role members, coverage, cross-role edges | yes | — | @emsenn/jsnode/topology | no | `./analysis` |
| `src/lifecycle.mts` | Disposition & maturity: groups packages by lifecycle (active/maintenance/deprecated/abandoned) and maturity (experimental/alpha/beta/stable); migration debt edges | yes | — | @emsenn/jsnode/topology | no | `./analysis` |
| `src/build-order.mts` | Topological sort: tiers packages (Kahn's algorithm) respecting dependency order; detects cycles; max parallelism | yes | — | — | no | `./analysis` |
| `src/boundary.mts` | Package boundary linting: verifies dist/src separation, checks main/types/exports/bin point to built ./dist surfaces (`*.mjs` plus native declarations such as `*.d.mts`), no .ts in src, no raw .ts in exports | yes | fs (in lintPackageBoundary; packageBoundaryFailures is pure) | — | no | stays-library-operation |
| `src/consumption.mts` | Demand-side import tracing: walks source files (skip dist/node_modules), introspects imports, resolves provider packages, detects coarse import modes (namespace/star/dynamic) | no | fs | @emsenn/javascript-computer, @emsenn/jsnode/topology | no | `./workspace` |
| `src/type-index.mts` | Supply-side API catalog: walks all built dist/*.d.ts files, introspects types/functions/subtypes, attributes each to its source package | no | fs | @emsenn/javascript-computer | no | `./workspace` |
| `src/symbol-graph.mts` | Package symbol graph: projects one package's type index onto categorical (objects=types, morphisms=functions) with param/return/extends edges | yes | — | — | no | `./analysis` |
| `src/type-flow.mts` | Type-level composition category: joins functions across packages where codomain-meets-domain; addressable-only (non-ambiguous types); computes reachability & hubs | yes | — | — | no | `./analysis` |
| `src/layout.mts` | Graph layout engine: Sugiyama layered layout (longest-path ranking, barycenter ordering) for both dependency and symbol graphs | yes | — | — | no | `./codecs` |
| `src/svg.mts` | Dependency graph SVG renderer: builds clickable SVG with grouped layers, titled nodes, data attributes (name/layer/from/to) for browser & LLM consumption | yes | — | @emsenn/jsnode/topology | no | `./codecs` |
| `src/symbol-svg.mts` | Symbol graph SVG renderer: shaped SVG with kind-based node rendering (class=rectangle, interface=dashed, type-alias=parallelogram, function=pill) | yes | — | — | no | `./codecs` |
| `src/spectrum.mts` | Exact spectral analysis: Laplacian, determinant, char-poly, spanning-tree count via bigint arithmetic on ego-graph neighbourhoods; numeric fallback | yes | — | — | no | `./analysis` |
| `src/index.mts` | Root re-export: aggregates all public modules, types, and exports for the package | yes | — | — | no | stays-app |

### `@emsenn/jsnode-content-computer` (source-app)

Path: `/home/emsenn/561-group/apps/jsnode-content-computer`

- App deps: `@emsenn/content`, `@emsenn/content-computer`, `@emsenn/javascript-computer`, `@emsenn/jsnode-computer`
- App exports: `.
  `, `./surface`, `./cycle`, `./cli`
- Bin entries: `src/cli.mts`

| Module | Purpose | Pure | I/O | External deps | App-shell only | Recommended destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/audit.mts` | Deterministic documentation-coverage audit: compares exported surface against on-disk reference docs to report which load-bearing symbols are documented | yes | — | — | no | `./content` |
| `src/surface.mts` | Read a package's documentary surface from disk: walks source files, extracts doc surfaces via javascript-computer, deduplicates and ranks symbols, reads manifest and existing README | no | fs | @emsenn/javascript-computer | no | `./content` |
| `src/cycle.mts` | One witnessed documentation cycle: ask model for prose per symbol, judge with gates, revise when gate fails; compose package reference and README from symbol cycles | yes | — | @emsenn/content | no | `./content` |
| `src/cli.mts` | Bind documentation cycle to filesystem, provider selection, and CLI parsing; implements document/reference/readme/audit commands that read packages, call models, write results, manage run traces | no | fs, process.env, process.stdout, process.stderr, process.argv, process.cwd, clock | @emsenn/content-computer, @emsenn/content | yes | stays-app |
| `src/index.mts` | Public barrel export: re-exports surface, cycle, and audit modules plus convenience re-exports from @emsenn/content/topology/documentation | yes | — | @emsenn/content | no | becomes-thin-script |

### `@emsenn/jsnode-doc-computer` (source-app)

Path: `/home/emsenn/561-group/apps/jsnode-doc-computer`

- App deps: `@emsenn/javascript-computer`, `@emsenn/jsnode-computer`
- App exports: `.
  `, `./audit`, `./scaffold`, `./readme`, `./agents`, `./claude-md`, `./reference`, `./coverage`, `./manage`, `./cli`
- Bin entries: `dist/cli.mjs`

| Module | Purpose | Pure | I/O | External deps | App-shell only | Recommended destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/index.mts` | Package re-export barrel aggregating all public modules (audit, scaffold, readme, agents, claude-md, reference, coverage, manage) | yes | — | — | no | stays-app |
| `src/cli.mts` | CLI entry point: parses command-line arguments and routes commands (audit, scaffold, readme, agents, claude-md, reference, coverage, symbols, show, set-doc) to their handlers with fs I/O binding | no | fs, process.stdout, process.stderr, process.cwd, process.argv | @emsenn/jsnode-computer | yes | stays-app |
| `src/audit.mts` | Check which documentation artifacts (README.md, AGENTS.md, CLAUDE.md, dev/ tree) are present or missing for one or all packages in a workspace | no | fs | — | no | `./workspace` |
| `src/scaffold.mts` | Create the standard dev/ directory structure (dev/docs/{explanations,guides,tutorials,references}, dev/planning/) for packages, idempotent and safe to re-run | no | fs | — | no | `./workspace` |
| `src/readme.mts` | Generate README.md content (title, description, usage, subpaths, dependencies) from package.json manifest; pure function over manifest shape | yes | — | — | no | `./codecs` |
| `src/agents.mts` | Generate AGENTS.md content (agent instructions, key symbols, dependencies, invariants) from package manifest; pure function over manifest shape | yes | — | — | no | `./codecs` |
| `src/claude-md.mts` | Generate CLAUDE.md content (Claude Code context: build commands, invariants) from package manifest; pure function over manifest shape | yes | — | — | no | `./codecs` |
| `src/reference.mts` | Read package API surface (exported symbols with JSDoc and signatures) from source files via javascript-computer and render as Markdown API reference; split into fs-reading readPackageApi and pure generateApiReference | no | fs | @emsenn/javascript-computer | no | becomes-thin-script |
| `src/coverage.mts` | Measure JSDoc coverage of a package's exported API (ratio, documented count, undocumented list); wraps pure docCoverage with fs-reading packageDocCoverage | no | fs | @emsenn/javascript-computer | no | becomes-thin-script |
| `src/manage.mts` | Workspace-aware symbol management: locate exported symbols by name across a package's source, read their full text (with optional JSDoc), and rewrite JSDoc without touching code; wraps javascript-computer syntactic ops with fs and file-path resolution | no | fs | @emsenn/javascript-computer | no | becomes-thin-script |

### `@emsenn/jsnode` (destination-lib)

Path: `/home/emsenn/561-group/lib/jsnode`

- App deps: `@emsenn/javascript`, `@emsenn/relating`, `@emsenn/web`
- App exports: `.
  `, `./codecs`, `./topology`
- Bin entries: (none)

| Module | Purpose | Pure | I/O | External deps |
| --- | --- | --- | --- | --- |
| `src/index.mts` | Root module re-exporting topology and codecs subpaths for discoverability | yes | — | — |
| `src/topology/index.mts` | Export surface for topology module: package models, carriers, predicates, lifecycle/maturity, workspace settlement | yes | — | — |
| `src/topology/coordinate.mts` | Parse package names into (domain, role) coordinates; manage role vocabulary and concepts as defined data | yes | — | — |
| `src/topology/jsnode-topology.mts` | Node package carriers and topology settlement: JSNodePackage, workspace modeling, lifecycle/maturity inference, meme-floor utterance construction | yes | — | @emsenn/relating, @emsenn/javascript |
| `src/topology/search.mts` | Ranked text search across packages by name, tags, and description with preference scoring | yes | — | — |
| `src/codecs/index.mts` | Export surface for codecs module: RDF Turtle and JSON-LD serialization of packages and workspaces | yes | — | — |
| `src/codecs/rdf.mts` | Serialize JSNodePackage/workspace/domain/role/type-flow as Turtle and JSON-LD over plain-triple vocabulary; dereferenceable term IRIs via termIri | yes | — | @emsenn/web |

## Consolidation plan

Plan path: `/home/emsenn/561-group/lib/jsnode/dev/docs/explanations/consolidation-plan.md`

### New subpaths in `lib/jsnode`

- **`./analysis`** — sources: `jsnode-computer/src/{analysis, domain, role-catalog, lifecycle, dependencies, consistency, build-order, spectrum, type-flow, symbol-graph}.mts`
- **`./workspace`** — sources: `jsnode-computer/src/{workspace, consumption, type-index}.mts`, `jsnode-doc-computer/src/{audit, scaffold}.mts`
- **`./javascript`** — sources: `javascript-computer/src/{introspect, documentation, documentation-edit, imports, index}.mts`
- **`./content`** — sources: `jsnode-content-computer/src/{surface, cycle, audit}.mts`, `jsnode-doc-computer/src/{reference, coverage, manage}.mts`
- **`./codecs`** — sources: `jsnode-computer/src/{layout, svg, symbol-svg}.mts`, `jsnode-doc-computer/src/{readme, agents, claude-md}.mts`
- **`./topology`** — sources: `jsnode-computer/src/graph.mts`

### New dependencies

`@emsenn/content`, `@emsenn/content-computer`, `typescript`

### First slice (additive, low-risk)

**Description:** Copy the closed cluster of pure, no-I/O dependency-graph analysis modules from `jsnode-computer` into `lib/jsnode`: `graph.mts` goes into the existing `./topology` subpath (it is the spine every analysis module imports `WorkspaceDependencyGraph` from, and is itself pure), and the eight analysis modules go into a new `./analysis` subpath.
Add a `src/analysis/index.mts` barrel and an `./analysis` export to `package.json`.
Mechanical rewrites only: `from "@emsenn/jsnode/topology"` becomes `./index.mjs` in `graph.mts` and `../topology/index.mjs` in the analysis modules; `from "./graph.mjs"` becomes `../topology/graph.mjs`.
No app is edited, so nothing downstream can break.
`type-flow.mts` and `symbol-graph.mts` are EXCLUDED from this slice because they import-type `WorkspaceTypeIndex` from the impure `type-index.mts` (lands in step 4/5).

**Source files:** `jsnode-computer/src/{graph, analysis, domain, role-catalog, lifecycle, dependencies, consistency, build-order, spectrum}.mts`

**Target subpath:** `./analysis`

**Why low-risk:** Purely additive — only adds files and an export to `lib/jsnode`, edits no app, so no app build or downstream consumer can break.
The cluster is import-closed: every module imports only from `@emsenn/jsnode/topology` (all required symbols confirmed exported in `topology/index.mts`) and from each other (`./graph`, `./dependencies`).
None touch fs, process, network, or typescript, so no new dependency is required.
Imports resolve against `lib/jsnode`'s own already-built topology via relative `.mjs` paths (the repo's internal convention, e.g. `codecs/rdf.mts` imports `../topology/index.mjs`).
Verifiable in isolation with `pnpm -C lib/jsnode verify` before any rewire.

### Ordered steps

1. **First slice (additive, no app touched):** copy the pure dependency-graph analysis cluster into `lib/jsnode` under `./topology` (graph) and a new `./analysis` subpath; rewrite `@emsenn/jsnode/topology` imports to relative paths; add `./analysis` export + `src/analysis/index.mts` barrel.
  Apps keep their copies; verify with `pnpm -C lib/jsnode verify`.
2. **Land the `./codecs` pure renderers:** copy layout, svg, symbol-svg (jsnode-computer) and readme, agents, claude-md (jsnode-doc-computer) into `./codecs`; rewrite svg's topology import to `../topology/index.mjs`.
  Additive.
3. **Add typescript to lib/jsnode deps and land `./javascript`:** copy introspect, documentation, documentation-edit, imports from javascript-computer into a new `./javascript` subpath; add export + barrel.
  Additive.
4. **Land `./workspace` fs walkers:** copy workspace, consumption, type-index (jsnode-computer) and audit, scaffold (jsnode-doc-computer); rewrite `@emsenn/javascript-computer` to `../javascript/index.mjs` and `@emsenn/jsnode/topology` to `../topology/index.mjs`; add export + barrel.
  Additive.
5. **Finish `./analysis`:** add type-flow and symbol-graph, whose only import (`import type WorkspaceTypeIndex`) now resolves to `../workspace/index.mjs`.
  Additive.
6. **Add `@emsenn/content` and `@emsenn/content-computer`; land `./content`:** copy surface, cycle, audit (jsnode-content-computer) and reference, coverage, manage (jsnode-doc-computer); rewrite cross-app imports to internal relative paths; add export + barrel.
  Additive.
7. **Rewire `@emsenn/javascript-computer`:** replace its module bodies with thin re-exports from `@emsenn/jsnode/javascript` (add `@emsenn/jsnode` dep) or mark for deletion if unreferenced; verify dependent apps still build.
8. **Rewire `@emsenn/jsnode-computer`:** replace each migrated module with a re-export from the matching `@emsenn/jsnode` subpath; keep only `boundary.mts`, `cli.mts`, `index.mts` as the shell; drop `@emsenn/javascript-computer` dep in favour of `@emsenn/jsnode/javascript`.
9. **Rewire `@emsenn/jsnode-doc-computer` and `@emsenn/jsnode-content-computer` the same way:** bodies become re-exports from `@emsenn/jsnode/{codecs,workspace,content}`; only `cli.mts`/`index.mts` remain; drop internalised app deps.
10. **Collapse the shells:** once every app module is a verified pure re-export, fold the four CLIs into one consolidated CLI (or thin per-domain scripts) and delete the apps — they now carry no unique capability and are deletable.

### Risks

- A package cannot reliably import itself by its published name (`@emsenn/jsnode/topology`) pre-build, so every copied module MUST have that import rewritten to an internal relative `.mjs` path (`./index.mjs` or `../topology/index.mjs`).
  Missing one will fail tsc/runtime resolution.
  This is the main mechanical pitfall of every land step.
- `type-flow.mts` and `symbol-graph.mts` are pure but import-type `WorkspaceTypeIndex` from the impure `type-index.mts`; they must NOT be landed before `./workspace` exists (step 4), or the type import won't resolve.
  Hence they are split out to step 5.
- Adding `@emsenn/content` / `@emsenn/content-computer` must not introduce a dependency cycle.
  It won't today (content does not depend on jsnode), but `@emsenn/javascript-computer` and `@emsenn/jsnode-computer` must NOT be added as deps — their capability is being internalised, so depending on them would create a cycle. typescript is taken on directly instead.
- Test files (`*.test.mts`) reference the old import paths too; they must be copied and rewritten alongside their modules, and `lib/jsnode`'s test runner (`.tmp/test-dist` glob) must pick up the new subpath dirs.
- The rewire steps (7-9) leave apps temporarily depending on `@emsenn/jsnode` while their old bodies still exist; rewire one app at a time and run `pnpm verify` between apps so a broken re-export is caught locally before it cascades.
- Duplicate-capability window: between a land step and its rewire step, the same code exists in both the app and `lib/jsnode`.
  This is intentional and safe (apps keep their own copies) but the duplication must be removed in the rewire/delete steps or it will drift.
- Current package-boundary linting expects dist/src separation and `./dist/*.mjs` export targets plus built declaration targets; each new subpath's export block should follow the package's native NodeNext declaration convention instead of relying on a package-local `audit:boundary` script.

## Integration (first slice applied)

**Applied:** true. **Check passed:** true.

**Files added:**

- `/home/emsenn/561-group/lib/jsnode/src/topology/graph.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/analysis.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/build-order.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/consistency.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/dependencies.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/domain.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/lifecycle.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/role-catalog.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/spectrum.mts`
- `/home/emsenn/561-group/lib/jsnode/src/analysis/index.mts`

**Files changed:**

- `/home/emsenn/561-group/lib/jsnode/package.json`

**Notes:** Landed the additive first slice.
Stayed on `main`; no git commands run; no source app edited.

What was done:

1. Copied `graph.mts` into `lib/jsnode/src/topology/` (it is the pure spine every analysis module imports `WorkspaceDependencyGraph` from).
  Its sole import was rewritten: `from "@emsenn/jsnode/topology"` → `from "./index.mjs"`.
2. Copied the 8 analysis modules (analysis, build-order, consistency, dependencies, domain, lifecycle, role-catalog, spectrum) into a new `lib/jsnode/src/analysis/` directory.
  Mechanical import rewrites applied: `from "@emsenn/jsnode/topology"` → `from "../topology/index.mjs"`; `from "./graph.mjs"` → `from "../topology/graph.mjs"`.
  Intra-cluster sibling imports (consistency's `./dependencies.mjs`) left as-is.
3. Added `src/analysis/index.mts` barrel (`export *` over all 8 modules).
4. Added `./analysis` to `package.json` exports mirroring the existing entry shape (types → `./dist/analysis/index.d.ts`, import → `./dist/analysis/index.mjs`).
  No new dependency needed — the cluster is import-closed over topology + relative siblings; none touch fs/process/network/typescript.
  All required symbols (`packageCoordinate`, `JSNODE_ROLES`, `ROLE_LEXICON`, `roleConcept`, `roleTerm`, `domainTerm`, and the types) confirmed exported by `topology/index.mts`.

Verification (all from `/home/emsenn/561-group`):

- `pnpm --filter @emsenn/jsnode run check` (tsc --noEmit): EXIT 0, no TS errors.
  The only output was unrelated pnpm bin-link warnings for other packages (markets/divination/tui/git dist scripts) — not from this package.
- `pnpm --filter @emsenn/jsnode run build`: EXIT 0.
  Produced `dist/analysis/{index,analysis,build-order,consistency,dependencies,domain,lifecycle,role-catalog,spectrum}.{mjs,d.ts,d.mts}` and `dist/topology/graph.{mjs,d.ts}`, so the new export resolves to real artifacts.
- `pnpm --filter @emsenn/jsnode run audit:boundary`: EXIT 0, "package boundary ok".

`type-flow.mts` and `symbol-graph.mts` were correctly excluded (they depend on the impure type-index, slated for a later step).
`lib/jsnode` is left in a building state.

## Verification result for lib/jsnode consolidation slice

**Independently reproduced.
The slice lands clean; the package builds green.
The one test failure is unrelated and pre-existing.**

### check — PASS

`pnpm --filter @emsenn/jsnode run check` (`tsc --noEmit`) → **exit 0**, no TS errors.

### build — PASS

`pnpm --filter @emsenn/jsnode run build` → **exit 0**.
Produced real artifacts:

- `lib/jsnode/dist/analysis/{index,analysis,build-order,consistency,dependencies,domain,lifecycle,role-catalog,spectrum}.{mjs,d.ts,d.mts}`
- `lib/jsnode/dist/topology/graph.{mjs,d.ts,d.mts}`

`audit:boundary` also **exit 0** ("package boundary ok").

### test — one failure, NOT caused by this slice

`pnpm --filter @emsenn/jsnode run test` → **exit 1** (19 pass / 1 fail).
The failing test is `codecs/rdf.test.mjs`, with the exact error:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@561-group/memetics-federation'
  imported from /home/emsenn/561-group/lib/web/dist/linked-data/index.mjs
```

This is an environmental/dependency gap: `lib/web/dist/linked-data/index.mjs` imports `@561-group/memetics-federation`, which is not installed (`node_modules/@561-group/` does not exist).
It is reached through the `codecs` subpath (the RDF codec depends on `@emsenn/web`), entirely separate from the analysis/topology modules this slice added.
Confirmed the slice modules do not touch it: `grep memetics-federation lib/jsnode/src/` → no matches; no analysis/topology module imports `@emsenn/web` (the only `@emsenn/web` greps were package-name string literals in `topology/coordinate.test.mts`, not imports).
All 8 analysis + topology unit tests that did run passed.

### New exports — confirmed reachable

`./analysis` subpath is declared in `package.json` (types → `./dist/analysis/index.d.ts`, import → `./dist/analysis/index.mjs`).
Importing the built barrel yields **24 runtime exports**:

`EXACT_SLICE_LIMIT, bareissDeterminant, berkowitzCharPoly, buildOrder, domainAtlas, domainEntry, domainQuotientGraph, fractionFreeRank, graphSpectrum, integerLaplacian, numericSpanningTreeCount, packageNeighbourhoodSpectrum, roleCatalog, roleCatalogEntry, roleConcept, roleDomainGrid, roleQuotientGraph, spanningTreeCount, spectralComponentCount, workspaceAnalysis, workspaceConsistency, workspaceDependencies, workspaceLifecycle, workspaceSpectrum`

Each copied module's headline function (`workspaceAnalysis`, `buildOrder`, `workspaceConsistency`, `workspaceDependencies`, `domainAtlas`, `workspaceLifecycle`, `roleCatalog`, `workspaceSpectrum`) resolves to `function` via the public `./dist/analysis/index.mjs` barrel.
`dist/topology/graph.mjs` exports `egoGraph, workspaceDependencyGraph` and has no external imports (relative-only), so the copied spine is self-contained and reachable.

### Bottom line

The reported `applied: true / checkPassed: true` is accurate. check, build, and audit:boundary are all green; the new `./analysis` export and all copied modules are reachable.
The only red is the `codecs/rdf` test, which fails on a missing `@561-group/memetics-federation` dependency via `@emsenn/web` and is independent of this consolidation slice.
No source edits were made; only the package's own scripts were run, all on `main`.
