---
type: theorem
class: empirical-claim
status: proved
depends-on:
  - ../theorems/saturation-threshold.md
  - ../theorems/coordination-overhead-grows-superlinearly.md
  - teaching/explanations/coordination-topology.md
see-also:
  - ../morphisms/agent-composition.md
  - teaching/explanations/coordination-cost-and-benefit.md
  - ../texts/multi-agent-failure-modes.md
references:
  - references/masft2025.md
  - references/anthropic2024.md
---

# Single-agent parity below saturation

**Claim.** Below the saturation threshold (~4 agents), best-of-N sampling from a single agent — running the same single agent N times and taking the best result — frequently matches or exceeds the performance of a coordinated N-agent system on the same task.

## Evidence

The MASFT study (arXiv 2503.13657, March 2025) found:

1. **Multi-agent systems showed minimal performance gains over single-agent baselines** across the benchmarks tested.
  The performance improvement from coordination was smaller than expected from the specialization rationale.

2. **Some multi-agent systems performed worse than best-of-N single-agent sampling.** This is the strongest finding: in these cases, not only did coordination fail to provide a benefit, it actively degraded performance relative to the best single-agent approach.

3. **Prompt optimization and topology redesign produced modest ceilings:** +5% maximum for AG2 MathChat, +14% for ChatDev with topology redesign.
  These ceilings indicate that the problem is not primarily prompt engineering — the coordination model itself limits gains.

Anthropic's documentation (December 2024) explicitly notes that well-designed tool use and a single agent outperforms multi-agent coordination "for most tasks."

## Why single-agent best-of-N competes

**Lower overhead.** N independent single-agent runs share no coordination overhead.
They do not wait for each other, do not pass messages, and do not require synchronization.
Each run executes at full speed.

**No cascading failure.** In a multi-agent system, one agent's error propagates to downstream agents (the cascading misinterpretation failure mode, MASFT FC2).
In best-of-N sampling, a single agent's failed run does not affect others.

**Quality selection.** When N runs are taken and the best is selected, the selection function can apply any quality criterion (correctness check, human review, automated validation).
This is a form of external error correction not available in sequential multi-agent pipelines.

**Context coherence.** A single agent maintains a consistent context across its entire execution.
In multi-agent systems, context is fragmented across agents; critical information held by one agent must be explicitly communicated to others, and communication failures (information withholding, FC2) are a primary source of coordination errors.

## When the theorem does not apply

The theorem characterizes the regime below the saturation threshold and for tasks that can be completed by a single agent.
It does not apply in three cases:

1. **Capability disjointness.** If the task genuinely requires capabilities no single agent can hold simultaneously (isolated tool environments — a coding sandbox plus a live web browser — or genuinely non-overlapping specializations), best-of-N sampling from a single-capability agent cannot close the gap.

2. **Hard parallelism requirements.** If the task has a wall-clock time constraint that single-agent sequential execution cannot meet, parallel multi-agent execution is the only viable approach regardless of overhead.

3. **Robust consensus.** If the failure mode of concern is hallucination and a debate or consensus pattern is the mitigation, the N× compute cost of debate is accepted specifically for its error-reduction properties.

## Engineering consequences

**Best-of-N as the default comparison.** When evaluating whether to use a multi- agent architecture, the comparison should not be "multi-agent vs. single-agent" but "multi-agent vs. best-of-N single-agent with the same compute budget."
Multi-agent coordination is justified only when it demonstrably exceeds this stronger baseline.

**Single agent first.** Start with a single agent.
Add agents only when a specific, measured bottleneck justifies the coordination overhead.
This is the multi-agent design principle implied by the MASFT study findings.
