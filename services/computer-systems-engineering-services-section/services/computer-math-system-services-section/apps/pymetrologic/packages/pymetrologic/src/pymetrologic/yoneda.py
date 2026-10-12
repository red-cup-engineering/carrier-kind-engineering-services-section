"""Finite Yoneda witnesses for the arrows-first reading.

Executable shadow of ``RelMath.Predicating.YonedaArrowsFirst``.  Lean proves
the generic dependent theorem; this module keeps the computational lab finite:

* a small category is explicit route data with identities and composition;
* the representable ``y(X)`` is the bundle of incoming arrows ``Hom(-, X)``;
* Yoneda recovers each sampled hom by evaluating ``y(f)`` at ``id``;
* in the FOUR knowledge-poset category, the object is recovered from its
  incoming-arrow bundle;
* in a discrete predication category, a cell and its converse are distinguished
  by their representables whenever subject and object differ.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Mapping
from dataclasses import dataclass
from typing import cast

from pymetrologic import four

Object = Hashable

__all__ = [
    "Arrow",
    "PredicationCell",
    "SmallCategory",
    "YonedaArrowsFirstWitness",
    "incoming_arrow_bundle",
    "knowledge_presheaf_category",
    "kp_initial_arrow",
    "kp_object_is_its_arrows",
    "kp_terminal_arrow",
    "object_recovered_by_representables",
    "predication_discrete_category",
    "predication_object_is_its_arrows",
    "representable_functoriality",
    "representable_signature",
    "yoneda_arrows_first",
    "yoneda_faithful_on_homs",
    "yoneda_image",
    "yoneda_recovers_homs",
]


@dataclass(frozen=True, slots=True)
class Arrow:
    """A named arrow in a finite small category."""

    name: str
    source: Object
    target: Object


@dataclass(frozen=True, slots=True)
class SmallCategory:
    """A finite small category with explicit identities and composition."""

    objects: tuple[Object, ...]
    arrows: tuple[Arrow, ...]
    identities: Mapping[Object, Arrow]
    composition: Mapping[tuple[Arrow, Arrow], Arrow]

    def __post_init__(self) -> None:
        if len(set(self.objects)) != len(self.objects):
            msg = "duplicate objects"
            raise ValueError(msg)
        if len(set(self.arrows)) != len(self.arrows):
            msg = "duplicate arrows"
            raise ValueError(msg)
        object_set = set(self.objects)
        arrow_set = set(self.arrows)
        for arrow in self.arrows:
            if arrow.source not in object_set or arrow.target not in object_set:
                msg = f"arrow {arrow.name!r} references an unknown object"
                raise ValueError(msg)
        for obj in self.objects:
            identity = self.identities.get(obj)
            if identity not in arrow_set or identity.source != obj or identity.target != obj:
                msg = f"bad identity arrow for {obj!r}"
                raise ValueError(msg)
        for (left, right), result in self.composition.items():
            if left not in arrow_set or right not in arrow_set or result not in arrow_set:
                msg = "composition table references an unknown arrow"
                raise ValueError(msg)
            if left.target != right.source:
                msg = "composition key is not composable"
                raise ValueError(msg)
            if result.source != left.source or result.target != right.target:
                msg = "composition result has the wrong endpoints"
                raise ValueError(msg)

    def identity(self, obj: Object) -> Arrow:
        """The identity arrow at ``obj``."""
        return self.identities[obj]

    def hom(self, source: Object, target: Object) -> tuple[Arrow, ...]:
        """The finite hom-set ``source -> target``."""
        if source not in self.objects or target not in self.objects:
            msg = "hom requested for an object outside the category"
            raise ValueError(msg)
        return tuple(
            arrow for arrow in self.arrows if arrow.source == source and arrow.target == target
        )

    def compose(self, left: Arrow, right: Arrow) -> Arrow:
        """Composition in diagrammatic order: ``left`` then ``right``."""
        if left.target != right.source:
            msg = "composition requires left.target == right.source"
            raise ValueError(msg)
        return self.composition[(left, right)]

    @property
    def identity_laws(self) -> bool:
        """The left and right unit laws hold."""
        return all(
            self.compose(self.identity(arrow.source), arrow) == arrow
            and self.compose(arrow, self.identity(arrow.target)) == arrow
            for arrow in self.arrows
        )

    @property
    def associative(self) -> bool:
        """The associativity law holds for every composable triple."""
        return all(
            self.compose(self.compose(left, mid), right)
            == self.compose(left, self.compose(mid, right))
            for left in self.arrows
            for mid in self.arrows
            for right in self.arrows
            if left.target == mid.source and mid.target == right.source
        )

    @property
    def valid(self) -> bool:
        """The supplied finite data satisfies the category laws."""
        return self.identity_laws and self.associative


@dataclass(frozen=True, slots=True)
class PredicationCell:
    """A predication cell ``phi = (subject, predicate, object)``."""

    subject: str
    predicate: str
    object: str

    def converse(self) -> PredicationCell:
        """The converse predication cell."""
        return PredicationCell(self.object, self.predicate, self.subject)


@dataclass(frozen=True, slots=True)
class YonedaArrowsFirstWitness:
    """Finite witness bundle for ``RelMath.Predicating.YonedaArrowsFirst``."""

    category_laws: bool
    representable_functoriality: bool
    hom_recovery: bool
    full_faithful_on_homs: bool
    object_recovery: bool
    knowledge_initial_terminal: bool
    predication_converse_distinguished: bool

    @property
    def holds(self) -> bool:
        """All finite Yoneda checks hold."""
        return (
            self.category_laws
            and self.representable_functoriality
            and self.hom_recovery
            and self.full_faithful_on_homs
            and self.object_recovery
            and self.knowledge_initial_terminal
            and self.predication_converse_distinguished
        )


def _thin_category(
    objects: tuple[Object, ...],
    leq: Callable[[Object, Object], bool],
    arrow_name: Callable[[Object, Object], str],
) -> SmallCategory:
    arrows = tuple(
        Arrow(arrow_name(source, target), source, target)
        for source in objects
        for target in objects
        if leq(source, target)
    )
    by_pair = {(arrow.source, arrow.target): arrow for arrow in arrows}
    identities = {obj: by_pair[(obj, obj)] for obj in objects}
    composition = {
        (left, right): by_pair[(left.source, right.target)]
        for left in arrows
        for right in arrows
        if left.target == right.source
    }
    return SmallCategory(objects, arrows, identities, composition)


def knowledge_presheaf_category() -> SmallCategory:
    """The thin FOUR knowledge-poset category used by the Lean instance."""
    bl = four()
    charge_by_name = {
        "none": bl.none,
        "true": bl.true,
        "false": bl.false,
        "conflict": bl.conflict,
    }
    objects = tuple(charge_by_name)
    return _thin_category(
        objects,
        lambda left, right: bl.leq_k(
            charge_by_name[cast(str, left)],
            charge_by_name[cast(str, right)],
        ),
        lambda left, right: f"{left}<={right}",
    )


def predication_discrete_category(cells: tuple[PredicationCell, ...]) -> SmallCategory:
    """The discrete predication category on finite cell objects."""
    return _thin_category(
        cells,
        lambda left, right: left == right,
        lambda left, _right: (
            f"id({cast(PredicationCell, left).subject},"
            f"{cast(PredicationCell, left).predicate},"
            f"{cast(PredicationCell, left).object})"
        ),
    )


def incoming_arrow_bundle(
    category: SmallCategory,
    target: Object,
) -> Mapping[Object, tuple[Arrow, ...]]:
    """The representable presheaf ``y(target) = Hom(-, target)``."""
    return {source: category.hom(source, target) for source in category.objects}


def representable_signature(
    category: SmallCategory,
    target: Object,
) -> tuple[tuple[Object, tuple[str, ...]], ...]:
    """A stable finite signature for ``y(target)``."""
    return tuple(
        (source, tuple(arrow.name for arrow in category.hom(source, target)))
        for source in category.objects
    )


def representable_functoriality(category: SmallCategory, target: Object) -> bool:
    """Check the identity and precomposition laws for ``y(target)``."""
    identity_ok = all(
        category.compose(category.identity(source), arrow) == arrow
        for source in category.objects
        for arrow in category.hom(source, target)
    )
    comp_ok = all(
        category.compose(category.compose(left, mid), arrow)
        == category.compose(left, category.compose(mid, arrow))
        for left in category.arrows
        for mid in category.arrows
        for arrow in category.hom(mid.target, target)
        if left.target == mid.source
    )
    return identity_ok and comp_ok


def yoneda_image(
    category: SmallCategory,
    arrow: Arrow,
) -> tuple[tuple[Object, tuple[tuple[str, str], ...]], ...]:
    """The natural transformation ``y(arrow)`` as postcomposition tables."""
    return tuple(
        (
            source,
            tuple(
                (incoming.name, category.compose(incoming, arrow).name)
                for incoming in category.hom(source, arrow.source)
            ),
        )
        for source in category.objects
    )


def yoneda_recovers_homs(category: SmallCategory) -> bool:
    """Evaluate ``y(f)`` at ``id`` and recover each finite arrow ``f``."""
    return all(
        category.compose(category.identity(arrow.source), arrow) == arrow
        for arrow in category.arrows
    )


def yoneda_faithful_on_homs(category: SmallCategory) -> bool:
    """Equal Yoneda images imply equal arrows on the supplied finite homs."""
    return all(
        left == right or yoneda_image(category, left) != yoneda_image(category, right)
        for source in category.objects
        for target in category.objects
        for left in category.hom(source, target)
        for right in category.hom(source, target)
    )


def object_recovered_by_representables(category: SmallCategory) -> bool:
    """Equal representable signatures imply equal objects."""
    return all(
        left == right
        or representable_signature(category, left) != representable_signature(category, right)
        for left in category.objects
        for right in category.objects
    )


def kp_initial_arrow(target: Object) -> Arrow:
    """The unique arrow from knowledge-bottom ``none`` to ``target``."""
    return knowledge_presheaf_category().hom("none", target)[0]


def kp_terminal_arrow(source: Object) -> Arrow:
    """The unique arrow from ``source`` to knowledge-top ``conflict``."""
    return knowledge_presheaf_category().hom(source, "conflict")[0]


def kp_object_is_its_arrows() -> bool:
    """In the FOUR knowledge category, each object is recovered from ``Hom(-, X)``."""
    return object_recovered_by_representables(knowledge_presheaf_category())


def predication_object_is_its_arrows(cell: PredicationCell) -> bool:
    """A non-symmetric predication cell is distinguished from its converse by arrows."""
    converse = cell.converse()
    if cell == converse:
        return True
    category = predication_discrete_category((cell, converse))
    return cell.subject == cell.object or representable_signature(
        category, cell
    ) != representable_signature(category, converse)


def yoneda_arrows_first() -> YonedaArrowsFirstWitness:
    """Bundle the finite Yoneda arrows-first checks used by the lab."""
    knowledge = knowledge_presheaf_category()
    cell = PredicationCell("alice", "trusts", "bob")
    predication = predication_discrete_category((cell, cell.converse()))
    return YonedaArrowsFirstWitness(
        category_laws=knowledge.valid and predication.valid,
        representable_functoriality=all(
            representable_functoriality(category, target)
            for category in (knowledge, predication)
            for target in category.objects
        ),
        hom_recovery=yoneda_recovers_homs(knowledge) and yoneda_recovers_homs(predication),
        full_faithful_on_homs=yoneda_faithful_on_homs(knowledge)
        and yoneda_faithful_on_homs(predication),
        object_recovery=kp_object_is_its_arrows()
        and object_recovered_by_representables(predication),
        knowledge_initial_terminal=all(
            kp_initial_arrow(target).source == "none"
            and kp_initial_arrow(target).target == target
            and kp_terminal_arrow(source).source == source
            and kp_terminal_arrow(source).target == "conflict"
            for target in knowledge.objects
            for source in knowledge.objects
        ),
        predication_converse_distinguished=predication_object_is_its_arrows(cell),
    )
