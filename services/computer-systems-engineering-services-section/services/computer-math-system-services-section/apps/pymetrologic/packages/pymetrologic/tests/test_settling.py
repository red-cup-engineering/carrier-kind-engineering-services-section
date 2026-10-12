"""Settling: the merge semilattice on settlings, and fixed-point convergence."""

from __future__ import annotations

from collections.abc import Mapping

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import BL, conflict_total, four, merge, merge_all, settle

bl = four()
VALUES = [bl.none, bl.true, bl.false, bl.conflict]


def _settling(d: dict[str, int]) -> dict[str, BL[int]]:
    # encode 0→none, 1→true, 2→false, 3→conflict for convenient generation
    return {k: VALUES[v] for k, v in d.items()}


@given(st.dictionaries(st.sampled_from("xyz"), st.integers(0, 3)))
def test_merge_is_idempotent(d: dict[str, int]) -> None:
    s = _settling(d)
    assert merge(bl, s, s) == dict(s)


@given(
    a=st.dictionaries(st.sampled_from("xyz"), st.integers(0, 3)),
    b=st.dictionaries(st.sampled_from("xyz"), st.integers(0, 3)),
)
def test_merge_is_commutative(a: dict[str, int], b: dict[str, int]) -> None:
    sa, sb = _settling(a), _settling(b)
    assert merge(bl, sa, sb) == merge(bl, sb, sa)


@given(
    a=st.dictionaries(st.sampled_from("xy"), st.integers(0, 3)),
    b=st.dictionaries(st.sampled_from("xy"), st.integers(0, 3)),
    c=st.dictionaries(st.sampled_from("xy"), st.integers(0, 3)),
)
def test_merge_is_associative(a: dict[str, int], b: dict[str, int], c: dict[str, int]) -> None:
    sa, sb, sc = _settling(a), _settling(b), _settling(c)
    left = merge(bl, merge(bl, sa, sb), sc)
    right = merge(bl, sa, merge(bl, sb, sc))
    assert left == right


def test_merging_true_and_false_localizes_conflict() -> None:
    settled = merge(bl, {"p": bl.true}, {"p": bl.false})
    assert settled["p"] == bl.conflict
    assert conflict_total(bl, settled) == 1


def test_settle_reaches_a_fixed_point() -> None:
    # A step that floods knowledge from a constant source; inflationary & bounded.
    source = {"a": bl.true, "b": bl.false}

    def step(_state: Mapping[str, BL[int]]) -> dict[str, BL[int]]:
        return dict(source)

    settled, iterations = settle(bl, step, {})
    assert settled == source
    assert iterations >= 1
    # idempotent: settling an already-settled state changes nothing.
    again, _ = settle(bl, step, settled)
    assert again == settled


def test_merge_all_unit_is_bottom() -> None:
    assert merge_all(bl, []) == {}
    s = {"k": bl.true}
    assert merge_all(bl, [{}, s, {}]) == s
