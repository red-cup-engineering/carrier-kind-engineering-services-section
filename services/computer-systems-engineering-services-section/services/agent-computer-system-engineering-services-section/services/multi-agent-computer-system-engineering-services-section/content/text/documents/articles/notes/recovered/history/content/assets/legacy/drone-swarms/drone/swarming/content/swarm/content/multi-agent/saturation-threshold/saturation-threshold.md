---
type: theorem
class: empirical-claim
status: proved
depends-on:
  - teaching/explanations/coordination-topology.md
  - ../objects/coordination-graph.md
  - ../theorems/coordination-overhead-grows-superlinearly.md
see-also:
  - ../theorems/single-agent-parity-below-saturation.md
  - ../morphisms/agent-composition.md
  - teaching/explanations/coordination-cost-and-benefit.md
  - ../texts/multi-agent-failure-modes.md
references:
  - references/masft2025.md
  - references/anthropic2024.md
---

# Saturation threshold

**Claim.** Performance gains from adding agents to a multi-agent system plateau at approximately four agents — the saturation threshold.
Above this threshold, adding agents increases coordination overhead faster than it increases the system's capability, producing diminishing returns that eventually become negative: the system performs worse with more agents than with fewer.

## Evidence

The MASFT study (arXiv 2503.13657, March 2025) — 150+ execution traces across five frameworks — identified empirically that:

1. **Gains plateau at ~4 agents.** Performance improvements (measured by task completion rate and output quality) were substantial moving from one to two agents (specialization benefit), moderate from two to three, minimal from three to four, and effectively zero or negative from four onward.

2. **Some multi-agent systems performed worse than single-agent.** Across the benchmarks tested, multi-agent architectures showed minimal performance gains over single-agent baselines.
  In several configurations, multi-agent systems performed worse than best-of-N sampling from a single agent.
  This is the empirical basis for [single-agent-parity-below-saturation](single-agent-parity-below-saturation.md).

3. **Prompt optimization and topology redesign produced only modest improvements.** Optimizing prompts and redesigning coordination topology for AG2 produced a +5% improvement.
  The maximum observed was +14% for ChatDev with topology redesign.
  This limited ceiling on optimization confirms that the saturation reflects fundamental overhead growth, not merely poor prompt engineering.

## Why saturation occurs

Saturation is a consequence of the interaction between two growth curves:

- **Capability curve:** Adding the $k$-th agent to a system produces a capability gain that depends on how different the $k$-th agent's specialization is from the existing agents.
  Early agents (1→2) provide large gains (a second perspective, a specialized tool environment).
  Later agents (4→5) provide diminishing gains — their specializations overlap substantially with existing agents, or the tasks they can address are already covered.

- **Overhead curve:** Adding the $k$-th agent increases coordination latency by $O(k)$ in the best case (orchestrator-workers) and $O(k^2)$ in the worst case (peer-to-peer).
  This is superlinear from [coordination-overhead-grows-superlinearly](coordination-overhead-grows-superlinearly.md).

When capability gains become smaller than overhead costs, net performance declines.
The saturation threshold is the crossing point: the agent count at which the overhead curve intersects the capability curve.
Empirically this is approximately four agents across the frameworks tested.

## Scope of the threshold

The threshold of ~4 agents is empirically derived from the MASFT study's frameworks (AutoGen, CrewAI, LangGraph, AG2, ChatDev) and task types.
It should be treated as an order-of-magnitude guideline rather than an exact bound:

- Highly specialized agents (each with genuinely non-overlapping capabilities) may sustain gains beyond four.
- Poorly specialized agents (multiple agents with nearly identical capabilities) may saturate before four.
- Industrial architectures with edge-cloud splits and hardware-accelerated inference may have different thresholds due to lower coordination latency.

The threshold is not a universal constant; it is a characteristic of the 2024– 2025 LLM-based text-message coordination model.

## Engineering consequences

**The four-agent guideline.** Unless the task has a strong case for more than four agents (clear capability disjointness, demonstrated single-agent failure on the task), start with one and add agents only when a specific bottleneck justifies it.

**Measure before scaling.** Before adding a fifth or sixth agent, measure the system's performance at four.
If gains are already plateau-ing, the new agent will add overhead without return.

**Consider best-of-N as the baseline.** The comparison for multi-agent systems is not single-agent performance — it is best-of-N single-agent performance, where N is the number of agents in the multi-agent system.
Running the same single agent N times and taking the best result is a cheaper and often superior alternative to coordinating N agents.

**Threshold for parallelism exception.** Pure parallelism (independent subtasks) can justify more than four agents when the bottleneck is wall-clock time rather than quality.
In this case, agents are not coordinating — they are executing independently in parallel — and the saturation threshold does not apply.
