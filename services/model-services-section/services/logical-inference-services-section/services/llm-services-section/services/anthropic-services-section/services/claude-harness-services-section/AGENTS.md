# Claude Harness Services Section

See `README.md` for what this section owns: the Claude Code runtime
projector — office records in, a project-local `.claude/agents/` roster out.

## Before editing

- `services/claude-harness-projection-service` never authors an agent file
  itself; it calls `installing-claude-as-an-agent` (found by an up-walk from
  `lib/management/skills/`, resolved in `src/projector.mjs`). Don't add a
  second way to write `.claude/agents/*.md` here — call that instrument, or
  fix it, never copy it.
- `lib/legacy/` is frozen prior art, explicitly kept for reference — not
  loaded or run. Don't extend it; if something there looks needed, port it
  into `services/`.
- `npm run verify` in `services/claude-harness-projection-service` (check +
  test) before calling a change to the projector done.
