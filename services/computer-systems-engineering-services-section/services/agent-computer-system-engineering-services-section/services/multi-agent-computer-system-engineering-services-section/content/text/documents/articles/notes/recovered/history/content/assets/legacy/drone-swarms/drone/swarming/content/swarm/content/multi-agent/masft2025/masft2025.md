---
type: reference
class: empirical-study
status: active
cites:
  - teaching/explanations/coordination-topology.md
  - ../theorems/coordination-overhead-grows-superlinearly.md
  - ../theorems/saturation-threshold.md
  - ../theorems/single-agent-parity-below-saturation.md
---

# MASFT (2025) — Why Do Multi-Agent LLM Systems Fail?

**Full citation:** "Why Do Multi-Agent LLM Systems Fail?"
MASFT study. arXiv 2503.13657, March 2025.

## Summary

The MASFT study (Multi-Agent System Failure Taxonomy) analyzed 150+ execution traces across five multi-agent frameworks (AutoGen, CrewAI, LangGraph, AG2, ChatDev) with six expert annotators (Cohen's Kappa 0.88).
The central finding: multi-agent architectures showed minimal performance gains over single-agent baselines.
In some configurations, multi-agent systems performed worse than best-of-N sampling from a single agent.

The study identified 14 failure modes in three categories: specification failures (FC1), inter-agent misalignment (FC2), and verification failures (FC3).
The six FC2 modes are: communication breakdown, task derailment, information withholding, role violation, conflicting actions, and cascading misinterpretation.

Empirical latency data: ~200ms at 2 agents, >4,000ms at 8+ agents (approximately quadratic growth).
Performance gains plateau at ~4 agents.
Prompt optimization and topology redesign produced +5% (AG2 MathChat) to +14% (ChatDev with topology redesign) maximum improvements.

## Contribution to the agents theory

This is the primary empirical source for:

- [coordination-overhead-grows-superlinearly](../theorems/coordination-overhead-grows-superlinearly.md): the quadratic latency growth data.
- [saturation-threshold](../theorems/saturation-threshold.md): the ~4 agent plateau finding.
- [single-agent-parity-below-saturation](../theorems/single-agent-parity-below-saturation.md): the best-of-N comparison finding.

The 14 failure mode taxonomy is referenced in the [multi-agent-failure-modes](../texts/multi-agent-failure-modes.md) text and informs the [coordination-overhead-grows-superlinearly](../theorems/coordination-overhead-grows-superlinearly.md) theorem's discussion of why overhead grows.

## Methodological notes

The 0.88 Cohen's Kappa agreement among annotators is high for qualitative failure classification.
The frameworks tested represent the 2024–2025 state of practice in LLM-based multi-agent systems.
The findings may not generalize to architectures with fundamentally different communication patterns (shared memory systems, compiled agent pipelines, hardware-accelerated inference).
