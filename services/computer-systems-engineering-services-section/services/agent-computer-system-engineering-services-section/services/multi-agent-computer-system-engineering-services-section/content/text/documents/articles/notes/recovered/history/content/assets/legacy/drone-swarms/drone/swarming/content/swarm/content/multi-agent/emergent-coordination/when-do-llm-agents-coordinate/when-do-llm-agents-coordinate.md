---
type: question
status: open
see-also:
  - teaching/explanations/agent-orchestration.md
  - teaching/explanations/emergent-coordination.md
  - teaching/explanations/the-orchestration-pattern.md
---

# When do LLM agents coordinate?

## The question

LLM agents are sometimes good at multi-agent coordination — debate frameworks, supervisor-worker pipelines, and peer collaboration networks demonstrate useful joint behavior.
They are sometimes bad at it — agents talk past each other, spawn cascading errors, fail to converge on shared plans. *When* does coordination work?

The empirical record shows substantial variance with no clean theory of when to expect success.

## Empirical observations

**Successful coordination patterns:**

- **Specialized roles with clear handoffs.** When each agent has a well-defined input, output, and role, pipelines and supervisor-worker patterns often succeed.
- **Verification loops.** Critic-actor patterns where one agent acts and another critiques work well for iterative refinement.
- **Independent parallel exploration.** Swarm patterns where agents work on independent sub-problems with later aggregation.

**Failure modes:**

- **Cascading hallucinations.** Errors in upstream agents amplify downstream.
- **Coordination collapse.** Agents agree to disagree, or one agent dominates while others defer (sycophancy).
- **Goal drift.** Multi-step interactions drift from the original goal.
- **Mode collapse.** Multiple agents converge on the same suboptimal answer.
- **Token explosion.** Coordination overhead exceeds the benefit of multi-agent decomposition.

## What makes the question hard

- **Tasks vary widely.** Coordination success depends on task structure (decomposable vs holistic, verifiable vs subjective).
- **Agent capabilities vary.** Stronger base models coordinate differently than weaker ones.
- **Prompting matters enormously.** Small prompt variations produce large behavioral differences.
- **Framework matters.** LangGraph vs CrewAI vs AutoGen systems behave differently on the same task.
- **Evaluation is hard.** Multi-agent system success is task-dependent and often qualitative.

## Hypotheses

**Capability hypothesis.** Coordination requires sufficient capability in each agent; below a threshold, coordination amplifies errors rather than capabilities.

**Decomposition hypothesis.** Coordination works when the task admits clean decomposition into sub-tasks each agent can handle.

**Verification hypothesis.** Coordination works when agents can verify each other's outputs (catching errors) but not when verification itself is hallucinated.

**Cost-benefit hypothesis.** Coordination works when the gain from decomposition exceeds the overhead of coordination — typically for hard tasks where single agents struggle.

**Convergence hypothesis.** Coordination requires convergence dynamics; without explicit convergence criteria, multi-agent systems either loop or prematurely terminate.

These are partially compatible; some combination likely holds.

## What systematic study would require

- **Benchmark task suites** spanning decomposability, verifiability, and complexity dimensions.
- **Controlled comparisons** holding base model and prompts fixed across orchestration patterns.
- **Cost-normalized evaluations** measuring not just accuracy but tokens-per-correct-answer.
- **Failure mode taxonomies** so failures can be categorized.

Some such work exists (multi-agent benchmarks, AutoGen studies) but is far from comprehensive.

## Why it matters

If we knew when LLM agents coordinate well:

- Practitioners could choose single-agent vs multi-agent approaches based on task structure.
- Agent frameworks could route tasks to the right pattern automatically.
- Capability evaluations could account for coordination- amplification or coordination-degradation.
- Safety analysis of multi-agent systems could focus on failure modes specific to coordination conditions.

Without such knowledge, multi-agent design is largely empirical and trial-and-error.

## Status

Open.
The empirical record accumulates; theoretical analysis lags.
Active areas: multi-agent benchmarks, orchestration framework comparisons, agent-coordination failure-mode taxonomies.
A predictive theory of LLM-agent coordination is not yet available.
