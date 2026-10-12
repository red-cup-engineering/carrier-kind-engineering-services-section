from pathlib import Path

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.witness import Witness
from pyfars.operator.edit.move_note import move
from pyfars.substrate.load.notes import load


def _alpha(notes):
    return next(n for n in notes if n.slug == "alpha")


def test_move_dry_run_touches_nothing(fixture_root: Path):
    notes, _ = load(fixture_root)
    log = EventLog(root=fixture_root)
    summary = move(
        _alpha(notes),
        fixture_root / "objects" / "alpha.md",
        root=fixture_root,
        all_notes=notes,
        event_log=log,
        timestamp="2026-08-19T00:00:00Z",
    )
    assert summary["moved"] is False
    assert (fixture_root / "concepts" / "alpha.md").exists()
    assert not (fixture_root / "objects" / "alpha.md").exists()
    assert summary["fm_planned"] >= 2  # depends-on: beta, alpha-property
    assert summary["body_planned"] >= 1  # beta's body link
    assert list(log.read_channel("substrate")) == []


def test_move_apply_relocates_and_rewrites_every_inbound_reference(
    fixture_root: Path,
):
    notes, _ = load(fixture_root)
    log = EventLog(root=fixture_root)
    summary = move(
        _alpha(notes),
        fixture_root / "objects" / "alpha.md",
        root=fixture_root,
        all_notes=notes,
        event_log=log,
        agent="morgan",
        timestamp="2026-08-19T00:00:00Z",
        apply=True,
    )
    assert summary["moved"] is True
    assert not (fixture_root / "concepts" / "alpha.md").exists()
    assert (fixture_root / "objects" / "alpha.md").exists()

    beta_text = (fixture_root / "concepts" / "beta.md").read_text(encoding="utf-8")
    assert "../objects/alpha.md" in beta_text

    witnesses = summary["witnesses"]
    assert witnesses
    assert all(isinstance(w, Witness) for w in witnesses)
    assert any(w.operator == "move_flatfile" for w in witnesses)
    # every witness this call minted is on the event log
    logged_ids = {line["record"]["id"] for line in log.read_channel("substrate")}
    assert {w.id for w in witnesses} <= logged_ids


def test_move_slug_unchanged_still_rewrites_body_links(fixture_root: Path):
    notes, _ = load(fixture_root)
    log = EventLog(root=fixture_root)
    summary = move(
        _alpha(notes),
        fixture_root / "objects" / "alpha.md",
        root=fixture_root,
        all_notes=notes,
        event_log=log,
        timestamp="2026-08-19T00:00:00Z",
        apply=True,
    )
    # slug is unchanged (still "alpha") but the path moved, so beta's
    # frontmatter depends-on: [alpha] reference does not need rewriting
    # while its body link's relative path does.
    assert summary["new_slug"] == "alpha"
    assert summary["body"] >= 1
