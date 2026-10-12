#!/usr/bin/env python3
"""
bypass.py -- Interval zeta from tiling carrier positions through the bypass orbit.

EventCommutation(a, b) = a.key == b.key.
Bypass step from h: swap event e ∈ h for any e' with e'.key == e.key.
Bypass orbit of h: all positions reachable by sequences of such swaps.

For each pair (asc, desc), corner(asc, desc, h') = H* iff asc∉h' AND desc∉h'.

The interval zeta Z_{H*}(q) for pair (asc,desc) at h:
  coefficient of q^r = count of orbit positions at bypass distance r with H* corner.

Computed analytically via slot polynomials -- O(k^3) per file, not O(orbit_size):

  Each slot i in h has n_i same-key events in corpus.
  Unconstrained slot poly: f_i(q) = 1 + (n_i-1)*q
    [1 for 'keep original', (n_i-1) for 'swap to any of n_i-1 alternatives']

  To get corner H*, constrain: asc not-in h' AND desc not-in h'.
  Constraint on slot i depends on whether {asc,desc} intersects that key.

The Ruelle zeta 1/(1-z-z^2) predicts that coefficients of the global
interval zeta follow the Fibonacci sequence. The temporal defect
tau(q) = S_pairs(q) - T_pairs(q) measures the arrow of time across the orbit.
"""

from __future__ import annotations
import re
from pathlib import Path
from collections import defaultdict

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_DIR  = REPO_ROOT / 'spec'


# ── Event ──────────────────────────────────────────────────────────────────────

class Event:
    __slots__ = ('key', 'value', '_s')
    def __init__(self, key: str, value: str):
        self.key   = key
        self.value = value
        self._s    = f'{key}\x00{value}'
    def __eq__(self, other):
        return isinstance(other, Event) and self._s == other._s
    def __hash__(self):
        return hash(self._s)
    def __repr__(self):
        return f'[{self.key}]={self.value!r}'


# ── Frontmatter ────────────────────────────────────────────────────────────────

try:
    import yaml
    def parse_frontmatter(text):
        if not text.startswith('---'): return {}
        try: end = text.index('---', 3)
        except ValueError: return {}
        try:
            r = yaml.safe_load(text[3:end].strip())
            return r if isinstance(r, dict) else {}
        except: return {}
except ImportError:
    def parse_frontmatter(text):
        if not text.startswith('---'): return {}
        try: end = text.index('---', 3)
        except ValueError: return {}
        block = text[3:end]; result = {}; key = None; lines = []
        def flush():
            if key is None: return
            raw = ' '.join(lines).strip()
            if (raw.startswith('"') and raw.endswith('"')) or \
               (raw.startswith("'") and raw.endswith("'")): raw = raw[1:-1]
            result[key] = raw
        for line in block.splitlines():
            if line.startswith(('  ','\t')): lines.append(line.strip()); continue
            m = re.match(r'^([A-Za-z0-9_-]+)\s*:(.*)', line)
            if m: flush(); key = m.group(1); lines = [m.group(2).strip()]
            else: lines.append(line.strip())
        flush(); return result

def flatten(v):
    if isinstance(v, str):  return v
    if isinstance(v, list): return ' '.join(flatten(x) for x in v)
    if isinstance(v, dict): return ' '.join(f'{k} {flatten(vv)}' for k,vv in v.items())
    return str(v)


# ── Polynomial arithmetic ─────────────────────────────────────────────────────

def pmul(a: list, b: list) -> list:
    if not a or not b: return []
    r = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            r[i+j] += ai * bj
    return r

def padd(a: list, b: list) -> list:
    n = max(len(a), len(b))
    return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)]

def pscale(s: int, a: list) -> list:
    return [s * x for x in a]


# ── Bypass slot polynomials ────────────────────────────────────────────────────

def f_unconstrained(n_i: int) -> list:
    """1 + (n_i-1)*q  -- keep original (q^0) or swap to any of n_i-1 alts (q^1)."""
    return [1, max(0, n_i - 1)]

def f_must_swap_to_exclude(n_i: int, n_exclude: int) -> list:
    """
    Slot where the original event IS one of the excluded events.
    Must swap. Can swap to any of n_i - n_exclude non-excluded alts.
    """
    return [0, max(0, n_i - n_exclude)]

def f_must_avoid_entering(n_i: int, n_exclude: int) -> list:
    """
    Slot where the original event is NOT excluded.
    Can keep (q^0=1) or swap to any of n_i - 1 - n_exclude non-excluded alts.
    """
    return [1, max(0, n_i - 1 - n_exclude)]


def slot_poly_for_pair(e_slot: Event, n_i: int, asc: Event, desc: Event) -> list:
    """
    Slot polynomial for slot occupied by e_slot (with n_i corpus alternatives),
    constrained so that neither asc nor desc ends up in the position.
    """
    asc_here  = (asc.key  == e_slot.key)
    desc_here = (desc.key == e_slot.key)

    if not asc_here and not desc_here:
        return f_unconstrained(n_i)

    # Count how many of {asc, desc} are "excluded" at this slot
    # Note: asc and desc might be the same event (self-pair)
    excluded = set()
    if asc_here:  excluded.add(asc)
    if desc_here: excluded.add(desc)
    n_exclude = len(excluded)

    if e_slot in excluded:
        return f_must_swap_to_exclude(n_i, n_exclude)
    else:
        return f_must_avoid_entering(n_i, n_exclude)


def product_poly(polys: list[list]) -> list:
    result = [1]
    for p in polys:
        result = pmul(result, p)
    return result


# ── Per-file interval zeta (O(k^3) analytical) ───────────────────────────────

def file_interval_zeta(h: frozenset, events_by_key: dict[str, frozenset],
                       N: int) -> dict:
    """
    For file h, compute the aggregate interval zeta Z_{H*}(q) summed over
    the 'interesting' pairs: those where at least one event is literally in h.

    Also computes:
      Z_all(q)  = total positions across all orbit positions (for normalization)
      tau(q)    = signed count (S-pairs - T-pairs) across the orbit
                  where S-pair = asc ∈ h (σ-active), T-pair = desc ∈ h (Δ-active)
    """
    h_list = sorted(h, key=lambda e: e._s)
    k = len(h_list)
    if k == 0:
        return {'k': 0, 'orbit_total': [1], 'Z_Hstar': [1], 'tau': [0]}

    # n_i for each slot
    ns = [len(events_by_key.get(e.key, frozenset())) for e in h_list]

    # Prefix and suffix products of unconstrained slot polys
    # prefix[i] = product of f_0, ..., f_{i-1}
    # suffix[i] = product of f_i, ..., f_{k-1}
    prefix = [[1]] * (k + 1)
    for i in range(k):
        prefix[i+1] = pmul(prefix[i], f_unconstrained(ns[i]))
    suffix = [[1]] * (k + 1)
    for i in range(k-1, -1, -1):
        suffix[i] = pmul(suffix[i+1], f_unconstrained(ns[i]))

    orbit_total = prefix[k]  # product of all unconstrained slot polys

    # P_without[a] = product of all slot polys EXCEPT slot a
    def p_without(a: int) -> list:
        return pmul(prefix[a], suffix[a+1])

    # P_without_ab[a][b] = product of all slot polys except slots a and b (a < b)
    def p_without_ab(a: int, b: int) -> list:
        # = prefix[a] × middle(a+1..b-1) × suffix[b+1]
        middle = prefix[b]  # product of slots 0..b-1
        # We need just a+1..b-1, so: prefix[b] / prefix[a+1] ... avoid division
        # Recompute: product of slots a+1..b-1
        mid = [1]
        for i in range(a+1, b):
            mid = pmul(mid, f_unconstrained(ns[i]))
        return pmul(pmul(prefix[a], mid), suffix[b+1])

    # ── Z_{H*}(q) for pairs (asc, desc) where at least one is in h ────────────
    # We sum over three groups:
    #   G1: asc ∈ h, desc = any event NOT in h  (k × (N-k) pairs)
    #   G2: asc = any event NOT in h, desc ∈ h  (symmetric, (N-k) × k pairs)
    #   G3: asc ∈ h AND desc ∈ h               (k² pairs)

    N_k = N - k  # events not in h

    Z_Hstar = [0]
    tau_poly = [0]  # S-type - T-type weighted

    # G1: asc = h_list[a], desc ∉ h
    # desc is from the (N-k) events not in h.
    # desc.key might or might not be in h's key-space; but desc itself is not in h.
    # The slot constraint for desc: desc.key might hit slot d.
    # For simplicity: we split by whether desc.key is in h's keys or not.
    #
    # For desc.key NOT in h's key-space (these can't enter h' via bypass anyway):
    #   slot poly for asc-slot a: f_must_swap_to_exclude(ns[a], 1)
    #   all other slots: unconstrained
    #   contribution per (asc=e_a, desc): f_must_swap(ns[a],1) × P_without[a]
    #   How many such desc? = N - sum(ns[key] for key in h_keys)
    #   (events whose key is completely absent from h's key space)

    h_keys = {e.key for e in h_list}
    N_outside_keys = N - sum(ns)  # events with keys not in h at all

    for a, e_a in enumerate(h_list):
        pw_a = p_without(a)

        # G1 asc=e_a, desc.key not in h_keys: N_outside_keys such desc
        zp = pscale(N_outside_keys, pmul(f_must_swap_to_exclude(ns[a], 1), pw_a))
        Z_Hstar = padd(Z_Hstar, zp)
        # tau: asc ∈ h (σ-active) → +S contribution
        tau_poly = padd(tau_poly, zp)

        # G1 asc=e_a, desc.key in h_keys but desc ∉ h (so desc ≠ e_d for all d):
        # desc is one of the ns[d]-1 alternatives for slot d
        for d, e_d in enumerate(h_list):
            if d == a:
                # desc.key == asc.key, desc ≠ e_a. These desc share key with asc.
                # slot a must exclude BOTH e_a and desc.
                # But desc is specific — we sum over all ns[a]-1 choices of desc.
                # For each desc (ns[a]-1 options), slot a: exclude {e_a, desc} → f(ns[a], 2)
                count = max(0, ns[a] - 1)  # number of valid desc
                zp = pscale(count, pmul(f_must_swap_to_exclude(ns[a], 2), pw_a))
            else:
                # desc.key == key of slot d, desc ≠ e_d.
                # Slots: asc-slot a → must swap out e_a; desc-slot d → must not land on desc.
                # Since desc ≠ e_d (desc not in h), slot d: f_must_avoid(ns[d], 1)
                count = max(0, ns[d] - 1)  # number of valid desc at slot d
                pwab = p_without_ab(min(a,d), max(a,d))
                zp = pscale(count, pmul(pmul(
                    f_must_swap_to_exclude(ns[a], 1),
                    f_must_avoid_entering(ns[d], 1)),
                    pwab))
            Z_Hstar = padd(Z_Hstar, zp)
            tau_poly = padd(tau_poly, zp)  # G1 → S-type

    # G2: asc ∉ h, desc ∈ h (symmetric to G1, but Δ-type → subtract from tau)
    for d, e_d in enumerate(h_list):
        pw_d = p_without(d)

        # G2 asc.key not in h_keys
        zp = pscale(N_outside_keys, pmul(f_must_swap_to_exclude(ns[d], 1), pw_d))
        Z_Hstar = padd(Z_Hstar, zp)
        tau_poly = padd(tau_poly, pscale(-1, zp))  # Δ-type → negative tau

        for a, e_a in enumerate(h_list):
            if a == d:
                count = max(0, ns[d] - 1)
                zp = pscale(count, pmul(f_must_swap_to_exclude(ns[d], 2), pw_d))
            else:
                count = max(0, ns[a] - 1)
                pwab = p_without_ab(min(a,d), max(a,d))
                zp = pscale(count, pmul(pmul(
                    f_must_avoid_entering(ns[a], 1),
                    f_must_swap_to_exclude(ns[d], 1)),
                    pwab))
            Z_Hstar = padd(Z_Hstar, zp)
            tau_poly = padd(tau_poly, pscale(-1, zp))  # Δ-type

    # G3: asc ∈ h AND desc ∈ h (k² pairs including self-pairs)
    for a, e_a in enumerate(h_list):
        for d, e_d in enumerate(h_list):
            if a == d:
                # asc = desc = e_a (self-pair): exclude just e_a from slot a
                zp = pmul(f_must_swap_to_exclude(ns[a], 1), p_without(a))
            else:
                # Distinct slots: exclude e_a from slot a, exclude e_d from slot d
                pwab = p_without_ab(min(a,d), max(a,d))
                zp = pmul(pmul(
                    f_must_swap_to_exclude(ns[a], 1),
                    f_must_swap_to_exclude(ns[d], 1)),
                    pwab)
            Z_Hstar = padd(Z_Hstar, zp)
            # G3: both in h → entangled, not purely S or T → tau contribution 0

    return {
        'k':          k,
        'orbit_total': orbit_total,
        'Z_Hstar':    Z_Hstar,
        'tau':        tau_poly,
    }


# ── DependsOn temporal defect ─────────────────────────────────────────────────
#
# At bypass orbit position h', the DependsOn temporal defect is:
#
#   tau_0(h') = (N-k) * (A(h') - B)
#
# where:
#   A(h') = sum_{e' in h'} (n_key[e'.value] - [e'.value in h_keys])
#          = net "downward reach" of h' into the corpus
#   B = |{f not in h : f.value in h_keys}| = constant over orbit (h_keys fixed)
#   n_key[v] = number of corpus events with key == v
#
# Integrating over the bypass orbit gives tau(q) = (N-k) * (Z_A(q) - B * orbit_total(q)).
#
# Key insight: B is constant over the orbit (bypass swaps preserve keys).
# A(h') varies because e'.value changes with swaps, breaking the S/T symmetry
# that made the commutation-based tau vanish.
#
# Slot polynomial for the A-contribution at slot j:
#   w_j(q) = [nkv_j - hkv_j,  (SV_j - H_j) - (nkv_j - hkv_j)]
# where:
#   nkv_j = n_key[e_j.value]          (n_key of current event's value)
#   hkv_j = [e_j.value in h_keys]     (self-referential link indicator)
#   SV_j  = sum_{e': key=k_j} n_key[e'.value]   (total n_key sum over slot)
#   H_j   = |{e': key=k_j, e'.value in h_keys}| (self-ref count over slot)


def file_tau_depend(h_list: list, events_by_key: dict, n_key: dict,
                    events_by_value: dict, N: int) -> list:
    """
    DependsOn-based temporal defect polynomial tau(q) for carrier position h.
    Returns polynomial as list of coefficients [tau_0, tau_1, ...].
    """
    k = len(h_list)
    if k == 0:
        return [0]

    h_keys = frozenset(e.key for e in h_list)
    ns = [len(events_by_key.get(e.key, frozenset())) for e in h_list]

    # Unconstrained prefix/suffix products
    prefix = [[1]] * (k + 1)
    for i in range(k):
        prefix[i+1] = pmul(prefix[i], f_unconstrained(ns[i]))
    suffix = [[1]] * (k + 1)
    for i in range(k-1, -1, -1):
        suffix[i] = pmul(suffix[i+1], f_unconstrained(ns[i]))
    orbit_total = prefix[k]

    def p_without(a: int) -> list:
        return pmul(prefix[a], suffix[a+1])

    # Per-slot quantities
    nkv = []   # n_key[e_j.value]
    hkv = []   # 1 if e_j.value in h_keys else 0
    SV  = []   # sum of n_key[e'.value] for all e' at slot j
    H_  = []   # count of e' at slot j with e'.value in h_keys

    for e_j in h_list:
        sv = 0
        h_count = 0
        for e2 in events_by_key.get(e_j.key, frozenset()):
            sv += n_key.get(e2.value, 0)
            if e2.value in h_keys:
                h_count += 1
        SV.append(sv)
        H_.append(h_count)
        nkv.append(n_key.get(e_j.value, 0))
        hkv.append(1 if e_j.value in h_keys else 0)

    # Z_A(q) = sum_j w_j(q) * P_without(j)
    Z_A = [0]
    for j in range(k):
        c0 = nkv[j] - hkv[j]
        c1 = (SV[j] - H_[j]) - (nkv[j] - hkv[j])
        w_j = [c0, c1]
        Z_A = padd(Z_A, pmul(w_j, p_without(j)))

    # B = |{f not in h : f.value in h_keys}|
    #   = sum_{v in h_keys} events_by_value[v]  -  |{e in h : e.value in h_keys}|
    B  = sum(events_by_value.get(v, 0) for v in h_keys)
    B -= sum(1 for e in h_list if e.value in h_keys)

    # tau(q) = (N-k) * (Z_A(q) - B * orbit_total(q))
    tau_raw = padd(Z_A, pscale(-B, orbit_total))
    return pscale(N - k, tau_raw)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    file_positions: dict[str, frozenset] = {}
    for path in sorted(SPEC_DIR.rglob('*.md')):
        rel = str(path.relative_to(REPO_ROOT))
        fm  = parse_frontmatter(path.read_text(encoding='utf-8', errors='replace'))
        events = frozenset(Event(k, flatten(v)) for k, v in fm.items())
        if events:
            file_positions[rel] = events

    events_by_key: dict[str, frozenset] = defaultdict(frozenset)
    for h in file_positions.values():
        for e in h:
            events_by_key[e.key] = events_by_key[e.key] | {e}

    all_events = frozenset(e for h in file_positions.values() for e in h)
    N = len(all_events)

    # Auxiliary dicts for DependsOn tau
    events_by_value: dict[str, int] = defaultdict(int)
    for e in all_events:
        events_by_value[e.value] += 1
    n_key: dict[str, int] = {k: len(vs) for k, vs in events_by_key.items()}

    print(f'files={len(file_positions)}  unique-events={N}  unique-keys={len(events_by_key)}')
    print()

    # ── Per-file interval zeta ────────────────────────────────────────────────
    global_Zstar    = [0]
    global_tau_comm = [0]   # commutation-based tau (proved = 0)
    global_tau_dep  = [0]   # DependsOn-based tau (arrow of time)
    global_orbit    = [0]

    print('Per file (first 15 by event count):')
    print('  tau_0 = DependsOn temporal defect at bypass distance 0')
    shown = 0

    for rel, h in sorted(file_positions.items(), key=lambda x: len(x[1])):
        h_list = sorted(h, key=lambda e: e._s)

        res   = file_interval_zeta(h, events_by_key, N)
        tau_d = file_tau_depend(h_list, events_by_key, n_key, events_by_value, N)

        global_Zstar    = padd(global_Zstar,    res['Z_Hstar'])
        global_tau_comm = padd(global_tau_comm, res['tau'])
        global_tau_dep  = padd(global_tau_dep,  tau_d)
        global_orbit    = padd(global_orbit,    res['orbit_total'])

        if shown < 15:
            k       = res['k']
            zt      = ' + '.join(f'{c}q^{i}' for i,c in enumerate(res['Z_Hstar']) if c) or '0'
            tau0    = tau_d[0] if tau_d else 0
            orbit_sz = sum(res['orbit_total'])
            print(f'  k={k:2d}  orbit={orbit_sz:12d}  tau_0={tau0:+12d}  {rel}')
            print(f'         Z_H*(q) = {zt}')
            shown += 1

    print()
    print('Global Z_H*(q):')
    zt = ' + '.join(f'{c}q^{i}' for i,c in enumerate(global_Zstar) if c) or '0'
    print(f'  {zt}')

    print()
    print('Commutation tau(q) [proved = 0 by symmetry]:')
    tt = ' '.join(
        (f'+{c}q^{i}' if c >= 0 else f'{c}q^{i}')
        for i,c in enumerate(global_tau_comm) if c
    ) or '0'
    print(f'  {tt}')

    print()
    print('DependsOn tau(q) = (N-k)*(A(h\')-B) integrated over bypass orbit:')
    tt = ' '.join(
        (f'+{c}q^{i}' if c >= 0 else f'{c}q^{i}')
        for i,c in enumerate(global_tau_dep) if c
    ) or '0'
    print(f'  {tt}')

    phi = (1 + 5**0.5) / 2
    print()
    print('Z_H* ratio test (Ruelle zeta predicts convergence to phi = 1.618...):')
    prev = None
    for i, c in enumerate(global_Zstar):
        if c == 0: continue
        ratio = f'{c/prev:.5f}' if prev else '      -'
        flag = ' <-- phi' if prev and abs(c/prev - phi) < 0.01 else ''
        print(f'  r={i:2d}  Z[r]={c:25d}  ratio={ratio}{flag}')
        prev = c

    print()
    print('DependsOn tau ratio test (arrow of time -- target -1/phi^3 = -(sqrt5-2) = -0.382):')
    target = -(5**0.5 - 2)
    prev = None
    for i, c in enumerate(global_tau_dep):
        if c == 0: continue
        ratio = f'{c/prev:.5f}' if prev else '      -'
        flag = ' <-- -1/phi^3' if prev and abs(c/prev - target) < 0.05 else ''
        print(f'  r={i:2d}  tau[r]={c:+25d}  ratio={ratio}{flag}')
        prev = c


if __name__ == '__main__':
    main()
