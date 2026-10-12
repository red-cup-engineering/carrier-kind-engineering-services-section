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
# # Meeting — then beating — PySheaf
#
# PySheaf asks of a cellular sheaf: *do the data on the cells agree across the
# restriction maps?* and answers with one number, the **consistency radius**.
#
# We encode the same sheaf as a bilattice-valued **predication sheaf** over FOUR
# and **settle** it. We get the same verdict (meet) and, in addition, the exact
# cells and values where the disagreement lives (beat).

# %%
from pymetrologic.calculus import DiscreteGraphSheaf, compare_with_pysheaf
from pymetrologic.site import Site


def triangle(a: str, b: str, c: str) -> DiscreteGraphSheaf:
    """Three sensors a, b, c on a triangle; each reads a bit; edges demand agreement."""
    vertices = ("a", "b", "c")
    edges = (("a", "b"), ("b", "c"), ("a", "c"))
    values = ("0", "1")
    edge_values = {Site.edge_name(u, v): values for (u, v) in edges}
    restriction = {}
    for u, v in edges:
        e = Site.edge_name(u, v)
        restriction[(u, e)] = {"0": "0", "1": "1"}
        restriction[(v, e)] = {"0": "0", "1": "1"}
    return DiscreteGraphSheaf(
        vertices=vertices,
        edges=edges,
        vertex_values=dict.fromkeys(vertices, values),
        edge_values=edge_values,
        restriction=restriction,
        assignment={"a": a, "b": b, "c": c},
    )


# %% [markdown]
# ## A consistent reading — both agree it is a global section

# %%
ok = compare_with_pysheaf(triangle("0", "0", "0"))
print("classical consistency radius:", ok.classical_radius)
print("our bilattice radius:        ", ok.bilattice_radius)
print("is a global section:         ", ok.consistent)
print("located conflicts:           ", ok.located_conflicts)

# %% [markdown]
# ## An inconsistent reading — same verdict, but we say *where*
#
# `a=0, b=1, c=0`. PySheaf reports radius `1` and stops. We report radius `1`
# **and** localize it: edges `a|b` and `b|c` carry the conflict (at both disputed
# values), while `a|c` stays clean. That localization is what a practitioner
# actually needs to repair the sensor network.

# %%
bad = compare_with_pysheaf(triangle("0", "1", "0"))
print("classical consistency radius:", bad.classical_radius)
print("our bilattice radius:        ", bad.bilattice_radius)
print("verdicts agree (meet):       ", bad.agrees_with_classical)
print("located conflicts (beat):    ", bad.located_conflicts)

# %% [markdown]
# Every binary reading agrees with the classical verdict — and whenever it is
# inconsistent, we hand back the located obstruction for free.

# %%
for a in "01":
    for b in "01":
        for c in "01":
            cmp = compare_with_pysheaf(triangle(a, b, c))
            assert cmp.agrees_with_classical
            where = ",".join(sorted(cmp.located_conflicts)) or "—"
            print(f"a={a} b={b} c={c}  radius={cmp.bilattice_radius}  conflict@ {where}")
