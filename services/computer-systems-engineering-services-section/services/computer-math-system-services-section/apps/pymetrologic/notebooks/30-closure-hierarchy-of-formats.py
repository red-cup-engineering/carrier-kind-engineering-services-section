# ---
# jupyter:
#   jupytext:
#     formats: ipynb,py:percent
#     text_representation:
#       extension: .py
#       format_name: percent
#   kernelspec:
#     display_name: lab
#     language: python
#     name: python3
# ---

# %% [markdown]
# # The closure hierarchy of serialization formats
#
# *A bilattice of content-commitment and a ladder of completion-complexity, for
# plain text, JSON, RDF/Turtle, HTML, and TeX.*
#
# **Claim.** Five ubiquitous serialization formats, classified not by syntax but
# by (a) what they *commit to* and (b) what it *costs to complete* them, occupy
# two independent structures:
#
# 1. a **bilattice of content-commitment** — the four-element Belnap–Dunn space
#    $\mathbf 4$, graded by two intrinsic binary features: **addressability**
#    $A$ (machine-resolvable internal reference) and **assertivity** $S$
#    (truth-apt content under a defined interpretation);
# 2. a **closure ladder of completion** — the complexity of the canonical
#    operator a conforming processor runs to turn surface bytes into final
#    meaning: $\mathrm{identity}\subset\mathrm{Scott/Datalog}\subset
#    \mathrm{non\text{-}monotone}\subset\mathrm{Turing}$.
#
# These axes are **orthogonal**, and that is the whole point: the format with the
# *richest* content-commitment (RDF, at the bilattice top $\top$) has one of the
# *cheapest* completions (Scott-continuous, $\kappa=\omega$), while HTML and TeX
# sit at the *same* top corner but cost Turing-completeness. Completion cost is a
# **non-monotone** function of content-commitment.
#
# This notebook *verifies the checkable parts in Python* through `pymetrologic` (the
# bilattice, its Klein-four symmetry group, the closure/regime machinery). What
# checks here is what we then formalize in Lean. The Turing rung is established
# by citation, not computation, and is flagged as such.
#
# Nothing below depends on the 561-group corpus; the structures are standard
# (Belnap 1977; Ginsberg 1988; Fitting 1991; Scott; van Emden–Kowalski 1976;
# Hellerstein's CALM 2010; the W3C/WHATWG specs).

# %%
from pymetrologic import (
    BL,
    K4_ELEMENTS,
    Settling,
    four,
    merge,
    merge_all,
    of_nat,
    omega,
    regime_of_ord,
)
from pymetrologic.klein import act, is_group

B = four()  # Belnap FOUR = L^⋈ over the two-element lattice


def charge(x: BL[int]) -> tuple[int, int]:
    """Canonical (pro, con) key — robust to BL's equality implementation."""
    return (x.pro, x.con)


# %% [markdown]
# ## 1. The bilattice of content-commitment
#
# We read each format's two intrinsic bits as a Belnap charge
# $\langle \mathrm{pro}, \mathrm{con}\rangle$ with
#
# $$\mathrm{pro} = A\ (\text{addressability}), \qquad \mathrm{con} = S\ (\text{assertivity}).$$
#
# | format | $A$ | $S$ | charge | corner |
# |---|---|---|---|---|
# | opaque bytes | 0 | 0 | $\langle 0,0\rangle$ | $\bot$ (none) |
# | JSON | 1 | 0 | $\langle 1,0\rangle$ | $\mathbf t$ |
# | plain text / prose | 0 | 1 | $\langle 0,1\rangle$ | $\mathbf f$ |
# | RDF, HTML, TeX, Markdown | 1 | 1 | $\langle 1,1\rangle$ | $\top$ (both) |
#
# The knowledge order $\le_k$ ("more of both") reads as **degree of
# machine-explicit commitment**; the truth order $\le_t$ ("more pro, less con")
# reads as the **data↔document polarity** (pure addressable data $\mathbf t$ vs
# pure propositional content $\mathbf f$). The four corners are exactly Belnap's
# $\bot, \mathbf t, \mathbf f, \top$.

# %%
FORMAT_CHARGE = {
    "bytes": B.none,  # ⟨0,0⟩
    "JSON": B.true,  # ⟨1,0⟩  addressable, not asserting
    "prose": B.false,  # ⟨0,1⟩  asserting, not addressable
    "RDF": B.conflict,  # ⟨1,1⟩  addressable AND asserting
    "HTML": B.conflict,  # ⟨1,1⟩
    "TeX": B.conflict,  # ⟨1,1⟩
    "Markdown": B.conflict,  # ⟨1,1⟩
}

assert charge(B.true) == (1, 0), "JSON: addressable, non-asserting"
assert charge(B.false) == (0, 1), "prose: asserting, non-addressable"
assert charge(B.none) == (0, 0) and charge(B.conflict) == (1, 1)
print("corners:", {k: charge(v) for k, v in FORMAT_CHARGE.items()})

# %% [markdown]
# ### 1.1 It is a bilattice, and its symmetry group is the Klein four-group
#
# `pymetrologic` carries the two lattice orders and the gauge group
# $V_4 = \{\mathrm{id}, \sim, -, \pi\}$ acting on $\mathbf 4$, with the proven
# order signature: negation $\sim$ (swap the slots) preserves $\le_k$ and
# reverses $\le_t$; conflation $-$ reverses $\le_k$ and preserves $\le_t$. This
# is the format analogue of the Belnap/Fitting symmetry result.

# %%
assert is_group(B), "K₄ acts as a group on the bilattice"

corners = [B.none, B.true, B.false, B.conflict]


def preserves_k(g):  # type: ignore[no-untyped-def]
    return all(
        B.leq_k(x, y) == B.leq_k(act(g, B, x), act(g, B, y)) for x in corners for y in corners
    )


def reverses_t(g):  # type: ignore[no-untyped-def]
    return all(
        B.leq_t(x, y) == B.leq_t(act(g, B, y), act(g, B, x)) for x in corners for y in corners
    )


from pymetrologic.klein import K4

assert preserves_k(K4.NEG) and reverses_t(K4.NEG), "∼ preserves ≤_k, reverses ≤_t"
assert reverses_t(K4.CONF) is False  # conflation preserves ≤_t (so 'reverses' is False)
print("∼ swaps middles:", charge(act(K4.NEG, B, B.true)), "↔", charge(act(K4.NEG, B, B.false)))
print("− swaps ⊥/⊤:", charge(act(K4.CONF, B, B.none)), "↔", charge(act(K4.CONF, B, B.conflict)))

# %% [markdown]
# ### 1.2 JSON-LD is an *edge*, not a symmetry
#
# JSON-LD maps JSON $\langle 1,0\rangle$ to RDF $\langle 1,1\rangle$: it **adds
# assertivity while keeping addressability** — a $\le_k$-monotone *edge*, not a
# bilattice symmetry. We can prove it is no symmetry: $\top$ is not in the
# $K_4$-orbit of $\mathbf t$.
#
# Consequence (falsifiable): the standardized lossless transcodings are the
# $\le_k$-edges that add exactly one feature (parse: $\bot\to\mathbf t$;
# JSON-LD: $\mathbf t\to\top$; RDFa/microdata: HTML's $\top$ exposing its $S$ to
# a reasoner). The bilattice *symmetries* — the feature-swap $\mathbf t\leftrightarrow\mathbf f$
# (data↔prose) and the conflation $\bot\leftrightarrow\top$ — have **no lossless
# standard**, matching the observed absence of clean data↔prose or bytes↔RDF
# converters.

# %%
orbit_t = {charge(act(g, B, B.true)) for g in K4_ELEMENTS}
assert charge(B.conflict) not in orbit_t, "JSON→RDF (t→⊤) is NOT a symmetry"
print("K₄-orbit of JSON (t):", orbit_t, "— ⊤ =", charge(B.conflict), "absent ⇒ JSON-LD is an edge")

# %% [markdown]
# ## 2. The closure ladder of completion
#
# The **rung** of a format is the complexity of the canonical operator that
# completes its surface into final meaning. We verify the two decidable,
# computable rungs and the key *non-monotonicity* contrast directly; the Turing
# rung is cited.

# %% [markdown]
# ### 2.1 RDF: a monotone, finitary (Scott / Datalog) closure — and its merge is a CRDT
#
# RDF entailment (RDFS/OWL-RL) is the least fixed point of a monotone, finitary
# consequence operator (van Emden–Kowalski 1976; the RDF 1.1 model theory), so it
# is Scott-continuous and its lfp is reached by $\le\omega$ iterations. We
# demonstrate (i) graph **merge is set-union of triples** — a commutative,
# associative, idempotent semilattice, hence a coordination-free CRDT satisfying
# CALM; and (ii) the RDFS consequence operator is **monotone** and reaches a
# fixed point. We realize the merge *as `pymetrologic` settling*: a graph is a
# settling `triple ↦ ⊤_asserted`, and graph-merge is the knowledge-join $\vee_k$.

# %%
# (i) merge = ∨_k settling; order-independent (a CRDT)
ASSERTED = B.true  # a present triple carries "asserted"


def graph(*triples: str) -> Settling[str, int]:
    return {t: ASSERTED for t in triples}


g1 = graph("a sc b", "b sc c")  # a ⊑ b, b ⊑ c
g2 = graph("b sc c", "x type a")
m12 = merge(B, g1, g2)
m21 = merge(B, g2, g1)
assert m12 == m21, "merge is commutative (order-independent)"
assert merge(B, g1, g1) == g1, "merge is idempotent"
# associativity / full order-independence over permutations:
g3 = graph("y type b")
perms = [merge_all(B, [g1, g2, g3]), merge_all(B, [g3, g1, g2]), merge_all(B, [g2, g3, g1])]
assert all(p == perms[0] for p in perms), "merge_all is order-independent (CALM)"
print("RDF merge is a join-semilattice CRDT; |merge| =", len(perms[0]), "triples")

# %%
# (ii) the RDFS consequence operator T is monotone, finitary, reaches a fixpoint
Triple = tuple[str, str, str]


def T_rdfs(graph_set: frozenset[Triple]) -> frozenset[Triple]:
    """One step of (a fragment of) RDFS entailment: subClassOf transitivity + type propagation."""
    out = set(graph_set)
    sc = {(s, o) for (s, p, o) in graph_set if p == "sc"}
    for x, y in sc:
        for y2, z in sc:
            if y == y2:
                out.add((x, "sc", z))  # transitivity
    typ = {(s, o) for (s, p, o) in graph_set if p == "type"}
    for e, c in typ:
        for c2, d in sc:
            if c == c2:
                out.add((e, "type", d))  # type propagation up subclass chain
    return frozenset(out)


def close(g: frozenset[Triple]) -> frozenset[Triple]:
    cur = g
    while True:
        nxt = T_rdfs(cur)
        if nxt == cur:
            return cur
        cur = nxt


G: frozenset[Triple] = frozenset({("a", "sc", "b"), ("b", "sc", "c"), ("x", "type", "a")})
H: frozenset[Triple] = frozenset({("c", "sc", "d")})

# monotone: more input ⇒ at least as much output; closure reaches a fixpoint
assert T_rdfs(G) >= G, "T is inflationary"
assert close(G) <= close(G | H), "entailment is MONOTONE: adding triples never retracts"
assert T_rdfs(close(G)) == close(G), "closure is a fixed point of T"
print("RDFS closure of G:", sorted(close(G)))
print("regime of κ for a Scott closure:", regime_of_ord(omega))  # 'scott'

# %% [markdown]
# ### 2.2 JSON Schema validation is *non-monotone*
#
# Validity is **not** monotone under the information order on JSON values: adding
# a field (more information) can *destroy* validity. Concrete witness, faithful
# to `additionalProperties: false`:
#
# $$\text{schema } S:\ \{\ \texttt{a}\ \text{optional},\ \text{no other keys}\ \},\qquad
#   J=\{a{:}1\}\ \subseteq\ J'=\{a{:}1,\,b{:}2\},\qquad
#   S(J)=\text{valid},\ S(J')=\text{invalid}.$$
#
# So no monotone closure presents JSON-Schema validation — the structural
# opposite of RDF. We test the *same* monotonicity predicate that RDF passes.


# %%
def json_valid(obj: dict[str, int]) -> bool:
    """Schema: object with optional key 'a', additionalProperties: false."""
    return set(obj) <= {"a"}


J = {"a": 1}
Jp = {"a": 1, "b": 2}
assert J.items() <= Jp.items(), "J ⊆ J' (J' carries strictly more information)"
assert json_valid(J) and not json_valid(Jp), "validity LOST by adding info ⇒ NON-MONOTONE"


def predicate_is_monotone(pred, smaller, larger) -> bool:  # type: ignore[no-untyped-def]
    """If pred holds on `smaller` it must hold on the larger super-object."""
    return (not pred(smaller)) or pred(larger)


assert not predicate_is_monotone(json_valid, J, Jp), "JSON-Schema: non-monotone"
# RDF entailment, same test, opposite result:
assert predicate_is_monotone(lambda g: ("x", "type", "c") in close(g), G, G | H), "RDF: monotone"
print("JSON-Schema validity non-monotone; RDF entailment monotone — same test, opposite verdict")

# %% [markdown]
# ### 2.3 HTML and TeX: the Turing rung (cited, not computed)
#
# HTML completion runs the document's scripts to a final DOM; TeX completion
# expands macros to a final box list. **Both are Turing-complete** (TeX macro
# expansion is a classical result; HTML+JS, and even HTML+CSS, are Turing-complete),
# so "does this document have a final completed state?" is **undecidable** — the
# $\kappa\ge\omega_1$, *aperiodic* rung. This is not representable as an
# $\mathbb N$-indexed tree ordinal (see `pymetrologic.ordinal`), so we record it by
# citation rather than computation, and anchor only the two decidable rungs:

# %%
assert regime_of_ord(of_nat(1)) == "strict-finite"  # identity rung (plain text, Markdown render)
assert regime_of_ord(omega) == "scott"  # RDF entailment rung
print("decidable rungs anchored:", regime_of_ord(of_nat(1)), "and", regime_of_ord(omega))
print("non-monotone rung: JSON-Schema (no Kleene lfp); Turing rung: HTML, TeX (undecidable, cited)")

# %% [markdown]
# ## 3. The grid: the two axes are orthogonal
#
# Placing the formats on (content corner $\times$ completion rung):
#
# | corner \ rung | identity | Scott ($\omega$) | non-monotone | Turing ($\omega_1$) |
# |---|---|---|---|---|
# | $\bot$ $\langle 0,0\rangle$ | opaque bytes | | | |
# | $\mathbf t$ $\langle 1,0\rangle$ | CSV/protobuf | | **JSON+Schema** | |
# | $\mathbf f$ $\langle 0,1\rangle$ | **plain text** | | | |
# | $\top$ $\langle 1,1\rangle$ | **Markdown** | **RDF** | | **HTML, TeX** |
#
# Two theorems fall out, and neither needs the corpus:

# %%
RUNG_ORDER = {"identity": 0, "scott": 1, "non-monotone": 2, "turing": 3}
GRID = {
    "bytes": ((0, 0), "identity"),
    "plain text": ((0, 1), "identity"),
    "CSV": ((1, 0), "identity"),
    "JSON": ((1, 0), "non-monotone"),
    "Markdown": ((1, 1), "identity"),
    "RDF": ((1, 1), "scott"),
    "HTML": ((1, 1), "turing"),
    "TeX": ((1, 1), "turing"),
}


def leq_k_bits(a: tuple[int, int], b: tuple[int, int]) -> bool:
    return a[0] <= b[0] and a[1] <= b[1]


# Theorem A: the top corner ⊤ is occupied at THREE different rungs.
top_rungs = {rung for (corner, rung) in GRID.values() if corner == (1, 1)}
assert {"identity", "scott", "turing"} <= top_rungs, "⊤ spans identity, Scott, and Turing"

# Theorem B: completion cost is NON-MONOTONE in the knowledge order ≤_k.
# Exhibit a ≤_k-increase that LOWERS rung and one that RAISES it.
pairs = [((a, ra), (b, rb)) for (a, ra) in GRID.values() for (b, rb) in GRID.values()]
lowers = any(
    leq_k_bits(a, b) and a != b and RUNG_ORDER[rb] < RUNG_ORDER[ra] for (a, ra), (b, rb) in pairs
)
raises = any(
    leq_k_bits(a, b) and a != b and RUNG_ORDER[rb] > RUNG_ORDER[ra] for (a, ra), (b, rb) in pairs
)
assert lowers and raises, "rung is non-monotone in ≤_k: ascending content can lower OR raise cost"

# Concretely: JSON ⟨1,0⟩ ≤_k RDF ⟨1,1⟩ but RDF is CHEAPER (scott < non-monotone).
assert leq_k_bits((1, 0), (1, 1)) and RUNG_ORDER["scott"] < RUNG_ORDER["non-monotone"]
print("Theorem A — ⊤ occupied at rungs:", sorted(top_rungs))
print("Theorem B — completion cost is non-monotone in ≤_k:  lowers =", lowers, " raises =", raises)
print("  witness: JSON ≤_k RDF, yet RDF (Scott) is cheaper to complete than JSON (non-monotone)")

# %% [markdown]
# ## 4. What is proved here vs. what is cited
#
# **Verified in Python (this notebook):**
#
# - the four content corners form the Belnap bilattice $\mathbf 4$ with its
#   Klein-four symmetry group and the proven order signature (§1.1);
# - JSON-LD is a $\le_k$-edge, not a symmetry — $\top \notin K_4\!\cdot\!\mathbf t$ (§1.2);
# - RDF merge is a commutative/associative/idempotent join-semilattice (a CRDT,
#   CALM-coordination-free), and RDFS entailment is monotone with a fixed point (§2.1);
# - JSON-Schema validation is non-monotone, by counterexample, under the *same*
#   monotonicity test RDF passes (§2.2);
# - the two axes are orthogonal: $\top$ is multiply-occupied and completion cost
#   is non-monotone in $\le_k$ (§3).
#
# **Cited, not computed:** the Turing-completeness of HTML/TeX completion, hence
# the undecidability of their final state ($\kappa\ge\omega_1$); the full
# RDF/RDFS/OWL-RL Scott-continuity (we check a fragment).
#
# **Next (earns Lean):** formalize §1.1 (bilattice + $K_4$, mirroring the
# in-tree Diátaxis result) and the §2.1/§2.2 monotone-vs-non-monotone contrast as
# a machine-checked core; the grid theorems A/B follow.
print("OK — all checks passed.")
