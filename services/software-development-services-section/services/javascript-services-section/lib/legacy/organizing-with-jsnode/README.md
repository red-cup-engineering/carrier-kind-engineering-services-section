# @emsenn/organizing-with-jsnode

Organizing over the **JS/Node ecosystem**: Node.js packages, package binaries,
workspaces, analysis, and codecs as TypeBox-backed relational carriers over
the `relating`-through-`organizing` package spine. It is a downstream
`organizing-with-*` figure — it reads the workspace's own package graph the same way
`organizing` adjudicates a sheaf of agents.

This is the package the root [AGENTS.md](../../AGENTS.md) names as the right tool for
**any question about the workspace's package graph or executable package surface** —
reach for it instead of hand-rolling `package.json` parsing. It reads manifests into
JSNode package/workspace carriers, discovers workspace packages, records manifest
facts (including `bin`), resolves dependency structure, and admits package
binaries as computing strategy boundaries. Mathematical topology projections over
those facts now live in `@emsenn/jsnode-ick/topology`.

## The morphism surface

| export | what it does |
|---|---|
| `organize` / `organizeWithJSNode` | the top call: admit the JS/Node ecosystem into one organized carrier |
| `organizePackageScriptCatalog` | catalog a package's runnable scripts |
| `organizePackageActions` | the per-package action surface |
| `runNodeBinary` | admit a package binary as a computing strategy boundary |
| `JSNODE_CORE_PACKAGES` | the core package set this organizer knows |

### Carriers

`workspaceGraphCarrier`, `workspaceSummaryCarrier`,
`workspaceOrganizationSummaryCarrier`, `workspaceSocialBoundaryCarrier`,
`workspaceDecommissionReadinessCarrier`, `packageBinDiscoveryCarrier`,
`packageScriptCatalogCarrier`, `packageSummaryCarrier`, `ancestryCarrier`,
`admissionCarrier` — each with a `canonicalize*Action` that settles it.

## Bin

| command | what it does |
|---|---|
| `jsnode-workspace` | project the workspace's package graph from the CLI |

## Usage

```ts
import { organizeWithJSNode, workspaceGraphCarrier } from "@emsenn/organizing-with-jsnode";

// discover packages, their bins, and the dependency structure as relational
// carriers — don't re-roll manifest parsing.
```

## Subpaths

See `package.json#exports` for the authoritative list — that list is the vocabulary of
what this package already does.

## Maturity

**Built+green.** Carriers and canonicalizing actions are tested in-tree. The package
graph it produces is what discovery and JSNode ICK topology tooling read across the repo.

See the root [AGENTS.md](../../AGENTS.md) for the system frame.
