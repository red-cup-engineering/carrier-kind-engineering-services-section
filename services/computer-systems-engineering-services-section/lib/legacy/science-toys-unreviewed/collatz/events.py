# RITM core (local-fibre δ, field induced from one arrow)
# One event per call; no stabilization because δ always has another lift.
from typing import Dict, Set, Tuple, Optional

Node = Tuple[int, int]   # (identity, local_level)
YAdj = Dict[Node, Set[Node]]
RRel = Dict[Node, Set[Node]]
YEvent = Tuple[Node, Node]
REvent = Tuple[Node, Node]

# ---------- basic ops ----------
def add_Y(Y: YAdj, i: Node, j: Node) -> bool:
    if i not in Y: Y[i] = set()
    if j not in Y: Y.setdefault(j, set())
    if j in Y[i]: return False
    Y[i].add(j)
    return True

def add_R(R: RRel, x: Node, z: Node) -> bool:
    if x not in R: R[x] = set()
    if z in R[x]: return False
    R[x].add(z)
    return True

def nodeset(Y: YAdj) -> Set[Node]:
    return set(Y.keys()) | set().union(*Y.values() or [set()])

def transpose_Y(Y: YAdj) -> YAdj:
    T: YAdj = {}
    for i, js in Y.items():
        for j in js:
            T.setdefault(j, set()).add(i)
    for k in list(T): T.setdefault(k, set())
    return T

# ---------- □ and ◇ (one consequence) ----------
def find_box_consequence(Y: YAdj) -> Optional[YEvent]:
    ns = sorted(nodeset(Y))
    # B2 reflexivity
    for i in ns:
        if i not in Y or i not in Y[i]:
            return (i, i)
    # B1 transitivity: i->k & k->j ⇒ i->j
    for i in ns:
        for k in sorted(Y.get(i, ())):
            for j in sorted(Y.get(k, ())):
                if j not in Y.get(i, ()):
                    return (i, j)
    return None

def find_diamond_consequence(Y: YAdj) -> Optional[YEvent]:
    T = transpose_Y(Y)
    ns = sorted(nodeset(T))
    # D2 on transpose: a->a (mirrors to same in Y)
    for a in ns:
        if a not in T or a not in T[a]:
            return (a, a)
    # D1 on transpose: j->k & k->i ⇒ j->i (mirrors to Y: i->j)
    for j in ns:
        for k in sorted(T.get(j, ())):
            for i in sorted(T.get(k, ())):
                if j not in T.get(i, ()):
                    return (i, j)
    return None

def find_C_consequence(Y: YAdj) -> Optional[YEvent]:
    c = find_diamond_consequence(Y)
    if c is not None: return c
    return find_box_consequence(Y)

# ---------- δ-lift (local-fibre) ----------
def find_delta_lift(Y: YAdj) -> Optional[YEvent]:
    """
    Local-fibre δ: for any edge i->j, lift the TARGET j within its own fibre:
      i -> (j_id, j_lvl+1)
    (No requirement that i and j share a level; this respects local fibres.)
    Deterministic: scan edges in sorted order; return first missing lift-edge.
    """
    ns = sorted(nodeset(Y))
    for i in ns:
        for j in sorted(Y.get(i, ())):
            j_id, j_lvl = j
            lifted = (j_id, j_lvl + 1)
            if lifted not in Y.get(i, ()):
                return (i, lifted)
    # If there are nodes but no edges to lift, create a reflexive lift of each node
    for i in ns:
        i_id, i_lvl = i
        lifted = (i_id, i_lvl + 1)
        if lifted not in Y.get(i, ()):
            return (i, lifted)
    return None

# ---------- couplings (RC, RT) ----------
def propagate_R_over_edge(R: RRel, edge_yz: YEvent) -> Optional[REvent]:
    """
    RC: if (x ~> y) in R and (y -> z) in Y, then add (x ~> z) in R.
    Deterministic: smallest x first.
    """
    y, z = edge_yz
    for x in sorted(R.keys()):
        if y in R[x] and z not in R[x]:
            return (x, z)
    return None

def imprint_from_R_row(Y: YAdj, row: Set[Node]) -> Optional[YEvent]:
    """
    RT: for a given row {y1, y2, ...} in R, add all y_p -> y_q in Y (clique).
    Return the next missing clique edge deterministically.
    """
    ys = sorted(row)
    for y in ys:
        for z in ys:
            if z not in Y.get(y, ()):
                return (y, z)
    return None

# ---------- one event per call ----------
def step_event(R: RRel, Y: YAdj, prefer: str = "Cδ") -> Optional[Tuple[str, Node, Node, str]]:
    """
    Apply exactly one event:
      - try C = □∘◇ on Y (◇ before □), then RC coupling
      - try RT imprint from RᵀR (and RC after that)
      - finally δ (local fibre) and RC after that
    Returns ("Y", i, j, src) or ("R", x, z, "RC").
    """
    # 1) C = □∘◇
    if prefer.startswith("C"):
        yevt = find_C_consequence(Y)
        if yevt is not None:
            i, j = yevt
            tag = "◇" if find_diamond_consequence(Y) == yevt else "□"
            if add_Y(Y, i, j):
                revt = propagate_R_over_edge(R, (i, j))
                if revt is not None:
                    x, z = revt; add_R(R, x, z); return ("R", x, z, "RC")
                return ("Y", i, j, tag)

    # 2) RT imprint
    for x in sorted(R.keys()):
        yevt = imprint_from_R_row(Y, R[x])
        if yevt is not None:
            i, j = yevt
            if add_Y(Y, i, j):
                revt = propagate_R_over_edge(R, (i, j))
                if revt is not None:
                    x2, z2 = revt; add_R(R, x2, z2); return ("R", x2, z2, "RC")
                return ("Y", i, j, "RT")

    # 3) δ (local)
    if "δ" in prefer:
        yevt = find_delta_lift(Y)
        if yevt is not None:
            i, j = yevt
            if add_Y(Y, i, j):
                revt = propagate_R_over_edge(R, (i, j))
                if revt is not None:
                    x, z = revt; add_R(R, x, z); return ("R", x, z, "RC")
                return ("Y", i, j, "δ")

    return None

# ---------- minimal seeding: “start the one arrow” ----------
def seed_one_arrow(a_id: int, b_id: int) -> Tuple[YAdj, RRel]:
    """
    Start the entire world from exactly one arrow on the base:
      Y: (a,0) -> (b,0) plus reflexives
      R: (a,0) ~> (b,0)  (field induced by that same first arrow)
    This is the ‘first relation’; everything else will be its lifts/closures.
    """
    a0 = (a_id, 0); b0 = (b_id, 0)
    Y: YAdj = {}
    add_Y(Y, a0, a0)  # reflexives so □/◇ have identities
    add_Y(Y, b0, b0)
    add_Y(Y, a0, b0)  # the one spatial arrow
    R: RRel = {}
    add_R(R, a0, b0)  # induce field from that same arrow
    return Y, R

# ---------- demo ----------
if __name__ == "__main__":
    # Begin from a single arrow: identity 0 → identity 1 at base level.
    Y, R = seed_one_arrow(a_id=0, b_id=1)

    print("--- first 40 events (δ ensures non-stabilization) ---")
    for k in range(40):
        ev = step_event(R, Y, prefer="Cδ")
        if ev is None:
            print("No event (δ disabled?)"); break
        kind, a, b, src = ev
        print(f"{k:02d}: {kind} {a}->{b} [{src}]")
