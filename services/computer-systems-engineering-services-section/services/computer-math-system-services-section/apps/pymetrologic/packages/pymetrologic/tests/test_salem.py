from __future__ import annotations

import pytest

from pymetrologic.metallic import (
    char_poly_metallic,
)
from pymetrologic.salem import (
    char_poly_metallic_not_reciprocal,
    char_poly_salem,
    char_poly_salem_reciprocal,
    det2,
    det2_metallic_matrix,
    det4,
    det4_salem_companion,
    det_salem_vs_pisot,
    eval_int_poly,
    golden_double_root,
    golden_root_equation_holds,
    golden_root_residual,
    reciprocal,
    salem_companion,
    salem_companion_cayley_hamilton,
    salem_trace,
    salem_trace_double_root,
    salem_trace_real_root,
    salem_trace_root_equation_holds,
    salem_trace_root_residual,
    salem_trace_unit_circle,
    salem_vs_pisot,
)


def test_reciprocal_signature_separates_salem_from_metallic_pisot() -> None:
    assert char_poly_salem() == (1, -1, -1, -1, 1)
    assert reciprocal(char_poly_salem())
    assert char_poly_salem_reciprocal()

    assert char_poly_metallic(1) == (-1, -1, 1)
    assert not reciprocal(char_poly_metallic(1))
    assert char_poly_metallic_not_reciprocal(1)


def test_trace_resolvent_sign_changes_detect_neutral_and_real_roots() -> None:
    trace = salem_trace()

    assert trace == (-3, -1, 1)
    assert eval_int_poly(trace, -2) == 3
    assert eval_int_poly(trace, 0) == -3
    assert salem_trace_unit_circle()

    assert eval_int_poly(trace, 2) == -1
    assert eval_int_poly(trace, 3) == 3
    assert salem_trace_real_root()


def test_salem_and_golden_root_identities_match_sqrt_layer() -> None:
    assert abs(salem_trace_double_root() - (1 + 13**0.5)) < 1e-12
    assert abs(salem_trace_root_residual()) < 1e-12
    assert salem_trace_root_equation_holds()

    assert abs(golden_double_root() - (1 + 5**0.5)) < 1e-12
    assert abs(golden_root_residual()) < 1e-12
    assert golden_root_equation_holds()


def test_salem_vs_pisot_bundles_trace_and_reciprocity_contrast() -> None:
    assert salem_vs_pisot()


def test_determinant_signature_distinguishes_salem_and_pisot_units() -> None:
    assert det2(((2, 1), (1, 0))) == -1
    assert det2_metallic_matrix(1) == -1
    assert det4_salem_companion() == 1
    assert det_salem_vs_pisot()


def test_salem_companion_satisfies_cayley_hamilton_identity() -> None:
    assert salem_companion() == (
        (0, 0, 0, -1),
        (1, 0, 0, 1),
        (0, 1, 0, 1),
        (0, 0, 1, 1),
    )
    assert salem_companion_cayley_hamilton()


def test_salem_validation_rejects_wrong_determinant_sizes() -> None:
    with pytest.raises(ValueError, match="2 x 2"):
        det2(((1, 0, 0), (0, 1, 0), (0, 0, 1)))

    with pytest.raises(ValueError, match="4 x 4"):
        det4(((1, 0), (0, 1)))

    with pytest.raises(ValueError, match="nonnegative"):
        salem_trace_root_equation_holds(tolerance=-1)

    with pytest.raises(ValueError, match="nonnegative"):
        golden_root_equation_holds(tolerance=-1)
