"""FCA derivation of suitable services from witnessed capability claims.

This module does not execute, trust, price, or settle a service.  It transports
one checkable derivation: the objects in a supplied formal context that carry
every attribute required by a claim.  A nonempty extent is a candidate set; an
empty extent is typed unresolved residue for a later actuator or market query.
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from typing import Any

from .fca import Context, close_intent, is_galois_connection, prime_objs

__all__ = ["ServiceDerivation", "derive_services"]


@dataclass(frozen=True)
class ServiceDerivation:
    required_intent: tuple[str, ...]
    candidate_extent: tuple[str, ...]
    closed_intent: tuple[str, ...]
    unresolved_attributes: tuple[str, ...]
    galois_connection_witnessed: bool
    disposition: str


def derive_services(
    service_attributes: dict[str, frozenset[str]], required: frozenset[str]
) -> ServiceDerivation:
    """Return the FCA extent covering ``required`` and its closure witness."""
    if not service_attributes:
        return ServiceDerivation(
            required_intent=tuple(sorted(required)),
            candidate_extent=(),
            closed_intent=(),
            unresolved_attributes=tuple(sorted(required)),
            galois_connection_witnessed=True,
            disposition="unresolved-no-service-claims",
        )
    objects = tuple(sorted(service_attributes))
    attributes = tuple(sorted(set().union(*service_attributes.values(), required)))
    ctx = Context(
        objects=objects,
        attributes=attributes,
        incidence=frozenset(
            (service, attribute)
            for service, carried in service_attributes.items()
            for attribute in carried
        ),
    )
    extent = prime_objs(ctx, required)
    closed = close_intent(ctx, required) if extent else frozenset()
    return ServiceDerivation(
        required_intent=tuple(sorted(required)),
        candidate_extent=tuple(sorted(extent)),
        closed_intent=tuple(sorted(closed)),
        unresolved_attributes=() if extent else tuple(sorted(required)),
        galois_connection_witnessed=is_galois_connection(ctx),
        disposition="deterministic-candidates-derived"
        if extent
        else "unresolved-no-covering-extent",
    )


def _main() -> None:
    value: dict[str, Any] = json.load(sys.stdin)
    services = value.get("services")
    required = value.get("requiredAttributes")
    if (
        not isinstance(services, list)
        or not isinstance(required, list)
        or any(not isinstance(attribute, str) or not attribute for attribute in required)
    ):
        raise ValueError("services and requiredAttributes must be arrays")
    claims: dict[str, frozenset[str]] = {}
    for item in services:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("id"), str)
            or not item["id"]
            or item["id"] in claims
            or not isinstance(item.get("attributes"), list)
            or any(
                not isinstance(attribute, str) or not attribute for attribute in item["attributes"]
            )
        ):
            raise ValueError("each service requires one unique id and string attributes")
        claims[item["id"]] = frozenset(item["attributes"])
    result = asdict(derive_services(claims, frozenset(required)))
    sys.stdout.write(json.dumps(result, sort_keys=True, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    _main()
