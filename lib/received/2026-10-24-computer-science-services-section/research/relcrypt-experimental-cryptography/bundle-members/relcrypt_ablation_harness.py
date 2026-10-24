#!/usr/bin/env python3
"""
RelCrypt ablation + attack probe harness
=======================================

Research cipher / mathematical experiment. Not production cryptography.

Purpose:
  - ablate RelMath-inspired operators from the Ω/Φ branches
  - run reduced-round adversarial probes
  - identify which weird operators earn their place

Operators:
  Gauge₂ internal masking
  adjoint sandwich
  nuclear commutator
  Chu/FCA observer
  flow/ARX bridge
  full K₄ boundary whitening
  D₄-ish boundary swap

This file imports earlier generated workbenches from /mnt/data.
"""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Sequence, Tuple
import importlib.util, json, math, os, random, time, sys

ROOT = Path('/mnt/data')


def import_from(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, str(path))
    if spec is None or spec.loader is None:
        raise ImportError(path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

phi = import_from(ROOT / 'relcrypt_phi512_lab.py', 'relcrypt_phi512_lab')
om = import_from(ROOT / 'relcrypt_omega512_lab.py', 'relcrypt_omega512_lab')

MASK64 = (1 << 64) - 1

def u64(x: int) -> int:
    return x & MASK64

def hamming_words(a: Sequence[int], b: Sequence[int]) -> int:
    return sum(((x ^ y) & MASK64).bit_count() for x, y in zip(a, b))

def rot_state(s: Sequence[int], r: int) -> Tuple[int, ...]:
    return tuple(om.rotl(x, r) for x in s)

def random_state(rng: random.Random) -> Tuple[int, ...]:
    return tuple(rng.getrandbits(64) for _ in range(8))

def low_weight_state(bit_index: int) -> Tuple[int, ...]:
    w = bit_index // 64
    b = bit_index % 64
    s = [0] * 8
    s[w] = 1 << b
    return tuple(s)

def entropy_bytes(data: bytes) -> float:
    if not data:
        return 0.0
    counts = [0] * 256
    for x in data:
        counts[x] += 1
    h = 0.0
    n = len(data)
    for c in counts:
        if c:
            p = c / n
            h -= p * math.log2(p)
    return h

def byte_chi_square(data: bytes) -> float:
    if not data:
        return 0.0
    counts = [0] * 256
    for x in data:
        counts[x] += 1
    exp = len(data) / 256.0
    return sum((c - exp) ** 2 / exp for c in counts)

def monobit_z(data: bytes) -> float:
    if not data:
        return 0.0
    ones = sum(x.bit_count() for x in data)
    nbits = 8 * len(data)
    return (ones - nbits / 2.0) / math.sqrt(nbits / 4.0)

def serial_corr(data: bytes) -> float:
    if len(data) < 2:
        return 0.0
    xs = list(data)
    n = len(xs) - 1
    mx = sum(xs[:-1]) / n
    my = sum(xs[1:]) / n
    vx = sum((x - mx) ** 2 for x in xs[:-1])
    vy = sum((y - my) ** 2 for y in xs[1:])
    if vx == 0 or vy == 0:
        return 0.0
    cov = sum((xs[i] - mx) * (xs[i+1] - my) for i in range(n))
    return cov / math.sqrt(vx * vy)


def expand_count(c: int, domain: int, r: int, obs: int = 0) -> int:
    return om.expand_count(c, domain, r, obs)


@dataclass(frozen=True)
class Variant:
    name: str
    use_gauge2: bool = True
    use_adj: bool = True
    use_comm: bool = True
    use_chu: bool = True
    use_flowobs: bool = True
    use_k4: bool = True
    use_d4: bool = True
    use_bridge: bool = True
    use_arx: bool = True
    # if true, use Φ oracle instead of Ω-family oracle
    phi_base: bool = False


def observer_variant(P: int, N: int, r: int, salt: int, v: Variant) -> Tuple[int, int, int, int, int]:
    T, F, TOP, BOT = om.row_planes(P, N)
    edge_top = (TOP ^ om.rotl(TOP, 1) ^ om.rotr(TOP, 7) ^ (T & om.rotl(F, 3))) & MASK64
    interface = ((T & om.rotl(TOP, 11)) ^ (F & om.rotr(TOP, 13)) ^ (BOT & edge_top) ^ (T & om.rotr(F, 5))) & MASK64

    if v.use_adj:
        epn, enn, qboundary = om.adjoint_sandwich(P, N, r, salt)
    else:
        epn, enn, qboundary = 0, 0, 0

    if v.use_comm:
        curvP, curvN, curv = om.nuclear_commutator(P ^ epn, N ^ enn, r, salt ^ interface)
    else:
        curvP, curvN, curv = 0, 0, 0

    O = om.mix64(salt ^ edge_top ^ qboundary ^ curv ^ om.rc(r, 66))
    chu = om.chu_eval(P ^ curvP, N ^ curvN, O, r) if v.use_chu else 0

    ht, hf, hp, hb = om.popcount(T), om.popcount(F), om.popcount(TOP), om.popcount(BOT)
    H = (expand_count(ht, 0, r, salt)
         ^ expand_count(hf, 1, r, salt)
         ^ expand_count(hp, 2, r, salt)
         ^ expand_count(om.popcount(edge_top), 3, r, salt)
         ^ expand_count(om.popcount(qboundary), 4, r, salt)
         ^ om.mix64(curv ^ chu ^ om.rotl(interface, 17) ^ om.rc(r, 67))) & MASK64
    flow = om.mix64(edge_top ^ om.rotl(interface, 19) ^ om.rotr(qboundary, 23) ^ curv ^ om.rc(r, 68)) if v.use_flowobs else 0
    return H, flow, qboundary, curv, chu


def bool_core_variant(x0: int, x1: int, x2: int, x3: int, r: int, obs: int, v: Variant) -> Tuple[int, int, int, int]:
    if v.use_arx:
        return om.bool_core_omega(x0, x1, x2, x3, r, obs)
    # GF(2)-only fallback, intentionally weaker; useful to see ARX contribution.
    a = u64(x0 ^ om.rotl(x1, 5 + (obs & 7)) ^ om.rotr(x3, 11) ^ om.rc(r, 0) ^ obs)
    b = u64(x1 ^ om.rotl(x2, 13) ^ (x0 & om.rotr(x3, 17)) ^ om.rc(r, 1) ^ om.rotl(obs, 7))
    c = u64(x2 ^ om.rotr(x0, 19) ^ (x1 & om.rotl(x3, 23)) ^ om.rc(r, 2) ^ om.rotr(obs, 13))
    d = u64(x3 ^ om.rotl(x0 ^ x2, 29) ^ ((~x1 & MASK64) & om.rotr(x2, 31)) ^ om.rc(r, 3) ^ om.mix64(obs ^ r))
    a ^= om.rotl((b & c) ^ (obs & d), 9)
    b ^= om.rotr((c | d) ^ (obs & a), 15)
    c ^= om.rotl((a ^ d) ^ (b & obs), 27)
    d ^= om.rotr(((a & b) ^ (~c & MASK64)) ^ (obs | c), 35)
    return u64(a), u64(b), u64(c), u64(d)


def oracle_variant(words4: Sequence[int], r: int, v: Variant) -> Tuple[int, int, int, int]:
    if v.phi_base:
        return phi.semantic_pulse(words4, r)

    x0, x1, x2, x3 = [w & MASK64 for w in words4]
    P0 = u64(x0 ^ om.rotl(x1, 11) ^ om.rc(r, 4))
    N0 = u64(x2 ^ om.rotr(x3, 17) ^ om.rc(r, 5))
    H0, flow0, qb0, curv0, chu0 = observer_variant(P0, N0, r, x0 ^ x3, v)
    x0, x1, x2, x3 = bool_core_variant(x0, x1, x2, x3, r, H0 ^ flow0 ^ curv0 ^ chu0, v)

    P = u64(x0 ^ om.rotl(x1, (11 + 3*r) & 63) ^ H0 ^ qb0 ^ om.rc(r, 6))
    N = u64(x2 ^ om.rotr(x3, (17 + 5*r) & 63) ^ flow0 ^ curv0 ^ om.rc(r, 7))
    obs_acc = om.mix64(H0 ^ flow0 ^ qb0 ^ curv0 ^ chu0)

    for j in range(2):
        if v.use_gauge2:
            G = u64(x1 ^ om.rotl(x2, 9 + j) ^ om.rotr(obs_acc, 5 + j) ^ om.rc(r, 20 + j))
            P, N = om.gauge2_swap(P, N, G)
        if v.use_adj:
            eP, eN, qB = om.adjoint_sandwich(P, N, r + j, obs_acc)
        else:
            eP, eN, qB = 0, 0, 0
        H, flow, qboundary, curv, chu = observer_variant(P ^ eP, N ^ eN, r + j + 1, obs_acc, v)
        if v.use_comm:
            cP, cN, cMix = om.nuclear_commutator(P ^ qB, N ^ om.rotl(qB, 7), r + j, obs_acc ^ H)
        else:
            cP, cN, cMix = 0, 0, 0

        T, F, TOP, BOT = om.row_planes(P, N)
        pos_fire = (om.rotl(T, 1 + ((r+j)&7)) | (eP & om.rotr(N, 3+j)) | (BOT & om.rotl(flow, 5+j)) | (cP & om.rc(r, 40+j))) & MASK64
        neg_fire = (om.rotr(F, 2 + ((r+2*j)&7)) | (eN & om.rotl(P, 4+j)) | (BOT & om.rotr(H, 6+j)) | (cN & om.rc(r, 50+j))) & MASK64
        top_fire = ((pos_fire & neg_fire) | (om.rotl(TOP, 13+j) & om.rc(r, 60+j)) | (qboundary & cMix) | (chu & TOP)) & MASK64
        P = u64(P | pos_fire | top_fire)
        N = u64(N | neg_fire | top_fire)
        obs_acc = om.mix64(obs_acc ^ H ^ flow ^ qboundary ^ curv ^ chu ^ cMix)
        if v.use_gauge2:
            P, N = om.gauge2_swap(P, N, obs_acc ^ om.rotl(H, j + 1))

    T, F, TOP, BOT = om.row_planes(P, N)
    H, flow, qboundary, curv, chu = observer_variant(P, N, r + 7, obs_acc, v)

    if v.use_k4:
        M0 = u64(x0 ^ x2 ^ om.rotl(H, 7) ^ flow ^ om.rc(r, 90))
        M1 = u64(x1 ^ x3 ^ om.rotr(H, 11) ^ qboundary ^ curv ^ om.rc(r, 91))
        WP, WN = om.k4_action_bitsliced(P, N, M0, M1)
    else:
        WP, WN = P, N

    if v.use_d4:
        S = u64(om.rotl(chu, 3) ^ om.rc(r, 92))
        dP = om.bitselect(S, WP, WN ^ qboundary)
        dN = om.bitselect(S, WN, WP ^ curv)
    else:
        dP, dN = WP, WN

    if v.use_bridge:
        bridge0 = om.mix64(x0 ^ om.rotl(x1, 17) ^ om.rotr(x2, 29) ^ x3 ^ om.rc(r, 100))
        bridge1 = om.mix64(x1 ^ om.rotl(x2, 19) ^ om.rotr(x3, 31) ^ x0 ^ om.rc(r, 101))
        bridge2 = om.mix64(x2 ^ om.rotl(x3, 23) ^ om.rotr(x0, 37) ^ x1 ^ om.rc(r, 102))
        bridge3 = om.mix64(x3 ^ om.rotl(x0, 27) ^ om.rotr(x1, 41) ^ x2 ^ om.rc(r, 103))
    else:
        bridge0 = bridge1 = bridge2 = bridge3 = 0

    y0 = om.mix64(x0 ^ dP ^ om.rotl(H, 13) ^ (T & om.rotr(dN, 5)) ^ bridge0)
    y1 = om.mix64(x1 ^ dN ^ om.rotr(flow, 7) ^ (F & om.rotl(dP, 3)) ^ bridge1)
    y2 = om.mix64(x2 ^ (dP & dN) ^ om.rotl(qboundary, 23) ^ (TOP | curv) ^ bridge2)
    y3 = om.mix64(x3 ^ ((dP | dN) & om.rc(r, 104)) ^ om.rotr(chu, 11) ^ (BOT ^ obs_acc) ^ bridge3)
    return y0, y1, y2, y3


PERM_MAPS = om.PERM_MAPS

def apply_perm(s: Sequence[int], mapping: Sequence[int]) -> List[int]:
    return [s[i] for i in mapping]

def undo_perm(s: Sequence[int], mapping: Sequence[int]) -> List[int]:
    old = [0] * len(mapping)
    for new_i, old_i in enumerate(mapping):
        old[old_i] = s[new_i]
    return old

@dataclass
class RelPermAblation512:
    variant: Variant
    rounds: int = 12

    def permute(self, state: Sequence[int]) -> Tuple[int, ...]:
        s = [w & MASK64 for w in state]
        if len(s) != 8:
            raise ValueError('state must have 8 words')
        for r in range(self.rounds):
            L, R = s[:4], s[4:]
            Fw = oracle_variant(R, r, self.variant)
            s = R + [u64(L[i] ^ Fw[i]) for i in range(4)]
            s = apply_perm(s, PERM_MAPS[r & 3])
        return tuple(s)

    def inverse(self, state: Sequence[int]) -> Tuple[int, ...]:
        s = [w & MASK64 for w in state]
        for r in reversed(range(self.rounds)):
            s = undo_perm(s, PERM_MAPS[r & 3])
            R_old, R_new = s[:4], s[4:]
            Fw = oracle_variant(R_old, r, self.variant)
            L_old = [u64(R_new[i] ^ Fw[i]) for i in range(4)]
            s = L_old + R_old
        return tuple(s)


def inverse_test(perm: RelPermAblation512, trials: int, rng: random.Random) -> bool:
    for _ in range(trials):
        s = random_state(rng)
        if perm.inverse(perm.permute(s)) != s:
            return False
    return True


def avalanche_probe(perm: RelPermAblation512, samples: int, flips_per_sample: int, rng: random.Random) -> Dict[str, float]:
    vals = []
    for _ in range(samples):
        s = random_state(rng)
        y = perm.permute(s)
        bits = rng.sample(range(512), flips_per_sample)
        for bit in bits:
            w, b = divmod(bit, 64)
            s2 = list(s)
            s2[w] ^= 1 << b
            y2 = perm.permute(s2)
            vals.append(hamming_words(y, y2))
    return {'avg': sum(vals)/len(vals), 'min': min(vals), 'max': max(vals)}


def low_weight_probe(perm: RelPermAblation512, bits: int = 64) -> Dict[str, float]:
    zero = (0,0,0,0,0,0,0,0)
    y0 = perm.permute(zero)
    vals = []
    # stride through 512 bits to control cost
    for bit in range(0, 512, max(1, 512 // bits)):
        s = low_weight_state(bit)
        y = perm.permute(s)
        vals.append(hamming_words(y0, y))
    return {'avg': sum(vals)/len(vals), 'min': min(vals), 'max': max(vals)}


def rotational_probe(perm: RelPermAblation512, samples: int, rng: random.Random, rotations: Sequence[int] = (1,7,13,31)) -> Dict[str, float]:
    vals = []
    # Compare P(rot(s)) to rot(P(s)); ideal distance around 256 for 512-bit states.
    for _ in range(samples):
        s = random_state(rng)
        y = perm.permute(s)
        for r in rotations:
            yr = perm.permute(rot_state(s, r))
            vals.append(hamming_words(yr, rot_state(y, r)))
    return {'avg': sum(vals)/len(vals), 'min': min(vals), 'max': max(vals)}


def branch_zero_probe(perm: RelPermAblation512, samples: int, rng: random.Random) -> Dict[str, float]:
    # States with L=0, random R. Test whether output half has bias/diffusion collapse.
    weights = []
    eqpairs = 0
    for _ in range(samples):
        R = [rng.getrandbits(64) for _ in range(4)]
        y = perm.permute((0,0,0,0,*R))
        weights.append(sum(w.bit_count() for w in y))
        if y[:4] == y[4:]:
            eqpairs += 1
    return {'avg_weight': sum(weights)/len(weights), 'min_weight': min(weights), 'max_weight': max(weights), 'equal_halves': eqpairs}


def keystream_bytes(variant: Variant, rounds: int, nbytes: int, key: bytes, nonce: bytes) -> bytes:
    # local stream using ablation permutation and Φ-like initialization/filter
    perm = RelPermAblation512(variant, rounds)
    kw = phi.bytes_to_words_le(key, 4)
    nw = phi.bytes_to_words_le(nonce, 2)
    s = [0]*8
    for i in range(4):
        s[i] = kw[i] ^ phi.IV_WORDS[i]
    s[4] = nw[0] ^ phi.IV_WORDS[4]
    s[5] = nw[1] ^ phi.IV_WORDS[5]
    s[6] = 0x52454C41424C4154 ^ phi.IV_WORDS[6]
    s[7] = 0x41424C41544E7631 ^ phi.IV_WORDS[7]
    for i in range(4):
        s[6] ^= phi.ROUND_CONSTANTS[(i*2) % len(phi.ROUND_CONSTANTS)]
        s[7] ^= phi.ROUND_CONSTANTS[(i*2+1) % len(phi.ROUND_CONSTANTS)]
        s = list(perm.permute(s))
    base = tuple(s)
    blocks = []
    ctr = 0
    while len(blocks)*64 < nbytes:
        st = list(base)
        st[6] ^= ctr & MASK64
        st[7] ^= phi.mix64(ctr ^ 0xAB1A7100AB1A7100)
        out = perm.permute(st)
        z = []
        for i in range(8):
            a,b,c = out[i], out[(i+3)&7], out[(i+5)&7]
            z.append(phi.mix64(a ^ phi.rotl(b,17) ^ phi.rotr(c,29) ^ phi.ROUND_CONSTANTS[(ctr+i) % len(phi.ROUND_CONSTANTS)]))
        blocks.append(phi.words_to_bytes_le(z))
        ctr += 1
    return b''.join(blocks)[:nbytes]


def stream_stats(variant: Variant, rounds: int, nbytes: int, rng: random.Random) -> Dict[str, float]:
    key = rng.randbytes(32)
    nonce = rng.randbytes(16)
    t0 = time.perf_counter()
    ks = keystream_bytes(variant, rounds, nbytes, key, nonce)
    dt = max(time.perf_counter() - t0, 1e-9)
    # key avalanche: flip first bit
    k2 = bytearray(key); k2[0] ^= 1
    ks2 = keystream_bytes(variant, rounds, min(nbytes, 2048), bytes(k2), nonce)
    ks1 = ks[:len(ks2)]
    key_av = sum((a^b).bit_count() for a,b in zip(ks1,ks2)) / (8*len(ks2))
    return {
        'entropy': entropy_bytes(ks),
        'chi2': byte_chi_square(ks),
        'monobit_z': monobit_z(ks),
        'serial_corr': serial_corr(ks),
        'speed_MB_s': (nbytes/(1024*1024))/dt,
        'key_avalanche': key_av,
    }


def run_ablation(rounds: int = 12, nbytes: int = 4096, seed: int = 20260624) -> Dict:
    variants = [
        Variant('phi_baseline', phi_base=True),
        Variant('omega_full'),
        Variant('no_gauge2', use_gauge2=False),
        Variant('no_adjoint', use_adj=False),
        Variant('no_commutator', use_comm=False),
        Variant('no_chu_fca', use_chu=False),
        Variant('no_flow_observer', use_flowobs=False),
        Variant('no_k4_boundary', use_k4=False),
        Variant('no_d4_boundary', use_d4=False),
        Variant('no_flow_bridge', use_bridge=False),
        Variant('gf2_only_core', use_arx=False),
        Variant('flow_bridge_only', use_gauge2=False, use_adj=False, use_comm=False, use_chu=False, use_flowobs=False, use_k4=False, use_d4=False, use_bridge=True, use_arx=True),
    ]
    rng = random.Random(seed)
    out = {
        'meta': {
            'rounds': rounds,
            'stream_bytes_per_variant': nbytes,
            'seed': seed,
            'note': 'Research ablation harness; smoke probes only, not security validation.',
        },
        'variants': []
    }
    for v in variants:
        vrng = random.Random(rng.getrandbits(64))
        perm = RelPermAblation512(v, rounds)
        t0 = time.perf_counter()
        inv = inverse_test(perm, trials=16, rng=vrng)
        av = avalanche_probe(perm, samples=3, flips_per_sample=8, rng=vrng)
        lw = low_weight_probe(perm, bits=64)
        rot = rotational_probe(perm, samples=6, rng=vrng)
        bz = branch_zero_probe(perm, samples=12, rng=vrng)
        ss = stream_stats(v, rounds, nbytes, vrng)
        elapsed = time.perf_counter() - t0
        # simple red-flag score: lower is better. Penalize low mins and rotational deviation.
        score = 0.0
        score += abs(av['avg'] - 256) / 8
        score += max(0, 220 - av['min']) / 8
        score += abs(lw['avg'] - 256) / 8
        score += max(0, 180 - lw['min']) / 8
        score += abs(rot['avg'] - 256) / 8
        score += max(0, 180 - rot['min']) / 8
        score += abs(ss['key_avalanche'] - 0.5) * 100
        score += max(0, abs(ss['monobit_z']) - 3) * 2
        out['variants'].append({
            'name': v.name,
            'inverse': inv,
            'perm_avalanche': av,
            'low_weight': lw,
            'rotational': rot,
            'branch_zero': bz,
            'stream': ss,
            'probe_seconds': elapsed,
            'red_flag_score': score,
        })
    out['variants'].sort(key=lambda x: x['red_flag_score'])
    return out


def main() -> None:
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--rounds', type=int, default=12)
    p.add_argument('--bytes', type=int, default=4096)
    p.add_argument('--out', type=Path, default=ROOT/'relcrypt_ablation_results.json')
    args = p.parse_args()
    res = run_ablation(args.rounds, args.bytes)
    args.out.write_text(json.dumps(res, indent=2), encoding='utf-8')
    print(json.dumps({
        'out': str(args.out),
        'rounds': args.rounds,
        'bytes': args.bytes,
        'ranking': [(v['name'], round(v['red_flag_score'], 3)) for v in res['variants']]
    }, indent=2))

if __name__ == '__main__':
    main()
