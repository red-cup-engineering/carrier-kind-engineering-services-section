"""Recursive articulating spine from ``RelMath.Articulating``."""

from __future__ import annotations

from dataclasses import dataclass

from .articulating_primitives import Mark, Utterance

__all__ = [
    "Articulating",
    "ArticulatingRecursionWitness",
    "articulating_depth",
    "articulating_floor",
    "articulating_floor_utter",
    "articulating_head",
    "articulating_pair",
    "articulating_path",
    "articulating_recursion_witness",
    "articulating_utter",
    "articulating_utter_ne_pair",
    "sample_articulating",
]


@dataclass(frozen=True, slots=True)
class Articulating:
    """A finite one-way articulation: an utterance, optionally followed by more."""

    utterance: Utterance
    tail: Articulating | None = None

    @classmethod
    def utter(cls, utterance: Utterance) -> Articulating:
        """Lean's ``Articulating.utter`` constructor."""

        return cls(utterance=utterance)

    @classmethod
    def pair(cls, utterance: Utterance, articulating: Articulating) -> Articulating:
        """Lean's ``Articulating.pair`` constructor."""

        return cls(utterance=utterance, tail=articulating)

    @property
    def is_utter(self) -> bool:
        """Whether this node was built by the leaf constructor."""

        return self.tail is None

    @property
    def is_pair(self) -> bool:
        """Whether this node was built by the pair constructor."""

        return self.tail is not None


@dataclass(frozen=True, slots=True)
class ArticulatingRecursionWitness:
    """Executable witness for the recursive ``Articulating`` laws."""

    head_is_outer: bool
    depth: int
    floor_is_inner_leaf: bool
    floor_utter: bool
    utter_ne_pair: bool
    path_length: int

    @property
    def holds(self) -> bool:
        """All recursive articulating checks hold."""

        return (
            self.head_is_outer
            and self.depth == 2
            and self.floor_is_inner_leaf
            and self.floor_utter
            and self.utter_ne_pair
            and self.path_length == self.depth + 1
        )


def articulating_utter(utterance: Utterance) -> Articulating:
    """Build a leaf articulation."""

    return Articulating.utter(utterance)


def articulating_pair(utterance: Utterance, articulating: Articulating) -> Articulating:
    """Build an outer utterance paired with an existing articulation."""

    return Articulating.pair(utterance, articulating)


def articulating_head(articulating: Articulating) -> Utterance:
    """Return the outermost utterance."""

    return articulating.utterance


def articulating_depth(articulating: Articulating) -> int:
    """Count pair constructors above the innermost utterance."""

    if articulating.tail is None:
        return 0
    return 1 + articulating_depth(articulating.tail)


def articulating_floor(articulating: Articulating) -> Utterance:
    """Return the innermost utterance."""

    if articulating.tail is None:
        return articulating.utterance
    return articulating_floor(articulating.tail)


def articulating_path(articulating: Articulating) -> tuple[Utterance, ...]:
    """List utterances from outer head to inner floor."""

    if articulating.tail is None:
        return (articulating.utterance,)
    return (articulating.utterance, *articulating_path(articulating.tail))


def articulating_floor_utter(utterance: Utterance) -> bool:
    """Lean's ``floor_utter`` theorem as an executable check."""

    return articulating_floor(articulating_utter(utterance)) == utterance


def articulating_utter_ne_pair(
    utterance: Utterance,
    outer: Utterance,
    tail: Articulating,
) -> bool:
    """Check Lean's constructor separation ``utter_ne_pair``."""

    return articulating_utter(utterance) != articulating_pair(outer, tail)


def sample_articulating() -> Articulating:
    """A small depth-two articulation used by notebooks and witnesses."""

    inner = Utterance(Mark("token:inner"), Mark("claim:inner"))
    middle = Utterance(Mark("token:middle"), Mark("claim:middle"))
    outer = Utterance(Mark("token:outer"), Mark("claim:outer"))
    return articulating_pair(
        outer,
        articulating_pair(
            middle,
            articulating_utter(inner),
        ),
    )


def articulating_recursion_witness() -> ArticulatingRecursionWitness:
    """Bundle the recursive base morphism checks inherited from Lean."""

    articulating = sample_articulating()
    path = articulating_path(articulating)
    inner = path[-1]
    return ArticulatingRecursionWitness(
        head_is_outer=articulating_head(articulating) == path[0],
        depth=articulating_depth(articulating),
        floor_is_inner_leaf=articulating_floor(articulating) == inner,
        floor_utter=articulating_floor_utter(inner),
        utter_ne_pair=articulating_utter_ne_pair(inner, path[1], articulating_utter(inner)),
        path_length=len(path),
    )
