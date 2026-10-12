"""Interpret the *machine-extracted* conformance vectors, not a hand port.

``test_conformance_vectors.py`` is a human transcription of
``conformance/ConformanceVectors.lean`` written earlier the same day this file
was added — exactly the failure mode that let a rotation-drift bug survive
undetected in ``predicating.py`` (a human eyeballed the Lean, typed Python,
and the two silently disagreed). This module instead:

1. re-hashes the *live* ``ConformanceVectors.lean`` bytes and compares them
   against the sha256 pinned in ``tests/data/conformance_vectors.json`` (the
   artifact ``tools/extract_conformance.py`` produced from those exact
   bytes) — failing loudly, with a re-run instruction, the moment the Lean
   source and the extracted JSON disagree;
2. interprets each extracted vector's expression tree directly against
   pymetrologic's real API (``positing.py`` / ``quartet.py`` /
   ``articulating_primitives.py`` / ``predicating.py``) through a small
   evaluator below, rather than a human-authored ``assert``.

Disagreement between this suite and ``test_conformance_vectors.py`` is
itself signal (two independently-derived readings of the same golden vectors
diverging) — see that file's own docstring for what it covers and skips.

**Vectors with no Python realization yet.** Several Lean vectors reference
operations pymetrologic does not implement (``Valuation.posit``/``positList``,
``Valuation.contesting``/``phase``, ``Predicating.Guarded``/``SiblingSeed``,
the ``Claim`` carrier). The evaluator below never silently ignores these: it
walks each vector's expression tree and, wherever it hits a symbol it cannot
compute, returns an :class:`Unrealized` marker carrying every such symbol's
name instead of a value. A vector whose *only* unrealized symbols are all in
``KNOWN_UNREALIZED_OPS`` is accounted for and its test only asserts that
containment; a vector referencing anything else — including a **new** vector
added later for a still-unrealized op that isn't already allowlisted — fails
loudly instead of being silently skipped, exactly as the task requires.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

from pymetrologic.articulating_primitives import (
    ArticulationCell,
    Mark,
    Utterance,
    initial_articulation_cell,
)
from pymetrologic.positing import charge_join_k, charge_negate
from pymetrologic.predicating import seed
from pymetrologic.quartet import Corner, corner_of_status, status_of_corner

ROOT = Path(__file__).resolve().parents[3]
LEAN_FILE = (
    ROOT / ".." / ".." / "lib" / "obsmetrologia" / "conformance" / "ConformanceVectors.lean"
).resolve()
DATA_FILE = ROOT / "packages" / "pymetrologic" / "tests" / "data" / "conformance_vectors.json"

Node = dict[str, Any]


def _load_artifact() -> dict[str, Any]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


ARTIFACT = _load_artifact()
DEFINITIONS: dict[str, dict[str, Any]] = {d["name"]: d for d in ARTIFACT["definitions"]}
VECTORS: list[dict[str, Any]] = ARTIFACT["vectors"]

# --------------------------------------------------------------------------- #
# 1. Source-drift gate.
# --------------------------------------------------------------------------- #


def test_source_sha256_matches_pinned_extraction() -> None:
    """The pinned sha256 in the JSON artifact must match the live Lean bytes.

    On mismatch the artifact was extracted from a *different* revision of
    ``ConformanceVectors.lean`` than the one now on disk — the golden vectors
    below may no longer describe the live Lean at all.
    """

    live_bytes = LEAN_FILE.read_bytes()
    live_sha256 = hashlib.sha256(live_bytes).hexdigest()
    pinned_sha256 = ARTIFACT["source_sha256"]
    assert live_sha256 == pinned_sha256, (
        "Lean conformance source drifted — re-run tools/extract_conformance.py "
        f"(pinned sha256 {pinned_sha256} != live sha256 {live_sha256} for {LEAN_FILE})"
    )


def test_extraction_dropped_nothing() -> None:
    """Every line the extractor could not parse must be recorded, not silently dropped."""

    assert ARTIFACT["unparsed"] == []
    assert ARTIFACT["unparsed_definitions"] == []
    assert ARTIFACT["vector_count"] == len(VECTORS) > 0


# --------------------------------------------------------------------------- #
# 2. A tiny evaluator: JSON expression tree -> pymetrologic value, or
#    Unrealized(<the symbols it could not resolve>).
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Unrealized:
    """The vector's tree touches at least one op pymetrologic doesn't implement yet."""

    ops: frozenset[str]


def _merge_unrealized(values: list[Any]) -> Unrealized | None:
    ops: set[str] = set()
    for value in values:
        if isinstance(value, Unrealized):
            ops |= value.ops
    return Unrealized(frozenset(ops)) if ops else None


# Constants and functions this suite can actually compute, keyed by the exact
# dotted Lean name the extractor recorded (`Charge.joinK`, `Articulating.Corner
# .absurd.toStatus`, ...). Everything else is, by construction, Unrealized.
REALIZED_CONSTANTS: dict[str, Any] = {
    "Charge.kBot": Corner.ABSURD,
    "Charge.kTop": Corner.STABLE,
    "Charge.tTop": Corner.POTENTIAL,
    "Charge.tBot": Corner.ACTIVE,
    "Articulating.Corner.absurd": Corner.ABSURD,
    "Articulating.Corner.potential": Corner.POTENTIAL,
    "Articulating.Corner.active": Corner.ACTIVE,
    "Articulating.Corner.stable": Corner.STABLE,
    "Articulating.Corner.absurd.toStatus": status_of_corner(Corner.ABSURD),
    "Articulating.Corner.potential.toStatus": status_of_corner(Corner.POTENTIAL),
    "Articulating.Corner.active.toStatus": status_of_corner(Corner.ACTIVE),
    "Articulating.Corner.stable.toStatus": status_of_corner(Corner.STABLE),
}
REALIZED_FUNCS: dict[str, Any] = {
    "Charge.joinK": charge_join_k,
    "Charge.negate": charge_negate,
    "Articulating.Corner.ofStatus": corner_of_status,
    "PredicationCell.seed": seed,
}

# The Lean vectors reference these operations/carriers, but pymetrologic has no
# realization for them yet (see test_conformance_vectors.py's own docstring for
# the same audit): the `Claim` carrier and `Valuation.posit`/`positList`/
# `contesting`/`phase`, `Predicating.Guarded`'s `predicatingOf`, and
# `Predicating.SiblingSeed`'s `composeSeeds`. `proof:decide` is the opaque
# `by decide` proof term used as a value inside the `predicatingOf` vector.
# `struct-literal` covers an anonymous-constructor RHS this evaluator has no
# type context to construct (it only ever arises inside vectors that are
# already unrealized via one of the ops above, e.g. `composeSeeds`'s RHS
# triple) — a *new* vector that puts a bare struct literal on the RHS of an
# otherwise-fully-realized equation would still need this name added
# deliberately, since every op above it in the tree would already be realized
# and this marker alone would then decide the vector's fate.
KNOWN_UNREALIZED_OPS: frozenset[str] = frozenset(
    {
        "Claim.seed",
        "Valuation.posit",
        "Valuation.positList",
        "Valuation.contesting",
        "Valuation.phase",
        "Valuation.knowledgeLeast",
        "Articulating.Cell.predicatingOf",
        "PredicationCell.composeSeeds",
        "proof:decide",
        "struct-literal",
    }
)


def _utyped(node: Node, target_type: str, resolving: frozenset[str]) -> Any:
    """Type-directed construction for ``Mark`` / ``Utterance`` / ``Articulating.Cell``.

    A bare anonymous constructor (``⟨...⟩``) carries no type of its own in this
    grammar — its Python shape depends entirely on the ``def``'s declared type
    (or the argument position it fills), so callers that know the expected
    type route through here instead of the generic :func:`ueval`.
    """

    if node["kind"] == "app" and not node["args"]:
        name = node["fn"]
        definition = DEFINITIONS.get(name)
        if definition is not None and name not in resolving and definition["type"] == target_type:
            return _utyped(definition["term"], target_type, resolving | {name})
        return Unrealized(frozenset({name}))

    if node["kind"] == "struct":
        items = node["items"]
        if target_type == "Mark" and len(items) == 1 and items[0]["kind"] == "string":
            return Mark(items[0]["value"])
        if target_type == "Utterance" and len(items) == 2:
            token = _utyped(items[0], "Mark", resolving)
            claim = _utyped(items[1], "Mark", resolving)
            bad = _merge_unrealized([token, claim])
            return bad if bad is not None else Utterance(token, claim)
        if target_type == "Articulating.Cell" and len(items) == 3:
            utterance = _utyped(items[0], "Utterance", resolving)
            token_articulated = ueval(items[1], resolving)
            claim_articulated = ueval(items[2], resolving)
            bad = _merge_unrealized([utterance, token_articulated, claim_articulated])
            if bad is not None:
                return bad
            return ArticulationCell(
                utterance,
                token_articulated=token_articulated,
                claim_articulated=claim_articulated,
            )

    return Unrealized(frozenset({f"struct-as-{target_type}"}))


def ueval(node: Node, resolving: frozenset[str] = frozenset()) -> Any:
    """Evaluate one extracted expression tree, or report why it can't be evaluated."""

    kind = node["kind"]

    if kind == "bool":
        return node["value"]
    if kind == "string":
        return node["value"]
    if kind == "tuple" or kind == "list":
        values = [ueval(item, resolving) for item in node["items"]]
        bad = _merge_unrealized(values)
        if bad is not None:
            return bad
        return tuple(values) if kind == "tuple" else values
    if kind == "struct":
        # No type context here (see `_utyped`) — a struct only ever resolves
        # to a comparable value when its type-directed caller intervenes.
        values = [ueval(item, resolving) for item in node["items"]]
        bad = _merge_unrealized(values)
        return bad if bad is not None else Unrealized(frozenset({"struct-literal"}))
    if kind == "proof":
        return Unrealized(frozenset({f"proof:{node['text']}"}))
    if kind == "field":
        base = ueval(node["base"], resolving)
        if isinstance(base, Unrealized):
            return base
        path = node["path"]
        if path == ["toStatus"]:
            return status_of_corner(base)
        if path == ["meme", "charge"]:
            corner: Corner = base.corner
            return corner
        return Unrealized(frozenset({f"field:{'.'.join(path)}"}))
    if kind == "app":
        fn = node["fn"]
        args = node["args"]

        if fn == "Articulating.Cell.measure" and len(args) == 1:
            cell = _utyped(args[0], "Articulating.Cell", resolving)
            if isinstance(cell, Unrealized):
                return cell
            return cell.corner
        if fn == "Articulating.Cell.initial" and len(args) == 1:
            utterance = _utyped(args[0], "Utterance", resolving)
            if isinstance(utterance, Unrealized):
                return utterance
            return initial_articulation_cell(utterance)
        if not args and fn in REALIZED_CONSTANTS:
            return REALIZED_CONSTANTS[fn]
        if fn in REALIZED_FUNCS:
            values = [ueval(arg, resolving) for arg in args]
            bad = _merge_unrealized(values)
            return bad if bad is not None else REALIZED_FUNCS[fn](*values)
        if not args and fn in DEFINITIONS and fn not in resolving:
            definition = DEFINITIONS[fn]
            dtype = definition["type"]
            if dtype in ("Mark", "Utterance", "Articulating.Cell"):
                return _utyped(node, dtype, resolving)
            return ueval(definition["term"], resolving | {fn})

        values = [ueval(arg, resolving) for arg in args]
        bad = _merge_unrealized(values)
        own = Unrealized(frozenset({fn}))
        return _merge_unrealized([own, bad]) if bad is not None else own

    return Unrealized(frozenset({f"kind:{kind}"}))


# --------------------------------------------------------------------------- #
# 3. One test per extracted vector.
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("vector", VECTORS, ids=[v["id"] for v in VECTORS])
def test_generated_vector(vector: dict[str, Any]) -> None:
    lhs_value = ueval(vector["lhs"])
    rhs_value = ueval(vector["rhs"])
    unrealized = _merge_unrealized([lhs_value, rhs_value])

    if unrealized is not None:
        unknown = unrealized.ops - KNOWN_UNREALIZED_OPS
        assert not unknown, (
            f"vector {vector['id']!r} (line {vector['line']}, {vector['raw']!r}) references "
            f"op(s) {sorted(unknown)} with no Python realization AND not yet in "
            "KNOWN_UNREALIZED_OPS — decide whether to realize them in pymetrologic or add "
            "them to the allowlist deliberately."
        )
        return

    if vector["relation"] == "eq":
        assert lhs_value == rhs_value, (
            f"vector {vector['id']!r} (line {vector['line']}) DISAGREES with the live Lean: "
            f"{vector['raw']!r} -> lhs={lhs_value!r} rhs={rhs_value!r}"
        )
    else:
        assert lhs_value != rhs_value, (
            f"vector {vector['id']!r} (line {vector['line']}) DISAGREES with the live Lean "
            f"(expected inequality): {vector['raw']!r} -> lhs={lhs_value!r} rhs={rhs_value!r}"
        )


def test_every_known_unrealized_op_is_still_referenced() -> None:
    """Keep ``KNOWN_UNREALIZED_OPS`` honest: no stale allowlist entries.

    If a future Python realization removes the need for one of these names
    (e.g. pymetrologic grows a ``posit`` function), the corresponding vector
    becomes fully realized and this entry should be deleted along with it —
    this test catches the allowlist silently outliving what it was for.
    """

    referenced: set[str] = set()
    for vector in VECTORS:
        lhs_value = ueval(vector["lhs"])
        rhs_value = ueval(vector["rhs"])
        unrealized = _merge_unrealized([lhs_value, rhs_value])
        if unrealized is not None:
            referenced |= unrealized.ops
    stale = KNOWN_UNREALIZED_OPS - referenced
    assert not stale, f"KNOWN_UNREALIZED_OPS entries no longer referenced by any vector: {stale}"
