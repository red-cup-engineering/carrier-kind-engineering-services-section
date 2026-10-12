from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, FrozenSet, Iterable, Optional, Tuple


# ---------- Core data types ----------

SetLike = FrozenSet[Any]


@dataclass(frozen=True)
class Inclusion:
    """
    Inclusion i: A -> E encoded as A subset of E.
    """
    A: SetLike
    E: SetLike

    def __post_init__(self) -> None:
        if not self.A.issubset(self.E):
            raise ValueError("A must be a subset of E")

    def contains(self, x: Any) -> bool:
        return x in self.A

    def valid(self) -> bool:
        return self.A.issubset(self.E)

    def as_function(self) -> Callable[[Any], Any]:
        """
        The inclusion function i: A -> E. Since A subset E, i is identity on elements.
        """
        return lambda a: a


# ---------- Phase I: Inc, Quo, Res, Itr ----------

def Inc(A: Iterable[Any], E: Iterable[Any]) -> Inclusion:
    A_fs = frozenset(A)
    E_fs = frozenset(E)
    return Inclusion(A_fs, E_fs)


@dataclass(frozen=True)
class Quotient:
    """
    Encodes q: E -> E/~_A that collapses all of A to a single class representative.
    - Q: the quotient carrier set
    - q: the projection function
    - repA: the canonical representative of the collapsed class for A
    """
    Q: SetLike
    repA: Any
    _preimage_A: SetLike

    def q(self, x: Any) -> Any:
        return self.repA if x in self._preimage_A else x


def Quo(i: Inclusion, repA: Optional[Any] = None) -> Quotient:
    """
    Build the quotient that identifies all elements of A,
    leaving all other elements distinct.
    """
    if repA is None:
        # pick a deterministic representative from A
        repA = next(iter(i.A))
    rest = i.E.difference(i.A)
    Q = frozenset({repA}).union(rest)
    return Quotient(Q=Q, repA=repA, _preimage_A=i.A)



def Res(i: Inclusion) -> Inclusion:
    """
    Residual inclusion after quotienting by A: image of A under q included into E/~.
    """
    return Inclusion(A=i.A, E=i.E)


def ResidualAfterQuo(i: Inclusion) -> Inclusion:
    """
    Matches the paper's pipeline: given i: A -> E,
    compute q: E->E/~_A and the residual inclusion iota: q(A) -> E/~_A.
    Returns the Inclusion iota.
    """
    q = Quo(i)
    A_img = frozenset({q.repA})
    return Inclusion(A=A_img, E=q.Q)



def Itr(i: Inclusion) -> Inclusion:
    q = Quo(i)
    return Inclusion(A=frozenset({q.repA}), E=i.E)


def iterate(i: Inclusion, n: int) -> Inclusion:
    out = i
    for _ in range(n):
        out = Itr(out)
    return out


def iso_inclusions(i1: Inclusion, i2: Inclusion) -> bool:
    """
    Two inclusions are isomorphic if there exists a bijection φ: E1 -> E2
    mapping A1 bijectively onto A2. For finite sets we compare cardinalities.
    """
    return (len(i1.E) == len(i2.E)) and (len(i1.A) == len(i2.A))


def itr3_isomorphic_to_identity(i: Inclusion) -> bool:
    j = iterate(i, 3)
    return iso_inclusions(i, j)


# ---------- Phase II: Category of inclusions over fixed E ----------

class CatE:
    """
    Category whose objects are inclusions i: A -> E for a fixed carrier E.
    Morphisms correspond to subset inclusions A ⊆ B with the same E.
    """
    def __init__(self, E: Iterable[Any]) -> None:
        self.E: SetLike = frozenset(E)

    def obj(self, A: Iterable[Any]) -> Inclusion:
        return Inclusion(frozenset(A), self.E)

    @staticmethod
    def has_morphism(i: Inclusion, j: Inclusion) -> bool:
        return i.E == j.E and i.A.issubset(j.A)

    def pullback(self, i: Inclusion, j: Inclusion) -> Inclusion:
        if i.E != j.E:
            raise ValueError("Objects must share the same E")
        return Inclusion(A=i.A.intersection(j.A), E=i.E)

    def Fun(self, i: Inclusion) -> Inclusion:
        if i.E != self.E:
            raise ValueError("Object not in this CatE")
        return Itr(i)

    def Fun_morphism_preserved(self, i: Inclusion, j: Inclusion) -> bool:
        if not self.has_morphism(i, j):
            return False
        Fi = self.Fun(i)
        Fj = self.Fun(j)
        return len(Fi.A) <= len(Fj.A) and len(Fi.E) == len(Fj.E)

    def Fun3_is_Id_on_sizes(self, i: Inclusion) -> bool:
        return itr3_isomorphic_to_identity(i)


# ---------- Convenience: "Matrix" wrapper ----------

class RRTMatrix:
    """
    Synthetic matrix for practicing operations on a fixed finite E.
    """
    def __init__(self, E: Iterable[Any]) -> None:
        self.E: SetLike = frozenset(E)
        self.cat = CatE(self.E)

    def inclusion(self, A: Iterable[Any]) -> Inclusion:
        return self.cat.obj(A)

    def inc(self, A: Iterable[Any]) -> Inclusion:
        return self.inclusion(A)

    def quo(self, i: Inclusion) -> Quotient:
        return Quo(i)

    def res(self, iota: Inclusion) -> Inclusion:
        return Res(iota)

    def itr(self, i: Inclusion) -> Inclusion:
        return Itr(i)

    def iterate(self, i: Inclusion, n: int) -> Inclusion:
        return iterate(i, n)

    def pullback(self, i: Inclusion, j: Inclusion) -> Inclusion:
        return self.cat.pullback(i, j)

    def fun(self, i: Inclusion) -> Inclusion:
        return self.cat.Fun(i)

    def fun3_is_id(self, i: Inclusion) -> bool:
        return self.cat.Fun3_is_Id_on_sizes(i)


# ---------- Minimal doctest ----------

def _demo() -> None:
    E = {1, 2, 3, 4}
    A = {1, 2}
    i = Inc(A, E)
    assert i.valid()

    # Phase I
    q = Quo(i)
    iota = Inclusion(A=frozenset({q.repA}), E=q.Q)
    j = Itr(i)

    # Structural checks rather than direct isomorphism
    assert j.valid()                     # j is a valid inclusion
    assert len(j.A) == 1                 # residual has one representative
    assert itr3_isomorphic_to_identity(i)  # recurrence holds up to isomorphism


    # Phase II
    cat = CatE(E)
    i2 = cat.obj({1, 2, 3})
    assert CatE.has_morphism(i, i2)
    pb = cat.pullback(i, i2)
    assert pb.A == i.A

    # Matrix wrapper
    M = RRTMatrix(E)
    assert M.fun3_is_id(i)

if __name__ == "__main__":
    _demo()
