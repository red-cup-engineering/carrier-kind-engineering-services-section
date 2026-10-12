---
type: question
class: open
status: open
depends-on:
  - teaching/explanations/coordination-topology.md
  - ../objects/coordination-graph.md
  - ../morphisms/agent-composition.md
see-also:
  - ../theorems/accountability-chain-must-be-total.md
  - ../texts/agent-orchestration-ecosystem-2026.md
  - ../terms/multi-agent-system.md
---

# Can non-interference in multi-agent systems be formally proved?

## Question

Is it possible to prove, from the structure of a coordination graph and the action spaces of participating agents, that agents operating on disjoint scopes cannot produce conflicting state changes?
If so, what is the formal statement and what conditions are required?

## Background

The [coordination-graph](../objects/coordination-graph.md) concept notes that non-interference is an open problem: no existing multi-agent framework (as of early 2026) enforces non-interference guarantees at runtime.
The closest mechanisms are Claude Code's worktree isolation (filesystem-level), AutoGen's security proxies (role-based), and PydanticAI's dynamic toolsets (runtime).

The [agent-orchestration-ecosystem-2026](../texts/agent-orchestration-ecosystem-2026.md) text identifies region-restricted agents as a property the emsemioverse has formalized but no commercial framework implements: the multi-agent coordination spec defines directory regions with non-interference guarantees, proven via the sheaf condition.
This suggests the proof is possible within the predicated- computing framework but has not been formalized in the agents theory directly.

The commutativity intuition: if agent $A$ operates on scope $S_A$ and agent $B$ operates on scope $S_B$, and $S_A \cap S_B = \emptyset$ (disjoint scopes), then the joint state after both agents act should be independent of the order in which they acted.
This is commutativity of the two agents' operations with respect to global state.

## Why this matters

Non-interference in multi-agent systems would enable:

1. **Safe parallel execution.** If disjoint-scope agents are provably non- interfering, they can execute in parallel without coordination.
  This eliminates the overhead of coordination for tasks that can be designed around disjoint scopes.

2. **Accountability decomposition.** If scopes are non-interfering, then accountability for each scope is cleanly separable — the [accountability-chain-must-be-total](../theorems/accountability-chain-must-be-total.md) theorem's non-overlap condition is automatically satisfied.

3. **Security guarantees.** An agent that provably cannot modify state outside its scope provides stronger isolation than one that is merely instructed not to.

## Open subquestions

1. **What is the right formalization of scope?** File path prefix, database partition key, API domain, or some more abstract resource identifier?
  The formalization of scope determines what "disjoint" means.

2. **What is the right action model?** Tool calls are discrete; their effects on external state may have indirect consequences (writing a file that another agent reads).
  Proving non-interference requires modeling these indirect effects.

3. **Does the proof extend to the agents theory directly, or does it require predicated-computing machinery?** The sheaf-condition proof in the predicated- computing framework uses category-theoretic structure.
  Can an analogous proof be given purely in terms of the agents theory's objects and morphisms?
