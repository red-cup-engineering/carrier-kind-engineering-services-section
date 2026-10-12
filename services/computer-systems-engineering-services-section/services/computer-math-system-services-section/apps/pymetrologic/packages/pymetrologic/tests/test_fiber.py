"""The fiber functor's four generators are bilattice homomorphisms.

This is the computational witness of the corpus theorem "cellwise reindexing ⇒
bilattice homomorphism", and of the generator composition identities
(converse∘converse = id; converse∘subject = object).
"""

from __future__ import annotations

from pymetrologic import (
    constant_section,
    converse,
    four,
    full_index,
    is_bilattice_homomorphism,
    object_projection,
    specialization,
    subject_projection,
)

bl = four()
E = ("a", "b")
INDEX = full_index(E)


def _samples() -> list[dict[tuple[str, str], object]]:
    # A spread of fiber sections: each Belnap corner as a constant, plus a mixed one.
    corners = [bl.none, bl.true, bl.false, bl.conflict]
    sections = [constant_section(bl, E, c) for c in corners]
    mixed = {pair: corners[(i * 7) % 4] for i, pair in enumerate(INDEX)}
    sections.append(mixed)
    return sections  # type: ignore[return-value]


def test_converse_is_a_homomorphism() -> None:
    assert is_bilattice_homomorphism(bl, converse(bl, E), _samples())


def test_subject_projection_is_a_homomorphism() -> None:
    assert is_bilattice_homomorphism(bl, subject_projection(bl, E), _samples())


def test_object_projection_is_a_homomorphism() -> None:
    assert is_bilattice_homomorphism(bl, object_projection(bl, E), _samples())


def test_specialization_is_a_homomorphism() -> None:
    support = {("a", "a"), ("a", "b")}
    assert is_bilattice_homomorphism(bl, specialization(bl, E, support), _samples())


def test_converse_is_an_involution() -> None:
    f = converse(bl, E)
    for s in _samples():
        assert f(f(s)) == s


def test_converse_then_subject_is_object() -> None:
    # The fiber functor is CONTRAVARIANT: F(g∘f) = F(f)∘F(g). The index maps
    # compose as (s,o) ↦ (o,s) ↦ (o,o) (converse then subject), so on pullbacks
    # the object projection factors as converse ∘ subject (order reversed).
    conv = converse(bl, E)
    subj = subject_projection(bl, E)
    obj = object_projection(bl, E)
    for s in _samples():
        assert conv(subj(s)) == obj(s)


def test_specialization_zeroes_outside_support() -> None:
    support = {("a", "a")}
    f = specialization(bl, E, support)
    out = f(constant_section(bl, E, bl.true))
    assert out[("a", "a")] == bl.true
    assert out[("b", "b")] == bl.none
