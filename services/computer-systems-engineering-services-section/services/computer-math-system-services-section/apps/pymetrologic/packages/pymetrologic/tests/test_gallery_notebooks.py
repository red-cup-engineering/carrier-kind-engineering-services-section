"""Smoke tests: the Obsmetrologia gallery notebooks run end-to-end, headless.

Skipped without the ``gallery`` extra (``uv sync --extra gallery``), mirroring
``test_viz.py``'s ``importorskip`` pattern for the optional ``notebooks``
extra. Each notebook is run as a subprocess script (not imported) so a
notebook's own warnings never interact with this project's
``filterwarnings = ["error"]`` pytest setting.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

pytest.importorskip("matplotlib")
pytest.importorskip("numpy")

ROOT = Path(__file__).resolve().parents[3]
NOTEBOOKS_DIR = ROOT / "notebooks"

GALLERY_NOTEBOOKS = [
    "80-gallery-bilattice-flow.py",
    "81-padovan-corrected.py",
    "82-causal-sprinkling.py",
    "83-quasicrystal.py",
    "84-quartet-sonification.py",
    "85-multi-agent-fusion.py",
]


@pytest.mark.parametrize("notebook", GALLERY_NOTEBOOKS)
def test_gallery_notebook_runs_headless(notebook: str) -> None:
    path = NOTEBOOKS_DIR / notebook
    assert path.exists(), f"missing gallery notebook: {path}"

    result = subprocess.run(
        [sys.executable, str(path)],
        cwd=ROOT,
        env=os.environ | {"MPLBACKEND": "Agg"},
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, (
        f"{notebook} exited {result.returncode}\n--- stdout ---\n{result.stdout}\n"
        f"--- stderr ---\n{result.stderr}"
    )
