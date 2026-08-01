import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { conformJsonSchemaServiceSpecification, REQUIREMENT_IDS, SUPPORTED_VOCABULARY } from "../lib/specification-law.mjs";
import { formatRml, parseRml } from "@red-cup-engineering/rmn-semantic-conformance-die";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN = join(ROOT, "content/designs/json-schema-services-section");
const read = (name) => readFileSync(join(DESIGN, name), "utf8");
const canonical = () => ({
  requirementsRml: read("requirements-baseline.rml"), architectureRml: read("software-architecture-specification.rml"),
  highLevelDesignRml: read("high-level-design.rml"), lowLevelDesignRml: read("low-level-design.rml"),
  verificationRml: read("verification-and-validation-specification.rml"), traceRml: read("traceability-matrix.rml"),
});

test("complete JSON Schema specification allocates and traces every requirement exactly once", () => {
  const receipt = conformJsonSchemaServiceSpecification(canonical());
  assert.deepEqual(Object.keys(receipt.allocations), [...REQUIREMENT_IDS]);
  for (const id of Object.values(receipt.ids)) assert.match(id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});
test("dialect and vocabulary drift refuse", () => {
  const input = canonical(); const baseline = parseRml(input.requirementsRml);
  baseline["supported-vocabulary"] = [...SUPPORTED_VOCABULARY, "unknownKeyword"];
  input.requirementsRml = formatRml(baseline);
  assert.throws(() => conformJsonSchemaServiceSpecification(input), /supported vocabulary must be exactly/u);
});
test("unallocated requirements and trace drift refuse", () => {
  const input = canonical(); const architecture = parseRml(input.architectureRml);
  architecture.modules[0].requirements = architecture.modules[0].requirements.slice(1);
  input.architectureRml = formatRml(architecture);
  assert.throws(() => conformJsonSchemaServiceSpecification(input), /JSS-R001 must be allocated exactly once; found 0/u);
  const traceInput = canonical(); const trace = parseRml(traceInput.traceRml);
  trace.entries[0].case = "JSS-C008"; traceInput.traceRml = formatRml(trace);
  assert.throws(() => conformJsonSchemaServiceSpecification(traceInput), /trace cases must be exactly/u);
});
