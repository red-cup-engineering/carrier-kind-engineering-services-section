import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const unit = readFileSync(new URL("../ops/systemd/protected-acceptance-service.service", import.meta.url), "utf8");

test("protected-acceptance-dependency-wiring", () => {
  const requires = unit.match(/^Requires=(.*)$/mu)?.[1]?.split(/\s+/u) ?? [];
  const after = unit.match(/^After=(.*)$/mu)?.[1]?.split(/\s+/u) ?? [];
  for (const service of ["rwil-rdf-projection-service.service", "acceptance-oracle-assay-service.service"]) {
    assert.ok(requires.includes(service), `${service} must be required`);
    assert.ok(after.includes(service), `${service} must order startup`);
  }
  assert.doesNotMatch(unit, /SEMANTIC_CANDIDATE_REVIEW|semantic-candidate-review-service/u);
});
