#!/usr/bin/env python3
"""
RelCrypt-Sigma-512

A research AEAD/stream encryption candidate derived from the RelCrypt Φ/Ω line.

Status: experimental cipher-design workbench, NOT production cryptography.

Core design:
- 512-bit generalized-Feistel permutation
- 24-round default
- 32-byte duplex rate, 32-byte capacity
- 256-bit key recommended, 128-bit nonce recommended
- 128-bit default authentication tag
- RelMath-inspired semantic oracle:
  * F2/ARX flow bridge
  * FOUR evidence planes P,N
  * Gauge2={id,neg} internal polarity mask
  * monotone closure pulse on scratch planes
  * balanced FOUR code (N,P,~P,~N), constant weight 2 per cell
  * truth/false/TOP/BOT observer fingerprint
  * adjoint-neighborhood boundary gap
  * full K4 boundary whitening
"""

from __future__ import annotations

import collections
import hashlib
import hmac
import math
import os
import random
import statistics
import struct
import time
from typing import Iterable, List, Tuple

MASK = (1 << 64) - 1

def rotl(x: int, r: int) -> int:
    r %= 64
    x &= MASK
    return ((x << r) & MASK) | (x >> (64 - r) if r else x)

def rotr(x: int, r: int) -> int:
    r %= 64
    x &= MASK
    return (x >> r) | ((x << (64 - r)) & MASK) if r else x

def split_words(b: bytes) -> List[int]:
    b = bytes(b)
    if len(b) % 8:
        raise ValueError("byte length must be a multiple of 8")
    return list(struct.unpack("<" + "Q" * (len(b) // 8), b))

def words_bytes(words: Iterable[int]) -> bytes:
    ws = [w & MASK for w in words]
    return struct.pack("<" + "Q" * len(ws), *ws)

def xor_bytes(a: bytes, b: bytes) -> bytes:
    return bytes(x ^ y for x, y in zip(a, b))

def blake_words(label: bytes, n: int) -> List[int]:
    out = b""
    ctr = 0
    while len(out) < 8 * n:
        out += hashlib.blake2s(label + ctr.to_bytes(4, "little"), digest_size=32).digest()
        ctr += 1
    return split_words(out[: 8 * n])

RC = blake_words(b"RelCrypt-Sigma-512/rc-v1", 80)
IV = blake_words(b"RelCrypt-Sigma-512/iv-v1", 8)

def mix64(x: int) -> int:
    """SplitMix64-style nonlinear finalizer."""
    x &= MASK
    x ^= x >> 30
    x = (x * 0xBF58476D1CE4E5B9) & MASK
    x ^= x >> 27
    x = (x * 0x94D049BB133111EB) & MASK
    x ^= x >> 31
    return x & MASK

def expand_count(c: int, dom: int = 0) -> int:
    """Domain-separated expansion of a small observer count into 64 bits."""
    x = (c & 0xFFFF) | ((dom & 0xFF) << 16) | 0x9E3779B97F4A7C15
    return mix64(x ^ rotl((x * 0xD6E8FEB86659FD93) & MASK, (dom * 7 + 13) % 64))

def gauge2_swap(P: int, N: int, G: int) -> Tuple[int, int]:
    """Gauge2={id,neg}: lane-wise optional swap of positive/negative evidence planes."""
    t = (P ^ N) & G
    return (P ^ t) & MASK, (N ^ t) & MASK

def k4_boundary(P: int, N: int, swapmask: int, compmask: int) -> Tuple[int, int]:
    """
    Full K4 boundary whitening.

    swapmask=0/1, compmask=0/1 per bit lane:
      00 id       (P,N)
      10 neg      (N,P)
      01 negConf  (~P,~N)
      11 conf     (~N,~P)
    """
    t = (P ^ N) & swapmask
    P ^= t
    N ^= t
    P ^= compmask
    N ^= compmask
    return P & MASK, N & MASK

def exists_nb(X: int, a: int, b: int) -> int:
    return (X | rotl(X, a) | rotr(X, b)) & MASK

def forall_nb(X: int, a: int, b: int) -> int:
    return (X & rotl(X, a) & rotr(X, b)) & MASK

def semantic_oracle_sigma(words7: List[int], rc: int, r: int) -> int:
    """
    RelMath-inspired nonlinear Feistel oracle.

    Inputs are seven 64-bit words from the generalized Feistel right side.
    Output is one 64-bit word xored into the left branch.

    The oracle is intentionally many-to-one; generalized Feistel supplies invertibility.
    """
    a, b, c, d, e, f, g = [w & MASK for w in words7]

    # Mandatory F2/ARX flow bridge: preserves raw dependency paths.
    flow = mix64((a + rotl(b, 7) + rc) & MASK)
    flow ^= rotl(c ^ ((d + 0x9E3779B97F4A7C15) & MASK), 17)
    flow = mix64(flow ^ rotr(e, 11) ^ rotl(f, 31) ^ g)

    # Lift to FOUR evidence planes.
    P = mix64(a ^ rotl(b, 5) ^ rotr(c, 13) ^ rc)
    N = mix64(d ^ rotl(e, 11) ^ rotr(f, 19) ^ ((g + rc) & MASK))

    # Internal order-compatible gauge mask: Gauge2={id,neg}.
    G = mix64(b ^ d ^ rotl(f, r + 3) ^ rc)
    P, N = gauge2_swap(P, N, G)

    # Scratch monotone closure pulse. It may saturate; it does not replace the whole state.
    PP, NN = P, N
    for j in range(2):
        T = PP & (~NN & MASK)
        Fp = (~PP & MASK) & NN
        TOP = PP & NN

        pos_fire = (
            rotl(T, 1 + j)
            | (rotl(PP, 5 + j) & rotr(NN, 7 + j))
            | (flow & exists_nb(TOP, 3 + j, 9 + j))
        ) & MASK

        neg_fire = (
            rotr(Fp, 1 + j)
            | (rotr(NN, 4 + j) & rotl(PP, 6 + j))
            | (rotl(flow, 11 + j) & exists_nb(TOP, 4 + j, 8 + j))
        ) & MASK

        top_fire = (
            (pos_fire & neg_fire)
            | rotl(TOP, 9 + j)
            | (exists_nb(T, 2 + j, 5 + j) & exists_nb(Fp, 3 + j, 7 + j))
        ) & MASK

        PP = (PP | pos_fire | top_fire) & MASK
        NN = (NN | neg_fire | top_fire) & MASK

    T = PP & (~NN & MASK)
    Fp = (~PP & MASK) & NN
    TOP = PP & NN
    BOT = (~PP & MASK) & (~NN & MASK)

    # Balanced FOUR code planes: (N, P, ~P, ~N), weight 2 per cell.
    B0, B1, B2, B3 = NN, PP, (~PP) & MASK, (~NN) & MASK
    balanced_mix = (B0 ^ rotl(B1, 13) ^ rotl(B2, 29) ^ rotl(B3, 47)) & MASK

    # Adjoint-neighborhood sandwich: local possibility vs local necessity gap.
    adjT = exists_nb(T, 2 + (r % 5), 7 + (r % 9)) ^ forall_nb(T, 2 + (r % 5), 7 + (r % 9))
    adjTop = exists_nb(TOP, 3 + (r % 7), 11 + (r % 5)) ^ forall_nb(TOP, 3 + (r % 7), 11 + (r % 5))

    # Chu/FCA-style observer fingerprint over row predicates.
    O = mix64(flow ^ balanced_mix ^ rotl(rc, r % 64))
    hT = (T & O).bit_count()
    hF = (Fp & rotl(O, 17)).bit_count()
    hTop = (TOP & rotr(O, 23)).bit_count()
    hBot = (BOT & (O ^ rotl(O, 31))).bit_count()

    rel = 0
    rel |= (hT > hF) << 0
    rel |= (hTop > hBot) << 1
    rel |= ((hT + hTop) > (hF + hBot)) << 2
    rel |= ((hTop ^ hBot) & 1) << 3
    rel |= ((hT + 2 * hTop) > 48) << 4

    fp = (
        expand_count(hT, 0)
        ^ expand_count(hF, 1)
        ^ expand_count(hTop, 2)
        ^ expand_count(hBot, 3)
        ^ expand_count(rel, 4)
    )

    # Full K4 boundary whitening.
    swapmask = mix64(fp ^ a ^ e ^ rc)
    compmask = mix64(rotl(fp, 19) ^ b ^ g ^ flow)
    WP, WN = k4_boundary(PP, NN, swapmask, compmask)

    # Fold back into F2 state. Flow bridge remains mandatory.
    bridge = mix64(flow ^ ((a + rotl(d, 23) + rc) & MASK) ^ (c & rotl(g, 7)))
    z = bridge
    z ^= mix64(WP ^ rotl(WN, 7) ^ balanced_mix)
    z ^= mix64(adjT ^ rotl(adjTop, 17) ^ fp)
    z ^= mix64((T ^ rotl(Fp, 9) ^ rotl(TOP, 21) ^ rotr(BOT, 5)) & MASK)
    return z & MASK

def sigma_perm(state: List[int], rounds: int = 24) -> List[int]:
    """512-bit generalized-Feistel permutation over eight 64-bit words."""
    st = [w & MASK for w in state]
    if len(st) != 8:
        raise ValueError("state must have eight 64-bit words")
    for r in range(rounds):
        rc = RC[r % len(RC)] ^ (((r + 1) * 0x9E3779B97F4A7C15) & MASK)
        F = semantic_oracle_sigma(st[1:], rc, r)
        st = st[1:] + [(st[0] ^ F) & MASK]
    return st

def sigma_inv(state: List[int], rounds: int = 24) -> List[int]:
    """Inverse of sigma_perm."""
    st = [w & MASK for w in state]
    if len(st) != 8:
        raise ValueError("state must have eight 64-bit words")
    for r in reversed(range(rounds)):
        rc = RC[r % len(RC)] ^ (((r + 1) * 0x9E3779B97F4A7C15) & MASK)
        old_tail = st[:7]
        F = semantic_oracle_sigma(old_tail, rc, r)
        old0 = st[7] ^ F
        st = [old0 & MASK] + old_tail
    return st

def pad_block(block: bytes, rate: int = 32) -> bytes:
    if len(block) > rate:
        raise ValueError("block too long")
    out = bytearray(rate)
    out[: len(block)] = block
    out[len(block)] ^= 0x80
    out[-1] ^= len(block) & 0xFF
    return bytes(out)

def init_state(key: bytes, nonce: bytes, rounds: int = 24) -> List[int]:
    key = bytes(key)
    nonce = bytes(nonce)
    seed = hashlib.blake2s(
        b"RelCrypt-Sigma-512 init"
        + len(key).to_bytes(2, "little")
        + key
        + len(nonce).to_bytes(2, "little")
        + nonce,
        digest_size=32,
    ).digest()
    ext = hashlib.blake2s(seed + key + nonce + b"ext", digest_size=32).digest()
    material = seed + ext
    st = IV[:]
    mwords = split_words(material[:64])
    st = [(st[i] ^ mwords[i]) & MASK for i in range(8)]
    for i in range(4):
        st[0] ^= (0x5349474D415F494E ^ i) & MASK
        st = sigma_perm(st, rounds)
    return st

def absorb_block(st: List[int], block: bytes, domain: int, rounds: int = 24, rate: int = 32) -> List[int]:
    if len(block) != rate:
        raise ValueError("absorb block must equal rate")
    st = st[:]
    st[0] ^= domain
    for i, w in enumerate(split_words(block)):
        st[i] ^= w
    return sigma_perm(st, rounds)

def encrypt(key: bytes, nonce: bytes, ad: bytes, plaintext: bytes, rounds: int = 24, tag_len: int = 16, rate: int = 32) -> Tuple[bytes, bytes]:
    """Encrypt and authenticate. Returns (ciphertext, tag)."""
    st = init_state(key, nonce, rounds)
    ad = bytes(ad)
    plaintext = bytes(plaintext)

    st[0] ^= len(ad) & MASK
    st[1] ^= len(plaintext) & MASK

    for off in range(0, len(ad), rate):
        block = ad[off : off + rate]
        dom = 0xA0 if len(block) == rate else 0xA1
        st = absorb_block(st, block if len(block) == rate else pad_block(block, rate), dom, rounds, rate)

    out = bytearray()
    for off in range(0, len(plaintext), rate):
        st = sigma_perm(st, rounds)
        ks = words_bytes(st[: rate // 8])
        block = plaintext[off : off + rate]
        ct = xor_bytes(block, ks[: len(block)])
        out += ct

        absorb = bytearray(rate)
        absorb[: len(ct)] = ct
        if len(ct) < rate:
            absorb[len(ct)] ^= 0x80
            absorb[-1] ^= len(ct) & 0xFF
            dom = 0xC1
        else:
            dom = 0xC0

        st[0] ^= dom
        for i, w in enumerate(split_words(bytes(absorb))):
            st[i] ^= w

    st[0] ^= 0xF0
    st[1] ^= len(ad) & MASK
    st[2] ^= len(plaintext) & MASK
    st = sigma_perm(st, rounds)
    tag = words_bytes(st)[:tag_len]
    return bytes(out), tag

def decrypt(key: bytes, nonce: bytes, ad: bytes, ciphertext: bytes, tag: bytes, rounds: int = 24, tag_len: int = 16, rate: int = 32) -> bytes:
    """Verify and decrypt. Raises ValueError on authentication failure."""
    st = init_state(key, nonce, rounds)
    ad = bytes(ad)
    ciphertext = bytes(ciphertext)

    st[0] ^= len(ad) & MASK
    st[1] ^= len(ciphertext) & MASK

    for off in range(0, len(ad), rate):
        block = ad[off : off + rate]
        dom = 0xA0 if len(block) == rate else 0xA1
        st = absorb_block(st, block if len(block) == rate else pad_block(block, rate), dom, rounds, rate)

    out = bytearray()
    for off in range(0, len(ciphertext), rate):
        st = sigma_perm(st, rounds)
        ks = words_bytes(st[: rate // 8])
        block = ciphertext[off : off + rate]
        pt = xor_bytes(block, ks[: len(block)])
        out += pt

        absorb = bytearray(rate)
        absorb[: len(block)] = block
        if len(block) < rate:
            absorb[len(block)] ^= 0x80
            absorb[-1] ^= len(block) & 0xFF
            dom = 0xC1
        else:
            dom = 0xC0

        st[0] ^= dom
        for i, w in enumerate(split_words(bytes(absorb))):
            st[i] ^= w

    st[0] ^= 0xF0
    st[1] ^= len(ad) & MASK
    st[2] ^= len(ciphertext) & MASK
    st = sigma_perm(st, rounds)
    goodtag = words_bytes(st)[:tag_len]
    if not hmac.compare_digest(goodtag, tag):
        raise ValueError("authentication failed")
    return bytes(out)

# --- small local diagnostics ---

def entropy(data: bytes) -> float:
    n = len(data)
    cnt = collections.Counter(data)
    return -sum((c / n) * math.log2(c / n) for c in cnt.values()) if n else 0.0

def chi_square(data: bytes) -> float:
    n = len(data)
    exp = n / 256
    cnt = collections.Counter(data)
    return sum(((cnt.get(i, 0) - exp) ** 2) / exp for i in range(256))

def monobit_z(data: bytes) -> float:
    bits = sum(b.bit_count() for b in data)
    nbits = 8 * len(data)
    return (bits - nbits / 2) / math.sqrt(nbits / 4)

def bit_diff_bytes(a: bytes, b: bytes) -> int:
    return sum((x ^ y).bit_count() for x, y in zip(a, b))

def bit_diff_words(a: List[int], b: List[int]) -> int:
    return sum(((x ^ y) & MASK).bit_count() for x, y in zip(a, b))

def self_test() -> None:
    for rounds in [12, 16, 20, 24]:
        for _ in range(20):
            s = [random.getrandbits(64) for _ in range(8)]
            p = sigma_perm(s, rounds)
            assert sigma_inv(p, rounds) == [w & MASK for w in s]
        key = os.urandom(32)
        nonce = os.urandom(16)
        ad = os.urandom(19)
        pt = os.urandom(333)
        ct, tag = encrypt(key, nonce, ad, pt, rounds=rounds)
        assert decrypt(key, nonce, ad, ct, tag, rounds=rounds) == pt
        try:
            bad = bytearray(ct)
            bad[0] ^= 1
            decrypt(key, nonce, ad, bad, tag, rounds=rounds)
            raise AssertionError("tamper accepted")
        except ValueError:
            pass
    print("RelCrypt-Sigma-512 self-test passed")

if __name__ == "__main__":
    self_test()
