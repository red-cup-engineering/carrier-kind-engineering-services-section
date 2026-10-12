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
# # The predication core, in five minutes
#
# `pymetrologic` realizes the 561-group predication theory. The fiber of a predicate
# is a **bilattice** `L^⋈` — every value carries *evidence for* and *evidence
# against* separately, so it has two orders at once: a **truth** order and a
# **knowledge** order. For `L = {0, 1}` this is Belnap's **FOUR**.

# %%
from pymetrologic import BL, Chain, bilattice, four

B = four()
B.none, B.true, B.false, B.conflict

# %% [markdown]
# ## The knowledge join `∨_k` is the *merge* — and it is a semilattice
#
# Merging a `true` and a `false` does not pick a winner; it records that we now
# know *both*, i.e. it rises to `⊤` (conflict). That is the whole engine of
# settling.

# %%
print("t ∨_k f =", B.join_k(B.true, B.false))  # ⟨1, 1⟩  = ⊤ (conflict)
print("t ∨_k t =", B.join_k(B.true, B.true))  # idempotent
print("commutative:", B.join_k(B.true, B.none) == B.join_k(B.none, B.true))

# %% [markdown]
# ## Conflict is *graded*, not just present/absent
#
# `conflict_degree(v) = pro ∧_L con` measures how much a value asserts for and
# against at once. On a chain it is a real number — the bilattice-native
# generalization of a consistency radius, but attached to each value.

# %%
C = bilattice(Chain(4))
for v in (BL(4, 0), BL(3, 1), BL(2, 2), BL(4, 4)):
    print(v, "→ conflict degree", C.conflict_degree(v))

# %% [markdown]
# ## Settling: merge to a fixed point
#
# A *settling* is an assignment `key → value`. Merging two settlings is the
# pointwise `∨_k`; iterating a knowledge-monotone update converges because the
# fiber is bounded.

# %%
from pymetrologic import merge, settle

source = {"sky": B.true, "ground": B.false}
settled, iterations = settle(B, lambda _state: source, {})
print("settled in", iterations, "steps:", settled)

# Merge two partial observations of the same world:
obs_a = {"sky": B.true}
obs_b = {"sky": B.false, "ground": B.true}
print("merged:", merge(B, obs_a, obs_b))  # sky becomes ⊤ — observers disagree
