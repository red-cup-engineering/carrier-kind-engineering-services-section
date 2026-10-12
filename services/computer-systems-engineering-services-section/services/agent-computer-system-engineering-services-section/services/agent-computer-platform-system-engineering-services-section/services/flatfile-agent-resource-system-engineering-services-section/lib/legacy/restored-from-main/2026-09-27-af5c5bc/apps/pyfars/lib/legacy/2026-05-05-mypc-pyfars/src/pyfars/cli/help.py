"""``pyfars help <verb>`` — usage + worked example for one verb.

This module is also the legacy fallback source of truth for verb
descriptions: ``description_for(verb)`` returns the one-line summary
that ``cli/_runner.make_parser`` injects as argparse's description for
verbs that haven't migrated to ``SPEC``-driven definitions. Spec-driven
verbs read their description from their own ``SPEC.description``.
"""
from __future__ import annotations

import importlib
import sys

from pyfars.spec import Parameter, VerbSpec, format_help, make_argparse

SPEC = VerbSpec(
    name="help",
    description="Print usage + worked example for one verb.",
    example="pyfars help validate",
    notes="With no verb, lists every verb. Spec-driven verbs render full parameter docs.",
    output="Markdown help section for the verb on stdout.",
    parameters=(
        Parameter(name="verb", kind="positional", required=False, default=None,
                  description="verb to describe (omit to list all)"),
    ),
)


def description_for(verb: str) -> str | None:
    """Return the one-line description for a verb, or None if unknown."""
    entry = _HELP.get(verb)
    return entry[0] if entry else None

# (verb name, one-line description, example invocation, optional notes)
_HELP: dict[str, tuple[str, str, str]] = {
    "agents": (
        "List registered agents in the discovered FARS profile.",
        "pyfars agents",
        "Reads `.fars/config.toml`; one line per agent with caps and skills.",
    ),
    "audit": (
        "Structural-risk analysis of the depends-on graph (load-bearing slugs, body-vs-deps mismatches).",
        "pyfars audit library/domains/humanities/.../predication-categories",
        "Writes <root>/dependency-audit.md by default.",
    ),
    "belief": (
        "Print the four-valued bilattice state of a (target, attribute) cell.",
        "pyfars belief library/notes/widget.md --attribute description",
        "Folds event-log witnesses through the knowledge-join. Exit 0=settled+consistent, 3=contested (⊤), 4=unsettled (⊥).",
    ),
    "check": (
        "Fast single-file validate.",
        "pyfars check path/to/note.md",
        "Use this in agent edit loops; full corpus checks belong to `validate`.",
    ),
    "cite": (
        "Generate references.bib from inline `references:` blocks + annotation files.",
        "pyfars cite . --check",
        "`--check` validates without writing.",
    ),
    "command": (
        "Issue a command to a ship of the loaded polity (witness on the 'command' channel).",
        "pyfars command --ship ship:rsc-quiescent --action begin-voyage --by personnel:emsenn",
        "Authorizes by office-membership on the ship's polity; denied commands still emit an audit witness.",
    ),
    "commit": (
        "Stage corpus .md changes and commit with an auto-generated message.",
        "pyfars commit --apply",
        "Default dry-run; refuses to touch non-.md files.",
    ),
    "compose": (
        "Render the subtree as a single markdown monograph.",
        "pyfars compose library/.../math/theories/algebra --title Algebra",
        "Falls back to flat topo-sort when no narratives with `chapters:` exist.",
    ),
    "context": (
        "Bounded-budget BFS subgraph from a slug for LLM context injection.",
        "pyfars context bilattice --depth 2 --budget 8000",
        "Use this to load a slug + its dep neighborhood as one prompt blob.",
    ),
    "diff": (
        "Run check rules on every .md changed since a git ref.",
        "pyfars diff --since main",
        "Useful in CI / pre-commit. Includes uncommitted unless --committed-only.",
    ),
    "dispatch": (
        "Find agents eligible to take an operational task.",
        "pyfars dispatch achievement-system",
        "Filters by work-type, skills, capabilities, jurisdiction, charter; sorts by load.",
    ),
    "ledger": (
        "Lens the witness event-log as a double-entry ledger (postings, tally, balance).",
        "pyfars ledger balance",
        "Realizes the captain's transactional-record-infrastructure plan over the existing event-log; non-zero exit on stationarity failure.",
    ),
    "fm": (
        "Read or mutate a note's frontmatter without YAML editing.",
        'pyfars fm widget --set "description=A small testing widget." --add depends-on=base',
        "Without operations, prints the current frontmatter as YAML.",
    ),
    "fm-keys": (
        "Every frontmatter key in the corpus, ranked by frequency.",
        "pyfars fm-keys --rare",
        "`--rare` shows only keys used by ≤3 notes — drift / typo detector.",
    ),
    "from-template": (
        "Clone an existing note's frontmatter shape under a new slug.",
        "pyfars from-template bilattice four-bilattice",
        "Copies fm keys (clears values), preserves `kind:` and `component-of:`.",
    ),
    "group": (
        "Load + validate the polity records under operations/command/group/.",
        "pyfars group validate",
        "Subcommands: validate (cross-reference graph check), show (print loaded records).",
    ),
    "hook-dispatch": (
        "Internal: project one Claude Code hook event onto the FARS event log.",
        "pyfars hook-dispatch tool-use-success < payload.json",
        "Invoked by the single-dispatcher shim the `claude-code-hooks` harness installs; "
        "captain-facing invocation is rare. Reads stdin (capped 1 MB), applies the record's "
        "on-truncation + sentinel-pattern policy.",
    ),
    "impact": (
        "Transitive descendants of a slug, ranked by status (proved first).",
        "pyfars impact bilattice",
        "Run before editing a load-bearing slug.",
    ),
    "index": (
        "Build, refresh, or query the sqlite load cache.",
        "pyfars index --rebuild",
        "Optional cache; consumers opt in via cache=True. Status / clear flags too.",
    ),
    "install-hooks": (
        "Drop a pre-commit hook running `pyfars diff --since HEAD --committed-only`.",
        "pyfars install-hooks",
        "`--uninstall` removes the managed block.",
    ),
    "intents": (
        "Drain the dispatch-intent queue (list / show / claim / resolve / reject).",
        "pyfars intents list --status pending",
        "Inbox-side counterpart to `queue-intent`. Each transition writes a witness on the dispatch channel.",
    ),
    "lint": (
        "List or auto-fix common corpus problems (missing depends-on, empty description, key casing, ...).",
        "pyfars lint --fix --code missing-trailing-newline",
        "Without --fix, just lists. With --code X, runs only that linter.",
    ),
    "list": (
        "Enumerate notes by kind / domain / path substring.",
        "pyfars list --kind theorem --domain theorems",
        "Add --json for machine-readable output.",
    ),
    "list-verbs": (
        "Emit the verb catalog with descriptions + examples.",
        "pyfars list-verbs --json",
        "Designed for tooling integrations (MCP servers, IDE plugins).",
    ),
    "match": (
        "Rank polity offices against a task by predicate-fiber composition.",
        "pyfars match --requires build,test --ship ship:rsc-quiescent",
        "Implements the dispatch-and-matching analysis. Exits 3 when no office is eligible.",
    ),
    "mcp": (
        "Run an MCP server exposing every corpus verb as a tool.",
        "pyfars mcp --root .",
        "Requires the packaged MCP dependency from the Nix devshell/package. Stdio transport is designed to be launched as a subprocess.",
    ),
    "move": (
        "Rename or relocate a note, rewriting every inbound fm + body reference.",
        "pyfars move concepts/widget.md objects/widget.md --apply",
        "Default is dry-run. Pass --apply to actually move.",
    ),
    "install-harness": (
        "Install (or uninstall) a PyFARS harness — a runtime-specific view of the substrate for an external agent.",
        "pyfars install-harness replit",
        "Run with no positional arg to list available harnesses. The `replit` harness shims every PyFARS skill into `.agents/skills/` so Replit Agent picks them up.",
    ),
    "next": (
        "Find the next eligible work-item for an agent (agent-side dispatch).",
        "pyfars next --as claude-code --limit 3",
        "Resolves --as via personnel → persona → .fars/config.toml; ranks by priority then load.",
    ),
    "receive": (
        "Record an inbound message in the substrate inbox.",
        'pyfars receive --from persona:emsenn --content "Please draft the bilattice section."',
        "Writes a kind:message under operations/command/group/inbox/ and emits a `receive_message` witness.",
    ),
    "new": (
        "Scaffold a new note with kind-correct frontmatter and rubric body.",
        "pyfars new theorem widget-soundness --depends-on widget",
        "Avoids YAML errors at creation time.",
    ),
    "plan": (
        "Research-demand views: question readiness, enablement frontier, realization gaps.",
        "pyfars plan library/domains/humanities/.../predication-categories",
        "Writes <root>/research-program.md by default.",
    ),
    "profile": (
        "Show the discovered FARS instance profile.",
        "pyfars profile",
        "Walks parents from CWD looking for .fars/config.toml.",
    ),
    "query": (
        "18 read-only graph + EAVT subcommands (asks, fiber, neighborhood, nominate, champion, ...).",
        "pyfars query nominate",
        "Run `pyfars query` with no subcommand to see the full list.",
    ),
    "queue-intent": (
        "Record a parsed intent from an external principal in the dispatch queue.",
        'pyfars queue-intent --from "google:117xxx" --intent "Draft the bilattice nucleus theorem."',
        "Writes a kind:dispatch-intent under operations/engineering/triage/dispatch-intents/ and emits a `queue_intent` witness. Drain with `pyfars intents`.",
    ),
    "ramp": (
        "Topo-sorted reading list of a slug's transitive ancestors.",
        "pyfars ramp bilattice",
        'Answers "what do I need to read first to understand this?".',
    ),
    "rename-fm-key": (
        "Bulk-rename a frontmatter key across the corpus.",
        "pyfars rename-fm-key date-created date_created --apply",
        "Default dry-run.",
    ),
    "rewrite-slug": (
        "Rename a slug everywhere; file stays in its directory.",
        "pyfars rewrite-slug widget gizmo --apply",
        "Sugar over `move <old> <samedir>/<new>.md`.",
    ),
    "search": (
        "Ranked text + frontmatter search.",
        'pyfars search "bilattice" --kind concept --limit 10',
        "Title=10, slug=8, description=4, body=1 weighting; --regex for regex.",
    ),
    "show": (
        "Pretty-print a note + its in/out edges.",
        "pyfars show bilattice",
        "First tool to reach for when an agent needs to know what a slug is.",
    ),
    "skills": (
        "Enumerate, describe, and invoke engineering skills (list / show / run).",
        "pyfars skills list --pack work",
        "Walks operations/engineering/skills/<pack>/<skill>/SKILL.md; subcommands: list, show, run.",
    ),
    "serve": (
        "Start the FARS web server (REST API + OpenAPI + browser UI).",
        "pyfars serve --host 0.0.0.0 --port 5000",
        "Browser UI at /; OpenAPI/Swagger at /docs; ReDoc at /redoc.",
    ),
    "snapshot": (
        "Save current corpus state via git stash (or filesystem copy).",
        "pyfars snapshot --label before-bulk-edit",
        "`--list` shows existing snapshots; `--no-git` forces filesystem mode.",
    ),
    "stats": (
        "One-shot corpus health overview (counts, edges, broken links, top load-bearing).",
        "pyfars stats",
        "",
    ),
    "undo": (
        "Restore from a snapshot — overwrite current files with snapshot content.",
        "pyfars undo before-bulk-edit",
        "Restore semantics, not merge: post-snapshot edits to those files are lost.",
    ),
    "validate": (
        "Run every default rule and emit a markdown diagnostic report.",
        "pyfars validate library/domains/humanities/.../predication-categories",
        "Exits 1 if any error-severity diagnostic was emitted.",
    ),
    "watch": (
        "Re-run a verb on file changes; the wrapped invocation gets argv passthrough.",
        "pyfars watch validate library/domains/humanities/.../predication-categories",
        "Polls every --interval seconds (default 1.5). Ctrl-C to stop.",
    ),
    "where": (
        "Suggest the canonical directory for a new note of a given kind.",
        "pyfars where theorem widget-soundness",
        "Frequency analysis over existing notes' parent directories.",
    ),
    "witness-commits": (
        "Materialize commit-as-witness bindings into the FARS event log.",
        "pyfars witness-commits --limit 200",
        "Realizes the commit-as-witness substrate-bridge: walks `git log` "
        "and appends one Witness per substantive commit. Idempotent.",
    ),
    "witness-log": (
        "Tail the FARS event log (witness chain).",
        "pyfars witness-log --tail 50",
        "Reads `<root>/.fars/event-log/`; one line per witness.",
    ),
    "work": (
        "Emit a workitem entity for one of the post-planning spokes.",
        "pyfars work assign <task> <office>",
        "Sub-verbs: assign, auto-dispatch, budget, execute, feedback, "
        "ingest, review, tick, track. `execute` invokes an LLM endpoint "
        "when the target is one; `tick` is the heartbeat (pick → dispatch "
        "→ ingest → mark completed); `ingest` lands a reply as a draft.",
    ),
}


def _spec_for(verb: str) -> VerbSpec | None:
    """Return the verb's SPEC if it has migrated, else None."""
    from pyfars.cli.__main__ import VERB_MODULES
    if verb not in VERB_MODULES:
        return None
    try:
        module = importlib.import_module(f"pyfars.cli.{VERB_MODULES[verb]}")
    except ImportError:
        return None
    return getattr(module, "SPEC", None)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)

    if args.verb is None:
        # No verb → list the catalog. Goes to stdout because that's the
        # genuine answer to "what verbs are there?" — MCP clients naturally
        # call corpus_help with no args and need the listing on stdout.
        print("usage: pyfars help <verb>")
        print("\nverbs:")
        from pyfars.cli.__main__ import VERB_MODULES
        for v in sorted(VERB_MODULES):
            spec = _spec_for(v)
            desc = (spec.description if spec is not None
                    else (_HELP.get(v, ("",))[0]))
            print(f"  {v:18s}  {desc}")
        return 0

    verb = args.verb
    spec = _spec_for(verb)
    if spec is not None:
        print(format_help(spec))
        return 0

    if verb not in _HELP:
        print(f"pyfars help: unknown verb {verb!r}", file=sys.stderr)
        print("verbs: " + ", ".join(sorted(_HELP)), file=sys.stderr)
        return 2

    desc, example, notes = _HELP[verb]
    print(f"# pyfars {verb}")
    print()
    print(desc)
    print()
    print("## Example")
    print()
    print(f"    $ {example}")
    print()
    if notes:
        print(notes)
        print()
    print("## Argparse details")
    print()
    print(f"Run `pyfars {verb} --help` for the full flag list.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
