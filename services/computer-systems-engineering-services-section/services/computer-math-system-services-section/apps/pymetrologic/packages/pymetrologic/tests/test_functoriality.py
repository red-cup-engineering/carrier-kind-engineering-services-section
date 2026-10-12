"""Fiber-functor composition laws — F is a genuine (contravariant) functor.

The four generators compose by composing their index maps; on pullbacks that
order reverses (F(g∘f) = F(f)∘F(g)). These identities pin that down.
"""

from __future__ import annotations

from pymetrologic import (
    constant_section,
    converse,
    four,
    full_index,
    object_projection,
    specialization,
    subject_projection,
)

bl = four()
E = ("a", "b", "c")
INDEX = full_index(E)


def _samples() -> list[dict[tuple[str, str], object]]:
    corners = [bl.none, bl.true, bl.false, bl.conflict]
    out = [constant_section(bl, E, c) for c in corners]
    out.append({pair: corners[(i * 5) % 4] for i, pair in enumerate(INDEX)})
    return out  # type: ignore[return-value]


def test_specialization_composes_to_intersection() -> None:
    s1 = {("a", "a"), ("a", "b"), ("b", "b")}
    s2 = {("a", "b"), ("b", "b"), ("c", "c")}
    f1 = specialization(bl, E, s1)
    f2 = specialization(bl, E, s2)
    f_inter = specialization(bl, E, s1 & s2)
    for v in _samples():
        assert f1(f2(v)) == f_inter(v)


def test_subject_projection_is_idempotent() -> None:
    subj = subject_projection(bl, E)
    for v in _samples():
        assert subj(subj(v)) == subj(v)


def test_object_projection_is_idempotent() -> None:
    obj = object_projection(bl, E)
    for v in _samples():
        assert obj(obj(v)) == obj(v)


def test_subject_after_converse_collapses_to_subject() -> None:
    # subj(conv(v))(s,o) = conv(v)(s,s) = v(s,s) = subj(v).
    conv = converse(bl, E)
    subj = subject_projection(bl, E)
    for v in _samples():
        assert subj(conv(v)) == subj(v)


def test_object_factors_as_converse_after_subject() -> None:
    # Contravariance again: obj = F(subject)∘F(converse) on pullbacks = conv∘subj.
    conv = converse(bl, E)
    subj = subject_projection(bl, E)
    obj = object_projection(bl, E)
    for v in _samples():
        assert conv(subj(v)) == obj(v)
