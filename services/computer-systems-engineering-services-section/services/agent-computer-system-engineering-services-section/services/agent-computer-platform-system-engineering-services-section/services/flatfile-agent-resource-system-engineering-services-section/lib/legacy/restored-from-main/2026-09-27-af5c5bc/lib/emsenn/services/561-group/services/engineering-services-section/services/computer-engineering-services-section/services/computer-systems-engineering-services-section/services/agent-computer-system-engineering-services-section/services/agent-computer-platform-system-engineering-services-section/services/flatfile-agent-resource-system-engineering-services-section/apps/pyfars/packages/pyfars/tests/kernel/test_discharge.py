"""Tests for kernel.discharge — the sigma_t/Delta_t double-settlement
Register C (design spec section 5C): the synthetic four-state fixture
(design spec section 11's conformance vector 5), the closure-law
properties ``is_closure`` demands of sigma_t and Delta_t, and the
commuting square the coherence 2-cell requires."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from pyfars.kernel.discharge import (
    DELTA_CLOSURE,
    PAIR,
    PARTITION,
    SIGMA_CLOSURE,
    DischargeState,
    delta_holds,
    discharge,
    sigma_holds,
)
from pyfars.kernel.record_types import (
    make_correction_record,
    make_office,
    make_status_event,
)
from pyfars.kernel.settlement import KNOWLEDGE_LATTICE
from pyfars.kernel.witness import make_witness
from pymetrologic.closure import is_closure
from pymetrologic.quartet import Corner

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_VECTORS_PATH = _SECTION_ROOT / "lib" / "conformance" / "discharge-vectors.json"

with _VECTORS_PATH.open(encoding="utf-8") as _handle:
    _CASES = json.load(_handle)["cases"]


# -- the synthetic four-state fixture: discharge reaches all four states --


@pytest.mark.parametrize("case", _CASES, ids=lambda c: c["name"])
def test_fixture_case_discharges_to_the_expected_state(case: dict[str, Any]) -> None:
    result = discharge(case["record"], case["records"], case["witnesses"])
    assert result is DischargeState(case["expected"])


def test_fixture_covers_all_four_states() -> None:
    assert {c["expected"] for c in _CASES} == {
        "operative",
        "sat_shadow",
        "tr_shadow",
        "free_shadow",
    }


def test_discharge_never_returns_a_boolean() -> None:
    case = _CASES[0]
    result = discharge(case["record"], case["records"], case["witnesses"])
    assert isinstance(result, DischargeState)
    assert not isinstance(result, bool)


# -- closure-law properties: sigma_t/Delta_t are genuine closures --------


def test_sigma_closure_is_a_genuine_closure_operator() -> None:
    assert is_closure(KNOWLEDGE_LATTICE, SIGMA_CLOSURE) is True


def test_delta_closure_is_a_genuine_closure_operator() -> None:
    assert is_closure(KNOWLEDGE_LATTICE, DELTA_CLOSURE) is True


def test_sigma_closure_is_idempotent_and_extensive_on_every_element() -> None:
    for element in KNOWLEDGE_LATTICE.elements:
        once = SIGMA_CLOSURE(element)
        twice = SIGMA_CLOSURE(once)
        assert KNOWLEDGE_LATTICE.leq(element, once)
        assert KNOWLEDGE_LATTICE.eq(once, twice)


def test_delta_closure_is_idempotent_and_extensive_on_every_element() -> None:
    for element in KNOWLEDGE_LATTICE.elements:
        once = DELTA_CLOSURE(element)
        twice = DELTA_CLOSURE(once)
        assert KNOWLEDGE_LATTICE.leq(element, once)
        assert KNOWLEDGE_LATTICE.eq(once, twice)


# -- the commuting square -------------------------------------------------


def test_the_commuting_square_holds_on_the_fars_fiber() -> None:
    assert PAIR.commutes(KNOWLEDGE_LATTICE.elements, KNOWLEDGE_LATTICE.eq) is True


def test_the_commuting_square_holds_pointwise() -> None:
    for element in KNOWLEDGE_LATTICE.elements:
        left, right = PAIR.square(element)
        assert KNOWLEDGE_LATTICE.eq(left, right)


# -- the nuclear quartet's partition matches institution.md's H*_t -------


def test_stable_corner_is_exactly_the_double_fixed_point() -> None:
    from pymetrologic.bilattice import BL

    assert PARTITION[Corner.STABLE] == (BL(1, 1),)


def test_absurd_corner_is_the_whole_free_carrier() -> None:
    assert set(PARTITION[Corner.ABSURD]) == set(KNOWLEDGE_LATTICE.elements)


# -- sigma_holds / delta_holds: unit coverage on hand-built records -------


def test_sigma_holds_true_when_citations_resolve() -> None:
    office = make_office(slug="clerk", scope="corpus")
    event = make_status_event(target=office.id, transition="revocation")
    assert sigma_holds(event.to_record(), [office.to_record()], []) is True


def test_sigma_holds_false_when_a_citation_is_dangling() -> None:
    event = make_status_event(
        target="ni:///sha-256;" + "A" * 43, transition="revocation"
    )
    assert sigma_holds(event.to_record(), [], []) is False


def test_sigma_holds_false_when_the_record_itself_fails_to_validate() -> None:
    office = make_office(slug="clerk", scope="corpus")
    event = make_status_event(target=office.id, transition="revocation")
    tampered = dict(event.to_record())
    tampered["transition"] = "not-a-real-transition"
    assert sigma_holds(tampered, [office.to_record()], []) is False


def test_delta_holds_true_for_a_terminal_status_event() -> None:
    office = make_office(slug="clerk", scope="corpus")
    event = make_status_event(target=office.id, transition="expiry")
    assert delta_holds(event.to_record(), [office.to_record()], []) is True


def test_delta_holds_false_for_a_non_terminal_status_event() -> None:
    office = make_office(slug="clerk", scope="corpus")
    event = make_status_event(target=office.id, transition="suspension")
    assert delta_holds(event.to_record(), [office.to_record()], []) is False


def test_delta_holds_requires_a_declared_successor_to_resolve() -> None:
    office = make_office(slug="clerk", scope="corpus")
    prior = make_status_event(target=office.id, transition="suspension")
    supersession = make_status_event(
        target=office.id,
        transition="supersession",
        successor="ni:///sha-256;" + "A" * 43,
    )
    assert (
        delta_holds(
            supersession.to_record(), [office.to_record(), prior.to_record()], []
        )
        is False
    )


def test_delta_holds_true_for_a_recorded_correction_replacement() -> None:
    office = make_office(slug="clerk", scope="corpus")
    replacement = make_office(slug="clerk-v2", scope="corpus")
    correction = make_correction_record(
        target=office.id, replacement=replacement.id, reason="r"
    )
    records = [office.to_record(), replacement.to_record()]
    assert delta_holds(correction.to_record(), records, []) is True


def test_delta_holds_false_for_an_unrecorded_correction_replacement() -> None:
    office = make_office(slug="clerk", scope="corpus")
    correction = make_correction_record(
        target=office.id, replacement="ni:///sha-256;" + "A" * 43, reason="r"
    )
    assert delta_holds(correction.to_record(), [office.to_record()], []) is False


def test_delta_holds_via_default_wit_chain_closed_path() -> None:
    office = make_office(slug="archivist", scope="corpus")
    positive = make_witness(
        operator="dispatch",
        target=office.id,
        before_digest=None,
        after_digest=None,
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:00Z",
        kind="guard",
        four_before=(False, False),
        four_after=(True, False),
        channel="governance",
    )
    negative = make_witness(
        operator="dispatch",
        target=office.id,
        before_digest=None,
        after_digest=None,
        details={},
        agent=None,
        timestamp="2026-08-19T00:00:01Z",
        kind="guard",
        four_before=(False, False),
        four_after=(False, True),
        channel="governance",
    )
    assert (
        delta_holds(
            office.to_record(), [], [positive.to_record(), negative.to_record()]
        )
        is True
    )
    assert delta_holds(office.to_record(), [], [positive.to_record()]) is False
    assert delta_holds(office.to_record(), [], []) is False
