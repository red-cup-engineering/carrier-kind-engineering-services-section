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
# # Golden, corrected to plastic — a before/after pair
#
# **Renders:** the Fibonacci-vs-Padovan growth-rate comparison the corpus
# eventually settled, alongside a live re-run of a Collatz conjecture that —
# as far as its own file shows — never got the same correction.
#
# **Instantiates:** `Obsmetrologia.Closure.Collatz.PadovanShape`
# (`pymetrologic.substitution.padovan_dominated_by_fibonacci`) — the
# kernel-checked fact `padovan k <= fibonacci k` for all `k`: the plastic
# number `rho` (root of `x^3 = x + 1`) is the smallest Pisot number, so
# Padovan is *everywhere* dominated by golden Fibonacci.
#
# **Legacy ancestors (read-only, not modified):** under
# `lib/emsenn/services/561-group/lib/legacy/2026-04-30-mypc-relationality-repo/`
# `relationality-repo/operations/science/toys/`, files
# `math/void-monoid/zeta.py` and `math/collatz/predictions.py`.
#
# `zeta.py` is the **after**: it computes the spectral structure of a
# different toy's ("DPM", the void-monoid partition function) grade-count
# sequences, and its own header comment is the whole story in miniature:
#
# > Old drafts predicted `beta_c = ln(phi) ~ 0.481` (Fibonacci pole, assuming
# > `F = empty`). We show `F != empty -> PS follows Padovan -> actual pole at
# > `ln(rho) ~ 0.281` where `rho ~ 1.3247` is the plastic number.
#
# `predictions.py` is a **still-open before**, on a different system entirely
# (Collatz trajectories, not DPM): it tests whether the number of distinct
# Collatz "shortcut shapes" realized by numbers with `Omega(n) <= k` grows
# like the Fibonacci number `F_{k+1}` — and, as far as this repository's copy
# of the file shows, that conjecture was never re-examined the way the DPM one
# was. This notebook re-runs `predictions.py`'s own computation (below), then
# lays the real golden/plastic growth curves next to it so the reader can see
# exactly the shape of correction `zeta.py` needed and ask whether
# `predictions.py`'s Fibonacci guess would survive the same scrutiny.
#
# No zone/corner translation is needed for this piece — it is pure number
# theory (integer sequences and their growth rates), not the bilattice/corner
# algebra the other gallery pieces recast.

# %%
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt

from pymetrologic.collatz_valuation import two_adic_factor
from pymetrologic.substitution import (
    fibonacci,
    fibonacci_matrix,
    padovan,
    padovan_dominated_by_fibonacci,
    padovan_matrix,
    perron_eigenvalue,
)

OUT = Path(__file__).parent / "gallery-output"
OUT.mkdir(parents=True, exist_ok=True)

# %% [markdown]
# ## Re-running `predictions.py`'s own computation
#
# `collatz_shortcut_shape` and `omega` are the toy's own small helpers
# (no `pymetrologic` analogue for either — omega is elementary trial-division
# factor-counting, and "shortcut shape" is toy-specific bookkeeping); the
# per-step 2-adic valuation itself is real `pymetrologic` API:
# `pymetrologic.collatz_valuation.two_adic_factor(3*current + 1).exponent`
# is exactly `v_2(3n+1)`, the quantity the toy's `v2()` helper duplicated.


# %%
def omega(n: int) -> int:
    """Number of prime factors of n, counted with multiplicity (toy's own helper)."""
    if n <= 1:
        return 0
    count = 0
    d = 2
    while d * d <= n:
        while n % d == 0:
            count += 1
            n //= d
        d += 1
    if n > 1:
        count += 1
    return count


def collatz_shortcut_shape(n: int) -> tuple[int, ...] | None:
    """The sequence of v_2(3m+1) at each odd step of n's Collatz trajectory."""
    shape: list[int] = []
    current = n
    seen: set[int] = set()
    while current != 1:
        if current in seen:
            return None
        seen.add(current)
        if current % 2 == 0:
            current //= 2
        else:
            factor = two_adic_factor(3 * current + 1)
            shape.append(factor.exponent)
            current = factor.odd_part
    return tuple(shape)


LIMIT = 4000
shapes_by_omega: dict[int, set[tuple[int, ...]]] = defaultdict(set)
for n in range(3, LIMIT + 1, 2):  # odd n only
    shape = collatz_shortcut_shape(n)
    if shape is not None:
        shapes_by_omega[omega(n)].add(shape)

max_k = max(shapes_by_omega)
cumulative: set[tuple[int, ...]] = set()
ks: list[int] = []
observed_counts: list[int] = []
fib_predictions: list[int] = []
pad_predictions: list[int] = []
for k in range(1, max_k + 1):
    cumulative |= shapes_by_omega.get(k, set())
    ks.append(k)
    observed_counts.append(len(cumulative))
    fib_predictions.append(
        fibonacci(k)
    )  # pymetrologic.fibonacci(k) == toy's F_{k+1} (see indexing note below)
    pad_predictions.append(padovan(k))

print(f"odd n up to {LIMIT}; distinct shortcut shapes by max Omega(n):")
print(f"{'k':>3}  {'observed':>9}  {'F_(k+1)':>8}  {'obs/F':>7}  {'padovan(k)':>10}  {'obs/P':>7}")
for k, obs, f, p in zip(ks, observed_counts, fib_predictions, pad_predictions, strict=True):
    print(f"{k:>3}  {obs:>9}  {f:>8}  {obs / f:>7.2f}  {p:>10}  {obs / p:>7.2f}")

# %% [markdown]
# **Indexing note:** the toy's own Fibonacci helper is `F_0=0, F_1=1, F_2=1, ...`
# and compares `count` against `F_{k+1}`. `pymetrologic.substitution.fibonacci`
# is `1,1,2,3,5,...` (`fibonacci(0)=1`), so `pymetrologic.fibonacci(k)` is
# already the toy's `F_{k+1}` — no `+1` needed when calling the library
# function, which is why the table above calls `fibonacci(k)` directly.

# %% [markdown]
# ## The growth rates side by side
#
# Whatever the small-`k` table above shows, the *asymptotic* question — does
# a "looks-Fibonacci" integer count actually grow at the golden rate `phi`,
# or could it (like the DPM grade-counts in `zeta.py`) actually be growing at
# the strictly slower plastic rate `rho`? — has a definitive, library-backed
# answer for these two specific sequences.

# %%
phi = (1 + 5**0.5) / 2
rho = perron_eigenvalue(padovan_matrix())
phi_check = perron_eigenvalue(fibonacci_matrix())
print(f"golden ratio  phi = {phi:.6f}   (perron_eigenvalue(fibonacci_matrix()) = {phi_check:.6f})")
print(f"plastic number rho = {rho:.6f}   (root of x^3 = x + 1)")
dominated = padovan_dominated_by_fibonacci(60)  # Obsmetrologia.Closure.Collatz.PadovanShape
print(f"padovan_dominated_by_fibonacci(60) = {dominated}")

ns = list(range(16))
fibs = [fibonacci(n) for n in ns]
pads = [padovan(n) for n in ns]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))

ax1.semilogy(ns, fibs, "o-", color="#c8a000", label="Fibonacci (golden, phi)")
ax1.semilogy(ns, pads, "s-", color="#2090c0", label="Padovan (plastic, rho)")
ax1.set_xlabel("n")
ax1.set_ylabel("count (log scale)")
ax1.set_title("golden vs. plastic growth")
ax1.legend(frameon=False)

fib_ratios = [fibs[i] / fibs[i - 1] for i in range(2, len(fibs))]
pad_ratios = [pads[i] / pads[i - 1] for i in range(2, len(pads))]
ax2.plot(ns[2:], fib_ratios, "o-", color="#c8a000", label=f"F(n)/F(n-1) -> phi = {phi:.4f}")
ax2.plot(ns[2:], pad_ratios, "s-", color="#2090c0", label=f"P(n)/P(n-1) -> rho = {rho:.4f}")
ax2.axhline(phi, color="#c8a000", linestyle=":", linewidth=1)
ax2.axhline(rho, color="#2090c0", linestyle=":", linewidth=1)
ax2.set_xlabel("n")
ax2.set_ylabel("ratio")
ax2.set_title("convergent eigenvalues")
ax2.legend(frameon=False, fontsize=8)

fig.suptitle("the correction zeta.py found: golden pole -> plastic pole")
fig.tight_layout()
fig.savefig(OUT / "81-padovan-corrected.png", dpi=130)
plt.show()

# %% [markdown]
# ## The unresolved question this notebook leaves open
#
# `predictions.py`'s own docstring calls its Fibonacci growth claim a
# *prediction*, not a proved result, and nothing in this repository's copy of
# the toy (or in the live Obsmetrologia tree, as far as this notebook's
# author checked) re-derives the Collatz shortcut-shape count the way
# `zeta.py` re-derived the DPM grade count. What the Lean proof *does* settle,
# generally, is the shape of the correction if one is ever needed: if the
# "distinct shortcut shapes" count turns out to be Padovan-shaped rather than
# Fibonacci-shaped, `padovan_dominated_by_fibonacci` guarantees that
# discovery could only ever reveal *slower* growth than the naive Fibonacci
# guess (`rho < phi`, always) — never faster. That is the corpus's proved
# half of this story; whether it actually applies to `predictions.py`'s
# specific conjecture is open, and this notebook does not claim to settle it.
