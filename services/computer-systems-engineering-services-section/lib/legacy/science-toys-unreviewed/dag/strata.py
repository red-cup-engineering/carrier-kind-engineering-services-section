#!/usr/bin/env python3
"""
strata.py -- Full measurement catalog across DependsOn strata.

Shadow type naming (from math/ideas/temporal-decomposition.md):
  H*       image             both nuclei fix a   (λ^σ=0, λ^Δ=0, τ=0)
  Kind-1   saturation-shadow σ fixes, Δ doesn't  (λ^σ=0, λ^Δ>0, τ<0)
  Kind-2   transfer-shadow   Δ fixes, σ doesn't  (λ^σ>0, λ^Δ=0, τ>0)
  Free     free-shadow       neither fixes        (λ^σ>0, λ^Δ>0, τ either)

Per event e:
  lambda_sigma  = n_{e.key} - 1       ascending commutation orbit size
  lambda_delta  = n_key[e.value]      descending DependsOn direct reach
  tau           = lambda_sigma - lambda_delta   temporal defect (Galois-odd)

Measures computed per stratum (from math/ideas/):
  N, keys, H*, Kind-1, Kind-2, Free
  sum_ls, sum_ld, sum_tau
  Galois-even = (sum_ls + sum_ld)/2  [symmetrized defect]
  Galois-odd  = sum_tau/2            [temporal defect, changes sign under γ]
  nuclear_mag  m = (Kind1 - Kind2) / (Kind1 + Kind2)  [→ φ^{-3} at criticality]
  temporal_frac  T/M = sum_tau / (sum_ls + sum_ld)     [→ -φ^{-3}]
  K1_K2_ratio    Kind1/Kind2                            [→ φ]
  diag_excess_K1 Σ_{Kind-1} -λ^Δ*(λ^Δ+1)              E(a,a;1) for Kind-1
  diag_excess_K2 Σ_{Kind-2} -λ^σ*(λ^σ+1)              E(a,a;1) for Kind-2
  chi5(n)        Kronecker symbol (5/n mod 5): split/inert/ramified depth

Partition function suite (math/ideas/magnetic-numbers.md, zeta-structure.md):
  Z(β)       = Σ_n N_n exp(-βn)
  Z_K1(β)    = Σ_n Kind1_n exp(-βn)
  Z_K2(β)    = Σ_n Kind2_n exp(-βn)
  Z_tau(β)   = Σ_n sum_tau_n exp(-βn)   [Galois-odd partition function Z-]
  Z_ge(β)    = Σ_n sum_galois_even_n exp(-βn)  [Galois-even Z+]
  m(β)       = Σ_n (n+1)(F_n-F_{n-1}) exp(-βn) / Z(β)  [nuclear magnetization]
  Z-/Z+      → -φ^{-3} ≈ -0.2361 at criticality
  F(β)       = -ln Z(β)        free energy
  <n>        = Σ n N_n exp(-βn) / Z    mean depth
  Cv         ≈ β² d²/dβ² ln Z          specific heat

Content density ρ(n) = N_n / Σ_k N_k  [→ φ^{-2} ≈ 0.382 at frontier]
Fibonacci comparison: theoretical N_n^th = (n+1)*F_{n+1} vs actual N_n
"""

from __future__ import annotations
import math
import sys
import io
from pathlib import Path
from collections import defaultdict, Counter

# Force UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
else:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_DIR  = REPO_ROOT / 'spec'

sys.path.insert(0, str(Path(__file__).parent))
from bypass import Event, parse_frontmatter, flatten

PHI   = (1 + 5**0.5) / 2
BETA_C = math.log(PHI)


# ── Fibonacci / Lucas sequences ────────────────────────────────────────────

def fib(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

def lucas(n: int) -> int:
    if n == 0: return 2
    if n == 1: return 1
    a, b = 2, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b

def chi5(n: int) -> int:
    """Kronecker symbol (5/n): +1 split, -1 inert, 0 ramified."""
    r = n % 5
    if r == 0: return 0
    if r in (1, 4): return 1
    return -1


# ── Strata helpers ─────────────────────────────────────────────────────────

def eid(e: Event) -> str:
    return e.key + '\x00' + e.value


def build_desc(events: frozenset, by_key: dict) -> dict:
    """Transitive DependsOn closure (descending only)."""
    desc = {e: by_key.get(e.value, frozenset()) for e in events}
    while True:
        changed = False
        new = {}
        for e in events:
            r = set(desc[e])
            old = len(r)
            for f in list(desc[e]):
                r |= desc[f]
            new[e] = frozenset(r)
            if len(r) > old:
                changed = True
        desc = new
        if not changed:
            break
    return desc


def measure_stratum(events: frozenset) -> dict:
    N = len(events)

    by_key: dict[str, frozenset] = defaultdict(frozenset)
    for e in events:
        by_key[e.key] = by_key[e.key] | {e}

    n_key = {k: len(vs) for k, vs in by_key.items()}

    shadow_counts = Counter()
    sum_ls = 0   # Σ λ^σ
    sum_ld = 0   # Σ λ^Δ
    de_k1  = 0   # Σ_{Kind-1} -λ^Δ*(λ^Δ+1)
    de_k2  = 0   # Σ_{Kind-2} -λ^σ*(λ^σ+1)

    for e in events:
        ls = n_key[e.key] - 1          # lambda_sigma
        ld = n_key.get(e.value, 0)     # lambda_delta

        if ls == 0 and ld == 0:
            shadow = 'H*'
        elif ls == 0 and ld > 0:
            shadow = 'Kind-1'          # saturation-shadow, σ fixes it, τ<0
            de_k1 += -(ld * (ld + 1))
        elif ls > 0 and ld == 0:
            shadow = 'Kind-2'          # transfer-shadow, Δ fixes it, τ>0
            de_k2 += -(ls * (ls + 1))
        else:
            shadow = 'Free'

        shadow_counts[shadow] += 1
        sum_ls += ls
        sum_ld += ld

    k1 = shadow_counts['Kind-1']
    k2 = shadow_counts['Kind-2']
    sum_tau = sum_ls - sum_ld

    return {
        'N':            N,
        'keys':         len(by_key),
        'H*':           shadow_counts['H*'],
        'Kind-1':       k1,
        'Kind-2':       k2,
        'Free':         shadow_counts['Free'],
        'sum_ls':       sum_ls,
        'sum_ld':       sum_ld,
        'sum_tau':      sum_tau,
        'galois_even':  (sum_ls + sum_ld),    # 2 * symmetrized defect
        'galois_odd':   sum_tau,               # = sum_ls - sum_ld
        'de_k1':        de_k1,
        'de_k2':        de_k2,
        'by_key':       by_key,
        'n_key':        n_key,
    }


def run(seed: frozenset, n_strata: int = 10) -> None:
    events = seed
    strata = []

    # ── Table 1: shadow counts and defect sums ─────────────────────────────
    print(f'{"n":>3}  {"N":>7}  {"keys":>5}  {"H*":>5}  {"K1":>6}  {"K2":>6}  {"Fr":>5}  '
          f'{"sum_ls":>9}  {"sum_ld":>9}  {"sum_tau":>9}  {"held":>7}')
    print('-' * 85)

    for n in range(n_strata):
        m = measure_stratum(events)
        strata.append((n, m))

        desc  = build_desc(events, m['by_key'])
        held  = frozenset(
            Event(key=eid(e), value=eid(f))
            for e in events for f in desc[e]
        )

        print(f'{n:>3}  {m["N"]:>7}  {m["keys"]:>5}  {m["H*"]:>5}  '
              f'{m["Kind-1"]:>6}  {m["Kind-2"]:>6}  {m["Free"]:>5}  '
              f'{m["sum_ls"]:>9}  {m["sum_ld"]:>9}  {m["sum_tau"]:>9}  '
              f'{len(held):>7}')

        if not held:
            print(f'  (stratum {n+1} is empty — fixed point)')
            break
        events = held

    if not strata:
        return

    # ── Table 2: per-stratum nuclear measures ──────────────────────────────
    print()
    print('Nuclear measures per stratum:')
    print(f'{"n":>3}  {"magnet m":>10}  {"T/M frac":>10}  {"K1/K2":>8}  '
          f'{"G-even":>10}  {"G-odd":>10}  {"de_K1":>12}  {"de_K2":>12}  {"χ₅(n)":>6}')
    print('-' * 105)

    for n, m in strata:
        k1, k2 = m['Kind-1'], m['Kind-2']
        denom_mag = k1 + k2
        nuclear_m = (k1 - k2) / denom_mag if denom_mag else float('nan')

        ge = m['galois_even']
        go = m['galois_odd']
        tf = go / ge if ge else float('nan')   # temporal fraction → -φ^{-3}

        ratio = k1 / k2 if k2 else float('inf')

        print(f'{n:>3}  {nuclear_m:>10.5f}  {tf:>10.5f}  {ratio:>8.4f}  '
              f'{ge:>10}  {go:>10}  {m["de_k1"]:>12}  {m["de_k2"]:>12}  {chi5(n):>6}')

    # theoretical targets
    print(f'  theoretical: magnet → +{1/PHI**3:.5f}   T/M frac → {-1/PHI**3:.5f}   K1/K2 → {PHI:.5f}')

    # ── Table 3: Fibonacci / Lucas comparison ─────────────────────────────
    print()
    print('Strata growth vs Fibonacci/Lucas theory:')
    print(f'{"n":>3}  {"N_actual":>10}  {"N_theory":>10}  {"ratio":>8}  '
          f'{"F(n+1)":>8}  {"L(n)":>6}  {"N mod 5":>7}  {"F(n+1)%5":>9}')
    print('-' * 70)

    cumulative = 0
    for n, m in strata:
        N_act = m['N']
        N_th  = (n + 1) * fib(n + 1)
        ratio = N_act / N_th if N_th else float('nan')
        fn1   = fib(n + 1)
        ln    = lucas(n)
        cumulative += N_act
        print(f'{n:>3}  {N_act:>10}  {N_th:>10}  {ratio:>8.4f}  '
              f'{fn1:>8}  {ln:>6}  {N_act%5:>7}  {fn1%5:>9}')

    # content density
    print()
    print(f'  total content (Σ N_n) = {cumulative}')
    print(f'  frontier fraction = N_{len(strata)-1}/total = '
          f'{strata[-1][1]["N"] / cumulative:.5f}  (theory → φ^{{-2}} = {1/PHI**2:.5f})')

    # ── Partition function suite ───────────────────────────────────────────
    print()
    print('Partition functions Z(β), Z_K1, Z_K2, Z-(Galois-odd), Z+(Galois-even):')
    hdr = (f'{"β":>9}  {"Z(β)":>12}  {"Z_K1":>10}  {"Z_K2":>10}  '
           f'{"Z-":>12}  {"Z+":>12}  {"Z-/Z+":>9}  {"<n>":>8}')
    print(hdr)
    print('-' * len(hdr))

    betas = [0.1, 0.2, BETA_C * 1.5, BETA_C * 1.2, BETA_C * 1.05,
             BETA_C, 1.0, math.log(2)]
    betas = sorted(set(betas))

    for beta in betas:
        Z    = sum(m['N']        * math.exp(-beta * n) for n, m in strata)
        Zk1  = sum(m['Kind-1']   * math.exp(-beta * n) for n, m in strata)
        Zk2  = sum(m['Kind-2']   * math.exp(-beta * n) for n, m in strata)
        Zminus = sum(m['galois_odd']  * math.exp(-beta * n) for n, m in strata)
        Zplus  = sum(m['galois_even'] * math.exp(-beta * n) for n, m in strata)
        mean_n = sum(n * m['N'] * math.exp(-beta * n) for n, m in strata) / Z if Z else float('nan')
        ratio_gal = Zminus / Zplus if Zplus else float('nan')

        label = f'{beta:.5f}'
        if abs(beta - BETA_C) < 1e-9:
            label = 'ln(φ)   '

        print(f'{label:>9}  {Z:>12.3f}  {Zk1:>10.3f}  {Zk2:>10.3f}  '
              f'{Zminus:>12.1f}  {Zplus:>12.1f}  {ratio_gal:>9.5f}  {mean_n:>8.3f}')

    print(f'  theoretical Z-/Z+ → {-1/PHI**3:.5f}  at β→β_c^+')

    # ── Thermodynamic profile near β_c ────────────────────────────────────
    print()
    print(f'Thermodynamics near β_c = ln(φ) = {BETA_C:.6f}:')
    print(f'{"β":>9}  {"F(β)":>12}  {"<n>":>8}  {"Cv":>12}  {"ε=β-β_c":>12}')
    print('-' * 60)

    eps_vals = [0.05, 0.1, 0.2, 0.5, 1.0, 2.0]
    for eps in eps_vals:
        beta = BETA_C + eps
        Z    = sum(m['N'] * math.exp(-beta * n) for n, m in strata)
        Fp   = sum(m['N'] * math.exp(-(beta + 1e-4) * n) for n, m in strata)
        Fm   = sum(m['N'] * math.exp(-(beta - 1e-4) * n) for n, m in strata)
        if Z > 0 and Fp > 0 and Fm > 0:
            lnZ  = math.log(Z)
            # d/dβ ln Z = -<n>, so <n> = -(d/dβ ln Z) = (ln Z(β-ε) - ln Z(β+ε))/(2ε)
            dlnZ  = (math.log(Fp) - math.log(Fm)) / (2e-4)   # ≈ d/dβ ln Z = -<n>
            d2lnZ = (math.log(Fp) + math.log(Fm) - 2*lnZ) / (1e-4)**2
            Cv    = beta**2 * d2lnZ
            mean_n = -dlnZ
            F_beta = -lnZ
        else:
            F_beta = mean_n = Cv = float('nan')
        print(f'{beta:>9.5f}  {F_beta:>12.4f}  {mean_n:>8.4f}  {Cv:>12.4f}  {eps:>12.5f}')

    print(f'  theoretical: <n> ~ ε^{{-1}},  Cv ~ β_c²/ε²  (simple pole regime)')

    # ── Shadow fractions and temporal fraction evolution ───────────────────
    print()
    print('Shadow fractions and temporal arrow evolution:')
    print(f'{"n":>3}  {"H*%":>7}  {"K1%":>7}  {"K2%":>7}  {"Fr%":>7}  '
          f'{"τ/N":>9}  {"K1+K2":>7}  {"T_frac":>10}  {"target":>10}')
    print('-' * 85)
    target = -1 / PHI**3

    for n, m in strata:
        Nf  = m['N']
        k1  = m['Kind-1']
        k2  = m['Kind-2']
        ge  = m['galois_even']
        go  = m['galois_odd']
        tf  = go / ge if ge else float('nan')
        print(f'{n:>3}  '
              f'{100*m["H*"]/Nf:>7.3f}  '
              f'{100*k1/Nf:>7.3f}  '
              f'{100*k2/Nf:>7.3f}  '
              f'{100*m["Free"]/Nf:>7.3f}  '
              f'{m["sum_tau"]/Nf:>9.4f}  '
              f'{k1+k2:>7}  '
              f'{tf:>10.5f}  '
              f'{target:>10.5f}')


def main() -> None:
    file_positions: dict[str, frozenset] = {}
    for path in sorted(SPEC_DIR.rglob('*.md')):
        fm = parse_frontmatter(path.read_text(encoding='utf-8', errors='replace'))
        evts = frozenset(Event(k, flatten(v)) for k, v in fm.items())
        if evts:
            file_positions[str(path.relative_to(REPO_ROOT))] = evts

    all_events = frozenset(e for h in file_positions.values() for e in h)
    print(f'corpus: {len(all_events)} events  {len(file_positions)} files')
    print(f'beta_c = ln(phi) = {BETA_C:.6f}   phi = {PHI:.6f}   phi^(-3) = {1/PHI**3:.6f}')
    print()
    run(all_events, n_strata=10)


if __name__ == '__main__':
    main()
