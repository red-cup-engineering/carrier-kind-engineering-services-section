# Vendored imports

Vendored-by-copy snapshots of nine `emsenn/*` GitHub repos, pulled in 2026-07-30 as import
candidates for enrichment. Each is a plain file copy (no `.git`) of a `--depth 1` clone at
the commit SHA below — not a submodule, not linked into `pnpm-workspace.yaml`, and not
registered anywhere. Nothing here has been `npm install`ed or wired into any workspace or
the registry.

| repo | origin | commit SHA | vendored | purpose |
|---|---|---|---|---|
| jsnode-computer | https://github.com/emsenn/jsnode-computer | `b430bf1a813f03ced618cf594454e39397e115c3` | 2026-07-30 | Node workspace computing: reads package.json manifests into jsnode-topology carriers, discovers all workspace packages, resolves dependency structure. |
| jsnode-topology | https://github.com/emsenn/jsnode-topology | `9ff370d39043cbebe269195573ad9700c5354c56` | 2026-07-30 | Node.js packages as a meme-topology carrier: layer, exports, and dependencies as relational utterances; workspace-level sheaf settlement via induceJSNodeTopology. |
| jsnode-codecs | https://github.com/emsenn/jsnode-codecs | `747e06cfcaf6e5ae5d09d0f76d3676bae5e4e056` | 2026-07-30 | Factual RDF codec for the JS Node package ecosystem: JSNodePackage and JSNodeWorkspace carriers as Turtle and JSON-LD over a plain-triple vocabulary. |
| jsnode-server | https://github.com/emsenn/jsnode-server | `173c2339756c212a320a2dae5d9f7dd09c835042` | 2026-07-30 | JS Node ecosystem server — jsnode-computer bound to transports: the workspace package index served over HTTP as JSON, Turtle, and JSON-LD, with ranked package search, for agents. |
| jsnode-content-computer | https://github.com/emsenn/jsnode-content-computer | `9c9a3c6dcee6955dedd90a317ce717c246574bb5` | 2026-07-30 | Content computer for jsnode workspaces: LLM-written, gate-checked documentation cultivated bottom-up from a package's introspected surface — symbol references first, composed into explanations and a README. Our code formats and verifies; the model supplies prose. |
| javascript-computer | https://github.com/emsenn/javascript-computer | `156b3258b368f67b31c167d636be6db8aa8d40d3` | 2026-07-30 | JavaScript computer — projects a TypeScript declaration surface (.d.ts) into the javascript type category: a TypeCatalog of objects, morphisms, and subtype edges read from real source via the TypeScript compiler API. |
| javascript-algebra | https://github.com/emsenn/javascript-algebra | `f791ce24f728ab0d245720a91e987a0fcc53fec7` | 2026-07-30 | JavaScript type category — types as objects, functions as morphisms (a multicategory of types, domain is a tuple), and assignability as the carrier relation. Pure structure and operation; closures and section reads live in @emsenn/javascript-topology. |
| meme-topology | https://github.com/emsenn/meme-topology | `6cfec2b9dcf548589c9d6c68b0229e3956154b74` | 2026-07-30 | Meme topology as an inductive carrier and morphism derivation. |
| csl-in-yaml | https://github.com/emsenn/csl-in-yaml | `f032e3e1a7f4a8563b5500021229edab1f69925a` | 2026-07-30 | Author, lint, sort, and generate CSL-in-YAML citation blocks — CSL-JSON bibliographic records living in Markdown frontmatter. Zero dependencies. |

These are import candidates for enrichment — not yet wired into any workspace or registry.
