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
# # The closure hierarchy of wire protocols
#
# *The same bilattice-and-regime lens, lifted from static documents to interactions.*
#
# A **file format** classifies a static value by the closure that settles its bytes
# to meaning. A **wire protocol** classifies an *interaction over time*. So the
# regime axis moves from *closure-of-a-value* (a fixpoint) to *orbit-class-of-a-
# session* (a dynamics). The same four regimes recur — but read as the session's
# orbit, not a document's fixpoint.
#
# **Claim.** A protocol *contract* occupies three orthogonal coordinates:
#
# 1. a **content corner** ⟨push, shared-world⟩ — the Belnap bilattice **4**, the
#    *same* ⟨addressability, assertivity⟩ axes as files but read at the interaction
#    level (push = the peer is addressable; shared-world = the session asserts a
#    standing context);
# 2. a **session-orbit regime** — strict (one-shot) ⊂ scott (monotone stream) ⊂
#    transfinite (bounded bidirectional) ⊂ aperiodic (open, never-settling);
# 3. a **message regime** — the *file-format* completion regime of each payload.
#
# Two findings: the session regime is **non-monotone in ≤ₖ** (CRDT-sync is ⊤@scott
# while TELNET is ⊤@aperiodic — same corner), and the message and session regimes
# are **independent**, so **file formats are exactly the `session = strict` slice
# of protocols.**
#
# Verified through `pymetrologic`; nothing depends on the 561-group corpus. The aperiodic
# regime (κ≥ω₁) is not ℕ-representable (see `pymetrologic.ordinal`), so it is recorded by
# the session-halting argument, not computed.

# %%
from pymetrologic import BL, four, of_nat, omega, regime_of_ord

B = four()


def charge(x: BL[int]) -> tuple[int, int]:
    return (x.pro, x.con)


def leqK(a: tuple[int, int], b: tuple[int, int]) -> bool:
    return a[0] <= b[0] and a[1] <= b[1]


# %% [markdown]
# ## 1. The content corner ⟨push, shared-world⟩ is the Belnap 4
#
# `pro = push` (can the server address the client unprompted?), `con = world`
# (does the session carry a standing mutable shared context?).

# %%
CORNER = {
    "http-req-resp": charge(B.none),  # ⟨0,0⟩ no push, no world
    "sse": charge(B.true),  # ⟨1,0⟩ push, no world (append-only event stream)
    "ftp-control": charge(B.false),  # ⟨0,1⟩ no push, stateful client-driven session
    "websocket-rpc": charge(B.conflict),  # ⟨1,1⟩ push + shared world
    "crdt-sync": charge(B.conflict),  # ⟨1,1⟩ push + shared (monotone) world
    "telnet": charge(B.conflict),  # ⟨1,1⟩ push + open shared world
    "mud": charge(B.conflict),  # ⟨1,1⟩
}
assert CORNER["http-req-resp"] == (0, 0)
assert CORNER["sse"] == (1, 0) and CORNER["ftp-control"] == (0, 1)
assert all(CORNER[p] == (1, 1) for p in ("websocket-rpc", "crdt-sync", "telnet", "mud"))
print("corners:", CORNER)

# %% [markdown]
# ## 2. The session-orbit regime tower
#
# The regime is the supremum of session orbit-complexity the contract admits:
# `strict` one-shot, `scott` (κ=ω) monotone stream, `transfinite` bounded
# bidirectional, `aperiodic` (κ≥ω₁) open and never-settling.

# %%
SESSION = {
    "http-req-resp": "strict",  # settles in one round-trip
    "sse": "scott",  # monotone append-only stream → ω-limit (CALM)
    "ftp-control": "transfinite",  # stateful, bounded, terminates
    "websocket-rpc": "transfinite",  # bounded bidirectional with close handshake
    "crdt-sync": "scott",  # push + shared world, but MONOTONE merge → coordination-free
    "telnet": "aperiodic",  # open NVT interactive session, never settles
    "mud": "aperiodic",  # persistent never-settling world
}
SESSION_COST = {"strict": 0, "scott": 1, "transfinite": 2, "aperiodic": 3}

# anchor the two computable regimes against pymetrologic's ordinal classifier
assert regime_of_ord(of_nat(1)) == "strict-finite"  # one-shot
assert regime_of_ord(omega) == "scott"  # the monotone-stream limit κ=ω
print("session regimes:", SESSION)

# %% [markdown]
# ## 3. SSE is the protocol-RDF: the scott / monotone / coordination-free cell
#
# The cross-domain law is not "same corner" but "scott = monotone everywhere": RDF
# triples (files) and SSE events (protocols) are the same regime — append-only,
# order-independent, CALM.

# %%
assert SESSION["sse"] == "scott"
# an append-only event log merges order-independently (a grow-only set), like RDF:
events_a = frozenset({("e", 1), ("e", 2)})
events_b = frozenset({("e", 2), ("e", 3)})
assert (events_a | events_b) == (events_b | events_a)  # commutative monotone merge
print("SSE event-merge is order-independent (scott/CALM), the protocol-RDF")

# %% [markdown]
# ## 4. The ⊤ corner is multiply occupied — session regime is non-monotone in ≤ₖ
#
# `crdt-sync`, `websocket-rpc`, `telnet` all commit to ⊤ ⟨push, world⟩ yet settle
# at scott, transfinite, aperiodic respectively. So ascending ≤ₖ does not fix the
# cost: there is no single ladder, exactly as for files (RDF@scott vs HTML@turing).

# %%
top = [(p, SESSION[p]) for p in CORNER if CORNER[p] == (1, 1)]
assert {"scott", "transfinite", "aperiodic"} <= {r for _, r in top}

GRID = {p: (CORNER[p], SESSION[p]) for p in CORNER}
pairs = [((a, ra), (b, rb)) for (a, ra) in GRID.values() for (b, rb) in GRID.values()]
lowers = any(
    leqK(a, b) and a != b and SESSION_COST[rb] < SESSION_COST[ra] for (a, ra), (b, rb) in pairs
)
raises = any(
    leqK(a, b) and a != b and SESSION_COST[rb] > SESSION_COST[ra] for (a, ra), (b, rb) in pairs
)
assert lowers and raises, "session regime is non-monotone in ≤_k"
# witness: http ⊥ ≤_k crdt-sync ⊤ raises (strict→scott); crdt-sync ⊤ shares ≤_k with
# telnet ⊤ but settles cheaper — the multiply-occupied top.
assert leqK((0, 0), (1, 1)) and SESSION_COST["strict"] < SESSION_COST["scott"]
print("⊤ occupied at:", sorted({r for _, r in top}), "— non-monotone in ≤_k:", lowers and raises)

# %% [markdown]
# ## 5. Protocol upgrade is a ≤ₖ-edge; the session-halting invariant
#
# `HTTP Upgrade: websocket` adds both push and shared-world to a stateless request —
# a ≤ₖ-monotone edge (⊥ → ⊤). And a protocol has a decidable "is the session done?"
# predicate **iff its regime is not aperiodic**: TELNET/MUD sessions never settle.

# %%
assert leqK(CORNER["http-req-resp"], CORNER["websocket-rpc"])  # Upgrade climbs ≤_k


def session_completion_decidable(regime: str) -> bool:
    return regime != "aperiodic"


assert session_completion_decidable(SESSION["http-req-resp"])
assert session_completion_decidable(SESSION["sse"])  # end-of-stream is observable
assert session_completion_decidable(SESSION["websocket-rpc"])  # close handshake
assert not session_completion_decidable(SESSION["telnet"])  # the session halting problem
print("Upgrade is a ≤_k-edge; session-completion decidable iff regime ≠ aperiodic")

# %% [markdown]
# ## 6. Two regime axes — files are the `session = strict` slice
#
# Each message carries its own completion regime (the file-format regime of the
# payload). It is independent of the session regime: the same payload regime occurs
# under different sessions, and the same session under different payload regimes.

# %%
# (corner, session_regime, message_regime)
PROTO = {
    "http+rmn": ((0, 0), "strict", "scott"),  # one-shot, total RMN body
    "http+js": ((0, 0), "strict", "turing"),  # one-shot, Turing JS body
    "telnet+rmn": ((1, 1), "aperiodic", "scott"),  # open session, total RMN commands
}

# independence A: same corner & session, different message regime (http+rmn vs http+js)
assert PROTO["http+rmn"][:2] == PROTO["http+js"][:2]
assert PROTO["http+rmn"][2] != PROTO["http+js"][2]
# independence B: same message regime, different session regime (http+rmn vs telnet+rmn)
assert PROTO["http+rmn"][2] == PROTO["telnet+rmn"][2] == "scott"
assert PROTO["http+rmn"][1] != PROTO["telnet+rmn"][1]
# files are the session = strict slice: a file format IS a protocol message at one-shot
file_formats = {k: v for k, v in PROTO.items() if v[1] == "strict"}
assert set(file_formats) == {"http+rmn", "http+js"}
print("message regime ⟂ session regime; file formats = the session=strict slice")
print("OK — all checks passed.")
