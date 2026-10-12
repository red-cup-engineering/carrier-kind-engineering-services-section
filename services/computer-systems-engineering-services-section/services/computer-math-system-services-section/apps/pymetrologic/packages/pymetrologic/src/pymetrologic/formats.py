"""Serialization formats as FOUR x FOUR (RelMath.Computing.FormatsFour)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .quartet import CORNERS, Corner
from .regimes import ClosureRegime

__all__ = [
    "FORMATS",
    "Format",
    "FormatsClosureHierarchy",
    "corner_onto",
    "format_corner",
    "format_cost",
    "format_regime",
    "formats_closure_hierarchy",
    "regime_cost",
    "regime_decidable",
]


class Format(StrEnum):
    """The eight serialization formats analyzed by the Lean theorem."""

    bytes = "bytes"
    plaintext = "plaintext"
    json = "json"
    rdf = "rdf"
    markdown = "markdown"
    html = "html"
    tex = "tex"
    rmn_html = "rmnHtml"


FORMATS: tuple[Format, ...] = (
    Format.bytes,
    Format.plaintext,
    Format.json,
    Format.rdf,
    Format.markdown,
    Format.html,
    Format.tex,
    Format.rmn_html,
)


_FORMAT_CORNER: dict[Format, Corner] = {
    Format.bytes: Corner.ABSURD,
    Format.plaintext: Corner.ACTIVE,
    Format.json: Corner.POTENTIAL,
    Format.rdf: Corner.STABLE,
    Format.markdown: Corner.STABLE,
    Format.html: Corner.STABLE,
    Format.tex: Corner.STABLE,
    Format.rmn_html: Corner.STABLE,
}

_FORMAT_REGIME: dict[Format, ClosureRegime] = {
    Format.bytes: ClosureRegime.strict,
    Format.plaintext: ClosureRegime.strict,
    Format.json: ClosureRegime.transfinite_bounded,
    Format.rdf: ClosureRegime.scott,
    Format.markdown: ClosureRegime.strict,
    Format.html: ClosureRegime.aperiodic,
    Format.tex: ClosureRegime.aperiodic,
    Format.rmn_html: ClosureRegime.scott,
}


def format_corner(fmt: Format) -> Corner:
    """The content-commitment corner of a serialization format."""

    return _FORMAT_CORNER[fmt]


def format_regime(fmt: Format) -> ClosureRegime:
    """The completion regime of a serialization format."""

    return _FORMAT_REGIME[fmt]


def regime_cost(regime: ClosureRegime) -> int:
    """Completion-cost height of a closure regime."""

    match regime:
        case ClosureRegime.strict:
            return 0
        case ClosureRegime.scott:
            return 1
        case ClosureRegime.transfinite_bounded:
            return 2
        case ClosureRegime.aperiodic:
            return 3


def format_cost(fmt: Format) -> int:
    """Completion-cost height of a serialization format."""

    return regime_cost(format_regime(fmt))


def regime_decidable(regime: ClosureRegime) -> bool:
    """Whether a regime's completion is decidable in the finite theorem shadow."""

    return regime in {ClosureRegime.strict, ClosureRegime.scott}


def corner_onto(corner: Corner) -> bool:
    """The format-corner projection covers every recurring FOUR corner."""

    return any(format_corner(fmt) is corner for fmt in FORMATS)


@dataclass(frozen=True, slots=True)
class FormatsClosureHierarchy:
    """Executable witness for the finite FormatsFour theorem bundle."""

    cardinality_eight: bool
    corner_onto: bool
    cost_rises: bool
    cost_falls: bool
    top_corner_multi_regime: bool
    rmn_recovers_decidability: bool

    @property
    def holds(self) -> bool:
        """All finite legs of ``FormatsFour.formats_closure_hierarchy`` hold."""

        return (
            self.cardinality_eight
            and self.corner_onto
            and self.cost_rises
            and self.cost_falls
            and self.top_corner_multi_regime
            and self.rmn_recovers_decidability
        )


def formats_closure_hierarchy() -> FormatsClosureHierarchy:
    """Check the finite serialization-format hierarchy theorem surface."""

    cost_rises = (
        format_corner(Format.bytes) is Corner.ABSURD
        and format_corner(Format.json) is Corner.POTENTIAL
        and format_cost(Format.bytes) < format_cost(Format.json)
    )
    cost_falls = (
        format_corner(Format.json) is Corner.POTENTIAL
        and format_corner(Format.rdf) is Corner.STABLE
        and format_cost(Format.rdf) < format_cost(Format.json)
    )
    top_multi = (
        format_corner(Format.markdown) is Corner.STABLE
        and format_regime(Format.markdown) is ClosureRegime.strict
        and format_corner(Format.rdf) is Corner.STABLE
        and format_regime(Format.rdf) is ClosureRegime.scott
        and format_corner(Format.html) is Corner.STABLE
        and format_regime(Format.html) is ClosureRegime.aperiodic
    )
    rmn_decidable = (
        format_corner(Format.rmn_html) is format_corner(Format.html)
        and regime_decidable(format_regime(Format.rmn_html))
        and not regime_decidable(format_regime(Format.html))
    )
    return FormatsClosureHierarchy(
        cardinality_eight=len(FORMATS) == 8,
        corner_onto=all(corner_onto(corner) for corner in CORNERS),
        cost_rises=cost_rises,
        cost_falls=cost_falls,
        top_corner_multi_regime=top_multi,
        rmn_recovers_decidability=rmn_decidable,
    )
