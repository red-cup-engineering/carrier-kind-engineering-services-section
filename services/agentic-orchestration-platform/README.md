# Agentic orchestration platform

The nine agentic engines share one CLI and one HTTP/OpenAPI/MCP boundary. Their action implementations remain in the specializing engines; action admission, execution, transport projection, and witnessing use the relation engine.

From the repository root after installation and engine builds:

```sh
npx multi-agent-engine
npx multi-agent-engine knowledge
printf '%s' '{"entries":[{"locus":[],"act":"daimon"}]}' | npx multi-agent-engine play design
AGENTIC_DATA=/path/to/store npx multi-agent-engine serve
```

`multi-agent-engine <engine> serve` serves just that engine. `PORT` defaults to 8787. The family server links every mounted engine from its index. `AGENTIC_DATA` enables the existing dated EAVT invocation logs, separated by engine package identity; omit it for execution without filesystem persistence. The invocation reader selects today’s feed under the new package identity. Historical feeds retain their original names and remain readable through the relation engine’s filesystem store.

`knowledge dream-stream` and `knowledge cycle-stream` retain the finite or aperiodic JSONL streams and their `--limit`, `--cycles`, and `--interval-ms` controls. Computation's distinct `git-status` and `git-compute` commands remain in its package.

Downstream applications import `engine`, `dispatch`, or `serve` from `@red-cup-engineering/agentic-orchestration-platform`. `engine(name)` returns the existing induced action registry and discovery carrier. `dispatch(name, argv, input, {dataRoot})` executes it asynchronously. `serve({dataRoot})` returns the unbound Node server, which the caller may listen on and close.
