# @red-cup-engineering/agentic-knowledge-engine

Run these actions through `multi-agent-engine knowledge <verb>`, or consume the family through `@red-cup-engineering/agentic-orchestration-platform`.
The epistemic package: proof search, concept formation, memory/research carriers, and cognizing over the knowledge order.

Knowing no longer owns this repository's `content/` filepath-tree reader.
That concrete memorystore admission lives in `@emsenn/organizing-a-knowledge-vault`.
Use that package for `browse`, `locate`, `read`, `list`, `settle-memory`, `inspect-topic`, `concept-map`, and document mutation over content trees.

Knowing keeps:

- `find`: proof search over relating's CHL terms, certified with `hasTy`.
- `conceptualize`: formal-context concept formation.
- memory/research carriers and projections for downstream packages to admit into.
- cognizing actions over memes and knowledge states.

## RelMath Realization

Knowing can now make concept-growth precedence explicit with `analysis.causal.settleCausalSet`, and it can read evidence under a concept/context fiber with `probability.conditionalViaFiberAdjoint`.
The strongest concrete follow-up is a learning-event witness: concept-formation steps as causal events, plus a conditioning receipt for which memories count inside the selected concept fiber.

## The Group's ontology over SPARQL 1.1

`src/writing/sparql/ontology.mjs` pins the glossary's remote schema.org JSON-LD context, loads `public.jsonld` (561-group-services-section, `data/records/knowledge/glossary/skos/`) into an Oxigraph store and serves it read-only over the SPARQL 1.1 Protocol. `src/writing/sparql/endpoint.mjs` is the protocol client and the `sparql_query` MCP tool; `scripts/ontology-mcp.mjs` serves that tool over stdio.

```
cargo install oxigraph-cli --locked
node scripts/serve-ontology.mjs --jsonld <public.jsonld> --location <store dir> --bind 127.0.0.1:7878
SPARQL_ENDPOINT=http://127.0.0.1:7878/query node scripts/ontology-mcp.mjs
node --test test/sparql-endpoint.test.mjs   # OXIGRAPH_BIN, ONTOLOGY_JSONLD optional
```

The basic-graph-pattern projection in `index.mjs` stays what it is: SPARQL over EAVT rows. Queries over the glossary go to the endpoint.
