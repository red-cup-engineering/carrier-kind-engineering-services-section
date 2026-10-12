---
kind: harness
type: harness
title: "Claude Agent SDK plugin envelope"
status: ready
runtime: claude-agent-sdk
target-default: ".claude/plugins/pyfars-substrate"
projects:
  - "pyfars.cli.__main__.VERB_MODULES (every registered FARS verb)"
emits:
  - "<target>/.claude-plugin/plugin.json"
  - "<target>/commands/<verb>.md"
manifest: ".fars/harness-manifests/claude-agent-sdk-plugin.json"
---


The [`claude-agent-sdk-python`](https://github.com/anthropics/claude-agent-sdk-python) loader accepts plugin directories of a fixed shape — `.claude-plugin/plugin.json` plus `commands/<name>.md` for slash commands, plus optional `agents/`, `hooks/`, and `skills/` subtrees — passed via `ClaudeAgentOptions(plugins=[{type: 'local', path: '<dir>'}])`. This harness wraps every registered FARS verb (the keys of `pyfars.cli.__main__.VERB_MODULES`) as a slash command in such a plugin. The result is a drop-in plugin a user can load into any claude-agent-sdk session and immediately get `/pyfars-validate`, `/pyfars-witness-log`, `/pyfars-dispatch`, and the rest as first-class slash commands.

The plugin is a **pure envelope** in the [PAM channels](../../../library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/fars/concepts/pam-channels.md) sense: the verb's substrate-side machinery is unchanged. When a verb mutates substrate state or asserts an observation, it appends a bilattice-valued `Witness` to `.fars/event-log/<date>.jsonl` on its own channel — exactly as it would for a direct `pyfars <verb>` invocation. The same verb run via the plugin slash command and run via raw shell produces an indistinguishable witness chain, which is the property that makes the runtime swap actually free of substrate cost.

The companion concept note is [`verb-as-bilattice-instrumented-slash-command`](../../../library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/fars/concepts/verb-as-bilattice-instrumented-slash-command.md) — it states the plugin-envelope contract and explains why an envelope-only projection is a load-bearing form of integration, not a degenerate one.

## What gets written

- `<target>/.claude-plugin/plugin.json` — the plugin manifest claude-agent-sdk reads on load (name, description with verb count, version, author).
- `<target>/commands/<verb>.md` — one slash command per FARS verb. Frontmatter has `description` (from the verb's `SPEC.description` or the legacy `cli.help._HELP` entry) and `allowed-tools: Bash(pyfars <verb>:*)` so the slash command is restricted to invoking exactly that one verb. Body lists the verb's parameters (when SPEC-driven), an example, and the invocation block.
- `.fars/harness-manifests/claude-agent-sdk-plugin.json` — records every projected file (verb, byte size, has-SPEC flag, parameter count). `--uninstall` removes exactly that set with the same containment guarantee the sister harnesses use (resolved-path containment, refuses `..` traversal).

## Substrate record contract

Unlike the [`cline-workflows`](../cline-workflows/_index.md) and [`claude-code-hooks`](../claude-code-hooks/_index.md) harnesses, this projection has no markdown record-set on the substrate side. The substrate record-set *is the verb registry* — `pyfars.cli.__main__.VERB_MODULES` plus the per-verb `SPEC` constant (or `cli.help._HELP` entry as fallback). Every verb that exists in the registry will appear as a slash command on the next install. Adding a verb in code automatically adds a slash command on next install, with no parallel record to keep in sync.

This is deliberate. The verb registry is itself a projected substrate — one entry per verb, each with description and parameters. Re-projecting it as `commands/<verb>.md` is a near-isomorphism, the kind of *envelope* projection where the substrate-side authoring shape is already canonical. Substrate-side records would just duplicate `SPEC`.

## Refresh discipline

The plugin is regenerated wholesale on `pyfars install-harness claude-agent-sdk-plugin`. The previous projection's files are removed via the manifest's containment-checked `--uninstall`, and the new set is written. There is no incremental drift between substrate and plugin: every install is a snapshot of `VERB_MODULES` at that moment.

For test isolation, the installer honors `PYFARS_PLUGIN_VERB_FILTER=<comma-separated-verbs>` to project a subset, so a test can install a 2-verb plugin and assert on it without paying the cost of importing every verb module.
