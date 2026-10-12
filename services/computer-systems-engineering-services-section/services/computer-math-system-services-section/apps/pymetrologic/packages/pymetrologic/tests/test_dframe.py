"""d-frames — bitopological dual (RelMath.Cohomology.DFrame)."""

from __future__ import annotations

from pymetrologic import (
    con_is_downward_closed,
    consistency,
    is_clopen_partition,
    tot_is_upward_closed,
    totality,
)

X = frozenset({"a", "b", "c"})


def test_consistency_is_disjointness() -> None:
    assert consistency(frozenset({"a"}), frozenset({"b"}))  # disjoint
    assert not consistency(frozenset({"a", "b"}), frozenset({"b"}))  # overlap on b


def test_totality_is_covering() -> None:
    assert totality(X, frozenset({"a", "b"}), frozenset({"c"}))  # covers X
    assert not totality(X, frozenset({"a"}), frozenset({"b"}))  # misses c


def test_dframe_relation_axioms() -> None:
    assert con_is_downward_closed(X)  # con downward-closed
    assert tot_is_upward_closed(X)  # tot upward-closed


def test_clopen_partition_is_consistent_and_total() -> None:
    u = frozenset({"a", "b"})
    v = X - u  # the complement -> a clopen partition
    assert is_clopen_partition(X, u, v)
    # overlapping or non-covering pairs are not partitions.
    assert not is_clopen_partition(X, frozenset({"a"}), frozenset({"a", "b"}))
    assert not is_clopen_partition(X, frozenset({"a"}), frozenset({"b"}))
