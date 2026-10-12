"""The Python oracle consumes the same corpus as the TypeScript adapter."""

from __future__ import annotations

import json
from pathlib import Path

from pymetrologic.rmn_proof_coordinate import settle_proof_coordinate

CORPUS = (
    Path(__file__).resolve().parents[15]
    / "lib/emsenn/services/561-group/services/engineering-services-section"
    / "services/computer-services-section/services/computer-systems-services-section"
    / "services/semiotic-computer-system-services-section"
    / "services/semiotic-computer-data-services-section"
    / "services/semiotic-computer-files-services-section"
    / "services/semiotic-computer-filepath-services-section"
    / "services/proof-path-structuration-service/content/rmn-proof-coordinate/vectors.json"
)


def test_shared_rmn_proof_coordinate_vectors() -> None:
    corpus = json.loads(CORPUS.read_text(encoding="utf-8"))
    assert corpus["profile"] == "org.harmonious-union.rmn-proof-coordinate.v1"
    for vector in corpus["cases"]:
        result = settle_proof_coordinate(vector["input"])
        assert result["ok"] is vector["expect"]["ok"], vector["id"]
        if not result["ok"]:
            assert result["reason"] == vector["expect"]["reason"], vector["id"]
            continue
        assert [step.generator for step in result["route"]] == vector["expect"]["stepGenerators"], (
            vector["id"]
        )
        assert len(result["coordinate"].settlement.witnesses) == vector["expect"]["witnessCount"], (
            vector["id"]
        )
