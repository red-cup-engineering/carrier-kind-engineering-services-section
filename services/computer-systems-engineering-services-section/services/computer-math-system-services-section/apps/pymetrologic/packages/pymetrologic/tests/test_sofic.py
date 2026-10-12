from __future__ import annotations

import pytest

from pymetrologic.sofic import (
    ShiftOfFiniteType,
    decorated_fibonacci_shift,
    factor_words,
    fibonacci_substitute,
    fibonacci_substitution_golden,
    forget_fibonacci_decoration,
    golden_mean_shift,
    golden_mean_words,
    is_sofic_image_word,
    project_word,
    sofic_image_words,
    substitute_word,
)


def test_sft_identity_factor_is_sofic() -> None:
    shift = golden_mean_shift()
    identity = {"a": "a", "b": "b"}

    assert sofic_image_words(shift, identity, 3) == golden_mean_words(3)
    assert ("a", "b", "a") in sofic_image_words(shift, identity, 3)
    assert ("b", "b") not in sofic_image_words(shift, identity, 2)


def test_sofic_image_is_closed_under_one_block_factors() -> None:
    shift = golden_mean_shift()
    words = sofic_image_words(shift, {"a": "a", "b": "b"}, 3)
    collapsed = factor_words(words, {"a": "x", "b": "x"})

    assert collapsed == {("x", "x", "x")}
    assert project_word(("a", "b", "a"), {"a": 0, "b": 1}) == (0, 1, 0)


def test_golden_mean_shift_forbids_bb() -> None:
    shift = golden_mean_shift()

    assert shift.is_path(("a", "b", "a", "a"))
    assert not shift.is_path(("a", "b", "b", "a"))
    assert not is_sofic_image_word(shift, {"a": "a", "b": "b"}, ("b", "b"))


def test_fibonacci_substitution_lands_in_golden_mean_shift() -> None:
    assert fibonacci_substitute(("a", "b", "a")) == ("a", "b", "a", "a", "b")
    assert fibonacci_substitution_golden(("a", "b", "a", "a", "b"))
    assert all(
        fibonacci_substitution_golden(word)
        for word in [
            (),
            ("a",),
            ("b",),
            ("a", "a"),
            ("a", "b", "a"),
        ]
    )


def test_decorated_fibonacci_cover_forgets_to_fibonacci_substitution() -> None:
    decorated_shift = decorated_fibonacci_shift()
    decorated = substitute_word(
        ("a", "b", "a"),
        {"a": (("a", 0), ("b", 0)), "b": (("a", 1),)},
    )

    assert decorated_shift.is_path(decorated)
    assert forget_fibonacci_decoration(decorated) == fibonacci_substitute(("a", "b", "a"))


def test_sofic_validation() -> None:
    with pytest.raises(ValueError, match="unique"):
        ShiftOfFiniteType(("a", "a"), frozenset())
    with pytest.raises(ValueError, match="outside"):
        ShiftOfFiniteType(("a",), frozenset({("a", "b")}))
    with pytest.raises(ValueError, match="missing"):
        sofic_image_words(golden_mean_shift(), {"a": "a"}, 2)
    with pytest.raises(ValueError, match="length"):
        sofic_image_words(golden_mean_shift(), {"a": "a", "b": "b"}, -1)
