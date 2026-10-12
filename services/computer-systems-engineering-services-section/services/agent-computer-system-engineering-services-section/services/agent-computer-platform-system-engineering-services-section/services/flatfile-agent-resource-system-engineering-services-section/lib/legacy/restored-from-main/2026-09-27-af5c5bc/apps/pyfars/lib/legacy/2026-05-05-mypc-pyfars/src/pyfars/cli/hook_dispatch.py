"""``pyfars hook-dispatch <slug>`` — internal: project a Claude Code hook event onto the FARS event log.

Single substrate-side entrypoint shared across every installed hook. The
``claude-code-hooks`` harness writes one shim
(``.claude/hooks/_pyfars-dispatch.sh``) and points every settings.json hook
command at it with the hook slug as positional arg, instead of fanning
out into N per-record shell shims that each spawn their own python
interpreter. This collapses the per-hook-fire process boundary from
"shell + fresh-python-import" (~100-200ms) to "shell + one python
import" (~80-150ms) and folds three patterns the
ECC-hook-architecture-analysis flagged as high-leverage into the
substrate-record-shape projection:

1. **Single-dispatcher** — one verb, one process per fan-out, regardless of how many hook records
   the substrate exposes. Adding a hook record requires no new shim file.
2. **Truncation detection** — stdin is capped at 1 MB (matching ECC's run-with-flags.js cap). The
   record's ``on-truncation`` policy decides ``warn`` (default — emit the witness with
   ``details.truncated=True`` and evidence capped at 0.5), ``block`` (emit + exit 2 so Claude Code
   blocks the operation), or ``passthrough`` (emit unchanged). The graded-evidence treatment is
   the bilattice-native generalization of ECC's per-hook ``truncated`` flag: instead of every
   hook deciding imperatively, the substrate record declares it once and downstream tally sees
   "we observed this hook but our claim about it is half-strength" without bespoke
   per-hook code.
3. **Governance event capture** — records may declare a ``patterns:`` block (list of
   ``{regex, label}``). When present the hook becomes a *sentinel*: a witness is emitted only
   on positive match, with the matched pattern labels recorded in ``details.matched-patterns``
   so the governance audit trail is structured (label-keyed), not free-form. The bilattice
   axes still come from the record's ``witness.truth/evidence``, so a high-severity governance
   record writes ``truth: 0.0, evidence: 1.0`` to mean "the world is in a bad state about this
   and we are sure" — severity rides the truth axis instead of being a separate categorical
   field. Non-matches exit 0 silently (no witness).

Records continue to carry their own ``witness.operator/truth/evidence/channel`` from frontmatter,
so the bilattice axes are still substrate-owned, not dispatcher-imposed. This dispatcher is the
``claude-code`` runtime's; future runtimes (Cursor, Aider, OpenCode) will get sibling dispatchers
that consume the same canonical record shape with their own runtime-specific event enums.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any

from pyfars.operator.witness import Witness, hash_content, now_iso
from pyfars.runtime.event_log import EventLog
from pyfars.spec import Parameter, VerbSpec, make_argparse
from pyfars.substrate.parse.frontmatter import parse as parse_fm

SPEC = VerbSpec(
    name="hook-dispatch",
    description=(
        "Internal: project one Claude Code hook event onto the FARS event log "
        "(reads stdin, applies the hook record's truncation + governance policy)."
    ),
    example="pyfars hook-dispatch tool-use-success < payload.json",
    notes=(
        "Invoked by the single-dispatcher shim the `claude-code-hooks` harness installs at "
        "`.claude/hooks/_pyfars-dispatch.sh`. Reads stdin (capped at 1 MB), loads the named "
        "hook record from `operations/engineering/hooks/<slug>.md`, applies the record's "
        "`on-truncation` policy and (if declared) `patterns:` sentinel filter, and appends a "
        "bilattice-valued Witness to the event log. Captain-facing invocation is rare — this "
        "exists so the harness has a stable substrate verb to wire, not a per-record shell-shim "
        "fan-out."
    ),
    output=(
        "Exit 0 on emission (or sentinel non-match). Exit 2 when `on-truncation: block` and "
        "stdin exceeded the cap. Exit 1 on a malformed / missing record."
    ),
    parameters=(
        Parameter(name="slug", kind="positional", required=True,
                  description="hook record stem (e.g. `tool-use-success`); a leading `hook:` is stripped"),
        Parameter(name="root", kind="flag", default=None, short="-r",
                  description="corpus root (default: $CLAUDE_PROJECT_DIR or CWD)"),
    ),
)

# Stdin payload cap, in bytes. Matches ECC's run-with-flags.js (1 MB).
# Probed via a single read of cap+1 so we detect overflow without
# buffering the entire stream from very-large tool outputs.
_STDIN_CAP = 1024 * 1024

_VALID_TRUNCATION_POLICIES = ("warn", "block", "passthrough")


class HookDispatchError(RuntimeError):
    """Unrecoverable problem during hook dispatch (bad record, bad runtime, missing file)."""


def _resolve_root(explicit: str | None) -> Path:
    """Resolve the FARS root. Prefer explicit --root, then $CLAUDE_PROJECT_DIR, then CWD.

    The shim sets CLAUDE_PROJECT_DIR before exec'ing this module so the
    dispatcher resolves relative to the repo root regardless of where
    Claude Code launched the hook from.
    """
    if explicit:
        return Path(explicit).resolve()
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env).resolve()
    return Path.cwd().resolve()


def _normalize_slug(raw: str) -> str:
    """Strip an optional ``hook:`` prefix; the on-disk file is the bare stem."""
    return raw.split(":", 1)[1] if raw.startswith("hook:") else raw


def _load_hook_record(root: Path, slug: str) -> dict:
    """Load + validate one hook record by stem. Independent of the install-time walker.

    Reads only the requested record (not the whole hooks/ dir) so a
    sibling record's malformation can't break dispatch of an unrelated
    hook. Raises ``HookDispatchError`` with a precise pointer on any
    problem so the operator sees what to fix.
    """
    path = root / "operations/engineering/hooks" / f"{slug}.md"
    if not path.is_file():
        raise HookDispatchError(f"hook record not found: {path}")
    try:
        fm, _body = parse_fm(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HookDispatchError(f"hook record {path} is unparseable: {exc}") from exc
    fm = fm or {}
    if fm.get("kind") != "hook":
        raise HookDispatchError(
            f"hook record {path}: missing or wrong `kind:` (need `hook`, "
            f"got {fm.get('kind')!r})"
        )
    if fm.get("runtime") != "claude-code":
        raise HookDispatchError(
            f"hook record {path}: runtime is {fm.get('runtime')!r}, not "
            f"`claude-code`; this dispatcher is the claude-code dispatcher"
        )
    witness = fm.get("witness") or {}
    if not isinstance(witness, dict) or not witness.get("operator"):
        raise HookDispatchError(f"hook record {path}: missing `witness.operator`")
    try:
        truth = float(witness.get("truth", 1.0))
        evidence = float(witness.get("evidence", 1.0))
    except (TypeError, ValueError) as exc:
        raise HookDispatchError(
            f"hook record {path}: witness.truth/evidence must be numbers "
            f"(got truth={witness.get('truth')!r}, evidence={witness.get('evidence')!r})"
        ) from exc
    for name, val in (("truth", truth), ("evidence", evidence)):
        if not (0.0 <= val <= 1.0):
            raise HookDispatchError(
                f"hook record {path}: witness.{name}={val} out of range; "
                f"bilattice axes must lie in [0, 1]"
            )
    # Round 14 / WOAH #5 guardrail: PostToolUse* events must NOT use
    # operator=claude_tool_use (which is registered as guard for the
    # PreToolUse admissibility decision). The post-tool recording
    # operator is claude_tool_result (classified as observation). A
    # mismatch here would silently misclassify every tool result as
    # a guard, polluting kind-aware audits and cost rollups.
    event_str = str(fm.get("event", ""))
    op_str = str(witness["operator"])
    if event_str.startswith("PostToolUse") and op_str == "claude_tool_use":
        raise HookDispatchError(
            f"hook record {path}: event={event_str!r} with "
            f"operator='claude_tool_use' is a kind-classification "
            f"mismatch — claude_tool_use is the guard-class operator "
            f"for PreToolUse admissibility checks. PostToolUse hooks "
            f"should use operator='claude_tool_result' (observation)."
        )
    on_truncation = str(fm.get("on-truncation", "warn"))
    if on_truncation not in _VALID_TRUNCATION_POLICIES:
        raise HookDispatchError(
            f"hook record {path}: on-truncation={on_truncation!r} not in "
            f"{_VALID_TRUNCATION_POLICIES}"
        )
    patterns_raw = fm.get("patterns") or []
    patterns: list[dict] = []
    if patterns_raw:
        if not isinstance(patterns_raw, list):
            raise HookDispatchError(
                f"hook record {path}: `patterns:` must be a list (got "
                f"{type(patterns_raw).__name__})"
            )
        for i, p in enumerate(patterns_raw):
            if not isinstance(p, dict) or "regex" not in p:
                raise HookDispatchError(
                    f"hook record {path}: patterns[{i}] must be a mapping "
                    f"with a `regex:` key"
                )
            try:
                compiled = re.compile(str(p["regex"]))
            except re.error as exc:
                raise HookDispatchError(
                    f"hook record {path}: patterns[{i}].regex is not a "
                    f"valid regex: {exc}"
                ) from exc
            patterns.append({
                "regex": str(p["regex"]),
                "label": str(p.get("label", f"pattern-{i}")),
                "compiled": compiled,
            })
    return {
        "slug": slug,
        "event": str(fm.get("event", "")),
        "matcher": str(fm.get("matcher", ".*")),
        "operator": str(witness["operator"]),
        "truth": truth,
        "evidence": evidence,
        "channel": str(fm.get("channel", "dispatch")),
        "on_truncation": on_truncation,
        "patterns": patterns,
    }


def _read_stdin_capped(cap: int = _STDIN_CAP) -> tuple[str, bool, int]:
    """Read stdin up to ``cap`` bytes. Return ``(text, truncated, bytes_kept)``.

    Reads ``cap + 1`` bytes so we can detect overflow without buffering
    arbitrarily large payloads (which is the whole point of the cap).
    UTF-8 decoded with ``errors=replace`` since hook payloads can carry
    raw tool output that isn't guaranteed to be valid UTF-8.
    """
    raw = sys.stdin.buffer.read(cap + 1)
    truncated = len(raw) > cap
    if truncated:
        raw = raw[:cap]
    return raw.decode("utf-8", errors="replace"), truncated, len(raw)


def _match_patterns(payload: str, patterns: list[dict]) -> list[dict]:
    """Return the list of matched pattern descriptors (label + regex) in declaration order."""
    matched: list[dict] = []
    for p in patterns:
        if p["compiled"].search(payload):
            matched.append({"label": p["label"], "regex": p["regex"]})
    return matched


def run(*, slug: str, root: Path | str | None = None) -> int:
    """Read stdin, emit a witness for the named hook, return process exit code.

    Returns:
      0 on emission OR on sentinel non-match (no witness).
      2 when ``on-truncation: block`` fired (witness emitted; Claude Code blocks).
    Raises ``HookDispatchError`` for anything malformed in the record itself.
    """
    root_p = _resolve_root(str(root) if root else None)
    norm_slug = _normalize_slug(slug)
    hook = _load_hook_record(root_p, norm_slug)

    payload, truncated, n_bytes = _read_stdin_capped()

    # Sentinel semantics: if the record declares patterns, only fire on a positive match.
    # Lets a single hook record cover the "watch every Bash for these regexes; emit a
    # governance witness when one matches" shape without inventing a separate kind.
    #
    # Truncation interaction: a sentinel hook with `on-truncation: block` MUST emit + exit 2
    # even when the visible portion of the payload contains no match — the substrate's claim
    # is "if I can't inspect the whole thing, I cannot certify it clean." A secret hidden past
    # the 1 MB cap is something the dispatcher cannot rule out, so refusing the operation is
    # the only honest move (the governance-secret-scan exemplar relies on this). For `warn`
    # and `passthrough` policies the conservative read is "no observed violation, stay
    # silent" — emitting a truth=0.0 governance witness with no matches would lie, since the
    # bad-world claim is conditional on actually seeing the bad thing.
    matched: list[dict] = []
    block_on_truncation_without_match = False
    if hook["patterns"]:
        matched = _match_patterns(payload, hook["patterns"])
        if not matched:
            if truncated and hook["on_truncation"] == "block":
                block_on_truncation_without_match = True
            else:
                return 0

    truth = hook["truth"]
    evidence = hook["evidence"]
    block = False
    if truncated:
        if hook["on_truncation"] == "block":
            block = True
        elif hook["on_truncation"] == "warn":
            # Truncation = "we observed the event but couldn't fully inspect the payload."
            # Cap evidence at 0.5 so downstream evidence-weighted tallies discount it
            # automatically. Don't *raise* evidence — if the record was already low-evidence
            # (e.g. SessionStart at 0.5) keep it low.
            evidence = min(evidence, 0.5)
        # passthrough: caller has explicitly decided truncation isn't bilattice-relevant
        # for this hook (e.g. a hook whose payload is intentionally large and that fact
        # isn't meaningful evidence about the underlying event).

    details: dict[str, Any] = {
        "event": hook["event"],
        "matcher": hook["matcher"],
        "hook-slug": hook["slug"],
        "payload-bytes": n_bytes,
    }
    if truncated:
        details["truncated"] = True
        details["truncation-policy"] = hook["on_truncation"]
    if matched:
        # Strip the regex source from the wire form; label is the stable handle for tally
        # filters. The regex is still on the substrate record if anyone needs to audit.
        details["matched-patterns"] = [{"label": m["label"]} for m in matched]
    if block_on_truncation_without_match:
        # Distinguish the "blocked because we couldn't see the whole payload" case from
        # the "blocked because a pattern matched" case in the audit trail. Same channel,
        # same bilattice point — but the operator needs to know which decision was made.
        details["truncation-block-without-match"] = True

    # Hook operators are captain-defined at install time, so we can't
    # bake them into the OPERATOR_KIND registry the way fixed substrate
    # operators are. Run classify() with the hook's channel so the
    # channel-fallback rules (dispatch → guard, governance → guard,
    # learning → learning, etc.) tag this witness with the correct
    # AOP operation-kind regardless of the hook's chosen operator name.
    from pyfars.operator.kind import classify
    w = Witness(
        operator=hook["operator"],
        target=f"claude-code:{hook['event']}",
        before_hash=None,
        after_hash=hash_content(payload) if payload else None,
        timestamp=now_iso(),
        channel=hook["channel"],
        origin=f"claude-code-hook:{hook['slug']}",
        truth=truth,
        evidence=evidence,
        details=details,
        kind=classify(hook["operator"], hook["channel"]),
    )
    EventLog(root=root_p).append(w)
    return 2 if block else 0


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    try:
        return run(slug=args.slug, root=args.root)
    except HookDispatchError as exc:
        print(f"pyfars hook-dispatch: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
