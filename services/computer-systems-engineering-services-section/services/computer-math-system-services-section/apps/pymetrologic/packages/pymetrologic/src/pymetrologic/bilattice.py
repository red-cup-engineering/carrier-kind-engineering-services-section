"""The bilattice fiber ``L^⋈`` — the twist product over a bounded lattice.

This realizes the *predication fiber algebra* of the 561-group corpus:
the uniform fiber ``A_p = L^{⋈ E×E}`` is, pointwise, a distributive bilattice
``L^⋈`` over a base lattice ``L`` (the corpus' "twist product"). A bilattice
carries two orders at once:

* the **truth order** ``≤_t`` — how *true* a value is;
* the **knowledge order** ``≤_k`` — how *much is known* (how settled).

A value ``v = ⟨pro, con⟩`` records evidence *for* and evidence *against*
separately. This is the Ginsberg/Fitting bilattice and, for ``L = {0, 1}``,
exactly **Belnap's FOUR** ``{⊥, t, f, ⊤}``. The corpus proves the predication
"status" lands in FOUR; here that is just ``bilattice(boolean)``.

The merge that drives *settling* is the knowledge-order join ``∨_k``: it is
commutative, associative, and idempotent (a semilattice operation), so settling
a bounded system always converges. See :mod:`pymetrologic.settling`.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")

__all__ = [
    "BL",
    "Bilattice",
    "BooleanLattice",
    "BoundedLattice",
    "Chain",
    "UnitInterval",
    "bilattice",
    "boolean",
    "four",
    "unit_interval",
]


# --------------------------------------------------------------------------- #
# The base lattice L
# --------------------------------------------------------------------------- #
class BoundedLattice(ABC, Generic[T]):
    """A bounded lattice with an order-reversing involution (De Morgan negation).

    ``L^⋈`` is built over any such ``L``. The involution ``neg`` supplies the
    bilattice negation ``∼`` and conflation ``−``; for a chain it is the
    reflection ``x ↦ top − x``.
    """

    @property
    @abstractmethod
    def bot(self) -> T:
        """The least element ``⊥_L``."""

    @property
    @abstractmethod
    def top(self) -> T:
        """The greatest element ``⊤_L``."""

    @abstractmethod
    def leq(self, x: T, y: T) -> bool:
        """The lattice order ``x ≤_L y``."""

    @abstractmethod
    def join(self, x: T, y: T) -> T:
        """The lattice join ``x ∨_L y`` (least upper bound)."""

    @abstractmethod
    def meet(self, x: T, y: T) -> T:
        """The lattice meet ``x ∧_L y`` (greatest lower bound)."""

    @abstractmethod
    def neg(self, x: T) -> T:
        """The order-reversing involution ``¬x`` (De Morgan complement)."""

    def imp(self, x: T, y: T) -> T:
        """Residual implication ``x → y`` making ``L`` a residuated (Heyting) lattice.

        The Gödel/Heyting residual ``x → y = ⊤`` if ``x ≤ y`` else ``y`` — correct
        for every linearly ordered ``L`` here (Boolean, the chains, and ``[0,1]``).
        It is the residual of the meet: ``x ∧ y ≤ z ⟺ y ≤ x → z``. The twist
        product builds the bilattice fusion/residual on top of it.
        """
        return self.top if self.leq(x, y) else y

    @abstractmethod
    def sample(self, n: int) -> tuple[T, ...]:
        """A finite spread of carrier values, for property-based testing."""


class BooleanLattice(BoundedLattice[int]):
    """The two-point lattice ``{0, 1}``. ``bilattice(BooleanLattice())`` is FOUR."""

    @property
    def bot(self) -> int:
        return 0

    @property
    def top(self) -> int:
        return 1

    def leq(self, x: int, y: int) -> bool:
        return x <= y

    def join(self, x: int, y: int) -> int:
        return x | y

    def meet(self, x: int, y: int) -> int:
        return x & y

    def neg(self, x: int) -> int:
        return 1 - x

    def sample(self, n: int) -> tuple[int, ...]:
        return (0, 1)


class Chain(BoundedLattice[int]):
    """The finite chain ``0 ≤ 1 ≤ … ≤ height`` with reflection negation."""

    def __init__(self, height: int) -> None:
        if height < 1:
            raise ValueError("chain height must be ≥ 1")
        self.height = height

    @property
    def bot(self) -> int:
        return 0

    @property
    def top(self) -> int:
        return self.height

    def leq(self, x: int, y: int) -> bool:
        return x <= y

    def join(self, x: int, y: int) -> int:
        return max(x, y)

    def meet(self, x: int, y: int) -> int:
        return min(x, y)

    def neg(self, x: int) -> int:
        return self.height - x

    def sample(self, n: int) -> tuple[int, ...]:
        return tuple(range(self.height + 1))


class UnitInterval(BoundedLattice[float]):
    """The continuous lattice ``[0, 1]`` (``max``/``min``, ``1 − x``).

    The continuous-regime fiber: a value's ``pro`` and ``con`` are degrees in
    ``[0, 1]``. Comparisons honour ``rel_tol`` so settling can be detected as a
    fixed point up to floating-point error.
    """

    def __init__(self, rel_tol: float = 1e-9) -> None:
        self.rel_tol = rel_tol

    @property
    def bot(self) -> float:
        return 0.0

    @property
    def top(self) -> float:
        return 1.0

    def leq(self, x: float, y: float) -> bool:
        return x <= y + self.rel_tol

    def join(self, x: float, y: float) -> float:
        return max(x, y)

    def meet(self, x: float, y: float) -> float:
        return min(x, y)

    def neg(self, x: float) -> float:
        return 1.0 - x

    def sample(self, n: int) -> tuple[float, ...]:
        if n < 2:
            return (0.0, 1.0)
        return tuple(i / (n - 1) for i in range(n))


# --------------------------------------------------------------------------- #
# The bilattice value and operations
# --------------------------------------------------------------------------- #
@dataclass(frozen=True, slots=True)
class BL(Generic[T]):
    """A bilattice value ``⟨pro, con⟩``: evidence *for* and evidence *against*.

    Immutable and hashable so it can index settlings and be compared for fixed
    points. The four Belnap corners are ``⟨0,0⟩ = ⊥`` (none), ``⟨1,0⟩ = t``
    (true), ``⟨0,1⟩ = f`` (false), ``⟨1,1⟩ = ⊤`` (both/conflict).
    """

    pro: T
    con: T

    def __repr__(self) -> str:
        return f"⟨{self.pro}, {self.con}⟩"


class Bilattice(Generic[T]):
    """The twist-product bilattice ``L^⋈`` over a bounded lattice ``L``.

    Every operation is pointwise on the ``(pro, con)`` pair, so each is itself a
    lattice operation — this is exactly why the fiber-functor reindexings are
    bilattice homomorphisms (see :mod:`pymetrologic.fiber`).
    """

    def __init__(self, base: BoundedLattice[T]) -> None:
        self.L = base

    # -- orders -------------------------------------------------------------- #
    def leq_t(self, x: BL[T], y: BL[T]) -> bool:
        """Truth order: more ``pro``, less ``con``."""
        return self.L.leq(x.pro, y.pro) and self.L.leq(y.con, x.con)

    def leq_k(self, x: BL[T], y: BL[T]) -> bool:
        """Knowledge order: more of *both* (more is settled)."""
        return self.L.leq(x.pro, y.pro) and self.L.leq(x.con, y.con)

    def eq(self, x: BL[T], y: BL[T]) -> bool:
        """Order-respecting equality (``≤`` both ways; tolerant for ``[0,1]``)."""
        return self.leq_k(x, y) and self.leq_k(y, x)

    # -- truth lattice ------------------------------------------------------- #
    def meet_t(self, x: BL[T], y: BL[T]) -> BL[T]:
        return BL(self.L.meet(x.pro, y.pro), self.L.join(x.con, y.con))

    def join_t(self, x: BL[T], y: BL[T]) -> BL[T]:
        return BL(self.L.join(x.pro, y.pro), self.L.meet(x.con, y.con))

    # -- residuated structure on the truth order (the twist product) -------- #
    # Transcribed from RelMath.Order.TwistProductResiduation (lean/): ``L^⋈`` is a
    # commutative residuated lattice *in the truth order*, with fusion ⊙ left
    # adjoint to the residual ⇒. Over our integral base the monoid product is the
    # meet and ``→`` is the Gödel residual ``L.imp``.
    def fuse(self, x: BL[T], y: BL[T]) -> BL[T]:
        """Twist fusion ``x ⊙ y = ⟨xₚ·yₚ, (xₚ→y_c) ∧ (yₚ→x_c)⟩`` — the truth-order tensor.

        Left adjoint to :meth:`residuum`. Commutative; its monoidal unit is
        ``⟨⊤,⊤⟩`` (the *knowledge* top — the structure is genuinely
        non-integral, the shape of the ``⊗ ⊣ ⊸`` adjunction of linear logic).
        """
        L = self.L
        return BL(L.meet(x.pro, y.pro), L.meet(L.imp(x.pro, y.con), L.imp(y.pro, x.con)))

    def residuum(self, x: BL[T], y: BL[T]) -> BL[T]:
        """Twist right residual ``x ⇒ y = ⟨(xₚ→yₚ) ∧ (y_c→x_c), xₚ·y_c⟩`` — the implication.

        Right adjoint to fusion: the residuation adjunction proved in the corpus,
        ``a ⊙ b ≤_t c ⟺ a ≤_t (b ⇒ c)`` (RelMath ``fuse_leT_iff``).
        """
        L = self.L
        return BL(L.meet(L.imp(x.pro, y.pro), L.imp(y.con, x.con)), L.meet(x.pro, y.con))

    def right_residuation(self, a: BL[T]) -> Callable[[BL[T]], BL[T]]:
        """The unary operator ``R_a(x) = a ⇒ x``; iterating it traces orbits in ``L^⋈``."""
        return lambda x: self.residuum(a, x)

    @property
    def fusion_unit(self) -> BL[T]:
        """The fusion monoidal unit ``⟨⊤,⊤⟩`` — the knowledge top, *not* the truth top."""
        return BL(self.L.top, self.L.top)

    # -- knowledge lattice --------------------------------------------------- #
    def meet_k(self, x: BL[T], y: BL[T]) -> BL[T]:
        """Knowledge meet ``∧_k`` — the *consensus* (what both agree is settled)."""
        return BL(self.L.meet(x.pro, y.pro), self.L.meet(x.con, y.con))

    def join_k(self, x: BL[T], y: BL[T]) -> BL[T]:
        """Knowledge join ``∨_k`` — the **merge**; the engine of settling."""
        return BL(self.L.join(x.pro, y.pro), self.L.join(x.con, y.con))

    # -- negation / conflation ---------------------------------------------- #
    def neg(self, x: BL[T]) -> BL[T]:
        """Truth negation ``∼`` — swap evidence for and against."""
        return BL(x.con, x.pro)

    def conflate(self, x: BL[T]) -> BL[T]:
        """Conflation ``−⟨a,b⟩ = ⟨¬b, ¬a⟩`` — the knowledge-axis negation.

        Reverses the knowledge order ``≤_k`` and preserves the truth order
        ``≤_t`` (swaps ``⊥ ↔ ⊤``, fixes ``t``/``f``) — dual to :meth:`neg`. With
        ``neg`` it generates the Klein four-group gauge (see :mod:`pymetrologic.klein`).
        """
        return BL(self.L.neg(x.con), self.L.neg(x.pro))

    # -- designated points -------------------------------------------------- #
    @property
    def none(self) -> BL[T]:
        """``⊥`` — nothing known."""
        return BL(self.L.bot, self.L.bot)

    @property
    def conflict(self) -> BL[T]:
        """``⊤`` — both for and against at once (Belnap "both")."""
        return BL(self.L.top, self.L.top)

    @property
    def true(self) -> BL[T]:
        return BL(self.L.top, self.L.bot)

    @property
    def false(self) -> BL[T]:
        return BL(self.L.bot, self.L.top)

    # -- conflict measure --------------------------------------------------- #
    def conflict_degree(self, x: BL[T]) -> T:
        """How much ``x`` asserts *for and against at once*: ``pro ∧_L con``.

        ``0`` is classically consistent; the top of ``L`` is full conflict
        (``⊤``). This graded measure is the bilattice-native generalization of
        PySheaf's consistency radius — but per value, so it *localizes*
        inconsistency instead of collapsing it to one scalar.
        """
        return self.L.meet(x.pro, x.con)

    def is_consistent(self, x: BL[T]) -> bool:
        """``True`` iff ``x`` carries no for-and-against conflict."""
        return self.conflict_degree(x) == self.L.bot

    # -- helpers ------------------------------------------------------------ #
    def sample(self, n: int = 3) -> tuple[BL[T], ...]:
        """A spread of bilattice values for property tests."""
        vals = self.L.sample(n)
        return tuple(BL(p, c) for p in vals for c in vals)


# --------------------------------------------------------------------------- #
# Conveniences
# --------------------------------------------------------------------------- #
def bilattice(base: BoundedLattice[T]) -> Bilattice[T]:
    """Build ``L^⋈`` over ``base``."""
    return Bilattice(base)


def boolean() -> BooleanLattice:
    """The base lattice ``{0, 1}``."""
    return BooleanLattice()


def unit_interval(rel_tol: float = 1e-9) -> UnitInterval:
    """The base lattice ``[0, 1]``."""
    return UnitInterval(rel_tol)


def four() -> Bilattice[int]:
    """Belnap's **FOUR** ``= {0,1}^⋈``."""
    return Bilattice(BooleanLattice())
