#!/usr/bin/env python3
"""
RelCrypt-Ω-512 workbench

Research cipher / mathematical experiment. Not production cryptography.

Ω is the post-repo-study branch:
  - Boolean-field 𝔽₂ core remains the bit engine.
  - FOUR evidence planes provide semantic geometry.
  - Gauge₂={id,neg} masks inside monotone closure fragments.
  - Full K₄ only appears as boundary whitening.
  - New RelMath-inspired layers:
      * hyperdoctrine-ish adjoint sandwich: ∃/∀ local neighborhood observers
      * nuclear commutator: controlled mismatch of two closure-like nuclei
      * Chu/FCA observer dual: state tested against an observer mask
      * flow bridge: raw 𝔽₂/ARX dependency preserved into every oracle output

Permutation: 512-bit generalized Feistel, state 8 × 64-bit words.
Stream mode: counter-mode squeeze; no raw permutation output is exposed.
"""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple
import argparse, json, math, random, time
from functools import lru_cache

MASK64 = (1 << 64) - 1


def u64(x: int) -> int:
    return x & MASK64


def rotl(x: int, r: int) -> int:
    r &= 63
    x &= MASK64
    return ((x << r) | (x >> ((64 - r) & 63))) & MASK64 if r else x


def rotr(x: int, r: int) -> int:
    r &= 63
    x &= MASK64
    return ((x >> r) | (x << ((64 - r) & 63))) & MASK64 if r else x


def bitselect(mask: int, a: int, b: int) -> int:
    mask &= MASK64
    return ((mask & a) | ((~mask & MASK64) & b)) & MASK64


def mix64(z: int) -> int:
    z &= MASK64
    z ^= z >> 30
    z = (z * 0xBF58476D1CE4E5B9) & MASK64
    z ^= z >> 27
    z = (z * 0x94D049BB133111EB) & MASK64
    z ^= z >> 31
    return z & MASK64


def splitmix_stream(seed: int, n: int) -> List[int]:
    out = []
    z = seed & MASK64
    for _ in range(n):
        z = (z + 0x9E3779B97F4A7C15) & MASK64
        out.append(mix64(z))
    return out


@lru_cache(maxsize=None)
def thue_word(n: int) -> int:
    # Thue-Morse bit b_i = parity(popcount(i+n)).
    x = 0
    for i in range(64):
        if ((i + n).bit_count() & 1):
            x |= 1 << i
    return x & MASK64


@lru_cache(maxsize=None)
def paperfold_word(n: int) -> int:
    # Deterministic low-cost paperfolding-ish word.
    x = 0
    for i in range(64):
        k = i + 1 + (n * 2 + 1)
        bit = ((k & -k) << 1) & k
        if bit != 0:
            x |= 1 << i
    return x & MASK64


@lru_cache(maxsize=None)
def collatz_word(n: int) -> int:
    # Tiny affine-trace-style recurrence for constants only.
    z = (2 * n + 1) & ((1 << 63) - 1)
    x = 0
    for i in range(64):
        if z & 1:
            x |= 1 << i
            z = 3 * z + 1
        else:
            z >>= 1
        z &= (1 << 63) - 1
        if z == 0:
            z = i + 1 + n
    return x & MASK64


RC_BASE = splitmix_stream(0x52454C4352595054 ^ 0x4F4D454741353132, 512)
IV_WORDS = splitmix_stream(0x52454C4352595054 ^ 0x4F4D454741495630, 8)


@lru_cache(maxsize=None)
def rc(r: int, domain: int = 0) -> int:
    z = RC_BASE[(r * 37 + domain * 101) & 511] ^ ((r & MASK64) * 0x9E3779B97F4A7C15) ^ ((domain & MASK64) * 0xD1B54A32D192ED03)
    return mix64(z ^ rotl(thue_word(r + domain), domain & 63) ^ rotr(paperfold_word(r ^ domain), (r + 7) & 63) ^ collatz_word((r + 1) * (domain + 1)))


def bytes_to_words_le(data: bytes, nwords: int) -> List[int]:
    d = data.ljust(nwords * 8, b"\x00")[:nwords*8]
    return [int.from_bytes(d[i*8:(i+1)*8], "little") for i in range(nwords)]


def words_to_bytes_le(words: Sequence[int]) -> bytes:
    return b"".join((w & MASK64).to_bytes(8, "little") for w in words)


def xor_bytes(a: bytes, b: bytes) -> bytes:
    return bytes(x ^ y for x, y in zip(a, b))


def popcount(x: int) -> int:
    return (x & MASK64).bit_count()


def expand_count(c: int, domain: int, r: int, obs: int = 0) -> int:
    z = (c & 0xFF) ^ ((domain & 0xFFFF) << 16) ^ ((r & 0xFFFF) << 32) ^ rotl(obs, (domain * 7 + 1) & 63) ^ rc(r, domain)
    return mix64(z)


def k4_action_bitsliced(P: int, N: int, M0: int, M1: int) -> Tuple[int, int]:
    """Full K₄ boundary action. selectors (M1,M0): 00 id, 01 neg, 10 conf, 11 negConf."""
    P &= MASK64; N &= MASK64; M0 &= MASK64; M1 &= MASK64
    id_mask = (~M0 & ~M1) & MASK64
    neg_mask = (M0 & ~M1) & MASK64
    conf_mask = (~M0 & M1) & MASK64
    nc_mask = (M0 & M1) & MASK64
    outP = ((id_mask & P) | (neg_mask & N) | (conf_mask & (~N & MASK64)) | (nc_mask & (~P & MASK64))) & MASK64
    outN = ((id_mask & N) | (neg_mask & P) | (conf_mask & (~P & MASK64)) | (nc_mask & (~N & MASK64))) & MASK64
    return outP, outN


def gauge2_swap(P: int, N: int, G: int) -> Tuple[int, int]:
    return bitselect(G, N, P), bitselect(G, P, N)


def row_planes(P: int, N: int) -> Tuple[int, int, int, int]:
    P &= MASK64; N &= MASK64
    T = P & (~N & MASK64)
    F = (~P & MASK64) & N
    TOP = P & N
    BOT = (~P & MASK64) & (~N & MASK64)
    return T, F, TOP, BOT


def exists_nb(X: int, a: int, b: int) -> int:
    return (X | rotl(X, a) | rotr(X, b)) & MASK64


def forall_nb(X: int, a: int, b: int) -> int:
    return (X & rotl(X, a) & rotr(X, b)) & MASK64


def adjoint_sandwich(P: int, N: int, r: int, salt: int) -> Tuple[int, int, int]:
    """Hyperdoctrine-ish local ∃/∀ observer.

    ∃ is OR over a local support; ∀ is AND over the same support. Their gap is a
    boundary-of-local-variation signal. This is an observer, not a proof of adjunction.
    """
    ep = exists_nb(P, 1 + (r & 7), 9 + ((salt >> 3) & 7))
    en = exists_nb(N, 2 + ((r >> 1) & 7), 11 + ((salt >> 8) & 7))
    ap = forall_nb(P, 3 + ((salt >> 13) & 7), 17 + (r & 7))
    an = forall_nb(N, 5 + ((salt >> 21) & 7), 19 + ((r >> 2) & 7))
    boundary = (ep ^ ap ^ rotl(en ^ an, 7) ^ ((ep & an) | (en & ap))) & MASK64
    return ep ^ rotl(ap, 13), en ^ rotr(an, 17), boundary


def k_nucleus(P: int, N: int, r: int, obs: int) -> Tuple[int, int]:
    """Knowledge-like monotone closure pulse on scratch planes."""
    T, F, TOP, BOT = row_planes(P, N)
    pos_fire = (rotl(T, 1 + (r & 7)) | (rotl(P, 7) & rotr(N, 3)) | (BOT & rotl(obs, 5)) | (TOP & rc(r, 31))) & MASK64
    neg_fire = (rotr(F, 2 + (r & 7)) | (rotr(N, 11) & rotl(P, 4)) | (BOT & rotr(obs, 9)) | (TOP & rc(r, 32))) & MASK64
    top_fire = ((pos_fire & neg_fire) | (rotl(TOP, 13) & rc(r, 33)) | ((P ^ rotr(N, 7)) & TOP)) & MASK64
    return (P | pos_fire | top_fire) & MASK64, (N | neg_fire | top_fire) & MASK64


def t_nucleus(P: int, N: int, r: int, obs: int) -> Tuple[int, int]:
    """Truth-like dual pulse.

    This intentionally uses a different closure-like geometry. It is not claimed to be
    the repo's truth closure; the commutator is a toy 'curvature' between two nuclei.
    """
    T, F, TOP, BOT = row_planes(P, N)
    # Truth side grows/reorients classical evidence, while TOP remains a gate.
    p_fire = (rotl(T | TOP, 5 + (r & 7)) ^ (BOT & rotl(obs, 17)) ^ (P & rotr(T, 3))) & MASK64
    n_fire = (rotr(F | TOP, 6 + ((r >> 1) & 7)) ^ (BOT & rotr(obs, 19)) ^ (N & rotl(F, 5))) & MASK64
    # Keep it evidence-like by ORing fired bits, not replacing.
    return (P | p_fire) & MASK64, (N | n_fire) & MASK64


def nuclear_commutator(P: int, N: int, r: int, obs: int) -> Tuple[int, int, int]:
    """Controlled noncommutation fingerprint between two closure-like nuclei."""
    kP, kN = k_nucleus(P, N, r, obs)
    ktP, ktN = t_nucleus(kP, kN, r + 1, rotl(obs, 7))
    tP, tN = t_nucleus(P, N, r, obs)
    tkP, tkN = k_nucleus(tP, tN, r + 1, rotr(obs, 11))
    curvP = (ktP ^ tkP) & MASK64
    curvN = (ktN ^ tkN) & MASK64
    curv = mix64(curvP ^ rotl(curvN, 23) ^ rc(r, 44))
    return curvP, curvN, curv


def chu_eval(P: int, N: int, O: int, r: int) -> int:
    """Chu/FCA-ish state/observer evaluation word."""
    T, F, TOP, BOT = row_planes(P, N)
    e0 = popcount(T & O)
    e1 = popcount(F & rotl(O, 7))
    e2 = popcount(TOP & rotr(O, 13))
    e3 = popcount(BOT & (O ^ rotl(O, 17)))
    bits = 0
    bits |= (e0 > e1) << 0
    bits |= (e2 > 16) << 1
    bits |= ((e0 + e2) > (e1 + e3)) << 2
    bits |= ((e0 ^ e1 ^ e2 ^ e3) & 1) << 3
    bits |= (popcount((T ^ F) & O) > 16) << 4
    bits |= (popcount((TOP ^ BOT) & rotl(O, 29)) > 16) << 5
    return mix64(bits ^ (e0 << 8) ^ (e1 << 16) ^ (e2 << 24) ^ (e3 << 32) ^ rc(r, 55))


def observer_omega(P: int, N: int, r: int, salt: int) -> Tuple[int, int, int, int, int]:
    T, F, TOP, BOT = row_planes(P, N)
    edge_top = (TOP ^ rotl(TOP, 1) ^ rotr(TOP, 7) ^ (T & rotl(F, 3))) & MASK64
    interface = ((T & rotl(TOP, 11)) ^ (F & rotr(TOP, 13)) ^ (BOT & edge_top) ^ (T & rotr(F, 5))) & MASK64
    epn, enn, qboundary = adjoint_sandwich(P, N, r, salt)
    curvP, curvN, curv = nuclear_commutator(P ^ epn, N ^ enn, r, salt ^ interface)
    O = mix64(salt ^ edge_top ^ qboundary ^ curv ^ rc(r, 66))
    chu = chu_eval(P ^ curvP, N ^ curvN, O, r)
    ht, hf, hp, hb = popcount(T), popcount(F), popcount(TOP), popcount(BOT)
    H = (expand_count(ht, 0, r, salt) ^ expand_count(hf, 1, r, salt) ^ expand_count(hp, 2, r, salt) ^
         expand_count(popcount(edge_top), 3, r, salt) ^ expand_count(popcount(qboundary), 4, r, salt) ^
         mix64(curv ^ chu ^ rotl(interface, 17) ^ rc(r, 67))) & MASK64
    flow = mix64(edge_top ^ rotl(interface, 19) ^ rotr(qboundary, 23) ^ curv ^ rc(r, 68))
    return H, flow, qboundary, curv, chu


def bool_core_omega(x0: int, x1: int, x2: int, x3: int, r: int, obs: int) -> Tuple[int, int, int, int]:
    """𝔽₂/ARX flow bridge. This prevents semantic saturation from deleting dependency."""
    a = u64(x0 ^ rotl(x1, 5 + (obs & 7)) ^ rotr(x3, 11) ^ rc(r, 0) ^ obs)
    b = u64(x1 ^ rotl(x2, 13) ^ (x0 & rotr(x3, 17)) ^ rc(r, 1) ^ rotl(obs, 7))
    c = u64(x2 ^ rotr(x0, 19) ^ (x1 & rotl(x3, 23)) ^ rc(r, 2) ^ rotr(obs, 13))
    d = u64(x3 ^ rotl(x0 ^ x2, 29) ^ ((~x1 & MASK64) & rotr(x2, 31)) ^ rc(r, 3) ^ mix64(obs ^ r))
    # Use modular additions as ARX-ish nonlinearity in addition to GF(2) operations.
    a = u64(a + rotl(b ^ obs, 3))
    b = u64(b + rotr(c ^ a, 7))
    c = u64(c + rotl(d ^ b, 17))
    d = u64(d + rotr(a ^ c ^ obs, 23))
    a ^= rotl((b & c) ^ (obs & d), 9)
    b ^= rotr((c | d) ^ (obs & a), 15)
    c ^= rotl((a ^ d) ^ (b & obs), 27)
    d ^= rotr(((a & b) ^ (~c & MASK64)) ^ (obs | c), 35)
    return u64(a), u64(b), u64(c), u64(d)


def semantic_oracle_omega(words4: Sequence[int], r: int) -> Tuple[int, int, int, int]:
    x0, x1, x2, x3 = [w & MASK64 for w in words4]

    # Initial FOUR projection and observer-law extraction.
    P0 = u64(x0 ^ rotl(x1, 11) ^ rc(r, 4))
    N0 = u64(x2 ^ rotr(x3, 17) ^ rc(r, 5))
    H0, flow0, qb0, curv0, chu0 = observer_omega(P0, N0, r, x0 ^ x3)

    # Observer mutates the law, but raw flow bridge stays alive.
    x0, x1, x2, x3 = bool_core_omega(x0, x1, x2, x3, r, H0 ^ flow0 ^ curv0 ^ chu0)

    P = u64(x0 ^ rotl(x1, (11 + 3*r) & 63) ^ H0 ^ qb0 ^ rc(r, 6))
    N = u64(x2 ^ rotr(x3, (17 + 5*r) & 63) ^ flow0 ^ curv0 ^ rc(r, 7))
    obs_acc = mix64(H0 ^ flow0 ^ qb0 ^ curv0 ^ chu0)

    # Two pruned semantic passes: less saturating than Ψ, more structured than Φ.
    for j in range(2):
        G = u64(x1 ^ rotl(x2, 9 + j) ^ rotr(obs_acc, 5 + j) ^ rc(r, 20 + j))
        P, N = gauge2_swap(P, N, G)

        # Hyperdoctrine-ish adjoint observer feeds closure support.
        eP, eN, qB = adjoint_sandwich(P, N, r + j, obs_acc)
        H, flow, qboundary, curv, chu = observer_omega(P ^ eP, N ^ eN, r + j + 1, obs_acc)
        cP, cN, cMix = nuclear_commutator(P ^ qB, N ^ rotl(qB, 7), r + j, obs_acc ^ H)

        # KLE-compatible closure fragment: OR-growth only.
        T, F, TOP, BOT = row_planes(P, N)
        pos_fire = (rotl(T, 1 + ((r+j)&7)) | (eP & rotr(N, 3+j)) | (BOT & rotl(flow, 5+j)) | (cP & rc(r, 40+j))) & MASK64
        neg_fire = (rotr(F, 2 + ((r+2*j)&7)) | (eN & rotl(P, 4+j)) | (BOT & rotr(H, 6+j)) | (cN & rc(r, 50+j))) & MASK64
        top_fire = ((pos_fire & neg_fire) | (rotl(TOP, 13+j) & rc(r, 60+j)) | (qboundary & cMix) | (chu & TOP)) & MASK64
        P = u64(P | pos_fire | top_fire)
        N = u64(N | neg_fire | top_fire)
        obs_acc = mix64(obs_acc ^ H ^ flow ^ qboundary ^ curv ^ chu ^ cMix)
        P, N = gauge2_swap(P, N, obs_acc ^ rotl(H, j + 1))

    T, F, TOP, BOT = row_planes(P, N)
    H, flow, qboundary, curv, chu = observer_omega(P, N, r + 7, obs_acc)

    # Full K₄ at the boundary only.
    M0 = u64(x0 ^ x2 ^ rotl(H, 7) ^ flow ^ rc(r, 90))
    M1 = u64(x1 ^ x3 ^ rotr(H, 11) ^ qboundary ^ curv ^ rc(r, 91))
    WP, WN = k4_action_bitsliced(P, N, M0, M1)

    # D4-ish order swap boundary action: keyed swap of P with N-complement shape.
    S = u64(rotl(chu, 3) ^ rc(r, 92))
    dP = bitselect(S, WP, WN ^ qboundary)
    dN = bitselect(S, WN, WP ^ curv)

    # Flow bridge: raw inputs explicitly survive into every output word.
    bridge0 = mix64(x0 ^ rotl(x1, 17) ^ rotr(x2, 29) ^ x3 ^ rc(r, 100))
    bridge1 = mix64(x1 ^ rotl(x2, 19) ^ rotr(x3, 31) ^ x0 ^ rc(r, 101))
    bridge2 = mix64(x2 ^ rotl(x3, 23) ^ rotr(x0, 37) ^ x1 ^ rc(r, 102))
    bridge3 = mix64(x3 ^ rotl(x0, 27) ^ rotr(x1, 41) ^ x2 ^ rc(r, 103))

    y0 = mix64(x0 ^ dP ^ rotl(H, 13) ^ (T & rotr(dN, 5)) ^ bridge0)
    y1 = mix64(x1 ^ dN ^ rotr(flow, 7) ^ (F & rotl(dP, 3)) ^ bridge1)
    y2 = mix64(x2 ^ (dP & dN) ^ rotl(qboundary, 23) ^ (TOP | curv) ^ bridge2)
    y3 = mix64(x3 ^ ((dP | dN) & rc(r, 104)) ^ rotr(chu, 11) ^ (BOT ^ obs_acc) ^ bridge3)
    return y0, y1, y2, y3


PERM_MAPS = [
    [1,3,2,0,5,7,6,4],
    [2,5,0,7,4,1,6,3],
    [3,0,6,1,7,2,4,5],
    [5,2,7,4,1,6,3,0],
]


def apply_perm(s: Sequence[int], mapping: Sequence[int]) -> List[int]:
    return [s[i] for i in mapping]


def undo_perm(s: Sequence[int], mapping: Sequence[int]) -> List[int]:
    old = [0] * len(mapping)
    for new_i, old_i in enumerate(mapping):
        old[old_i] = s[new_i]
    return old


@dataclass
class RelPermOmega512:
    rounds: int = 16

    def permute(self, state: Sequence[int]) -> Tuple[int, ...]:
        if len(state) != 8:
            raise ValueError("state must have 8 64-bit words")
        s = [w & MASK64 for w in state]
        for r in range(self.rounds):
            L = s[:4]
            R = s[4:]
            Fw = semantic_oracle_omega(R, r)
            s = R + [u64(L[i] ^ Fw[i]) for i in range(4)]
            s = apply_perm(s, PERM_MAPS[r & 3])
        return tuple(s)

    def inverse(self, state: Sequence[int]) -> Tuple[int, ...]:
        if len(state) != 8:
            raise ValueError("state must have 8 64-bit words")
        s = [w & MASK64 for w in state]
        for r in reversed(range(self.rounds)):
            s = undo_perm(s, PERM_MAPS[r & 3])
            R_old = s[:4]
            R_new = s[4:]
            Fw = semantic_oracle_omega(R_old, r)
            L_old = [u64(R_new[i] ^ Fw[i]) for i in range(4)]
            s = L_old + R_old
        return tuple(s)


class RelStreamOmega:
    def __init__(self, key: bytes, nonce: bytes, rounds: int = 16):
        if len(key) != 32:
            raise ValueError("key must be 32 bytes")
        if len(nonce) != 16:
            raise ValueError("nonce must be 16 bytes")
        self.rounds = rounds
        self.perm = RelPermOmega512(rounds=rounds)
        kw = bytes_to_words_le(key, 4)
        nw = bytes_to_words_le(nonce, 2)
        s = [0] * 8
        for i in range(4):
            s[i] = kw[i] ^ IV_WORDS[i] ^ rc(i, 110)
        s[4] = nw[0] ^ IV_WORDS[4] ^ rc(0, 111)
        s[5] = nw[1] ^ IV_WORDS[5] ^ rc(1, 111)
        s[6] = 0x52454C4F4D454741 ^ IV_WORDS[6] ^ rc(2, 111)
        s[7] = 0x4F42534552564552 ^ IV_WORDS[7] ^ rc(3, 111)
        for i in range(8):
            s[0] ^= rc(i, 120)
            s[3] ^= thue_word(i)
            s[6] ^= paperfold_word(i)
            s[7] ^= collatz_word(i)
            s = list(self.perm.permute(s))
        self.base_state = tuple(s)

    def block(self, counter: int) -> bytes:
        s = list(self.base_state)
        s[4] ^= mix64(counter ^ rc(counter & 255, 130))
        s[5] ^= counter & MASK64
        s[6] ^= mix64(counter ^ 0x4F4D454741435452 ^ rc(counter & 255, 131))
        s[7] ^= rotl(counter, 17) ^ rc(counter & 255, 132)
        out = self.perm.permute(s)
        # Filter, not raw permutation exposure.
        z = [0] * 8
        obs = mix64(counter ^ out[0] ^ rotl(out[4], 17) ^ out[7])
        for i in range(8):
            a, b, c, d = out[i], out[(i+3)&7], out[(i+5)&7], out[(i+6)&7]
            z[i] = mix64(a ^ rotl(b, 17) ^ rotr(c, 29) ^ (d & rotl(obs, i+1)) ^ rc(counter+i, 140))
            obs = mix64(obs ^ z[i] ^ rotl(a, i+3) ^ rotr(d, i+5))
        return words_to_bytes_le(z)

    def keystream(self, nbytes: int) -> bytes:
        blocks = []
        ctr = 0
        while len(blocks) * 64 < nbytes:
            blocks.append(self.block(ctr))
            ctr += 1
        return b"".join(blocks)[:nbytes]

    def crypt(self, data: bytes) -> bytes:
        return xor_bytes(data, self.keystream(len(data)))


# ---------------- tests and metrics ----------------

def bit_iter(data: bytes) -> Iterable[int]:
    for byte in data:
        for i in range(8):
            yield (byte >> i) & 1


def hamming_bytes(a: bytes, b: bytes) -> int:
    return sum((x ^ y).bit_count() for x, y in zip(a, b))


def entropy_bytes(data: bytes) -> float:
    if not data:
        return 0.0
    n = len(data)
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    h = 0.0
    for c in counts:
        if c:
            p = c / n
            h -= p * math.log2(p)
    return h


def byte_chi_square(data: bytes) -> float:
    if not data:
        return 0.0
    exp = len(data) / 256
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    return sum(((c - exp) ** 2) / exp for c in counts)


def monobit_z(data: bytes) -> float:
    bits = list(bit_iter(data))
    n = len(bits)
    ones = sum(bits)
    return (ones - n / 2) / math.sqrt(n / 4) if n else 0.0


def serial_corr_bytes(data: bytes) -> float:
    n = len(data)
    if n < 2:
        return 0.0
    xs = list(data)
    mean = sum(xs) / n
    num = sum((xs[i] - mean) * (xs[(i+1) % n] - mean) for i in range(n))
    den = sum((x - mean) ** 2 for x in xs)
    return num / den if den else 0.0


def runs_test_p_approx(data: bytes) -> float:
    bits = list(bit_iter(data))
    n = len(bits)
    if n < 2:
        return 1.0
    ones = sum(bits)
    pi = ones / n
    if abs(pi - 0.5) >= 2 / math.sqrt(n):
        return 0.0
    runs = 1 + sum(bits[i] != bits[i-1] for i in range(1, n))
    z = abs(runs - 2*n*pi*(1-pi)) / (2 * math.sqrt(2*n) * pi * (1-pi))
    return math.erfc(z)


def berlekamp_massey(bits: Sequence[int]) -> int:
    n = len(bits)
    c = [0] * n; b = [0] * n
    c[0] = 1; b[0] = 1
    L = 0; m = -1
    for N in range(n):
        d = bits[N]
        for i in range(1, L+1):
            d ^= c[i] & bits[N-i]
        if d == 1:
            t = c[:]
            shift = N - m
            for j in range(0, n - shift):
                c[j+shift] ^= b[j]
            if L <= N // 2:
                L = N + 1 - L
                m = N
                b = t
    return L


def gf2_rank_32(rows: List[int]) -> int:
    rows = [r & 0xFFFFFFFF for r in rows]
    rank = 0
    for col in reversed(range(32)):
        pivot = None
        for i in range(rank, len(rows)):
            if (rows[i] >> col) & 1:
                pivot = i; break
        if pivot is None:
            continue
        rows[rank], rows[pivot] = rows[pivot], rows[rank]
        for i in range(len(rows)):
            if i != rank and ((rows[i] >> col) & 1):
                rows[i] ^= rows[rank]
        rank += 1
    return rank


def matrix_rank_distribution(data: bytes, matrices: int = 64) -> dict:
    need = matrices * 128
    d = data[:need]
    out = {}
    for m in range(len(d) // 128):
        chunk = d[m*128:(m+1)*128]
        rows = [int.from_bytes(chunk[i*4:(i+1)*4], 'little') for i in range(32)]
        r = gf2_rank_32(rows)
        out[str(r)] = out.get(str(r), 0) + 1
    return out


def stream_metrics(rounds: int, sample_bytes: int, seed: int = 12345) -> dict:
    rng = random.Random(seed)
    key = rng.randbytes(32)
    nonce = rng.randbytes(16)
    st = RelStreamOmega(key, nonce, rounds)
    t0 = time.perf_counter()
    data = st.crypt(b"\x00" * sample_bytes)
    elapsed = time.perf_counter() - t0
    bits8192 = list(bit_iter(data[:1024]))
    return {
        'sample_bytes': sample_bytes,
        'rounds': rounds,
        'entropy_bits_per_byte': entropy_bytes(data),
        'monobit_z': monobit_z(data),
        'byte_chi_square_df255': byte_chi_square(data),
        'serial_corr_bytes': serial_corr_bytes(data),
        'runs_p_approx': runs_test_p_approx(data[:4096]),
        'linear_complexity_8192': berlekamp_massey(bits8192),
        'matrix_rank_32x32_distribution': matrix_rank_distribution(data, matrices=64),
        'speed_MB_s_pure_python': (sample_bytes / (1024*1024)) / elapsed if elapsed > 0 else None,
    }


def avalanche_metrics(rounds: int, nbytes: int = 8192, seed: int = 424242) -> dict:
    rng = random.Random(seed)
    key = bytearray(rng.randbytes(32)); nonce = bytearray(rng.randbytes(16))
    base = RelStreamOmega(bytes(key), bytes(nonce), rounds).crypt(b"\x00" * nbytes)
    key2 = bytearray(key); key2[0] ^= 1
    nonce2 = bytearray(nonce); nonce2[0] ^= 1
    k2 = RelStreamOmega(bytes(key2), bytes(nonce), rounds).crypt(b"\x00" * nbytes)
    n2 = RelStreamOmega(bytes(key), bytes(nonce2), rounds).crypt(b"\x00" * nbytes)
    total_bits = nbytes * 8
    return {
        'rounds': rounds,
        'sample_bytes': nbytes,
        'key_avalanche_fraction': hamming_bytes(base, k2) / total_bits,
        'nonce_avalanche_fraction': hamming_bytes(base, n2) / total_bits,
    }


def permutation_inverse_test(rounds: int, trials: int = 80, seed: int = 999) -> bool:
    rng = random.Random(seed)
    p = RelPermOmega512(rounds)
    for _ in range(trials):
        s = tuple(rng.getrandbits(64) for _ in range(8))
        if p.inverse(p.permute(s)) != s:
            return False
    return True


def permutation_avalanche(rounds: int, samples: int = 2, seed: int = 777) -> dict:
    rng = random.Random(seed)
    p = RelPermOmega512(rounds)
    distances = []
    for _ in range(samples):
        s = [rng.getrandbits(64) for _ in range(8)]
        base = p.permute(s)
        for wi in range(8):
            for bi in range(64):
                s2 = list(s); s2[wi] ^= 1 << bi
                out = p.permute(s2)
                distances.append(sum((base[i] ^ out[i]).bit_count() for i in range(8)))
    return {
        'rounds': rounds,
        'samples': samples,
        'flips': len(distances),
        'avg_changed_output_bits': sum(distances) / len(distances),
        'min_changed_output_bits': min(distances),
        'max_changed_output_bits': max(distances),
        'ideal_avg_changed_output_bits': 256,
    }


def rotational_symmetry_probe(rounds: int, trials: int = 16, seed: int = 20260624) -> dict:
    rng = random.Random(seed)
    p = RelPermOmega512(rounds)
    distances = []
    for _ in range(trials):
        s = [rng.getrandbits(64) for _ in range(8)]
        rot = 17
        srot = [rotl(x, rot) for x in s]
        out = p.permute(s)
        outrot = p.permute(srot)
        expected = [rotl(x, rot) for x in out]
        distances.append(sum((expected[i] ^ outrot[i]).bit_count() for i in range(8)))
    return {
        'rounds': rounds,
        'trials': trials,
        'avg_distance_from_rotational_symmetry_bits': sum(distances) / len(distances),
        'min_distance': min(distances),
        'max_distance': max(distances),
        'random_baseline_bits': 256,
    }


def low_weight_probe(rounds: int, seed: int = 314159) -> dict:
    rng = random.Random(seed)
    p = RelPermOmega512(rounds)
    s = [rng.getrandbits(64) for _ in range(8)]
    base = p.permute(s)
    one = []
    for idx in range(0, 512, 17):
        s2 = list(s); s2[idx // 64] ^= 1 << (idx & 63)
        out = p.permute(s2)
        one.append(sum((base[i] ^ out[i]).bit_count() for i in range(8)))
    four = []
    for _ in range(24):
        idxs = rng.sample(range(512), 4)
        s2 = list(s)
        for idx in idxs:
            s2[idx // 64] ^= 1 << (idx & 63)
        out = p.permute(s2)
        four.append(sum((base[i] ^ out[i]).bit_count() for i in range(8)))
    return {
        'rounds': rounds,
        'one_bit_avg_distance': sum(one) / len(one),
        'one_bit_min_distance': min(one),
        'one_bit_max_distance': max(one),
        'four_bit_avg_distance': sum(four) / len(four),
        'four_bit_min_distance': min(four),
        'four_bit_max_distance': max(four),
    }


def roundtrip_test(rounds: int, seed: int = 8888) -> bool:
    rng = random.Random(seed)
    key = rng.randbytes(32); nonce = rng.randbytes(16); msg = rng.randbytes(10000)
    c = RelStreamOmega(key, nonce, rounds).crypt(msg)
    m = RelStreamOmega(key, nonce, rounds).crypt(c)
    return m == msg


def run_suite(rounds_list: Sequence[int], sample_bytes: int, out_json: Path) -> dict:
    results = {'version': 'RelCrypt-Ω-512 lab v0.1', 'sample_bytes': sample_bytes, 'rounds': {}}
    for rounds in rounds_list:
        print(f"[RelCrypt-Ω] rounds={rounds}: inverse...")
        inv = permutation_inverse_test(rounds)
        rt = roundtrip_test(rounds)
        print(f"[RelCrypt-Ω] rounds={rounds}: stream metrics...")
        sm = stream_metrics(rounds, sample_bytes)
        print(f"[RelCrypt-Ω] rounds={rounds}: avalanche...")
        av = avalanche_metrics(rounds, sample_bytes)
        print(f"[RelCrypt-Ω] rounds={rounds}: perm avalanche...")
        pav = permutation_avalanche(rounds, samples=2)
        print(f"[RelCrypt-Ω] rounds={rounds}: symmetry + low weight...")
        rot = rotational_symmetry_probe(rounds)
        low = low_weight_probe(rounds)
        results['rounds'][str(rounds)] = {
            'permutation_inverse_passed': inv,
            'stream_roundtrip_passed': rt,
            'stream_metrics': sm,
            'stream_avalanche': av,
            'permutation_avalanche': pav,
            'rotational_symmetry_probe': rot,
            'low_weight_probe': low,
        }
    out_json.write_text(json.dumps(results, indent=2), encoding='utf-8')
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--sample-bytes', type=int, default=8192)
    parser.add_argument('--rounds', type=str, default='8,12,16,20')
    parser.add_argument('--out', type=Path, default=Path('/mnt/data/relcrypt_omega512_results.json'))
    args = parser.parse_args()
    rounds = [int(x) for x in args.rounds.split(',') if x.strip()]
    run_suite(rounds, args.sample_bytes, args.out)
    print(f"wrote {args.out}")


if __name__ == '__main__':
    main()
