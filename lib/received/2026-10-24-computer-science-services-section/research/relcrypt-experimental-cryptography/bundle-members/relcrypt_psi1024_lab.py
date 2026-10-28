#!/usr/bin/env python3
"""
RelCrypt-Ψ-1024 workbench
=========================

Hardcore weird RelMath-native research cipher.

This is NOT production cryptography.

Objects:
  RelPermPsi1024:
    1024-bit generalized-Feistel permutation.
    Round oracle is a FOUR/Gauge₂/K₄/D₄/settling/cohomology-inspired semantic observer.

  RelDuplexPsi:
    Duplex/AEAD-like mode derived from RelPermPsi1024.
    Encrypts by stream XOR, authenticates AD+ciphertext with a 256-bit tag.

Design rules:
  - 𝔽₂ does bit recurrence/diffusion.
  - Gauge₂={id,neg} masks inside monotone closure.
  - Full K₄/D₄ appear at semantic boundaries.
  - FOUR truth/inconsistency observers shape F and the tag.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import statistics
import struct
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Sequence, Tuple

MASK64 = (1 << 64) - 1
VERSION = "RelCrypt-Ψ-1024 hardcore-weird lab v0.1"


def u64(x: int) -> int:
    return x & MASK64


def rotl(x: int, r: int) -> int:
    r &= 63
    x &= MASK64
    return ((x << r) | (x >> (64 - r))) & MASK64 if r else x


def rotr(x: int, r: int) -> int:
    r &= 63
    x &= MASK64
    return ((x >> r) | (x << (64 - r))) & MASK64 if r else x


def bitselect(mask: int, a: int, b: int) -> int:
    mask &= MASK64
    return ((mask & a) | (~mask & b)) & MASK64


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
    x = seed & MASK64
    for _ in range(n):
        x = (x + 0x9E3779B97F4A7C15) & MASK64
        out.append(mix64(x))
    return out


def thue_morse_bit(n: int) -> int:
    return n.bit_count() & 1


def paperfold_bit(n: int) -> int:
    k = n + 1
    while (k & 1) == 0:
        k >>= 1
    return 1 if (k & 3) == 1 else 0


def collatz_spice(n: int, steps: int) -> int:
    x = (n | 1) & ((1 << 128) - 1)
    for _ in range(steps):
        x = (3 * x + 1) if (x & 1) else (x >> 1)
    return x


def aperiodic_word(index: int, domain: int) -> int:
    base = ((index + 1) * 0x9E3779B97F4A7C15) ^ (domain * 0xD1B54A32D192ED03)
    w = 0
    for j in range(64):
        n = (index + 1) * (j + 5) + domain * 131 + j * j * 3
        b = thue_morse_bit(n) ^ paperfold_bit(n + (index << 2)) ^ ((base >> (j & 63)) & 1)
        c = collatz_spice(n + domain + j, 2 + (j & 7))
        b ^= (c >> ((j + index + domain) & 15)) & 1
        w |= (b & 1) << j
    return mix64(w ^ base ^ rotl(base, (index + 17 * domain) & 63))


def make_constants(n: int, domain: int) -> List[int]:
    return [aperiodic_word(i, domain) for i in range(n)]


RC = make_constants(512, 0x505349)       # Ψ
IV = make_constants(16, 0x464F55524B34)  # FOURK4-ish
FCA = make_constants(256, 0x0FCA)
FLOW = make_constants(256, 0xF10A)
D4C = make_constants(256, 0xD4)


def bytes_to_words_le(data: bytes, nwords: int) -> List[int]:
    padded = data + b"\x00" * max(0, 8 * nwords - len(data))
    return list(struct.unpack("<" + "Q" * nwords, padded[:8 * nwords]))


def words_to_bytes_le(words: Sequence[int]) -> bytes:
    return struct.pack("<" + "Q" * len(words), *[w & MASK64 for w in words])


def xor_bytes(a: bytes, b: bytes) -> bytes:
    return bytes(x ^ y for x, y in zip(a, b))


def popcount(x: int) -> int:
    return (x & MASK64).bit_count()


def k4_action_bitsliced(P: int, N: int, M0: int, M1: int) -> Tuple[int, int]:
    """Full K₄ boundary action. M1 M0:
      00 id      (P,N)
      01 neg     (N,P)
      10 conf    (~N,~P)
      11 negConf (~P,~N)
    """
    P &= MASK64; N &= MASK64; M0 &= MASK64; M1 &= MASK64
    id_mask = (~M0 & ~M1) & MASK64
    neg_mask = (M0 & ~M1) & MASK64
    conf_mask = (~M0 & M1) & MASK64
    nc_mask = (M0 & M1) & MASK64
    outP = ((id_mask & P) | (neg_mask & N) | (conf_mask & (~N & MASK64)) | (nc_mask & (~P & MASK64))) & MASK64
    outN = ((id_mask & N) | (neg_mask & P) | (conf_mask & (~P & MASK64)) | (nc_mask & (~N & MASK64))) & MASK64
    return outP, outN


def gauge2_swap(P: int, N: int, G: int) -> Tuple[int, int]:
    """Gauge₂={id,neg}: per-lane swap."""
    return bitselect(G, N, P), bitselect(G, P, N)


def d4_order_swap_boundary(P: int, N: int, S: int) -> Tuple[int, int]:
    """D₄-ish order-swap boundary σ: (P,N)->(P,!N) on selected lanes."""
    return P & MASK64, bitselect(S, (~N) & MASK64, N)


def expand_count(c: int, domain: int, r: int) -> int:
    return mix64((c & 0x7F) ^ ((domain & 0xFFFF) << 16) ^ ((r & 0xFFFF) << 32) ^ RC[(domain + 11 * r) & 511])


def concept_fingerprint(T: int, F: int, TOP: int, BOT: int, r: int, j: int) -> int:
    """Tiny FCA-ish observer fingerprint from semantic predicates.

    We build "extent-like" masks from intersections of row predicates and rotated
    neighborhoods, then compress support counts and boundaries.
    """
    attrs = [
        T,
        F,
        TOP,
        BOT,
        T | TOP,
        F | TOP,
        T ^ rotl(TOP, 1),
        F ^ rotr(TOP, 1),
        (T & rotl(F, 3)) | (TOP & rotr(BOT, 5)),
        (BOT ^ rotl(T | F, 7)),
    ]
    acc = FCA[(r * 13 + j) & 255]
    for idx, a in enumerate(attrs):
        boundary = a ^ rotl(a, (idx * 7 + 1) & 63)
        acc ^= expand_count(popcount(a), 0xA0 + idx, r + j)
        acc ^= rotl(expand_count(popcount(boundary), 0xB0 + idx, r), (idx * 9 + j) & 63)
        acc = mix64(acc ^ rotl(a, (idx + r + j) & 63))
    return acc


def flow_energy_fingerprint(P: int, N: int, T: int, F: int, TOP: int, r: int, j: int) -> int:
    """Flow/curvature-inspired local-gradient fingerprint."""
    gradP = P ^ rotl(P, 1) ^ rotr(P, 3)
    gradN = N ^ rotl(N, 2) ^ rotr(N, 5)
    interface = (T ^ F) ^ rotl(TOP, 11) ^ rotr(TOP, 17)
    curvature = (gradP & rotl(gradN, 7)) ^ (interface & rotr(TOP, 13))
    energy = popcount(gradP) + 3 * popcount(gradN) + 5 * popcount(interface) + 7 * popcount(curvature)
    return mix64(FLOW[(r * 17 + j) & 255] ^ energy ^ rotl(curvature, (r + 3*j) & 63))


def semantic_oracle_psi(R: Sequence[int], r: int, rounds: int) -> List[int]:
    """512-bit -> 512-bit round oracle.

    R is the right half of a 1024-bit Feistel state: 8 x 64-bit words.
    """
    assert len(R) == 8
    R = [x & MASK64 for x in R]
    outs = [0] * 8
    global_mix = mix64(R[0] ^ rotl(R[1], 9) ^ rotr(R[2], 13) ^ R[7] ^ RC[(r * 19) & 511])
    for j in range(4):
        a = R[j]
        b = R[(j + 1) & 7]
        c = R[j + 4]
        d = R[(j + 3) & 7]
        e = R[(j + 5) & 7]
        f = R[(j + 6) & 7]
        rc0 = RC[(r * 23 + j * 5) & 511]
        rc1 = RC[(r * 23 + j * 5 + 1) & 511]
        rc2 = RC[(r * 23 + j * 5 + 2) & 511]

        # Lift to FOUR evidence planes.
        P = (a ^ rotl(b, 5 + 3*j) ^ rotr(e, 7 + j) ^ rc0 ^ global_mix) & MASK64
        N = (c ^ rotr(d, 11 + 5*j) ^ rotl(f, 3 + 2*j) ^ rc1 ^ rotl(global_mix, 17+j)) & MASK64

        # Gauge₂ internal mask: order-compatible swap only.
        G = (b ^ rotl(c, 13 + j) ^ rc2 ^ D4C[(r + j) & 255]) & MASK64
        P, N = gauge2_swap(P, N, G)

        # Three closure/observer pulses. This is deliberately lossy/non-invertible;
        # Feistel wraps it in an invertible permutation.
        for t in range(3):
            T = (P & ~N) & MASK64
            FF = (~P & N) & MASK64
            TOP = (P & N) & MASK64
            BOT = (~P & ~N) & MASK64

            # Positive monotone fires. OR makes it closure-like/inflationary.
            pos_fire = (
                rotl(T, 1 + t + j)
                | ((rotl(P, 7 + t) ^ rc0) & rotr(N, 9 + j + t))
                | (rotl(TOP, 15 + t) & ~BOT)
                | (rotl((T | TOP), 23 + t) & D4C[(r + 7*t + j) & 255])
            ) & MASK64

            neg_fire = (
                rotr(FF, 2 + t + j)
                | ((rotr(P, 6 + j + t) ^ rc1) & rotl(N, 5 + t))
                | (rotr(TOP, 19 + t) & ~BOT)
                | (rotr((FF | TOP), 29 + t) & D4C[(r + 11*t + j + 3) & 255])
            ) & MASK64

            top_boundary = (TOP ^ rotl(TOP, 1) ^ rotr(TOP, 3) ^ (T & rotr(FF, 5)) ^ (FF & rotl(T, 7))) & MASK64
            top_fire = (pos_fire & neg_fire) | rotl(TOP, 3 + t) | (top_boundary & (rc2 ^ rotl(global_mix, t + j + 1)))
            top_fire &= MASK64

            P = (P | pos_fire | top_fire) & MASK64
            N = (N | neg_fire | top_fire) & MASK64

            # Gauge₂ refresh after closure pulse.
            G2 = mix64(G ^ top_boundary ^ FLOW[(r * 31 + 5*t + j) & 255])
            P, N = gauge2_swap(P, N, G2)

        # Row observables after closure.
        T = (P & ~N) & MASK64
        FF = (~P & N) & MASK64
        TOP = (P & N) & MASK64
        BOT = (~P & ~N) & MASK64

        H = 0
        H ^= expand_count(popcount(T), 0x10 + j, r)
        H ^= rotl(expand_count(popcount(FF), 0x20 + j, r), 11)
        H ^= rotl(expand_count(popcount(TOP), 0x30 + j, r), 23)
        H ^= rotl(expand_count(popcount(TOP ^ rotl(TOP, 1)), 0x40 + j, r), 37)
        H ^= concept_fingerprint(T, FF, TOP, BOT, r, j)
        H ^= flow_energy_fingerprint(P, N, T, FF, TOP, r, j)
        H = mix64(H ^ global_mix)

        # Full K₄ semantic boundary whitening.
        M0 = (R[(j + 2) & 7] ^ rotl(H, 7 + j) ^ RC[(r * 29 + j) & 511]) & MASK64
        M1 = (R[(j + 6) & 7] ^ rotr(H, 13 + j) ^ RC[(r * 29 + j + 1) & 511]) & MASK64
        P, N = k4_action_bitsliced(P, N, M0, M1)

        # D₄ order-swap boundary sometimes, domain separated by round.
        S = (H ^ D4C[(r * 7 + j) & 255] ^ (MASK64 if ((r + j) & 1) else 0)) & MASK64
        P, N = d4_order_swap_boundary(P, N, S)

        # Final Boolean compression.
        Y0 = mix64(P ^ rotl(N, 17) ^ H ^ rc0 ^ R[(j + 7) & 7])
        Y1 = mix64(N ^ rotr(P, 19) ^ rotl(H, 31) ^ rc1 ^ R[(j + 4) & 7])
        outs[2*j] = Y0
        outs[2*j + 1] = Y1

    # Cross-word affine/nonlinear diffusion over oracle outputs.
    for i in range(8):
        outs[i] ^= rotl(outs[(i - 1) & 7], 7) ^ rotr(outs[(i + 2) & 7], 11) ^ RC[(r * 37 + i) & 511]
        outs[i] &= MASK64
    for i in range(8):
        outs[i] = mix64(outs[i] ^ (outs[(i + 1) & 7] & rotl(outs[(i + 3) & 7], 5)))
    return outs


@dataclass
class RelPermPsi1024:
    rounds: int = 18

    def permute_words(self, words: Sequence[int]) -> List[int]:
        if len(words) != 16:
            raise ValueError("RelPermPsi1024 state must be 16 words")
        L = [w & MASK64 for w in words[:8]]
        R = [w & MASK64 for w in words[8:]]
        for r in range(self.rounds):
            F = semantic_oracle_psi(R, r, self.rounds)
            L, R = R, [(L[i] ^ F[i]) & MASK64 for i in range(8)]
        return L + R

    def invert_words(self, words: Sequence[int]) -> List[int]:
        if len(words) != 16:
            raise ValueError("RelPermPsi1024 state must be 16 words")
        L = [w & MASK64 for w in words[:8]]
        R = [w & MASK64 for w in words[8:]]
        for r in reversed(range(self.rounds)):
            # Current state is (L_new=R_old, R_new=L_old^F(R_old)).
            R_old = L
            F = semantic_oracle_psi(R_old, r, self.rounds)
            L_old = [(R[i] ^ F[i]) & MASK64 for i in range(8)]
            L, R = L_old, R_old
        return L + R

    def permute_block(self, block: bytes) -> bytes:
        if len(block) != 128:
            raise ValueError("block must be 128 bytes")
        return words_to_bytes_le(self.permute_words(bytes_to_words_le(block, 16)))


def semantic_squeeze(state: Sequence[int], domain: int, nwords: int = 8) -> List[int]:
    S = [w & MASK64 for w in state]
    R = [S[(i * 2 + domain) & 15] ^ rotl(S[(i * 2 + 1) & 15], 9 + i) for i in range(8)]
    F = semantic_oracle_psi(R, domain & 31, 32)
    out = []
    for i in range(nwords):
        out.append(mix64(S[i] ^ F[i & 7] ^ rotl(S[(i + 8) & 15], 17 + i) ^ RC[(domain * 17 + i) & 511]))
    return out


@dataclass
class RelDuplexPsi:
    key: bytes
    nonce: bytes
    rounds: int = 18
    tag_len: int = 32

    def __post_init__(self):
        if len(self.key) < 16:
            raise ValueError("key must be at least 16 bytes")
        if len(self.nonce) < 8:
            raise ValueError("nonce must be at least 8 bytes")
        self.perm = RelPermPsi1024(self.rounds)

    def initial_state(self) -> List[int]:
        st = [IV[i] ^ RC[(i * 13) & 511] for i in range(16)]
        key_words = bytes_to_words_le(self.key, min(8, max(1, (len(self.key) + 7)//8)))
        nonce_words = bytes_to_words_le(self.nonce, min(4, max(1, (len(self.nonce) + 7)//8)))
        for i, w in enumerate(key_words):
            st[i & 15] ^= mix64(w ^ RC[(0x80 + i) & 511])
        for i, w in enumerate(nonce_words):
            st[(8 + i) & 15] ^= mix64(w ^ RC[(0xA0 + i) & 511])
        st[14] ^= len(self.key) * 0x0101010101010101
        st[15] ^= len(self.nonce) * 0x8080808080808081
        # Blank initialization.
        for i in range(24):
            st[0] ^= RC[(0xC0 + i) & 511] ^ i
            st = self.perm.permute_words(st)
        return st

    def absorb(self, st: List[int], data: bytes, domain: int) -> List[int]:
        rate = 64
        off = 0
        if not data:
            block = b"\x80" + b"\x00" * (rate - 2) + bytes([domain & 255])
            words = bytes_to_words_le(block, 8)
            for i in range(8):
                st[i] ^= words[i]
            st[8] ^= mix64(domain ^ len(data))
            return self.perm.permute_words(st)
        while off < len(data):
            chunk = data[off:off+rate]
            last = (off + rate >= len(data))
            if len(chunk) < rate:
                chunk = chunk + b"\x80" + b"\x00" * (rate - len(chunk) - 1)
            words = bytes_to_words_le(chunk, 8)
            for i in range(8):
                st[i] ^= words[i]
            if last:
                st[8] ^= mix64(domain ^ len(data) ^ 0x1BADF00D)
                st[15] ^= (domain << 56) & MASK64
            st = self.perm.permute_words(st)
            off += rate
        return st

    def keystream_block(self, st: Sequence[int], counter: int, domain: int) -> bytes:
        z = semantic_squeeze(st, domain ^ (counter & 0xFFFF), 8)
        z = [mix64(z[i] ^ counter ^ RC[(domain * 31 + i) & 511]) for i in range(8)]
        return words_to_bytes_le(z)

    def encrypt(self, plaintext: bytes, ad: bytes = b"") -> Tuple[bytes, bytes]:
        st = self.initial_state()
        st = self.absorb(st, b"RelCrypt-Psi-AEAD-v0.1", 0x01)
        st = self.absorb(st, ad, 0xAD)
        out = bytearray()
        rate = 64
        counter = 0
        for off in range(0, len(plaintext), rate):
            block = plaintext[off:off+rate]
            st[9] ^= mix64(counter ^ len(block) ^ 0xE11C7)
            st = self.perm.permute_words(st)
            ks = self.keystream_block(st, counter, 0xE0)
            ct = xor_bytes(block, ks[:len(block)])
            out.extend(ct)
            # Absorb ciphertext for authentication; decryptor has it too.
            padded = ct + b"\x80" + b"\x00" * (rate - len(ct) - 1) if len(ct) < rate else ct
            words = bytes_to_words_le(padded, 8)
            for i in range(8):
                st[i] ^= words[i]
            st[8] ^= mix64(0xC7 ^ len(block) ^ counter)
            counter += 1
        # Empty plaintext final absorption.
        if len(plaintext) == 0:
            st = self.absorb(st, b"", 0xC7)
        st[10] ^= mix64(len(plaintext) ^ (len(ad) << 32) ^ 0xF17A1)
        st = self.perm.permute_words(st)
        tag_words = semantic_squeeze(st, 0x7A6, max(4, (self.tag_len + 7)//8))
        tag = words_to_bytes_le(tag_words)[:self.tag_len]
        return bytes(out), tag

    def decrypt(self, ciphertext: bytes, tag: bytes, ad: bytes = b"") -> bytes:
        st = self.initial_state()
        st = self.absorb(st, b"RelCrypt-Psi-AEAD-v0.1", 0x01)
        st = self.absorb(st, ad, 0xAD)
        out = bytearray()
        rate = 64
        counter = 0
        for off in range(0, len(ciphertext), rate):
            block = ciphertext[off:off+rate]
            st[9] ^= mix64(counter ^ len(block) ^ 0xE11C7)
            st = self.perm.permute_words(st)
            ks = self.keystream_block(st, counter, 0xE0)
            pt = xor_bytes(block, ks[:len(block)])
            out.extend(pt)
            # Absorb ciphertext for auth, exactly as encryptor.
            padded = block + b"\x80" + b"\x00" * (rate - len(block) - 1) if len(block) < rate else block
            words = bytes_to_words_le(padded, 8)
            for i in range(8):
                st[i] ^= words[i]
            st[8] ^= mix64(0xC7 ^ len(block) ^ counter)
            counter += 1
        if len(ciphertext) == 0:
            st = self.absorb(st, b"", 0xC7)
        st[10] ^= mix64(len(ciphertext) ^ (len(ad) << 32) ^ 0xF17A1)
        st = self.perm.permute_words(st)
        tag_words = semantic_squeeze(st, 0x7A6, max(4, (self.tag_len + 7)//8))
        calc = words_to_bytes_le(tag_words)[:self.tag_len]
        if len(calc) != len(tag) or any(x ^ y for x, y in zip(calc, tag)):
            raise ValueError("authentication failed")
        return bytes(out)


# --- test/stat code ---

def bit_diff_bytes(a: bytes, b: bytes) -> int:
    return sum((x ^ y).bit_count() for x, y in zip(a, b))


def bit_diff_words(a: Sequence[int], b: Sequence[int]) -> int:
    return sum(((x ^ y) & MASK64).bit_count() for x, y in zip(a, b))


def entropy_bytes(data: bytes) -> float:
    if not data:
        return 0.0
    n = len(data)
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    ent = 0.0
    for c in counts:
        if c:
            p = c / n
            ent -= p * math.log2(p)
    return ent


def monobit_z(data: bytes) -> float:
    bits = len(data) * 8
    ones = sum(b.bit_count() for b in data)
    return (ones - bits / 2) / math.sqrt(bits / 4)


def chi_square_bytes(data: bytes) -> float:
    n = len(data)
    exp = n / 256
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    return sum((c - exp) ** 2 / exp for c in counts)


def serial_corr(data: bytes) -> float:
    if len(data) < 2:
        return 0.0
    xs = data[:-1]
    ys = data[1:]
    mx = sum(xs) / len(xs)
    my = sum(ys) / len(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    return num / (dx * dy) if dx and dy else 0.0


def runs_test_p_approx(data: bytes) -> float:
    bits = []
    for b in data:
        for i in range(8):
            bits.append((b >> i) & 1)
    n = len(bits)
    if n < 2:
        return 1.0
    pi = sum(bits) / n
    if abs(pi - 0.5) >= 2 / math.sqrt(n):
        return 0.0
    runs = 1 + sum(bits[i] != bits[i-1] for i in range(1, n))
    z = abs(runs - 2 * n * pi * (1 - pi)) / (2 * math.sqrt(2 * n) * pi * (1 - pi))
    return math.erfc(z / math.sqrt(2))


def linear_complexity_berlekamp_massey(bits: List[int]) -> int:
    n = len(bits)
    c = [0] * n; b = [0] * n
    c[0] = b[0] = 1
    L = 0; m = -1
    for N in range(n):
        d = bits[N]
        for i in range(1, L + 1):
            d ^= c[i] & bits[N - i]
        if d:
            t = c[:]
            for j in range(N - m, n):
                c[j] ^= b[j - (N - m)]
            if 2 * L <= N:
                L = N + 1 - L
                m = N
                b = t
    return L


def sample_bits(data: bytes, nbits: int) -> List[int]:
    out = []
    for b in data:
        for i in range(8):
            out.append((b >> i) & 1)
            if len(out) >= nbits:
                return out
    return out


def gf2_rank32_from_bytes(data: bytes, matrices: int = 128) -> dict:
    ranks = {}
    needed = matrices * 128
    words = []
    for i in range(0, min(len(data) // 4 * 4, needed * 4), 4):
        words.append(int.from_bytes(data[i:i+4], "little"))
    for m in range(min(matrices, len(words)//32)):
        rows = words[32*m:32*(m+1)]
        rank = gf2_rank(rows, 32)
        ranks[rank] = ranks.get(rank, 0) + 1
    return ranks


def gf2_rank(rows: List[int], width: int) -> int:
    rows = rows[:]
    rank = 0
    for col in reversed(range(width)):
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


def run_lab(sample_size: int = 65536, rounds_list: List[int] | None = None, seed: int = 0xC0FFEE) -> dict:
    if rounds_list is None:
        rounds_list = [10, 14, 18, 22]
    rng = random.Random(seed)
    key = bytes(rng.getrandbits(8) for _ in range(32))
    nonce = bytes(rng.getrandbits(8) for _ in range(16))
    ad = b"relcrypt psi hardcore weird ad"
    plaintext = bytes(rng.getrandbits(8) for _ in range(sample_size))
    zero = b"\x00" * sample_size
    results = {
        "version": VERSION,
        "sample_size": sample_size,
        "rounds": {},
        "reduced_round_perm_avalanche": {},
    }
    for rounds in rounds_list:
        perm = RelPermPsi1024(rounds)
        # inverse tests
        inv_ok = True
        for _ in range(64):
            st = [rng.getrandbits(64) for _ in range(16)]
            y = perm.permute_words(st)
            x = perm.invert_words(y)
            if [s & MASK64 for s in st] != x:
                inv_ok = False; break

        aead = RelDuplexPsi(key, nonce, rounds)
        t0 = time.perf_counter()
        ct, tag = aead.encrypt(plaintext, ad)
        enc_time = time.perf_counter() - t0
        pt = aead.decrypt(ct, tag, ad)
        roundtrip = pt == plaintext

        # Tamper tests
        tamper_ct = bytearray(ct); tamper_ct[0] ^= 1
        try:
            aead.decrypt(bytes(tamper_ct), tag, ad)
            tamper_ct_rejected = False
        except ValueError:
            tamper_ct_rejected = True
        tamper_tag = bytearray(tag); tamper_tag[0] ^= 1
        try:
            aead.decrypt(ct, bytes(tamper_tag), ad)
            tamper_tag_rejected = False
        except ValueError:
            tamper_tag_rejected = True

        # Keystream sample by encrypting zero.
        ct0, tag0 = aead.encrypt(zero, ad)
        # Key avalanche over ct+tag on zero plaintext.
        key2 = bytearray(key); key2[0] ^= 1
        ct_k, tag_k = RelDuplexPsi(bytes(key2), nonce, rounds).encrypt(zero, ad)
        key_av = bit_diff_bytes(ct0 + tag0, ct_k + tag_k) / (8 * (len(ct0) + len(tag0)))

        nonce2 = bytearray(nonce); nonce2[0] ^= 1
        ct_n, tag_n = RelDuplexPsi(key, bytes(nonce2), rounds).encrypt(zero, ad)
        nonce_av = bit_diff_bytes(ct0 + tag0, ct_n + tag_n) / (8 * (len(ct0) + len(tag0)))

        # AD avalanche tag only.
        ct_ad, tag_ad = RelDuplexPsi(key, nonce, rounds).encrypt(zero, ad + b"!")
        ad_tag_av = bit_diff_bytes(tag0, tag_ad) / (8 * len(tag0))

        # Permutation avalanche.
        diffs = []
        for _ in range(64):
            st = [rng.getrandbits(64) for _ in range(16)]
            idx = rng.randrange(1024)
            st2 = st[:]
            st2[idx//64] ^= 1 << (idx % 64)
            diffs.append(bit_diff_words(perm.permute_words(st), perm.permute_words(st2)))
        perm_av = statistics.mean(diffs)

        bits8192 = sample_bits(ct0, 8192)
        lc = linear_complexity_berlekamp_massey(bits8192)

        results["rounds"][str(rounds)] = {
            "perm_inverse_ok": inv_ok,
            "aead_roundtrip_ok": roundtrip,
            "tamper_ciphertext_rejected": tamper_ct_rejected,
            "tamper_tag_rejected": tamper_tag_rejected,
            "entropy": entropy_bytes(ct0),
            "monobit_z": monobit_z(ct0),
            "byte_chi_square": chi_square_bytes(ct0),
            "serial_corr": serial_corr(ct0),
            "runs_p_approx": runs_test_p_approx(ct0[:8192]),
            "linear_complexity_8192": lc,
            "matrix_rank32_distribution": gf2_rank32_from_bytes(ct0, matrices=128),
            "key_avalanche_fraction": key_av,
            "nonce_avalanche_fraction": nonce_av,
            "ad_tag_avalanche_fraction": ad_tag_av,
            "perm_avalanche_avg_bits": perm_av,
            "encrypt_speed_MBps": (len(plaintext) / (1024*1024)) / enc_time if enc_time > 0 else None,
            "tag_hex": tag.hex(),
        }

    # Reduced-round diffusion profile.
    for rounds in [1, 2, 3, 4, 6, 8, 10]:
        perm = RelPermPsi1024(rounds)
        diffs = []
        for _ in range(96):
            st = [rng.getrandbits(64) for _ in range(16)]
            idx = rng.randrange(1024)
            st2 = st[:]
            st2[idx//64] ^= 1 << (idx % 64)
            diffs.append(bit_diff_words(perm.permute_words(st), perm.permute_words(st2)))
        results["reduced_round_perm_avalanche"][str(rounds)] = {
            "avg": statistics.mean(diffs),
            "min": min(diffs),
            "max": max(diffs),
        }
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample-size", type=int, default=65536)
    ap.add_argument("--out", type=Path, default=Path("relcrypt_psi1024_results.json"))
    args = ap.parse_args()
    results = run_lab(args.sample_size)
    args.out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
