"""The Collatz settlement (RelMath.Closure.Collatz).

The Collatz map ``T(n) = n/2`` (``n`` even) ``= 3n+1`` (``n`` odd) is read in the
corpus as a **settling** whose fixed point is ``1``: every orbit is a settling
trajectory, the **stopping time** is the number of steps to settle, and the
Collatz conjecture is that *every* ``n ≥ 1`` settles to ``1``. This realizes the
dynamics (the attack surface — not a proof); the conjecture is verified up to a
bound, the hard part staying openly unsettled.
"""

from __future__ import annotations

from .affinetrace import orbit, reaches_terminal

__all__ = [
    "accelerated_reached_quiesces",
    "accelerated_reached_quiesces_iff_terminal",
    "accelerated_reached_set",
    "collatz_settlement",
    "collatz_step",
    "collatz_trajectory",
    "revisit_witness",
    "settlement_accumulates",
    "settles_to_one",
    "stopping_time",
    "syracuse_step",
    "syracuse_trajectory",
    "v2",
]


def collatz_step(n: int) -> int:
    """One Collatz step ``T(n)``: halve if even, else ``3n + 1``."""
    if n < 1:
        raise ValueError("the Collatz map is defined on positive integers")
    return n // 2 if n % 2 == 0 else 3 * n + 1


def collatz_trajectory(n: int, *, max_steps: int = 100_000) -> list[int]:
    """The settling trajectory ``n, T(n), T²(n), …`` until it reaches the fixed point ``1``."""
    traj = [n]
    while n != 1:
        n = collatz_step(n)
        traj.append(n)
        if len(traj) > max_steps:
            raise RuntimeError(f"no settlement within {max_steps} steps from the start")
    return traj


def stopping_time(n: int) -> int:
    """The total stopping time: the number of steps for ``n`` to settle to ``1``."""
    return len(collatz_trajectory(n)) - 1


def settles_to_one(n: int, *, max_steps: int = 100_000) -> bool:
    """Whether ``n`` settles to ``1`` (the Collatz conjecture for this ``n``)."""
    try:
        collatz_trajectory(n, max_steps=max_steps)
    except RuntimeError:
        return False
    return True


def accelerated_reached_set(seed: int, stage: int) -> frozenset[int]:
    """Values reached before ``stage`` by the accelerated affine-trace orbit.

    This is the executable shadow of Lean's ``reachedSet m k`` in
    ``RelMath.Closure.Collatz.Settlement``:

    ``reachedSet(m, 0) = empty`` and
    ``reachedSet(m, k+1) = reachedSet(m, k) union {orbit(m, k)}``.
    """
    if seed < 0:
        raise ValueError("the accelerated Collatz settlement is defined on naturals")
    if stage < 0:
        raise ValueError("the settlement stage must be nonnegative")
    return frozenset(orbit(seed, j) for j in range(stage))


def collatz_settlement(seed: int, stages: int) -> tuple[frozenset[int], ...]:
    """The finite prefix of the Collatz reached-set settlement.

    Entry ``k`` is ``accelerated_reached_set(seed, k)``. The carrier is a finite
    set of reached integers, matching the ``Cl = id`` settlement described in
    the Lean module rather than the ordinary unaccelerated trajectory list.
    """
    if stages < 0:
        raise ValueError("the number of settlement stages must be nonnegative")
    return tuple(accelerated_reached_set(seed, k) for k in range(stages + 1))


def settlement_accumulates(seed: int, stage: int) -> bool:
    """The discrete-frame law ``S(k+1) = S(k) union {orbit(seed, k)}``."""
    return accelerated_reached_set(seed, stage + 1) == (
        accelerated_reached_set(seed, stage) | {orbit(seed, stage)}
    )


def accelerated_reached_quiesces(seed: int, stage: int) -> bool:
    """Whether the reached-set settlement quiesces at ``stage``."""
    return accelerated_reached_set(seed, stage + 1) == accelerated_reached_set(seed, stage)


def revisit_witness(seed: int, stage: int) -> int | None:
    """Return a prior stage witnessing quiescence, if one exists.

    Lean proves ``ReachedQuiesces m k`` iff the current orbit value was reached
    at some ``j < k``. This function returns such a ``j`` when present.
    """
    if stage < 0:
        raise ValueError("the settlement stage must be nonnegative")
    current = orbit(seed, stage)
    for prior in range(stage):
        if orbit(seed, prior) == current:
            return prior
    return None


def accelerated_reached_quiesces_iff_terminal(seed: int, *, max_stage: int = 100_000) -> bool:
    """Bounded executable form of ``reachedQuiesces_iff_reachesTerminal``.

    For positive seeds, Lean proves that some reached-set quiescence stage exists
    exactly when the accelerated orbit reaches the terminal cycle ``{1, 2}``.
    The Python realization checks both sides within the same finite search
    window.
    """
    if seed < 1:
        raise ValueError("the terminal/quiescence bridge is stated for positive seeds")
    if max_stage < 0:
        raise ValueError("max_stage must be nonnegative")
    quiesces = any(accelerated_reached_quiesces(seed, k) for k in range(max_stage + 1))
    terminal = reaches_terminal(seed, max_steps=max_stage)
    return quiesces == terminal


def v2(n: int) -> int:
    """The 2-adic valuation ``v₂(n)`` — the exponent of 2 in ``n`` (the even cascade length).

    Satisfies ``v₂(2n) = 1 + v₂(n)``, ``v₂(odd) = 0``, and ``v₂(a·b) = v₂(a) + v₂(b)``.
    It is exactly the length of the even run the Syracuse map collapses after ``3n+1``.
    """
    if n == 0:
        raise ValueError("v₂(0) is infinite")
    k = 0
    m = abs(n)
    while m % 2 == 0:
        k += 1
        m //= 2
    return k


def syracuse_step(n: int) -> int:
    """The accelerated (Syracuse) map on odds: ``n ↦ (3n+1) / 2^(v₂(3n+1))`` — odd to odd.

    The affine-trace acceleration of Collatz: one odd step collapses the entire
    even cascade after ``3n+1`` into a single division by the 2-adic valuation.
    """
    if n < 1 or n % 2 == 0:
        raise ValueError("the Syracuse map is defined on positive odd integers")
    m = 3 * n + 1
    while m % 2 == 0:
        m //= 2
    return m


def syracuse_trajectory(n: int, *, max_steps: int = 100_000) -> list[int]:
    """The odd-only settling trajectory ``n, S(n), S²(n), …`` until it reaches ``1``."""
    traj = [n]
    while n != 1:
        n = syracuse_step(n)
        traj.append(n)
        if len(traj) > max_steps:
            raise RuntimeError(f"no settlement within {max_steps} odd steps")
    return traj
