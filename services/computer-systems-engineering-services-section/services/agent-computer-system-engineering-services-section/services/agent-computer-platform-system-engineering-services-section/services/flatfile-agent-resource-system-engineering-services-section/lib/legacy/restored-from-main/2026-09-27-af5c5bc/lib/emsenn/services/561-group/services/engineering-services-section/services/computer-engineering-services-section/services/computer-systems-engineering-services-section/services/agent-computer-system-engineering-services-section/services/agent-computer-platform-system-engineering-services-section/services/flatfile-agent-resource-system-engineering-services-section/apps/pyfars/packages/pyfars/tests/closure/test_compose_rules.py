from __future__ import annotations

from pathlib import Path

from pyfars.closure.rule.compose_rules import run as run_rules
from pyfars.substrate.load.notes import load as load_notes
from pyfars.substrate.types.diagnostic import Diagnostic


def test_compose_rules_runs_every_default_rule_on_the_fixture_corpus(fixture_root: Path):
    notes, load_diagnostics = load_notes(fixture_root)
    assert load_diagnostics == []
    diagnostics = run_rules(notes, root=fixture_root)
    assert all(isinstance(d, Diagnostic) for d in diagnostics)
    codes = {d.code for d in diagnostics}
    assert "cycles" not in codes
    assert "status-consistency" not in codes


def test_compose_rules_flags_a_cycle(fixture_root: Path):
    (fixture_root / "concepts" / "alpha.md").write_text(
        "---\nkind: concept\ntitle: Alpha\ndepends-on: [beta]\n---\n\nAlpha body.\n",
        encoding="utf-8",
    )
    notes, _ = load_notes(fixture_root)
    diagnostics = run_rules(notes, root=fixture_root)
    assert any(d.code == "cycles" for d in diagnostics)


def test_compose_rules_flags_status_inconsistency(fixture_root: Path):
    (fixture_root / "concepts" / "alpha.md").write_text(
        "---\nkind: concept\ntitle: Alpha\nstatus: draft\n---\n\nAlpha body.\n",
        encoding="utf-8",
    )
    notes, _ = load_notes(fixture_root)
    diagnostics = run_rules(notes, root=fixture_root)
    assert any(d.code == "status-consistency" for d in diagnostics)
