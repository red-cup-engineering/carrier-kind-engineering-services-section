---
type: question
status: open
see-also:
  - teaching/explanations/emergent-coordination.md
  - ../objects/protocol.md
---

# Do emergent protocols form?

## The question

When multiple LLM agents repeatedly interact — in ongoing simulations, agent marketplaces, multi-round collaborations — do they spontaneously develop *emergent protocols*: shared conventions for communication, role allocation, signaling, turn-taking that no designer specified but that the population converges on?

This question parallels classical results on emergent norms in human and animal populations: linguistic conventions, market prices, social norms all emerge without central design.
Do LLM-agent populations similarly develop emergent coordination structures?

## Why it might happen

- **Coordination pressure.** Agents that fail to coordinate produce worse outcomes; selection (or iterative refinement) favors coordination.
- **Replicator dynamics.** Successful agents' outputs propagate as templates for other agents.
- **Schelling points.** Salient focal solutions emerge even without communication.
- **Conformity.** LLMs may naturally converge to similar outputs given similar training distributions.

## Why it might not

- **No selection pressure.** Without explicit selection, agents have no reason to converge on particular conventions.
- **Reset dynamics.** If agents reset between interactions (no memory), convention formation has no substrate.
- **Diverse training.** LLMs from different vendors with different training may resist convergence.
- **High variance.** LLM behavior is high-variance; convention formation may be drowned out by stochasticity.

## Empirical observations

The empirical record is partial:

- **Multi-agent reinforcement learning.** Convention-like patterns emerge in cooperative MARL settings — signaling protocols, role specialization, conventions for resource allocation.
- **LLM agent simulations.** Some studies (Park et al. Smallville, others) report emergent social patterns in LLM-agent simulations — but how much is "real emergence" vs prompt-driven artifact is unclear.
- **Self-play LLM agents.** LLM agents in iterated interaction can develop shared shorthand, in-jokes, reference patterns — emergent linguistic conventions.
- **Adversarial multi-agent setups.** Agents in adversarial settings sometimes develop strategies that look like negotiation or signaling protocols.

## What systematic study would require

- **Long-running multi-agent simulations** with stable agent populations and meaningful interaction history.
- **Methods to distinguish emergent from prompted patterns.** Many "emergent" behaviors may simply reflect LLM training data.
- **Cross-population studies** to test whether different LLM populations converge on similar protocols.
- **Detection methods** for identifying conventions in LLM communication.

This kind of study is computationally expensive and methodologically demanding; few examples exist.

## Why it matters

If emergent protocols form readily:

- **Multi-agent systems may develop unexpected conventions** — including potentially undesirable ones (collusion, signaling around restrictions).
- **Long-running agent ecosystems** may evolve their own social structures, requiring governance.
- **Agent designers cannot fully control** multi-agent system behavior; emergent dynamics matter.
- **Cross-vendor agent interactions** may produce cross-vendor protocols — a potentially desirable form of interoperability or a worrying form of unanticipated coordination.

If emergent protocols form rarely:

- Multi-agent system behavior is more predictable from individual agent properties.
- Agent designers retain more control over system-level behavior.
- Long-running agent ecosystems are less likely to develop autonomous social structure.

## Related questions

- Do emergent protocols depend on agent persistence (memory across interactions)?
- Do they depend on stakes (interactions affecting future outcomes)?
- Do they depend on agent diversity (homogeneous populations vs heterogeneous)?
- How do they relate to classical emergent-coordination results from human and animal populations?

## Status

Open.
The empirical record is sparse and methodologically mixed; theoretical predictions are uncertain.
Active research areas: agent-population simulations, multi-agent learning emergent behavior studies, LLM-agent ecosystem analysis.
A clear empirical answer to "do emergent protocols form" — and a theoretical account of when — is not yet available.
