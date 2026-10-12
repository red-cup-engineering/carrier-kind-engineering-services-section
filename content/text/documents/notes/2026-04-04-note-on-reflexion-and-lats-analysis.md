---
title: "Reflexion and LATS — Verbal Reinforcement and Tree Search for Language Agents"
description: "Source analysis of Reflexion's verbal self-reflection loop and LATS's Monte Carlo tree search over action spaces, with implications for continuous learning pipelines"
date-created: 2026-04-04
sources:
  - "Shinn et al., 'Reflexion: Language Agents with Verbal Reinforcement Learning' (NeurIPS 2023)"
  - "Zhou et al., 'Language Agent Tree Search Unifies Reasoning Acting and Planning in Language Models' (ICML 2024)"
  - "https://github.com/noahshinn/reflexion"
  - "https://github.com/lapisrocks/LanguageAgentTreeSearch"
connects-to:
  - continuous-learning-in-agentic-harnesses
  - algebraic-learning-calculus
  - training-as-closure
  - voyager-skill-library-analysis
---

Two systems from the same Princeton research lineage (Shinn, Yao, Narasimhan) that solve the same problem differently: how does a language agent learn from failure without gradient updates?

## Reflexion: failure becomes language becomes behavior change

### The core loop

Reflexion implements a three-component cycle — actor, evaluator, self-reflection — that runs across *trials* (not within a single episode). The agent attempts a task, fails, reflects on *why* it failed in natural language, then uses that reflection as additional context on the next attempt.

The implementation (`hotpotqa_runs/agents.py`) makes this concrete:

1. **Actor** executes a reasoning trace (CoT or ReAct) and produces an answer.
2. **Evaluator** checks the answer against ground truth via exact match (`EM()` function). Binary signal: correct or not.
3. **Self-reflection module** takes the failed reasoning trace and generates a natural language diagnosis: "I searched one of the prime ministers, then attempted to answer right away. I should have searched each of the prime ministers."
4. The reflection is appended to an **episodic memory buffer** — a simple `List[str]` stored on the agent object (`self.reflections`).
5. On the next trial, reflections are injected into the prompt via `format_reflections()`, preceded by: "You have attempted to answer following question before and failed. The following reflection(s) give a plan to avoid failing to answer the question in the same way you did previously."

### The self-reflection prompt

The reflection prompt (`prompts.py:117`) asks the model to:
- Diagnose a possible reason for failure
- Devise a new, concise, high-level plan that aims to mitigate the same failure

This is not free-form journaling. The prompt constrains the output to be *actionable* — a plan, not a summary. Few-shot examples reinforce this: the example reflections are 1-2 sentences identifying a specific tactical error and proposing a specific alternative.

### Episodic memory buffer

The memory is strikingly simple. In the HotPotQA variant, `self.reflections` is a list of strings. Each new reflection is appended. They compose by concatenation with bullet formatting:

```
Reflections:
- [reflection from trial 1]
- [reflection from trial 2]
```

In AlfWorld (`generate_reflections.py`), the memory has a sliding window: only the last 3 reflections are used. This prevents prompt bloat but also means old lessons are forgotten.

In the programming variant (`programming_runs/reflexion.py`), the structure is richer. Each iteration stores:
- The current implementation
- Test feedback (which tests passed/failed, with actual vs expected output)
- A self-reflection explaining why the implementation is wrong

The reflection for code (`generators/py_generate.py:152`) is more specific than for QA: "Your goal is to write a few sentences to explain why your implementation is wrong as indicated by the tests. You will need this as a hint when you try again later."

### The evaluator

Reflexion uses different evaluators per domain:
- **QA (HotPotQA)**: Exact string match after normalization — remove articles, punctuation, lowercase, whitespace fix. Binary.
- **Decision-making (AlfWorld)**: Environment reward signal — task success or failure. Binary.
- **Programming**: Two-stage. First, internal unit tests (LLM-generated or provided) produce pass/fail with feedback strings. If internal tests pass, the solution is evaluated against held-out tests. The feedback from failing tests is what drives reflection.

The programming evaluator is the most sophisticated because it produces *structured* failure information: which tests failed, what the actual output was, and what was expected. This structured feedback is what makes code reflection effective.

### What Reflexion does not do

- No persistent memory across tasks. Reflections are per-question, discarded between questions.
- No generalization. A reflection about search strategy on one HotPotQA question does not inform behavior on a different question.
- No confidence scoring. Each reflection is treated equally.
- No reflection on *success*. The system only reflects when the evaluator returns failure.

## LATS: Monte Carlo tree search over action space

### The architecture

LATS extends Reflexion by adding tree search. Instead of a linear sequence of trial-reflect-retry, LATS builds a tree of possible reasoning trajectories and uses UCT (Upper Confidence Bounds applied to Trees) to explore the most promising branches.

The core structure (`hotpot/lats.py`) uses:
- **Nodes** representing states (thought, action, observation triples)
- **UCT selection** for balancing exploration vs exploitation
- **LLM-based value function** for evaluating partial trajectories
- **Rollout** for simulating trajectory completions
- **Backpropagation** for updating node values up the tree

### The search cycle (`lats_search`)

Each iteration:
1. **Select**: Walk down the tree from root using UCT (`node.uct()`) to find the most promising unexplored node.
2. **Expand**: Generate `n_generate_sample` new action continuations from the selected node. Each continuation involves an LLM call that produces a thought-action pair.
3. **Evaluate**: Use an LLM-based value function to score each new child. The value prompt asks the model to assess trajectory correctness on a 1-10 scale.
4. **Rollout**: From the highest-valued child, simulate forward to a terminal state (max depth 4).
5. **Backpropagate**: Update visit counts and values up the tree from the terminal node.

### The UCT formula

```python
def uct(self):
    if self.visits == 0:
        return self.value
    return self.value / self.visits + np.sqrt(2 * np.log(self.parent.visits) / self.visits)
```

Standard UCB1 with exploration constant sqrt(2). Unvisited nodes return their initial value (from the LLM evaluation), which seeds them with an informed prior rather than infinity.

### The LLM evaluator

This is where LATS diverges most from Reflexion. The value function (`hotpotqa.py:value_prompt_wrap`) asks the LLM to assess a partial trajectory's correctness. The output is parsed as a 1-10 score (`value_outputs_unwrap` — a cascade of string-contains checks, crude but functional).

When failed trajectories exist, they are included in the value prompt with their reflections as negative examples: "This trajectory is incorrect as [reflection]. Thus the correctness score is 1." This biases the evaluator away from known-bad paths.

### Self-reflection in LATS

LATS inherits Reflexion's self-reflection but applies it differently. Failed terminal trajectories are collected, and reflections are generated over batches of unique failures (`generate_self_reflection` in `hotpotqa.py`). These reflections then inform *both* the expansion (via the `cot_prompt_wrap`) and the evaluation (via the `value_prompt_wrap`).

The reflection integration is more structural than Reflexion's simple concatenation. Failed trajectories with their reflections are formatted as negative examples with explicit "FAILED TRAJECTORY" markers, showing the model what to avoid.

### The programming variant (`programming/mcts.py`)

The code LATS variant is cleaner architecturally:
- `gather_context_from_tree()` walks up from a node collecting all ancestor feedback and reflections
- Reward is computed as fraction of internal tests passed (continuous, not binary)
- Each child node stores its own `test_feedback` and `reflection`, making the tree a structured memory of all attempted solutions and their failure analyses

## Evaluator designs compared

| Aspect | Reflexion | LATS |
|--------|-----------|------|
| **Signal type** | Binary (correct/incorrect) | Continuous (1-10 score from LLM) |
| **Source** | Ground truth or environment | LLM judgment + environment |
| **Granularity** | Per-trial | Per-node (partial trajectories) |
| **Feedback** | Structured for code; binary for QA | Always includes trajectory context |
| **Cost** | 1 LLM call per reflection | n_evaluate_sample calls per node evaluation |

LATS pays significantly more in LLM calls for richer signal. Reflexion is cheaper but can only learn from complete failures.

## What to adopt

### Self-reflection on failure → our CL pipeline

Our continuous learning system (observations → instincts → skills) already captures *that* something happened, but not *why* it failed. Reflexion's self-reflection prompt pattern maps directly:

Current: observation records what happened, confidence score tracks frequency.
Missing: a reflection step that diagnoses *why* a pattern failed and produces an actionable correction.

The reflection prompt template is directly applicable: "You were unsuccessful. Diagnose a possible reason for failure and devise a new, concise, high-level plan that aims to mitigate the same failure." This should fire when an instinct's predicted action leads to a user correction or a failed outcome.

### Episodic memory buffer → instinct memory

Reflexion's memory is per-task. Ours needs to be per-office (situated in a practice community). But the composition pattern — reflections as a formatted list injected into the action prompt — maps to how instincts already compose in agent prompts.

The AlfWorld sliding window (last 3 reflections) is relevant for our context budget concerns. LATS's tree-based `gather_context_from_tree()` is more sophisticated — walking up the decision tree to collect relevant ancestor context. For multi-step plans, the tree walk pattern is better than flat concatenation.

### Tree search for plan evaluation

LATS's approach to exploring before committing is directly applicable to plan evaluation. Instead of generating one plan and executing it, we could:
1. Generate multiple plan variants (expansion)
2. Use LLM evaluation to score each variant (evaluation)
3. Select the most promising one (selection via UCT or simpler ranking)
4. If it fails, backpropagate the failure and try the next-best branch

This is heavier than our current plan-then-execute pattern but would catch more failures before they waste execution time.

### Structured failure feedback

Reflexion's programming variant shows the value of *structured* failure feedback. "Tests failed: assert add(1,2) == 3 # output: -1" is far more useful than "the task failed." Our hook system already produces structured output (blocked messages, error logs). The gap is in feeding that structure into the reflection step rather than just recording it.

## Connection to algebraic learning calculus

Reflexion treats reflection as string concatenation. LATS treats it as tree-valued search. Neither has a *theory* of what learning means.

The [algebraic learning calculus](../../../../../../../561-group-services-section/content/text/documents/articles/notes/2026/04/04/2026-04-04-note-on-algebraic-learning-calculus.md) idea identifies what's missing:

1. **Closure, not accumulation.** Reflexion appends reflections without checking convergence. An instinct that keeps generating new reflections without settling has not learned — it is oscillating. The closure operator test (does applying the training operator again produce the same result?) would detect this.

2. **Bilattice composition, not concatenation.** A reflection has both content ("search each prime minister separately") and context ("when answering multi-entity questions"). Reflexion's flat list loses the context dimension. Bilattice-valued relevance scoring would preserve it.

3. **Competency, not visit count.** LATS uses visit counts for UCT exploration weighting. Reflexion uses trial count implicitly (more trials = more reflections). Neither measures whether the agent has actually *demonstrated* the skill the reflection teaches. PQS-style qualification gates would replace both.

4. **Formality progression.** A Reflexion reflection is always prose (F1). LATS's tree structure is closer to F2 (structured). Neither reaches F3 (algebraic). The progression from "don't search just one prime minister" to "for multi-entity questions, enumerate all entities before answering" to a pattern-matching rule is the F0→F3 trajectory.

The concrete next step: implement a reflection-on-failure hook that fires when an instinct leads to a correction, using Reflexion's prompt pattern. Store the reflection alongside the instinct. When the instinct next fires, include relevant reflections (sliding window, most recent 3). Track whether reflections actually prevent the failure from recurring — that's the closure test.

## See also

- [Continuous Learning in Agentic Harnesses](./continuous-learning-in-agentic-harnesses.md)
- [Voyager Skill Library Analysis](./voyager-skill-library-analysis.md)
- [Algebraic Learning Calculus](../../../../../../../561-group-services-section/content/text/documents/articles/notes/2026/04/04/2026-04-04-note-on-algebraic-learning-calculus.md) (idea)
- [Training as Closure](../../../../../../../science-services-section/services/social-science-services-section/services/education-science-services-section/content/text/documents/notes/2026-04-04-note-on-training-as-closure.md)
