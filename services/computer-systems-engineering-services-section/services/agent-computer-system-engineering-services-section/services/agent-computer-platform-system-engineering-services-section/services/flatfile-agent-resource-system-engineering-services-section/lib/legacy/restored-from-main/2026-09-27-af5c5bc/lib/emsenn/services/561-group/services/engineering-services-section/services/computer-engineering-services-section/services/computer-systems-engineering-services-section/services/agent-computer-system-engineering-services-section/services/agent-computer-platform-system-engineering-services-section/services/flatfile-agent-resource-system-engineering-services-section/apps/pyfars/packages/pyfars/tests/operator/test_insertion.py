from pathlib import Path

import pytest
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.identity import identity
from pyfars.kernel.witness import Witness
from pyfars.operator import insertion


class _FailingEventLog(EventLog):
    def append(self, channel, record):
        raise RuntimeError("witness append failed")


def _note(tmp_path: Path, text: str = "---\ntitle: Alpha\n---\n\nBody.\n") -> Path:
    path = tmp_path / "alpha.md"
    path.write_text(text, encoding="utf-8")
    return path


# -- dry-run by default -----------------------------------------------------


def test_insert_fm_item_dry_run_does_not_touch_disk(tmp_path: Path):
    path = _note(tmp_path)
    original = path.read_text(encoding="utf-8")
    log = EventLog(root=tmp_path)
    result = insertion.insert_fm_item(
        path, "depends-on", "beta", event_log=log, timestamp="2026-08-19T00:00:00Z",
    )
    assert isinstance(result, dict)
    assert path.read_text(encoding="utf-8") == original
    assert list(log.read_channel("substrate")) == []


def test_set_fm_field_dry_run_does_not_touch_disk(tmp_path: Path):
    path = _note(tmp_path)
    original = path.read_text(encoding="utf-8")
    log = EventLog(root=tmp_path)
    result = insertion.set_fm_field(
        path, "title", "Beta", event_log=log, timestamp="2026-08-19T00:00:00Z",
    )
    assert isinstance(result, dict)
    assert path.read_text(encoding="utf-8") == original


def test_insert_flatfile_dry_run_does_not_create_file(tmp_path: Path):
    path = tmp_path / "new.md"
    log = EventLog(root=tmp_path)
    result = insertion.insert_flatfile(
        path, {"kind": "concept"}, "Body.\n",
        event_log=log, timestamp="2026-08-19T00:00:00Z",
    )
    assert isinstance(result, dict)
    assert not path.exists()


# -- apply=True writes and witnesses -----------------------------------------


def test_insert_fm_item_apply_writes_and_returns_witness(tmp_path: Path):
    path = _note(tmp_path)
    before_text = path.read_text(encoding="utf-8")
    log = EventLog(root=tmp_path)
    witness = insertion.insert_fm_item(
        path, "depends-on", "beta",
        event_log=log, agent="morgan", timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert witness.operator == "insert_fm_item"
    assert witness.before_digest == identity(before_text)
    after_text = path.read_text(encoding="utf-8")
    assert witness.after_digest == identity(after_text)
    assert "depends-on" in after_text
    assert list(log.read_channel("substrate")) != []


def test_set_fm_field_apply_writes_and_returns_witness(tmp_path: Path):
    path = _note(tmp_path)
    log = EventLog(root=tmp_path)
    witness = insertion.set_fm_field(
        path, "title", "Beta",
        event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert "Beta" in path.read_text(encoding="utf-8")


def test_insert_flatfile_apply_creates_file_with_no_before_digest(tmp_path: Path):
    path = tmp_path / "new.md"
    log = EventLog(root=tmp_path)
    witness = insertion.insert_flatfile(
        path, {"kind": "concept"}, "Body.\n",
        event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert witness.before_digest is None
    assert path.exists()
    assert witness.after_digest == identity(path.read_text(encoding="utf-8"))


def test_insert_flatfile_refuses_when_target_exists(tmp_path: Path):
    path = _note(tmp_path)
    log = EventLog(root=tmp_path)
    with pytest.raises(FileExistsError):
        insertion.insert_flatfile(
            path, {"kind": "concept"}, "Body.\n",
            event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )


# -- the append-only guard: a failed witness append leaves the file
# byte-identical ----------------------------------------------------------


def test_insert_fm_item_leaves_file_untouched_when_witness_append_fails(
    tmp_path: Path,
):
    path = _note(tmp_path)
    original = path.read_text(encoding="utf-8")
    log = _FailingEventLog(root=tmp_path)
    with pytest.raises(RuntimeError, match="witness append failed"):
        insertion.insert_fm_item(
            path, "depends-on", "beta",
            event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )
    assert path.read_text(encoding="utf-8") == original


def test_insert_flatfile_creates_no_file_when_witness_append_fails(tmp_path: Path):
    path = tmp_path / "new.md"
    log = _FailingEventLog(root=tmp_path)
    with pytest.raises(RuntimeError, match="witness append failed"):
        insertion.insert_flatfile(
            path, {"kind": "concept"}, "Body.\n",
            event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )
    assert not path.exists()
