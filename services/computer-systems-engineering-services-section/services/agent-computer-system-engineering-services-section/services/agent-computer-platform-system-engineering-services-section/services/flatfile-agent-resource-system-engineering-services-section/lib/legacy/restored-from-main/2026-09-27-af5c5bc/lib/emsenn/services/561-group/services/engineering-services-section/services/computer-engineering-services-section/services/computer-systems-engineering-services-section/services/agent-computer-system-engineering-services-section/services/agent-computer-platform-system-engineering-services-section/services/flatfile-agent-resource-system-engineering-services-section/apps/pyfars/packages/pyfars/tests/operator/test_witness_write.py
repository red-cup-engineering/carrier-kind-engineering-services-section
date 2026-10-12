from pathlib import Path

import pytest
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.four import NotOneWitError
from pyfars.kernel.witness import make_witness
from pyfars.operator._witness_write import witnessed_write


def test_witnessed_write_leaves_file_untouched_when_the_four_gate_rejects(
    tmp_path: Path,
) -> None:
    path = tmp_path / "note.md"
    original = "---\ntitle: Alpha\n---\n\nBody.\n"
    path.write_text(original, encoding="utf-8")
    log = EventLog(root=tmp_path)
    prior = make_witness(
        operator="set_fm_field",
        target=str(path),
        before_digest=None,
        after_digest="d1",
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="mutation",
        four_before=(False, False),
        four_after=(True, False),
        channel="substrate",
    )
    with pytest.raises(NotOneWitError, match="not-one-wit"):
        witnessed_write(
            path,
            "---\ntitle: Beta\n---\n\nBody.\n",
            operator="set_fm_field",
            event_log=log,
            agent=None,
            timestamp="2026-08-19T00:00:01Z",
            channel="substrate",
            details={},
            prior_witnesses=[prior],
        )
    assert path.read_text(encoding="utf-8") == original
    assert list(log.read_channel("substrate")) == []
