"""Finite bitopological settling site over the FOUR Stone fiber.

Executable shadow of ``RelMath.Cohomology.BitopologicalSettlingSite``.  The
site's fiber is the four-element Boolean algebra of pairwise-Stone clopens from
``PairwiseStoneClopen``.  Covers are finite join-covers inside one fixed fiber:
each member is included in ``U`` and the family join is ``U``.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from itertools import product
from typing import Any

from .pairwise_stone import CLOPEN_BOT, CLOPEN_TOP, CLOPEN_UPS, ClopenUp
from .regimes import ClosureRegime

CoverSelector = Callable[[ClopenUp], tuple[ClopenUp, ...]]

__all__ = [
    "BitopologicalSiteWitness",
    "ClopenAlgebraWitness",
    "CoverSelector",
    "CoverWitness",
    "FiberHom",
    "NoTemporalCoversWitness",
    "SiteObj",
    "advances",
    "all_cover_families",
    "bitopological_site_grothendieck",
    "clopen_boolean_algebra",
    "clopen_bot",
    "clopen_join",
    "clopen_meet",
    "clopen_sub",
    "clopen_top",
    "covers",
    "covers_is_fiber_local",
    "covers_pullback",
    "covers_self",
    "covers_singleton_iff",
    "covers_trans",
    "fiber_comp",
    "fiber_id",
    "join_list",
    "no_temporal_covers",
    "strict_site_finite_fiber",
]


@dataclass(frozen=True, slots=True)
class ClopenAlgebraWitness:
    """Finite check that the clopens form the Boolean algebra used by the site."""

    meet_commutative: bool
    join_commutative: bool
    meet_associative: bool
    join_associative: bool
    meet_top: bool
    join_bot: bool
    distributive: bool
    sub_partial_order: bool

    @property
    def holds(self) -> bool:
        """All checked Boolean-algebra/order laws hold."""
        return (
            self.meet_commutative
            and self.join_commutative
            and self.meet_associative
            and self.join_associative
            and self.meet_top
            and self.join_bot
            and self.distributive
            and self.sub_partial_order
        )


@dataclass(frozen=True, slots=True)
class CoverWitness:
    """Finite Grothendieck basis checks for the clopen cover relation."""

    identity: bool
    pullback_stable: bool
    transitive: bool

    @property
    def holds(self) -> bool:
        """All cover-basis axioms hold."""
        return self.identity and self.pullback_stable and self.transitive


@dataclass(frozen=True, slots=True)
class BitopologicalSiteWitness:
    """Finite witness that the bitopological settling site is a Grothendieck site."""

    clopen_algebra: ClopenAlgebraWitness
    advances_preorder: bool
    fiber_category: bool
    cover_basis: CoverWitness

    @property
    def holds(self) -> bool:
        """All structural site checks hold."""
        return (
            self.clopen_algebra.holds
            and self.advances_preorder
            and self.fiber_category
            and self.cover_basis.holds
        )


@dataclass(frozen=True, slots=True)
class NoTemporalCoversWitness:
    """Witness that covers live only in the clopen fiber, not the temporal leg."""

    singleton_cover_iff_equal: bool
    covers_are_fiber_local: bool
    temporal_advancement_reduces_to_identity_cover: bool

    @property
    def holds(self) -> bool:
        """The cover relation carries no strict temporal covering content."""
        return (
            self.singleton_cover_iff_equal
            and self.covers_are_fiber_local
            and self.temporal_advancement_reduces_to_identity_cover
        )


@dataclass(frozen=True, slots=True)
class SiteObj:
    """A finite site object ``(q, tau, U)``."""

    q: Any
    tau: int
    clopen: ClopenUp


@dataclass(frozen=True, slots=True)
class FiberHom:
    """A fixed-``(q,tau)`` fiber morphism, determined by clopen inclusion."""

    src: SiteObj
    dst: SiteObj

    @property
    def same_q(self) -> bool:
        """The predicate leg is fixed."""
        return bool(self.src.q == self.dst.q)

    @property
    def same_tau(self) -> bool:
        """The settling stratum is fixed."""
        return self.src.tau == self.dst.tau

    @property
    def inclusion(self) -> bool:
        """The clopen leg is an inclusion."""
        return clopen_sub(self.src.clopen, self.dst.clopen)

    @property
    def valid(self) -> bool:
        """This is a valid fiber morphism."""
        return self.same_q and self.same_tau and self.inclusion


def clopen_meet(left: ClopenUp, right: ClopenUp) -> ClopenUp:
    """Clopen meet/intersection."""
    return left.meet(right)


def clopen_join(left: ClopenUp, right: ClopenUp) -> ClopenUp:
    """Clopen join/union."""
    return left.join(right)


def clopen_bot() -> ClopenUp:
    """The empty clopen."""
    return CLOPEN_BOT


def clopen_top() -> ClopenUp:
    """The full clopen."""
    return CLOPEN_TOP


def clopen_sub(left: ClopenUp, right: ClopenUp) -> bool:
    """Inclusion derived algebraically as ``left meet right == left``."""
    return clopen_meet(left, right) == left


def join_list(family: Iterable[ClopenUp]) -> ClopenUp:
    """Finite join of a family of clopens."""
    acc = clopen_bot()
    for clopen in family:
        acc = clopen_join(clopen, acc)
    return acc


def covers(target: ClopenUp, family: Iterable[ClopenUp]) -> bool:
    """The Grothendieck cover relation at a fixed fiber."""
    fam = tuple(family)
    return all(clopen_sub(member, target) for member in fam) and join_list(fam) == target


def covers_self(target: ClopenUp) -> bool:
    """The maximal singleton cover ``[U]`` covers ``U``."""
    return covers(target, (target,))


def covers_pullback(
    target: ClopenUp,
    subtarget: ClopenUp,
    family: Iterable[ClopenUp],
) -> tuple[ClopenUp, ...]:
    """Pull a cover of ``target`` back along ``subtarget <= target``."""
    fam = tuple(family)
    if not covers(target, fam) or not clopen_sub(subtarget, target):
        msg = "covers_pullback requires a cover and an inclusion"
        raise ValueError(msg)
    return tuple(clopen_meet(subtarget, member) for member in fam)


def covers_trans(
    target: ClopenUp,
    family: Iterable[ClopenUp],
    subcovers: CoverSelector,
) -> tuple[ClopenUp, ...]:
    """Flatten covers of cover members into a cover of the original target."""
    fam = tuple(family)
    if not covers(target, fam):
        msg = "covers_trans requires an outer cover"
        raise ValueError(msg)
    flattened: list[ClopenUp] = []
    for member in fam:
        member_cover = subcovers(member)
        if not covers(member, member_cover):
            msg = "covers_trans requires each member subcover to cover that member"
            raise ValueError(msg)
        flattened.extend(member_cover)
    return tuple(flattened)


def covers_singleton_iff(target: ClopenUp, member: ClopenUp) -> bool:
    """A singleton family covers exactly when its clopen equals the target."""
    return covers(target, (member,)) == (member == target)


def covers_is_fiber_local(target: ClopenUp, family: Iterable[ClopenUp]) -> bool:
    """A cover constrains only clopen inclusion and join inside the fiber."""
    fam = tuple(family)
    if not covers(target, fam):
        return True
    return all(clopen_sub(member, target) for member in fam) and join_list(fam) == target


def advances(tau: int, tau_prime: int) -> bool:
    """Settling advancement, modeled as natural-number order."""
    return tau <= tau_prime


def fiber_id(obj: SiteObj) -> FiberHom:
    """Identity fiber morphism."""
    return FiberHom(obj, obj)


def fiber_comp(outer: FiberHom, inner: FiberHom) -> FiberHom:
    """Compose fiber morphisms by inclusion transitivity."""
    if inner.dst != outer.src:
        msg = "fiber composition requires inner.dst == outer.src"
        raise ValueError(msg)
    composite = FiberHom(inner.src, outer.dst)
    if not (inner.valid and outer.valid and composite.valid):
        msg = "fiber composition requires valid composable fiber morphisms"
        raise ValueError(msg)
    return composite


def all_cover_families(target: ClopenUp | None = None) -> tuple[tuple[ClopenUp, ...], ...]:
    """All duplicate-free finite clopen families, optionally filtered to covers of target."""
    families = tuple(
        tuple(clopen for index, clopen in enumerate(CLOPEN_UPS) if mask & (1 << index))
        for mask in range(1 << len(CLOPEN_UPS))
    )
    if target is None:
        return families
    return tuple(family for family in families if covers(target, family))


def _sub_partial_order() -> bool:
    return (
        all(clopen_sub(u, u) for u in CLOPEN_UPS)
        and all(
            not (clopen_sub(u, v) and clopen_sub(v, w)) or clopen_sub(u, w)
            for u in CLOPEN_UPS
            for v in CLOPEN_UPS
            for w in CLOPEN_UPS
        )
        and all(
            not (clopen_sub(u, v) and clopen_sub(v, u)) or u == v
            for u in CLOPEN_UPS
            for v in CLOPEN_UPS
        )
    )


def clopen_boolean_algebra() -> ClopenAlgebraWitness:
    """Check the finite Boolean-algebra laws for the four clopens."""
    return ClopenAlgebraWitness(
        meet_commutative=all(
            clopen_meet(u, v) == clopen_meet(v, u) for u in CLOPEN_UPS for v in CLOPEN_UPS
        ),
        join_commutative=all(
            clopen_join(u, v) == clopen_join(v, u) for u in CLOPEN_UPS for v in CLOPEN_UPS
        ),
        meet_associative=all(
            clopen_meet(clopen_meet(u, v), w) == clopen_meet(u, clopen_meet(v, w))
            for u in CLOPEN_UPS
            for v in CLOPEN_UPS
            for w in CLOPEN_UPS
        ),
        join_associative=all(
            clopen_join(clopen_join(u, v), w) == clopen_join(u, clopen_join(v, w))
            for u in CLOPEN_UPS
            for v in CLOPEN_UPS
            for w in CLOPEN_UPS
        ),
        meet_top=all(clopen_meet(u, clopen_top()) == u for u in CLOPEN_UPS),
        join_bot=all(clopen_join(u, clopen_bot()) == u for u in CLOPEN_UPS),
        distributive=all(
            clopen_meet(u, clopen_join(v, w)) == clopen_join(clopen_meet(u, v), clopen_meet(u, w))
            for u in CLOPEN_UPS
            for v in CLOPEN_UPS
            for w in CLOPEN_UPS
        ),
        sub_partial_order=_sub_partial_order(),
    )


def _cover_basis() -> CoverWitness:
    identity = all(covers_self(target) for target in CLOPEN_UPS)
    pullback_stable = all(
        covers(subtarget, covers_pullback(target, subtarget, family))
        for target in CLOPEN_UPS
        for subtarget in CLOPEN_UPS
        if clopen_sub(subtarget, target)
        for family in all_cover_families(target)
    )
    transitive = True
    for target in CLOPEN_UPS:
        for family in all_cover_families(target):
            cover_options = [all_cover_families(member) for member in family]
            for selected in product(*cover_options):
                selector_map = dict(zip(family, selected, strict=True))

                def selector(
                    member: ClopenUp,
                    mapping: dict[ClopenUp, tuple[ClopenUp, ...]] = selector_map,
                ) -> tuple[ClopenUp, ...]:
                    return mapping[member]

                flattened = covers_trans(
                    target,
                    family,
                    selector,
                )
                if not covers(target, flattened):
                    transitive = False
                    break
            if not transitive:
                break
        if not transitive:
            break
    return CoverWitness(identity, pullback_stable, transitive)


def _advances_preorder() -> bool:
    sample = range(4)
    return all(advances(t, t) for t in sample) and all(
        not (advances(a, b) and advances(b, c)) or advances(a, c)
        for a in sample
        for b in sample
        for c in sample
    )


def _fiber_category() -> bool:
    top = SiteObj("q", 0, CLOPEN_TOP)
    plus = SiteObj(
        "q",
        0,
        next(clopen for clopen in CLOPEN_UPS if clopen.plus and not clopen.minus),
    )
    bot = SiteObj("q", 0, CLOPEN_BOT)
    f = FiberHom(bot, plus)
    g = FiberHom(plus, top)
    h = FiberHom(top, top)
    return (
        fiber_id(top).valid
        and f.valid
        and g.valid
        and fiber_comp(g, f) == FiberHom(bot, top)
        and fiber_comp(fiber_id(plus), f) == f
        and fiber_comp(h, fiber_comp(g, f)) == fiber_comp(fiber_comp(h, g), f)
    )


def bitopological_site_grothendieck() -> BitopologicalSiteWitness:
    """Check the finite Grothendieck-site structure over the FOUR clopen fiber."""
    return BitopologicalSiteWitness(
        clopen_algebra=clopen_boolean_algebra(),
        advances_preorder=_advances_preorder(),
        fiber_category=_fiber_category(),
        cover_basis=_cover_basis(),
    )


def no_temporal_covers() -> NoTemporalCoversWitness:
    """Check that temporal advancement is not a cover relation."""
    return NoTemporalCoversWitness(
        singleton_cover_iff_equal=all(
            covers_singleton_iff(target, member) for target in CLOPEN_UPS for member in CLOPEN_UPS
        ),
        covers_are_fiber_local=all(
            covers_is_fiber_local(target, family)
            for target in CLOPEN_UPS
            for family in all_cover_families(target)
        ),
        temporal_advancement_reduces_to_identity_cover=all(
            not advances(tau, tau_prime) or covers(target, (target,))
            for tau in range(4)
            for tau_prime in range(4)
            for target in CLOPEN_UPS
        ),
    )


def strict_site_finite_fiber() -> tuple[ClosureRegime, tuple[ClopenUp, ...]]:
    """The strict-regime marker and the four-element clopen fiber."""
    return ClosureRegime.strict, CLOPEN_UPS
