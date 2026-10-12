"""Module-level checks for pymetrologic.reals."""

from __future__ import annotations

from pymetrologic.reals import internal_reals_completion_witness


def test_reals_module_exports_internal_completion_witness() -> None:
    assert internal_reals_completion_witness().holds
