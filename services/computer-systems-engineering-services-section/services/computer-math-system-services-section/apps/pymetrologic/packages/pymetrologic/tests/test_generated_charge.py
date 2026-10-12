"""Cross-check the hand-written Charge algebra against the generated tables.

``pymetrologic._generated_charge`` is produced by
``tools/generate_charge_tables.py`` parsing the *defining* Lean directly
(``Charge.lean``, ``Four.lean``, ``Cell.lean`` — see that module's docstring
for the exact route and why it was preferred over the exhaustive
corner-status fallback). The hand-written implementations in ``positing.py``
(``charge_join_k``, ``charge_meet_k``, ``charge_join_t``, ``charge_meet_t``,
``charge_negate``, ``charge_le_k``, ``charge_le_t``) and the ``conflate``
composition built from ``bilattice.py``/``quartet.py`` stay canonical for
now — this suite is the independent witness that they agree with the
generated tables on every one of the 16 (or 4, for unary ops) entries. A
disagreement here is exactly the drift class this whole task exists to catch.
"""

from __future__ import annotations

import hashlib
import itertools
from pathlib import Path

import pytest

from pymetrologic import _generated_charge as gen
from pymetrologic.bilattice import four
from pymetrologic.positing import (
    charge_join_k,
    charge_join_t,
    charge_le_k,
    charge_le_t,
    charge_meet_k,
    charge_meet_t,
    charge_negate,
)
from pymetrologic.quartet import CORNERS, Corner, charge_of_corner, corner_of_charge

ROOT = Path(__file__).resolve().parents[3]
LEAN_ROOT = (ROOT / ".." / ".." / "lib" / "obsmetrologia").resolve()
CELL_LEAN = LEAN_ROOT / "Obsmetrologia" / "Articulation" / "Articulating" / "Cell.lean"
CHARGE_LEAN = LEAN_ROOT / "Obsmetrologia" / "Language" / "Positing" / "Charge.lean"
FOUR_LEAN = LEAN_ROOT / "Obsmetrologia" / "Language" / "Positing" / "Four.lean"

CORNER_BY_NAME: dict[str, Corner] = {c.value: c for c in Corner}

_FOUR = four()


def _corner_conflate(c: Corner) -> Corner:
    """The hand-written `conflate` reading: `Corner -> FOUR charge -> conflate -> Corner`.

    `positing.py` has no bare `conflate` on `Corner` (only `klein.py`'s `K4.CONF`
    acting on bilattice values); this composes the existing, independently
    proven `charge_of_corner`/`corner_of_charge` bijection (`quartet.py`,
    guarded by `quartet_recurrence`) with `Bilattice.conflate` (`bilattice.py`)
    to get the same operation at the `Corner` level the generated table names.
    """

    return corner_of_charge(_FOUR, _FOUR.conflate(charge_of_corner(_FOUR, c)))


def test_source_sha256_matches_pinned_generation() -> None:
    """The generated module's pinned source hashes must match the live Lean bytes."""

    live = {
        "Cell.lean": hashlib.sha256(CELL_LEAN.read_bytes()).hexdigest(),
        "Charge.lean": hashlib.sha256(CHARGE_LEAN.read_bytes()).hexdigest(),
        "Four.lean": hashlib.sha256(FOUR_LEAN.read_bytes()).hexdigest(),
    }
    assert live == gen.SOURCE_SHA256, (
        "Lean charge-algebra source drifted — re-run tools/generate_charge_tables.py "
        f"(pinned {gen.SOURCE_SHA256} != live {live})"
    )


def test_generated_corners_match_quartet_corners() -> None:
    assert tuple(c.value for c in CORNERS) == gen.CORNERS
    assert set(CORNER_BY_NAME) == {c.value for c in CORNERS}


def test_generated_status_matches_quartet_status() -> None:
    from pymetrologic.quartet import status_of_corner

    for name, corner in CORNER_BY_NAME.items():
        assert gen.STATUS[name] == status_of_corner(corner)


_PAIRS = list(itertools.product(gen.CORNERS, repeat=2))
_PAIR_IDS = [f"{a}-{b}" for a, b in _PAIRS]


@pytest.mark.parametrize(("a_name", "b_name"), _PAIRS, ids=_PAIR_IDS)
def test_joink_matches_generated(a_name: str, b_name: str) -> None:
    a, b = CORNER_BY_NAME[a_name], CORNER_BY_NAME[b_name]
    assert charge_join_k(a, b).value == gen.joinK[(a_name, b_name)]


@pytest.mark.parametrize(("a_name", "b_name"), _PAIRS, ids=_PAIR_IDS)
def test_meetk_matches_generated(a_name: str, b_name: str) -> None:
    a, b = CORNER_BY_NAME[a_name], CORNER_BY_NAME[b_name]
    assert charge_meet_k(a, b).value == gen.meetK[(a_name, b_name)]


@pytest.mark.parametrize(("a_name", "b_name"), _PAIRS, ids=_PAIR_IDS)
def test_joint_matches_generated(a_name: str, b_name: str) -> None:
    a, b = CORNER_BY_NAME[a_name], CORNER_BY_NAME[b_name]
    assert charge_join_t(a, b).value == gen.joinT[(a_name, b_name)]


@pytest.mark.parametrize(("a_name", "b_name"), _PAIRS, ids=_PAIR_IDS)
def test_meett_matches_generated(a_name: str, b_name: str) -> None:
    a, b = CORNER_BY_NAME[a_name], CORNER_BY_NAME[b_name]
    assert charge_meet_t(a, b).value == gen.meetT[(a_name, b_name)]


@pytest.mark.parametrize(("a_name", "b_name"), _PAIRS, ids=_PAIR_IDS)
def test_lek_matches_generated(a_name: str, b_name: str) -> None:
    a, b = CORNER_BY_NAME[a_name], CORNER_BY_NAME[b_name]
    assert charge_le_k(a, b) == gen.leK[(a_name, b_name)]


@pytest.mark.parametrize(("a_name", "b_name"), _PAIRS, ids=_PAIR_IDS)
def test_let_matches_generated(a_name: str, b_name: str) -> None:
    a, b = CORNER_BY_NAME[a_name], CORNER_BY_NAME[b_name]
    assert charge_le_t(a, b) == gen.leT[(a_name, b_name)]


@pytest.mark.parametrize("a_name", gen.CORNERS)
def test_negate_matches_generated(a_name: str) -> None:
    a = CORNER_BY_NAME[a_name]
    assert charge_negate(a).value == gen.negate[a_name]


@pytest.mark.parametrize("a_name", gen.CORNERS)
def test_conflate_matches_generated(a_name: str) -> None:
    a = CORNER_BY_NAME[a_name]
    assert _corner_conflate(a).value == gen.conflate[a_name]


def test_every_table_entry_was_exercised() -> None:
    """Guard against the parametrization silently shrinking (e.g. a typo'd corner name)."""

    assert len(gen.joinK) == 16
    assert len(gen.meetK) == 16
    assert len(gen.joinT) == 16
    assert len(gen.meetT) == 16
    assert len(gen.leK) == 16
    assert len(gen.leT) == 16
    assert len(gen.negate) == 4
    assert len(gen.conflate) == 4
