"""The seven operation-kinds typology and the operator → kind classifier.

Round 14 / WOAH #5 — every witness gets tagged with one of seven
``OperationKind`` values, per *operation-kinds-completeness* (AOP):
observation, guard, accounting, query, mutation, analysis, learning.

Three engineering payoffs the typology unlocks (per the theorem):

  - **Hook lifting is kind-driven.** When refactoring an imperative
    hook into a substrate operation, the kind determines the closure-
    rule pattern: guards become admissibility-value rules, mutations
    become insertion-and-witness operators, accounting becomes ledger
    predications. The shape follows from the kind.

  - **Witness coverage is kind-uniform.** Audit checks parameterize
    by kind rather than by operator name, so adding a new operator
    inherits the kind's audit discipline automatically. ``pyfars audit``
    can summarize "every mutation has a before-hash" once instead of
    per-operator.

  - **Cost accounting is kind-aware.** Queries are free
    (cost-discipline-reads-free); observations and guards are cheap;
    mutations carry their downstream cascade cost (wavefront-
    termination); learning is the most expensive. Total platform cost
    decomposes as the integral of per-kind rates.

The classifier resolves operator → kind via a registry of known
operators, with a channel-name fallback for unknown operators (the
channel often telegraphs the kind: ``"learning"`` channel → learning
kind, ``"heartbeat"`` → observation, etc.). The terminal fallback is
``"mutation"`` — the most common shape for substrate emissions — so
unknown operators classify conservatively rather than crashing the
witness constructor.

References:
  AOP: operation-kinds (concept), operation-kinds-completeness (theorem).
"""

from __future__ import annotations

from typing import Literal

OperationKind = Literal[
    "observation",
    "guard",
    "accounting",
    "query",
    "mutation",
    "analysis",
    "learning",
]
"""The seven kinds, per *operation-kinds-completeness* (AOP).

  - **observation** — records what happened; pure event predication
    (writes a witness about an arrival / state change without
    transforming other state).
  - **guard** — produces an admissibility value (true/false/contested);
    does not perform the action, only valuates it. Dispatch decisions
    and authorization checks are guards.
  - **accounting** — updates a ledger predication; resource flow
    bookkeeping. Distinct from mutation because the ledger has its
    own audit discipline.
  - **query** — read-only; per *cost-discipline-reads-free* never
    emits a witness in well-disciplined code (queries that DO emit
    witnesses are observation-tagged, not query-tagged).
  - **mutation** — admit-and-settle step; transforms substrate state.
    The most common kind. Default for unknown operators.
  - **analysis** — composed query producing aggregate output (also
    typically witness-free; analyses that emit witnesses do so as
    observation, not analysis-tagged).
  - **learning** — self-modification; edits the substrate's own
    closure-rule system (skills, instincts, refined specs, failure
    diagnoses, distilled lessons). The most expensive kind.
"""


OPERATION_KINDS: tuple[OperationKind, ...] = (
    "observation",
    "guard",
    "accounting",
    "query",
    "mutation",
    "analysis",
    "learning",
)
"""Canonical iteration order for the seven kinds.

Used by audit summaries, kind-distribution reports, and the witness
constructor's validation. The ordering is the order they appear in
*operation-kinds.md* (no semantic significance beyond display
stability)."""


# Operator → kind registry. Every operator that emits witnesses in
# the FARS codebase appears here; the entries reflect the call-site
# audit done in Round 14:
#
#   - ``commit``           — git-commit witnesses (cli/witness_commits.py)
#   - ``tick``             — heartbeat ticks (runtime/heartbeat.py)
#   - ``session``          — session start/save (runtime/session.py)
#   - ``dispatch``         — dispatch decisions (runtime/dispatch.py); the
#                            (truth, evidence) axes carry the
#                            admissibility verdict
#   - ``command_ship``     — issued ship commands (runtime/group.py)
#   - ``receive_message``  — inbox writes (cli/receive.py)
#   - ``fm_*`` / ``set_fm_field`` / ``insert_*`` / ``remove_*`` /
#     ``delete_*`` / ``move_*`` / ``rename_*`` / ``rewrite_*`` —
#     substrate operators (operator/insertion.py, retraction.py,
#     relocation.py)
#   - ``diagnose``         — failure-diagnosis witnesses
#                            (operator/witness.py: make_diagnosis_witness)
#   - ``lesson``           — distilled lessons
#                            (operator/witness.py: make_lesson_witness)
#
# Ledger references to ``operator="commit"`` in DEFAULT_BINDINGS
# (runtime/ledger.py:172/180/188) are *binding specs*, not emission
# sites — they classify how a commit witness is *booked* into the
# ledger, but the witness itself is always an observation produced
# by cli/witness_commits.py.
OPERATOR_KIND: dict[str, OperationKind] = {
    # observation — recording-what-happened operators
    "commit": "observation",
    "tick": "observation",
    # Wavefront layer / terminal events (Round 16 / WOAH #2 — the
    # heartbeat is the agential reflection of the substrate's
    # wavefront; layer + outcome witnesses observe the registration
    # view's evolution, they do not transform substrate content).
    "wavefront_layer": "observation",
    "wavefront_quiesced": "observation",
    "wavefront_fuel_exhausted": "observation",
    "wavefront_h1_obstruction": "observation",
    # Federation envelope lifecycle (Round 17 / WOAH #3 — federation-
    # convergence as substrate-level CRDT). Emission, admission,
    # dedup, and rejection are all *observations* of the federation
    # boundary's state — the substrate-mutating step is the per-cell
    # join_k fold, registered as ``federation_cell_merged`` (mutation)
    # below. This split keeps the audit-coverage discipline crisp:
    # mutations carry before/after hashes for cell content; the
    # envelope-level events carry routing/dedup metadata only.
    "federation_envelope_emitted": "observation",
    "federation_envelope_admitted": "observation",
    "federation_envelope_deduplicated": "observation",
    "federation_envelope_rejected": "observation",
    "session": "observation",
    # guard — admissibility-decision operators
    "dispatch": "guard",
    # mutation — substrate-state-transforming operators
    "command_ship": "mutation",
    "receive_message": "mutation",
    "set_fm_field": "mutation",
    "fm_set": "mutation",
    "fm_add": "mutation",
    "fm_remove": "mutation",
    "insert_fm_item": "mutation",
    "insert_flatfile": "mutation",
    "insertion": "mutation",
    "remove_fm_item": "mutation",
    "remove_fm_key": "mutation",
    "delete_flatfile": "mutation",
    "retraction": "mutation",
    "move_flatfile": "mutation",
    "rename_fm_key": "mutation",
    "rewrite_body_link": "mutation",
    "relocation": "mutation",
    # Federation cell merge (Round 17 / WOAH #3) — the per-cell
    # join_k fold into the receiver's fiber. The substrate-mutating
    # half of the federation pair (the envelope-level lifecycle
    # events above are observations).
    "federation_cell_merged": "mutation",
    # learning — self-modification operators (the substrate edits its
    # own closure-rule system: skills, instincts, distilled lessons,
    # failure diagnoses, and dispatch-policy rule-system edits per
    # Round 15 / WOAH #6 — a dispatch rule edit IS a closure-rule-
    # system edit per the dispatch-as-closure-rule-system theorem).
    "diagnose": "learning",
    "lesson": "learning",
    "closure_rule_extend": "learning",
    "closure_rule_replace": "learning",
    "closure_rule_retract": "learning",
    # Promotion pipeline (Round 18 / WOAH #4 — promote-is-strictly-
    # cost-reducing; settlement-path arc and parallel work-item arc).
    # All five operators are ``learning`` per the channel discipline:
    # the promote operator's substrate effect is registering a new
    # matured record (or rejecting and recording the missing
    # condition) — both shapes are self-modification of the substrate's
    # closure-rule system per AOP's ``learning`` concept.
    "promote_observation_to_instinct": "learning",
    "promote_instinct_to_skill": "learning",
    "promote_skill_to_tool": "learning",
    "promote_idea_to_plan": "learning",
    "promote_rejected": "learning",
    # Claude-Code hook operators (captain-installed via cli/install_harness;
    # surfaced here so the registry is the single source of truth for
    # operator → kind, even when hook records reference them dynamically).
    "claude_session_start": "observation",
    "claude_user_prompt": "observation",
    # claude_tool_use: PreToolUse admissibility decision (the truth/
    # evidence axes carry the allow-or-block verdict). If a PostToolUse
    # record is wired to operator=claude_tool_use, it inherits "guard"
    # here — that's incorrect; the convention is PostToolUse hooks use
    # operator=claude_tool_result (observation) below.
    "claude_tool_use": "guard",
    "claude_tool_result": "observation",  # PostToolUse recording
    "claude_stop": "observation",
    "governance_secret_match": "guard",
}


# Channel → kind fallback. When an unknown operator appears on a
# channel that telegraphs its kind, classify by channel rather than
# defaulting to mutation. This is how new operators that follow the
# channel discipline get classified correctly without first being
# registered.
CHANNEL_KIND: dict[str, OperationKind] = {
    "learning": "learning",
    "heartbeat": "observation",
    "session": "observation",
    "substrate": "mutation",
    "command": "mutation",
    "dispatch": "guard",
    "governance": "guard",
    "ledger": "accounting",
    "audit": "analysis",
}


def classify(operator: str, channel: str | None = None) -> OperationKind:
    """Resolve a witness's operation kind from its operator + channel.

    Resolution order:

      1. Registry lookup on ``operator`` — the canonical answer for
         every operator the FARS codebase emits.
      2. Channel fallback — if the operator is unknown but the
         channel telegraphs a kind (``"learning"`` → learning,
         ``"heartbeat"`` → observation, etc.), use the channel's kind.
      3. Default to ``"mutation"`` — the conservative shape, since
         most unknown operators that bother to emit a witness are
         transforming substrate state.

    The default is conservative because misclassifying as mutation
    is loud (audit checks for mutations are stricter — before-hash,
    after-hash, witness emission), while misclassifying as e.g. query
    would silently understate cost and audit coverage. A wrong
    "mutation" tag will surface as a failing audit; a wrong "query"
    tag would not.
    """
    if operator in OPERATOR_KIND:
        return OPERATOR_KIND[operator]
    if channel and channel in CHANNEL_KIND:
        return CHANNEL_KIND[channel]
    return "mutation"


def is_valid_kind(value: str) -> bool:
    """True iff ``value`` is one of the seven canonical kinds.

    Used by ``Witness.__post_init__`` to reject typos / drift before
    they reach the event log. The witness constructor calls this
    instead of catching a ``Literal``-mismatch at type-check time
    because witnesses are also constructed from JSON on read, where
    static typing doesn't help.
    """
    return value in OPERATION_KINDS


__all__ = [
    "CHANNEL_KIND",
    "OPERATION_KINDS",
    "OPERATOR_KIND",
    "OperationKind",
    "classify",
    "is_valid_kind",
]
