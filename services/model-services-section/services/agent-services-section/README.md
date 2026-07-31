# Agent Services Section

This section is the root locus for services which project, harness, or write
capability for an agent Actor. Descending service sections add capability
predicates; they do not grant an ancestor authority to perform the terminal
Actor's operation.

## Holdings

- `services/agent-harness-services-section` — the provider-agnostic MAPE-K
  actuation-office shape shared across Codex's and Claude's per-provider
  runtime projectors.
- `services/skill-services-section` — writes an Agent Skills `SKILL.md`
  through the Markdown file writing service (package `@red-cup-engineering/agent-skill-writing-service`).
