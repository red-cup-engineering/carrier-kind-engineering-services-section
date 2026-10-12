# @red-cup-engineering/relating

`@red-cup-engineering/relating` is the relational substrate for the 561 Group Node ecosystem.
It gives downstream packages one category-shaped boundary system: carriers are declared once, morphisms are registered once, and the same surface projects to CLI, HTTP, OpenAPI, MCP, browser forms, TypeDoc, and durable witnesses.

The package is intentionally small at the runtime edge.
Its own carrier and validation machinery is dependency-free — no TypeBox, no Ajv, no codegen; carriers are authored as plain JSON-Schema literals and validated by the package's own structural validator. The one runtime dependency is `@lenticule-science/metrologic`, the shared value-algebra kernel that the charge/settlement layers delegate to for joins, meets, involutions, and orders. The package targets Node `>=22.18`, ships ESM with declaration files, and uses an `exports` map as its public API contract.

## What To Import

Use the root import for the ordinary relational API:

```ts
import {
  utterance,
  articulate,
  predicate,
  posit,
  settle,
  carrierFrom,
  action,
  induceBins,
  dispatch,
  tm,
  evaluateRunTerm,
} from "@red-cup-engineering/relating";
```

Use subpaths when you are working at a specific boundary:

| Subpath | Use it for |
| --- | --- |
| `@red-cup-engineering/relating` | The common carrier, morphism, charge, settlement, action, and term surface. |
| `@red-cup-engineering/relating/carriers` | The dependency-free carrier kernel: JSON-Schema-literal carriers, structural validation, and the live carrier registry. |
| `@red-cup-engineering/relating/running` | Boundary actions, dispatch, CLI/HTTP/MCP/OpenAPI projections, and carrier-node mounting. |
| `@red-cup-engineering/relating/ledger` | Witness-log, state, record, and content projection helpers. |
| `@red-cup-engineering/relating/writing` | JSON, EAVT, markdown, HTTP, XML, SVG, and related representation writers/codecs. |
| `@red-cup-engineering/relating/writing/http` | Pure HTTP field, negotiation, cookie, stream-frame, and MCP-envelope codecs. |
| `@red-cup-engineering/relating/projections` | Projection lattices from resources into typed carried content. |
| `@red-cup-engineering/relating/notating` | Relation Model Notation terms and types. |
| `@red-cup-engineering/relating/evaluating/*` | The CHL-style term calculus, evaluation, catalogs, and carrier projection. |

The export map still carries older handles such as `/acting`, `/codecs`, `/holography`, and `/expressing/*` where they already existed, but new code should prefer the names above.

The export map is the normative API.
Internal paths under `src/` are not.

## Core Model

The package carries one descent:

```text
Mark -> Utterance -> ArticulationCell -> PredicationSite -> PositPresheaf -> SettlementFiltration
```

Only admission introduces opaque `Mark` data.
Everything downstream is a typed carrier-to-carrier morphism.
The standard actions expose that descent as a pipe:

```sh
printf "token\nclaim" \
  | relate utter \
  | relate articulate \
  | relate predicate \
  | relate posit \
  | relate settle
```

`induce-relation` is the same descent as one named play.

## Carrier And Action Discipline

A carrier is authored once:

```ts
import { carrierFrom } from "@red-cup-engineering/relating";

const readingSchema = {
  $id: "example/reading",
  type: "object",
  required: ["kind", "value"],
  properties: {
    kind: { const: "example.reading" },
    value: { type: "string" },
  },
} as const;

export const readingCarrier = carrierFrom(readingSchema);
```

That one value supplies the static TypeScript type source, the JSON Schema with a bare `$id`, and the package's own structural validation — no TypeBox, no Ajv, no codegen.
Actions consume carrier objects at their domain and codomain:

```ts
import { action, tm } from "@red-cup-engineering/relating";

export const echoReading = action({
  verb: "echo-reading",
  domain: readingCarrier,
  codomain: readingCarrier,
  runTerm: tm.lam(tm.var(0)),
});
```

Carrier morphisms should prefer `runTerm`: Relation Model Notation is the language-neutral body that dispatch, HTTP, MCP, tests, and Lean-backed conformance can all inspect.
Free TypeScript `run` bodies are reserved for true boundary admissions, codecs, transports, or effects.

## Commands

From the workspace root:

```sh
pnpm --filter @red-cup-engineering/relating run check
pnpm --filter @red-cup-engineering/relating run build
pnpm --filter @red-cup-engineering/relating test
pnpm --filter @red-cup-engineering/relating run verify
pnpm --filter @red-cup-engineering/relating run docs:api
```

The package resolves by name through `dist/`, so rebuild before running tests after source or fixture changes.

## Documentation

- User docs start at [docs/README.md](docs/README.md).
- The agency architecture (action → capability → faculty → face → edge → bulk → boundary) is at [docs/agency-architecture.md](docs/agency-architecture.md).
- Product-shaped orientation starts at [docs/internal-products.md](docs/internal-products.md).
- Action knowledge-vault docs are at [docs/action-knowledge-vault.md](docs/action-knowledge-vault.md).
- Operations manifold topology docs are at [docs/operations-manifold.md](docs/operations-manifold.md).
- Scripted invocation witness docs are at [docs/scripted-invocation-witnesses.md](docs/scripted-invocation-witnesses.md).
- Graded wire codec docs are at [docs/wire-codecs.md](docs/wire-codecs.md).
- Morphism inspection docs are at [docs/morphism-inspection.md](docs/morphism-inspection.md).
- Carrier-term projection docs are at [docs/carrier-term-projection.md](docs/carrier-term-projection.md).
- Settlement reader term docs are at [docs/settlement-reader-terms.md](docs/settlement-reader-terms.md).
- Schema realization docs are at [docs/schema-realization.md](docs/schema-realization.md).
- Dihedral gauge docs are at [docs/dihedral-gauge.md](docs/dihedral-gauge.md).
- Diataxis FOUR read docs are at [docs/diataxis-four.md](docs/diataxis-four.md).
- Relation matrix docs are at [docs/relation-matrix.md](docs/relation-matrix.md).
- Bigraded settling cohomology docs are at [docs/bigraded-settling-cohomology.md](docs/bigraded-settling-cohomology.md).
- Bigraded diamond docs are at [docs/bigraded-diamond.md](docs/bigraded-diamond.md).
- Bigraded cohomology docs are at [docs/bigraded-cohomology.md](docs/bigraded-cohomology.md).
- Ordinal closure docs are at [docs/ordinal-closure.md](docs/ordinal-closure.md).
- Scott coalgebra docs are at [docs/scott-coalgebra.md](docs/scott-coalgebra.md).
- Aperiodic classification docs are at [docs/aperiodic-classification.md](docs/aperiodic-classification.md).
- Jeandel-Rao finite witness docs are at [docs/jeandel-rao-witness.md](docs/jeandel-rao-witness.md).
- Settling Frobenius TQFT docs are at [docs/frobenius-tqft.md](docs/frobenius-tqft.md).
- Pairwise Stone clopen docs are at [docs/pairwise-stone-clopen.md](docs/pairwise-stone-clopen.md).
- Settling associated sheaf docs are at [docs/settling-associated-sheaf.md](docs/settling-associated-sheaf.md).
- Negative paraconsistent sheaf docs are at [docs/negative-paraconsistent-sheaf.md](docs/negative-paraconsistent-sheaf.md).
- Quantale-enriched sheaf docs are at [docs/quantale-enriched-sheaf.md](docs/quantale-enriched-sheaf.md).
- Alexandrov/Husainov docs are at [docs/alexandrov-husainov.md](docs/alexandrov-husainov.md).
- CRDT/CALM docs are at [docs/crdt-cohomological-calm.md](docs/crdt-cohomological-calm.md).
- KZ-coherent sheaf docs are at [docs/kz-coherent-sheaf.md](docs/kz-coherent-sheaf.md).
- Coordination cohomology docs are at [docs/coordination-cohomology.md](docs/coordination-cohomology.md).
- D-frame docs are at [docs/d-frame.md](docs/d-frame.md).
- Spatial geometry docs are at [docs/spatial-geometry.md](docs/spatial-geometry.md).
- Typed-theory consequence docs are at [docs/typed-theory-consequence.md](docs/typed-theory-consequence.md).
- Predication fiber logic docs are at [docs/predication-fiber-logic.md](docs/predication-fiber-logic.md).
- Exact analysis docs are at [docs/settlement-analysis.md](docs/settlement-analysis.md).
- Fixed-point topology docs are at [docs/fixed-point-topology.md](docs/fixed-point-topology.md).
- Firing causality docs are at [docs/firing-causality.md](docs/firing-causality.md).
- Closure regime docs are at [docs/closure-regime.md](docs/closure-regime.md).
- Learning depth docs are at [docs/learning-depth.md](docs/learning-depth.md).
- Observed learning-cycle docs are at [docs/learning-cycle.md](docs/learning-cycle.md).
- Value-category settling docs are at [docs/value-category-settling.md](docs/value-category-settling.md).
- Optimization settling docs are at [docs/optimization-settling.md](docs/optimization-settling.md).
- Probability and stochastic settling docs are at [docs/probability-stochastic-settling.md](docs/probability-stochastic-settling.md).
- Substitution dynamics docs are at [docs/substitution-dynamics.md](docs/substitution-dynamics.md).
- Holography projector lattice docs are at [docs/projector-lattice.md](docs/projector-lattice.md).
- Relational HTML docs are at [docs/relational-html.md](docs/relational-html.md).
- Radial SVG projection docs are at [docs/radial-svg-projection.md](docs/radial-svg-projection.md).
- HTTP boundary codec docs are at [docs/http-boundary-codecs.md](docs/http-boundary-codecs.md).
- Running HTTP app docs are at [docs/running-http-app.md](docs/running-http-app.md).
- Runtime transport work docs are at [docs/runtime-transport-work.md](docs/runtime-transport-work.md).
- Runnable examples live in [examples/](examples/README.md).
- Developer docs start at [dev/docs/README.md](dev/docs/README.md).
- The acting/holography placement question is tracked in [dev/docs/adr/2026-06-25-acting-and-holography.md](dev/docs/adr/2026-06-25-acting-and-holography.md).

The source JSDoc and generated TypeDoc are the closest documentation to the machine contract.
Handwritten docs explain how to use and evolve that contract; they should not contradict the package `exports` map or source declarations.
