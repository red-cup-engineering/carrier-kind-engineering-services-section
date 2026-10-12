"""Tests for `pyfars.runtime.ledger` and the `pyfars ledger` CLI verb."""
from __future__ import annotations

import json
from pathlib import Path

from pyfars.cli.ledger import main as ledger_main
from pyfars.operator.witness import (
    make_diagnosis_witness, make_lesson_witness, make_witness,
)
from pyfars.runtime.event_log import EventLog
from pyfars.runtime.ledger import (
    Binding,
    DEFAULT_BINDINGS,
    Posting,
    coverage,
    derive_all_lessons,
    derive_failure_cluster_lessons,
    derive_lessons,
    derive_stationarity_leak_lessons,
    detailed_balance,
    filter_postings,
    load_bindings,
    project,
    project_all,
    propose_binding,
    tally,
    witnesses_as_of,
)


# ---------- bilattice (truth / evidence) integration ---------------------

def test_posting_carries_bilattice_axes():
    w = make_witness("fm_add", "x.md", None, "h",
                     truth=0.6, evidence=0.5)
    [p] = project(w)
    assert p.witness_truth == 0.6
    assert p.witness_evidence == 0.5


def test_posting_effective_amount_weight_modes():
    p = Posting("a", "b", 4.0, "X", "t", "op", "ts",
                witness_truth=0.5, witness_evidence=0.25)
    assert p.effective_amount(None) == 4.0
    assert p.effective_amount("truth") == 2.0
    assert p.effective_amount("evidence") == 1.0
    # k_meet uses min(truth, evidence) → conservative.
    assert p.effective_amount("k_meet") == 1.0


def test_tally_weight_by_truth_scales_balances():
    postings = [
        Posting("a", "b", 2.0, "X", "t", "op", "ts",
                witness_truth=0.5, witness_evidence=1.0),
    ]
    classical = tally(postings)
    weighted = tally(postings, weight_by="truth")
    assert classical[("a", "X")].debits == 2.0
    assert weighted[("a", "X")].debits == 1.0


def test_filter_min_truth_min_evidence():
    postings = [
        Posting("a", "b", 1.0, "X", "t", "op", "ts",
                witness_truth=0.9, witness_evidence=0.9),
        Posting("a", "b", 1.0, "X", "t", "op", "ts",
                witness_truth=0.3, witness_evidence=0.9),
        Posting("a", "b", 1.0, "X", "t", "op", "ts",
                witness_truth=0.9, witness_evidence=0.2),
    ]
    assert len(list(filter_postings(postings, min_truth=0.5))) == 2
    assert len(list(filter_postings(postings, min_evidence=0.5))) == 2
    assert len(list(filter_postings(
        postings, min_truth=0.5, min_evidence=0.5))) == 1


# ---------- temporal lens (--as-of) --------------------------------------

def test_witnesses_as_of_lex_compare():
    ws = [
        make_witness("op", "x", None, "h"),
        make_witness("op", "y", None, "h"),
        make_witness("op", "z", None, "h"),
    ]
    object.__setattr__(ws[0], "timestamp", "2026-01-01T00:00:00Z")
    object.__setattr__(ws[1], "timestamp", "2026-02-01T00:00:00Z")
    object.__setattr__(ws[2], "timestamp", "2026-03-01T00:00:00Z")
    kept = list(witnesses_as_of(ws, "2026-02-01T00:00:00Z"))
    assert [w.target for w in kept] == ["x", "y"]
    # No cutoff → pass-through.
    assert len(list(witnesses_as_of(ws, None))) == 3


def test_cli_tally_as_of_rewinds(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    early = make_witness("commit", "sha1", None, "sha1",
                         details={"diff_entities_drafted": ["alpha"]})
    object.__setattr__(early, "timestamp", "2026-01-01T00:00:00Z")
    late = make_witness("commit", "sha2", None, "sha2",
                        details={"diff_entities_drafted": ["beta", "gamma"]})
    object.__setattr__(late, "timestamp", "2026-06-01T00:00:00Z")
    log.append(early)
    log.append(late)
    rc = ledger_main(["--root", str(tmp_path),
                      "--as-of", "2026-03-01T00:00:00Z", "tally"])
    out = capsys.readouterr().out
    assert rc == 0
    # Only the early posting (1 ARTIFACT) should be in scope.
    assert "1.00" in out
    assert "3.00" not in out  # late posting (2 entities) excluded


# ---------- continuous-learning closure ----------------------------------

def test_derive_lessons_threshold(tmp_path):
    ws = [make_witness("rare_op", "x", None, "h")]
    ws += [make_witness("common_op", "y", None, "h") for _ in range(5)]
    lessons = derive_lessons(ws, threshold=3)
    # Only the operator that crossed threshold gets a lesson.
    assert len(lessons) == 1
    assert "common_op" in lessons[0].details["pattern"]
    assert lessons[0].details["evidence_count"] == 5
    # Stronger evidence than a hypothetical 1-observation lesson.
    weak = make_lesson_witness(pattern="x", suggested_action="y",
                               evidence_count=1)
    assert lessons[0].evidence > weak.evidence


def test_cli_learn_dry_run(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    for _ in range(4):
        log.append(make_witness("mystery_op", "x", None, "h"))
    rc = ledger_main(["--root", str(tmp_path), "learn", "--threshold", "3"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "mystery_op" in out
    # Dry-run: no lesson witness recorded.
    log2 = EventLog(root=tmp_path)
    ops = {w.operator for w in log2.read_all()}
    assert "lesson" not in ops


def test_cli_learn_record_appends_lesson_witness(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    for _ in range(4):
        log.append(make_witness("mystery_op", "x", None, "h"))
    rc = ledger_main(["--root", str(tmp_path), "learn",
                      "--threshold", "3", "--record"])
    assert rc == 0
    log2 = EventLog(root=tmp_path)
    lessons = [w for w in log2.read_all() if w.operator == "lesson"]
    assert len(lessons) == 1
    assert lessons[0].channel == "learning"
    # And the lesson itself is now ledger-projectable as an asset.
    rc2 = ledger_main(["--root", str(tmp_path),
                       "--commodity", "LESSONS", "tally"])
    out = capsys.readouterr().out
    assert rc2 == 0
    assert "assets:knowledge:lessons" in out
    assert "equity:learning" in out


def test_learn_record_is_idempotent_on_unchanged_log(tmp_path, capsys):
    """The continuous-learning loop must not double-count: re-running
    `learn --record` on an unchanged log emits zero new lessons."""
    log = EventLog(root=tmp_path)
    for _ in range(4):
        log.append(make_witness("mystery_op", "x", None, "h"))
    rc1 = ledger_main(["--root", str(tmp_path), "learn",
                       "--threshold", "3", "--record"])
    capsys.readouterr()
    assert rc1 == 0
    rc2 = ledger_main(["--root", str(tmp_path), "learn",
                       "--threshold", "3", "--record"])
    capsys.readouterr()
    assert rc2 == 0
    lessons = [w for w in EventLog(root=tmp_path).read_all()
               if w.operator == "lesson"]
    # Exactly one lesson recorded across both runs.
    assert len(lessons) == 1


def test_learn_record_emits_again_on_stronger_evidence(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    for _ in range(3):
        log.append(make_witness("mystery_op", "x", None, "h"))
    ledger_main(["--root", str(tmp_path), "learn",
                 "--threshold", "3", "--record"])
    capsys.readouterr()
    # Now more evidence accumulates: the lesson should re-emit.
    for _ in range(5):
        log.append(make_witness("mystery_op", "x", None, "h"))
    ledger_main(["--root", str(tmp_path), "learn",
                 "--threshold", "3", "--record"])
    capsys.readouterr()
    lessons = [w for w in EventLog(root=tmp_path).read_all()
               if w.operator == "lesson"]
    assert len(lessons) == 2
    counts = sorted(int(w.details["evidence_count"]) for w in lessons)
    assert counts == [3, 8]


def test_learn_force_reemits_even_on_unchanged_log(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    for _ in range(4):
        log.append(make_witness("mystery_op", "x", None, "h"))
    ledger_main(["--root", str(tmp_path), "learn",
                 "--threshold", "3", "--record"])
    capsys.readouterr()
    ledger_main(["--root", str(tmp_path), "learn",
                 "--threshold", "3", "--record", "--force"])
    capsys.readouterr()
    lessons = [w for w in EventLog(root=tmp_path).read_all()
               if w.operator == "lesson"]
    assert len(lessons) == 2


# ---------- failure-cluster lesson family --------------------------------

def _diag(target: str, *, failed: str, cause: str, ts: str | None = None):
    """Build a diagnose witness, optionally with a fixed timestamp."""
    w = make_diagnosis_witness(target, cause=cause, failed_operator=failed)
    if ts is not None:
        object.__setattr__(w, "timestamp", ts)
    return w


def test_failure_cluster_below_threshold_yields_nothing():
    """Two confirmations is incident, not pattern. Threshold is the
    observation→instinct boundary, not negotiable."""
    ws = [_diag("x", failed="commit", cause="locked"),
          _diag("y", failed="commit", cause="locked")]
    assert derive_failure_cluster_lessons(ws, threshold=3) == []


def test_failure_cluster_at_threshold_emits_one_lesson():
    ws = [_diag(f"t{i}", failed="commit", cause="locked",
                ts=f"2026-01-{i+1:02d}T00:00:00Z") for i in range(3)]
    [lesson] = derive_failure_cluster_lessons(ws, threshold=3)
    assert lesson.operator == "lesson"
    assert lesson.channel == "learning"
    assert lesson.details["pattern"] == "failure-cluster:commit:locked"
    assert lesson.details["evidence_count"] == 3
    # All source timestamps captured for traceability, sorted.
    assert lesson.details["source_witnesses"] == [
        "2026-01-01T00:00:00Z",
        "2026-01-02T00:00:00Z",
        "2026-01-03T00:00:00Z",
    ]


def test_failure_cluster_distinguishes_op_cause_pairs():
    """`commit + locked` and `commit + bad-fm` are separate clusters even
    though they share the failed operator — the cause discriminates."""
    ws = [_diag(f"a{i}", failed="commit", cause="locked") for i in range(3)]
    ws += [_diag(f"b{i}", failed="commit", cause="bad-fm") for i in range(3)]
    ws += [_diag(f"c{i}", failed="move", cause="locked") for i in range(3)]
    lessons = derive_failure_cluster_lessons(ws, threshold=3)
    patterns = sorted(w.details["pattern"] for w in lessons)
    assert patterns == [
        "failure-cluster:commit:bad-fm",
        "failure-cluster:commit:locked",
        "failure-cluster:move:locked",
    ]


def test_failure_cluster_evidence_grows_with_count():
    """The bilattice evidence axis must monotonically reflect strength
    of backing — a 9-confirmation lesson outranks a 3-confirmation one."""
    ws3 = [_diag(f"a{i}", failed="op", cause="x") for i in range(3)]
    ws9 = [_diag(f"b{i}", failed="op", cause="x") for i in range(9)]
    [l3] = derive_failure_cluster_lessons(ws3, threshold=3)
    [l9] = derive_failure_cluster_lessons(ws9, threshold=3)
    assert l9.evidence > l3.evidence


def test_failure_cluster_ignores_non_diagnose_witnesses():
    """Coverage gaps and lesson-witnesses themselves are NOT failure
    clusters; the family must filter strictly on operator==diagnose."""
    ws = [make_witness("commit", f"x{i}", None, "h") for i in range(5)]
    ws += [make_lesson_witness(pattern="p", suggested_action="a",
                               evidence_count=5)]
    assert derive_failure_cluster_lessons(ws, threshold=3) == []


# ---------- stationarity-leak lesson family ------------------------------

def test_stationarity_leak_skips_when_no_closure_declared():
    """The family's central guard: undeclared closure-accounts mean
    the captain has not contracted any account to close. Firing under
    the strict-default would carpet-bomb stocks like
    `assets:knowledge:library`. No declaration → no lessons."""
    ws = [make_witness("fm_add", f"x{i}.md", None, "h") for i in range(5)]
    assert derive_stationarity_leak_lessons(
        ws, DEFAULT_BINDINGS, closure_accounts=None, threshold=3) == []
    assert derive_stationarity_leak_lessons(
        ws, DEFAULT_BINDINGS, closure_accounts={}, threshold=3) == []


def test_stationarity_leak_only_for_declared_closure_accounts():
    """A declared TASKS closure account that accumulates 5 unmatched
    drafts crosses threshold and produces a lesson; an UNDECLARED
    ARTIFACTS account in the same log does not, even if equally
    out-of-balance."""
    ws = [make_witness("commit", f"sha{i}", None, f"sha{i}",
                       details={"diff_tasks_drafted": [f"t{i}"],
                                "diff_entities_drafted": [f"e{i}"]})
          for i in range(5)]
    closure = {"TASKS": {"assets:work:tasks-ready"}}
    lessons = derive_stationarity_leak_lessons(
        ws, DEFAULT_BINDINGS, closure_accounts=closure, threshold=3)
    [lesson] = lessons
    assert lesson.details["pattern"] == (
        "stationarity-leak:TASKS:assets:work:tasks-ready"
    )
    assert lesson.details["evidence_count"] == 5
    assert lesson.channel == "learning"


def test_stationarity_leak_below_threshold_silent():
    ws = [make_witness("commit", f"sha{i}", None, f"sha{i}",
                       details={"diff_tasks_drafted": [f"t{i}"]})
          for i in range(2)]
    closure = {"TASKS": {"assets:work:tasks-ready"}}
    assert derive_stationarity_leak_lessons(
        ws, DEFAULT_BINDINGS, closure_accounts=closure, threshold=3) == []


def test_stationarity_leak_silent_on_balanced_account():
    """Drafts matched by an equal-and-opposite credit operator yield
    zero net — no leak, no lesson, regardless of throughput."""
    drafts = [make_witness("commit", f"sha{i}", None, f"sha{i}",
                           details={"diff_tasks_drafted": [f"t{i}"]})
              for i in range(5)]
    # A custom binding that credits the same account when tasks
    # are completed (synthetic but representative).
    closes = [make_witness("task_close", f"t{i}", None, "h") for i in range(5)]
    bindings = DEFAULT_BINDINGS + (
        Binding(operator="task_close",
                debit="equity:plan",
                credit="assets:work:tasks-ready",
                commodity="TASKS",
                memo="task closed"),
    )
    closure = {"TASKS": {"assets:work:tasks-ready"}}
    assert derive_stationarity_leak_lessons(
        drafts + closes, bindings, closure_accounts=closure,
        threshold=3) == []


# ---------- composer + CLI integration -----------------------------------

def test_derive_all_lessons_unions_three_families():
    """One window, three pattern shapes, one composed call. The
    bilattice substrate underneath each family is identical — they
    differ only in pattern string."""
    # Family 1: unmapped operator (no binding for `weird_op`).
    unmapped = [make_witness("weird_op", f"u{i}", None, "h") for i in range(4)]
    # Family 2: failure cluster (3 diagnoses, same failed-op + cause).
    failures = [_diag(f"d{i}", failed="commit", cause="locked")
                for i in range(3)]
    # Family 3: stationarity leak (5 task drafts, declared closure).
    drafts = [make_witness("commit", f"sha{i}", None, f"sha{i}",
                           details={"diff_tasks_drafted": [f"t{i}"]})
              for i in range(5)]
    closure = {"TASKS": {"assets:work:tasks-ready"}}
    lessons = derive_all_lessons(unmapped + failures + drafts,
                                 DEFAULT_BINDINGS, closure, threshold=3)
    patterns = sorted(w.details["pattern"] for w in lessons)
    assert patterns == [
        "failure-cluster:commit:locked",
        "stationarity-leak:TASKS:assets:work:tasks-ready",
        "unmapped-operator:weird_op",
    ]
    # Every lesson lands on the learning channel under the lesson op.
    assert {w.operator for w in lessons} == {"lesson"}
    assert {w.channel for w in lessons} == {"learning"}


def test_cli_learn_emits_failure_cluster_lessons(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    for i in range(3):
        log.append(_diag(f"t{i}", failed="commit", cause="locked"))
    rc = ledger_main(["--root", str(tmp_path), "learn",
                      "--threshold", "3", "--record"])
    capsys.readouterr()
    assert rc == 0
    lessons = [w for w in EventLog(root=tmp_path).read_all()
               if w.operator == "lesson"]
    [l] = lessons
    assert l.details["pattern"] == "failure-cluster:commit:locked"


def test_cli_learn_emits_stationarity_leak_when_closure_declared(
        tmp_path, capsys):
    """End-to-end: a `.fars/ledger.toml` declaring a closure account,
    a witness stream that leaks it, and the CLI must crystallize a
    stationarity-leak lesson — without further config."""
    fars_dir = tmp_path / ".fars"
    fars_dir.mkdir()
    (fars_dir / "ledger.toml").write_text(
        '[closure-accounts]\nTASKS = ["assets:work:tasks-ready"]\n',
        encoding="utf-8",
    )
    log = EventLog(root=tmp_path)
    for i in range(5):
        log.append(make_witness(
            "commit", f"sha{i}", None, f"sha{i}",
            details={"diff_tasks_drafted": [f"t{i}"]}))
    rc = ledger_main(["--root", str(tmp_path), "learn",
                      "--threshold", "3", "--record"])
    capsys.readouterr()
    assert rc == 0
    lessons = [w for w in EventLog(root=tmp_path).read_all()
               if w.operator == "lesson"]
    [l] = lessons
    assert l.details["pattern"].startswith("stationarity-leak:TASKS:")


def test_cli_learn_idempotent_across_families(tmp_path, capsys):
    """Per-pattern idempotency must hold uniformly across families —
    every lesson keys by `pattern`, so the existing
    `existing_lesson_strengths` filter applies once for all three."""
    fars_dir = tmp_path / ".fars"
    fars_dir.mkdir()
    (fars_dir / "ledger.toml").write_text(
        '[closure-accounts]\nTASKS = ["assets:work:tasks-ready"]\n',
        encoding="utf-8",
    )
    log = EventLog(root=tmp_path)
    # All three families primed at the threshold-crossing count.
    for i in range(4):
        log.append(make_witness("weird_op", f"u{i}", None, "h"))
    for i in range(3):
        log.append(_diag(f"d{i}", failed="commit", cause="locked"))
    for i in range(5):
        log.append(make_witness(
            "commit", f"sha{i}", None, f"sha{i}",
            details={"diff_tasks_drafted": [f"t{i}"]}))
    ledger_main(["--root", str(tmp_path), "learn",
                 "--threshold", "3", "--record"])
    capsys.readouterr()
    first = [w for w in EventLog(root=tmp_path).read_all()
             if w.operator == "lesson"]
    assert len(first) == 3
    ledger_main(["--root", str(tmp_path), "learn",
                 "--threshold", "3", "--record"])
    capsys.readouterr()
    second = [w for w in EventLog(root=tmp_path).read_all()
              if w.operator == "lesson"]
    # Idempotent across all three families — no double-counting.
    assert len(second) == 3


# ---------- input validation ---------------------------------------------

def test_cli_min_truth_out_of_range_rejected(tmp_path, capsys):
    import pytest as _pytest
    with _pytest.raises(SystemExit):
        ledger_main(["--root", str(tmp_path), "--min-truth", "1.5",
                     "postings"])


def test_cli_as_of_malformed_rejected(tmp_path, capsys):
    import pytest as _pytest
    with _pytest.raises(SystemExit):
        ledger_main(["--root", str(tmp_path), "--as-of", "yesterday",
                     "tally"])


def test_cli_as_of_canonical_accepted(tmp_path, capsys):
    rc = ledger_main(["--root", str(tmp_path),
                      "--as-of", "2026-05-01T00:00:00Z", "tally"])
    capsys.readouterr()
    assert rc == 0


def test_learn_record_with_as_of_is_idempotent(tmp_path, capsys):
    """Regression: prior lessons recorded NOW must still suppress
    re-emission when `--as-of <past>` is supplied next run, even
    though those lessons fall outside the as-of window."""
    log = EventLog(root=tmp_path)
    for i in range(4):
        w = make_witness("mystery_op", "x", None, "h")
        object.__setattr__(w, "timestamp", "2026-01-01T00:00:00Z")
        log.append(w)
    # First run records a lesson (with current/now timestamp,
    # outside the 2026-01-01 cutoff).
    rc1 = ledger_main(["--root", str(tmp_path), "--as-of",
                       "2026-02-01T00:00:00Z",
                       "learn", "--threshold", "3", "--record"])
    capsys.readouterr()
    assert rc1 == 0
    # Second run with same window: must NOT re-emit despite the
    # recorded lesson being outside the as-of window.
    rc2 = ledger_main(["--root", str(tmp_path), "--as-of",
                       "2026-02-01T00:00:00Z",
                       "learn", "--threshold", "3", "--record"])
    capsys.readouterr()
    assert rc2 == 0
    lessons = [w for w in EventLog(root=tmp_path).read_all()
               if w.operator == "lesson"]
    assert len(lessons) == 1


def test_cli_as_of_fractional_seconds_rejected(tmp_path, capsys):
    """Mixed-precision timestamps break lex ordering — the regex
    must accept ONLY seconds-precision (matches now_iso output)."""
    import pytest as _pytest
    with _pytest.raises(SystemExit):
        ledger_main(["--root", str(tmp_path),
                     "--as-of", "2026-05-01T00:00:00.123Z", "tally"])


def test_witness_truth_out_of_range_rejected():
    import pytest as _pytest
    with _pytest.raises(ValueError):
        make_witness("op", "x", None, "h", truth=1.5)
    with _pytest.raises(ValueError):
        make_witness("op", "x", None, "h", evidence=-0.1)


def test_default_lesson_binding_books_to_knowledge_assets():
    w = make_lesson_witness(pattern="p", suggested_action="a",
                            evidence_count=2)
    [p] = project(w)
    assert p.debit == "assets:knowledge:lessons"
    assert p.credit == "equity:learning"
    assert p.commodity == "LESSONS"


# ---------- channel / origin / filter integration -------------------------

def test_project_carries_witness_channel_and_origin_into_posting():
    w = make_witness(
        "commit", "sha", None, "sha",
        details={"diff_entities_drafted": ["alpha"]},
        channel="substrate", origin="hook:post-commit",
    )
    [p] = project(w)
    assert p.witness_channel == "substrate"
    assert p.witness_origin == "hook:post-commit"


def test_filter_postings_by_channel_origin_operator_commodity():
    postings = [
        Posting("a", "b", 1.0, "X", "t", "op1", "ts",
                witness_channel="dispatch", witness_origin="hookA"),
        Posting("a", "b", 1.0, "X", "t", "op2", "ts",
                witness_channel="learning", witness_origin="hookB"),
        Posting("a", "b", 1.0, "Y", "t", "op1", "ts",
                witness_channel="dispatch", witness_origin="hookA"),
    ]
    assert len(list(filter_postings(postings, channel="dispatch"))) == 2
    assert len(list(filter_postings(postings, origin="hookB"))) == 1
    assert len(list(filter_postings(postings, operator="op1"))) == 2
    assert len(list(filter_postings(postings, commodity="Y"))) == 1
    # Combined filters compose with AND.
    assert len(list(filter_postings(
        postings, channel="dispatch", commodity="X"))) == 1


def test_default_diagnosis_binding_books_expense():
    """make_diagnosis_witness emits an operator the default chart maps
    to expenses:diagnosis ← equity:capability in the DIAGNOSES commodity."""
    w = make_diagnosis_witness(
        target="task/t1.md",
        cause="precondition X failed",
        failed_operator="dispatch",
    )
    [p] = project(w)
    assert p.debit == "expenses:diagnosis"
    assert p.credit == "equity:capability"
    assert p.commodity == "DIAGNOSES"
    assert p.witness_channel == "learning"


# ---------- propose_binding (learning loop) ------------------------------

def test_propose_binding_emits_valid_toml_skeleton():
    out = propose_binding("brand_new_op", count=4)
    assert "[bindings.brand_new_op]" in out
    assert 'operator = "brand_new_op"' in out
    assert "TODO" in out
    assert "4 witness" in out  # mentions count


def test_cli_coverage_propose_binding_for_one_operator(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    log.append(make_witness("brand_new_op", "x", None, "h"))
    rc = ledger_main(["--root", str(tmp_path), "coverage",
                      "--propose-binding", "brand_new_op"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "[bindings.brand_new_op]" in out


def test_cli_coverage_propose_binding_unknown_operator_exits_1(tmp_path, capsys):
    rc = ledger_main(["--root", str(tmp_path), "coverage",
                      "--propose-binding", "no_such_op"])
    assert rc == 1


def test_cli_coverage_propose_binding_all(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    log.append(make_witness("op_alpha", "x", None, "h"))
    log.append(make_witness("op_beta", "y", None, "h"))
    rc = ledger_main(["--root", str(tmp_path), "coverage",
                      "--propose-binding", "all"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "[bindings.op_alpha]" in out
    assert "[bindings.op_beta]" in out


# ---------- CLI filter wiring --------------------------------------------

def _seed_mixed_channels(root):
    log = EventLog(root=root)
    log.append(make_witness(
        "commit", "sha", None, "sha",
        details={"diff_entities_drafted": ["a"]},
        channel="substrate", origin="hook:post-commit",
    ))
    log.append(make_diagnosis_witness(
        target="x.md", cause="missing dep",
        failed_operator="dispatch", origin="dispatcher",
    ))


def test_cli_postings_channel_filter(tmp_path, capsys):
    _seed_mixed_channels(tmp_path)
    rc = ledger_main(["--root", str(tmp_path),
                      "--channel", "learning", "postings"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "diagnose" in out
    assert "commit" not in out


def test_cli_tally_origin_filter(tmp_path, capsys):
    _seed_mixed_channels(tmp_path)
    rc = ledger_main(["--root", str(tmp_path),
                      "--origin", "dispatcher", "tally"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "expenses:diagnosis" in out
    assert "assets:knowledge:library" not in out


# ---------- projection -----------------------------------------------------

def test_project_commit_with_drafted_entities_emits_one_posting_per_entity():
    w = make_witness(
        operator="commit",
        target="abc123",
        before_hash=None,
        after_hash="abc123",
        details={"diff_entities_drafted": ["alpha", "beta", "gamma"]},
    )
    postings = project(w)
    drafts = [p for p in postings if p.memo == "entity drafted"]
    assert len(drafts) == 1
    assert drafts[0].amount == 3.0
    assert drafts[0].debit == "assets:knowledge:library"
    assert drafts[0].credit == "equity:capability"
    assert drafts[0].commodity == "ARTIFACTS"


def test_project_commit_emits_separate_postings_per_binding_match():
    w = make_witness(
        operator="commit",
        target="def456",
        before_hash=None,
        after_hash="def456",
        details={
            "diff_entities_drafted": ["x"],
            "diff_entities_refined": ["y", "z"],
            "diff_tasks_drafted": ["t1"],
        },
    )
    postings = project(w)
    by_memo = {p.memo: p for p in postings}
    assert "entity drafted" in by_memo
    assert "entity refined" in by_memo
    assert "task drafted" in by_memo
    assert by_memo["entity refined"].amount == 2.0
    assert by_memo["task drafted"].commodity == "TASKS"


def test_project_witness_with_no_matching_binding_emits_nothing():
    w = make_witness(
        operator="totally_unknown_op",
        target="x.md",
        before_hash=None,
        after_hash="h",
    )
    assert project(w) == []


def test_project_fm_add_emits_unit_posting():
    w = make_witness("fm_add", "x.md", None, "h", details={"key": "title"})
    postings = project(w)
    assert len(postings) == 1
    assert postings[0].amount == 1.0


# ---------- tally ----------------------------------------------------------

def test_tally_separates_commodities():
    postings = [
        Posting("a", "b", 5.0, "TASKS", "t", "op", "ts"),
        Posting("a", "b", 3.0, "ARTIFACTS", "t", "op", "ts"),
    ]
    balances = tally(postings)
    assert balances[("a", "TASKS")].debits == 5.0
    assert balances[("a", "ARTIFACTS")].debits == 3.0
    assert ("a", "TOKENS") not in balances


def test_tally_accumulates_debits_and_credits():
    postings = [
        Posting("a", "b", 2.0, "X", "t1", "op", "ts1"),
        Posting("a", "b", 3.0, "X", "t2", "op", "ts2"),
        Posting("b", "a", 1.0, "X", "t3", "op", "ts3"),
    ]
    balances = tally(postings)
    a = balances[("a", "X")]
    b = balances[("b", "X")]
    assert a.debits == 5.0 and a.credits == 1.0 and a.balance == 4.0
    assert b.debits == 1.0 and b.credits == 5.0 and b.balance == -4.0


# ---------- detailed balance ----------------------------------------------

def test_detailed_balance_strict_default_passes_when_every_account_zero():
    """Strict default: every account must close to zero."""
    postings = [
        Posting("a", "b", 5.0, "X", "t", "op", "ts"),
        Posting("b", "a", 5.0, "X", "t", "op", "ts"),
    ]
    checks = detailed_balance(postings)
    assert checks["X"].balanced
    flows = {f.account: f for f in checks["X"].flows}
    assert flows["a"].net == 0.0 and flows["b"].net == 0.0


def test_detailed_balance_strict_default_fails_on_real_accumulation():
    """End-to-end: drafts entered ready-queue with no matching completion.

    This is the captain's diagnostic case — `tasks-ready` accumulates
    debits, no credit ever arrives, the closure account leaks.
    """
    postings = [
        Posting("assets:work:tasks-ready", "equity:plan", 3.0,
                "TASKS", "t", "op", "ts"),
    ]
    checks = detailed_balance(postings)
    assert not checks["TASKS"].balanced
    flows = {f.account: f for f in checks["TASKS"].flows}
    assert flows["assets:work:tasks-ready"].net == 3.0
    assert not flows["assets:work:tasks-ready"].closed
    assert flows["equity:plan"].net == -3.0


def test_detailed_balance_with_closure_accounts_ignores_stocks():
    """When closure-accounts is declared, stock accounts may accumulate."""
    postings = [
        Posting("assets:knowledge:library", "equity:capability", 10.0,
                "ARTIFACTS", "t", "op", "ts"),
    ]
    closure = {"ARTIFACTS": set()}  # explicitly: no closure accounts
    checks = detailed_balance(postings, closure_accounts=closure)
    assert checks["ARTIFACTS"].balanced
    flows = {f.account: f for f in checks["ARTIFACTS"].flows}
    assert not flows["assets:knowledge:library"].is_closure_account
    assert flows["assets:knowledge:library"].net == 10.0


def test_detailed_balance_mixed_configured_and_unconfigured_commodities():
    """Strict default applies per-commodity: declaring TASKS does not
    silently relax the rule for ARTIFACTS.
    """
    postings = [
        Posting("assets:work:tasks-ready", "equity:plan", 3.0,
                "TASKS", "t", "op", "ts"),
        Posting("assets:knowledge:library", "equity:capability", 5.0,
                "ARTIFACTS", "t", "op", "ts"),
    ]
    # Declare TASKS as having no closure accounts (allow stock).
    # ARTIFACTS is undeclared, so strict default applies.
    closure = {"TASKS": set()}
    checks = detailed_balance(postings, closure_accounts=closure)
    assert checks["TASKS"].balanced  # stock-only commodity, no closure
    assert not checks["ARTIFACTS"].balanced  # strict default still fails


def test_detailed_balance_closure_account_leak_fails():
    """A declared closure account with non-zero net fails the check."""
    postings = [
        # 5 drafts: tasks-ready debited.
        Posting("assets:work:tasks-ready", "equity:plan", 5.0,
                "TASKS", "t", "op", "ts"),
        # 2 completions: tasks-ready credited (work exits the ready stage).
        Posting("assets:work:tasks-completed", "assets:work:tasks-ready",
                2.0, "TASKS", "t", "op", "ts"),
    ]
    # tasks-ready net = 5 - 2 = 3 (still leaking).
    closure = {"TASKS": {"assets:work:tasks-ready"}}
    checks = detailed_balance(postings, closure_accounts=closure)
    assert not checks["TASKS"].balanced
    flows = {f.account: f for f in checks["TASKS"].flows}
    assert flows["assets:work:tasks-ready"].net == 3.0


# ---------- coverage ------------------------------------------------------

def test_coverage_reports_unmapped_operators():
    witnesses = [
        make_witness("commit", "sha", None, "sha",
                     details={"diff_entities_drafted": ["a"]}),
        make_witness("totally_new_op", "x", None, "h"),
        make_witness("totally_new_op", "y", None, "h"),
    ]
    cov = coverage(witnesses)
    assert cov.total_witnesses == 3
    assert cov.projected_witnesses == 1
    assert cov.unmapped_witnesses == 2
    by_op = dict(cov.unmapped_operators)
    assert by_op["totally_new_op"] == 2


def test_coverage_counts_witness_with_zero_amount_as_unmapped():
    """A commit whose details are empty produces no posting → unmapped."""
    w = make_witness("commit", "sha", None, "sha", details={"subject": "x"})
    cov = coverage([w])
    assert cov.unmapped_witnesses == 1


# ---------- bindings config -----------------------------------------------

def test_load_bindings_returns_defaults_when_file_missing(tmp_path):
    assert load_bindings(tmp_path / "missing.toml") is DEFAULT_BINDINGS


def test_load_bindings_overrides_when_file_present(tmp_path):
    cfg = tmp_path / "ledger.toml"
    cfg.write_text(
        '[bindings.my-rule]\n'
        'operator = "myop"\n'
        'debit = "assets:foo"\n'
        'credit = "equity:bar"\n'
        'commodity = "WIDGETS"\n'
        'memo = "test"\n',
        encoding="utf-8",
    )
    bindings = load_bindings(cfg)
    assert len(bindings) == 1
    assert bindings[0].operator == "myop"
    assert bindings[0].commodity == "WIDGETS"


def test_load_bindings_skips_malformed_entries(tmp_path):
    cfg = tmp_path / "ledger.toml"
    cfg.write_text(
        '[bindings.bad]\n'
        'operator = "x"\n'
        '# missing debit/credit\n'
        '[bindings.good]\n'
        'operator = "x"\n'
        'debit = "a"\n'
        'credit = "b"\n',
        encoding="utf-8",
    )
    bindings = load_bindings(cfg)
    assert len(bindings) == 1
    assert bindings[0].debit == "a"


# ---------- end-to-end via event-log + CLI --------------------------------

def _seed_log_balanced(root: Path) -> None:
    """Drafts AND completions in matching pairs — every account zeroes."""
    log = EventLog(root=root)
    log.append(make_witness(
        "commit", "sha-1", None, "sha-1",
        details={"diff_entities_drafted": ["alpha"], "subject": "Add alpha"},
    ))
    # Custom binding will be needed for a true matching credit; the
    # default bindings only debit on draft. So we add a complementary
    # binding via .fars/ledger.toml that credits library on a synthetic
    # "complete" operator, and emit one matching witness.
    cfg = root / ".fars"
    cfg.mkdir(exist_ok=True)
    (cfg / "ledger.toml").write_text(
        '[bindings.draft]\n'
        'operator = "commit"\n'
        'on = "diff_entities_drafted"\n'
        'debit = "assets:knowledge:library"\n'
        'credit = "equity:capability"\n'
        'commodity = "ARTIFACTS"\n'
        '\n'
        '[bindings.archive]\n'
        'operator = "archive"\n'
        'debit = "equity:capability"\n'
        'credit = "assets:knowledge:library"\n'
        'commodity = "ARTIFACTS"\n',
        encoding="utf-8",
    )
    log.append(make_witness("archive", "alpha.md", "h", None,
                            details={}))


def _seed_log_leaking(root: Path) -> None:
    """Drafts only, no matching completions — closure account leaks."""
    log = EventLog(root=root)
    log.append(make_witness(
        "commit", "sha-1", None, "sha-1",
        details={"diff_entities_drafted": ["alpha", "beta"]},
    ))


def test_cli_balance_balanced_corpus_returns_zero(tmp_path, capsys):
    _seed_log_balanced(tmp_path)
    rc = ledger_main(["--root", str(tmp_path), "balance"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "stationarity" in out


def test_cli_balance_real_imbalance_exits_nonzero(tmp_path, capsys):
    """End-to-end via event-log + bindings + CLI: leak → exit 1."""
    _seed_log_leaking(tmp_path)
    rc = ledger_main(["--root", str(tmp_path), "balance"])
    out = capsys.readouterr().out
    assert rc == 1
    assert "leaking" in out


def test_cli_balance_real_imbalance_json_exits_nonzero(tmp_path, capsys):
    _seed_log_leaking(tmp_path)
    rc = ledger_main(["--root", str(tmp_path), "--json", "balance"])
    out = capsys.readouterr().out
    payload = json.loads(out)
    assert rc == 1
    assert payload["ARTIFACTS"]["balanced"] is False


def test_cli_tally_lists_accounts(tmp_path, capsys):
    _seed_log_leaking(tmp_path)
    rc = ledger_main(["--root", str(tmp_path), "tally"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "assets:knowledge:library" in out
    assert "equity:capability" in out


def test_cli_postings_json(tmp_path, capsys):
    _seed_log_leaking(tmp_path)
    rc = ledger_main(["--root", str(tmp_path), "--json", "postings"])
    out = capsys.readouterr().out
    payload = json.loads(out)
    assert rc == 0
    assert len(payload) == 1  # one drafted-entities posting
    assert payload[0]["amount"] == 2.0


def test_cli_balance_empty_log_returns_zero(tmp_path, capsys):
    rc = ledger_main(["--root", str(tmp_path), "balance"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "no postings" in out.lower()


def test_cli_coverage_reports_unmapped(tmp_path, capsys):
    log = EventLog(root=tmp_path)
    log.append(make_witness("commit", "sha", None, "sha",
                            details={"diff_entities_drafted": ["a"]}))
    log.append(make_witness("brand_new_operator", "x", None, "h"))
    rc = ledger_main(["--root", str(tmp_path), "coverage"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "brand_new_operator" in out
    assert "unmapped" in out.lower()
