from pathlib import Path

import pytest
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.identity import identity
from pyfars.kernel.witness import Witness
from pyfars.operator import retraction


class _FailingEventLog(EventLog):
    def append(self, channel, record):
        raise RuntimeError("witness append failed")


def _note(tmp_path: Path, text: str = "---\ntitle: Alpha\ndepends-on: [beta]\n---\n\nBody.\n") -> Path:
    path = tmp_path / "alpha.md"
    path.write_text(text, encoding="utf-8")
    return path


def test_remove_fm_item_dry_run_does_not_touch_disk(tmp_path: Path):
    path = _note(tmp_path)
    original = path.read_text(encoding="utf-8")
    log = EventLog(root=tmp_path)
    result = retraction.remove_fm_item(
        path, "depends-on", "beta", event_log=log, timestamp="2026-08-19T00:00:00Z",
    )
    assert isinstance(result, dict)
    assert path.read_text(encoding="utf-8") == original


def test_remove_fm_item_apply_writes_and_returns_witness(tmp_path: Path):
    path = _note(tmp_path)
    before_text = path.read_text(encoding="utf-8")
    log = EventLog(root=tmp_path)
    witness = retraction.remove_fm_item(
        path, "depends-on", "beta",
        event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert witness.before_digest == identity(before_text)
    after_text = path.read_text(encoding="utf-8")
    assert witness.after_digest == identity(after_text)
    assert "depends-on" not in after_text


def test_remove_fm_key_apply_writes_and_returns_witness(tmp_path: Path):
    path = _note(tmp_path)
    log = EventLog(root=tmp_path)
    witness = retraction.remove_fm_key(
        path, "title", event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert "title:" not in path.read_text(encoding="utf-8")


def test_delete_flatfile_dry_run_does_not_delete(tmp_path: Path):
    path = _note(tmp_path)
    log = EventLog(root=tmp_path)
    result = retraction.delete_flatfile(
        path, event_log=log, timestamp="2026-08-19T00:00:00Z",
    )
    assert isinstance(result, dict)
    assert path.exists()


def test_delete_flatfile_apply_deletes_and_returns_witness_with_no_after_digest(
    tmp_path: Path,
):
    path = _note(tmp_path)
    before_text = path.read_text(encoding="utf-8")
    log = EventLog(root=tmp_path)
    witness = retraction.delete_flatfile(
        path, event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
    )
    assert isinstance(witness, Witness)
    assert witness.before_digest == identity(before_text)
    assert not path.exists()


# -- the append-only guard: a failed witness append leaves the file
# byte-identical (and undeleted) --------------------------------------------


def test_remove_fm_item_leaves_file_untouched_when_witness_append_fails(
    tmp_path: Path,
):
    path = _note(tmp_path)
    original = path.read_text(encoding="utf-8")
    log = _FailingEventLog(root=tmp_path)
    with pytest.raises(RuntimeError, match="witness append failed"):
        retraction.remove_fm_item(
            path, "depends-on", "beta",
            event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )
    assert path.read_text(encoding="utf-8") == original


def test_delete_flatfile_survives_when_witness_append_fails(tmp_path: Path):
    path = _note(tmp_path)
    original = path.read_text(encoding="utf-8")
    log = _FailingEventLog(root=tmp_path)
    with pytest.raises(RuntimeError, match="witness append failed"):
        retraction.delete_flatfile(
            path, event_log=log, timestamp="2026-08-19T00:00:00Z", apply=True,
        )
    assert path.exists()
    assert path.read_text(encoding="utf-8") == original
