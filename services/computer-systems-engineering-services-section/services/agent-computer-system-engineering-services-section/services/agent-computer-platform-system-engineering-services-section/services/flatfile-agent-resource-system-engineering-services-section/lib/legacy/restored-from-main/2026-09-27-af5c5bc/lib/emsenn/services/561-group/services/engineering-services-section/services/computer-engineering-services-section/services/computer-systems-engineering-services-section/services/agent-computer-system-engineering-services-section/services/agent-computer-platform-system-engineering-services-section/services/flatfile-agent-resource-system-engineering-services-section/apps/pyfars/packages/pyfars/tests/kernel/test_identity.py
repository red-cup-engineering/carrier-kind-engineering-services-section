"""Property tests for the identity law."""

from __future__ import annotations

import base64
import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any

import pytest
from hypothesis import given
from hypothesis import strategies as st
from pyfars.kernel.identity import canonicalize, identity, identity_of_record

NI_URI_PATTERN = re.compile(r"^ni:///sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$")

_SAFE_INT_MAX = 2**53 - 1

_SECTION_ROOT = Path(__file__).resolve().parents[6]
_VECTORS_PATH = _SECTION_ROOT / "lib" / "conformance" / "identity-vectors.json"

_json_scalars = st.one_of(
    st.none(),
    st.booleans(),
    st.integers(min_value=-_SAFE_INT_MAX, max_value=_SAFE_INT_MAX),
    st.text(),
)


def _json_values() -> st.SearchStrategy[object]:
    return st.recursive(
        _json_scalars,
        lambda children: st.one_of(
            st.lists(children, max_size=5),
            st.dictionaries(st.text(), children, max_size=5),
        ),
        max_leaves=20,
    )


@given(_json_values())
def test_identity_matches_ni_uri_shape(value: object) -> None:
    assert NI_URI_PATTERN.match(identity(value))


@given(_json_values())
def test_identity_is_deterministic(value: object) -> None:
    assert identity(value) == identity(value)


@given(_json_values())
def test_identity_is_idempotent_under_canonicalize(value: object) -> None:
    assert identity(value) == identity(canonicalize(value))


@given(st.dictionaries(st.text(min_size=1), _json_scalars, min_size=1, max_size=8))
def test_identity_is_key_order_independent(body: dict[str, object]) -> None:
    reordered = dict(reversed(list(body.items())))
    assert identity(body) == identity(reordered)


def test_id_excluded_from_its_own_hash() -> None:
    body = {"a": 1, "b": "two"}
    with_id = {**body, "id": "whatever-this-is-not-recomputed"}
    assert identity_of_record(with_id) == identity(body)
    assert identity_of_record({**body, "id": "something-else"}) == identity_of_record(
        with_id
    )


def test_a_mutated_body_produces_a_different_id() -> None:
    assert identity({"a": 1}) != identity({"a": 2})
    assert identity({"a": 1, "b": 2}) != identity({"a": 1})


def test_nfc_equivalent_strings_share_an_identity() -> None:
    composed = "é"
    decomposed = "é"
    assert composed != decomposed
    assert identity(composed) == identity(decomposed)
    assert identity({composed: 1}) == identity({decomposed: 1})


def test_nfc_collision_between_distinct_keys_is_rejected() -> None:
    with pytest.raises(ValueError):
        canonicalize({"é": 1, "é": 2})


def test_non_string_object_key_is_rejected() -> None:
    with pytest.raises(TypeError):
        canonicalize({1: "a"})


@pytest.mark.parametrize(
    "value",
    [
        2**53,
        -(2**53),
        2**53 + 1,
        -(2**53 + 1),
        1.5,
        math.nan,
        math.inf,
        -math.inf,
    ],
)
def test_unsafe_numbers_are_rejected(value: object) -> None:
    with pytest.raises(ValueError):
        canonicalize(value)


def test_integral_float_canonicalizes_to_the_same_identity_as_its_int() -> None:
    assert identity(2.0) == identity(2)
    assert identity({"n": 4.0}) == identity({"n": 4})


@pytest.mark.parametrize(
    "value",
    [2**53 - 1, -(2**53 - 1), 0, -0.0, True, False, None, [], {}],
)
def test_boundary_and_scalar_values_canonicalize_without_error(value: object) -> None:
    canonicalize(value)


def test_unsupported_value_type_is_rejected() -> None:
    with pytest.raises(TypeError):
        canonicalize(object())


def test_arrays_preserve_order() -> None:
    assert identity([1, 2, 3]) != identity([3, 2, 1])


def test_compact_serialization_has_no_insignificant_whitespace() -> None:
    value = {"b": 1, "a": [1, 2, {"z": 1, "y": 2}]}
    expected_bytes = json.dumps(
        {"a": [1, 2, {"y": 2, "z": 1}], "b": 1},
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    expected = "ni:///sha-256;" + base64.urlsafe_b64encode(
        hashlib.sha256(expected_bytes).digest()
    ).decode("ascii").rstrip("=")
    assert identity(value) == expected


def _load_vectors() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    with _VECTORS_PATH.open(encoding="utf-8") as handle:
        document = json.load(handle)
    return document["vectors"], document["recordVectors"]


_VECTORS, _RECORD_VECTORS = _load_vectors()


@pytest.mark.parametrize("vector", _VECTORS, ids=lambda v: v["name"])
def test_reproduces_shared_conformance_vectors(vector: dict[str, Any]) -> None:
    assert identity(vector["value"]) == vector["ni"]


@pytest.mark.parametrize("vector", _RECORD_VECTORS, ids=lambda v: v["name"])
def test_reproduces_shared_record_conformance_vectors(vector: dict[str, Any]) -> None:
    assert identity_of_record(vector["body"]) == vector["ni"]


def test_conformance_vectors_meet_the_milestone_floor() -> None:
    assert len(_VECTORS) + len(_RECORD_VECTORS) >= 12


def test_key_order_permutation_vectors_share_one_id() -> None:
    by_name = {v["name"]: v["ni"] for v in _VECTORS}
    assert by_name["flat_two_keys_ab"] == by_name["flat_two_keys_ba"]
    assert by_name["nested_object"] == by_name["nested_object_key_reordered"]
