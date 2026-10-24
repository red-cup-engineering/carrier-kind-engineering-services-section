# @emsenn/llm-topology

LLM topology — the agentic loop as a settling trace on the trace-topology bedrock. An agent run is a monotone, append-only accumulation of turns (assistant message, tool calls, governed tool runs, cost events) that projects to a trace-topology trace; the run settles by the knowledge-join of its per-step admission judgments (settleJudgments), reaching a fixed point on a final answer, an obstruction on a step/cost bound, or a held contradiction on a contested tool. Charges are meme-algebra bilattice values; held contradictions are kept, never collapsed. Cost folds serially over emitted cost events (a projection, not a replay).

## Dependencies

- `@emsenn/llm-algebra`
- `@emsenn/meme-algebra`
- `@emsenn/trace-topology`
