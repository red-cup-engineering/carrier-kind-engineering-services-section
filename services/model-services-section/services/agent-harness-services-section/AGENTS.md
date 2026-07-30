# Agent Harness Services Section

See `README.md` for what this section is and why it sits beside
`.../anthropic-services-section/claude-harness-services-section` and
`.../openai-services-section/codex-harness-services-section` rather than
containing them (a provider-agnostic shared generator, not a parent
directory of provider-specific ones).

## Before editing

- `services/mape-k-actuation-office-service` generates a provider's MAPE-K
  actuation-office record from `{ providerLabel, actorUrn, nodeId,
  jurisdiction, colleagueOffices }`. Change the generator, not a generated
  office record by hand.
- `npm run verify` in that service's directory (check + test) before
  calling a change done.
