"""Theory-relative ideal witnesses (RelMath.Predicating.TheoryRelativeIdeal)."""

from __future__ import annotations

import pytest

from pymetrologic import four
from pymetrologic.theory_relative_ideal import (
    IdealSettledWitness,
    IsReindexIdealWitness,
    compose_embeddings,
    identity_embedding,
    relative_ideal,
    relative_ideal_bounded_by_host_top,
    relative_ideal_fixed_cellwise,
    relative_ideal_mono,
    relative_ideal_reindex_closure,
    relative_ideal_valuation_leq,
    sample_relative_ideal_witness,
    theory_relative_ideal_is_reindex,
)
from pymetrologic.yoneda import (
    PredicationCell,
)


def _cells() -> tuple[
    PredicationCell,
    PredicationCell,
    PredicationCell,
    PredicationCell,
    PredicationCell,
    PredicationCell,
]:
    resource_a = PredicationCell("resource", "uses", "alpha")
    resource_b = PredicationCell("resource", "uses", "beta")
    middle_a = PredicationCell("middle", "uses", "alpha")
    middle_b = PredicationCell("middle", "uses", "beta")
    host_a = PredicationCell("host", "licenses", "alpha")
    host_b = PredicationCell("host", "blocks", "beta")
    return resource_a, resource_b, middle_a, middle_b, host_a, host_b


def test_relative_ideal_is_cellwise_host_restriction() -> None:
    bl = four()
    resource_a, resource_b, _middle_a, _middle_b, host_a, host_b = _cells()
    embedding = {resource_a: host_a, resource_b: host_b}
    host = {host_a: bl.true, host_b: bl.conflict}

    ideal = relative_ideal(embedding, host)

    assert ideal == {resource_a: bl.true, resource_b: bl.conflict}
    assert ideal[resource_a] == host[embedding[resource_a]]
    assert ideal[resource_b] == host[embedding[resource_b]]


def test_relative_ideal_reindex_laws_include_identity_and_composition() -> None:
    bl = four()
    resource_a, resource_b, middle_a, middle_b, host_a, host_b = _cells()
    inner = {resource_a: middle_a, resource_b: middle_b}
    outer = {middle_a: host_a, middle_b: host_b}
    host = {host_a: bl.true, host_b: bl.false}

    witness = theory_relative_ideal_is_reindex(inner, host, outer_embedding=outer)

    assert isinstance(witness, IsReindexIdealWitness)
    assert witness.holds
    assert compose_embeddings(inner, outer) == {resource_a: host_a, resource_b: host_b}
    assert relative_ideal(identity_embedding((host_a, host_b)), host) == host
    assert relative_ideal(inner, relative_ideal(outer, host)) == relative_ideal(
        compose_embeddings(inner, outer),
        host,
    )


def test_relative_ideal_inherits_order_and_host_top_bound() -> None:
    bl = four()
    resource_a, resource_b, _middle_a, _middle_b, host_a, host_b = _cells()
    embedding = {resource_a: host_a, resource_b: host_b}
    host = {host_a: bl.none, host_b: bl.true}
    upper_host = {host_a: bl.true, host_b: bl.conflict}

    assert relative_ideal_valuation_leq(host, upper_host)
    assert relative_ideal_mono(embedding, host, upper_host)
    assert relative_ideal_bounded_by_host_top(embedding, host)


def test_relative_ideal_reads_host_closure_when_host_is_fixed() -> None:
    bl = four()
    resource_a, resource_b, _middle_a, _middle_b, host_a, host_b = _cells()
    embedding = {resource_a: host_a, resource_b: host_b}
    host = {host_a: bl.true, host_b: bl.conflict}

    def closure(valuation):
        return dict(valuation)

    assert relative_ideal_fixed_cellwise(closure, embedding, host)
    assert relative_ideal_reindex_closure(closure, embedding, host)

    def nonfixed_closure(valuation):
        changed = dict(valuation)
        changed[host_a] = bl.conflict
        return changed

    assert not relative_ideal_fixed_cellwise(nonfixed_closure, embedding, host)
    assert not relative_ideal_reindex_closure(nonfixed_closure, embedding, host)


def test_sample_relative_ideal_witness_bundles_reindex_and_settled_facts() -> None:
    reindex_witness, settled_witness = sample_relative_ideal_witness()

    assert isinstance(reindex_witness, IsReindexIdealWitness)
    assert isinstance(settled_witness, IdealSettledWitness)
    assert reindex_witness.holds
    assert settled_witness.holds


def test_relative_ideal_validation_errors_are_explicit() -> None:
    bl = four()
    resource_a, _resource_b, middle_a, _middle_b, host_a, _host_b = _cells()

    with pytest.raises(ValueError, match="missing from host"):
        relative_ideal({resource_a: host_a}, {})

    with pytest.raises(ValueError, match="intermediate"):
        compose_embeddings({resource_a: middle_a}, {})

    with pytest.raises(ValueError, match="same finite cell support"):
        relative_ideal_valuation_leq({host_a: bl.true}, {})
