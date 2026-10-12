"""Bounded executable oracle for ``org.harmonious-union.rmn-proof-coordinate.v1``.

This deliberately verifies only the portable settlement fragment.  It does not
claim to implement general Lean reduction or turn a commitment into identity.
"""

from __future__ import annotations

import json
import math
from collections import deque
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Literal

Generator = Literal["specialization", "converse", "subject-projection", "object-projection"]
GENERATORS: tuple[Generator, ...] = (
    "specialization",
    "converse",
    "subject-projection",
    "object-projection",
)
_RANK = {value: index for index, value in enumerate(GENERATORS)}


@dataclass(frozen=True, slots=True)
class GeneratorWitness:
    domain: Any
    generator: Generator
    codomain: Any


@dataclass(frozen=True, slots=True)
class Settlement:
    resource_type: str
    root: Any
    target: Any
    witnesses: tuple[GeneratorWitness, ...]


@dataclass(frozen=True, slots=True)
class ProofCoordinate:
    settlement: Settlement
    type: str = "rmn-proof-coordinate"
    version: int = 1


def _json_value(value: Any) -> Any:
    """Admit finite JSON only, matching the TypeScript coordinate boundary."""
    if value is None or isinstance(value, (str, bool)):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("unaddressable term")
        return 0 if value == 0 else value
    if isinstance(value, list):
        return [_json_value(item) for item in value]
    if isinstance(value, dict) and all(isinstance(key, str) for key in value):
        return {key: _json_value(value[key]) for key in sorted(value)}
    raise ValueError("unaddressable term")


def term_key(term: Any) -> str:
    value = _json_value(term)
    if value is None:
        return "n:null"
    if isinstance(value, str):
        return f"s:{value}"
    if isinstance(value, bool):
        return f"b:{str(value).lower()}"
    if isinstance(value, (int, float)):
        return f"d:{json.dumps(value, ensure_ascii=False, separators=(',', ':'))}"
    prefix = "a" if isinstance(value, list) else "o"
    return (
        f"{prefix}:{json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True)}"
    )


def _witness_key(witness: GeneratorWitness) -> str:
    return (
        f"{term_key(witness.domain)}\0{_RANK[witness.generator]:02d}\0{term_key(witness.codomain)}"
    )


def normalize_witnesses(values: Sequence[Mapping[str, Any]]) -> tuple[GeneratorWitness, ...]:
    found: dict[str, GeneratorWitness] = {}
    for value in values:
        generator = value.get("generator") if isinstance(value, Mapping) else None
        if generator not in _RANK:
            raise ValueError("invalid witness")
        witness = GeneratorWitness(
            _json_value(value["domain"]), generator, _json_value(value["codomain"])
        )
        found[_witness_key(witness)] = witness
    return tuple(found[key] for key in sorted(found))


def settle_proof_coordinate(input: Mapping[str, Any]) -> dict[str, Any]:
    """Return an earned coordinate or one of the shared typed refusal reasons."""
    try:
        resource_type = input.get("resourceType")
        if not isinstance(resource_type, str) or not resource_type.strip():
            return {"ok": False, "reason": "invalid-resource-type"}
        root, target = _json_value(input["root"]), _json_value(input["target"])
        witnesses = normalize_witnesses(input["witnesses"])
    except ValueError as error:
        return {
            "ok": False,
            "reason": "invalid-witness"
            if str(error) == "invalid witness"
            else "invalid-coordinate",
        }
    except (KeyError, TypeError):
        return {"ok": False, "reason": "invalid-coordinate"}

    target_key = term_key(target)
    queue: deque[tuple[Any, tuple[GeneratorWitness, ...]]] = deque([(root, ())])
    seen = {term_key(root)}
    while queue:
        domain, route = queue.popleft()
        if term_key(domain) == target_key:
            settlement = Settlement(resource_type, root, target, witnesses)
            return {"ok": True, "coordinate": ProofCoordinate(settlement), "route": route}
        for witness in witnesses:
            if term_key(witness.domain) != term_key(domain) or term_key(witness.codomain) in seen:
                continue
            seen.add(term_key(witness.codomain))
            queue.append((witness.codomain, (*route, witness)))
    return {"ok": False, "reason": "unearned-coordinate"}
