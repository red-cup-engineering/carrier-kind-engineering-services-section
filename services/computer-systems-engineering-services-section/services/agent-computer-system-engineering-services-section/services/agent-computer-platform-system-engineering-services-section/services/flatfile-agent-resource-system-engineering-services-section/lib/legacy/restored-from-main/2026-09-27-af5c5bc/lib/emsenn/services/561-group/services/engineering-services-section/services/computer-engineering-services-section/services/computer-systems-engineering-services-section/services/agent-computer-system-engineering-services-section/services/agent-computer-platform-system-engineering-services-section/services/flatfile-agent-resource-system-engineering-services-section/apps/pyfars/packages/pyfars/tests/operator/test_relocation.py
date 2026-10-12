from pathlib import Path

import pytest
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.identity import identity
from pyfars.kernel.witness import Witness
from pyfars.operator import relocation


class _FailingEventLog(EventLog):
    def append(self, channel, record):
        raise RuntimeError("witness append failed")


def _note(tmp_path: Path, name: str = "alpha.md",
          text: str = "---\ntitle: Alpha\n---\n\n[beta](beta.md)\n") -> Path:
    path = tmp_path / name
    path.write_text(text, encoding="utf-8")
    return path


# -- move_flatfile ------------------------------------------------------


def test_move_flatfile_dry_run_does_not_move(tmp_path: Path):
    old_path = _note(tmp_path)
    new_path = tmp_path / "objects" / "alpha.md"
    log = EventLog(root=tmp_path)
    result = relocation.move_flatfile(
        old_path, new_path, event_log=log, timestamp="2026-08-19T00:00:00Z",
    )
    assert isinstance(result, dict)
    assert old_path.exists()
    assert not new_path.exists()


def test_move_flatfile_apply_moves_and_preserves_content(tmp_path: Path):
    old_path = _note(tmp_path)
    content = old_path.read_text(encoding="utf-8")
    new_path = tmp_path / "objects" / "alpha.md"
    log = EventLog(root=tmp_path)
    witness = relocation.move_flatfile(
        old_path, new_path, event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert not old_path.exists()
    assert new_path.read_text(encoding="utf-8") == content
    assert witness.before_digest == identity(content)
    assert witness.after_digest == identity(content)


def test_move_flatfile_refuses_missing_source(tmp_path: Path):
    log = EventLog(root=tmp_path)
    with pytest.raises(FileNotFoundError):
        relocation.move_flatfile(
            tmp_path / "missing.md", tmp_path / "new.md",
            event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )


def test_move_flatfile_refuses_existing_destination(tmp_path: Path):
    old_path = _note(tmp_path)
    dest = _note(tmp_path, name="beta.md")
    log = EventLog(root=tmp_path)
    with pytest.raises(FileExistsError):
        relocation.move_flatfile(
            old_path, dest, event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )


def test_move_flatfile_leaves_source_in_place_when_witness_append_fails(
    tmp_path: Path,
):
    old_path = _note(tmp_path)
    content = old_path.read_text(encoding="utf-8")
    new_path = tmp_path / "objects" / "alpha.md"
    log = _FailingEventLog(root=tmp_path)
    with pytest.raises(RuntimeError, match="witness append failed"):
        relocation.move_flatfile(
            old_path, new_path,
            event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )
    assert old_path.read_text(encoding="utf-8") == content
    assert not new_path.exists()


# -- rename_fm_key --------------------------------------------------------


def test_rename_fm_key_apply_writes_and_returns_witness(tmp_path: Path):
    path = _note(tmp_path)
    log = EventLog(root=tmp_path)
    witness = relocation.rename_fm_key(
        path, "title", "headline",
        event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    text = path.read_text(encoding="utf-8")
    assert "headline:" in text
    assert "title:" not in text


def test_rename_fm_key_dry_run_does_not_touch_disk(tmp_path: Path):
    path = _note(tmp_path)
    original = path.read_text(encoding="utf-8")
    log = EventLog(root=tmp_path)
    result = relocation.rename_fm_key(
        path, "title", "headline", event_log=log, timestamp="2026-08-19T00:00:00Z",
    )
    assert isinstance(result, dict)
    assert path.read_text(encoding="utf-8") == original


# -- rewrite_body_link ----------------------------------------------------


def test_rewrite_body_link_apply_writes_and_returns_witness(tmp_path: Path):
    path = _note(tmp_path)
    log = EventLog(root=tmp_path)
    witness = relocation.rewrite_body_link(
        path, "beta.md", "objects/beta.md",
        event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert "objects/beta.md" in path.read_text(encoding="utf-8")


def test_rewrite_body_link_returns_none_when_no_match(tmp_path: Path):
    path = _note(tmp_path)
    log = EventLog(root=tmp_path)
    result = relocation.rewrite_body_link(
        path, "gamma.md", "delta.md",
        event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert result is None
    assert list(log.read_channel("substrate")) == []


# -- rewrite_fm_slug --------------------------------------------------------


def test_rewrite_fm_slug_apply_writes_and_returns_witness(tmp_path: Path):
    path = _note(
        tmp_path,
        text="---\ntitle: Alpha\ndepends-on: [beta]\n---\n\nBody.\n",
    )
    log = EventLog(root=tmp_path)
    witness = relocation.rewrite_fm_slug(
        path, "beta", "objects-beta",
        event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert "objects-beta" in path.read_text(encoding="utf-8")


def test_rewrite_fm_slug_returns_none_when_no_match(tmp_path: Path):
    path = _note(
        tmp_path,
        text="---\ntitle: Alpha\ndepends-on: [gamma]\n---\n\nBody.\n",
    )
    log = EventLog(root=tmp_path)
    result = relocation.rewrite_fm_slug(
        path, "beta", "objects-beta",
        event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert result is None


def test_rewrite_fm_slug_leaves_file_untouched_when_witness_append_fails(
    tmp_path: Path,
):
    path = _note(
        tmp_path,
        text="---\ntitle: Alpha\ndepends-on: [beta]\n---\n\nBody.\n",
    )
    original = path.read_text(encoding="utf-8")
    log = _FailingEventLog(root=tmp_path)
    with pytest.raises(RuntimeError, match="witness append failed"):
        relocation.rewrite_fm_slug(
            path, "beta", "objects-beta",
            event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )
    assert path.read_text(encoding="utf-8") == original
