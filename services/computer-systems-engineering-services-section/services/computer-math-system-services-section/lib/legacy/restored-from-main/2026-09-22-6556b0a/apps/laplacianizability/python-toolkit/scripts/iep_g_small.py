"""
IEP-G realizability for small graphs only.

Restricts to cases where sympy can compute discriminants quickly:
    P_2, P_3, P_4
    C_3, C_4
    K_{1,2}, K_{1,3}
    K_3
    partial Delta^2

Skip larger cases (K_4, partial Delta^3) where the symbolic computation
is too expensive — those are tested at uniform weights only.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import sympy as sp
from cellular_sheaf import (
    path_P, cycle_C, star_K, complete_K, boundary_simplex,
    realize_full_degeneracy,
)


def check(label, sheaf, n=1, expect=None):
    print(f"\n--- {label} (degree {n}) ---", flush=True)
    print(f"    chain dims: {sheaf.dims}", flush=True)
    print(f"    rank d_{n}: {sheaf.d_maps[n-1].rank()}", flush=True)
    status, info = realize_full_degeneracy(sheaf, n=n)
    expectation = ""
    if expect is not None:
        expectation = f" (expected {expect})  {'✓' if status == expect else '✗ MISMATCH'}"
    print(f"    full nonzero degeneracy: {status}{expectation}", flush=True)
    print(f"    info: {info}", flush=True)


def main():
    print("=" * 70, flush=True)
    print("PATH GRAPHS — predicted UNREALIZABLE (Sturm)", flush=True)
    print("=" * 70, flush=True)
    check("P_2", path_P(2), expect="realizable")  # only 1 nonzero ev — trivial
    check("P_3", path_P(3), expect="unrealizable")
    check("P_4", path_P(4), expect="unrealizable")

    print()
    print("=" * 70, flush=True)
    print("CYCLE GRAPHS — predicted REALIZABLE", flush=True)
    print("=" * 70, flush=True)
    check("C_3", cycle_C(3), expect="realizable")
    check("C_4", cycle_C(4), expect="realizable")

    print()
    print("=" * 70, flush=True)
    print("STARS — predicted REALIZABLE for n >= 2", flush=True)
    print("=" * 70, flush=True)
    check("K_{1,2}", star_K(2), expect="realizable")
    check("K_{1,3}", star_K(3), expect="realizable")

    print()
    print("=" * 70, flush=True)
    print("COMPLETE GRAPHS K_3 — predicted REALIZABLE", flush=True)
    print("=" * 70, flush=True)
    check("K_3", complete_K(3), expect="realizable")

    print()
    print("=" * 70, flush=True)
    print("partial Delta^2 (= K_3 cellular)", flush=True)
    print("=" * 70, flush=True)
    check("partial Delta^2", boundary_simplex(2), expect="realizable")


if __name__ == "__main__":
    main()
