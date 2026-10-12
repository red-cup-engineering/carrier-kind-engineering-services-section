"""Tests for kernel.store.System against the shared fixture corpus, and
the canonical expectations recorded in ``lib/conformance/store-expected.json``
(design spec section 4/5B, cross-language conformance vector)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from pyfars.kernel.four import FALSE, NEITHER, TRUE
from pyfars.kernel.store import System

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_FIXTURE_CORPUS = _SECTION_ROOT / "lib" / "conformance" / "fixture-corpus"
_EXPECTED_PATH = _SECTION_ROOT / "lib" / "conformance" / "store-expected.json"

with _EXPECTED_PATH.open(encoding="utf-8") as _handle:
    _EXPECTED: dict[str, Any] = json.load(_handle)

_FOUR_BY_BITS = {(True, False): TRUE, (False, True): FALSE, (False, False): NEITHER}


def _system() -> System:
    return System.load(_FIXTURE_CORPUS)


def test_no_load_diagnostics() -> None:
    assert _system().diagnostics == ()


def test_cells_match_expected() -> None:
    system = _system()
    key = lambda cell: (cell["subject"], cell["predicate"], cell["object"])
    got = sorted(
        (
            {"subject": s, "predicate": p, "object": o, "pos": v.pos, "neg": v.neg}
            for (s, p, o), v in system.cells.items()
        ),
        key=key,
    )
    want = sorted(_EXPECTED["cells"], key=key)
    assert got == want


def test_absent_triple_is_neither_and_does_not_hold() -> None:
    system = _system()
    want = _EXPECTED["absent_triple"]
    value = system.value(want["subject"], want["predicate"], want["object"])
    assert value.pos == want["value"]["pos"]
    assert value.neg == want["value"]["neg"]
    assert (
        system.holds(want["subject"], want["predicate"], want["object"])
        == want["holds"]
    )


def test_value_and_holds_match_expected_cells() -> None:
    system = _system()
    for cell in _EXPECTED["cells"]:
        value = system.value(cell["subject"], cell["predicate"], cell["object"])
        assert value == _FOUR_BY_BITS[(cell["pos"], cell["neg"])]
        assert system.holds(cell["subject"], cell["predicate"], cell["object"]) is True


def test_site_matches_expected() -> None:
    system = _system()
    assert sorted(system.site.cells) == _EXPECTED["site"]["cells"]
    assert sorted(list(f) for f in system.site.faces) == _EXPECTED["site"]["faces"]


def test_cells_at_matches_expected() -> None:
    system = _system()
    got = {
        slug: sorted(system.cells_at(slug)) for slug in {n.slug for n in system.notes}
    }
    got = {k: [list(t) for t in v] for k, v in got.items() if v}
    assert got == _EXPECTED["queries"]["cells_at"]


def test_subjects_with_matches_expected() -> None:
    system = _system()
    for key, want in _EXPECTED["queries"]["subjects_with"].items():
        predicate, obj = key.split("|", 1)
        assert sorted(system.subjects_with(predicate, obj)) == want


def test_subjects_with_empty_for_an_unasserted_pair() -> None:
    system = _system()
    assert system.subjects_with("depends-on", "beta") == set()


def test_in_edges_matches_expected() -> None:
    system = _system()
    for slug, want in _EXPECTED["queries"]["in_edges"].items():
        got = sorted([list(t) for t in system.in_edges(slug)])
        assert got == want


def test_out_edges_matches_expected() -> None:
    system = _system()
    for slug, want in _EXPECTED["queries"]["out_edges"].items():
        got = sorted([list(t) for t in system.out_edges(slug)])
        assert got == want


def test_in_edges_and_out_edges_respect_predicate_filter() -> None:
    system = _system()
    assert list(system.in_edges("alpha", predicates=["link"])) == [
        ("beta", "link", "alpha")
    ]
    assert list(system.out_edges("beta", predicates=["depends-on"])) == [
        ("beta", "depends-on", "alpha")
    ]


def test_relation_map_subject_keyed_matches_expected() -> None:
    system = _system()
    for predicate, want in _EXPECTED["queries"]["relation_map_subject_keyed"].items():
        got = {k: sorted(v) for k, v in system.relation_map(predicate).items()}
        assert got == want


def test_relation_map_object_keyed_matches_expected() -> None:
    system = _system()
    for predicate, want in _EXPECTED["queries"]["relation_map_object_keyed"].items():
        got = {
            k: sorted(v)
            for k, v in system.relation_map(predicate, direction="object-keyed").items()
        }
        assert got == want


def test_relation_map_rejects_an_unknown_direction() -> None:
    system = _system()
    with pytest.raises(ValueError, match="direction"):
        system.relation_map("depends-on", direction="sideways")
