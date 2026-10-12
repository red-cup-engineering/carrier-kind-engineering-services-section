from __future__ import annotations

from pymetrologic.service_resolution import derive_services


def test_derives_exact_covering_extent_and_transports_closure() -> None:
    result = derive_services(
        {
            "urn:service:script": frozenset({"intent:assay", "execution:deterministic"}),
            "urn:service:model": frozenset({"intent:assay", "execution:actuator"}),
        },
        frozenset({"intent:assay", "execution:deterministic"}),
    )
    assert result.candidate_extent == ("urn:service:script",)
    assert result.closed_intent == ("execution:deterministic", "intent:assay")
    assert result.unresolved_attributes == ()
    assert result.galois_connection_witnessed


def test_no_cover_is_typed_residue_not_an_invented_candidate() -> None:
    result = derive_services(
        {"urn:service:script": frozenset({"intent:assay"})},
        frozenset({"intent:novel", "execution:deterministic"}),
    )
    assert result.candidate_extent == ()
    assert result.unresolved_attributes == ("execution:deterministic", "intent:novel")
    assert result.disposition == "unresolved-no-covering-extent"
