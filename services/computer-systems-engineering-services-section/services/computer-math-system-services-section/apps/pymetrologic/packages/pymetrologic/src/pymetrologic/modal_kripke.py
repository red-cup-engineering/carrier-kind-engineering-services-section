"""Four-valued Kripke frame hierarchy over Belnap FOUR.

Executable shadow of ``RelMath.Positing.ModalKripkeFourValued``.  The core
modal operators already live in :mod:`pymetrologic.modal`; this module earns the
Lean-side hierarchy and laws around them:

* K frames have a finite accessibility relation;
* T frames are reflexive;
* S4 frames are reflexive and transitive, so ``box`` is an interior and
  ``diamond`` is a closure;
* S5 frames add symmetry, recovering the existing modal adjunction setting;
* truth negation swaps the two twist components of a FOUR charge.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from itertools import product

from pymetrologic import BL, four
from pymetrologic.modal import necessitate as modal_box
from pymetrologic.modal import possibilize as modal_diamond

FOUR = four()
Charge = BL[int]
Valuation = dict[str, Charge]

__all__ = [
    "KFrame",
    "KripkeHierarchyWitness",
    "S4ClosureAlgebraWitness",
    "S4Frame",
    "S5Frame",
    "TFrame",
    "box",
    "diamond",
    "frame_from_successors",
    "kripke_hierarchy",
    "s4_box_is_interior",
    "s4_diamond_is_closure",
    "sample_s4_frame",
    "sample_s5_frame",
    "twist_split",
    "twist_split_negate",
]

CHARGES: tuple[Charge, ...] = (FOUR.none, FOUR.true, FOUR.false, FOUR.conflict)


@dataclass(frozen=True, slots=True)
class KFrame:
    """A finite four-valued Kripke K-frame."""

    cells: tuple[str, ...]
    relation: frozenset[tuple[str, str]]

    def access(self, source: str, target: str) -> bool:
        """Whether ``source`` accesses ``target``."""
        return (source, target) in self.relation

    def successors(self, source: str) -> tuple[str, ...]:
        """Cells accessible from ``source``."""
        return tuple(target for target in self.cells if self.access(source, target))

    def is_reflexive(self) -> bool:
        """Whether every cell accesses itself."""
        return all(self.access(cell, cell) for cell in self.cells)

    def is_symmetric(self) -> bool:
        """Whether accessibility is symmetric."""
        return all(
            not self.access(left, right) or self.access(right, left)
            for left in self.cells
            for right in self.cells
        )

    def is_transitive(self) -> bool:
        """Whether accessibility composes."""
        return all(
            not (self.access(left, mid) and self.access(mid, right)) or self.access(left, right)
            for left in self.cells
            for mid in self.cells
            for right in self.cells
        )

    def to_k(self) -> KFrame:
        """Forget down to K data."""
        return KFrame(self.cells, self.relation)


@dataclass(frozen=True, slots=True)
class TFrame(KFrame):
    """A reflexive K-frame."""

    def to_t(self) -> TFrame:
        """Forget down to T data."""
        return TFrame(self.cells, self.relation)


@dataclass(frozen=True, slots=True)
class S4Frame(TFrame):
    """A reflexive and transitive T-frame."""

    def to_s4(self) -> S4Frame:
        """Forget down to S4 data."""
        return S4Frame(self.cells, self.relation)


@dataclass(frozen=True, slots=True)
class S5Frame(S4Frame):
    """A reflexive, transitive, symmetric S4-frame."""


@dataclass(frozen=True, slots=True)
class KripkeHierarchyWitness:
    """The finite K superset T superset S4 superset S5 hierarchy checks."""

    k_data: bool
    t_adds_reflexivity: bool
    s4_adds_transitivity: bool
    s5_adds_symmetry: bool
    forgetful_inclusions: bool

    @property
    def holds(self) -> bool:
        """All hierarchy checks hold."""
        return (
            self.k_data
            and self.t_adds_reflexivity
            and self.s4_adds_transitivity
            and self.s5_adds_symmetry
            and self.forgetful_inclusions
        )


@dataclass(frozen=True, slots=True)
class S4ClosureAlgebraWitness:
    """S4 box/interior and diamond/closure laws."""

    box_deflationary: bool
    box_monotone: bool
    box_idempotent: bool
    diamond_extensive: bool
    diamond_monotone: bool
    diamond_idempotent: bool
    symmetry_not_required: bool

    @property
    def holds(self) -> bool:
        """All S4 closure-algebra checks hold."""
        return (
            self.box_deflationary
            and self.box_monotone
            and self.box_idempotent
            and self.diamond_extensive
            and self.diamond_monotone
            and self.diamond_idempotent
            and self.symmetry_not_required
        )


def frame_from_successors(
    frame_type: type[KFrame],
    successors: Mapping[str, Sequence[str]],
) -> KFrame:
    """Build a finite frame from successor lists."""
    cells = tuple(successors)
    relation = frozenset(
        (source, target) for source, targets in successors.items() for target in targets
    )
    return frame_type(cells, relation)


def sample_s4_frame() -> S4Frame:
    """A reflexive, transitive, non-symmetric S4 frame."""
    return S4Frame(
        cells=("root", "mid", "top"),
        relation=frozenset(
            {
                ("root", "root"),
                ("mid", "mid"),
                ("top", "top"),
                ("root", "mid"),
                ("mid", "top"),
                ("root", "top"),
            }
        ),
    )


def sample_s5_frame() -> S5Frame:
    """An S5 frame with two equivalence classes."""
    cells = ("0", "1", "2", "3")
    relation = frozenset(
        (left, right) for left in cells for right in cells if int(left) % 2 == int(right) % 2
    )
    return S5Frame(cells=cells, relation=relation)


def diamond(frame: KFrame, valuation: Mapping[str, Charge]) -> Valuation:
    """The four-valued diamond: fiber knowledge-join over accessible cells."""
    return modal_diamond(FOUR, frame.cells, frame.access, dict(valuation))


def box(frame: KFrame, valuation: Mapping[str, Charge]) -> Valuation:
    """The four-valued box: fiber knowledge-meet over accessible cells."""
    return modal_box(FOUR, frame.cells, frame.access, dict(valuation))


def _valuations(cells: Sequence[str]) -> tuple[Valuation, ...]:
    return tuple(
        dict(zip(cells, charges, strict=True)) for charges in product(CHARGES, repeat=len(cells))
    )


def _leq(left: Mapping[str, Charge], right: Mapping[str, Charge], cells: Sequence[str]) -> bool:
    return all(FOUR.leq_k(left[cell], right[cell]) for cell in cells)


def _eq(left: Mapping[str, Charge], right: Mapping[str, Charge], cells: Sequence[str]) -> bool:
    return all(left[cell] == right[cell] for cell in cells)


def kripke_hierarchy(
    k_frame: KFrame | None = None,
    t_frame: TFrame | None = None,
    s4_frame: S4Frame | None = None,
    s5_frame: S5Frame | None = None,
) -> KripkeHierarchyWitness:
    """Bundle the finite K/T/S4/S5 hierarchy checks."""
    actual_k = KFrame(("a", "b"), frozenset({("a", "b")})) if k_frame is None else k_frame
    actual_t = (
        TFrame(
            ("a", "b"),
            frozenset({("a", "a"), ("b", "b"), ("a", "b")}),
        )
        if t_frame is None
        else t_frame
    )
    actual_s4 = sample_s4_frame() if s4_frame is None else s4_frame
    actual_s5 = sample_s5_frame() if s5_frame is None else s5_frame
    return KripkeHierarchyWitness(
        k_data=bool(actual_k.cells)
        and all(
            left in actual_k.cells and right in actual_k.cells for left, right in actual_k.relation
        ),
        t_adds_reflexivity=actual_t.is_reflexive(),
        s4_adds_transitivity=actual_s4.is_reflexive() and actual_s4.is_transitive(),
        s5_adds_symmetry=actual_s5.is_reflexive()
        and actual_s5.is_transitive()
        and actual_s5.is_symmetric(),
        forgetful_inclusions=actual_t.to_k().relation == actual_t.relation
        and actual_s4.to_t().relation == actual_s4.relation
        and actual_s5.to_s4().relation == actual_s5.relation,
    )


def s4_box_is_interior(frame: S4Frame | None = None) -> S4ClosureAlgebraWitness:
    """Check the S4 theorem: box is interior and diamond is closure."""
    actual = sample_s4_frame() if frame is None else frame
    vals = _valuations(actual.cells)
    return S4ClosureAlgebraWitness(
        box_deflationary=all(_leq(box(actual, value), value, actual.cells) for value in vals),
        box_monotone=all(
            _leq(box(actual, left), box(actual, right), actual.cells)
            for left in vals
            for right in vals
            if _leq(left, right, actual.cells)
        ),
        box_idempotent=all(
            _eq(box(actual, box(actual, value)), box(actual, value), actual.cells) for value in vals
        ),
        diamond_extensive=all(_leq(value, diamond(actual, value), actual.cells) for value in vals),
        diamond_monotone=all(
            _leq(diamond(actual, left), diamond(actual, right), actual.cells)
            for left in vals
            for right in vals
            if _leq(left, right, actual.cells)
        ),
        diamond_idempotent=all(
            _eq(diamond(actual, diamond(actual, value)), diamond(actual, value), actual.cells)
            for value in vals
        ),
        symmetry_not_required=not actual.is_symmetric(),
    )


def s4_diamond_is_closure(frame: S4Frame | None = None) -> bool:
    """Return whether the S4 diamond has the closure-operator half of the theorem."""
    witness = s4_box_is_interior(frame)
    return witness.diamond_extensive and witness.diamond_monotone and witness.diamond_idempotent


def twist_split(charge: Charge) -> tuple[bool, bool]:
    """Split a FOUR charge into positive and negative evidence components."""
    return bool(charge.pro), bool(charge.con)


def twist_split_negate(charge: Charge) -> bool:
    """Truth negation swaps the two twist components."""
    return twist_split(FOUR.neg(charge)) == (twist_split(charge)[1], twist_split(charge)[0])
