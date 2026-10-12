# pyfars

Tools for working with this repository's frontmatter-markdown corpus.

The whole repo is one corpus. Every CLI takes a path (default CWD) and walks
it. There's no `pyfars.toml` to discover, no privileged "program" directory —
you point at any subtree and the same code runs.

## First five minutes

If you're new (agent or human), the canonical orientation flow:

```bash
# Where am I? What's the shape of this corpus?
$ pyfars stats
$ pyfars list --kind theorem | head

# What does this slug mean, and what depends on it?
$ pyfars show bilattice
$ pyfars impact bilattice

# I want to work on something — what's the rough background?
$ pyfars ramp bilattice                      # reading list
$ pyfars context bilattice --depth 2          # one bounded markdown blob

# I want to add a new note — where should it go and what shape?
$ pyfars where theorem widget                 # picks the canonical dir
$ pyfars new theorem widget --depends-on alpha,beta

# I edited a thing — did I break anything?
$ pyfars check path/to/note.md                # one file, sub-second
$ pyfars validate                             # whole tree

# Exploration / cleanup
$ pyfars search "bilattice algebra" --bm25    # ranked search
$ pyfars query nominate                       # cleanup leverage targets
$ pyfars lint --fix                           # apply auto-fixers

# Refactoring (always dry-run by default)
$ pyfars move concepts/widget.md objects/widget.md   # dry-run
$ pyfars move concepts/widget.md objects/widget.md --apply
$ pyfars rename-fm-key date_created date-created --apply

# Don't trust your refactor? Snapshot before, undo after.
$ pyfars snapshot --label before-bulk-edit
$ pyfars undo before-bulk-edit

# Calling from Python (no argparse)
>>> from pyfars import api
>>> diags = api.validate(".")
>>> rows = api.search(".", "bilattice", bm25=True, limit=5)

# Machine-readable verb catalog (for MCP / IDE integrations)
$ pyfars list-verbs --json
```

## Quick reference

```
$ pyfars
verbs: agents, audit, audit-commits, belief, check, cite, command, commit,
       compose, context, diff, dispatch, fm, fm-keys, from-template, group,
       help, hook-dispatch, impact, index, install-harness, install-hooks,
       intents, ledger, lint, list, list-verbs, match, mcp, move, new, next,
       plan, profile, query, queue-intent, ramp, receive, rename-fm-key,
       rewrite-slug, search, serve, show, skills, snapshot, stats, undo,
       validate, watch, where, witness, witness-commits, witness-log, work
```

| verb | one-liner |
|---|---|
| `agents` | list registered agents in the discovered FARS profile |
| `audit` | structural-risk analysis (load-bearing slugs, body-vs-deps mismatches) |
| `audit-commits` | classify recent commits and bind substantive commits to task/entity witnesses |
| `belief` | fold event-log witnesses into a four-valued bilattice state for a cell |
| `check` | fast single-file validate |
| `cite` | generate references.bib from inline `references:` blocks |
| `command` | issue a polity/ship command and record the act as a witness |
| `commit` | stage corpus .md changes and commit (auto-message by default) |
| `compose` | render the subtree as a single markdown monograph |
| `context` | bounded-budget BFS subgraph from a slug for LLM context |
| `diff` | run check rules on every .md changed since a git ref |
| `dispatch` | find agents eligible to take an operational task |
| `fm` | read or mutate a note's frontmatter without YAML editing |
| `fm-keys` | every frontmatter key, ranked by frequency (drift detector) |
| `from-template` | clone an existing note's fm shape under a new slug |
| `group` | inspect polity, ship, office, and personnel records |
| `help` | usage + worked example for one verb |
| `hook-dispatch` | internal Claude Code hook event projection onto the FARS event log |
| `impact` | transitive descendants of a slug, ranked by status |
| `index` | manage the optional sqlite load cache |
| `install-harness` | generate or remove runtime-specific harness projections |
| `install-hooks` | drop a pre-commit hook running `pyfars diff` |
| `intents` | list, claim, resolve, or reject queued dispatch-intent records |
| `ledger` | lens the witness event log as a double-entry ledger |
| `lint` | list or auto-fix common corpus problems |
| `list` | enumerate notes by kind / domain / path substring |
| `list-verbs` | machine-readable catalog (verb, description, example) |
| `match` | rank polity offices against a task by predicate-fiber composition |
| `mcp` | start an MCP server exposing every verb as a tool |
| `move` | rename or relocate a note, rewriting every inbound reference |
| `new` | scaffold a new note with kind-correct frontmatter and rubric body |
| `next` | find the next eligible work item for an agent |
| `plan` | research-demand views (question readiness, frontier, gaps) |
| `profile` | show the discovered FARS instance profile |
| `query` | 18 read-only graph + EAVT subcommands |
| `queue-intent` | record a parsed external-principal intent in the dispatch queue |
| `ramp` | topo-sorted reading list of a slug's transitive ancestors |
| `receive` | record an inbound message in the substrate inbox |
| `rename-fm-key` | bulk-rename a frontmatter key across the corpus |
| `rewrite-slug` | rename a slug everywhere; file stays in its directory |
| `search` | ranked text + frontmatter search (substring, regex, or BM25) |
| `serve` | start the FARS web server |
| `show` | pretty-print a note + its in/out edges |
| `skills` | enumerate, describe, and invoke engineering skills |
| `snapshot` | save corpus state via git stash (or filesystem copy) |
| `stats` | one-shot corpus health overview |
| `undo` | restore from a snapshot |
| `validate` | run every default rule and emit a diagnostic report |
| `watch` | re-run a verb on file changes |
| `where` | suggest the canonical directory for a new note of a given kind |
| `witness` | emit a witness to the FARS event log |
| `witness-commits` | materialize commit-as-witness bindings into the event log |
| `witness-log` | tail the FARS event log |
| `work` | run work orchestration subcommands |

`pyfars help <verb>` gives a one-paragraph description and worked example.
`pyfars list-verbs` is the authoritative generated catalog; use
`pyfars list-verbs --json` for tooling.

## Spec-driven verbs

Verbs that have migrated declare a single `SPEC: VerbSpec` constant
that drives every surface — argparse, the typed `run()` Python entry,
the MCP tool schema, the help text, and `pyfars list-verbs --json`.
This eliminates the previous duplication where each verb's argument
shape lived in argparse, in `api.py`, in `cli/mcp.py` (string-parsed),
and in `cli/help.py` independently.

Each spec-driven verb file looks like:

```python
SPEC = VerbSpec(
    name="impact",
    description="Transitive descendants of a slug, ranked by status (proved first).",
    example="pyfars impact bilattice",
    parameters=(
        Parameter(name="slug", kind="positional", required=True, ...),
        Parameter(name="root", kind="flag", type=Path, default=Path("."), ...),
        Parameter(name="json", kind="store_true", ...),
    ),
)

def run(slug: str, *, root: Path | str = ".") -> dict | None:
    ...   # typed entry — no argparse

def main(argv=None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    ...   # delegates to run(), prints output
```

Run `pyfars list-verbs` to see which verbs have migrated; the rest
keep working through their hand-rolled `main`. Migration is one file
at a time.

## Architecture

The package is layered around the predication substrate. Every leaf is one of:

- one frozen dataclass (`substrate/types/`)
- one pure function (everywhere else)
- one CLI entry (`cli/<verb>.py:main`)
- one private helper (`_*` underscore prefix)

Composition happens at call sites. No leaf module orchestrates.

```
src/pyfars/
├── substrate/  flatfile substrate primitives: parse, load, index, types
│   ├── types/  Flatfile, Predication, Diagnostic, Suggestion, Reference,
│   │           BibEntry, Claim, Link
│   ├── parse/  text -> typed: frontmatter, links, citations, bibtex,
│   │           fm_relations, fm_references, fm_annotation, link_kind
│   ├── load/   path -> typed: flatfile, flatfiles, bib, path filters
│   └── index/  collection -> derived: by_slug, by_kind, edges,
│               in_edges, out_edges, depends_on, dependents, claims
├── operator/   substrate operators
│   ├── traversal/ ancestors, descendants, cycles, topo_sort,
│   │              foundation_distance, resolve_term, chain
│   └── edit/      fm_set, fm_add, fm_rm, rewrite_fm, rename_fm_key,
│                  rewrite_fm_slug, rewrite_body_link, move_note
├── closure/
│   ├── valuation/ note -> number / bool: inbound, broken_outbound,
│   │              clean_outbound, body_chars, density, has_description,
│   │              structure, citation_density, reference_count,
│   │              rubric_coverage, slop, firmness, composite
│   ├── rule/      corpus -> diagnostics: cycles, broken_links,
│   │              broken_citations, ambiguous_reference, bib_health,
│   │              stubs, orphans, status_consistency, proofs, symbols,
│   │              capability_coverage, charter_binding, compose_rules
│   └── lint/      corpus -> suggestions: depends_on_completeness,
│                  empty_description, trailing_newline, fm_key_casing,
│                  compose_lint
├── analyze/  multi-output structured analyses: nominate, champion,
│             impact, ramp, where, stats, search, context_walk,
│             open_questions, question_blockers, question_readiness_view,
│             question_clusters, enablement_frontier, demand_clusters,
│             realization_gaps, split_candidates, loose_concepts,
│             load_bearing_pillars, isolated_morphisms,
│             unnamed_ancestor_candidates, predicate_category,
│             crossref_vs_depends_on, inbound_refs
├── render/   data → string: bibtex_entry, bibtex_file,
│             diagnostic_line, diagnostics_section, diagnostics_report,
│             monograph_block, monograph_chapter, monograph_part,
│             monograph_preface, monograph_appendix_questions,
│             monograph_appendix_further_reading, monograph,
│             audit_report, plan_report, stats_report, impact_report,
│             ramp_report, context_blob, show_note, note_template,
│             fm_dump, json_dump, _author_name, _demote_headings,
│             _extract_title, _kind_label, _link_rewrite, _strip_lean,
│             _title
├── runtime/  FARS profile, event log, sessions, ledger, agent/group
│             matching, federation, and command container runtime
├── skills/   substrate skill records and helpers
├── web/      FastAPI app and browser UI for `pyfars serve`
├── harnesses/
│             templates and installers for generated repo surfaces:
│             repo instructions, Nix flake, Claude Code, hooks, Replit,
│             Cline workflows, Claude Agent SDK plugin
└── cli/      argparse + load + compose + render
    ├── _runner.py    make_parser / resolve_root / workspace_from_args
    ├── help.py       _HELP dict (legacy fallback for non-spec-driven verbs)
    ├── top-level verbs as <name>.py
    ├── work/         work orchestration subcommands
    └── query/        18 subcommands as <name>.py + __main__ dispatcher

src/pyfars/
├── convention.py  KIND_LABEL, RELATION_KEYS, INTERNAL_FIELDS, ...
├── workspace.py   Workspace dataclass with lazy notes + indexes
├── spec.py        VerbSpec + Parameter + argparse/MCP/help generators
├── api.py         programmatic entry points (validate, search, show, ...)
└── __main__.py    module dispatcher for the `pyfars` console script
```

## Running

The package is built and exercised through Nix. From the PyFARS repository root:

```bash
nix develop -c pyfars <verb> [args...]
```

To build the package:

```bash
nix build
nix run .#pyfars -- <verb> [args...]
```

From the 561 meta-repo, use `./dev.sh` for normal work. It enters the root
Nix devshell and applies local sibling overrides, so the checked-out PyFARS
member is the `pyfars` on `PATH`.

## Tests

```bash
nix flake check
nix develop -c pytest tests -q
```

The suite is 900+ tests covering:
- Foundational layers (substrate parse/load/index, traversal, valuation,
  edit, lint)
- Analytics (BM25 search, sqlite cache, fm-keys, snapshot, audit views)
- `convention` invariants (kind groups disjoint, badge supersets theorems, ...)
- `Workspace` lazy-load + caching
- `api.*` programmatic entry points (read + edit operations)
- CLI smoke tests and generated-harness regressions

Shared `tests/conftest.py` provides the fixture corpus. `nix flake check` is
the package-level gate; direct `pytest` is for faster local narrowing inside
the devshell.

## Extending

### Add a new rule

1. Write `src/pyfars/closure/rule/<name>.py` exporting
   `def check(notes, ...) -> Iterator[Diagnostic]`.
2. Add the import + call in `rule/compose_rules.py`.
3. Add the (code, title) entry to `render/diagnostics_report.py`'s
   `DEFAULT_SECTION_ORDER` so it appears in validate's report.
4. Write `tests/test_rule_<name>.py`.

### Add a new score

1. Write `src/pyfars/closure/valuation/<name>.py` exporting
   `def score(note_or_slug, *, …) -> ...`. One function, no orchestration.
2. Compose it with others via `closure/valuation/composite.score(*signals, combine=...)`
   when you want a multi-signal product.

### Add a new analyze

Functions that return structured data (lists, tier dicts, ranked tuples)
go in `analyze/`. They're allowed to call into multiple `substrate/index/`,
`operator/traversal/`, and `closure/valuation/` modules. One function per file.

### Add a new linter

1. Write `src/pyfars/closure/lint/<name>.py` exporting
   `def find(notes, *, by_slug, root) -> list[Suggestion]`.
2. Each suggestion may carry an optional `apply` callable for `--fix`.
3. Add the import + call in `lint/compose_lint.py`.

### Add a new verb (spec-driven)

1. Write `src/pyfars/cli/<verb>.py`:
   ```python
   from pyfars.spec import Parameter, VerbSpec, make_argparse

   SPEC = VerbSpec(
       name="<verb>",
       description="One-line description.",
       example="pyfars <verb> ...",
       parameters=(
           Parameter(name="slug", kind="positional", required=True,
                     description="..."),
           Parameter(name="root", kind="flag", type=Path, default=Path("."),
                     short="-r", description="corpus root (default: CWD)"),
           Parameter(name="json", kind="store_true", description="..."),
       ),
   )

   def run(slug: str, *, root: Path | str = ".") -> ...:
       """Typed entry — callable from pyfars.api / MCP."""
       ...

   def main(argv=None) -> int:
       args = make_argparse(SPEC).parse_args(argv)
       ...
   ```
2. Add the verb to `VERB_MODULES` in `cli/__main__.py`.
3. (Optional) Expose `run()` from `pyfars/api.py`.
4. (Optional) Add a CLI smoke test entry in `tests/test_cli_smoke.py`.

argparse, MCP tool schema, `pyfars help <verb>`, and
`pyfars list-verbs --json` all read from `SPEC` — no duplication.

For a non-spec-driven verb (legacy pattern):

1. Write `src/pyfars/cli/<verb>.py` with `def main(argv) -> int`.
2. Add an entry to `_HELP` in `cli/help.py` (description, example, notes).
3. Add it to `VERB_MODULES` in `cli/__main__.py`.

### Add a query subcommand

1. Write `src/pyfars/cli/query/<name>.py` with
   `def run(ctx: QueryContext, args: list[str]) -> int`.
2. Register it in `SUBCOMMANDS` in `cli/query/__main__.py`.

## Design rules

- **The whole repo is the corpus.** Every CLI takes a path and walks it.
  No discovery of `pyfars.toml` or `research.toml`. Defaults work for any
  subtree.
- **One function per file.** Add a feature by adding a module, not by
  growing a function. Compose at the call site.
- **Constants live in one place.** `RELATION_KEYS`, `INTERNAL_FIELDS`,
  `META`, `SCALAR_CONFIG`, `KIND_LABEL`, `SUBCOLLECTIONS` each live in
  exactly one module. Don't duplicate.
- **Edits are dry-run by default.** `move`, `rename-fm-key`,
  `rewrite-slug`, `lint --fix`, `commit`, `snapshot`/`undo` all require
  an explicit flag (or `--apply`) to mutate.
- **Diagnostics carry enough context to fix.** Path, line, slug, target.
  JSON output preserves all of it; markdown formatting is a render-time
  choice.
- **Path filter excludes draft + build content by default.** `triage/`,
  `archetypes/`, `node_modules/`, `.git/`, vendored markers. Override with
  a custom `path_filter` callable when a tool needs to see drafts (e.g.,
  `query triage-cands`).
- **Caches are opt-in.** `pyfars index --rebuild` builds the sqlite cache;
  `read()` is a separate call consumers must invoke. The default load
  path always re-walks the filesystem so freshness is never a surprise.
- **MCP and web dependencies are packaged.** The Nix flake and
  `pyproject.toml` declare the runtime dependencies for `pyfars mcp` and
  `pyfars serve`; use the Nix shell/package rather than ad hoc installs.

## History

The package was greenfield-rebuilt from `operations/engineering/tools/triage/`
(deleted), which was a six-package ad hoc Python workspace plus a 700-line
`corpus-digraph/query.py`. Each wonky tool there had its own
`analysis.py`/`render.py`/CLI and re-derived overlapping graph queries.
The rebuild collapsed it into one library where every primitive
(descendant counts, body-link extraction, slug normalization) lives once
and is reused.
