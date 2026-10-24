"""Finite-model falsification harness for Regime-Lift K1 componentwise diamond lifts.

This is computational evidence over small finite strict partial orders, not a Lean proof.
It exists to keep the open K1 formalization falsifiable while the Lean execution path is
unavailable to this actor.
"""
from __future__ import annotations
from dataclasses import dataclass
from itertools import combinations, product
import random

@dataclass(frozen=True)
class FiniteCausalSet:
    n: int
    listed: frozenset[int]
    reaches: frozenset[tuple[int,int]]

    def validate(self) -> "FiniteCausalSet":
        if self.n < 1:
            raise ValueError("n must be >= 1")
        universe=set(range(self.n))
        if not self.listed <= universe:
            raise ValueError("listed events must lie in universe")
        for a,b in self.reaches:
            if a not in universe or b not in universe or a == b:
                raise ValueError("reaches must be irreflexive and internal")
        for a,b in self.reaches:
            for c,d in self.reaches:
                if b == c and (a,d) not in self.reaches:
                    raise ValueError("reaches must be transitive")
        return self

    def lt(self,a:int,b:int)->bool:
        return (a,b) in self.reaches

    def leq(self,a:int,b:int)->bool:
        return a==b or self.lt(a,b)

    def diamonds(self)->tuple[tuple[int,int],...]:
        self.validate()
        return tuple(sorted((a,b) for (a,b) in self.reaches if a in self.listed and b in self.listed))


def k_admissible(f: tuple[int,...], C: FiniteCausalSet, D: FiniteCausalSet) -> bool:
    C.validate(); D.validate()
    if len(f) != C.n or any(x < 0 or x >= D.n for x in f):
        raise ValueError("map has wrong domain/codomain")
    return all(f[a] in D.listed and f[b] in D.listed and D.lt(f[a],f[b]) for a,b in C.diamonds())


def componentwise_lift(f: tuple[int,...], C: FiniteCausalSet, D: FiniteCausalSet):
    if not k_admissible(f,C,D):
        return None
    return tuple((f[a],f[b]) for a,b in C.diamonds())


def preserves_sequencing(f: tuple[int,...], C: FiniteCausalSet, D: FiniteCausalSet) -> bool:
    if not k_admissible(f,C,D):
        return False
    src=C.diamonds()
    for p in src:
        for q in src:
            if C.leq(p[1],q[0]) and not D.leq(f[p[1]],f[q[0]]):
                return False
    return True


def causal_monotone_on_listed(f: tuple[int,...], C: FiniteCausalSet, D: FiniteCausalSet) -> bool:
    C.validate(); D.validate()
    if len(f)!=C.n or any(x<0 or x>=D.n for x in f):
        raise ValueError("map has wrong domain/codomain")
    if any(f[x] not in D.listed for x in C.listed):
        return False
    for a in C.listed:
        for b in C.listed:
            if C.leq(a,b) and not D.leq(f[a],f[b]):
                return False
    return True


def strict_partial_orders(n:int):
    pairs=[(a,b) for a in range(n) for b in range(n) if a!=b]
    for mask in range(1<<len(pairs)):
        rel=frozenset(pairs[i] for i in range(len(pairs)) if mask & (1<<i))
        ok=True
        for a,b in rel:
            if (b,a) in rel:
                ok=False; break
        if not ok: continue
        for a,b in rel:
            for c,d in rel:
                if b==c and (a,d) not in rel:
                    ok=False; break
            if not ok: break
        if ok:
            yield rel


def structures(n:int):
    universe=range(n)
    for rel in strict_partial_orders(n):
        for mask in range(1,1<<n):
            listed=frozenset(i for i in universe if mask & (1<<i))
            yield FiniteCausalSet(n,listed,rel)


def exhaustive_summary(max_n:int=3)->dict:
    if max_n < 1 or max_n > 3:
        raise ValueError("bounded checker currently supports 1 <= max_n <= 3")
    structs={n:list(structures(n)) for n in range(1,max_n+1)}
    maps_tested=k_maps=sequence_failures=monotone_not_k=0
    first_collapse=None
    for ns in range(1,max_n+1):
        for nt in range(1,max_n+1):
            for C in structs[ns]:
                for D in structs[nt]:
                    for f in product(range(nt), repeat=ns):
                        maps_tested+=1
                        ka=k_admissible(f,C,D)
                        if ka:
                            k_maps+=1
                            if not preserves_sequencing(f,C,D):
                                sequence_failures+=1
                        mono=causal_monotone_on_listed(f,C,D)
                        if mono and not ka and C.diamonds():
                            monotone_not_k+=1
                            if first_collapse is None:
                                first_collapse=(C,D,f)
    return {
        "max_n":max_n,
        "structures":sum(len(v) for v in structs.values()),
        "maps_tested":maps_tested,
        "k_admissible_maps":k_maps,
        "sequencing_failures":sequence_failures,
        "monotone_not_k":monotone_not_k,
        "found_collapse_counterexample":first_collapse is not None,
    }


def _random_strict_partial_order(n: int, rng: random.Random, edge_probability: float = 0.35) -> frozenset[tuple[int,int]]:
    """Sample an acyclic relation, then take its transitive closure.

    This is a falsification sampler, not a uniform sampler over finite posets.
    """
    if n < 1:
        raise ValueError("n must be >= 1")
    if not 0.0 <= edge_probability <= 1.0:
        raise ValueError("edge_probability must lie in [0,1]")
    order=list(range(n)); rng.shuffle(order)
    rank={x:i for i,x in enumerate(order)}
    rel={(a,b) for a in range(n) for b in range(n) if rank[a] < rank[b] and rng.random() < edge_probability}
    changed=True
    while changed:
        changed=False
        add=set()
        for a,b in rel:
            for c,d in rel:
                if b == c and (a,d) not in rel:
                    add.add((a,d))
        if add:
            rel |= add; changed=True
    return frozenset(rel)


def randomized_summary(n: int = 4, trials: int = 10000, seed: int = 0) -> dict:
    """Deterministic randomized falsification beyond the exhaustive n<=3 envelope.

    The generator is deliberately non-uniform. Its purpose is to seek implementation/theorem
    counterexamples on larger finite structures while preserving a replayable seed and trial count.
    """
    if isinstance(n,bool) or not isinstance(n,int) or n < 2:
        raise ValueError("n must be integer >= 2")
    if isinstance(trials,bool) or not isinstance(trials,int) or trials < 1:
        raise ValueError("trials must be positive integer")
    if isinstance(seed,bool) or not isinstance(seed,int):
        raise ValueError("seed must be integer")
    rng=random.Random(seed)
    k_maps=sequence_failures=monotone_not_k=source_diamond_trials=0
    for _ in range(trials):
        C=FiniteCausalSet(n, frozenset(i for i in range(n) if rng.random()<0.75), _random_strict_partial_order(n,rng))
        D=FiniteCausalSet(n, frozenset(i for i in range(n) if rng.random()<0.75), _random_strict_partial_order(n,rng))
        if not C.listed:
            C=FiniteCausalSet(n,frozenset({rng.randrange(n)}),C.reaches)
        if not D.listed:
            D=FiniteCausalSet(n,frozenset({rng.randrange(n)}),D.reaches)
        f=tuple(rng.randrange(n) for _ in range(n))
        has_diamond=bool(C.diamonds())
        source_diamond_trials += int(has_diamond)
        ka=k_admissible(f,C,D)
        if ka:
            k_maps += 1
            sequence_failures += int(not preserves_sequencing(f,C,D))
        if has_diamond and causal_monotone_on_listed(f,C,D) and not ka:
            monotone_not_k += 1
    return {
        "n":n,"trials":trials,"seed":seed,"source_diamond_trials":source_diamond_trials,
        "k_admissible_maps":k_maps,"sequencing_failures":sequence_failures,"monotone_not_k":monotone_not_k,
        "sampler":"random-linear-extension-edge-closure-v1",
    }


def boundary_mutation_summary(
    n: int = 5, seed_maps: int = 1000, seed: int = 0, max_seed_attempts: int = 200
) -> dict:
    """Target the local boundary of K-admissibility instead of sampling arbitrary maps only.

    For each trial this sampler first searches deterministically-from-seed for a random
    K-admissible map between random finite causal structures with at least one source diamond.
    It then mutates each image coordinate to every other target node and tests every neighboring
    map that remains K-admissible. This concentrates falsification effort around admissibility
    boundaries where implementation/theorem mistakes are more likely to appear.

    The sampler is replayable and non-uniform. It is falsification evidence, not proof.
    """
    if isinstance(n,bool) or not isinstance(n,int) or n < 2:
        raise ValueError("n must be integer >= 2")
    if isinstance(seed_maps,bool) or not isinstance(seed_maps,int) or seed_maps < 1:
        raise ValueError("seed_maps must be positive integer")
    if isinstance(seed,bool) or not isinstance(seed,int):
        raise ValueError("seed must be integer")
    if isinstance(max_seed_attempts,bool) or not isinstance(max_seed_attempts,int) or max_seed_attempts < 1:
        raise ValueError("max_seed_attempts must be positive integer")
    rng=random.Random(seed)
    accepted_seeds=seed_search_failures=neighbor_maps=admissible_neighbors=sequence_failures=0
    first_failure=None
    for _ in range(seed_maps):
        C=D=f=None
        for _attempt in range(max_seed_attempts):
            c=FiniteCausalSet(n, frozenset(i for i in range(n) if rng.random()<0.8), _random_strict_partial_order(n,rng))
            d=FiniteCausalSet(n, frozenset(i for i in range(n) if rng.random()<0.8), _random_strict_partial_order(n,rng))
            if not c.listed:
                c=FiniteCausalSet(n,frozenset({rng.randrange(n)}),c.reaches)
            if not d.listed:
                d=FiniteCausalSet(n,frozenset({rng.randrange(n)}),d.reaches)
            if not c.diamonds():
                continue
            candidate=tuple(rng.randrange(n) for _ in range(n))
            if k_admissible(candidate,c,d):
                C,D,f=c,d,candidate
                break
        if f is None:
            seed_search_failures += 1
            continue
        accepted_seeds += 1
        if not preserves_sequencing(f,C,D):
            sequence_failures += 1
            if first_failure is None:
                first_failure=(C,D,f)
        for i in range(n):
            for y in range(n):
                if y == f[i]:
                    continue
                g=list(f); g[i]=y; g=tuple(g)
                neighbor_maps += 1
                if not k_admissible(g,C,D):
                    continue
                admissible_neighbors += 1
                if not preserves_sequencing(g,C,D):
                    sequence_failures += 1
                    if first_failure is None:
                        first_failure=(C,D,g)
    return {
        "n":n,
        "seed_maps_requested":seed_maps,
        "seed":seed,
        "max_seed_attempts":max_seed_attempts,
        "accepted_seed_maps":accepted_seeds,
        "seed_search_failures":seed_search_failures,
        "neighbor_maps_tested":neighbor_maps,
        "k_admissible_neighbors":admissible_neighbors,
        "sequencing_failures":sequence_failures,
        "found_failure":first_failure is not None,
        "sampler":"k-admissible-local-coordinate-boundary-v1",
    }