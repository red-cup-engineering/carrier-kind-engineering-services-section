"""Formal Concept Analysis — derivation Galois connection + concept lattice.

Witnesses RelMath.Order.FormalConceptAnalysis: the derivation adjunction, the
induced closure (reusing pymetrologic.closure.is_closure on the powerset lattice), and
the formal concepts as closed pairs.
"""

from __future__ import annotations

from pymetrologic import (
    Context,
    FiniteLattice,
    close_extent,
    close_intent,
    concepts,
    is_closure,
    is_galois_connection,
    powerset,
    prime_attrs,
    prime_objs,
)

# Objects a,b,c; attributes x,y. a:xy, b:x, c:y.
CTX = Context(
    objects=("a", "b", "c"),
    attributes=("x", "y"),
    incidence=frozenset({("a", "x"), ("a", "y"), ("b", "x"), ("c", "y")}),
)


def test_derivation_basics() -> None:
    assert prime_attrs(CTX, frozenset({"a"})) == frozenset({"x", "y"})
    assert prime_attrs(CTX, frozenset({"a", "b"})) == frozenset({"x"})
    assert prime_attrs(CTX, frozenset()) == frozenset({"x", "y"})  # empty extent → all M
    assert prime_objs(CTX, frozenset({"x"})) == frozenset({"a", "b"})


def test_derivation_is_a_galois_connection() -> None:
    assert is_galois_connection(CTX)


def test_close_extent_is_a_closure_on_the_powerset_lattice() -> None:
    subsets = powerset(CTX.objects)
    lat: FiniteLattice[frozenset[str]] = FiniteLattice(
        elements=subsets,
        leq=lambda a, b: a <= b,
        join=lambda a, b: a | b,
        meet=lambda a, b: a & b,
        bot=frozenset(),
        top=frozenset(CTX.objects),
    )
    assert is_closure(lat, lambda a: close_extent(CTX, a))


def test_close_intent_is_the_dual_attribute_closure() -> None:
    assert close_intent(CTX, frozenset({"x"})) == frozenset({"x"})
    assert close_intent(CTX, frozenset({"x", "y"})) == frozenset({"x", "y"})


def test_concepts_are_closed_pairs() -> None:
    cs = concepts(CTX)
    for extent, intent in cs:
        assert prime_attrs(CTX, extent) == intent
        assert prime_objs(CTX, intent) == extent
        assert close_extent(CTX, extent) == extent  # extent is closed
    # The four concepts of this context, top (all objects) to bottom.
    extents = {extent for extent, _ in cs}
    assert frozenset({"a", "b", "c"}) in extents  # top: shared intent ∅
    assert frozenset({"a"}) in extents  # bottom: intent {x,y}
    assert len(cs) == 4
