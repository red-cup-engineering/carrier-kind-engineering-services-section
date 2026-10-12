"""Finite Anderson–Putnam cohomology witnesses (RelMath.Aperiodic.Witness.JeandelRao).

The aperiodic-regime claim "the classifying invariant ``cl-inv`` can be nonzero" is
given finite content by a **one-vertex Anderson–Putnam cochain complex** extracted
from the Jeandel–Rao Wang set (the minimal aperiodic tiling). With one vertex the
degree-0 coboundary ``δ⁰`` vanishes, so any cocycle that is not identically zero
already represents a **nonzero ``H¹`` class** — e.g. the marker-ring core
``b3 = q1 + q2 + q5``. This realizes the cochain machinery (the cocycle / nonzero-H¹
criterion); the boundary data is the shape of the corpus witness.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

Cochain = Mapping[str, int]

__all__ = ["OneVertexComplex", "coboundary", "is_cocycle", "is_nonzero_h1"]


@dataclass(frozen=True)
class OneVertexComplex:
    """A finite one-vertex complex: ``C⁰=ℤ``, ``C¹=ℤ^Edge``, ``C²=ℤ^Face``, with ``δ¹``."""

    edges: tuple[str, ...]
    faces: tuple[str, ...]
    delta1: dict[str, dict[str, int]]  # face ↦ {edge: boundary coefficient}


def coboundary(cx: OneVertexComplex, cochain: Cochain) -> dict[str, int]:
    """``δ¹`` of a 1-cochain: the 2-cochain ``face ↦ Σ_edge δ¹[face][edge]·cochain[edge]``."""
    return {
        face: sum(coeff * cochain.get(edge, 0) for edge, coeff in cx.delta1[face].items())
        for face in cx.faces
    }


def is_cocycle(cx: OneVertexComplex, cochain: Cochain) -> bool:
    """A cocycle: ``δ¹`` of the cochain is zero on every face (closedness)."""
    return all(v == 0 for v in coboundary(cx, cochain).values())


def is_nonzero_h1(cx: OneVertexComplex, cochain: Cochain) -> bool:
    """A nonzero ``H¹`` class: a cocycle that is not identically zero (valid since ``δ⁰=0``)."""
    return is_cocycle(cx, cochain) and any(v != 0 for v in cochain.values())
