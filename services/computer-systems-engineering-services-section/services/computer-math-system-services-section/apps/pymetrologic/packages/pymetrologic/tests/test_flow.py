"""The Lawvere–Laplacian diffusion flow (RelMath.Flow.LawvereLaplacianSpectralGap).

The Laplacian is a closure; the diffusion climbs to the harmonic (least fixed
point ≥ seed); the harmonic kernel is the degree-0 part.
"""

from __future__ import annotations

from collections.abc import Callable

from pymetrologic import (
    BL,
    diffusion,
    four,
    from_h0,
    h0_object,
    harmonic,
    harmonic_kernel,
    harmonic_kernel_h0_iso,
    is_harmonic,
    is_laplacian,
    join_nucleus,
    knowledge_lattice,
    mem_h0_iff_harmonic,
    to_h0,
)

bl = four()
lat = knowledge_lattice(bl.L)
# A concrete Laplacian Δ = "close upward to include t" (a closure / nucleus).
laplacian: Callable[[BL[int]], BL[int]] = join_nucleus(lat, bl.true)


def test_laplacian_is_a_closure() -> None:
    assert is_laplacian(lat, laplacian)


def test_harmonic_is_the_diffusion_limit_and_a_fixed_point() -> None:
    for seed in lat.elements:
        h = harmonic(lat, laplacian, seed)
        assert is_harmonic(lat, laplacian, h)  # Δ h = h
        assert lat.eq(h, laplacian(seed))  # idempotent closure -> one step
        # The diffusion orbit reaches and stays at the harmonic.
        assert lat.eq(diffusion(lat, laplacian, seed, 1), h)
        assert lat.eq(diffusion(lat, laplacian, seed, 5), h)


def test_diffusion_climbs_monotonically_to_the_harmonic() -> None:
    seed = bl.none
    orbit = [diffusion(lat, laplacian, seed, n) for n in range(4)]
    assert all(lat.leq(orbit[i], orbit[i + 1]) for i in range(len(orbit) - 1))
    assert lat.eq(orbit[-1], harmonic(lat, laplacian, seed))


def test_harmonic_is_the_least_fixed_point_above_the_seed() -> None:
    for seed in lat.elements:
        h = harmonic(lat, laplacian, seed)
        above = [x for x in harmonic_kernel(lat, laplacian) if lat.leq(seed, x)]
        assert h in lat.elements
        assert all(lat.leq(h, x) for x in above)  # least harmonic ≥ seed


def test_harmonic_kernel_is_the_fixed_points() -> None:
    kernel = harmonic_kernel(lat, laplacian)
    assert all(is_harmonic(lat, laplacian, v) for v in kernel)
    # t and ⊤ are the values ≥ t, i.e. fixed by "join with t".
    assert set(kernel) == {bl.true, bl.conflict}


def test_h0_as_closure_image_is_isomorphic_to_harmonic_kernel() -> None:
    h0 = h0_object(lat, laplacian)
    kernel = harmonic_kernel(lat, laplacian)

    assert set(h0) == set(kernel)
    assert all(mem_h0_iff_harmonic(lat, laplacian, value) for value in lat.elements)
    assert all(
        lat.eq(from_h0(lat, laplacian, to_h0(lat, laplacian, value)), value) for value in kernel
    )
    assert all(lat.eq(to_h0(lat, laplacian, from_h0(lat, laplacian, value)), value) for value in h0)

    witness = harmonic_kernel_h0_iso(lat, laplacian)
    assert witness.holds
